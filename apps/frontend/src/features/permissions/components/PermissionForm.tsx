import { Form, Input, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
} from "../permissionsApi";
import { FormButton } from "@/components";
import { errorHandling } from "@/utils/errorUtils";

type Props = {
  createForm: boolean;
  formFunction:
    | typeof useCreatePermissionMutation
    | typeof useUpdatePermissionMutation;
  initialValues?: {
    name?: string;
    description?: string;
  };
};

export const PermissionForm = ({
  createForm,
  formFunction,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const [queryPermission, { isLoading }] = formFunction();

  const onFinish = async (values: any) => {
    const body = {
      name: values.name,
      description: values.description,
    };

    try {
      if (createForm) {
        await queryPermission(body).unwrap();
        message.success("Record was created");
        form.resetFields();
      } else {
        await queryPermission({ id, body }).unwrap();
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
        name={createForm ? "Create Permission" : "Update Permission"}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={createForm ? {} : { ...initialValues }}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Name"
          name="name"
          hasFeedback
          rules={[{ required: true, whitespace: true }]}
        >
          <Input placeholder="Create User" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          hasFeedback
          rules={[{ required: true, whitespace: true }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="This permission is for creating users"
          />
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
