import { TitlePage } from "@/components";
import { RoleForm } from "../components/RoleForm";
import { useCreateRoleMutation } from "../rolesApi";

export const CreateRole = () => {
  return (
    <>
      <TitlePage title="Create Role" description="Form create role" />
      <RoleForm createForm={true} formFunction={useCreateRoleMutation} />
    </>
  );
};
