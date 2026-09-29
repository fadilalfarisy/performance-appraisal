import { apiSlice } from "@/api/apiSlice";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUser: builder.query({
      query: () => `/users`,
      providesTags: ["Users"],
    }),
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: ["Users"],
    }),
    createUser: builder.mutation({
      query: (body) => ({
        url: `/users`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation({
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
