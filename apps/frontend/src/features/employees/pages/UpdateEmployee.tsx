import { useParams, Navigate } from "react-router-dom";
import { TitlePage } from "@/components";
import {
  useGetEmployeeByIdQuery,
  useUpdateEmployeeMutation,
} from "../employeesApi";
import { EmployeeForm } from "../components/EmployeeForm";

export const UpdateEmployee = () => {
  const { id } = useParams();
  const {
    data: initialValueEmployee,
    isSuccess,
    isError,
  } = useGetEmployeeByIdQuery(id);

  if (isError) {
    return <Navigate to={"/dashboard/employee"} />;
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage title="Update Employee" description="Form update employee" />
        <EmployeeForm
          createForm={false}
          formFunction={useUpdateEmployeeMutation}
          initialValues={initialValueEmployee?.data}
        />
      </>
    );
  }
};
