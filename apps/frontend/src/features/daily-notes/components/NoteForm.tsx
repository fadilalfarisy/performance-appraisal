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
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  FieldInputType,
  type AccessibleEmployeeResponse,
  type CriterionFieldResponse,
  type CriterionResponse,
  type DailyNoteValueInput,
  type FieldValue,
} from "@appraisal/types";

const { Text } = Typography;

type Payload = {
  employeeId: string;
  recordDate: string;
  values: DailyNoteValueInput[];
};

type Props = {
  criteria: CriterionResponse[];
  employeeOptions: AccessibleEmployeeResponse[];
  initialEmployeeId?: string;
  initialRecordDate?: string;
  initialFieldValues?: Record<string, FieldValue>;
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
  criteria,
  employeeOptions,
  initialEmployeeId,
  initialRecordDate,
  initialFieldValues,
  lockKeyFields = false,
  loading = false,
  submitLabel,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm();
  const groups = criteria.filter((criterion) => criterion.fields.length > 0);
  const fields = groups.flatMap((criterion) => criterion.fields);

  if (fields.length === 0) {
    return (
      <Empty description="The active criteria set has no note fields yet" />
    );
  }

  const initialValues: Record<string, unknown> = {
    employeeId: initialEmployeeId,
    recordDate: initialRecordDate ? dayjs(initialRecordDate) : undefined,
  };
  for (const field of fields) {
    const provided = initialFieldValues?.[field.id];
    const value =
      provided ?? field.defaultValue ?? undefined;
    initialValues[field.id] =
      field.inputType === FieldInputType.DATE ? toDayjs(value) : value;
  }

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
      values: payloadValues,
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleFinish}
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
      </Space>

      {groups.map((criterion) => (
        <Card
          key={criterion.id}
          title={criterion.name}
          style={{ marginBottom: 16 }}
        >
          {criterion.description ? (
            <Text type="secondary">{criterion.description}</Text>
          ) : null}
          {criterion.fields.map((field) => (
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
      ))}

      <Button type="primary" htmlType="submit" loading={loading}>
        {submitLabel}
      </Button>
    </Form>
  );
};
