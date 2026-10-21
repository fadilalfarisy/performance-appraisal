import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useCreatePositionMutation } from "../positionsApi";
import { PositionForm } from "../components/PositionForm";

export const CreatePosition = () => {
  const navigate = useNavigate();

  return (
    <>
      <TitlePage title="Create Position" description="Form create position">
        <Button
          onClick={() => navigate("/dashboard/positions")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>
      <PositionForm createForm={true} formFunction={useCreatePositionMutation} />
    </>
  );
};
