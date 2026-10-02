import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, message } from "antd";
import { useCreatePositionMutation, useUpdatePositionMutation } from "../positionsApi";
import { errorHandling } from "@/utils/errorUtils";
import { FormButton } from "@/components";

type Props = {
  createForm: boolean;
  formFunction: typeof useCreatePositionMutation | typeof useUpdatePositionMutation;
  initialValues?: Object;
};

export const PositionForm = ({
  createForm,
  formFunction,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const [queryUser, { isLoading }] = (
    formFunction as unknown as () => [
      (arg: unknown) => { unwrap: () => Promise<unknown> },
      { isLoading: boolean },
    ]
  )();

  const onFinish = async (values: any) => {
    try {
      if (createForm) {
        await queryUser(values).unwrap();
        message.success("Record was created");
        form.resetFields();
      }
      if (!createForm) {
        await queryUser({ id, body: values }).unwrap();
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
        name={createForm ? "Create Position" : "Update Position"}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={createForm ? {} : { ...initialValues }}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Position"
          name="name"
          hasFeedback
          rules={[{ required: true, max: 20, whitespace: true }]}
        >
          <Input />
        </Form.Item>
      </Form>

      <FormButton
        submitName={createForm ? "Save" : "Update"}
        form={form}
        isLoading={isLoading}
      />
    </>
  );
};
