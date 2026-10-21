import { useNavigate } from "react-router-dom";
import { App, Result, Spin } from "antd";
import { TitlePage } from "@/components";
import { useGetActiveCriteriaSetQuery } from "@/features/criteria";
import {
  useCreateDailyNoteMutation,
  useGetAccessibleEmployeesQuery,
} from "../dailyNotesApi";
import { NoteForm } from "../components/NoteForm";
import { errorHandling } from "@/utils/errorUtils";

export const CreateDailyNote = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { data: active, isSuccess } = useGetActiveCriteriaSetQuery();
  const { data: employees } = useGetAccessibleEmployeesQuery();
  const [createNote, { isLoading }] = useCreateDailyNoteMutation();

  if (!isSuccess) return <Spin />;

  const criteriaSet = active?.data;
  if (!criteriaSet) {
    return (
      <Result
        status="info"
        title="No active criteria set"
        subTitle="Ask HR or Admin to activate a criteria set before recording notes."
      />
    );
  }

  return (
    <>
      <TitlePage
        title="New daily note"
        description={`Form generated from criteria set v${criteriaSet.version}`}
      />
      <NoteForm
        criteria={criteriaSet.criteria}
        employeeOptions={employees?.data ?? []}
        loading={isLoading}
        submitLabel="Save note"
        onSubmit={async (payload) => {
          try {
            await createNote(payload).unwrap();
            message.success("Daily note saved");
            navigate("/dashboard/daily-notes");
          } catch (error) {
            errorHandling(error);
          }
        }}
      />
    </>
  );
};
