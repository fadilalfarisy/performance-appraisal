import { apiSlice } from "@/api/apiSlice";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signIn: builder.mutation({
      query: (post) => ({
        url: "/auth/signin",
        method: "POST",
        body: post,
      }),
    }),
    logout: builder.query({
      query: () => "/auth/logout",
    }),
  }),
  overrideExisting: false,
});

export const { useSignInMutation, useLazyLogoutQuery } = authApi;
