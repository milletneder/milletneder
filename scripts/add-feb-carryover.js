// Şubat'ta oy verip Mart'ta oy vermemiş kullanıcıların oylarını Mart'a devret
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Şubat'ta oy verip Mart'ta vermemiş kullanıcıları bul
  const result = await pool.query(`
    SELECT v.user_id, v.party, v.city
    FROM votes v
    WHERE v.round_id = 1 AND v.is_valid = true
    AND NOT EXISTS (
      SELECT 1 FROM votes v2
      WHERE v2.user_id = v.user_id AND v2.round_id = 2
    )
  `);

  console.log(`${result.rows.length} kullanıcının oyu Mart'a devredilecek`);

  // Round 2 tarihleri: 2026-03-01 ~ 2026-03-31
  // Devir, turun başlangıcında gerçekleşmiş olsun
  for (const row of result.rows) {
    // Mart turunun ilk günü civarında devir
    const devDate = new Date('2026-03-01T06:00:00Z');
    devDate.setTime(devDate.getTime() + Math.random() * 3600000 * 2); // 0-2 saat arası

    await pool.query(`
      INSERT INTO votes (user_id, round_id, party, city, is_valid, is_carried_over, created_at)
      VALUES ($1, 2, $2, $3, true, true, $4)
    `, [row.user_id, row.party, row.city, devDate]);
  }

  console.log('Mart devir oyları eklendi');

  // Kontrol
  const check = await pool.query(`
    SELECT round_id, is_carried_over, count(*) as c
    FROM votes
    GROUP BY round_id, is_carried_over
    ORDER BY round_id, is_carried_over
  `);
  console.log(JSON.stringify(check.rows, null, 2));

  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
