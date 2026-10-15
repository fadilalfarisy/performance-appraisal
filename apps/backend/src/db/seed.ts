import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Idempotent seed: creates the first admin user and the initial criteria set
 * (v1, ACTIVE) if they do not exist. Safe to run more than once.
 */
const INITIAL_CRITERIA = [
  { code: 'QUALITY', name: 'Quality of Work' },
  { code: 'QUANTITY', name: 'Quantity of Work' },
  { code: 'DISCIPLINE', name: 'Discipline' },
  { code: 'RESPONSIBILITY', name: 'Responsibility' },
  { code: 'INSTRUCTIONS', name: 'Running of Instructions' },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // 1. First admin user
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';

  const [admin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);

  if (!admin) {
    const hash = await bcrypt.hash(password, 10);
    await db.insert(schema.users).values({
      username,
      password: hash,
      role: 'ADMIN',
      employeeId: null,
    });
    console.log(`Seed: created admin user '${username}'`);
  } else {
    console.log(`Seed: admin user '${username}' already exists`);
  }

  // 2. Initial criteria set v1 (ACTIVE with placeholder weights)
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.criteriaSets);

  if (Number(countRow?.count ?? 0) === 0) {
    const [set] = await db
      .insert(schema.criteriaSets)
      .values({
        version: 1,
        status: 'ACTIVE',
        note: 'Initial criteria set (placeholder weights — confirm with HR)',
        activatedAt: new Date(),
      })
      .returning();
    if (!set) {
      throw new Error('Failed to create the initial criteria set');
    }

    for (const [index, entry] of INITIAL_CRITERIA.entries()) {
      const [criterion] = await db
        .insert(schema.criteria)
        .values({
          criteriaSetId: set.id,
          code: entry.code,
          name: entry.name,
          description: entry.name,
          scaleMin: 1,
          scaleMax: 5,
          weight: 20,
          displayOrder: index,
        })
        .returning();
      if (!criterion) {
        throw new Error(`Failed to create criterion ${entry.code}`);
      }

      await db.insert(schema.criteriaScaleDescriptions).values(
        [1, 2, 3, 4, 5].map((score) => ({
          criterionId: criterion.id,
          score,
          description: `Level ${score} (placeholder)`,
        })),
      );
    }
    console.log('Seed: created criteria set v1');
  } else {
    console.log('Seed: criteria set already exists');
  }

  await pool.end();
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
