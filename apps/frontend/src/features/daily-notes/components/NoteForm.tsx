import { useEffect, useRef } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from "antd";
import dayjs from "dayjs";
import {
  FieldInputType,
  type AccessibleEmployeeResponse,
  type CriterionFieldResponse,
  type DailyNoteValueInput,
  type FieldValue,
} from "@appraisal/types";

type Payload = {
  employeeId: string;
  recordDate: string;
  criteriaSetId: string;
  values: DailyNoteValueInput[];
};

type CriteriaSetOption = {
  value: string;
  label: string;
};

type Props = {
  fields: CriterionFieldResponse[];
  employeeOptions: AccessibleEmployeeResponse[];
  initialEmployeeId?: string;
  initialRecordDate?: string;
  initialFieldValues?: Record<string, FieldValue>;
  initialCriteriaSetId?: string;
  criteriaSetOptions?: CriteriaSetOption[];
  onCriteriaSetChange?: (value: string) => void;
  onEmployeeChange?: (value: string) => void;
  lockKeyFields?: boolean;
  loading?: boolean;
  submitLabel: string;
  onSubmit: (payload: Payload) => void;
};

const toDayjs = (value: FieldValue | undefined) =>
  typeof value === "string" && value ? dayjs(value) : undefined;

const FieldInput = ({ field }: { field: CriterionFieldResponse }) => {
  switch (field.inputType) {
    case FieldInputType.NUMBER:
      return (
        <InputNumber
          min={field.rules?.min}
          max={field.rules?.max}
          style={{ width: 220 }}
        />
      );
    case FieldInputType.BOOLEAN:
      return <Switch />;
    case FieldInputType.OPTION:
      return (
        <Select
          allowClear
          style={{ width: 260 }}
          options={(field.options ?? []).map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      );
    case FieldInputType.MULTI_OPTION:
      return (
        <Select
          mode="multiple"
          allowClear
          style={{ minWidth: 260 }}
          options={(field.options ?? []).map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      );
    case FieldInputType.DATE:
      return <DatePicker style={{ width: 220 }} />;
    case FieldInputType.TEXT:
    default:
      return <Input style={{ maxWidth: 480 }} />;
  }
};

export const NoteForm = ({
  fields,
  employeeOptions,
  initialEmployeeId,
  initialRecordDate,
  initialFieldValues,
  initialCriteriaSetId,
  criteriaSetOptions,
  onCriteriaSetChange,
  onEmployeeChange,
  lockKeyFields = false,
  loading = false,
  submitLabel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm();
  const selectedCriteriaSetId = Form.useWatch("criteriaSetId", form);
  const fieldsKey = fields.map((field) => field.id).join(",");
  const fieldsRef = useRef(fields);
  const initialFieldValuesRef = useRef(initialFieldValues);
  const lastFieldsKey = useRef<string | null>(null);
  fieldsRef.current = fields;
  initialFieldValuesRef.current = initialFieldValues;

  const initialValues: Record<string, unknown> = {
    employeeId: initialEmployeeId,
    recordDate: initialRecordDate ? dayjs(initialRecordDate) : undefined,
    criteriaSetId: initialCriteriaSetId,
  };

  useEffect(() => {
    if (lastFieldsKey.current === fieldsKey) return;
    lastFieldsKey.current = fieldsKey;

    const values: Record<string, unknown> = {};
    for (const field of fieldsRef.current) {
      const provided = initialFieldValuesRef.current?.[field.id];
      const value = provided ?? field.defaultValue ?? undefined;
      values[field.id] =
        field.inputType === FieldInputType.DATE ? toDayjs(value) : value;
    }
    form.setFieldsValue(values);
  }, [fieldsKey, form]);

  const handleFinish = (values: Record<string, unknown>) => {
    const payloadValues: DailyNoteValueInput[] = fields.map((field) => {
      const raw = values[field.id];
      let value: FieldValue = null;
      if (raw !== undefined && raw !== null && raw !== "") {
        value =
          field.inputType === FieldInputType.DATE
            ? dayjs(raw as string).format("YYYY-MM-DD")
            : (raw as FieldValue);
      }
      return { fieldId: field.id, value };
    });

    onSubmit({
      employeeId: values.employeeId as string,
      recordDate: dayjs(values.recordDate as string).format("YYYY-MM-DD"),
      criteriaSetId:
        (values.criteriaSetId as string) ?? initialCriteriaSetId ?? "",
      values: payloadValues,
    });
  };

  const needsCriteriaSet = Boolean(criteriaSetOptions);

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleFinish}
      onValuesChange={(changed) => {
        if (changed.employeeId !== undefined) {
          form.setFieldValue("criteriaSetId", undefined);
          onEmployeeChange?.(changed.employeeId as string);
        }
      }}
      style={{ marginTop: 16 }}
    >
      <Space wrap size="large">
        <Form.Item label="Employee" name="employeeId" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            disabled={lockKeyFields}
            style={{ width: 300 }}
            options={employeeOptions.map((employee) => ({
              value: employee.id,
              label: `${employee.employeeNumber} — ${employee.fullName}`,
            }))}
          />
        </Form.Item>
        <Form.Item label="Date" name="recordDate" rules={[{ required: true }]}>
          <DatePicker disabled={lockKeyFields} style={{ width: 200 }} />
        </Form.Item>
        {criteriaSetOptions && (
          <Form.Item
            label="Criteria set"
            name="criteriaSetId"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select criteria set"
              disabled={lockKeyFields}
              style={{ width: 360 }}
              options={criteriaSetOptions}
              onChange={(value) => onCriteriaSetChange?.(value)}
            />
          </Form.Item>
        )}
      </Space>

      {fields.length === 0 ? (
        <Empty
          description={
            needsCriteriaSet && !selectedCriteriaSetId
              ? "Select a criteria set to load the form fields."
              : "The selected criteria set has no note fields yet."
          }
        />
      ) : (
        <Card title="Daily note fields" style={{ marginBottom: 16 }}>
          {fields.map((field) => (
            <Form.Item
              key={field.id}
              label={field.label}
              name={field.id}
              valuePropName={
                field.inputType === FieldInputType.BOOLEAN ? "checked" : "value"
              }
              rules={[{ required: field.required }]}
            >
              <FieldInput field={field} />
            </Form.Item>
          ))}
        </Card>
      )}

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        disabled={needsCriteriaSet && !selectedCriteriaSetId}
      >
        {submitLabel}
      </Button>
    </Form>
  );
};
