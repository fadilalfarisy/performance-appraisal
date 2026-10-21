import { apiSlice } from "@/api/apiSlice";
import type {
  AccessibleEmployeeResponse,
  ApiResponse,
  CreateDailyNoteRequest,
  DailyNoteQuery,
  DailyNoteResponse,
  UpdateDailyNoteRequest,
} from "@appraisal/types";

export const dailyNotesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDailyNotes: builder.query<
      ApiResponse<DailyNoteResponse[]>,
      DailyNoteQuery | undefined
    >({
      query: (params) => ({ url: `/daily-notes`, params }),
      providesTags: ["DailyNotes"],
    }),
    getDailyNoteById: builder.query<
      ApiResponse<DailyNoteResponse>,
      string | undefined
    >({
      query: (id) => `/daily-notes/${id}`,
      providesTags: ["DailyNotes"],
    }),
    getAccessibleEmployees: builder.query<
      ApiResponse<AccessibleEmployeeResponse[]>,
      void
    >({
      query: () => `/daily-notes/accessible-employees`,
      providesTags: ["DailyNotes"],
    }),
    createDailyNote: builder.mutation<
      ApiResponse<DailyNoteResponse>,
      CreateDailyNoteRequest
    >({
      query: (body) => ({ url: `/daily-notes`, method: "POST", body }),
      invalidatesTags: ["DailyNotes"],
    }),
    updateDailyNote: builder.mutation<
      ApiResponse<DailyNoteResponse>,
      { id: string; body: UpdateDailyNoteRequest }
    >({
      query: ({ id, body }) => ({
        url: `/daily-notes/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["DailyNotes"],
    }),
    deleteDailyNote: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/daily-notes/${id}`, method: "DELETE" }),
      invalidatesTags: ["DailyNotes"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDailyNotesQuery,
  useGetDailyNoteByIdQuery,
  useGetAccessibleEmployeesQuery,
  useCreateDailyNoteMutation,
  useUpdateDailyNoteMutation,
  useDeleteDailyNoteMutation,
} = dailyNotesApi;
