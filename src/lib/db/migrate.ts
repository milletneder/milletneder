import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('neon.tech') || url.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle(pool);

  console.log('[migrate] Running migrations...');
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
  console.log('[migrate] All migrations applied successfully.');

  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
