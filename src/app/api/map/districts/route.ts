import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parties as partiesTable, cityElectionResults2023, districtElectionResults2023, rounds } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");

    const rawMode = searchParams.get("raw") === "true";
    const distributeKarasiz = searchParams.get("includeKarasiz") === "true";

    if (!city) {
      return NextResponse.json({ error: "city parametresi gerekli" }, { status: 400 });
    }

    // Aktif turu bul
    const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
    const activeRoundId = activeRound?.id;

    // Anonymous vote counts tablosundan oku — sadece aktif tur
    const latestVotes = activeRoundId
      ? await db.execute(sql`
        SELECT district, party, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND city = ${city} AND vote_count > 0 AND round_id = ${activeRoundId}
        GROUP BY district, party, previous_vote_2023
      `)
      : await db.execute(sql`
        SELECT district, party, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND city = ${city} AND vote_count > 0
        GROUP BY district, party, previous_vote_2023
      `);
    const rows = latestVotes.rows as Array<{ district: string | null; party: string; previous_vote_2023: string | null; vote_count: number }>;

    // 2023 seçim sonuçları — tiebreaker + kararsız redistribüsyon (il bazlı fallback)
    const electionRows = await db.select().from(cityElectionResults2023)
      .where(eq(cityElectionResults2023.city, city));
    const election2023: Record<string, number> = {};
    for (const r of electionRows) {
      election2023[r.party_slug] = r.vote_count;
    }

    // İlçe bazlı 2023 seçim sonuçları (daha hassas tiebreaker)
    const districtElectionRows = await db.select().from(districtElectionResults2023)
      .where(eq(districtElectionResults2023.city, city));
    const districtElection2023: Record<string, Record<string, number>> = {};
    for (const r of districtElectionRows) {
      if (!districtElection2023[r.district]) districtElection2023[r.district] = {};
      districtElection2023[r.district][r.party_slug] = r.vote_count;
    }

    // DB'den parti bilgileri
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    const validPartySlugs = new Set<string>();
    for (const p of dbParties) {
      slugToShort[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
      if (p.slug !== 'karasizim') validPartySlugs.add(p.slug);
    }

    // İlçe bazlı grupla
    const districtMap: Record<string, {
      totalRaw: number;
      totalWeighted: number;
      partyWeighted: Record<string, number>;
      partyRaw: Record<string, number>;
    }> = {};

    // Kararsız seçmenleri ayrı topla (redistribüsyon için)
    const karasizByDistrict: Record<string, Array<{ previous_vote_2023: string | null; count: number }>> = {};

    for (const row of rows) {
      const district = row.district || 'Bilinmiyor';

      if (row.party === 'karasizim') {
        if (distributeKarasiz) {
          if (!karasizByDistrict[district]) karasizByDistrict[district] = [];
          karasizByDistrict[district].push({ previous_vote_2023: row.previous_vote_2023, count: row.vote_count });
        }
        continue;
      }

      if (!districtMap[district]) {
        districtMap[district] = { totalRaw: 0, totalWeighted: 0, partyWeighted: {}, partyRaw: {} };
      }
      const d = districtMap[district];
      d.totalRaw += row.vote_count;
      d.totalWeighted += row.vote_count;
      d.partyRaw[row.party] = (d.partyRaw[row.party] || 0) + row.vote_count;
      d.partyWeighted[row.party] = (d.partyWeighted[row.party] || 0) + row.vote_count;
    }

    // ─── Kararsız oyları redistribüte et ───
    if (distributeKarasiz) {
      for (const [district, karasizGroups] of Object.entries(karasizByDistrict)) {
        if (!districtMap[district]) {
          districtMap[district] = { totalRaw: 0, totalWeighted: 0, partyWeighted: {}, partyRaw: {} };
        }
        const d = districtMap[district];

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
              const total = Object.values(election2023).reduce((s, c) => s + c, 0);
              if (total > 0) {
                const rand = Math.random() * total;
                let cumulative = 0;
                for (const [slug, count] of Object.entries(election2023)) {
                  if (!validPartySlugs.has(slug)) continue;
                  cumulative += count;
                  if (rand <= cumulative) {
                    targetParty = slug;
                    break;
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

    // Örneklem büyüklüğüne göre harmanlama
    const MIN_SAMPLE_FOR_FULL_WEIGHT = 30;

    const districts = Object.entries(districtMap)
      .map(([name, data]) => {
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

        // İlçe bazlı 2023 verisi varsa onu kullan, yoksa il bazlı fallback
        const distElection = districtElection2023[name] || election2023;
        blended.sort((a, b) => {
          if (Math.abs(b.pct - a.pct) > 0.01) return b.pct - a.pct;
          return (distElection[b.slug] || 0) - (distElection[a.slug] || 0);
        });

        const leadingSlug = blended[0]?.slug || '';

        const parties = blended.map(p => ({
          party: slugToShort[p.slug] || p.slug,
          color: slugToColor[p.slug] || '#d4d4d4',
          count: p.rawCount,
          percentage: p.pct,
        }));

        return {
          name,
          totalVotes: data.totalRaw,
          leadingParty: slugToShort[leadingSlug] || leadingSlug,
          leadingColor: slugToColor[leadingSlug] || '#d4d4d4',
          parties,
        };
      })
      .sort((a, b) => b.totalVotes - a.totalVotes);

    return NextResponse.json({ city, districts });
  } catch (error) {
    console.error("District data error:", error);
    return NextResponse.json(
      { error: "İlçe verileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
