import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import type { Database } from './db.type';
import * as schema from './schema';
import { resolveSeedPlan, type SeedPlan } from './seed.plan';
import { seedDemoMasterData } from './seed-demo';

/**
 * Env-aware seed. What it writes depends on NODE_ENV (see seed.plan.ts):
 *
 *   development/test → reference data, admin user, demo employees + contracts
 *   production       → reference data, plus the admin user only when
 *                      SEED_ADMIN_PASSWORD is set explicitly
 *
 * Every step is idempotent and safe to re-run.
 */

const INITIAL_CRITERIA = [
  { code: 'QUALITY', name: 'Quality of Work' },
  { code: 'QUANTITY', name: 'Quantity of Work' },
  { code: 'DISCIPLINE', name: 'Discipline' },
  { code: 'RESPONSIBILITY', name: 'Responsibility' },
  { code: 'INSTRUCTIONS', name: 'Running of Instructions' },
];

const DEMO_DEPARTMENTS = [
  'Production',
  'Finance',
  'Human Resource',
  'Information Technology',
  'Marketing',
];

const DEMO_POSITIONS: Array<[string, number]> = [
  ['Staff', 1],
  ['Senior Staff', 2],
  ['Supervisor', 3],
  ['Manager', 4],
  ['Head of Department', 5],
];

async function seedDepartments(db: Database): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.departments)
    .where(eq(schema.departments.isDeleted, false));

  if (Number(row?.count ?? 0) > 0) {
    console.log('Seed: departments already exist, skipped');
    return;
  }

  await db.insert(schema.departments).values(
    DEMO_DEPARTMENTS.map((name, index) => ({
      code: `DEP${String(index + 1).padStart(3, '0')}`,
      name,
    })),
  );
  console.log(`Seed: created ${DEMO_DEPARTMENTS.length} departments`);
}

async function seedPositions(db: Database): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.positions)
    .where(eq(schema.positions.isDeleted, false));

  if (Number(row?.count ?? 0) > 0) {
    console.log('Seed: positions already exist, skipped');
    return;
  }

  await db.insert(schema.positions).values(
    DEMO_POSITIONS.map(([name, level], index) => ({
      code: `POS${String(index + 1).padStart(3, '0')}`,
      name,
      level,
    })),
  );
  console.log(`Seed: created ${DEMO_POSITIONS.length} positions`);
}

async function seedCriteriaSet(db: Database): Promise<void> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.criteriaSets);

  if (Number(row?.count ?? 0) > 0) {
    console.log('Seed: criteria set already exists, skipped');
    return;
  }

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

  console.log('Seed: created the global criteria set v1 (5 criteria)');
}

async function seedAdminUser(db: Database, plan: SeedPlan): Promise<void> {
  const [admin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, plan.adminUsername))
    .limit(1);

  if (admin) {
    console.log(`Seed: admin user '${plan.adminUsername}' already exists`);
    return;
  }

  if (plan.adminPassword === null) {
    throw new Error('seedAdminUser called without a password');
  }

  const hash = await bcrypt.hash(plan.adminPassword, 10);
  await db.insert(schema.users).values({
    username: plan.adminUsername,
    password: hash,
    role: 'ADMIN',
    employeeId: null,
  });
  console.log(`Seed: created admin user '${plan.adminUsername}'`);
}

async function main() {
  const plan = resolveSeedPlan();

  console.log(`Seed mode: ${plan.nodeEnv}`);
  for (const warning of plan.warnings) {
    console.warn(`Seed warning: ${warning}`);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    if (plan.referenceData) {
      await seedCriteriaSet(db);
      if (plan.isProduction) {
        console.log('Seed: departments and positions skipped in production');
      } else {
        await seedDepartments(db);
        await seedPositions(db);
      }
    }

    if (plan.admin) {
      await seedAdminUser(db, plan);
    } else {
      console.log('Seed: admin user skipped (SEED_ADMIN_PASSWORD not set)');
    }

    if (plan.demoData) {
      await seedDemoMasterData(db, plan.demoEmployeeCount);
    } else {
      console.log('Seed: demo employees and contracts skipped in production');
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
