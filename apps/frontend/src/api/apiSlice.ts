import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";



const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_HOST_API,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth?.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
  credentials: "include",
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refreshResult = await baseQuery("/auth/refresh", api, extraOptions);

    if (refreshResult.data) {
      const newToken = (refreshResult.data as { token: string }).token;
      api.dispatch({ type: "auth/setAccessToken", payload: newToken });

      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch({ type: "auth/deleteAuth" });
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
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
