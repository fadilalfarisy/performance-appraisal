import { useParams } from "react-router-dom";
import { Result } from "antd";
import { TitlePage } from "@/components";
import { UserForm } from "../components/UserForm";
import { useGetUserByIdQuery, useUpdateUserMutation } from "../usersApi";

export const UpdateUser = () => {
  const { id } = useParams();

  const {
    data: initialValueUser,
    isError,
    isSuccess,
  } = useGetUserByIdQuery(id);

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
        <TitlePage title="Update User" description="Form update user" />
        <UserForm
          createForm={false}
          formFunction={useUpdateUserMutation}
          initialValues={initialValueUser?.data}
        />
      </>
    );
  }
};
