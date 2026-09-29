import { TitlePage } from "@/components";
import { useCreatePermissionMutation } from "../permissionsApi";
import { PermissionForm } from "../components/PermissionForm";

export const CreatePermission = () => {
  return (
    <>
      <TitlePage title="Create Permission" description="Form create permission" />
      <PermissionForm
        createForm={true}
        formFunction={useCreatePermissionMutation}
      />
    </>
  );
};
