import { useNavigate, useParams } from "react-router-dom";
import {
  Form,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Input,
  Select,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useCreatePerformanceMutation,
  useUpdatePerformanceMutation,
} from "../performanceApi";
import { errorHandling } from "@/utils/errorUtils";
import { dateFormat } from "@/utils/dateUtils";
import { FormButton } from "@/components";

const { Text } = Typography;

type IPerformance = {
  employee_NIP: string;
  quantity: number;
  quality: number;
  discipline: number;
  running_instruction?: string;
  production_target: number;
  date_performance: string;
  responsibility?: string;
  religiousity?: string;
};

type Props = {
  createForm: boolean;
  formFunction:
  | typeof useCreatePerformanceMutation
  | typeof useUpdatePerformanceMutation;
  initialValues?: IPerformance;
};
export const PerformanceForm = ({
  createForm,
  formFunction,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const [queryPerformance, { isLoading }] = formFunction();

  const onFinish = async (values: any) => {
    try {
      console.log(values);
      if (createForm) {
        await queryPerformance(values).unwrap();
        message.success("Record was created");
        form.resetFields();
      }
      if (!createForm) {
        await queryPerformance({ id, body: values }).unwrap();
        message.success("Record was updated");
        navigate(-1);
      }
    } catch (err: any) {
      errorHandling(err);
    }
  };

  const onFinishFailed = (error: any) => {
    console.log("Received values of form: ", error);
  };

  return (
    <>
      <Form
        name="updatePerformance"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={
          createForm
            ? {
              employee_NIP: id,
              quantity: 0,
              quality: 0,
              production_target: 0,
              discipline: 0,
            }
            : {
              ...initialValues,
              date_performance: dayjs(
                initialValues?.date_performance,
                dateFormat
              ),
            }
        }
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item label="NIP" name="employee_NIP" hidden>
          <Input />
        </Form.Item>
        <Row gutter={[16, 0]}>
          <Col sm={24} md={12}>
            <Form.Item label="Quantity" required>
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Amount produced product / day
              </Text>
              <Form.Item
                name="quantity"
                hasFeedback
                rules={[{ required: true, message: "Please enter Quantity" }]}
              >
                <InputNumber style={{ width: 200 }} min={0} />
              </Form.Item>
            </Form.Item>
            <Form.Item label="Quality" required>
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Amount defect product / day
              </Text>
              <Form.Item
                name="quality"
                hasFeedback
                rules={[{ required: true, message: "Please enter Quality" }]}
              >
                <InputNumber style={{ width: 200 }} min={0} />
              </Form.Item>
            </Form.Item>
          </Col>

          <Col sm={24} md={12}>
            <Form.Item label="Discipline" required>
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Attendance status
              </Text>
              <Form.Item
                name="discipline"
                hasFeedback
                rules={[{ required: true, message: "Please enter Discipline" }]}
              >
                <Select
                  options={[
                    { value: 0, label: "Present" },
                    { value: 1, label: "Absent" },
                  ]}
                />
              </Form.Item>
            </Form.Item>
            <Form.Item label="Running Instruction">
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Description of SOP or work guideline violations
              </Text>
              <Form.Item name="running_instruction" hasFeedback>
                <Input.TextArea
                  rows={2}
                  maxLength={255}
                  placeholder="Leave blank if there is no record"
                />
              </Form.Item>
            </Form.Item>
          </Col>

          <Col sm={24} md={12}>
            <Form.Item label="Target" required>
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Production target / day
              </Text>
              <Form.Item
                name="production_target"
                hasFeedback
                rules={[{ required: true, message: "Please enter Target" }]}
              >
                <InputNumber style={{ width: 200 }} min={0} />
              </Form.Item>
            </Form.Item>
            <Form.Item label="Date" required>
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Daily performance date
              </Text>

              <Form.Item
                name="date_performance"
                hasFeedback
                rules={[{ required: true, message: "Please enter Date" }]}
              >
                <DatePicker format={dateFormat} style={{ width: 200 }} />
              </Form.Item>
            </Form.Item>
          </Col>

          <Col sm={24} md={12}>
            <Form.Item label="Responsibility">
              <Text
                type="secondary"
                style={{ margin: "-12px auto 4px", display: "block" }}
              >
                Description of employee commitment to work
              </Text>
              <Form.Item name="responsibility" hasFeedback>
                <Input.TextArea
                  rows={2}
                  maxLength={255}
                  placeholder="Leave blank if there is no record"
                />
              </Form.Item>
            </Form.Item>
            <Form.Item label="Religiousity">
              <Text
                type="secondary"
                style={{
                  margin: "-12px auto 4px",
                  display: "block",
                }}
              >
                Description of employee productivity or time optimization
              </Text>
              <Form.Item name="religiousity" hasFeedback>
                <Input.TextArea
                  rows={2}
                  maxLength={255}
                  placeholder="Leave blank if there is no record"
                />
              </Form.Item>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <FormButton
        submitName={createForm ? "Save" : "Update"}
        form={form}
        isLoading={isLoading}
      />
    </>
  );
};
