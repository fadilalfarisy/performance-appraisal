import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  CreateEmployeeRequest,
  EmployeeQuery,
  EmployeeResponse,
  UpdateEmployeeRequest,
} from "@appraisal/types";

export const employeesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployee: builder.query<
      ApiResponse<EmployeeResponse[]>,
      EmployeeQuery | undefined
    >({
      query: (params) => ({
        url: `/employees`,
        params,
      }),
      providesTags: ["Employees"],
    }),
    getEmployeeById: builder.query<
      ApiResponse<EmployeeResponse>,
      string | undefined
    >({
      query: (id) => `/employees/${id}`,
      providesTags: ["Employees"],
    }),
    createEmployee: builder.mutation<
      ApiResponse<EmployeeResponse>,
      CreateEmployeeRequest
    >({
      query: (body) => ({
        url: `/employees`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Employees"],
    }),
    updateEmployee: builder.mutation<
      ApiResponse<EmployeeResponse>,
      { id: string; body: UpdateEmployeeRequest }
    >({
      query: ({ id, body }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Employees"],
    }),
    deleteEmployee: builder.mutation<ApiResponse<void>, string>({
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
