import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Select, message, Result } from "antd";
import { useCreateUserMutation, useUpdateUserMutation } from "../usersApi";
import { errorHandling } from "@/utils/errorUtils";
import { FormButton } from "@/components";
import { useGetEmployeeQuery } from "@/features/employees";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "HR", label: "Human Resource" },
  { value: "HEAD_DEPARTMENT", label: "Head Department" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "MANAGER", label: "Manager" },
  { value: "GENERAL_MANAGER", label: "General Manager" },
];

type UserInitialValues = {
  username?: string;
  password?: string;
  role?: string | null;
  employeeId?: string;
  employee?: {
    id?: string;
    fullName?: string;
    full_name?: string;
  } | null;
};

type Props = {
  createForm: boolean;
  formFunction: typeof useCreateUserMutation | typeof useUpdateUserMutation;
  initialValues?: UserInitialValues;
};

export const UserForm = ({
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
  const {
    data: employeesResponse,
    isError: isEmployeeError,
    isSuccess: isEmployeeSuccess,
  } = useGetEmployeeQuery({});

  const employeeOptions = useMemo(() => {
    const employees = employeesResponse?.data;

    return (Array.isArray(employees) ? employees : []).map((employee: any) => ({
      value: employee.id,
      label: employee.fullName,
    }));
  }, [employeesResponse]);

  const formInitialValues = createForm
    ? {}
    : {
        username: initialValues?.username,
        role: initialValues?.role ?? undefined,
        employeeId: initialValues?.employee
          ? {
              value: initialValues.employee?.id,
              label: initialValues.employee?.fullName,
            }
          : {},
        password: "",
      };

  const onFinish = async (values: any) => {
    const body = {
      username: values.username,
      role: values.role?.value ?? values.role,
      employeeId: values.employeeId?.value ?? values.employeeId,
      ...(values.password ? { password: values.password } : {}),
    };

    try {
      if (createForm) {
        await queryUser(body).unwrap();
        message.success("Record was created");
        form.resetFields();
      }
      if (!createForm) {
        await queryUser({ id, body }).unwrap();
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

  if (isEmployeeError) {
    return (
      <Result
        status="error"
        title="Something Error"
        subTitle="Employee data could not be loaded."
      />
    );
  }

  return (
    <>
      <Form
        name={createForm ? "Create User" : "Update User"}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={formInitialValues}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Username"
          name="username"
          hasFeedback
          rules={[{ required: true, min: 7, max: 20, whitespace: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Role"
          name="role"
          hasFeedback
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={ROLE_OPTIONS}
            placeholder="Select role"
          />
        </Form.Item>
        <Form.Item
          label="Employee"
          name="employeeId"
          hasFeedback
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={employeeOptions}
            loading={!isEmployeeSuccess}
            placeholder="Select employee"
          />
        </Form.Item>

        {createForm ? (
          <Form.Item
            label="Password"
            name="password"
            hasFeedback
            rules={[{ required: true, min: 7, max: 255, whitespace: true }]}
          >
            <Input.Password />
          </Form.Item>
        ) : (
          <Form.Item
            label="New Password"
            name="password"
            rules={[{ min: 7, max: 255, whitespace: true }]}
            tooltip="Fill the field to replace password"
          >
            <Input.Password placeholder="Reset password" />
          </Form.Item>
        )}
      </Form>

      <FormButton
        submitName={createForm ? "Save" : "Update"}
        form={form}
        isLoading={isLoading}
      />
    </>
  );
};
