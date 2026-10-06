import { ContractImporter } from './contracts.importer';

describe('ContractImporter.validate (first error only)', () => {
  let repository: {
    findEmployeesByNumbers: jest.Mock;
    findByEmployeeIds: jest.Mock;
  };
  let importer: ContractImporter;

  const row = (overrides: Record<string, unknown> = {}) => ({
    __row: 2,
    employee_number: 'EMP0001',
    contract_type: 'FIXED_TERM',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      findEmployeesByNumbers: jest.fn().mockResolvedValue([
        { id: 'emp-1', employeeNumber: 'EMP0001' },
      ]),
      findByEmployeeIds: jest.fn().mockResolvedValue([]),
    };
    importer = new ContractImporter(repository as never);
  });

  it('accepts a valid row', async () => {
    await expect(importer.validate([row()])).resolves.toBeUndefined();
  });

  it('rejects an unknown employee number', async () => {
    await expect(
      importer.validate([row({ employee_number: 'NOPE' })]),
    ).rejects.toThrow(/was not found/);
  });

  it('rejects an invalid contract type', async () => {
    await expect(
      importer.validate([row({ contract_type: 'WHATEVER' })]),
    ).rejects.toThrow(/Invalid contract type/);
  });

  it('requires an end date for non-permanent contracts', async () => {
    await expect(importer.validate([row({ end_date: '' })])).rejects.toThrow(
      /End date is required/,
    );
  });

  it('rejects duplicate employee number and start date in the file', async () => {
    await expect(importer.validate([row(), row()])).rejects.toThrow(
      /Duplicate employee number and start date/,
    );
  });

  it('rejects a row overlapping an existing contract', async () => {
    repository.findByEmployeeIds.mockResolvedValue([
      { id: 'c-1', employeeId: 'emp-1', startDate: '2024-06-01', endDate: '2025-06-01' },
    ]);
    await expect(importer.validate([row()])).rejects.toThrow(
      /Overlaps another contract/,
    );
  });
});
