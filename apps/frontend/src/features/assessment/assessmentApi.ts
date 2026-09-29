import { apiSlice } from "@/api/apiSlice";

export const assessmentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAssess: builder.query({
      query: (id) => `/report/assessment/${id}`,
      providesTags: ["Assessments"],
    }),
    updateAssess: builder.mutation({
      query: (body) => ({
        url: `/report/assessment`,
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["Assessments"],
    }),
    getDataPerformance: builder.query({
      query: (id) => `/report/performance/${id}`,
      providesTags: ["Performances"],
    }),
    getReportHumanResource: builder.query({
      query: () => `/report/human-resource`,
      providesTags: ["Reports"],
    }),
    getReportHeadDepartment: builder.query({
      query: () => `/report/head-department`,
      providesTags: ["Reports"],
    }),
    getReportManager: builder.query({
      query: () => `/report/manager`,
      providesTags: ["Reports"],
    }),
    getReportGeneralManager: builder.query({
      query: () => `/report/general-manager`,
      providesTags: ["Reports"],
    }),
    createReport: builder.mutation({
      query: (body) => ({
        url: `/report`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Reports"],
    }),
    viewReport: builder.query({
      query: (id) => `/report/view/${id}`,
      providesTags: ["Reports"],
    }),
    deleteReport: builder.mutation({
      query: (id) => ({
        url: `/report/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Reports"],
    }),
    changeStatusReport: builder.mutation({
      query: ({ id, body }) => ({
        url: `/report/status/${id}`,
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["Reports"],
    }),
    generatePDF: builder.mutation({
      query: (id) => ({
        url: `/report/generate/${id}`,
        method: "PUT",
      }),
    }),
    downloadPDF: builder.query({
      query: (filename) => ({
        url: `/report/download/${filename}`,
        method: "GET",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAssessQuery,
  useUpdateAssessMutation,
  useLazyGetDataPerformanceQuery,
  useGetReportHumanResourceQuery,
  useGetReportHeadDepartmentQuery,
  useGetReportManagerQuery,
  useGetReportGeneralManagerQuery,
  useCreateReportMutation,
  useViewReportQuery,
  useChangeStatusReportMutation,
  useDeleteReportMutation,
  useGeneratePDFMutation,
  useLazyDownloadPDFQuery,
} = assessmentApi;
