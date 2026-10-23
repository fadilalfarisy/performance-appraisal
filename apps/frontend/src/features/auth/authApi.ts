import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  LoginResponse,
  RefreshResponse,
  SignInRequest,
} from "@appraisal/types";
import type { AuthenticatedUser } from "@appraisal/types";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signIn: builder.mutation<ApiResponse<LoginResponse>, SignInRequest>({
      query: (body) => ({ url: "/auth/signin", method: "POST", body }),
    }),
    refresh: builder.mutation<ApiResponse<RefreshResponse>, void>({
      query: () => ({ url: "/auth/refresh", method: "POST" }),
    }),
    me: builder.query<ApiResponse<AuthenticatedUser>, void>({
      query: () => "/auth/me",
    }),
    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useSignInMutation,
  useRefreshMutation,
  useMeQuery,
  useLazyMeQuery,
  useLogoutMutation,
} = authApi;
