import { apiSlice } from "@/api/apiSlice";
import type {
  ApiResponse,
  ContractQuery,
  ContractResponse,
  CreateContractRequest,
  UpdateContractRequest,
} from "@appraisal/types";

export const contractApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getContracts: builder.query<
      ApiResponse<ContractResponse[]>,
      ContractQuery | undefined
    >({
      query: (params) => ({ url: `/contracts`, params }),
      providesTags: ["Contracts"],
    }),
    getContractById: builder.query<ApiResponse<ContractResponse>, string | undefined>({
      query: (id) => `/contracts/${id}`,
      providesTags: ["Contracts"],
    }),
    createContract: builder.mutation<
      ApiResponse<ContractResponse>,
      CreateContractRequest
    >({
      query: (body) => ({ url: `/contracts`, method: "POST", body }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
    updateContract: builder.mutation<
      ApiResponse<ContractResponse>,
      { id: string | undefined; body: UpdateContractRequest }
    >({
      query: ({ id, body }) => ({
        url: `/contracts/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
    deleteContract: builder.mutation<ApiResponse<void>, string | undefined>({
      query: (id) => ({ url: `/contracts/${id}`, method: "DELETE" }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetContractsQuery,
  useGetContractByIdQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
} = contractApi;
