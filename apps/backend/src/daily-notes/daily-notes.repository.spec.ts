import { and } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import {
  buildDailyNoteFilters,
  type DailyNoteScope,
} from './daily-notes.repository';
import type { DailyNoteQueryDto } from './dto/daily-note-query.dto';

const compile = (
  query: Partial<DailyNoteQueryDto>,
  scope: DailyNoteScope = { by: 'all' },
) => {
  const filters = buildDailyNoteFilters(query as DailyNoteQueryDto, scope);
  return new PgDialect().sqlToQuery(and(...filters)!);
};

describe('buildDailyNoteFilters', () => {
  it('always excludes soft-deleted notes', () => {
    const { sql } = compile({});

    expect(sql).toContain('daily_notes');
    expect(sql).toContain('deleted_at');
  });

  it('searches employee number and name with a partial term', () => {
    const { sql, params } = compile({ search: 'budi' });

    expect(sql).toContain('employee_number');
    expect(sql).toContain('full_name');
    expect(params.filter((param) => param === '%budi%')).toHaveLength(2);
  });

  it('applies department and date filters', () => {
    const { sql, params } = compile({
      departmentId: '11111111-1111-4111-8111-111111111111',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-01',
    });

    expect(sql).toContain('department_id');
    expect(sql).toContain('record_date');
    expect(params).toEqual(
      expect.arrayContaining([
        '11111111-1111-4111-8111-111111111111',
        '2026-10-01',
      ]),
    );
  });

  it('applies an employee scope', () => {
    const { sql, params } = compile({}, { by: 'employee', ids: ['emp-1'] });

    expect(sql).toContain('employee_id');
    expect(params).toContain('emp-1');
  });

  it('applies a department scope', () => {
    const { sql, params } = compile({}, { by: 'department', ids: ['dep-1'] });

    expect(sql).toContain('department_id');
    expect(params).toContain('dep-1');
  });

  it('returns no rows for an empty scope', () => {
    const { sql } = compile({}, { by: 'employee', ids: [] });

    expect(sql).toContain('1 = 0');
  });

  it('does not search employees when search is absent', () => {
    const { sql } = compile({});

    expect(sql).not.toContain('full_name');
    expect(sql).not.toContain('employee_number');
  });
});
