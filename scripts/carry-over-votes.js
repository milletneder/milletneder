/**
 * Devreden Oy Script'i
 *
 * Yeni bir tur başladığında, önceki turda oy kullanmış ama yeni turda
 * henüz oy kullanmamış kullanıcıların oylarını otomatik olarak devretir.
 *
 * Kullanım: node scripts/carry-over-votes.js
 *
 * Mantık:
 * 1. Aktif turu bul
 * 2. Bir önceki turu bul (aktif turun hemen öncesi)
 * 3. Önceki turda oy vermiş ama aktif turda oy vermemiş kullanıcıları bul
 * 4. Bu kullanıcıların oylarını aktif tura is_carried_over=true ile kopyala
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function carryOverVotes() {
  // 1. Aktif turu bul
  const activeRoundResult = await pool.query(
    'SELECT id, start_date FROM rounds WHERE is_active = true LIMIT 1'
  );

  if (activeRoundResult.rows.length === 0) {
    console.log('Aktif tur bulunamadı.');
    await pool.end();
    return;
  }

  const activeRound = activeRoundResult.rows[0];
  console.log(`Aktif tur: #${activeRound.id} (${activeRound.start_date})`);

  // 2. Bir önceki turu bul
  const prevRoundResult = await pool.query(
    'SELECT id FROM rounds WHERE id < $1 ORDER BY id DESC LIMIT 1',
    [activeRound.id]
  );

  if (prevRoundResult.rows.length === 0) {
    console.log('Önceki tur bulunamadı (ilk tur).');
    await pool.end();
    return;
  }

  const prevRoundId = prevRoundResult.rows[0].id;
  console.log(`Önceki tur: #${prevRoundId}`);

  // 3. Önceki turda oy vermiş ama aktif turda oy vermemiş kullanıcılar
  const usersToCarry = await pool.query(`
    SELECT v.user_id, v.party, v.city, v.district, v.is_valid
    FROM votes v
    WHERE v.round_id = $1
      AND v.is_valid = true
      AND v.user_id NOT IN (
        SELECT user_id FROM votes WHERE round_id = $2
      )
  `, [prevRoundId, activeRound.id]);

  console.log(`Devredilecek oy sayısı: ${usersToCarry.rows.length}`);

  if (usersToCarry.rows.length === 0) {
    console.log('Devredilecek oy yok.');
    await pool.end();
    return;
  }

  // 4. Oyları devret
  let carried = 0;
  const carryDate = new Date(activeRound.start_date);
  // Devir tarihi: tur başlangıcından 1-3 saat sonrasına rastgele dağıt

  for (const row of usersToCarry.rows) {
    const offsetMs = Math.floor(Math.random() * 3 * 3600000); // 0-3 saat
    const voteDate = new Date(carryDate.getTime() + offsetMs);

    try {
      await pool.query(`
        INSERT INTO votes (user_id, round_id, party, city, district, is_valid, is_dummy, is_carried_over, carried_from_round, change_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, true, $7, 0, $8, $8)
      `, [
        row.user_id,
        activeRound.id,
        row.party,
        row.city,
        row.district,
        row.is_valid,
        prevRoundId,
        voteDate,
      ]);

      // Transaction log'a yaz (kullanıcı kimliği olmadan)
      await pool.query(`
        INSERT INTO vote_transaction_log (tx_type, round_id, city, district, party, is_valid, is_dummy, created_at)
        VALUES ('OY_DEVIR', $1, $2, $3, $4, $5, false, $6)
      `, [activeRound.id, row.city, row.district, row.party, row.is_valid, voteDate]);

      carried++;
    } catch (err) {
      // Unique constraint violation = zaten oy var, atla
      if (err.code === '23505') continue;
      console.error(`Hata (user_id=${row.user_id}):`, err.message);
    }
  }

  console.log(`${carried} oy başarıyla devredildi.`);

  // Anonymous vote counts tablosuna toplu ekle
  console.log('Anonymous vote counts güncelleniyor...');
  await pool.query(`
    INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
    SELECT $1, v.party, v.city, v.district, u.age_bracket, u.gender, u.education,
      u.income_bracket, u.turnout_intention, u.previous_vote_2023, v.is_valid, v.is_dummy, COUNT(*)::int
    FROM votes v JOIN users u ON v.user_id = u.id
    WHERE v.round_id = $1 AND v.is_carried_over = true AND v.party IS NOT NULL
    GROUP BY v.party, v.city, v.district, u.age_bracket, u.gender, u.education,
      u.income_bracket, u.turnout_intention, u.previous_vote_2023, v.is_valid, v.is_dummy
    ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
    DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + EXCLUDED.vote_count
  `, [activeRound.id]);
  console.log('Anonymous vote counts güncellendi.');

  // Doğrulama
  const total = await pool.query(
    'SELECT count(*) as c FROM votes WHERE round_id = $1 AND is_carried_over = true',
    [activeRound.id]
  );
  console.log(`Aktif turda toplam devreden oy: ${total.rows[0].c}`);

  await pool.end();
}

carryOverVotes().catch(e => { console.error(e); process.exit(1); });
