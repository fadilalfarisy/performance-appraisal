import { TitlePage } from "@/components";
import { useCreatePerformanceMutation } from "../performanceApi";
import { PerformanceForm } from "../components/PerformanceForm";

export const CreatePerformance = () => {
  return (
    <>
      <TitlePage
        title="Create Record Daily Performance"
        description="Form create daily performance"
      />
      <PerformanceForm
        createForm={true}
        formFunction={useCreatePerformanceMutation}
      />
    </>
  );
};
