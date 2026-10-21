import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useCreateEmployeeMutation } from "../employeesApi";
import { EmployeeForm } from "../components/EmployeeForm";

export const CreateEmployee = () => {
  const navigate = useNavigate();

  return (
    <>
      <TitlePage title="Create Employee" description="Form create employee">
        <Button
          onClick={() => navigate("/dashboard/employee")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>
      <EmployeeForm
        createForm={true}
        formFunction={useCreateEmployeeMutation}
      />
    </>
  );
};
