import { Result, Spin } from "antd";
import { TitlePage } from "@/components";
import {
  useCreateCriteriaVersionMutation,
  useGetCriteriaDetailsQuery,
} from "@/features/criteria/criteriaApi";
import { CriteriaForm } from "../components/CriteriaForm";
import { useParams } from "react-router-dom";

export const CreateCriteriaVersion = () => {
  const { id } = useParams();
  const { data, isLoading, isError } = useGetCriteriaDetailsQuery(id);

  if (isError) {
    return (
      <Result
        status="error"
        title="403 Forbidden"
        subTitle="Oops, You can't access this page."
      />
    );
  }

  if (isLoading) {
    return <Spin />;
  }

  return (
    <>
      <TitlePage
        title="Create Criteria Version"
        description="Form create criteria version"
      />
      <CriteriaForm
        createForm={false}
        formFunction={useCreateCriteriaVersionMutation}
        initialValues={data?.data?.[0]}
      />
    </>
  );
};
