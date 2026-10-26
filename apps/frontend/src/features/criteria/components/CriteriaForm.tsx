import { useMemo } from "react";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Space,
  Divider,
  Popconfirm,
  Select,
  Switch,
  Alert,
  Tabs,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useActivateCriteriaSetMutation,
  useUpdateCriteriaSetMutation,
} from "../criteriaApi";
import { errorHandling } from "@/utils/errorUtils";
import { FieldInputType, type CriteriaSetResponse } from "@appraisal/types";

type Props = {
  criteriaSet: CriteriaSetResponse;
  mode: "draft" | "active";
};

type CriterionFormValue = {
  name?: string;
  weight?: number;
};

type FieldFormValue = {
  inputType?: FieldInputType;
};

const FIELD_TYPE_OPTIONS = Object.values(FieldInputType).map((value) => ({
  value,
  label: value,
}));

type CriterionFieldsEditorProps = {
  inputTypeAt: (fieldIndex: number) => FieldInputType | undefined;
};

const CriterionFieldsEditor = ({
  inputTypeAt,
}: CriterionFieldsEditorProps) => (
  <Form.List name="fields">
    {(fieldRows, fieldOps) => (
      <>
        {fieldRows.map((fieldRow) => {
          const inputType = inputTypeAt(fieldRow.name);
          const needsOptions =
            inputType === FieldInputType.OPTION ||
            inputType === FieldInputType.MULTI_OPTION;
          const isNumber = inputType === FieldInputType.NUMBER;
          const isText = inputType === FieldInputType.TEXT;

          return (
            <Card
              key={fieldRow.key}
              type="inner"
              size="small"
              style={{ marginBottom: 8 }}
              title={`Field ${fieldRow.name + 1}`}
              extra={
                <Button
                  color="danger"
                  variant="solid"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => fieldOps.remove(fieldRow.name)}
                />
              }
            >
              <Space wrap size="middle" style={{width: "100%"}}>
                <Form.Item
                  label="Key"
                  name={[fieldRow.name, "fieldKey"]}
                  rules={[{ required: true }]}
                >
                  <Input style={{ width: 160 }} />
                </Form.Item>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 200,
                  }}
                >
                  <Form.Item
                    label="Label"
                    name={[fieldRow.name, "label"]}
                    rules={[{ required: true }]}
                    style={{ marginBottom: 8 }}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="Description"
                    name={[fieldRow.name, "description"]}
                    style={{ marginBottom: 8 }}
                  >
                    <Input placeholder="Shown under the label" />
                  </Form.Item>
                </div>
                <Form.Item
                  label="Type"
                  name={[fieldRow.name, "inputType"]}
                  rules={[{ required: true }]}
                >
                  <Select style={{ width: 160 }} options={FIELD_TYPE_OPTIONS} />
                </Form.Item>
                <Form.Item
                  label="Required"
                  name={[fieldRow.name, "required"]}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="Order"
                  name={[fieldRow.name, "displayOrder"]}
                >
                  <InputNumber min={0} />
                </Form.Item>
              </Space>

              {isNumber && (
                <Space wrap size="middle">
                  <Form.Item label="Min" name={[fieldRow.name, "rules", "min"]}>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item label="Max" name={[fieldRow.name, "rules", "max"]}>
                    <InputNumber />
                  </Form.Item>
                </Space>
              )}

              {isText && (
                <Space wrap size="middle">
                  <Form.Item
                    label="Min length"
                    name={[fieldRow.name, "rules", "minLength"]}
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                  <Form.Item
                    label="Max length"
                    name={[fieldRow.name, "rules", "maxLength"]}
                  >
                    <InputNumber min={0} />
                  </Form.Item>
                  <Form.Item
                    label="Pattern"
                    name={[fieldRow.name, "rules", "pattern"]}
                  >
                    <Input style={{ width: 220 }} />
                  </Form.Item>
                </Space>
              )}

              {needsOptions && (
                <Form.List name={[fieldRow.name, "options"]}>
                  {(optionRows, optionOps) => (
                    <>
                      {optionRows.map((optionRow) => (
                        <Space key={optionRow.key} align="baseline">
                          <Form.Item
                            label="Value"
                            name={[optionRow.name, "value"]}
                            rules={[{ required: true }]}
                          >
                            <Input style={{ width: 160 }} />
                          </Form.Item>
                          <Form.Item
                            label="Label"
                            name={[optionRow.name, "label"]}
                            rules={[{ required: true }]}
                          >
                            <Input style={{ width: 200 }} />
                          </Form.Item>
                          <Button
                            color="danger"
                            variant="solid"
                            icon={<DeleteOutlined />}
                            onClick={() => optionOps.remove(optionRow.name)}
                          />
                        </Space>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => optionOps.add({ value: "", label: "" })}
                      >
                        Add option
                      </Button>
                    </>
                  )}
                </Form.List>
              )}
            </Card>
          );
        })}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            fieldOps.add({
              description: "",
              inputType: FieldInputType.TEXT,
              required: false,
              displayOrder: 0,
              options: [],
            })
          }
        >
          Add field
        </Button>
      </>
    )}
  </Form.List>
);

