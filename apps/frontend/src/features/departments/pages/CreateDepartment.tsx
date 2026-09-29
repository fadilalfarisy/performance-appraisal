import { TitlePage } from "@/components";
import { useCreateDepartmentMutation } from "../departmentsApi";
import { DepartmentForm } from "../components/DepartmentForm";

export const CreateDepartment = () => {
  return (
    <>
      <TitlePage title="Create Department" description="Form create department" />
      <DepartmentForm createForm={true} formFunction={useCreateDepartmentMutation} />
    </>
  );
};
