import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { ApiResponse, RefreshResponse } from "@appraisal/types";
import { deleteAuth, setAccessToken } from "@/features/auth/authSlice";
import { shouldInvalidateAuditLogs } from "./requestMethod";

interface AuthStateLike {
  auth?: { accessToken?: string };
}

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_HOST_API,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AuthStateLike).auth?.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshPromise: Promise<string | null> | null = null;

type BaseQueryApiType = Parameters<
  BaseQueryFn<unknown, unknown, FetchBaseQueryError>
>[1];

const refreshAccessToken = async (
  api: BaseQueryApiType,
  extraOptions: Parameters<
    BaseQueryFn<unknown, unknown, FetchBaseQueryError>
  >[2],
): Promise<string | null> => {
  const result = await baseQuery(
    { url: "/auth/refresh", method: "POST" },
    api,
    extraOptions,
  );

  const data = (result.data as ApiResponse<RefreshResponse> | undefined)?.data;
  if (!data?.accessToken) return null;

  api.dispatch(setAccessToken(data.accessToken));
  return data.accessToken;
};

const isRefreshRequest = (args: string | FetchArgs): boolean =>
  (typeof args === "string" ? args : args.url) === "/auth/refresh";

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const isRefresh = isRefreshRequest(args);
  let result = await baseQuery(args, api, extraOptions);
  let authCleared = false;

  if (!isRefresh && result.error && result.error.status === 401) {
    refreshPromise =
      refreshPromise ??
      refreshAccessToken(api, extraOptions).finally(() => {
        refreshPromise = null;
      });

    const accessToken = await refreshPromise;

    if (accessToken) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      authCleared = true;
      api.dispatch(deleteAuth());
    }
  }

  // Any write may add an audit entry, including a failed login. Network errors
  // cannot have produced one, and refresh writes none.
  if (
    !authCleared &&
    shouldInvalidateAuditLogs(args, result.error?.status)
  ) {
    invalidateAuditLogs(api.dispatch);
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  keepUnusedDataFor: 3600,
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Criteria",
    "Employees",
    "Contracts",
    "Users",
    "Departments",
    "Positions",
    "Appraisals",
    "DailyNotes",
    "AuditLogs",
  ],
  endpoints: () => ({}),
});

type InvalidateTagsAction = ReturnType<typeof apiSlice.util.invalidateTags>;

/** One place to say "the audit list changed" for RTK and raw-fetch writers. */
export const invalidateAuditLogs = (
  dispatch: (action: InvalidateTagsAction) => unknown,
): void => {
  dispatch(apiSlice.util.invalidateTags(["AuditLogs"]));
};
