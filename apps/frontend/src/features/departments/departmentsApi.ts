import { apiSlice } from "@/api/apiSlice";

export const departmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query({
      query: () => `/departments`,
      providesTags: ["Departments"],
    }),
    getDepartmentById: builder.query({
      query: (id) => `/departments/${id}`,
      providesTags: ["Departments"],
    }),
    createDepartment: builder.mutation({
      query: (body) => ({
        url: `/departments`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Departments"],
    }),
    updateDepartment: builder.mutation({
      query: ({ id, body }) => ({
        url: `/departments/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Departments"],
    }),
    deleteDepartment: builder.mutation({
      query: (id) => ({
        url: `/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Departments"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} = departmentsApi;
