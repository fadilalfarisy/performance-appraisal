import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  ContractResponse,
  CreateContractRequest,
  UpdateContractRequest,
} from "@appraisal/types";

export const contractApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getContractEmployee: builder.query<ContractResponse[], string | undefined>({
      query: (id) => `/employees/${id}/contracts`,
      transformResponse: (response: ApiResponse<ContractResponse[]>) =>
        response?.data ?? [],
      providesTags: ["Contracts"],
    }),
    getContractById: builder.query<
      ApiResponse<ContractResponse>,
      { id: string | undefined; contractId: string | undefined }
    >({
      query: ({ id, contractId }) => `/employees/${id}/contracts/${contractId}`,
      providesTags: ["Contracts"],
    }),
    createContract: builder.mutation<
      ApiResponse<ContractResponse>,
      { id: string; body: CreateContractRequest }
    >({
      query: ({ id, body }) => ({
        url: `/employees/${id}/contracts`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
    updateContract: builder.mutation<
      ApiResponse<ContractResponse>,
      { id: string; contractId: string; body: UpdateContractRequest }
    >({
      query: ({ id, contractId, body }) => ({
        url: `/employees/${id}/contracts/${contractId}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
    deleteContract: builder.mutation<
      ApiResponse<void>,
      { id: string | undefined; contractId: string | undefined }
    >({
      query: ({ id, contractId }) => ({
        url: `/employees/${id}/contracts/${contractId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
  }),
});

export const {
  useGetContractEmployeeQuery,
  useGetContractByIdQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
} = contractApi;
