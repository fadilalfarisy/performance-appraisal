import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Form,
  Input,
  Row,
  Col,
  DatePicker,
  Select,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useCreateEmployeeMutation,
  useGetEmployeeQuery,
  useUpdateEmployeeMutation,
} from "../employeesApi";
import dayjs, { type Dayjs } from "dayjs";
import { errorHandling } from "@/utils/errorUtils";
import { dateFormat } from "@/utils/dateUtils";
import { FormButton } from "@/components";
import { useGetPositionsQuery } from "@/features/position";
import { useMemo } from "react";
import { useGetDepartmentsQuery } from "@/features/departments";
import { genderOption } from "@/constants/option/gender";
import { employeeStatusOption } from "@/constants/option/employee-status";
import { ContractType } from "@/constants/enum/contract.enum";
import { contractTypeOption } from "@/constants/option/contract-status";
import type { EmployeeResponse } from "@appraisal/types";

type IEmployee = Partial<EmployeeResponse>;

type ContractFormValue = {
  contractType: ContractType;
  startDate: Dayjs;
  endDate?: Dayjs;
};

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

  const { data: supervisorResponse } = useGetEmployeeQuery({});

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

  const supervisorOption = useMemo(() => {
    const supervisors = supervisorResponse?.data;

    return (Array.isArray(supervisors) ? supervisors : []).map(
      (supervisor: any) => ({
        value: supervisor.id,
        label: supervisor.fullName,
      }),
    );
  }, [supervisorResponse]);

  const onFinish = async (values: any) => {
    const contractValues: ContractFormValue[] = values.contracts ?? [];
    const payload = {
      ...values,
      birthDate: dayjs(values.birthDate).format(dateFormat),
      joinDate: values.joinDate
        ? dayjs(values.joinDate).format(dateFormat)
        : null,
      contracts: createForm
        ? contractValues.map((contract) => ({
            contractType: contract.contractType,
            startDate: dayjs(contract.startDate).format(dateFormat),
            endDate:
              contract.contractType === ContractType.PERMANENT ||
              !contract.endDate
                ? null
                : dayjs(contract.endDate).format(dateFormat),
          }))
        : undefined,
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
      supervisorId: initialValues?.supervisor?.id,
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
              label="Supervisor"
              name="supervisorId"
              hasFeedback
            >
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                options={supervisorOption}
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

        {createForm && (
          <Form.List name="contracts">
            {(fields, { add, remove }) => (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Contracts</span>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ contractType: ContractType.PERMANENT })}
                  >
                    Add contract
                  </Button>
                </div>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Contract ${field.name + 1}`}
                    style={{ marginBottom: 8 }}
                    extra={
                      <Button
                        color="danger"
                        variant="solid"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    }
                  >
                    <Row gutter={[16, 0]}>
                      <Col sm={24} md={8}>
                        <Form.Item
                          label="Contract Type"
                          name={[field.name, "contractType"]}
                          rules={[{ required: true }]}
                        >
                          <Select options={contractTypeOption} />
                        </Form.Item>
                      </Col>
                      <Col sm={24} md={8}>
                        <Form.Item
                          label="Start Date"
                          name={[field.name, "startDate"]}
                          rules={[{ required: true }]}
                        >
                          <DatePicker
                            format={dateFormat}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </Col>
                      <Col sm={24} md={8}>
                        <Form.Item noStyle shouldUpdate>
                          {({ getFieldValue }) =>
                            getFieldValue([
                              "contracts",
                              field.name,
                              "contractType",
                            ]) !== ContractType.PERMANENT ? (
                              <Form.Item
                                label="End Date"
                                name={[field.name, "endDate"]}
                                rules={[{ required: true }]}
                              >
                                <DatePicker
                                  format={dateFormat}
                                  style={{ width: "100%" }}
                                />
                              </Form.Item>
                            ) : null
                          }
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </>
            )}
          </Form.List>
        )}
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
