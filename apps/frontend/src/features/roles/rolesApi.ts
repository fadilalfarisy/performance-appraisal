import { apiSlice } from "@/api/apiSlice";

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query({
      query: () => `/roles`,
      providesTags: ["Roles"],
    }),
    getRoleById: builder.query({
      query: (id) => `/roles/${id}`,
      providesTags: ["Roles"],
    }),
    createRole: builder.mutation({
      query: (body) => ({
        url: `/roles`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Roles"],
    }),
    updateRole: builder.mutation({
      query: ({ id, body }) => ({
        url: `/roles/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Roles"],
    }),
    deleteRole: builder.mutation({
      query: (id) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Roles"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
