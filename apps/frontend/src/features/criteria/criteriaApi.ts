import { apiSlice } from "@/api/apiSlice";

export const criteriaApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCriteria: builder.query({
      query: () => `/criteria`,
      providesTags: ["Criteria"],
    }),
    // getCriteriaById: builder.query({
    //   query: (id) => `/criteria/${id}`,
    //   transformResponse: (response: any) =>
    //     Array.isArray(response?.data) && response.data.length > 0
    //       ? response.data[0]
    //       : response?.data ?? response,
    //   providesTags: ["Criteria"],
    // }),
    getCriteriaDetails: builder.query({
      query: (id) => `/criteria/${id}`,
      providesTags: ["Criteria"],
    }),
    createCriteria: builder.mutation({
      query: (body) => ({
        url: `/criteria`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Criteria"],
    }),
    createCriteriaVersion: builder.mutation({
      query: ({ id, body }) => ({
        url: `/criteria/${id}`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Criteria"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCriteriaQuery,
  // useGetCriteriaByIdQuery,
  useGetCriteriaDetailsQuery,
  useCreateCriteriaMutation,
  useCreateCriteriaVersionMutation,
} = criteriaApi;

