import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Production migration runner. Kept separate from drizzle-kit (a dev-only
 * dependency) so the production image can apply migrations with no extra tools.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: './drizzle' });
  await pool.end();
  console.log('Migrations applied');
}

main().catch((error) => {
  console.error('Migration failed', error);
  process.exit(1);
});
