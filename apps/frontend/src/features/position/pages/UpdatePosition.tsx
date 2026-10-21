import { useNavigate, useParams } from "react-router-dom";
import { Button, Result } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { PositionForm } from "../components/PositionForm";
import { useGetPositionByIdQuery, useUpdatePositionMutation } from "../positionsApi";

export const UpdatePosition = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: initialValueUser,
    isError,
    isSuccess,
  } = useGetPositionByIdQuery(id);

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
        <TitlePage title="Update Position" description="Form update position">
          <Button
            onClick={() => navigate("/dashboard/positions")}
            icon={<ArrowLeftOutlined />}
          >
            Back
          </Button>
        </TitlePage>
        <PositionForm
          createForm={false}
          formFunction={useUpdatePositionMutation}
          initialValues={initialValueUser?.data}
        />
      </>
    );
  }
};