export const CriteriaForm = ({ criteriaSet, mode }: Props) => {
  const isActive = mode === "active";
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [updateSet, { isLoading: isSaving }] = useUpdateCriteriaSetMutation();
  const [activateSet, { isLoading: isActivating }] =
    useActivateCriteriaSetMutation();

  const watchedCriteria = Form.useWatch("criteria", form);
  const criteria = useMemo<CriterionFormValue[]>(
    () => (watchedCriteria as CriterionFormValue[] | undefined) ?? [],
    [watchedCriteria],
  );
  const watchedFields = Form.useWatch("fields", form);
  const fields = useMemo<FieldFormValue[]>(
    () => (watchedFields as FieldFormValue[] | undefined) ?? [],
    [watchedFields],
  );

  const totalWeight = useMemo(
    () =>
      criteria.reduce((sum, item) => sum + (Number(item?.weight) || 0), 0),
    [criteria],
  );

  const initialValues = {
    note: criteriaSet.note ?? "",
    criteria: criteriaSet.criteria.map((criterion) => ({
      id: criterion.id,
      code: criterion.code,
      name: criterion.name,
      description: criterion.description ?? "",
      scaleMin: criterion.scaleMin,
      scaleMax: criterion.scaleMax,
      weight: criterion.weight,
      displayOrder: criterion.displayOrder,
      scaleDescriptions: criterion.scaleDescriptions.map((d) => ({
        score: d.score,
        description: d.description,
      })),
    })),
    fields: criteriaSet.fields.map((field) => ({
      id: field.id,
      fieldKey: field.fieldKey,
      label: field.label,
      description: field.description ?? "",
      inputType: field.inputType,
      required: field.required ?? false,
      displayOrder: field.displayOrder ?? 0,
      options: field.options ?? [],
      rules: field.rules ?? {},
    })),
  };

  const onFinish = async (values: unknown) => {
    try {
      await updateSet({ id: criteriaSet.id, body: values as never }).unwrap();
      message.success(isActive ? "Criteria updated" : "Draft saved");
    } catch (error) {
      errorHandling(error);
    }
  };

  const handleActivate = async () => {
    try {
      await updateSet({
        id: criteriaSet.id,
        body: form.getFieldsValue(),
      }).unwrap();
      await activateSet(criteriaSet.id).unwrap();
      message.success("Criteria set activated");
      navigate("/dashboard/criteria");
    } catch (error) {
      errorHandling(error);
    }
  };

  const fieldInputTypeAt = (fieldIndex: number): FieldInputType | undefined =>
    fields[fieldIndex]?.inputType;

  const criteriaTab = (
    <Form.List name="criteria">
      {(fields, { add, remove }) => (
        <>
          {fields.map((field) => (
            <Card
              key={field.key}
              style={{ marginBottom: 16 }}
              title={`Criterion ${field.name + 1}`}
              extra={
                !isActive ? (
                  <Button
                    color="danger"
                    variant="solid"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
                ) : null
              }
            >
              <Space wrap size="middle">
                <Form.Item
                  label="Code"
                  name={[field.name, "code"]}
                  rules={[{ required: true }]}
                >
                  <Input style={{ width: 160 }} />
                </Form.Item>
                <Form.Item
                  label="Name"
                  name={[field.name, "name"]}
                  rules={[{ required: true }]}
                >
                  <Input style={{ width: 220 }} />
                </Form.Item>
                <Form.Item
                  label="Scale min"
                  name={[field.name, "scaleMin"]}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} />
                </Form.Item>
                <Form.Item
                  label="Scale max"
                  name={[field.name, "scaleMax"]}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} />
                </Form.Item>
                <Form.Item
                  label="Weight"
                  name={[field.name, "weight"]}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} max={100} disabled={isActive} />
                </Form.Item>
                <Form.Item label="Order" name={[field.name, "displayOrder"]}>
                  <InputNumber min={0} />
                </Form.Item>
              </Space>
              <Form.Item
                label="Description"
                name={[field.name, "description"]}
              >
                <Input.TextArea rows={1} />
              </Form.Item>

              <Divider orientation="left">Score descriptions</Divider>
              <Form.List name={[field.name, "scaleDescriptions"]}>
                {(descFields, descOps) => (
                  <>
                    {descFields.map((descField) => (
                      <Space key={descField.key} align="baseline">
                        <Form.Item
                          label="Score"
                          name={[descField.name, "score"]}
                          rules={[{ required: true }]}
                        >
                          <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item
                          label="Description"
                          name={[descField.name, "description"]}
                          rules={[{ required: true }]}
                        >
                          <Input style={{ width: 360 }} />
                        </Form.Item>
                        <Button
                          color="danger"
                          variant="solid"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => descOps.remove(descField.name)}
                        />
                      </Space>
                    ))}
                    <Button
                      type="dashed"
                      style={{marginLeft: "12px"}}
                      icon={<PlusOutlined />}
                      onClick={() =>
                        descOps.add({ score: undefined, description: "" })
                      }
                    >
                      Add score description
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>
          ))}
          {!isActive && (
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() =>
                add({
                  scaleMin: 1,
                  scaleMax: 5,
                  weight: 0,
                  scaleDescriptions: [],
                  fields: [],
                })
              }
            >
              Add criterion
            </Button>
          )}
        </>
      )}
    </Form.List>
  );

  const fieldsTab = (
    <CriterionFieldsEditor inputTypeAt={fieldInputTypeAt} />
  );

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      style={{ marginTop: 16 }}
    >
      <Form.Item label="Note" name="note">
        <Input.TextArea rows={2} placeholder="Reason for this version" />
      </Form.Item>

      {isActive && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Active criteria are partially locked"
          description="You can edit code, name, description, scale, score descriptions, and form fields. Weights and the criterion list cannot be changed."
        />
      )}

      <Tabs
        items={[
          {
            key: "criteria",
            label: "Criteria",
            forceRender: true,
            children: criteriaTab,
          },
          {
            key: "fields",
            label: "Form fields",
            forceRender: true,
            children: fieldsTab,
          },
        ]}
      />

      <Space style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={isSaving}>
          {isActive ? "Save changes" : "Save draft"}
        </Button>
        {!isActive && (
          <Popconfirm
            title="Activate this set? It archives the current active set for this department."
            onConfirm={handleActivate}
          >
            <Button
              type="primary"
              danger
              loading={isActivating}
              disabled={Math.abs(totalWeight - 100) > 0.01}
            >
              Activate
            </Button>
          </Popconfirm>
        )}
        <span
          style={{
            color: Math.abs(totalWeight - 100) > 0.01 ? "#cf1322" : "#389e0d",
          }}
        >
          Weight total: {totalWeight}
        </span>
      </Space>
    </Form>
  );
};
