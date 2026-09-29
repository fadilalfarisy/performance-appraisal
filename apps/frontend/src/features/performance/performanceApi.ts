import { apiSlice } from "@/api/apiSlice";

export const performanceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployeePerformance: builder.query({
      query: () => `/performance`,
      providesTags: ["Performances"],
    }),
    createPerformance: builder.mutation({
      query: (body) => ({
        url: `/performance`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Performances"],
    }),
    getPerformanceByEmployee: builder.query({
      query: (id) => `/performance/employee/${id}`,
      providesTags: ["Performances"],
    }),
    getPerformanceById: builder.query({
      query: (id) => `/performance/${id}`,
      transformResponse: (response: any) =>
        response.length > 0 ? response[0] : response,
      providesTags: ["Performances"],
    }),
    updatePerformance: builder.mutation({
      query: ({ id, body }) => ({
        url: `/performance/${id}`,
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["Performances"],
    }),
    deletePerformance: builder.mutation({
      query: (id) => ({
        url: `/performance/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Performances"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEmployeePerformanceQuery,
  useCreatePerformanceMutation,
  useGetPerformanceByEmployeeQuery,
  useGetPerformanceByIdQuery,
  useUpdatePerformanceMutation,
  useDeletePerformanceMutation,
} = performanceApi;
