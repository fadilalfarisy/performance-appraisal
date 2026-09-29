// import { drizzle } from 'drizzle-orm/node-postgres';
// import { Pool } from 'pg';
// import * as schema from './schema';
// import * as dotenv from 'dotenv';
// import * as bcrypt from 'bcrypt';
// import { eq, and, count } from 'drizzle-orm';

// dotenv.config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// const db = drizzle(pool, { schema });

// async function main() {
//   // ─────────────────────────────────────────────────────────────────────────────
//   // 1. ROLES
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding roles...');

//   const rolesToSeed = [
//     { name: 'ADMINISTRATOR', description: 'Full system access' },
//     {
//       name: 'GENERAL_MANAGER',
//       description: 'Final report approval and oversight',
//     },
//     {
//       name: 'MANAGER',
//       description:
//         'Department oversight, report review, and assessment overrides',
//     },
//     {
//       name: 'HEAD_DEPARTMENT',
//       description: 'Section oversight, initial report submission/rejection',
//     },
//     { name: 'SUPERVISOR', description: 'Daily data entry for subordinates' },
//     { name: 'HR', description: 'Contract management and employee review' },
//   ];

//   for (const role of rolesToSeed) {
//     await db
//       .insert(schema.roles)
//       .values(role)
//       .onConflictDoUpdate({
//         target: schema.roles.name,
//         set: { description: role.description },
//       });
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 2. PERMISSIONS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding permissions...');

//   const permissionsToSeed = [
//     // Records
//     { name: 'records:create', description: 'Can create daily records' },
//     { name: 'records:view', description: 'Can view daily records' },

//     // Reports
//     { name: 'reports:create', description: 'Can create appraisal reports' },
//     { name: 'reports:view', description: 'Can view appraisal reports' },
//     { name: 'reports:submit', description: 'Can submit reports to next level' },
//     { name: 'reports:reject', description: 'Can reject reports back to draft' },
//     {
//       name: 'reports:approve',
//       description: 'Can give final approval to reports',
//     },
//     {
//       name: 'reports:override',
//       description: 'Can override system assessment scores',
//     },

//     // Employees/Contracts
//     { name: 'employees:view', description: 'Can view employee list' },
//     {
//       name: 'employees:manage',
//       description: 'Can edit employee and contract details',
//     },
//     { name: 'contracts:review', description: 'Can review expiring contracts' },

//     // Criteria
//     { name: 'criteria:manage', description: 'Can manage criteria versions' },

//     // Dynamic inputs
//     {
//       name: 'forms:manage',
//       description: 'Can manage dynamic form input definitions',
//     },
//   ];

//   for (const perm of permissionsToSeed) {
//     await db
//       .insert(schema.permissions)
//       .values(perm)
//       .onConflictDoUpdate({
//         target: schema.permissions.name,
//         set: { description: perm.description },
//       });
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 3. ROLE <-> PERMISSION MAPPING
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding role permissions...');

//   const rolePermMapping: Record<string, string[]> = {
//     ADMINISTRATOR: permissionsToSeed.map((p) => p.name),
//     GENERAL_MANAGER: [
//       'reports:view',
//       'reports:approve',
//       'reports:reject',
//       'employees:view',
//     ],
//     MANAGER: [
//       'reports:view',
//       'reports:submit',
//       'reports:reject',
//       'reports:override',
//       'employees:view',
//       'records:view',
//     ],
//     HEAD_DEPARTMENT: [
//       'reports:view',
//       'reports:submit',
//       'reports:reject',
//       'employees:view',
//       'records:view',
//     ],
//     SUPERVISOR: ['records:create', 'records:view', 'employees:view'],
//     HR: [
//       'employees:view',
//       'employees:manage',
//       'contracts:review',
//       'reports:view',
//       'reports:approve',
//       'reports:reject',
//     ],
//   };

//   const allRoles = await db.select().from(schema.roles);
//   const allPerms = await db.select().from(schema.permissions);

//   for (const roleName in rolePermMapping) {
//     const role = allRoles.find((r) => r.name === roleName);
//     if (!role) continue;

//     for (const permName of rolePermMapping[roleName]) {
//       const perm = allPerms.find((p) => p.name === permName);
//       if (!perm) continue;

//       await db
//         .insert(schema.rolePermissions)
//         .values({ roleId: role.id, permissionId: perm.id })
//         .onConflictDoNothing();
//     }
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 4. DEPARTMENTS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding departments...');

