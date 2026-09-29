import { Result } from "antd";
import { useParams } from "react-router-dom";
import { TitlePage } from "@/components";
import {
  useGetPermissionByIdQuery,
  useUpdatePermissionMutation,
} from "../permissionsApi";
import { PermissionForm } from "../components/PermissionForm";

export const UpdatePermission = () => {
  const { id } = useParams();

  const {
    data: initialValuePermission,
    isError,
    isSuccess,
  } = useGetPermissionByIdQuery(id);

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
        <TitlePage
          title="Update Permission"
          description="Form update permission"
        />
        <PermissionForm
          createForm={false}
          formFunction={useUpdatePermissionMutation}
          initialValues={initialValuePermission?.data}
        />
      </>
    );
  }
};
