export type SeedNodeEnv = 'development' | 'test' | 'production';

const VALID_ENVS: SeedNodeEnv[] = ['development', 'test', 'production'];

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEVELOPMENT_ADMIN_PASSWORD = 'admin12345';
const DEFAULT_EMPLOYEE_COUNT = 300;

/**
 * The value shipped in .env.example. Treating it as "not set" keeps a copied
 * example file from creating a privileged account with a guessable password.
 */
const PLACEHOLDER_ADMIN_PASSWORD = 'change-me-admin-password';

export interface SeedPlan {
  nodeEnv: SeedNodeEnv;
  isProduction: boolean;
  referenceData: boolean;
  demoData: boolean;
  admin: boolean;
  adminUsername: string;
  adminPassword: string | null;
  demoEmployeeCount: number;
  warnings: string[];
}

/**
 * Decides what the seeder is allowed to write, based on NODE_ENV.
 *
 * development / test: reference data + admin + demo employees and contracts.
 * production: reference data only, plus the admin user when an explicit
 * SEED_ADMIN_PASSWORD is provided. Demo rows are never written.
 *
 * Pure: no database or logger access, so it can be unit tested directly.
 */
export function resolveSeedPlan(
  env: NodeJS.ProcessEnv = process.env,
): SeedPlan {
  const nodeEnv = (env.NODE_ENV ?? '').trim() || 'development';
  if (!VALID_ENVS.includes(nodeEnv as SeedNodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of ${VALID_ENVS.join('|')}, got "${nodeEnv}"`,
    );
  }

  const isProduction = nodeEnv === 'production';
  const warnings: string[] = [];

  const adminUsername = env.SEED_ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME;
  const envPassword = env.SEED_ADMIN_PASSWORD?.trim();
  const usablePassword =
    envPassword && envPassword !== PLACEHOLDER_ADMIN_PASSWORD
      ? envPassword
      : undefined;
  const adminPassword = usablePassword
    ? usablePassword
    : isProduction
      ? null
      : DEVELOPMENT_ADMIN_PASSWORD;

  if (adminPassword === null) {
    warnings.push(
      'admin user is not created in production without a real SEED_ADMIN_PASSWORD',
    );
  }
  if (isProduction && envPassword === PLACEHOLDER_ADMIN_PASSWORD) {
    warnings.push(
      `SEED_ADMIN_PASSWORD is still the .env.example placeholder ("${PLACEHOLDER_ADMIN_PASSWORD}")`,
    );
  }
  if (isProduction) {
    warnings.push('demo employees and contracts are skipped in production');
  }

  return {
    nodeEnv: nodeEnv as SeedNodeEnv,
    isProduction,
    referenceData: true,
    demoData: !isProduction,
    admin: adminPassword !== null,
    adminUsername,
    adminPassword,
    demoEmployeeCount: resolveEmployeeCount(env.SEED_EMPLOYEE_COUNT, warnings),
    warnings,
  };
}

function resolveEmployeeCount(raw: string | undefined, warnings: string[]): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_EMPLOYEE_COUNT;
  }

  const count = Number(raw);
  if (!Number.isInteger(count) || count <= 0) {
    warnings.push(
      `SEED_EMPLOYEE_COUNT="${raw}" is not a positive integer, using ${DEFAULT_EMPLOYEE_COUNT}`,
    );
    return DEFAULT_EMPLOYEE_COUNT;
  }

  return count;
}