//   const departmentsToSeed = [
//     { name: 'Human Resources' },
//     { name: 'Engineering' },
//     { name: 'Finance' },
//     { name: 'Operations' },
//     { name: 'Marketing' },
//   ];

//   for (const dept of departmentsToSeed) {
//     const [existing] = await db
//       .select()
//       .from(schema.departments)
//       .where(eq(schema.departments.name, dept.name))
//       .limit(1);
//     if (!existing) {
//       await db.insert(schema.departments).values(dept);
//     }
//   }

//   const allDepartments = await db.select().from(schema.departments);
//   const deptHR = allDepartments.find((d) => d.name === 'Human Resources')!;
//   const deptEng = allDepartments.find((d) => d.name === 'Engineering')!;
//   const deptFin = allDepartments.find((d) => d.name === 'Finance')!;
//   const deptOps = allDepartments.find((d) => d.name === 'Operations')!;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 5. POSITIONS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding positions...');

//   const positionsToSeed = [
//     { name: 'General Manager', departmentId: deptOps.id },
//     { name: 'Department Manager', departmentId: deptEng.id },
//     { name: 'Head of Department', departmentId: deptEng.id },
//     { name: 'Supervisor', departmentId: deptEng.id },
//     { name: 'HR Officer', departmentId: deptHR.id },
//     { name: 'Software Engineer', departmentId: deptEng.id },
//     { name: 'Finance Analyst', departmentId: deptFin.id },
//     { name: 'Operations Staff', departmentId: deptOps.id },
//   ];

//   for (const pos of positionsToSeed) {
//     const [existing] = await db
//       .select()
//       .from(schema.positions)
//       .where(eq(schema.positions.name, pos.name))
//       .limit(1);
//     if (!existing) {
//       await db.insert(schema.positions).values(pos);
//     }
//   }

//   const allPositions = await db.select().from(schema.positions);
//   const posGM = allPositions.find((p) => p.name === 'General Manager')!;
//   const posManager = allPositions.find((p) => p.name === 'Department Manager')!;
//   const posHOD = allPositions.find((p) => p.name === 'Head of Department')!;
//   const posSupervisor = allPositions.find((p) => p.name === 'Supervisor')!;
//   const posHR = allPositions.find((p) => p.name === 'HR Officer')!;
//   const posEngineer = allPositions.find((p) => p.name === 'Software Engineer')!;
//   const posFinance = allPositions.find((p) => p.name === 'Finance Analyst')!;
//   const posOps = allPositions.find((p) => p.name === 'Operations Staff')!;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 6. EMPLOYEES
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding employees...');

//   const employeesToSeed = [
//     {
//       fullName: 'Ahmad Budi Santoso',
//       nip: 'GM0001',
//       birthDate: '1975-03-15',
//       gender: 'MALE' as const,
//       positionId: posGM.id,
//       departmentId: deptOps.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Sudirman No. 1, Jakarta',
//     },
//     {
//       fullName: 'Siti Rahayu',
//       nip: 'HR0001',
//       birthDate: '1983-07-22',
//       gender: 'FEMALE' as const,
//       positionId: posHR.id,
//       departmentId: deptHR.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Gatot Subroto No. 10, Jakarta',
//     },
//     {
//       fullName: 'Rudi Hermawan',
//       nip: 'EN0001',
//       birthDate: '1980-11-05',
//       gender: 'MALE' as const,
//       positionId: posManager.id,
//       departmentId: deptEng.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Kuningan No. 22, Jakarta',
//     },
//     {
//       fullName: 'Dewi Kurniawati',
//       nip: 'EN0002',
//       birthDate: '1985-02-18',
//       gender: 'FEMALE' as const,
//       positionId: posHOD.id,
//       departmentId: deptEng.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Rasuna Said No. 5, Jakarta',
//     },
//     {
//       fullName: 'Budi Prasetyo',
//       nip: 'EN0003',
//       birthDate: '1990-06-30',
//       gender: 'MALE' as const,
//       positionId: posSupervisor.id,
//       departmentId: deptEng.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. TB Simatupang No. 15, Jakarta',
//     },
//     {
//       fullName: 'Andi Saputra',
//       nip: 'EN0004',
//       birthDate: '1995-09-12',
//       gender: 'MALE' as const,
//       positionId: posEngineer.id,
//       departmentId: deptEng.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Fatmawati No. 8, Jakarta',
//     },
//     {
//       fullName: 'Lina Marlina',
//       nip: 'FI0001',
//       birthDate: '1992-04-25',
//       gender: 'FEMALE' as const,
//       positionId: posFinance.id,
//       departmentId: deptFin.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Thamrin No. 33, Jakarta',
//     },
//     {
//       fullName: 'Joko Susilo',
//       nip: 'OP0001',
//       birthDate: '1993-12-01',
//       gender: 'MALE' as const,
//       positionId: posOps.id,
//       departmentId: deptOps.id,
//       managerId: null,
//       status: 'ACTIVE' as const,
//       address: 'Jl. Pramuka No. 12, Jakarta',
//     },
//   ];

