import { resolveSeedPlan } from './seed.plan';

describe('resolveSeedPlan', () => {
  it('defaults to development when NODE_ENV is unset', () => {
    const plan = resolveSeedPlan({});

    expect(plan.nodeEnv).toBe('development');
    expect(plan.isProduction).toBe(false);
    expect(plan.referenceData).toBe(true);
    expect(plan.demoData).toBe(true);
    expect(plan.admin).toBe(true);
    expect(plan.adminUsername).toBe('admin');
    expect(plan.adminPassword).toBe('admin12345');
    expect(plan.demoEmployeeCount).toBe(300);
    expect(plan.warnings).toEqual([]);
  });

  it('seeds demo data in test', () => {
    const plan = resolveSeedPlan({ NODE_ENV: 'test' });

    expect(plan.nodeEnv).toBe('test');
    expect(plan.demoData).toBe(true);
    expect(plan.admin).toBe(true);
    expect(plan.warnings).toEqual([]);
  });

  it('skips demo data and the admin when production has no admin password', () => {
    const plan = resolveSeedPlan({ NODE_ENV: 'production' });

    expect(plan.isProduction).toBe(true);
    expect(plan.referenceData).toBe(true);
    expect(plan.demoData).toBe(false);
    expect(plan.admin).toBe(false);
    expect(plan.adminPassword).toBeNull();
    expect(plan.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('admin user is not created in production'),
        expect.stringContaining('demo employees and contracts are skipped'),
      ]),
    );
  });

  it('creates the admin in production when a password is provided', () => {
    const plan = resolveSeedPlan({
      NODE_ENV: 'production',
      SEED_ADMIN_PASSWORD: 'super-secret',
    });

    expect(plan.admin).toBe(true);
    expect(plan.adminPassword).toBe('super-secret');
    expect(plan.demoData).toBe(false);
    expect(plan.warnings).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('admin user is not created in production'),
      ]),
    );
  });

  it('honours a custom admin username', () => {
    const plan = resolveSeedPlan({
      NODE_ENV: 'production',
      SEED_ADMIN_USERNAME: 'ops',
      SEED_ADMIN_PASSWORD: 'super-secret',
    });

    expect(plan.adminUsername).toBe('ops');
  });

  it('treats a blank admin password as missing', () => {
    const plan = resolveSeedPlan({
      NODE_ENV: 'production',
      SEED_ADMIN_PASSWORD: '   ',
    });

    expect(plan.admin).toBe(false);
    expect(plan.adminPassword).toBeNull();
  });

  it('refuses the .env.example placeholder password in production', () => {
    const plan = resolveSeedPlan({
      NODE_ENV: 'production',
      SEED_ADMIN_PASSWORD: 'change-me-admin-password',
    });

    expect(plan.admin).toBe(false);
    expect(plan.adminPassword).toBeNull();
    expect(plan.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('still the .env.example placeholder'),
      ]),
    );
  });

  it('falls back to the development password outside production', () => {
    const plan = resolveSeedPlan({
      NODE_ENV: 'development',
      SEED_ADMIN_PASSWORD: 'change-me-admin-password',
    });

    expect(plan.admin).toBe(true);
    expect(plan.adminPassword).toBe('admin12345');
  });

  it.each(['abc', '0', '-5', '1.5'])(
    'falls back to 300 employees when SEED_EMPLOYEE_COUNT is %s',
    (value) => {
      const plan = resolveSeedPlan({ SEED_EMPLOYEE_COUNT: value });

      expect(plan.demoEmployeeCount).toBe(300);
      expect(plan.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('SEED_EMPLOYEE_COUNT'),
        ]),
      );
    },
  );

  it('uses a valid SEED_EMPLOYEE_COUNT', () => {
    const plan = resolveSeedPlan({ SEED_EMPLOYEE_COUNT: '15' });

    expect(plan.demoEmployeeCount).toBe(15);
    expect(plan.warnings).toEqual([]);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => resolveSeedPlan({ NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV must be one of development\|test\|production/,
    );
  });
});
