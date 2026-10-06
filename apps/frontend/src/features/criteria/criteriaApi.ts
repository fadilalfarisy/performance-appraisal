import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  CreateCriteriaSetRequest,
  CriteriaSetResponse,
  UpdateCriteriaSetRequest,
} from "@appraisal/types";

export const criteriaApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCriteriaSets: builder.query<ApiResponse<CriteriaSetResponse[]>, void>({
      query: () => `/criteria-sets`,
      providesTags: ["Criteria"],
    }),
    getActiveCriteriaSet: builder.query<
      ApiResponse<CriteriaSetResponse | null>,
      void
    >({
      query: () => `/criteria-sets/active`,
      providesTags: ["Criteria"],
    }),
    getCriteriaSetById: builder.query<
      ApiResponse<CriteriaSetResponse>,
      string | undefined
    >({
      query: (id) => `/criteria-sets/${id}`,
      providesTags: ["Criteria"],
    }),
    createCriteriaSet: builder.mutation<
      ApiResponse<CriteriaSetResponse>,
      CreateCriteriaSetRequest | undefined
    >({
      query: (body) => ({
        url: `/criteria-sets`,
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: ["Criteria"],
    }),
    updateCriteriaSet: builder.mutation<
      ApiResponse<CriteriaSetResponse>,
      { id: string | undefined; body: UpdateCriteriaSetRequest }
    >({
      query: ({ id, body }) => ({
        url: `/criteria-sets/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Criteria"],
    }),
    activateCriteriaSet: builder.mutation<
      ApiResponse<CriteriaSetResponse>,
      string | undefined
    >({
      query: (id) => ({
        url: `/criteria-sets/${id}/activate`,
        method: "POST",
      }),
      invalidatesTags: ["Criteria"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCriteriaSetsQuery,
  useGetActiveCriteriaSetQuery,
  useGetCriteriaSetByIdQuery,
  useCreateCriteriaSetMutation,
  useUpdateCriteriaSetMutation,
  useActivateCriteriaSetMutation,
} = criteriaApi;
