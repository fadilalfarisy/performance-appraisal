import { Navigate, useParams } from "react-router-dom";
import { TitlePage } from "@/components";
import {
  useGetContractByIdQuery,
  useUpdateContractMutation,
} from "../contractApi";
import { ContractForm } from "../../employees/components/ContractForm";

export const UpdateContract = () => {
  const { employeeId, contractId } = useParams();

  const {
    data: initialValueContract,
    isError,
    isSuccess,
  } = useGetContractByIdQuery({ id: employeeId, contractId });

  if (isError) {
    return <Navigate to={"/dashboard/employee"} />;
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage
          title="Update Contract"
          description="Form to update contract"
        />
        <ContractForm
          createForm={false}
          formFunction={useUpdateContractMutation}
          initialValues={initialValueContract?.data}
          employeeId={employeeId}
          contractId={contractId}
        />
      </>
    );
  }
};
