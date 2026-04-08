import { NextRequest, NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds } from '@/lib/db/schema';
import { requireFeature } from '@/lib/billing/gate';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

function toCSV(headers: string[], rows: Record<string, string | number>[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, FEATURES.CSV_EXPORT);
    if (!gate) {
      return NextResponse.json(
        { error: 'Bu ozellik icin yetkiniz yok' },
        { status: 403 }
      );
    }

    const type = request.nextUrl.searchParams.get('type') || 'results';

    // Get active round
    const [activeRound] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.is_active, true))
      .limit(1);

    const roundId = activeRound?.id;
    if (!roundId) {
      return NextResponse.json(
        { error: 'Aktif tur bulunamadi' },
        { status: 404 }
      );
    }

    let csvContent: string;
    let filename: string;

    switch (type) {
      case 'results': {
        const result = await db.execute(sql`
          SELECT party, SUM(vote_count)::int as vote_count
          FROM anonymous_vote_counts
          WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
          GROUP BY party
          ORDER BY vote_count DESC
        `);
        const rows = result.rows as { party: string; vote_count: number }[];
        const total = rows.reduce((s, r) => s + r.vote_count, 0);
        const csvRows = rows.map((r) => ({
          parti: r.party,
          oy_sayisi: r.vote_count,
          oran: total > 0 ? ((r.vote_count / total) * 100).toFixed(2) : '0',
        }));
        csvContent = toCSV(['parti', 'oy_sayisi', 'oran'], csvRows);
        filename = `milletneder-parti-sonuclari-tur${roundId}.csv`;
        break;
      }

      case 'cities': {
        const result = await db.execute(sql`
          SELECT city, party, SUM(vote_count)::int as vote_count
          FROM anonymous_vote_counts
          WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
          GROUP BY city, party
          ORDER BY city, vote_count DESC
        `);
        const rows = result.rows as { city: string; party: string; vote_count: number }[];
        const csvRows = rows.map((r) => ({
          il: r.city,
          parti: r.party,
          oy_sayisi: r.vote_count,
        }));
        csvContent = toCSV(['il', 'parti', 'oy_sayisi'], csvRows);
        filename = `milletneder-il-kirilimi-tur${roundId}.csv`;
        break;
      }

      case 'demographics': {
        const result = await db.execute(sql`
          SELECT
            party,
            age_bracket,
            gender,
            education,
            income_bracket,
            SUM(vote_count)::int as vote_count
          FROM anonymous_vote_counts
          WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
          GROUP BY party, age_bracket, gender, education, income_bracket
          ORDER BY party, vote_count DESC
        `);
        const rows = result.rows as {
          party: string;
          age_bracket: string | null;
          gender: string | null;
          education: string | null;
          income_bracket: string | null;
          vote_count: number;
        }[];
        const csvRows = rows.map((r) => ({
          parti: r.party,
          yas_grubu: r.age_bracket || '',
          cinsiyet: r.gender || '',
          egitim: r.education || '',
          gelir_grubu: r.income_bracket || '',
          oy_sayisi: r.vote_count,
        }));
        csvContent = toCSV(
          ['parti', 'yas_grubu', 'cinsiyet', 'egitim', 'gelir_grubu', 'oy_sayisi'],
          csvRows
        );
        filename = `milletneder-demografik-tur${roundId}.csv`;
        break;
      }

      case 'districts': {
        const result = await db.execute(sql`
          SELECT city, district, party, SUM(vote_count)::int as vote_count
          FROM anonymous_vote_counts
          WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
            AND district IS NOT NULL
          GROUP BY city, district, party
          ORDER BY city, district, vote_count DESC
        `);
        const rows = result.rows as {
          city: string;
          district: string;
          party: string;
          vote_count: number;
        }[];
        const csvRows = rows.map((r) => ({
          il: r.city,
          ilce: r.district,
          parti: r.party,
          oy_sayisi: r.vote_count,
        }));
        csvContent = toCSV(['il', 'ilce', 'parti', 'oy_sayisi'], csvRows);
        filename = `milletneder-ilce-verileri-tur${roundId}.csv`;
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Gecersiz veri tipi. Gecerli tipler: results, cities, demographics, districts' },
          { status: 400 }
        );
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'CSV export sirasinda hata olustu' },
      { status: 500 }
    );
  }
}
