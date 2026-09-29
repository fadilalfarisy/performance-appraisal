import { apiSlice } from "@/api/apiSlice";

export const positionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPositions: builder.query({
      query: () => `/positions`,
      providesTags: ["Positions"],
    }),
    getPositionById: builder.query({
      query: (id) => `/positions/${id}`,
      transformResponse: (response: any) =>
        response.length > 0 ? response[0] : response,
      providesTags: ["Positions"],
    }),
    createPosition: builder.mutation({
      query: (body) => ({
        url: `/positions`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Positions"],
    }),
    updatePosition: builder.mutation({
      query: ({ id, body }) => ({
        url: `/positions/${id}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Positions"],
    }),
    deletePosition: builder.mutation({
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
