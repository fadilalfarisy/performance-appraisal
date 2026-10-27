import { PgDialect } from 'drizzle-orm/pg-core';
import { AppraisalsRepository } from './appraisals.repository';

describe('AppraisalsRepository.lockAppraisal', () => {
  it('returns camelCase appraisal fields locked with FOR UPDATE', async () => {
    const row = {
      id: 'appr-1',
      departmentId: 'dep-1',
      criteriaSetId: 'set-1',
      status: 'PENDING',
    };
    const forUpdate = jest.fn().mockResolvedValue([row]);
    const limit = jest.fn().mockReturnValue({ for: forUpdate });
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });
    const repository = new AppraisalsRepository({ select } as never);

    const result = await repository.lockAppraisal('appr-1', {
      select,
    } as never);

    expect(result).toBe(row);
    expect(result?.criteriaSetId).toBe('set-1');
    expect(result?.departmentId).toBe('dep-1');
    expect(forUpdate).toHaveBeenCalledWith('update');
  });
});

describe('AppraisalsRepository.dailyNoteSums', () => {
  it('builds the contract-window, department, and numeric-field query', async () => {
    const groupBy = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockReturnValue({ groupBy });
    const joinCriteriaFields = jest.fn().mockReturnValue({ where });
    const joinValues = jest
      .fn()
      .mockReturnValue({ innerJoin: joinCriteriaFields });
    const joinNotes = jest.fn().mockReturnValue({ innerJoin: joinValues });
    const from = jest.fn().mockReturnValue({ innerJoin: joinNotes });
    const select = jest.fn().mockReturnValue({ from });

    const repository = new AppraisalsRepository({ select } as never);
    await repository.dailyNoteSums('appr-1');

    const dialect = new PgDialect();
    const selected = select.mock.calls[0][0] as { total: never };
    const totalSql = dialect.sqlToQuery(selected.total);
    expect(totalSql.sql).toContain('jsonb_typeof');
    expect(totalSql.sql).toContain('SUM');

    const notesCondition = dialect.sqlToQuery(joinNotes.mock.calls[0][1]);
    expect(notesCondition.sql).toContain('employee_id');
    expect(notesCondition.sql).toContain('department_id');
    expect(notesCondition.sql).toContain('record_date');

    const valuesCondition = dialect.sqlToQuery(joinValues.mock.calls[0][1]);
    expect(valuesCondition.sql).toContain('note_id');

    const fieldsCondition = dialect.sqlToQuery(
      joinCriteriaFields.mock.calls[0][1],
    );
    expect(fieldsCondition.sql).toContain('input_type');

    const whereCondition = dialect.sqlToQuery(where.mock.calls[0][0]);
    expect(whereCondition.sql).toContain('appraisal_id');
    expect(whereCondition.sql).toContain('contract_start_date');
    expect(whereCondition.params).toContain('appr-1');
  });
});
