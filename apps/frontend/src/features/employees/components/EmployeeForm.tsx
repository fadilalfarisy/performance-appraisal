import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Row, Col, DatePicker, Select, message } from "antd";
import {
  useCreateEmployeeMutation,
  useGetEmployeeQuery,
  useUpdateEmployeeMutation,
} from "../employeesApi";
import dayjs from "dayjs";
import { errorHandling } from "@/utils/errorUtils";
import { dateFormat } from "@/utils/dateUtils";
import { FormButton } from "@/components";
import { useGetPositionsQuery } from "@/features/position";
import { useMemo } from "react";
import { useGetDepartmentsQuery } from "@/features/departments";
import { genderOption } from "@/constants/option/gender";
import { employeeStatusOption } from "@/constants/option/employee-status";
import type { EmployeeResponse } from "@appraisal/types";

type IEmployee = Partial<EmployeeResponse>;

type Props = {
  createForm: boolean;
  formFunction:
    | typeof useCreateEmployeeMutation
    | typeof useUpdateEmployeeMutation;
  initialValues?: IEmployee;
};

export const EmployeeForm = ({
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

  const { data: positionsResponse } = useGetPositionsQuery();

  const { data: departmentsResponse } = useGetDepartmentsQuery();

  const { data: superiorResponse } = useGetEmployeeQuery({});

  const positionOption = useMemo(() => {
    const positions = positionsResponse?.data;

    return (Array.isArray(positions) ? positions : []).map((position: any) => ({
      value: position.id,
      label: position.name,
    }));
  }, [positionsResponse]);

  const departmentOption = useMemo(() => {
    const departments = departmentsResponse?.data;

    return (Array.isArray(departments) ? departments : []).map(
      (department: any) => ({
        value: department.id,
        label: department.name,
      }),
    );
  }, [departmentsResponse]);

  const superiorOption = useMemo(() => {
    const superiors = superiorResponse?.data;

    return (Array.isArray(superiors) ? superiors : []).map(
      (superior: any) => ({
        value: superior.id,
        label: superior.fullName,
      }),
    );
  }, [superiorResponse]);

  const onFinish = async (values: any) => {
    const payload = {
      ...values,
      birthDate: dayjs(values.birthDate).format(dateFormat),
      joinDate: values.joinDate
        ? dayjs(values.joinDate).format(dateFormat)
        : null,
    };
    console.log(payload);
    try {
      if (createForm) {
        await queryUser(payload).unwrap();
        message.success("Record was created");
        form.resetFields();
      }
      if (!createForm) {
        await queryUser({ id, body: payload }).unwrap();
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

  const initialFormValues = useMemo(() => {
    if (createForm) {
      return {};
    }

    return {
      employeeNumber: initialValues?.employeeNumber,
      fullName: initialValues?.fullName,
      gender: initialValues?.gender,
      birthDate: initialValues?.birthDate
        ? dayjs(initialValues.birthDate, dateFormat)
        : null,
      joinDate: initialValues?.joinDate
        ? dayjs(initialValues.joinDate, dateFormat)
        : null,
      departmentId: initialValues?.department?.id,
      positionId: initialValues?.position?.id,
      superiorId: initialValues?.superior?.id,
      address: initialValues?.address,
      status: initialValues?.status,
    };
  }, [createForm, initialValues]);

  return (
    <>
      <Form
        name={createForm ? "Create Employee" : "Update Employee"}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={initialFormValues}
        layout="vertical"
        autoComplete="off"
      >
        <Row gutter={[16, 0]}>
          <Col sm={24} md={12}>
            <Form.Item
              label="Employee Number"
              name="employeeNumber"
              hasFeedback
              rules={[
                { required: true, whitespace: true },
                { max: 50, message: "Employee number is too long" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Full Name"
              name="fullName"
              hasFeedback
              rules={[{ required: true, min: 3, max: 60, whitespace: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Gender"
              name="gender"
              hasFeedback
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={genderOption}
              />
            </Form.Item>

            <Form.Item
              label="Birth Date"
              name="birthDate"
              hasFeedback
              rules={[{ required: true }]}
            >
              <DatePicker format={dateFormat} placeholder="Birth Date" />
            </Form.Item>

            <Form.Item
              label="Join Date"
              name="joinDate"
              hasFeedback
              rules={[{ required: true }]}
            >
              <DatePicker format={dateFormat} placeholder="Join Date" />
            </Form.Item>
          </Col>

          <Col sm={24} md={12}>
            <Form.Item
              label="Department"
              name="departmentId"
              hasFeedback
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={departmentOption}
              />
            </Form.Item>
            <Form.Item
              label="Position"
              name="positionId"
              hasFeedback
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={positionOption}
              />
            </Form.Item>
            <Form.Item
              label="Superior"
              name="superiorId"
              hasFeedback
            >
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                options={superiorOption}
              />
            </Form.Item>
            <Form.Item
              label="Status"
              name="status"
              hasFeedback
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={employeeStatusOption}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="Address"
          name="address"
          hasFeedback
          rules={[{ required: true, min: 5, max: 255 }]}
        >
          <Input.TextArea />
        </Form.Item>
      </Form>

      <div style={{ marginTop: "24px" }}>
        <FormButton
          submitName={createForm ? "Save" : "Update"}
          form={form}
          isLoading={isLoading}
        />
      </div>
    </>
  );
};