//   const insertedEmployees: (typeof schema.employees.$inferSelect)[] = [];

//   // Insert top-level employees (no manager) first so manager refs can resolve
//   for (const emp of employeesToSeed.filter((e) => e.managerId === null)) {
//     const [existing] = await db
//       .select()
//       .from(schema.employees)
//       .where(eq(schema.employees.nip, emp.nip))
//       .limit(1);
//     if (existing) {
//       insertedEmployees.push(existing);
//       continue;
//     }
//     const [inserted] = await db.insert(schema.employees).values(emp).returning();
//     insertedEmployees.push(inserted);
//   }

//   // Resolve managers and insert remaining hierarchy
//   const empGM = insertedEmployees.find((e) => e.nip === 'GM0001')!;
//   const empHR = insertedEmployees.find((e) => e.nip === 'HR0001')!;
//   const empManager = insertedEmployees.find((e) => e.nip === 'EN0001')!;
//   const empHOD = insertedEmployees.find((e) => e.nip === 'EN0002')!;
//   const empSupervisor = insertedEmployees.find((e) => e.nip === 'EN0003')!;
//   const empEngineer = insertedEmployees.find((e) => e.nip === 'EN0004')!;
//   const empFinance = insertedEmployees.find((e) => e.nip === 'FI0001')!;
//   const empOps = insertedEmployees.find((e) => e.nip === 'OP0001')!;

//   const managerMap: Record<string, typeof empGM> = {
//     EN0001: empGM,
//     EN0002: empManager,
//     EN0003: empHOD,
//     EN0004: empSupervisor,
//   };

//   for (const emp of employeesToSeed.filter((e) => e.managerId !== null)) {
//     const existing = insertedEmployees.find((i) => i.nip === emp.nip);
//     if (existing) continue;
//     await db
//       .insert(schema.employees)
//       .values({
//         ...emp,
//         managerId: managerMap[emp.nip]?.id ?? null,
//       })
//       .returning();
//   }

//   const allEmployees = await db.select().from(schema.employees);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 7. USERS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding users...');

//   const saltRounds = 10;
//   const defaultPassword = await bcrypt.hash('password123', saltRounds);

//   const usersToSeed = [
//     {
//       username: 'admin',
//       password: defaultPassword,
//       employeeId: empGM?.id,
//       roleName: 'ADMINISTRATOR',
//     },
//     {
//       username: 'gm',
//       password: defaultPassword,
//       employeeId: empGM?.id,
//       roleName: 'GENERAL_MANAGER',
//     },
//     {
//       username: 'manager',
//       password: defaultPassword,
//       employeeId: empManager?.id,
//       roleName: 'MANAGER',
//     },
//     {
//       username: 'hod',
//       password: defaultPassword,
//       employeeId: empHOD?.id,
//       roleName: 'HEAD_DEPARTMENT',
//     },
//     {
//       username: 'supervisor',
//       password: defaultPassword,
//       employeeId: empSupervisor?.id,
//       roleName: 'SUPERVISOR',
//     },
//     {
//       username: 'hr',
//       password: defaultPassword,
//       employeeId: empHR?.id,
//       roleName: 'HR',
//     },
//     {
//       username: 'engineer',
//       password: defaultPassword,
//       employeeId: empEngineer?.id,
//       roleName: 'SUPERVISOR',
//     },
//     {
//       username: 'finance',
//       password: defaultPassword,
//       employeeId: empFinance?.id,
//       roleName: 'HEAD_DEPARTMENT',
//     },
//   ];

//   const insertedUsers: (typeof schema.users.$inferSelect)[] = [];
//   for (const u of usersToSeed) {
//     if (!u.employeeId) continue;
//     const [user] = await db
//       .insert(schema.users)
//       .values({
//         username: u.username,
//         password: u.password,
//         employeeId: u.employeeId,
//         roleId: allRoles.find((r) => r.name === u.roleName)!.id,
//       })
//       .onConflictDoUpdate({
//         target: schema.users.username,
//         set: { employeeId: u.employeeId },
//       })
//       .returning();
//     insertedUsers.push(user);
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 8. CONTRACTS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding contracts...');

