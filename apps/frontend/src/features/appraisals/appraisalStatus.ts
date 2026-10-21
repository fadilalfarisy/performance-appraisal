import { AppraisalStatus, UserRole } from "@appraisal/types";

export const APPRAISAL_STATUS_ORDER: AppraisalStatus[] = [
  AppraisalStatus.DRAFT,
  AppraisalStatus.PENDING,
  AppraisalStatus.SUBMITTED,
  AppraisalStatus.APPROVED,
  AppraisalStatus.COMPLETE,
];

export const APPRAISAL_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING: "gold",
  SUBMITTED: "blue",
  APPROVED: "cyan",
  COMPLETE: "green",
};

export const DEFAULT_STATUS_BY_ROLE: Partial<Record<UserRole, AppraisalStatus>> =
  {
    [UserRole.HR]: AppraisalStatus.DRAFT,
    [UserRole.HEAD_DEPARTMENT]: AppraisalStatus.PENDING,
    [UserRole.MANAGER]: AppraisalStatus.SUBMITTED,
    [UserRole.GENERAL_MANAGER]: AppraisalStatus.APPROVED,
    [UserRole.ADMIN]: AppraisalStatus.COMPLETE,
  };

export const isAppraisalStatus = (value: unknown): value is AppraisalStatus =>
  typeof value === "string" &&
  (Object.values(AppraisalStatus) as string[]).includes(value);

export const resolveStatusTab = (
  param: string | null | undefined,
  role: UserRole | "",
): AppraisalStatus => {
  if (isAppraisalStatus(param)) return param;
  const fallback = role === "" ? undefined : DEFAULT_STATUS_BY_ROLE[role];
  return fallback ?? AppraisalStatus.DRAFT;
};
