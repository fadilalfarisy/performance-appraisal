import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  LoginResponse,
  SignInRequest,
  TokenPair,
} from "@appraisal/types";
import type { AuthenticatedUser } from "@appraisal/types";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signIn: builder.mutation<ApiResponse<LoginResponse>, SignInRequest>({
      query: (body) => ({ url: "/auth/signin", method: "POST", body }),
    }),
    refresh: builder.mutation<ApiResponse<TokenPair>, { refreshToken: string }>({
      query: (body) => ({ url: "/auth/refresh", method: "POST", body }),
    }),
    me: builder.query<ApiResponse<AuthenticatedUser>, void>({
      query: () => "/auth/me",
    }),
    logout: builder.mutation<ApiResponse<null>, { refreshToken: string }>({
      query: (body) => ({ url: "/auth/logout", method: "POST", body }),
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
