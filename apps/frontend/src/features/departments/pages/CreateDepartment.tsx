import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useCreateDepartmentMutation } from "../departmentsApi";
import { DepartmentForm } from "../components/DepartmentForm";

export const CreateDepartment = () => {
  const navigate = useNavigate();

  return (
    <>
      <TitlePage title="Create Department" description="Form create department">
        <Button
          onClick={() => navigate("/dashboard/departments")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>
      <DepartmentForm createForm={true} formFunction={useCreateDepartmentMutation} />
    </>
  );
};
