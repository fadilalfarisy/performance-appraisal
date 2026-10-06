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
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useActivateCriteriaSetMutation,
  useUpdateCriteriaSetMutation,
} from "../criteriaApi";
import { errorHandling } from "@/utils/errorUtils";
import type { CriteriaSetResponse } from "@appraisal/types";

type Props = {
  criteriaSet: CriteriaSetResponse;
};

export const CriteriaForm = ({ criteriaSet }: Props) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [updateSet, { isLoading: isSaving }] = useUpdateCriteriaSetMutation();
  const [activateSet, { isLoading: isActivating }] =
    useActivateCriteriaSetMutation();

  const criteria = Form.useWatch("criteria", form) ?? [];
  const totalWeight = useMemo(
    () =>
      (criteria as { weight?: number }[]).reduce(
        (sum, item) => sum + (Number(item?.weight) || 0),
        0,
      ),
    [criteria],
  );

  const initialValues = {
    note: criteriaSet.note ?? "",
    criteria: criteriaSet.criteria.map((criterion) => ({
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
  };

  const onFinish = async (values: unknown) => {
    try {
      await updateSet({ id: criteriaSet.id, body: values as never }).unwrap();
      message.success("Draft saved");
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

      <Form.List name="criteria">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <Card
                key={field.key}
                style={{ marginBottom: 16 }}
                title={`Criterion ${field.name + 1}`}
                extra={
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(field.name)}
                  />
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
                    <InputNumber min={0} max={100} />
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
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => descOps.remove(descField.name)}
                          />
                        </Space>
                      ))}
                      <Button
                        type="dashed"
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
                })
              }
            >
              Add criterion
            </Button>
          </>
        )}
      </Form.List>

      <Space style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={isSaving}>
          Save draft
        </Button>
        <Popconfirm
          title="Activate this set? It replaces the current active set."
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
