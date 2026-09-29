import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  Row,
  Col,
  DatePicker,
  Select,
  Table,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useCreateEmployeeMutation,
  useGetEmployeeQuery,
  useUpdateEmployeeMutation,
} from "../employeesApi";
import dayjs from "dayjs";
import { errorHandling } from "@/utils/errorUtils";
import { dateFormat } from "@/utils/dateUtils";
import { FormButton } from "@/components";
import { Contract } from "@/features/employees";
import { useGetPositionsQuery } from "@/features/position";
import { useMemo } from "react";
import { useGetDepartmentsQuery } from "@/features/departments";
import { genderOption } from "@/constants/option/gender";
import { employeeStatusOption } from "@/constants/option/employee-status";
import { contractStatusOption } from "@/constants/option/contract-status";
import { ContractStatus } from "@/constants/enum/contract.enum";
import { EmployeeStatus } from "@/constants/enum/employee.enum";
import { GenderEnum } from "@/constants/enum/gender.enum";

type IEmployee = {
  NIP: string;
  id?: string;
  fullName?: string;
  gender?: GenderEnum;
  birthDate?: string;
  department?: {
    id: string;
    name: string;
  };
  position?: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    name: string;
  } | null;
  status?: EmployeeStatus;
  address?: string;
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

  const [queryUser, { isLoading }] = formFunction();

  const { data: positionsResponse } = useGetPositionsQuery({});

  const { data: departmentsResponse } = useGetDepartmentsQuery({});

  const { data: managerResponse } = useGetEmployeeQuery({});

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

  const managerOption = useMemo(() => {
    const managers = managerResponse?.data;

    return (Array.isArray(managers) ? managers : []).map((manager: any) => ({
      value: manager.id,
      label: manager.fullName,
    }));
  }, [managerResponse]);

  const onFinish = async (values: any) => {
    const payload = {
      ...values,
      birthDate: dayjs(values.birthDate).format(dateFormat),
      contracts: values.contracts?.map((c: any) => {
        const status = c.status || ContractStatus.CONTRACT;

        if (status === ContractStatus.PERMANENT) {
          return {
            status,
            startDate: c.startDate
              ? dayjs(c.startDate).format(dateFormat)
              : null,
          };
        }

        return {
          status,
          startDate: c.startDate ? dayjs(c.startDate).format(dateFormat) : null,
          endDate: c.endDate ? dayjs(c.endDate).format(dateFormat) : null,
        };
      }),
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
      return { contracts: [{ status: ContractStatus.CONTRACT }] };
    }

    return {
      NIP: initialValues?.NIP,
      fullName: initialValues?.fullName,
      gender: initialValues?.gender,
      birthDate: initialValues?.birthDate
        ? dayjs(initialValues.birthDate, dateFormat)
        : null,
      departmentId: initialValues?.department?.id,
      positionId: initialValues?.position?.id,
      managerId: initialValues?.manager?.id,
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
              label="NIP"
              name="NIP"
              hasFeedback
              rules={[
                {
                  required: true,
                  whitespace: true,
                },
                { min: 6, max: 6, message: "NIP must be 6 characters long" },
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
              label="Manager"
              name="managerId"
              hasFeedback
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={managerOption}
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
                <Button
                  style={{ marginBottom: "24px", marginTop: "12px" }}
                  color="default"
                  variant="dashed"
                  onClick={() => add({ status: ContractStatus.CONTRACT })}
                  icon={<PlusOutlined />}
                >
                  Add Contract
                </Button>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={fields.map((field) => ({
                    ...field,
                    key: field.key,
                  }))}
                  rowKey="key"
                  columns={[
                    {
                      title: "Status",
                      dataIndex: "status",
                      // width: 180,
                      render: (_value, record: any) => (
                        <Form.Item
                          name={[record.name, "status"]}
                          rules={[
                            { required: true, message: "Please select status" },
                          ]}
                        >
                          <Select
                            placeholder="Select status"
                            options={contractStatusOption}
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: "Contract Duration",
                      dataIndex: "duration",
                      render: (_value, record: any) => (
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const status = form.getFieldValue([
                              "contracts",
                              record.name,
                              "status",
                            ]);

                            return status === ContractStatus.PERMANENT ? (
                              <Form.Item
                                name={[record.name, "startDate"]}
                                rules={[
                                  {
                                    required: true,
                                    message: "Please select start date",
                                  },
                                ]}
                              >
                                <DatePicker
                                  format={dateFormat}
                                  placeholder="Start Date"
                                />
                              </Form.Item>
                            ) : (
                              <div style={{ display: "flex", gap: 8 }}>
                                <Form.Item
                                  name={[record.name, "startDate"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: "Please select start date",
                                    },
                                  ]}
                                >
                                  <DatePicker
                                    format={dateFormat}
                                    placeholder="Start Date"
                                  />
                                </Form.Item>
                                <Form.Item
                                  name={[record.name, "endDate"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: "Please select end date",
                                    },
                                  ]}
                                >
                                  <DatePicker
                                    format={dateFormat}
                                    placeholder="End Date"
                                  />
                                </Form.Item>
                              </div>
                            );
                          }}
                        </Form.Item>
                      ),
                    },
                    {
                      title: "Action",
                      width: 80,
                      render: (_value, record: any, index) =>
                        index != 0 && (
                          <Button
                            color="danger"
                            variant="solid"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(record.name)}
                          ></Button>
                        ),
                    },
                  ]}
                />
              </>
            )}
          </Form.List>
        )}
      </Form>

      {!createForm && (
        <div style={{ marginBottom: 18 }}>
          <Contract />
        </div>
      )}

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
