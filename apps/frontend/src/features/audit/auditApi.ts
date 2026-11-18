import { apiSlice } from "@/api/apiSlice";
import type { ApiResponse, AuditLogQuery, AuditLogResponse } from "@appraisal/types";

export const auditApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      ApiResponse<AuditLogResponse[]>,
      AuditLogQuery | undefined
    >({
      query: (params) => ({
        url: `/audit-logs`,
        params,
      }),
      providesTags: ["AuditLogs"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAuditLogsQuery } = auditApi;