//   const contractsData: {
//     employeeId: string;
//     startDate: string;
//     endDate: string | null;
//     status: 'CONTRACT' | 'PERMANENT';
//   }[] = [
//       { employeeId: empGM.id, startDate: '2015-01-01', endDate: null, status: 'PERMANENT' },
//       { employeeId: empHR.id, startDate: '2018-03-01', endDate: null, status: 'PERMANENT' },
//       { employeeId: empManager.id, startDate: '2017-06-01', endDate: null, status: 'PERMANENT' },
//       { employeeId: empHOD.id, startDate: '2020-01-15', endDate: null, status: 'PERMANENT' },
//       { employeeId: empSupervisor.id, startDate: '2022-04-01', endDate: '2025-03-31', status: 'CONTRACT' },
//       { employeeId: empEngineer.id, startDate: '2023-07-01', endDate: '2026-06-30', status: 'CONTRACT' },
//       { employeeId: empFinance.id, startDate: '2021-09-01', endDate: null, status: 'PERMANENT' },
//       { employeeId: empOps.id, startDate: '2022-02-15', endDate: '2025-02-14', status: 'CONTRACT' },
//     ];

//   for (const contract of contractsData) {
//     const [existing] = await db
//       .select()
//       .from(schema.contracts)
//       .where(eq(schema.contracts.employeeId, contract.employeeId))
//       .limit(1);
//     if (!existing) {
//       await db.insert(schema.contracts).values(contract);
//     }
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 9. PARENT CRITERIA (VERSIONS)
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding parent criteria...');

//   const parentCriteriaToSeed = [
//     { major: 1, minor: 2, patch: 1 },
//     { major: 2, minor: 0, patch: 1 },
//   ];

//   const [pcCount] = await db
//     .select({ value: count() })
//     .from(schema.parentCriteria);

//   for (const pc of parentCriteriaToSeed) {
//     if (pcCount && pcCount.value > 0) break;
//     await db.insert(schema.parentCriteria).values(pc);
//   }

//   const allParentCriteria = await db.select().from(schema.parentCriteria);
//   const parentV1 = allParentCriteria.find((p) => p.major === 1 && p.minor === 2 && p.patch === 1);
//   const parentV2 = allParentCriteria.find((p) => p.major === 2 && p.minor === 0 && p.patch === 1);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 10. CHILD CRITERIA
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding child criteria...');

//   const childCriteriaV1 = [
//     { name: 'Quality of Work', type: 'BENEFIT' as const, weight: 30 },
//     { name: 'Quantity of Work', type: 'BENEFIT' as const, weight: 25 },
//     { name: 'Attendance & Punctuality', type: 'BENEFIT' as const, weight: 20 },
//     { name: 'Responsibility & Initiative', type: 'BENEFIT' as const, weight: 25 },
//   ];

//   const childCriteriaV2 = [
//     { name: 'Quality of Work', type: 'BENEFIT' as const, weight: 35 },
//     { name: 'Quantity of Work', type: 'BENEFIT' as const, weight: 25 },
//     { name: 'Teamwork & Collaboration', type: 'BENEFIT' as const, weight: 20 },
//     { name: 'Attendance & Punctuality', type: 'BENEFIT' as const, weight: 20 },
//   ];

//   if (parentV1) {
//     for (const c of childCriteriaV1) {
//       const [existing] = await db
//         .select()
//         .from(schema.childCriteria)
//         .where(eq(schema.childCriteria.name, c.name))
//         .limit(1);
//       if (!existing) {
//         await db.insert(schema.childCriteria).values({
//           parentId: parentV1.id,
//           name: c.name,
//           weight: c.weight,
//           description: `Evaluation criterion for ${c.name.toLowerCase()}.`,
//         });
//       }
//     }
//   }

//   if (parentV2) {
//     for (const c of childCriteriaV2) {
//       const [existing] = await db
//         .select()
//         .from(schema.childCriteria)
//         .where(eq(schema.childCriteria.name, c.name))
//         .limit(1);
//       if (!existing) {
//         await db.insert(schema.childCriteria).values({
//           parentId: parentV2.id,
//           name: c.name,
//           weight: c.weight,
//           description: `Evaluation criterion for ${c.name.toLowerCase()}.`,
//         });
//       }
//     }
//   }

//   const allChildCriteria = await db.select().from(schema.childCriteria);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 11. DYNAMIC INPUTS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding dynamic inputs...');

