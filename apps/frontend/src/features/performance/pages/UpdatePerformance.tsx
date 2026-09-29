import { Navigate, useParams } from "react-router-dom";
import { TitlePage } from "@/components";
import {
  useGetPerformanceByIdQuery,
  useUpdatePerformanceMutation,
} from "../performanceApi";
import { PerformanceForm } from "../components/PerformanceForm";

export const UpdatePerformance = () => {
  const { id } = useParams();
  const {
    data: initialValuePerformance,
    isError,
    isSuccess,
  } = useGetPerformanceByIdQuery(id);

  if (isError) {
    return <Navigate to={"/dashboard/performance"} />;
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage
          title="Update Performance"
          description="Form to update performance"
        />
        <PerformanceForm
          createForm={false}
          formFunction={useUpdatePerformanceMutation}
          initialValues={initialValuePerformance}
        />
      </>
    );
  }
};
