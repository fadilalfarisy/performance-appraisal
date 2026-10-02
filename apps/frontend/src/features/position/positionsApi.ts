import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  CreatePositionRequest,
  PositionResponse,
  UpdatePositionRequest,
} from "@appraisal/types";

export const positionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPositions: builder.query<ApiResponse<PositionResponse[]>, void>({
      query: () => `/positions`,
      providesTags: ["Positions"],
    }),
    getPositionById: builder.query<
      ApiResponse<PositionResponse>,
      string | undefined
    >({
      query: (id) => `/positions/${id}`,
      providesTags: ["Positions"],
    }),
    createPosition: builder.mutation<
      ApiResponse<PositionResponse>,
      CreatePositionRequest
    >({
      query: (body) => ({
        url: `/positions`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Positions"],
    }),
    updatePosition: builder.mutation<
      ApiResponse<PositionResponse>,
      { id: string; body: UpdatePositionRequest }
    >({
      query: ({ id, body }) => ({
        url: `/positions/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Positions"],
    }),
    deletePosition: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/positions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Positions"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPositionsQuery,
  useGetPositionByIdQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
} = positionsApi;
