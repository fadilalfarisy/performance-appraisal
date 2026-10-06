import { AppraisalAction, AppraisalStatus, UserRole } from '@appraisal/types';

export type AppraisalPrecondition = 'hasEmployees' | 'allRatingsFilled';

export interface TransitionRule {
  from: AppraisalStatus;
  to: AppraisalStatus[];
  roles: UserRole[];
  kind: AppraisalAction;
  scoped?: boolean;
  comment?: boolean;
  requires?: AppraisalPrecondition[];
}

export const TRANSITIONS: TransitionRule[] = [
  // forward
  {
    from: AppraisalStatus.DRAFT,
    to: [AppraisalStatus.PENDING],
    roles: [UserRole.HR],
    kind: AppraisalAction.TRANSITION,
    requires: ['hasEmployees'],
  },
  {
    from: AppraisalStatus.PENDING,
    to: [AppraisalStatus.SUBMITTED],
    roles: [UserRole.HEAD_DEPARTMENT],
    kind: AppraisalAction.TRANSITION,
    scoped: true,
    requires: ['allRatingsFilled'],
  },
  {
    from: AppraisalStatus.SUBMITTED,
    to: [AppraisalStatus.APPROVED],
    roles: [UserRole.MANAGER],
    kind: AppraisalAction.TRANSITION,
    scoped: true,
  },
  {
    from: AppraisalStatus.APPROVED,
    to: [AppraisalStatus.COMPLETE],
    roles: [UserRole.GENERAL_MANAGER],
    kind: AppraisalAction.TRANSITION,
  },
  // send back (comment mandatory)
  {
    from: AppraisalStatus.PENDING,
    to: [AppraisalStatus.DRAFT],
    roles: [UserRole.HEAD_DEPARTMENT],
    kind: AppraisalAction.SEND_BACK,
    comment: true,
    scoped: true,
  },
  {
    from: AppraisalStatus.SUBMITTED,
    to: [AppraisalStatus.PENDING, AppraisalStatus.DRAFT],
    roles: [UserRole.MANAGER],
    kind: AppraisalAction.SEND_BACK,
    comment: true,
    scoped: true,
  },
  {
    from: AppraisalStatus.APPROVED,
    to: [AppraisalStatus.SUBMITTED, AppraisalStatus.PENDING, AppraisalStatus.DRAFT],
    roles: [UserRole.GENERAL_MANAGER],
    kind: AppraisalAction.SEND_BACK,
    comment: true,
  },
  // reopen
  {
    from: AppraisalStatus.COMPLETE,
    to: [AppraisalStatus.APPROVED],
    roles: [UserRole.ADMIN],
    kind: AppraisalAction.REOPEN,
    comment: true,
  },
];

export function findTransition(
  from: AppraisalStatus,
  to: AppraisalStatus,
  role: string,
): TransitionRule | undefined {
  return TRANSITIONS.find(
    (rule) =>
      rule.from === from &&
      rule.to.includes(to) &&
      rule.roles.includes(role as UserRole),
  );
}
