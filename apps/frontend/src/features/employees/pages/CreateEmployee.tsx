import { TitlePage } from "@/components";
import { useCreateEmployeeMutation } from "../employeesApi";
import { EmployeeForm } from "../components/EmployeeForm";

export const CreateEmployee = () => {
  return (
    <>
      <TitlePage title="Create Employee" description="Form create employee" />
      <EmployeeForm
        createForm={true}
        formFunction={useCreateEmployeeMutation}
      />
    </>
  );
};
