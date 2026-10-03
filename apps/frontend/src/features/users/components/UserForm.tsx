import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Select, message, Result } from "antd";
import { useCreateUserMutation, useUpdateUserMutation } from "../usersApi";
import { errorHandling } from "@/utils/errorUtils";
import { FormButton } from "@/components";
import { useGetEmployeeQuery } from "@/features/employees";
import { useGetDepartmentsQuery } from "@/features/departments";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "HR", label: "Human Resource" },
  { value: "HEAD_DEPARTMENT", label: "Head Department" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "MANAGER", label: "Manager" },
  { value: "GENERAL_MANAGER", label: "General Manager" },
];

const DEPARTMENT_SCOPED_ROLES = ["HEAD_DEPARTMENT", "SUPERVISOR", "MANAGER"];

type UserInitialValues = {
  username?: string;
  fullName?: string;
  password?: string;
  role?: string | null;
  employeeId?: string;
  employee?: {
    id?: string;
    fullName?: string;
  } | null;
  departments?: { id: string; name: string }[];
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
  const { data: departmentsResponse } = useGetDepartmentsQuery();

  const roleValue = Form.useWatch("role", form);

  const employeeOptions = useMemo(() => {
    const employees = employeesResponse?.data;
    return (Array.isArray(employees) ? employees : []).map((employee: any) => ({
      value: employee.id,
      label: employee.fullName,
    }));
  }, [employeesResponse]);

  const departmentOptions = useMemo(() => {
    const departments = departmentsResponse?.data;
    return (Array.isArray(departments) ? departments : []).map((d: any) => ({
      value: d.id,
      label: d.name,
    }));
  }, [departmentsResponse]);

  const formInitialValues = createForm
    ? {}
    : {
        username: initialValues?.username,
        fullName: initialValues?.fullName,
        role: initialValues?.role ?? undefined,
        employeeId: initialValues?.employee?.id ?? undefined,
        departmentIds: initialValues?.departments?.map((d) => d.id) ?? [],
        password: "",
      };

  const onFinish = async (values: any) => {
    const body = {
      username: values.username,
      fullName: values.fullName,
      role: values.role,
      employeeId: values.employeeId ?? null,
      departmentIds: values.departmentIds ?? [],
      ...(values.password ? { password: values.password } : {}),
    };

    try {
      if (createForm) {
        await queryUser(body).unwrap();
        message.success("Record was created");
        form.resetFields();
      } else {
        await queryUser({ id, body }).unwrap();
        message.success("Record was updated");
        navigate(-1);
      }
    } catch (err: any) {
      errorHandling(err);
    }
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
        onFinishFailed={(error) => console.log(error)}
        form={form}
        initialValues={formInitialValues}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Username"
          name="username"
          hasFeedback
          rules={[{ required: true, min: 3, max: 255, whitespace: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Full Name"
          name="fullName"
          hasFeedback
          rules={[{ required: true, min: 3, max: 255, whitespace: true }]}
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

        {DEPARTMENT_SCOPED_ROLES.includes(roleValue) && (
          <Form.Item label="Departments" name="departmentIds">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              options={departmentOptions}
              placeholder="Select departments"
            />
          </Form.Item>
        )}

        <Form.Item label="Employee" name="employeeId">
          <Select
            showSearch
            allowClear
            optionFilterProp="label"
            options={employeeOptions}
            loading={!isEmployeeSuccess}
            placeholder="Optional linked employee"
          />
        </Form.Item>

        {createForm ? (
          <Form.Item
            label="Password"
            name="password"
            hasFeedback
            rules={[{ required: true, min: 6, max: 255, whitespace: true }]}
          >
            <Input.Password />
          </Form.Item>
        ) : (
          <Form.Item
            label="New Password"
            name="password"
            rules={[{ min: 6, max: 255, whitespace: true }]}
            tooltip="Fill the field to replace the password"
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
