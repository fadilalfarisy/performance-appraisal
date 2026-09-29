import { TitlePage } from "@/components";
import { useCreatePositionMutation } from "../positionsApi";
import { PositionForm } from "../components/PositionForm";

export const CreatePosition = () => {
  return (
    <>
      <TitlePage title="Create Position" description="Form create position" />
      <PositionForm createForm={true} formFunction={useCreatePositionMutation} />
    </>
  );
};
