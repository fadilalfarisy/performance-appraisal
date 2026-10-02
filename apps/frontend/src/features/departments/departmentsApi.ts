import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  CreateDepartmentRequest,
  DepartmentResponse,
  UpdateDepartmentRequest,
} from "@appraisal/types";

export const departmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query<ApiResponse<DepartmentResponse[]>, void>({
      query: () => `/departments`,
      providesTags: ["Departments"],
    }),
    getDepartmentById: builder.query<
      ApiResponse<DepartmentResponse>,
      string | undefined
    >({
      query: (id) => `/departments/${id}`,
      providesTags: ["Departments"],
    }),
    createDepartment: builder.mutation<
      ApiResponse<DepartmentResponse>,
      CreateDepartmentRequest
    >({
      query: (body) => ({
        url: `/departments`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Departments"],
    }),
    updateDepartment: builder.mutation<
      ApiResponse<DepartmentResponse>,
      { id: string; body: UpdateDepartmentRequest }
    >({
      query: ({ id, body }) => ({
        url: `/departments/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Departments"],
    }),
    deleteDepartment: builder.mutation<ApiResponse<void>, string>({
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
