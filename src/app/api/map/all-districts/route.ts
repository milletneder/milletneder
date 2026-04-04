import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parties as partiesTable, cityElectionResults2023, rounds } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMode = searchParams.get("raw") === "true";
    const distributeKarasiz = searchParams.get("includeKarasiz") === "true";

    // Aktif turu bul
    const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
    const activeRoundId = activeRound?.id;

    // Anonymous vote counts tablosundan oku — sadece aktif tur
    const latestVotes = activeRoundId
      ? await db.execute(sql`
        SELECT city, district, party, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND vote_count > 0 AND round_id = ${activeRoundId}
        GROUP BY city, district, party, previous_vote_2023
      `)
      : await db.execute(sql`
        SELECT city, district, party, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND vote_count > 0
        GROUP BY city, district, party, previous_vote_2023
      `);
    const rows = latestVotes.rows as Array<{ city: string; district: string | null; party: string; previous_vote_2023: string | null; vote_count: number }>;

    // 2023 seçim sonuçları — tiebreaker + kararsız redistribüsyon
    const electionRows = await db.select().from(cityElectionResults2023);
    const cityElection2023: Record<string, Record<string, number>> = {};
    for (const r of electionRows) {
      if (!cityElection2023[r.city]) cityElection2023[r.city] = {};
      cityElection2023[r.city][r.party_slug] = r.vote_count;
    }

    // Parti bilgileri
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    const validPartySlugs = new Set<string>();
    for (const p of dbParties) {
      slugToShort[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
      if (p.slug !== 'karasizim') validPartySlugs.add(p.slug);
    }

    // İlçe bazlı grupla — key: "city|district"
    const districtMap: Record<string, {
      city: string;
      district: string;
      totalRaw: number;
      totalWeighted: number;
      partyWeighted: Record<string, number>;
      partyRaw: Record<string, number>;
    }> = {};

    // Kararsız seçmenleri ayrı topla
    const karasizByKey: Record<string, Array<{ previous_vote_2023: string | null; city: string; count: number }>> = {};

    for (const row of rows) {
      const district = row.district || 'Bilinmiyor';
      const key = `${row.city}|${district}`;

      if (row.party === 'karasizim') {
        if (distributeKarasiz) {
          if (!karasizByKey[key]) karasizByKey[key] = [];
          karasizByKey[key].push({ previous_vote_2023: row.previous_vote_2023, city: row.city, count: row.vote_count });
        }
        continue;
      }

      if (!districtMap[key]) {
        districtMap[key] = { city: row.city, district, totalRaw: 0, totalWeighted: 0, partyWeighted: {}, partyRaw: {} };
      }
      const d = districtMap[key];
      d.totalRaw += row.vote_count;
      d.totalWeighted += row.vote_count;
      d.partyRaw[row.party] = (d.partyRaw[row.party] || 0) + row.vote_count;
      d.partyWeighted[row.party] = (d.partyWeighted[row.party] || 0) + row.vote_count;
    }

    // ─── Kararsız oyları redistribüte et ───
    if (distributeKarasiz) {
      for (const [key, karasizGroups] of Object.entries(karasizByKey)) {
        const [city, district] = key.split('|');
        if (!districtMap[key]) {
          districtMap[key] = { city, district, totalRaw: 0, totalWeighted: 0, partyWeighted: {}, partyRaw: {} };
        }
        const d = districtMap[key];

        for (const group of karasizGroups) {
          for (let i = 0; i < group.count; i++) {
            let targetParty: string | null = null;

            // Tier 1: 2023'teki partisine dağıt
            if (group.previous_vote_2023 && validPartySlugs.has(group.previous_vote_2023)) {
              targetParty = group.previous_vote_2023;
            }

            // Tier 2: İlçedeki mevcut parti dağılımına orantılı
            if (!targetParty) {
              const distribution = d.partyRaw;
              const total = Object.values(distribution).reduce((s, c) => s + c, 0);
              if (total > 0) {
                const rand = Math.random() * total;
                let cumulative = 0;
                for (const [slug, count] of Object.entries(distribution)) {
                  cumulative += count;
                  if (rand <= cumulative) {
                    targetParty = slug;
                    break;
                  }
                }
              }
            }

            // Tier 3: 2023 seçim sonuçlarına göre
            if (!targetParty) {
              const election = cityElection2023[group.city];
              if (election) {
                const total = Object.values(election).reduce((s, c) => s + c, 0);
                if (total > 0) {
                  const rand = Math.random() * total;
                  let cumulative = 0;
                  for (const [slug, count] of Object.entries(election)) {
                    if (!validPartySlugs.has(slug)) continue;
                    cumulative += count;
                    if (rand <= cumulative) {
                      targetParty = slug;
                      break;
                    }
                  }
                }
              }
            }

            if (targetParty) {
              d.totalRaw += 1;
              d.totalWeighted += 1;
              d.partyRaw[targetParty] = (d.partyRaw[targetParty] || 0) + 1;
              d.partyWeighted[targetParty] = (d.partyWeighted[targetParty] || 0) + 1;
            }
          }
        }
      }
    }

    const MIN_SAMPLE_FOR_FULL_WEIGHT = 30;

    const districts = Object.values(districtMap)
      .map((data) => {
        const confidence = Math.min(data.totalRaw / MIN_SAMPLE_FOR_FULL_WEIGHT, 1.0);

        const allSlugs = new Set([
          ...Object.keys(data.partyRaw),
          ...Object.keys(data.partyWeighted),
        ]);

        const blended: Array<{ slug: string; pct: number; rawCount: number }> = [];
        for (const slug of allSlugs) {
          const rawPct = data.totalRaw > 0 ? ((data.partyRaw[slug] || 0) / data.totalRaw) * 100 : 0;
          const weightedPct = data.totalWeighted > 0 ? ((data.partyWeighted[slug] || 0) / data.totalWeighted) * 100 : 0;
          const blendedPct = rawPct * (1 - confidence) + weightedPct * confidence;
          blended.push({ slug, pct: Math.round(blendedPct * 100) / 100, rawCount: data.partyRaw[slug] || 0 });
        }

        const election = cityElection2023[data.city] || {};
        blended.sort((a, b) => {
          if (Math.abs(b.pct - a.pct) > 0.01) return b.pct - a.pct;
          return (election[b.slug] || 0) - (election[a.slug] || 0);
        });

        const leadingSlug = blended[0]?.slug || '';

        return {
          city: data.city,
          name: data.district,
          totalVotes: data.totalRaw,
          leadingParty: slugToShort[leadingSlug] || leadingSlug,
          leadingColor: slugToColor[leadingSlug] || '#d4d4d4',
          parties: blended.map(p => ({
            party: slugToShort[p.slug] || p.slug,
            color: slugToColor[p.slug] || '#d4d4d4',
            count: p.rawCount,
            percentage: p.pct,
          })),
        };
      })
      .sort((a, b) => b.totalVotes - a.totalVotes);

    return NextResponse.json({ districts });
  } catch (error) {
    console.error("All districts data error:", error);
    return NextResponse.json(
      { error: "İlçe verileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
