import { useNavigate, useParams } from "react-router-dom";
import { App, Result, Spin } from "antd";
import { TitlePage } from "@/components";
import { useGetCriteriaSetByIdQuery } from "@/features/criteria";
import {
  useGetDailyNoteByIdQuery,
  useUpdateDailyNoteMutation,
} from "../dailyNotesApi";
import { NoteForm } from "../components/NoteForm";
import { errorHandling } from "@/utils/errorUtils";
import type { AccessibleEmployeeResponse, FieldValue } from "@appraisal/types";

export const EditDailyNote = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { data, isLoading, isError } = useGetDailyNoteByIdQuery(id);
  const note = data?.data;
  const { data: setData, isSuccess: setSuccess } = useGetCriteriaSetByIdQuery(
    note?.criteriaSetId,
  );
  const [updateNote, { isLoading: isSaving }] = useUpdateDailyNoteMutation();

  if (isError) {
    return (
      <Result
        status="error"
        title="Not found"
        subTitle="You can't access this daily note."
      />
    );
  }
  if (isLoading || !note) return <Spin />;
  if (!setSuccess || !setData) return <Spin />;

  const initialFieldValues: Record<string, FieldValue> = {};
  for (const value of note.values) {
    initialFieldValues[value.fieldId] = value.value;
  }

  const employeeOptions: AccessibleEmployeeResponse[] = [
    {
      id: note.employeeId,
      employeeNumber: note.employeeNumber ?? "",
      fullName: note.employeeName ?? "",
      departmentId: note.departmentId,
      departmentName: note.departmentName,
    },
  ];

  return (
    <>
      <TitlePage
        title="Edit daily note"
        description={`Criteria set v${note.criteriaSetVersion ?? "-"}`}
      />
      <NoteForm
        fields={setData.data.fields}
        employeeOptions={employeeOptions}
        initialEmployeeId={note.employeeId}
        initialRecordDate={note.recordDate}
        initialFieldValues={initialFieldValues}
        initialCriteriaSetId={note.criteriaSetId}
        lockKeyFields
        loading={isSaving}
        submitLabel="Save changes"
        onSubmit={async (payload) => {
          try {
            await updateNote({
              id: note.id,
              body: { values: payload.values },
            }).unwrap();
            message.success("Daily note updated");
            navigate("/dashboard/daily-notes");
          } catch (error) {
            errorHandling(error);
          }
        }}
      />
    </>
  );
};
