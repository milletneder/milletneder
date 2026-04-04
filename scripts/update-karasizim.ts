import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const queryFn = neon(process.env.DATABASE_URL!);
const db = drizzle(queryFn);

async function main() {
  console.log('1. Deactivating "diger" party...');
  await db.execute(sql`UPDATE parties SET is_active = false WHERE slug = 'diger'`);
  console.log('   Done.');

  console.log('2. Adding/updating "karasizim" option...');
  await db.execute(sql`
    INSERT INTO parties (slug, name, short_name, color, text_color, logo_url, is_active, display_order)
    VALUES ('karasizim', 'Kararsızım', 'Kararsız', '#999999', '#ffffff', NULL, true, 999)
    ON CONFLICT (slug) DO UPDATE SET
      name = 'Kararsızım',
      short_name = 'Kararsız',
      color = '#999999',
      is_active = true,
      display_order = 999
  `);
  console.log('   Done.');

  console.log('3. Converting existing "diger" votes to "karasizim"...');
  await db.execute(sql`UPDATE votes SET party = 'karasizim' WHERE party = 'diger'`);
  console.log('   Done.');

  // Verify
  const parties = await db.execute(sql`SELECT slug, name, is_active FROM parties WHERE slug IN ('diger', 'karasizim')`);
  console.log('4. Verification:', JSON.stringify(parties.rows));

  console.log('All updates completed!');
}

main().catch(e => { console.error(e); process.exit(1); });
