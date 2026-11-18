import {
  buildAuditFilters,
  endOfDayIfDateOnly,
  toSearchPattern,
} from './audit.repository';

const userId = '7b1e4f5c-2a3d-4e5f-8a9b-0c1d2e3f4a5b';

describe('toSearchPattern', () => {
  it('wraps the term in wildcards', () => {
    expect(toSearchPattern('budi')).toBe('%budi%');
  });

  it('escapes LIKE wildcards so they match literally', () => {
    expect(toSearchPattern('a_b%c\\d')).toBe('%a\\_b\\%c\\\\d%');
  });
});

describe('endOfDayIfDateOnly', () => {
  it('expands a date-only bound to the end of that day', () => {
    expect(endOfDayIfDateOnly('2026-11-18').toISOString()).toBe(
      '2026-11-18T23:59:59.999Z',
    );
  });

  it('leaves a full timestamp untouched', () => {
    const value = '2026-11-18T10:15:00.000Z';

    expect(endOfDayIfDateOnly(value).toISOString()).toBe(value);
  });
});

describe('buildAuditFilters', () => {
  it('adds no predicate for an empty query', () => {
    expect(buildAuditFilters({})).toHaveLength(0);
  });

  it('adds one predicate per filter and combines them', () => {
    const filters = buildAuditFilters({
      userId,
      entity: 'user',
      entityId: 'user-1',
      action: 'USER_CREATED',
      actorType: 'USER',
      search: 'budi',
    });

    expect(filters).toHaveLength(6);
  });

  it('adds two predicates for a date range', () => {
    const filters = buildAuditFilters({
      occurredFrom: '2026-11-01',
      occurredTo: '2026-11-18',
    });

    expect(filters).toHaveLength(2);
  });
});
