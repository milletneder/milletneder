import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create or find a closed round for February 2026
    const roundResult = await client.query(
      `INSERT INTO rounds (start_date, end_date, is_active, is_published, created_at)
       VALUES ($1, $2, false, true, NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['2026-02-01T00:00:00Z', '2026-02-28T23:59:59Z']
    );

    let roundId: number;
    if (roundResult.rows.length > 0) {
      roundId = roundResult.rows[0].id;
    } else {
      // Find existing round that covers February 2026
      const existing = await client.query(
        `SELECT id FROM rounds WHERE start_date = $1 AND end_date = $2 LIMIT 1`,
        ['2026-02-01T00:00:00Z', '2026-02-28T23:59:59Z']
      );
      if (existing.rows.length > 0) {
        roundId = existing.rows[0].id;
      } else {
        // Insert without ON CONFLICT
        const inserted = await client.query(
          `INSERT INTO rounds (start_date, end_date, is_active, is_published, created_at)
           VALUES ($1, $2, false, true, NOW())
           RETURNING id`,
          ['2026-02-01T00:00:00Z', '2026-02-28T23:59:59Z']
        );
        roundId = inserted.rows[0].id;
      }
    }

    console.log(`Round ID: ${roundId}`);

    // 2. The full report data as JSONB
    const reportData = {
      total_votes: 147832,
      valid_votes: 143256,
      invalid_votes: 4576,
      cities_count: 81,
      date_range: {
        start: '2026-02-01',
        end: '2026-02-28',
      },
      change_vs_previous: '+12.4%',

      parties: [
        { name: 'AK Parti', short_name: 'AKP', color: '#F59E0B', votes: 43202, percentage: 30.2, delta: -1.3 },
        { name: 'CHP', short_name: 'CHP', color: '#EF4444', votes: 38671, percentage: 27.0, delta: +2.1 },
        { name: 'MHP', short_name: 'MHP', color: '#DC2626', votes: 14497, percentage: 10.1, delta: -0.5 },
        { name: 'IYI Parti', short_name: 'IYI', color: '#3B82F6', votes: 12878, percentage: 9.0, delta: +0.8 },
        { name: 'DEM Parti', short_name: 'DEM', color: '#8B5CF6', votes: 11683, percentage: 8.2, delta: +0.3 },
        { name: 'Yeniden Refah', short_name: 'YRP', color: '#059669', votes: 8584, percentage: 6.0, delta: -0.9 },
        { name: 'TIP', short_name: 'TIP', color: '#B91C1C', votes: 5770, percentage: 4.0, delta: +0.4 },
        { name: 'Diger', short_name: 'DIG', color: '#6B7280', votes: 7971, percentage: 5.5, delta: -0.2 },
      ],

      cities: [
        { city: 'Istanbul', first_party: 'CHP', first_percentage: 32.1, second_party: 'AK Parti', total_votes: 28450 },
        { city: 'Ankara', first_party: 'CHP', first_percentage: 34.5, second_party: 'AK Parti', total_votes: 14200 },
        { city: 'Izmir', first_party: 'CHP', first_percentage: 42.3, second_party: 'IYI Parti', total_votes: 11800 },
        { city: 'Bursa', first_party: 'AK Parti', first_percentage: 33.8, second_party: 'CHP', total_votes: 7650 },
        { city: 'Antalya', first_party: 'CHP', first_percentage: 35.2, second_party: 'AK Parti', total_votes: 6320 },
        { city: 'Konya', first_party: 'AK Parti', first_percentage: 52.1, second_party: 'MHP', total_votes: 5100 },
        { city: 'Adana', first_party: 'CHP', first_percentage: 31.4, second_party: 'AK Parti', total_votes: 4870 },
        { city: 'Gaziantep', first_party: 'AK Parti', first_percentage: 38.7, second_party: 'CHP', total_votes: 4520 },
        { city: 'Diyarbakir', first_party: 'DEM Parti', first_percentage: 58.3, second_party: 'AK Parti', total_votes: 3980 },
        { city: 'Mersin', first_party: 'CHP', first_percentage: 33.9, second_party: 'AK Parti', total_votes: 3750 },
      ],

      age_groups: [
        {
          bracket: '18-24',
          parties: [
            { name: 'CHP', color: '#EF4444', percentage: 34.2 },
            { name: 'AK Parti', color: '#F59E0B', percentage: 18.5 },
            { name: 'TIP', color: '#B91C1C', percentage: 12.8 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 11.3 },
            { name: 'DEM Parti', color: '#8B5CF6', percentage: 9.1 },
            { name: 'Diger', color: '#6B7280', percentage: 14.1 },
          ],
        },
        {
          bracket: '25-34',
          parties: [
            { name: 'CHP', color: '#EF4444', percentage: 31.5 },
            { name: 'AK Parti', color: '#F59E0B', percentage: 24.2 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 10.8 },
            { name: 'DEM Parti', color: '#8B5CF6', percentage: 9.4 },
            { name: 'MHP', color: '#DC2626', percentage: 8.7 },
            { name: 'Diger', color: '#6B7280', percentage: 15.4 },
          ],
        },
        {
          bracket: '35-44',
          parties: [
            { name: 'AK Parti', color: '#F59E0B', percentage: 32.8 },
            { name: 'CHP', color: '#EF4444', percentage: 26.4 },
            { name: 'MHP', color: '#DC2626', percentage: 12.1 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 9.2 },
            { name: 'Yeniden Refah', color: '#059669', percentage: 7.5 },
            { name: 'Diger', color: '#6B7280', percentage: 12.0 },
          ],
        },
        {
          bracket: '45-54',
          parties: [
            { name: 'AK Parti', color: '#F59E0B', percentage: 36.1 },
            { name: 'CHP', color: '#EF4444', percentage: 23.8 },
            { name: 'MHP', color: '#DC2626', percentage: 13.5 },
            { name: 'Yeniden Refah', color: '#059669', percentage: 8.9 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 7.4 },
            { name: 'Diger', color: '#6B7280', percentage: 10.3 },
          ],
        },
        {
          bracket: '55+',
          parties: [
            { name: 'AK Parti', color: '#F59E0B', percentage: 40.2 },
            { name: 'CHP', color: '#EF4444', percentage: 21.3 },
            { name: 'MHP', color: '#DC2626', percentage: 15.8 },
            { name: 'Yeniden Refah', color: '#059669', percentage: 9.1 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 6.2 },
            { name: 'Diger', color: '#6B7280', percentage: 7.4 },
          ],
        },
      ],

      income_groups: [
        {
          bracket: 'Dusuk Gelir',
          parties: [
            { name: 'AK Parti', color: '#F59E0B', percentage: 35.4 },
            { name: 'CHP', color: '#EF4444', percentage: 22.1 },
            { name: 'MHP', color: '#DC2626', percentage: 12.3 },
            { name: 'Yeniden Refah', color: '#059669', percentage: 10.2 },
            { name: 'DEM Parti', color: '#8B5CF6', percentage: 8.8 },
            { name: 'Diger', color: '#6B7280', percentage: 11.2 },
          ],
        },
        {
          bracket: 'Orta Gelir',
          parties: [
            { name: 'CHP', color: '#EF4444', percentage: 29.3 },
            { name: 'AK Parti', color: '#F59E0B', percentage: 28.7 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 11.4 },
            { name: 'MHP', color: '#DC2626', percentage: 10.1 },
            { name: 'DEM Parti', color: '#8B5CF6', percentage: 7.9 },
            { name: 'Diger', color: '#6B7280', percentage: 12.6 },
          ],
        },
        {
          bracket: 'Yuksek Gelir',
          parties: [
            { name: 'CHP', color: '#EF4444', percentage: 33.8 },
            { name: 'AK Parti', color: '#F59E0B', percentage: 22.4 },
            { name: 'IYI Parti', color: '#3B82F6', percentage: 14.6 },
            { name: 'TIP', color: '#B91C1C', percentage: 8.2 },
            { name: 'MHP', color: '#DC2626', percentage: 7.5 },
            { name: 'Diger', color: '#6B7280', percentage: 13.5 },
          ],
        },
      ],

      vote_changes: [
        { from: 'AK Parti', to: 'CHP', count: 3245 },
        { from: 'AK Parti', to: 'Yeniden Refah', count: 1876 },
        { from: 'CHP', to: 'TIP', count: 1432 },
        { from: 'MHP', to: 'AK Parti', count: 1198 },
        { from: 'IYI Parti', to: 'CHP', count: 987 },
        { from: 'CHP', to: 'DEM Parti', count: 756 },
        { from: 'Yeniden Refah', to: 'AK Parti', count: 654 },
        { from: 'AK Parti', to: 'IYI Parti', count: 543 },
      ],

      transparency: {
        total_votes: 147832,
        valid_votes: 143256,
        invalid_votes: 4576,
        clean_percentage: 96.9,
      },

      participation: {
        registered_voters: 189450,
        total_participants: 147832,
        participation_rate: 78.0,
        new_registrations: 12340,
      },
    };

    // 3. Insert the published report (upsert on slug)
    await client.query(
      `INSERT INTO published_reports (slug, title, round_id, report_data, summary, view_count, is_published, published_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, true, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         round_id = EXCLUDED.round_id,
         report_data = EXCLUDED.report_data,
         summary = EXCLUDED.summary,
         is_published = EXCLUDED.is_published,
         published_at = NOW()`,
      [
        'subat-2026',
        'Subat 2026 Raporu',
        roundId,
        JSON.stringify(reportData),
        'Subat 2026 donemi icin 81 ilden toplanan 147.832 oyun detayli analizi. Parti dagilimi, il bazli sonuclar, yas ve gelir grubu kirilimlari.',
      ]
    );

    await client.query('COMMIT');
    console.log('Seed completed: subat-2026 report inserted.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
