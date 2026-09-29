import { useParams } from "react-router-dom";
import { Result } from "antd";
import { TitlePage } from "@/components";
import { PositionForm } from "../components/PositionForm";
import { useGetPositionByIdQuery, useUpdatePositionMutation } from "../positionsApi";

export const UpdatePosition = () => {
  const { id } = useParams();

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
        <TitlePage title="Update Position" description="Form update position" />
        <PositionForm
          createForm={false}
          formFunction={useUpdatePositionMutation}
          initialValues={initialValueUser?.data}
        />
      </>
    );
  }
};
