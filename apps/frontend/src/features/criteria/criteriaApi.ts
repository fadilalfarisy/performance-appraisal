import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  CreateCriteriaRequest,
  CriteriaVersionResponse,
  CriterionResponse,
} from "@appraisal/types";

export const criteriaApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCriteria: builder.query<ApiResponse<CriteriaVersionResponse[]>, void>({
      query: () => `/criteria`,
      providesTags: ["Criteria"],
    }),
    getCriteriaDetails: builder.query<
      ApiResponse<CriterionResponse[]>,
      string | undefined
    >({
      query: (id) => `/criteria/${id}`,
      providesTags: ["Criteria"],
    }),
    createCriteria: builder.mutation<
      ApiResponse<CriterionResponse>,
      CreateCriteriaRequest
    >({
      query: (body) => ({
        url: `/criteria`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Criteria"],
    }),
    createCriteriaVersion: builder.mutation<
      ApiResponse<CriterionResponse>,
      { id: string; body: CreateCriteriaRequest }
    >({
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
  useGetCriteriaDetailsQuery,
  useCreateCriteriaMutation,
  useCreateCriteriaVersionMutation,
} = criteriaApi;
