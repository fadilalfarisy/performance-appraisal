import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useCreateUserMutation } from "../usersApi";
import { UserForm } from "../components/UserForm";

export const CreateUser = () => {
  const navigate = useNavigate();

  return (
    <>
      <TitlePage title="Create User" description="Form create user">
        <Button
          onClick={() => navigate("/dashboard/users")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>
      <UserForm createForm={true} formFunction={useCreateUserMutation} />
    </>
  );
};