//   const dynamicInputsToSeed = [
//     {
//       formId: 'DAILY_RECORD',
//       field: 'description',
//       label: 'Activity Description',
//       type: 'textarea',
//       required: true,
//       defaultValue: null,
//       rules: { minLength: 10, maxLength: 1000 },
//     },
//     {
//       formId: 'DAILY_RECORD',
//       field: 'score',
//       label: 'Score',
//       type: 'number',
//       required: false,
//       defaultValue: 0,
//       rules: { min: 0, max: 100 },
//     },
//     {
//       formId: 'DAILY_RECORD',
//       field: 'note',
//       label: 'Additional Note',
//       type: 'text',
//       required: false,
//       defaultValue: null,
//       rules: null,
//     },
//     {
//       formId: 'REPORT',
//       field: 'reportFile',
//       label: 'Report File',
//       type: 'file',
//       required: false,
//       defaultValue: null,
//       rules: { maxSizeMB: 10 },
//     },
//   ];

//   for (const input of dynamicInputsToSeed) {
//     const [existing] = await db
//       .select()
//       .from(schema.dynamicInputs)
//       .where(eq(schema.dynamicInputs.field, input.field))
//       .limit(1);
//     if (!existing) {
//       await db.insert(schema.dynamicInputs).values(input);
//     }
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 12. DAILY RECORDS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding daily records...');

//   const dailyRecordsToSeed = [
//     {
//       employeeId: empEngineer.id,
//       supervisorId: empSupervisor.id,
//       recordDate: '2026-01-06',
//       score: { quality: 85, quantity: 90 },
//       note: null,
//       description:
//         'Completed feature implementation with thorough unit tests and code review passed.',
//     },
//     {
//       employeeId: empEngineer.id,
//       supervisorId: empSupervisor.id,
//       recordDate: '2026-01-07',
//       score: { quantity: 80 },
//       note: 'Closed more tickets than target.',
//       description: 'Closed 5 tickets during the sprint, exceeding the target of 3.',
//     },
//     {
//       employeeId: empEngineer.id,
//       supervisorId: empSupervisor.id,
//       recordDate: '2026-01-08',
//       score: { attendance: 100 },
//       note: null,
//       description: 'Present on time, attended all stand-ups and meetings.',
//     },
//     {
//       employeeId: empEngineer.id,
//       supervisorId: empSupervisor.id,
//       recordDate: '2026-01-09',
//       score: { responsibility: 95 },
//       note: null,
//       description:
//         'Proactively identified and reported a critical bug before it reached production.',
//     },
//     {
//       employeeId: empOps.id,
//       supervisorId: empGM.id,
//       recordDate: '2026-01-10',
//       score: { quality: 88 },
//       note: 'Good documentation.',
//       description:
//         'Delivered operations documentation ahead of schedule with comprehensive examples.',
//     },
//   ];

//   for (const record of dailyRecordsToSeed) {
//     const [existing] = await db
//       .select()
//       .from(schema.dailyRecords)
//       .where(eq(schema.dailyRecords.description, record.description))
//       .limit(1);
//     if (!existing) {
//       await db.insert(schema.dailyRecords).values(record);
//     }
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 13. REPORTS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding reports...');

//   const reportsToSeed = [
//     {
//       criteriaId: parentV1?.id,
//       departmentId: deptEng.id,
//       reportDate: '2026-01-31',
//       status: 'SUBMITTED' as const,
//       reportFile: null,
//     },
//     {
//       criteriaId: parentV1?.id,
//       departmentId: deptFin.id,
//       reportDate: '2026-01-31',
//       status: 'APPROVED' as const,
//       reportFile: 'reports/finance-2026-01.pdf',
//     },
//     {
//       criteriaId: parentV1?.id,
//       departmentId: deptOps.id,
//       reportDate: '2026-01-31',
//       status: 'DRAFT' as const,
//       reportFile: null,
//     },
//   ];

//   const insertedReports: (typeof schema.reports.$inferSelect)[] = [];
//   for (const report of reportsToSeed) {
//     if (!report.criteriaId) continue;
//     const { criteriaId, departmentId, reportDate, status, reportFile } = report;
//     const [existing] = await db
//       .select()
//       .from(schema.reports)
//       .where(
//         and(
//           eq(schema.reports.criteriaId, criteriaId),
//           eq(schema.reports.departmentId, departmentId),
//         ),
//       )
//       .limit(1);
//     if (existing) {
//       insertedReports.push(existing);
//       continue;
//     }
//     const [inserted] = await db
//       .insert(schema.reports)
//       .values({ criteriaId, departmentId, reportDate, status, reportFile })
//       .returning();
//     insertedReports.push(inserted);
//   }

