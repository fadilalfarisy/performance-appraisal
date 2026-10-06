import { apiSlice } from "@/api/apiSlice";
import type { ApiResponse, DashboardSummary } from "@appraisal/types";

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<ApiResponse<DashboardSummary>, void>({
      query: () => `/dashboard/summary`,
      providesTags: ["Appraisals", "Employees"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
