import { apiSlice } from "@/api/apiSlice";

export const permissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query({
      query: () => `/permissions`,
      providesTags: ["Permissions"],
    }),
    getPermissionById: builder.query({
      query: (id) => `/permissions/${id}`,
      providesTags: ["Permissions"],
    }),
    createPermission: builder.mutation({
      query: (body) => ({
        url: `/permissions`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Permissions"],
    }),
    updatePermission: builder.mutation({
      query: ({ id, body }) => ({
        url: `/permissions/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Permissions"],
    }),
    deletePermission: builder.mutation({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Permissions"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
} = permissionsApi;
