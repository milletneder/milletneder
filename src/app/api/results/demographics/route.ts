import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties as partiesTable } from '@/lib/db/schema';
import { AGE_BRACKETS, INCOME_BRACKETS, GENDER_OPTIONS, EDUCATION_BRACKETS, TURNOUT_OPTIONS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const VALID_TYPES = ['age', 'income', 'gender', 'education', 'turnout'] as const;
    if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return NextResponse.json(
        { error: 'type parametresi "age", "income", "gender", "education" veya "turnout" olmalıdır' },
        { status: 400 }
      );
    }

    const TYPE_MAP: Record<string, { brackets: readonly { value: string; label: string }[]; column: string }> = {
      age: { brackets: AGE_BRACKETS, column: 'age_bracket' },
      income: { brackets: INCOME_BRACKETS, column: 'income_bracket' },
      gender: { brackets: GENDER_OPTIONS, column: 'gender' },
      education: { brackets: EDUCATION_BRACKETS, column: 'education' },
      turnout: { brackets: TURNOUT_OPTIONS, column: 'turnout_intention' },
    };

    const { brackets, column } = TYPE_MAP[type];

    // Find active round, or fall back to latest round with votes
    const roundResult = await db.execute(
      sql`SELECT id FROM rounds WHERE is_active = true LIMIT 1`
    );

    const activeRoundId = roundResult.rows[0]?.id;

    // Aktif roundda oy var mı kontrol et
    let targetRoundId = activeRoundId;
    if (targetRoundId) {
      const voteCheck = await db.execute(
        sql`SELECT COALESCE(SUM(vote_count), 0)::int as cnt FROM anonymous_vote_counts WHERE round_id = ${Number(targetRoundId)} AND is_valid = true`
      );
      const voteCount = (voteCheck.rows[0] as { cnt: number })?.cnt || 0;
      if (voteCount === 0) targetRoundId = null;
    }

    // Aktif roundda oy yoksa, en son oy içeren rounda düş
    if (!targetRoundId) {
      const fallback = await db.execute(
        sql`SELECT round_id FROM anonymous_vote_counts WHERE is_valid = true AND vote_count > 0 ORDER BY round_id DESC LIMIT 1`
      );
      targetRoundId = fallback.rows[0]?.round_id ?? null;
    }

    if (!targetRoundId) {
      return NextResponse.json({
        brackets: [],
        totalResponders: 0,
      });
    }

    // anonymous_vote_counts'tan demografik kırılım (sadece aktif tur)
    const roundFilter = targetRoundId ? `AND round_id = ${Number(targetRoundId)}` : '';
    const rawQuery = sql.raw(`
      SELECT
        ${column} AS bracket,
        party,
        SUM(vote_count)::int AS vote_count
      FROM anonymous_vote_counts
      WHERE is_valid = true AND vote_count > 0
        AND party != 'karasizim'
        AND ${column} IS NOT NULL
        ${roundFilter}
      GROUP BY ${column}, party
      ORDER BY ${column}, vote_count DESC
    `);

    const result = await db.execute(rawQuery);
    const rows = result.rows as Array<{
      bracket: string;
      party: string;
      vote_count: number;
    }>;

    // Build bracket map
    const bracketMap = new Map<
      string,
      { totalVotes: number; parties: Map<string, number> }
    >();

    for (const row of rows) {
      if (row.party === 'karasizim') continue;
      if (!bracketMap.has(row.bracket)) {
        bracketMap.set(row.bracket, { totalVotes: 0, parties: new Map() });
      }
      const entry = bracketMap.get(row.bracket)!;
      entry.totalVotes += row.vote_count;
      entry.parties.set(row.party, row.vote_count);
    }

    // DB'den parti bilgileri
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    for (const p of dbParties) {
      slugToShort[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
    }

    let totalResponders = 0;

    const bracketsResult = brackets.map((b) => {
      const data = bracketMap.get(b.value);
      const totalVotes = data?.totalVotes ?? 0;
      totalResponders += totalVotes;

      const parties = data
        ? Array.from(data.parties.entries())
            .map(([partyId, voteCount]) => ({
              partyId,
              partyName: slugToShort[partyId] || partyId,
              color: slugToColor[partyId] || '#555555',
              voteCount,
              percentage:
                totalVotes > 0
                  ? Math.round((voteCount / totalVotes) * 1000) / 10
                  : 0,
            }))
            .sort((a, b) => b.voteCount - a.voteCount)
        : [];

      return {
        code: b.value,
        label: b.label,
        totalVotes,
        parties,
      };
    });

    return NextResponse.json({
      brackets: bracketsResult,
      totalResponders,
    });
  } catch (error) {
    console.error('Demographics API error:', error);
    return NextResponse.json(
      { error: 'Demografik veriler alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