//   const reportEngineer = insertedReports.find(
//     (r) => r.departmentId === deptEng.id,
//   );
//   const reportFinance = insertedReports.find(
//     (r) => r.departmentId === deptFin.id,
//   );

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 14. REPORT APPROVALS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding report approvals...');

//   const hrUser = insertedUsers.find((u) => u.username === 'hr');
//   const gmUser = insertedUsers.find((u) => u.username === 'gm');

//   const reportApprovalsToSeed = [
//     {
//       reportId: reportFinance?.id,
//       approverId: hrUser?.id,
//       status: 'APPROVED' as const,
//       note: 'Performance is satisfactory. Approved for further review.',
//     },
//     {
//       reportId: reportFinance?.id,
//       approverId: gmUser?.id,
//       status: 'APPROVED' as const,
//       note: 'Final approval granted.',
//     },
//     {
//       reportId: reportEngineer?.id,
//       approverId: hrUser?.id,
//       status: 'SUBMITTED' as const,
//       note: 'Submitted for review.',
//     },
//   ];

//   for (const approval of reportApprovalsToSeed) {
//     if (!approval.reportId || !approval.approverId) continue;
//     const { reportId, approverId, status, note } = approval;
//     await db
//       .insert(schema.reportApprovals)
//       .values({ reportId, approverId, status, note })
//       .onConflictDoNothing();
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // 15. ASSESSMENTS
//   // ─────────────────────────────────────────────────────────────────────────────
//   console.log('Seeding assessments...');

//   const activeChildCriteria = allChildCriteria.filter(
//     (c) => c.parentId === parentV1?.id,
//   );

//   const assessmentEmployees = [
//     { employeeId: empEngineer.id, reportId: reportEngineer?.id, base: 85 },
//     { employeeId: empSupervisor.id, reportId: reportEngineer?.id, base: 80 },
//     { employeeId: empHOD.id, reportId: reportEngineer?.id, base: 88 },
//     { employeeId: empFinance.id, reportId: reportFinance?.id, base: 90 },
//     { employeeId: empOps.id, reportId: reportEngineer?.id, base: 82 },
//   ];

//   for (const { employeeId, reportId, base } of assessmentEmployees) {
//     if (!reportId) continue;
//     for (const c of activeChildCriteria) {
//       await db.insert(schema.assessments).values({
//         reportId,
//         employeeId,
//         score: { [c.name]: Math.min(base + (c.weight % 7), 100) },
//         note: null,
//       });
//     }
//   }

//   // ─────────────────────────────────────────────────────────────────────────────
//   // SUMMARY
//   // ─────────────────────────────────────────────────────────────────────────────
//   const summary = [
//     ['Roles', (await db.select().from(schema.roles)).length],
//     ['Permissions', (await db.select().from(schema.permissions)).length],
//     ['Role Permissions', (await db.select().from(schema.rolePermissions)).length],
//     ['Departments', allDepartments.length],
//     ['Positions', allPositions.length],
//     ['Employees', allEmployees.length],
//     ['Users', insertedUsers.length],
//     ['Contracts', (await db.select().from(schema.contracts)).length],
//     ['Parent Criteria', allParentCriteria.length],
//     ['Child Criteria', allChildCriteria.length],
//     ['Dynamic Inputs', (await db.select().from(schema.dynamicInputs)).length],
//     ['Daily Records', (await db.select().from(schema.dailyRecords)).length],
//     ['Reports', insertedReports.length],
//     ['Report Approvals', (await db.select().from(schema.reportApprovals)).length],
//     ['Assessments', (await db.select().from(schema.assessments)).length],
//   ] as const;

//   console.log('');
//   console.log('Seeding completed successfully!');
//   console.log('');
//   console.log('Seeded data summary:');
//   for (const [table, n] of summary) {
//     console.log('  - ' + table.padEnd(18) + ': ' + n);
//   }
//   console.log('');
//   console.log('Default credentials (password: password123):');
//   for (const u of usersToSeed) {
//     console.log('  - ' + u.username + ' -> ' + u.roleName);
//   }

//   await pool.end();
//   process.exit(0);
// }

// main().catch(async (err) => {
//   console.error('Seeding failed:', err);
//   await pool.end().catch(() => { });
//   process.exit(1);
// });
