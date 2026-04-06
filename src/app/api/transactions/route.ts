import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { parties as partiesTable } from "@/lib/db/schema";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// transaction log id + timestamp'tan transaction hash üret
function txHash(type: string, id: number, ts: string): string {
  const hash = crypto.createHash("sha256").update(`mnd_tx_${type}_${id}_${ts}`).digest("hex");
  return `0x${hash.slice(0, 16)}`;
}

interface TransactionRow {
  tx_type: string;
  id: number;
  city: string | null;
  party: string | null;
  old_party: string | null;
  new_party: string | null;
  round_id: number;
  is_valid: boolean | null;
  created_at: string;
}

// Güvenli whitelist — sadece bunlar kabul edilir
const VALID_TYPES = ['OY_KULLANIM', 'OY_DEGISIKLIK', 'OY_DEVIR', 'KAYIT', 'OY_SILME', 'HESAP_SILME'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 50));
    const typeFilter = searchParams.get("type");
    const cityFilter = searchParams.get("city");
    const partyFilter = searchParams.get("party");
    const statusFilter = searchParams.get("status"); // 'invalid' | 'flagged'
    const offset = (page - 1) * limit;

    // Whitelist validasyonu — SQL injection engeli
    if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
      return NextResponse.json({ error: "Geçersiz tür filtresi" }, { status: 400 });
    }

    // Parti slug→shortName eşleştirmesi
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    for (const p of dbParties) {
      slugToShort[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
    }

    // Transaction log tablosundan oku — kullanıcı bağlantısı yok
    const allRows = await db.execute(sql`
      SELECT tx_type, id, city, party, old_party, new_party,
             round_id, is_valid, to_char(created_at AT TIME ZONE 'Europe/Berlin' AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
      FROM vote_transaction_log
      ORDER BY created_at DESC, id DESC
    `);

    let rows = allRows.rows as unknown as TransactionRow[];

    // Tür bazlı sayılar (filtresiz)
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.tx_type] = (counts[row.tx_type] || 0) + 1;
    }

    // JS tarafında filtreleme — SQL injection riski sıfır
    if (typeFilter) {
      rows = rows.filter(r => r.tx_type === typeFilter);
    } else {
      // OY_DEVIR varsayılan olarak gizli
      rows = rows.filter(r => r.tx_type !== 'OY_DEVIR');
    }

    if (cityFilter) {
      const cityLower = cityFilter.toLowerCase();
      rows = rows.filter(r => r.city?.toLowerCase().includes(cityLower));
    }

    // Parti filtresi — parti slug veya short_name ile eşleşir
    if (partyFilter) {
      const partyLower = partyFilter.toLowerCase();
      // slug → short_name eşlemesini ters çevir (short_name → slug)
      const shortToSlug: Record<string, string> = {};
      for (const [slug, short] of Object.entries(slugToShort)) {
        shortToSlug[short.toLowerCase()] = slug;
      }
      const matchSlug = shortToSlug[partyLower] || partyLower;
      rows = rows.filter(r => {
        const party = r.party || r.new_party;
        return party?.toLowerCase() === matchSlug;
      });
    }

    // Durum filtresi — geçersiz oylar
    if (statusFilter === 'invalid') {
      rows = rows.filter(r => r.is_valid === false);
    } else if (statusFilter === 'flagged') {
      // Transaction log'da user_id yok, flagged filtresi uygulanamaz
      rows = [];
    }

    const total = rows.length;
    const paginatedRows = rows.slice(offset, offset + limit);

    const transactions = paginatedRows.map((row) => {
      const partyName = row.party ? (slugToShort[row.party] || row.party) : null;
      const partyColor = row.party ? (slugToColor[row.party] || "#555") : null;
      const oldPartyName = row.old_party ? (slugToShort[row.old_party] || row.old_party) : null;
      const oldPartyColor = row.old_party ? (slugToColor[row.old_party] || "#555") : null;
      const newPartyName = row.new_party ? (slugToShort[row.new_party] || row.new_party) : null;
      const newPartyColor = row.new_party ? (slugToColor[row.new_party] || "#555") : null;

      return {
        hash: txHash(row.tx_type, row.id, row.created_at),
        type: row.tx_type,
        city: row.city || null,
        party: partyName,
        partyColor,
        oldParty: oldPartyName,
        oldPartyColor,
        newParty: newPartyName,
        newPartyColor,
        roundId: row.round_id,
        isValid: row.is_valid,
        timestamp: row.created_at,
      };
    });

    // Flagged hesap sayısı
    const flaggedResult = await db.execute(sql`
      SELECT count(*)::int as cnt FROM users WHERE is_flagged = true AND is_active = true
    `);
    const flaggedCount = (flaggedResult.rows[0] as { cnt: number }).cnt;

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
      flaggedCount,
    });
  } catch (error) {
    console.error("Transactions error:", error);
    return NextResponse.json(
      { error: "İşlemler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
