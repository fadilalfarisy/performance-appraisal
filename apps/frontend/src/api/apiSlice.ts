import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { ApiResponse, TokenPair } from "@appraisal/types";
import { deleteAuth, setAccessToken } from "@/features/auth/authSlice";
import { tokenStorage } from "@/features/auth/tokenStorage";

interface AuthStateLike {
  auth?: { accessToken?: string };
}

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_HOST_API,
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
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  const result = await baseQuery(
    { url: "/auth/refresh", method: "POST", body: { refreshToken } },
    api,
    extraOptions,
  );

  const data = (result.data as ApiResponse<TokenPair> | undefined)?.data;
  if (!data?.accessToken) return null;

  tokenStorage.setRefreshToken(data.refreshToken);
  api.dispatch(setAccessToken(data.accessToken));
  return data.accessToken;
};

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    refreshPromise =
      refreshPromise ??
      refreshAccessToken(api, extraOptions).finally(() => {
        refreshPromise = null;
      });

    const accessToken = await refreshPromise;

    if (accessToken) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      tokenStorage.clear();
      api.dispatch(deleteAuth());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Criteria",
    "Employees",
    "Contracts",
    "Users",
    "Departments",
    "Positions",
  ],
  endpoints: () => ({}),
});
