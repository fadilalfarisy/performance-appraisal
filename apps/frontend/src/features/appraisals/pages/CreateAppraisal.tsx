import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Result,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { TitlePage } from "@/components";
import { useGetDepartmentsQuery } from "@/features/departments";
import {
  useCreateAppraisalMutation,
  usePreviewAppraisalMutation,
} from "@/features/appraisals/appraisalsApi";
import { errorHandling } from "@/utils/errorUtils";
import type {
  EligibleEmployeeResponse,
  PreviewAppraisalResponse,
} from "@appraisal/types";

export const CreateAppraisal = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data: departments } = useGetDepartmentsQuery();
  const [preview, { isLoading: isPreviewing }] = usePreviewAppraisalMutation();
  const [createAppraisal, { isLoading: isCreating }] =
    useCreateAppraisalMutation();

  const [previewData, setPreviewData] = useState<PreviewAppraisalResponse | null>(
    null,
  );
  const [selected, setSelected] = useState<string[]>([]);

  const handlePreview = async () => {
    const values = await form.validateFields();
    try {
      const period = dayjs(values.period).startOf("month").format("YYYY-MM-01");
      const { data } = await preview({
        departmentId: values.departmentId,
        period,
      }).unwrap();
      setPreviewData(data);
      setSelected(data.employees.map((employee) => employee.id));
    } catch (error) {
      errorHandling(error);
    }
  };

  const handleCreate = async () => {
    const values = form.getFieldsValue();
    try {
      const period = dayjs(values.period).startOf("month").format("YYYY-MM-01");
      const { data } = await createAppraisal({
        departmentId: values.departmentId,
        period,
        employeeIds: selected,
      }).unwrap();
      message.success("Appraisal created");
      navigate(`/dashboard/appraisals/${data.id}`);
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<EligibleEmployeeResponse> = [
    { title: "Employee No", dataIndex: "employeeNumber" },
    { title: "Name", dataIndex: "fullName" },
    { title: "Position", dataIndex: "positionName", render: (v) => v || "-" },
    { title: "Contract type", dataIndex: "contractType", render: (v) => v || "-" },
    {
      title: "Contract ends",
      dataIndex: "contractEndDate",
      render: (v) => v || "-",
    },
  ];

  return (
    <>
      <TitlePage
        title="Create Appraisal"
        description="Pick a department and month"
      >
        <Button
          onClick={() => navigate("/dashboard/appraisals")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>
      <Form form={form} layout="vertical" style={{ maxWidth: 520 }}>
        <Form.Item
          label="Department"
          name="departmentId"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Select department"
            options={(departments?.data ?? []).map((d) => ({
              value: d.id,
              label: d.name,
            }))}
          />
        </Form.Item>
        <Form.Item label="Month" name="period" rules={[{ required: true }]}>
          <DatePicker picker="month" style={{ width: "100%" }} />
        </Form.Item>
        <Button
          type="primary"
          onClick={handlePreview}
          loading={isPreviewing}
          disabled={Boolean(previewData)}
        >
          Preview eligible employees
        </Button>
      </Form>

      {previewData && previewData.employees.length === 0 && (
        <Result
          status="warning"
          title="No eligible employees"
          subTitle="No employee in this department has a contract ending in that month."
        />
      )}

      {previewData && previewData.employees.length > 0 && (
        <>
          <Table<EligibleEmployeeResponse>
            rowKey="id"
            columns={columns}
            dataSource={previewData.employees}
            pagination={false}
            style={{ marginTop: 16 }}
            scroll={{ x: "max-content" }}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => setSelected(keys as string[]),
            }}
          />
          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              loading={isCreating}
              disabled={selected.length === 0}
              onClick={handleCreate}
            >
              Create appraisal ({selected.length})
            </Button>
          </Space>
        </>
      )}
    </>
  );
};
