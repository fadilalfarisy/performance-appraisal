import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
} from "@appraisal/types";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUser: builder.query<ApiResponse<UserResponse[]>, void>({
      query: () => `/users`,
      providesTags: ["Users"],
    }),
    getUserById: builder.query<ApiResponse<UserResponse>, string | undefined>({
      query: (id) => `/users/${id}`,
      providesTags: ["Users"],
    }),
    createUser: builder.mutation<ApiResponse<UserResponse>, CreateUserRequest>({
      query: (body) => ({ url: `/users`, method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<
      ApiResponse<UserResponse>,
      { id: string | undefined; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Users"],
    }),
    setUserStatus: builder.mutation<
      ApiResponse<UserResponse>,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/users/${id}/status`,
        method: "PATCH",
        body: { isActive },
      }),
      invalidatesTags: ["Users"],
    }),
    resetPassword: builder.mutation<
      ApiResponse<UserResponse>,
      { id: string; password: string }
    >({
      query: ({ id, password }) => ({
        url: `/users/${id}/reset-password`,
        method: "POST",
        body: { password },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUserQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserStatusMutation,
  useResetPasswordMutation,
  useDeleteUserMutation,
} = usersApi;
