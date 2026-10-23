import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, App, Spin } from "antd";
import { TitlePage } from "@/components";
import {
  useGetAvailableCriteriaSetsQuery,
  useGetCriteriaSetByIdQuery,
} from "@/features/criteria";
import {
  useCreateDailyNoteMutation,
  useGetAccessibleEmployeesQuery,
} from "../dailyNotesApi";
import { NoteForm } from "../components/NoteForm";
import { errorHandling } from "@/utils/errorUtils";

export const CreateDailyNote = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [criteriaSetId, setCriteriaSetId] = useState<string | undefined>();

  const { data: employees, isSuccess: employeesLoaded } =
    useGetAccessibleEmployeesQuery();
  const selectedEmployee = employees?.data?.find(
    (employee) => employee.id === employeeId,
  );
  const departmentId = selectedEmployee?.departmentId ?? undefined;

  const { data: available, isSuccess: availableLoaded } =
    useGetAvailableCriteriaSetsQuery(departmentId, {
      skip: !departmentId,
    });
  const { data: criteriaSet, isFetching: criteriaLoading } =
    useGetCriteriaSetByIdQuery(criteriaSetId, { skip: !criteriaSetId });
  const [createNote, { isLoading }] = useCreateDailyNoteMutation();

  if (!employeesLoaded) return <Spin />;

  const criteriaSetOptions = (available?.data ?? []).map((set) => ({
    value: set.id,
    label: `v${set.version} — ${set.status} — ${set.departmentName ?? "Global"}`,
  }));

  const noCriteriaSets =
    Boolean(employeeId) &&
    availableLoaded &&
    (available?.data?.length ?? 0) === 0;

  return (
    <>
      <TitlePage
        title="New daily note"
        description={
          criteriaSet
            ? `Form generated from criteria set v${criteriaSet.data.version}`
            : "Choose an employee and criteria set"
        }
      />

      {noCriteriaSets && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="No criteria set is available for this department"
          description="Ask HR or Admin to activate a criteria set for the department, or use a global set."
        />
      )}

      <NoteForm
        fields={criteriaSetId ? (criteriaSet?.data.fields ?? []) : []}
        employeeOptions={employees?.data ?? []}
        initialCriteriaSetId={criteriaSetId}
        criteriaSetOptions={criteriaSetOptions}
        onEmployeeChange={(value) => {
          setEmployeeId(value);
          setCriteriaSetId(undefined);
        }}
        onCriteriaSetChange={setCriteriaSetId}
        loading={isLoading || criteriaLoading}
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
