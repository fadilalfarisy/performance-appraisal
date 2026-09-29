import { Result } from "antd";
import { useParams } from "react-router-dom";
import { TitlePage } from "@/components";
import { RoleForm } from "../components/RoleForm";
import {
  useGetRoleByIdQuery,
  useUpdateRoleMutation,
} from "../rolesApi";

export const UpdateRole = () => {
  const { id } = useParams();

  const {
    data: initialValueRole,
    isError,
    isSuccess,
  } = useGetRoleByIdQuery(id);

  if (isError) {
    return (
      <Result
        status="error"
        title="Something Error"
        subTitle="Oops, You can't access this page."
      />
    );
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage title="Update Role" description="Form update role" />
        <RoleForm
          createForm={false}
          formFunction={useUpdateRoleMutation}
          initialValues={initialValueRole?.data}
        />
      </>
    );
  }
};
