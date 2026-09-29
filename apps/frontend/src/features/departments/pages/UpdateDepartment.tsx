import { useParams } from "react-router-dom";
import { Result } from "antd";
import { TitlePage } from "@/components";
import { DepartmentForm } from "../components/DepartmentForm";
import { useGetDepartmentByIdQuery, useUpdateDepartmentMutation } from "../departmentsApi";

export const UpdateDepartment = () => {
  const { id } = useParams();

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
        <TitlePage title="Update Department" description="Form update department" />
        <DepartmentForm
          createForm={false}
          formFunction={useUpdateDepartmentMutation}
          initialValues={initialValueUser?.data}
        />
      </>
    );
  }
};
