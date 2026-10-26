import { AppraisalStatus, UserRole } from "@appraisal/types";

export type AppraisalAction =
  | "moveToPending"
  | "editRatings"
  | "importRatings"
  | "submit"
  | "approve"
  | "complete"
  | "sendBack"
  | "reopen"
  | "editEmployeeList"
  | "softDelete";

export interface AvailableAction {
  action: AppraisalAction;
  label: string;
  targets?: AppraisalStatus[];
  commentRequired?: boolean;
  danger?: boolean;
}

const LABELS: Record<AppraisalAction, string> = {
  moveToPending: "Move to PENDING",
  editRatings: "Edit ratings",
  importRatings: "Import ratings",
  submit: "Submit",
  approve: "Approve",
  complete: "Complete",
  sendBack: "Send back",
  reopen: "Reopen",
  editEmployeeList: "Edit employee list",
  softDelete: "Delete",
};

function action(
  name: AppraisalAction,
  extra: Partial<AvailableAction> = {},
): AvailableAction {
  return { action: name, label: LABELS[name], ...extra };
}

/**
 * Mirrors the backend transition table (PRD 5.8). The backend stays the
 * authority; this only decides which buttons to show.
 */
export function getAvailableActions(
  role: string,
  status: AppraisalStatus,
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (role === UserRole.ADMIN) {
    if (status === AppraisalStatus.DRAFT) {
      return [
        action("editEmployeeList"),
        action("softDelete", { danger: true }),
        action("moveToPending"),
      ];
    }
    if (status === AppraisalStatus.PENDING) {
      return [
        action("editRatings"),
        action("importRatings"),
        action("submit"),
        action("sendBack", {
          targets: [AppraisalStatus.DRAFT],
          commentRequired: true,
          danger: true,
        }),
      ];
    }
    if (status === AppraisalStatus.SUBMITTED) {
      return [
        action("approve"),
        action("sendBack", {
          targets: [AppraisalStatus.PENDING, AppraisalStatus.DRAFT],
          commentRequired: true,
          danger: true,
        }),
      ];
    }
    if (status === AppraisalStatus.APPROVED) {
      return [
        action("complete"),
        action("sendBack", {
          targets: [
            AppraisalStatus.SUBMITTED,
            AppraisalStatus.PENDING,
            AppraisalStatus.DRAFT,
          ],
          commentRequired: true,
          danger: true,
        }),
      ];
    }
    if (status === AppraisalStatus.COMPLETE) {
      return [action("reopen", { commentRequired: true, danger: true })];
    }
  }

  if (status === AppraisalStatus.DRAFT && role === UserRole.HR) {
    actions.push(
      action("editEmployeeList"),
      action("softDelete", { danger: true }),
      action("moveToPending"),
    );
  }

  if (status === AppraisalStatus.PENDING && role === UserRole.HEAD_DEPARTMENT) {
    actions.push(
      action("editRatings"),
      action("importRatings"),
      action("submit"),
      action("sendBack", {
        targets: [AppraisalStatus.DRAFT],
        commentRequired: true,
        danger: true,
      }),
    );
  }

  if (status === AppraisalStatus.SUBMITTED && role === UserRole.MANAGER) {
    actions.push(
      action("approve"),
      action("sendBack", {
        targets: [AppraisalStatus.PENDING, AppraisalStatus.DRAFT],
        commentRequired: true,
        danger: true,
      }),
    );
  }

  if (
    status === AppraisalStatus.APPROVED &&
    role === UserRole.GENERAL_MANAGER
  ) {
    actions.push(
      action("complete"),
      action("sendBack", {
        targets: [
          AppraisalStatus.SUBMITTED,
          AppraisalStatus.PENDING,
          AppraisalStatus.DRAFT,
        ],
        commentRequired: true,
        danger: true,
      }),
    );
  }

  if (status === AppraisalStatus.COMPLETE && role === UserRole.ADMIN) {
    actions.push(
      action("reopen", { commentRequired: true, danger: true }),
    );
  }

  return actions;
}

export function canWriteMaster(role: string, entity: string): boolean {
  if (role === UserRole.ADMIN) return true;
  if (role === UserRole.HR) {
    return ["employee", "contract", "criteria"].includes(entity);
  }
  return false;
}
