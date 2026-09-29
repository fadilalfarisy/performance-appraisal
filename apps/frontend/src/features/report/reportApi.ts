import { apiSlice } from "@/api/apiSlice";

export const reportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReport: builder.query({
      query: () => `/report`,
      providesTags: ["Reports"],
    }),
    getReportCompleted: builder.query({
      query: () => `/report/completed`,
      providesTags: ["Reports"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetReportQuery, useGetReportCompletedQuery } = reportApi;
