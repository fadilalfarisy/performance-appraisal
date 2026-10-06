import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Generates dummy master data. Idempotent: existing employee numbers are
 * skipped, and departments/positions are only created when none exist.
 *
 *   pnpm --filter backend seed:employees          # 300 (default)
 *   SEED_EMPLOYEE_COUNT=500 pnpm --filter backend seed:employees
 */

const FIRST_NAMES = [
  'Budi', 'Siti', 'Andi', 'Dewi', 'Rudi', 'Rina', 'Agus', 'Maya', 'Eko', 'Putri',
  'Hendra', 'Lina', 'Joko', 'Wati', 'Bayu', 'Nia', 'Dedi', 'Sari', 'Iwan', 'Tini',
  'Fajar', 'Indah', 'Rizky', 'Ayu', 'Yudi', 'Ratna', 'Hadi', 'Fitri', 'Arif', 'Nur',
];

const LAST_NAMES = [
  'Santoso', 'Wijaya', 'Saputra', 'Pratama', 'Nugroho', 'Setiawan', 'Halim', 'Kusuma',
  'Permata', 'Utama', 'Hidayat', 'Susanto', 'Firmansyah', 'Maulana', 'Ramadhan',
];

const STREETS = [
  'Jl. Merdeka', 'Jl. Sudirman', 'Jl. Thamrin', 'Jl. Gatot Subroto', 'Jl. Ahmad Yani',
  'Jl. Diponegoro', 'Jl. Cendrawasih', 'Jl. Melati', 'Jl. Kenanga', 'Jl. Mawar',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)] as T;
}

function toDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function randomDate(startYear: number, endYear: number): string {
  const year = randomInt(startYear, endYear);
  const month = randomInt(0, 11);
  const day = randomInt(1, 28);
  return toDate(new Date(Date.UTC(year, month, day)));
}

async function main() {
  const count = Number(
    process.env.SEED_EMPLOYEE_COUNT ?? process.argv[2] ?? 300,
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // ── Departments ────────────────────────────────────────────────────────────
  let departments = await db
    .select({ id: schema.departments.id })
    .from(schema.departments)
    .where(eq(schema.departments.isDeleted, false));

  if (departments.length === 0) {
    departments = await db
      .insert(schema.departments)
      .values(
        [
          'Production',
          'Finance',
          'Human Resource',
          'Information Technology',
          'Marketing',
        ].map((name, index) => ({
          code: `DEP${String(index + 1).padStart(3, '0')}`,
          name,
        })),
      )
      .returning({ id: schema.departments.id });
    console.log(`Created ${departments.length} departments`);
  }

  // ── Positions ──────────────────────────────────────────────────────────────
  let positions = await db
    .select({ id: schema.positions.id })
    .from(schema.positions)
    .where(eq(schema.positions.isDeleted, false));

  if (positions.length === 0) {
    const defs: Array<[string, number]> = [
      ['Staff', 1],
      ['Senior Staff', 2],
      ['Supervisor', 3],
      ['Manager', 4],
      ['Head of Department', 5],
    ];
    positions = await db
      .insert(schema.positions)
      .values(
        defs.map(([name, level], index) => ({
          code: `POS${String(index + 1).padStart(3, '0')}`,
          name,
          level,
        })),
      )
      .returning({ id: schema.positions.id });
    console.log(`Created ${positions.length} positions`);
  }

  // ── Employees ──────────────────────────────────────────────────────────────
  const existing = await db
    .select({ number: schema.employees.employeeNumber })
    .from(schema.employees);
  const usedNumbers = new Set(existing.map((row) => row.number));

  const rows: (typeof schema.employees.$inferInsert)[] = [];
  let sequence = 1;
  while (rows.length < count) {
    const employeeNumber = `EMP${String(sequence).padStart(4, '0')}`;
    sequence += 1;
    if (usedNumbers.has(employeeNumber)) continue;

    rows.push({
      employeeNumber,
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      gender: pick(['MALE', 'FEMALE'] as const),
      birthDate: randomDate(1975, 2000),
      joinDate: randomDate(2018, 2024),
      address: `${pick(STREETS)} No. ${randomInt(1, 200)}`,
      departmentId: pick(departments).id,
      positionId: pick(positions).id,
      status: Math.random() < 0.95 ? 'ACTIVE' : 'INACTIVE',
    });
  }

  const insertedEmployees = await db
    .insert(schema.employees)
    .values(rows)
    .returning({
      id: schema.employees.id,
      joinDate: schema.employees.joinDate,
    });
  console.log(`Inserted ${insertedEmployees.length} employees`);

  // ── Contracts (one per new employee, so they can be appraised) ──────────────
  const contracts: (typeof schema.contracts.$inferInsert)[] =
    insertedEmployees.map((employee) => {
      const permanent = Math.random() < 0.7;
      let endDate: string | null = null;
      if (!permanent) {
        const end = new Date();
        end.setMonth(end.getMonth() + randomInt(1, 3));
        endDate = toDate(end);
      }
      return {
        employeeId: employee.id,
        contractType: permanent ? 'PERMANENT' : 'FIXED_TERM',
        startDate: employee.joinDate,
        endDate,
      };
    });

  if (contracts.length > 0) {
    await db.insert(schema.contracts).values(contracts);
    console.log(`Inserted ${contracts.length} contracts`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error('Seed employees failed', error);
  process.exit(1);
});
