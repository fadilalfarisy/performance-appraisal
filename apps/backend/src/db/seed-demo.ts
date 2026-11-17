import { eq } from 'drizzle-orm';
import type { Database } from './db.type';
import * as schema from './schema';

/**
 * Generates dummy employees and contracts for development. Idempotent: existing
 * employee numbers are skipped. Departments and positions must already exist
 * (seed.ts creates them); never called in production (see seed.plan.ts).
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

export async function seedDemoMasterData(
  db: Database,
  count: number,
): Promise<void> {
  const departments = await db
    .select({ id: schema.departments.id })
    .from(schema.departments)
    .where(eq(schema.departments.isDeleted, false));

  const positions = await db
    .select({ id: schema.positions.id })
    .from(schema.positions)
    .where(eq(schema.positions.isDeleted, false));

  if (departments.length === 0 || positions.length === 0) {
    throw new Error(
      'Demo employees need at least one department and one position; run the reference seed first',
    );
  }

  // ── Employees ──────────────────────────────────────────────────────────────
  const existing = await db
    .select({ number: schema.employees.employeeNumber })
    .from(schema.employees);

  const remaining = count - existing.length;
  if (remaining <= 0) {
    console.log(
      `Seed: ${existing.length} demo employees already exist (target ${count}), skipped`,
    );
    return;
  }

  const usedNumbers = new Set(existing.map((row) => row.number));

  const rows: (typeof schema.employees.$inferInsert)[] = [];
  let sequence = 1;
  while (rows.length < remaining) {
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
  console.log(`Seed: inserted ${insertedEmployees.length} demo employees`);

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

  await db.insert(schema.contracts).values(contracts);
  console.log(`Seed: inserted ${contracts.length} demo contracts`);
}
