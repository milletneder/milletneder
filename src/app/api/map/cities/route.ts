import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { parties as partiesTable, cityElectionResults2023, rounds } from "@/lib/db/schema";
import { computeCityWeightedResults } from "@/lib/weighting/engine";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showPartyColors = searchParams.get("showPartyColors") === "true";
    const rawMode = searchParams.get("raw") === "true";
    const distributeKarasiz = searchParams.get("includeKarasiz") === "true";

    // Aktif turu bul
    const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
    const activeRoundId = activeRound?.id;

    // Anonymous vote counts tablosundan oku — sadece aktif tur
    const latestVotesQuery = activeRoundId
      ? sql`
        SELECT city, party, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND vote_count > 0 AND round_id = ${activeRoundId}
        GROUP BY city, party, previous_vote_2023
      `
      : sql`
        SELECT city, party, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND vote_count > 0
        GROUP BY city, party, previous_vote_2023
      `;

    const latestVotes = await db.execute(latestVotesQuery);
    const rows = latestVotes.rows as { city: string; party: string; previous_vote_2023: string | null; vote_count: number }[];

    // 2023 seçim sonuçları — tiebreaker + kararsız redistribüsyon için
    const electionRows = await db.select().from(cityElectionResults2023);
    const cityElection2023: Record<string, Record<string, number>> = {};
    for (const r of electionRows) {
      if (!cityElection2023[r.city]) cityElection2023[r.city] = {};
      cityElection2023[r.city][r.party_slug] = r.vote_count;
    }

    // DB'den parti kısa adlarını ve renklerini çek
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    const validPartySlugs = new Set<string>();
    for (const p of dbParties) {
      slugToShort[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
      if (p.slug !== 'karasizim') validPartySlugs.add(p.slug);
    }

    // Şehir + parti bazlı grupla
    const cityMap: Record<string, {
      totalVotes: number;
      partyDistribution: Record<string, number>;
    }> = {};

    // Kararsız seçmenleri ayrı topla (redistribüsyon için)
    const karasizByCity: Record<string, Array<{ previous_vote_2023: string | null; count: number }>> = {};

    for (const row of rows) {
      if (row.party === 'karasizim') {
        if (distributeKarasiz) {
          if (!karasizByCity[row.city]) karasizByCity[row.city] = [];
          karasizByCity[row.city].push({ previous_vote_2023: row.previous_vote_2023, count: row.vote_count });
        }
        continue;
      }

      if (!cityMap[row.city]) {
        cityMap[row.city] = { totalVotes: 0, partyDistribution: {} };
      }
      const cityData = cityMap[row.city];
      cityData.totalVotes += row.vote_count;
      cityData.partyDistribution[row.party] = (cityData.partyDistribution[row.party] || 0) + row.vote_count;
    }

    // ─── Kararsız oyları redistribüte et ───
    if (distributeKarasiz) {
      for (const [city, karasizGroups] of Object.entries(karasizByCity)) {
        if (!cityMap[city]) {
          cityMap[city] = { totalVotes: 0, partyDistribution: {} };
        }
        const cityData = cityMap[city];

        for (const group of karasizGroups) {
          for (let i = 0; i < group.count; i++) {
            let targetParty: string | null = null;

            // Tier 1: 2023'teki partisine dağıt (geçerli bir parti ise)
            if (group.previous_vote_2023 && validPartySlugs.has(group.previous_vote_2023)) {
              targetParty = group.previous_vote_2023;
            }

            // Tier 2: O ildeki mevcut parti dağılımına orantılı dağıt
            if (!targetParty) {
              const distribution = cityData.partyDistribution;
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

            // Tier 3: Fallback — 2023 seçim sonuçlarına göre dağıt
            if (!targetParty) {
              const election = cityElection2023[city];
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
              cityData.totalVotes += 1;
              cityData.partyDistribution[targetParty] = (cityData.partyDistribution[targetParty] || 0) + 1;
            }
          }
        }
      }
    }

    if (showPartyColors) {
      // Ağırlıklı sonuçları al — harita renkleri ve yüzdeler için
      // rawMode veya distributeKarasiz açıksa ağırlıklandırmayı atla (redistribüte edilmiş ham veriler kullanılır)
      let cityWeighted: Map<string, { totalWeighted: number; totalRaw: number; parties: Array<{ partySlug: string; weightedCount: number; weightedPct: number; rawCount: number }>; leadingParty: string }>;
      if (rawMode || distributeKarasiz) {
        cityWeighted = new Map();
      } else {
        try {
          cityWeighted = await computeCityWeightedResults();
        } catch (e) {
          console.error("City weighted results error, falling back to raw:", e);
          cityWeighted = new Map();
        }
      }

      const MIN_SAMPLE_FOR_FULL_WEIGHT = 50;

      const result = Object.entries(cityMap).map(([city, data]) => {
        const weighted = cityWeighted.get(city);

        const rawPcts: Record<string, number> = {};
        for (const [slug, count] of Object.entries(data.partyDistribution)) {
          rawPcts[slug] = data.totalVotes > 0 ? (count / data.totalVotes) * 100 : 0;
        }

        if (weighted && weighted.parties.length > 0) {
          const confidence = Math.min(data.totalVotes / MIN_SAMPLE_FOR_FULL_WEIGHT, 1.0);

          const allSlugs = new Set([
            ...Object.keys(data.partyDistribution),
            ...weighted.parties.map(p => p.partySlug),
          ]);

          const blended: Array<{ slug: string; pct: number; rawCount: number }> = [];
          for (const slug of allSlugs) {
            const rawPct = rawPcts[slug] || 0;
            const wParty = weighted.parties.find(p => p.partySlug === slug);
            const weightedPct = wParty?.weightedPct || 0;

            const blendedPct = rawPct * (1 - confidence) + weightedPct * confidence;
            blended.push({
              slug,
              pct: Math.round(blendedPct * 100) / 100,
              rawCount: data.partyDistribution[slug] || 0,
            });
          }

          blended.sort((a, b) => {
            if (Math.abs(b.pct - a.pct) > 0.01) return b.pct - a.pct;
            const election = cityElection2023[city] || {};
            return (election[b.slug] || 0) - (election[a.slug] || 0);
          });

          const leadingSlug = blended[0]?.slug || '';

          return {
            city,
            totalVotes: data.totalVotes,
            leadingParty: slugToShort[leadingSlug] || leadingSlug,
            partyColor: slugToColor[leadingSlug] || '#d4d4d4',
            partyDistribution: blended.map(p => ({
              party: slugToShort[p.slug] || p.slug,
              color: slugToColor[p.slug] || '#d4d4d4',
              count: p.rawCount,
              percentage: p.pct,
            })),
          };
        }

        // Fallback: ham veriler
        const entries = Object.entries(data.partyDistribution);
        entries.sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          const election = cityElection2023[city] || {};
          return (election[b[0]] || 0) - (election[a[0]] || 0);
        });
        const leadingParty = entries[0]?.[0] || '';

        return {
          city,
          totalVotes: data.totalVotes,
          leadingParty: slugToShort[leadingParty] || leadingParty,
          partyColor: slugToColor[leadingParty] || '#d4d4d4',
          partyDistribution: entries.map(([slug, count]) => ({
            party: slugToShort[slug] || slug,
            color: slugToColor[slug] || '#d4d4d4',
            count,
            percentage: data.totalVotes > 0 ? (count / data.totalVotes) * 100 : 0,
          })),
        };
      });

      return NextResponse.json({ isPublished: true, cities: result });
    } else {
      const result = Object.entries(cityMap).map(([city, data]) => ({
        city,
        totalVotes: data.totalVotes,
      }));

      return NextResponse.json({ isPublished: false, cities: result });
    }
  } catch (error) {
    console.error("Map cities error:", error);
    return NextResponse.json(
      { error: "Şehir verileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
