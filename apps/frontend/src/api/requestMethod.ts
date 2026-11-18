import type { FetchArgs } from "@reduxjs/toolkit/query";

/** Requests that never write an audit entry, even though they are writes. */
const NOT_AUDITED = ["/auth/refresh"];

/** Any request that is not a read: it may write an audit entry. */
export function isWriteRequest(args: string | FetchArgs): boolean {
  if (typeof args === "string") return false;

  const method = (args.method ?? "GET").toUpperCase();
  return method !== "GET" && method !== "HEAD";
}

/**
 * The audit list should refetch after a write. Failed writes count only when
 * the server answered (a 401 login writes AUTH_LOGIN_FAILED); network errors
 * and cancellations cannot have produced an audit row.
 */
export function shouldInvalidateAuditLogs(
  args: string | FetchArgs,
  errorStatus: number | string | undefined,
): boolean {
  const url = typeof args === "string" ? args : args.url;
  if (NOT_AUDITED.includes(url)) return false;
  if (!isWriteRequest(args)) return false;

  return errorStatus === undefined || typeof errorStatus === "number";
}
