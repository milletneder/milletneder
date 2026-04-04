const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const parties = ['chp', 'ak-parti', 'mhp', 'iyi', 'dem', 'yeniden-refah', 'tip', 'zafer'];

async function addVoteChanges() {
  // Round 1 (Şubat): ~80 oy değişikliği
  const r1Votes = await pool.query(
    'SELECT id, user_id, round_id, party, created_at FROM votes WHERE round_id = 1 AND is_valid = true ORDER BY random() LIMIT 80'
  );

  // Round 2 (Mart): ~120 oy değişikliği
  const r2Votes = await pool.query(
    'SELECT id, user_id, round_id, party, created_at FROM votes WHERE round_id = 2 AND is_valid = true ORDER BY random() LIMIT 120'
  );

  let inserted = 0;

  for (const vote of [...r1Votes.rows, ...r2Votes.rows]) {
    // Farklı bir parti seç (eski parti)
    const otherParties = parties.filter(p => p !== vote.party);
    const oldParty = otherParties[Math.floor(Math.random() * otherParties.length)];

    // Oy tarihinden 1-10 gün sonra değiştirilmiş olsun
    const voteDate = new Date(vote.created_at);
    const changeDate = new Date(voteDate.getTime() + (1 + Math.floor(Math.random() * 10)) * 86400000);

    // Round bitiş tarihini aşmasın
    const roundEnd = vote.round_id === 1
      ? new Date('2026-02-28T23:00:00Z')
      : new Date('2026-03-31T22:00:00Z');

    const finalDate = changeDate > roundEnd
      ? new Date(roundEnd.getTime() - Math.random() * 86400000 * 3)
      : changeDate;

    await pool.query(
      'INSERT INTO vote_changes (vote_id, user_id, round_id, old_party, new_party, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [vote.id, vote.user_id, vote.round_id, oldParty, vote.party, finalDate]
    );

    // change_count'u 1 yap
    await pool.query('UPDATE votes SET change_count = 1 WHERE id = $1', [vote.id]);
    inserted++;
  }

  // Bazılarına 2. değişiklik de ekle (~30 tane)
  const doubleChanges = await pool.query(
    'SELECT vc.vote_id, vc.user_id, vc.round_id, vc.new_party, vc.created_at FROM vote_changes vc ORDER BY random() LIMIT 30'
  );

  for (const vc of doubleChanges.rows) {
    const otherParties = parties.filter(p => p !== vc.new_party);
    const secondOld = otherParties[Math.floor(Math.random() * otherParties.length)];

    const changeDate = new Date(new Date(vc.created_at).getTime() + (1 + Math.floor(Math.random() * 5)) * 86400000);
    const roundEnd = vc.round_id === 1
      ? new Date('2026-02-28T23:00:00Z')
      : new Date('2026-03-31T22:00:00Z');
    const finalDate = changeDate > roundEnd
      ? new Date(roundEnd.getTime() - Math.random() * 86400000)
      : changeDate;

    await pool.query(
      'INSERT INTO vote_changes (vote_id, user_id, round_id, old_party, new_party, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [vc.vote_id, vc.user_id, vc.round_id, secondOld, vc.new_party, finalDate]
    );

    await pool.query('UPDATE votes SET change_count = 2 WHERE id = $1', [vc.vote_id]);
    inserted++;
  }

  console.log('Eklenen vote_changes:', inserted);

  const count = await pool.query('SELECT count(*) as c FROM vote_changes');
  console.log('Toplam vote_changes:', count.rows[0].c);

  await pool.end();
}

addVoteChanges().catch(e => { console.error(e); process.exit(1); });
