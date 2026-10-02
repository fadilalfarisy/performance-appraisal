import { apiSlice } from "@/api/apiSlice";
import type { ApiResponse, LoginResponse, SignInRequest } from "@appraisal/types";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signIn: builder.mutation<ApiResponse<LoginResponse>, SignInRequest>({
      query: (post) => ({
        url: "/auth/signin",
        method: "POST",
        body: post,
      }),
    }),
    logout: builder.query<void, void>({
      query: () => "/auth/logout",
    }),
  }),
  overrideExisting: false,
});

export const { useSignInMutation, useLazyLogoutQuery } = authApi;
