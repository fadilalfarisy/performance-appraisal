import { TitlePage } from "@/components";
import { useCreateUserMutation } from "../usersApi";
import { UserForm } from "../components/UserForm";

export const CreateUser = () => {
  return (
    <>
      <TitlePage title="Create User" description="Form create user" />
      <UserForm createForm={true} formFunction={useCreateUserMutation} />
    </>
  );
};
