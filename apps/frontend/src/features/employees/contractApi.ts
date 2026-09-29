import { apiSlice } from "@/api/apiSlice";

export const contractApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getContractEmployee: builder.query({
      query: (id) => `/employees/${id}/contracts`,
      transformResponse: (response: any) => response?.data ?? [],
      providesTags: ["Contracts"],
    }),
    getContractById: builder.query({
      query: ({ id, contractId }) => `/employees/${id}/contracts/${contractId}`,
      providesTags: ["Contracts"],
    }),
    createContract: builder.mutation({
      query: ({ id, body }) => ({
        url: `/employees/${id}/contracts`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
    updateContract: builder.mutation({
      query: ({ id, contractId, body }) => ({
        url: `/employees/${id}/contracts/${contractId}`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
    deleteContract: builder.mutation({
      query: ({ id, contractId }) => ({
        url: `/employees/${id}/contracts/${contractId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Contracts", "Employees"],
    }),
  }),
  // overrideExisting: false,
});

export const {
  useGetContractEmployeeQuery,
  useGetContractByIdQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useDeleteContractMutation,
} = contractApi;
