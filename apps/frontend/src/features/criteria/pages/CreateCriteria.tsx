import { TitlePage } from "@/components";
import { useCreateCriteriaMutation } from "@/features/criteria/criteriaApi";
import { CriteriaForm } from "../components/CriteriaForm";

export const CreateCriteria = () => {
  return (
    <>
      <TitlePage title="Create Criteria" description="Form create criteria" />
      <CriteriaForm createForm={true} formFunction={useCreateCriteriaMutation} />
    </>
  );
};
