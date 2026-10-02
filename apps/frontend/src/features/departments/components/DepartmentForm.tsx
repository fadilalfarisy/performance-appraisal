import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, message } from "antd";
import { useCreateDepartmentMutation, useUpdateDepartmentMutation } from "../departmentsApi";
import { errorHandling } from "@/utils/errorUtils";
import { FormButton } from "@/components";

type Props = {
  createForm: boolean;
  formFunction: typeof useCreateDepartmentMutation | typeof useUpdateDepartmentMutation;
  initialValues?: Object;
};

export const DepartmentForm = ({
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
    console.log(values)
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
        name={createForm ? "Create Department" : "Update Department"}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={createForm ? {} : { ...initialValues }}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Department"
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
