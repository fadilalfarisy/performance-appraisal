import { useNavigate, useParams } from "react-router-dom";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useCreateContractMutation } from "../contractApi";
import { ContractForm } from "../components/ContractForm";

export const CreateContract = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <TitlePage
        title="Create Contract"
        description="Form to create contract"
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
        createForm={true}
        formFunction={useCreateContractMutation}
        employeeId={employeeId}
      />
    </>
  );
};
