import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import {
  useGetContractByIdQuery,
  useUpdateContractMutation,
} from "../contractApi";
import { ContractForm } from "../components/ContractForm";

export const UpdateContract = () => {
  const { employeeId, contractId } = useParams();
  const navigate = useNavigate();

  const {
    data: initialValueContract,
    isError,
    isSuccess,
  } = useGetContractByIdQuery(contractId);

  if (isError) {
    return <Navigate to={"/dashboard/employee"} />;
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage
          title="Update Contract"
          description="Form to update contract"
        >
          <Button
            onClick={() =>
              navigate(`/dashboard/employee/${employeeId}?tab=contracts`)
            }
            icon={<ArrowLeftOutlined />}
          >
            Back
          </Button>
        </TitlePage>
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
