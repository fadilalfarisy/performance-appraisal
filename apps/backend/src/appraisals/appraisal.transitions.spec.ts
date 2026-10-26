import { AppraisalStatus, UserRole } from '@appraisal/types';
import { TRANSITIONS, findTransition } from './appraisal.transitions';

describe('appraisal transitions', () => {
  it.each(TRANSITIONS.flatMap((rule) =>
    rule.to.map((to) => [rule.from, to, rule.roles[0]] as const),
  ))('allows %s -> %s for %s', (from, to, role) => {
    expect(findTransition(from, to, role)).toBeDefined();
  });

  it('allows ADMIN for every transition', () => {
    for (const rule of TRANSITIONS) {
      for (const to of rule.to) {
        expect(findTransition(rule.from, to, UserRole.ADMIN)).toBeDefined();
      }
    }
  });

  it('blocks HR from sending back (removed in PRD v0.4)', () => {
    expect(
      findTransition(AppraisalStatus.PENDING, AppraisalStatus.DRAFT, UserRole.HR),
    ).toBeUndefined();
  });

  it('blocks invalid jumps (DRAFT -> COMPLETE)', () => {
    expect(
      findTransition(
        AppraisalStatus.DRAFT,
        AppraisalStatus.COMPLETE,
        UserRole.ADMIN,
      ),
    ).toBeUndefined();
  });

  it('only lets Admin reopen', () => {
    expect(
      findTransition(
        AppraisalStatus.COMPLETE,
        AppraisalStatus.APPROVED,
        UserRole.GENERAL_MANAGER,
      ),
    ).toBeUndefined();
    expect(
      findTransition(
        AppraisalStatus.COMPLETE,
        AppraisalStatus.APPROVED,
        UserRole.ADMIN,
      ),
    ).toBeDefined();
  });
});
