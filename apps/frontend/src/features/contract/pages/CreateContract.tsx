import { useParams } from "react-router-dom";
import { TitlePage } from "@/components";
import { useCreateContractMutation } from "../contractApi";
import { ContractForm } from "../components/ContractForm";

export const CreateContract = () => {
  const { employeeId } = useParams();

  return (
    <>
      <TitlePage
        title="Create Contract"
        description="Form to create contract"
      />
      <ContractForm
        createForm={true}
        formFunction={useCreateContractMutation}
        employeeId={employeeId}
      />
    </>
  );
};
