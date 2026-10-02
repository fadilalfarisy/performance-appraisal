import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Form, Input, InputNumber, Select, message } from "antd";
import { useCreateCriteriaMutation, useCreateCriteriaVersionMutation } from "../criteriaApi";
import { errorHandling } from "@/utils/errorUtils";
import { FormButton } from "@/components";
import { option } from "@/constants/optionType";

type Props = {
  createForm: boolean;
  formFunction: typeof useCreateCriteriaMutation | typeof useCreateCriteriaVersionMutation;
  initialValues?: any;
};

export const CriteriaForm = ({
  createForm,
  formFunction,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const [queryCriteria, { isLoading }] = (
    formFunction as unknown as () => [
      (arg: unknown) => { unwrap: () => Promise<unknown> },
      { isLoading: boolean },
    ]
  )();

  useEffect(() => {
    if (!createForm && initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [createForm, form, initialValues]);

  const onFinish = async (values: any) => {
    try {
      if (createForm) {
        await queryCriteria(values).unwrap();
        message.success("Record was created");
        form.resetFields();
      } else {
        await queryCriteria({ id, body: values }).unwrap();
        message.success("New version was created");
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
        name={createForm ? "Create Criteria" : "Create New Version"}
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
          <Input variant="outlined" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          hasFeedback
          rules={[{ required: true, whitespace: true }]}
        >
          <Input variant="outlined" />
        </Form.Item>

        <Form.Item
          label="Type"
          name="type"
          hasFeedback
          rules={[{ required: true }]}
        >
          <Select
            options={option.criteriaType}
            variant="outlined"
            style={{ color: "black" }}
          />
        </Form.Item>

        <Form.Item
          label="Weight"
          name="weight"
          hasFeedback
          rules={[{ required: true }]}
        >
          <InputNumber<number>
            min={0}
            max={100}
            formatter={(value) => `${value}%`}
            parser={(value) => value?.replace("%", "") as unknown as number}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>

      <FormButton
        submitName={createForm ? "Save" : "Create Version"}
        form={form}
        isLoading={isLoading}
      />
    </>
  );
};
