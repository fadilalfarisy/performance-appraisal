import { useNavigate, useParams } from "react-router-dom";
import { Button, Result } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { DepartmentForm } from "../components/DepartmentForm";
import { useGetDepartmentByIdQuery, useUpdateDepartmentMutation } from "../departmentsApi";

export const UpdateDepartment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: initialValueUser,
    isError,
    isSuccess,
  } = useGetDepartmentByIdQuery(id);

  if (isError) {
    return (
      <Result
        status="error"
        title="Something Error"
        subTitle="Oops, Your can't access this page."
      />
    );
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage title="Update Department" description="Form update department">
          <Button
            onClick={() => navigate("/dashboard/departments")}
            icon={<ArrowLeftOutlined />}
          >
            Back
          </Button>
        </TitlePage>
        <DepartmentForm
          createForm={false}
          formFunction={useUpdateDepartmentMutation}
          initialValues={initialValueUser?.data}
        />
      </>
    );
  }
};
