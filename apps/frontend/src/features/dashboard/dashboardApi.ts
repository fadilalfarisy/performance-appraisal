import { apiSlice } from "@/api/apiSlice";

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    countEmployee: builder.query({
      query: () => `/employee/count`,
      providesTags: ["Employees"],
    }),
    countEmployeeByDepartment: builder.query({
      query: () => `/employee/count/department`,
      providesTags: ["Employees"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCountEmployeeQuery,
  useCountEmployeeByDepartmentQuery,
} = dashboardApi;
