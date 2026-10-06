import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  AppraisalQuery,
  AppraisalResponse,
  AppraisalStatusHistoryResponse,
  AppraisalTransitionRequest,
  CreateAppraisalRequest,
  PreviewAppraisalRequest,
  PreviewAppraisalResponse,
  SaveRatingsRequest,
  UpdateAppraisalEmployeesRequest,
} from "@appraisal/types";

export const appraisalsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAppraisals: builder.query<
      ApiResponse<AppraisalResponse[]>,
      AppraisalQuery | undefined
    >({
      query: (params) => ({ url: `/appraisals`, params }),
      providesTags: ["Appraisals"],
    }),
    getAppraisalById: builder.query<
      ApiResponse<AppraisalResponse>,
      string | undefined
    >({
      query: (id) => `/appraisals/${id}`,
      providesTags: ["Appraisals"],
    }),
    getAppraisalHistory: builder.query<
      ApiResponse<AppraisalStatusHistoryResponse[]>,
      string | undefined
    >({
      query: (id) => `/appraisals/${id}/history`,
      providesTags: ["Appraisals"],
    }),
    previewAppraisal: builder.mutation<
      ApiResponse<PreviewAppraisalResponse>,
      PreviewAppraisalRequest
    >({
      query: (body) => ({ url: `/appraisals/preview`, method: "POST", body }),
    }),
    createAppraisal: builder.mutation<
      ApiResponse<AppraisalResponse>,
      CreateAppraisalRequest
    >({
      query: (body) => ({ url: `/appraisals`, method: "POST", body }),
      invalidatesTags: ["Appraisals"],
    }),
    updateAppraisalEmployees: builder.mutation<
      ApiResponse<AppraisalResponse>,
      { id: string; body: UpdateAppraisalEmployeesRequest }
    >({
      query: ({ id, body }) => ({
        url: `/appraisals/${id}/employees`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Appraisals"],
    }),
    saveRatings: builder.mutation<
      ApiResponse<AppraisalResponse>,
      { id: string; body: SaveRatingsRequest }
    >({
      query: ({ id, body }) => ({
        url: `/appraisals/${id}/ratings`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Appraisals"],
    }),
    transitionAppraisal: builder.mutation<
      ApiResponse<AppraisalResponse>,
      { id: string; body: AppraisalTransitionRequest }
    >({
      query: ({ id, body }) => ({
        url: `/appraisals/${id}/transition`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisals"],
    }),
    deleteAppraisal: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/appraisals/${id}`, method: "DELETE" }),
      invalidatesTags: ["Appraisals"],
    }),
    runScheduler: builder.mutation<
      { created: number; skipped: number; failed: number },
      { period?: string }
    >({
      query: (body) => ({
        url: `/scheduler/appraisals/run`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisals"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAppraisalsQuery,
  useGetAppraisalByIdQuery,
  useGetAppraisalHistoryQuery,
  usePreviewAppraisalMutation,
  useCreateAppraisalMutation,
  useUpdateAppraisalEmployeesMutation,
  useSaveRatingsMutation,
  useTransitionAppraisalMutation,
  useDeleteAppraisalMutation,
  useRunSchedulerMutation,
} = appraisalsApi;
