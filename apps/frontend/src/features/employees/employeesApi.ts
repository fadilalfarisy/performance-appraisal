import { apiSlice } from "@/api/apiSlice";

export const employeesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployee: builder.query({
      query: (params) => ({
        url: `/employees`,
        params,
      }),
      providesTags: ["Employees"],
    }),
    getEmployeeById: builder.query({
      query: (id) => `/employees/${id}`,
      providesTags: ["Employees"],
    }),
    createEmployee: builder.mutation({
      query: (body) => ({
        url: `/employees`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Employees"],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, body }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Employees"],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employees"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEmployeeQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeesApi;
