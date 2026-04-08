import { NextRequest, NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds } from '@/lib/db/schema';
import { requireFeature } from '@/lib/billing/gate';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

// Map query param to actual DB column
const DIMENSION_MAP: Record<string, string> = {
  city: 'city',
  age: 'age_bracket',
  gender: 'gender',
  education: 'education',
  income: 'income_bracket',
};

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, FEATURES.CROSS_TABLE);
    if (!gate) {
      return NextResponse.json(
        { error: 'Bu ozellik icin yetkiniz yok' },
        { status: 403 }
      );
    }

    const rowsParam = request.nextUrl.searchParams.get('rows') || 'city';
    const roundIdParam = request.nextUrl.searchParams.get('round_id');

    const dbColumn = DIMENSION_MAP[rowsParam];
    if (!dbColumn) {
      return NextResponse.json(
        { error: 'Gecersiz satir boyutu. Gecerli: city, age, gender, education, income' },
        { status: 400 }
      );
    }

    // Determine round
    let roundId: number;
    if (roundIdParam) {
      roundId = parseInt(roundIdParam);
      if (isNaN(roundId)) {
        return NextResponse.json({ error: 'Gecersiz round_id' }, { status: 400 });
      }
    } else {
      const [activeRound] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.is_active, true))
        .limit(1);

      if (!activeRound) {
        return NextResponse.json({ error: 'Aktif tur bulunamadi' }, { status: 404 });
      }
      roundId = activeRound.id;
    }

    // Use sql identifier for the column name (safely mapped) + parameterized round_id
    const result = await db.execute(
      sql`SELECT
        COALESCE(${sql.identifier(dbColumn)}, 'Belirtilmemis') as row_value,
        party,
        SUM(vote_count)::int as vote_count
      FROM anonymous_vote_counts
      WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
      GROUP BY ${sql.identifier(dbColumn)}, party
      ORDER BY row_value, vote_count DESC`
    );

    const rawRows = result.rows as {
      row_value: string;
      party: string;
      vote_count: number;
    }[];

    // Build cross-table structure
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const dataMap: Record<string, Record<string, number>> = {};
    let total = 0;

    for (const row of rawRows) {
      rowSet.add(row.row_value);
      colSet.add(row.party);

      if (!dataMap[row.row_value]) {
        dataMap[row.row_value] = {};
      }
      dataMap[row.row_value][row.party] = row.vote_count;
      total += row.vote_count;
    }

    // Sort columns by total votes descending
    const colTotals: Record<string, number> = {};
    for (const row of rawRows) {
      colTotals[row.party] = (colTotals[row.party] || 0) + row.vote_count;
    }
    const columns = Array.from(colSet).sort(
      (a, b) => (colTotals[b] || 0) - (colTotals[a] || 0)
    );

    const rows = Array.from(rowSet).sort();

    return NextResponse.json({
      rows,
      columns,
      data: dataMap,
      total,
      rowDimension: rowsParam,
      roundId,
    });
  } catch (error) {
    console.error('Cross-table error:', error);
    return NextResponse.json(
      { error: 'Capraz tablo olusturulurken hata olustu' },
      { status: 500 }
    );
  }
}
