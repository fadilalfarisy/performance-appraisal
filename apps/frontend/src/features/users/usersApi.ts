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
      query: (body) => ({
        url: `/users`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<
      ApiResponse<UserResponse>,
      { id: string; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
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
  useDeleteUserMutation,
} = usersApi;
