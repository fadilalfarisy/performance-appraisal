import { and } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { ContractType } from '@appraisal/types';
import {
  buildContractFilters,
  ContractsRepository,
} from './contracts.repository';
import type { ContractQueryDto } from './dto/contract-query.dto';

const compile = (query: Partial<ContractQueryDto>) => {
  const filters = buildContractFilters(query as ContractQueryDto);
  const dialect = new PgDialect();
  return dialect.sqlToQuery(and(...filters)!);
};

describe('buildContractFilters', () => {
  it('always excludes soft-deleted contracts', () => {
    const { sql } = compile({});

    expect(sql).toContain('contracts');
    expect(sql).toContain('deleted_at');
  });

  it('searches employee name and number with a partial term', () => {
    const { sql, params } = compile({ search: 'budi' });

    expect(sql).toContain('full_name');
    expect(sql).toContain('employee_number');
    expect(params.filter((param) => param === '%budi%')).toHaveLength(2);
  });

  it('applies employee, type, and date range filters', () => {
    const { sql, params } = compile({
      employeeId: '11111111-1111-4111-8111-111111111111',
      contractType: ContractType.FIXED_TERM,
      startDateFrom: '2026-01-01',
      endDateTo: '2026-12-31',
    });

    expect(sql).toContain('employee_id');
    expect(sql).toContain('contract_type');
    expect(sql).toContain('start_date');
    expect(sql).toContain('end_date');
    expect(params).toEqual(
      expect.arrayContaining([
        '11111111-1111-4111-8111-111111111111',
        ContractType.FIXED_TERM,
        '2026-01-01',
        '2026-12-31',
      ]),
    );
  });

  it('does not search employees when search is absent', () => {
    const { sql } = compile({});

    expect(sql).not.toContain('full_name');
    expect(sql).not.toContain('employee_number');
  });
});

describe('ContractsRepository.findOverlapping', () => {
  it('builds an inclusive daterange overlap check and excludes the current contract', async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });
    const repository = new ContractsRepository({ select } as never);

    await repository.findOverlapping(
      'emp-1',
      '2026-10-01',
      '2026-10-23',
      'contract-2',
    );

    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('daterange');
    expect(query.sql).toContain('&&');
    expect(query.sql).toContain('<>');
    expect(query.params).toEqual(
      expect.arrayContaining([
        'emp-1',
        '2026-10-01',
        '2026-10-23',
        'contract-2',
      ]),
    );
  });
});
