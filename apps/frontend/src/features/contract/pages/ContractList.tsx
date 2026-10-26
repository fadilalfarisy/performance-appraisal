import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Modal,
} from "antd";
import type { Dayjs } from "dayjs";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { TitlePage, ActionTable, ImportModal } from "@/components";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { apiSlice } from "@/api/apiSlice";
import { downloadFile } from "@/api/downloadFile";
import { errorHandling } from "@/utils/errorUtils";
import { dateFormat } from "@/utils/dateUtils";
import { useGetEmployeeQuery } from "@/features/employees";
import {
  useDeleteContractMutation,
  useGetContractsQuery,
} from "../contractApi";
import { hasAccess, roles } from "@/constants/role-access";
import { contractTypeColor } from "@/constants/option/contract-status";
import { ContractType, type ContractResponse } from "@appraisal/types";

const TYPE_OPTIONS = ["PERMANENT", "FIXED_TERM", "PROBATION"].map((value) => ({
  value,
  label: value,
}));

type ContractFilters = {
  search?: string;
  contractType?: ContractType;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
};

type DateRange = [Dayjs | null, Dayjs | null] | null;

export const ContractList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const canWrite = hasAccess(roles.humanResource, auth.role);

  const [form] = Form.useForm();
  const [filters, setFilters] = useState<ContractFilters>({});
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | undefined>();

  const collectFilters = (): ContractFilters => {
    const values = form.getFieldsValue();
    const startDate: DateRange = values.startDate;
    const endDate: DateRange = values.endDate;
    return {
      search: values.search || undefined,
      contractType: values.contractType,
      startDateFrom: startDate?.[0]?.format(dateFormat),
      startDateTo: startDate?.[1]?.format(dateFormat),
      endDateFrom: endDate?.[0]?.format(dateFormat),
      endDateTo: endDate?.[1]?.format(dateFormat),
    };
  };

  const applyFilters = () => setFilters(collectFilters());

  const handleClearSearch = () => {
    form.setFieldValue("search", undefined);
    applyFilters();
  };

  const handleTypeChange = (value?: ContractType) => {
    form.setFieldValue("contractType", value);
    applyFilters();
  };

  const handleRangeChange = (
    name: "startDate" | "endDate",
    dates: DateRange,
  ) => {
    form.setFieldValue(name, dates);
    applyFilters();
  };

  const { data, isSuccess } = useGetContractsQuery({
    ...filters,
    page: 1,
    limit: 50,
  });
  const { data: employees } = useGetEmployeeQuery({ limit: 50 });
  const [deleteContract] = useDeleteContractMutation();

  const contracts = data?.data ?? [];

  const handleExport = async () => {
    try {
      await downloadFile("/contracts/export", filters, "contracts.xlsx");
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<ContractResponse> = [
    {
      title: "Employee No",
      width: "1%",
      render: (_, record) => record.employee?.employeeNumber ?? "-",
    },
    {
      title: "Employee",
      width: "2%",
      render: (_, record) => record.employee?.fullName ?? record.employeeId,
    },
    {
      title: "Type",
      dataIndex: "contractType",
      width: "1%",
      render: (value) => (
        <Tag color={contractTypeColor[value] ?? "default"}>{value}</Tag>
      ),
    },
    { title: "Start", dataIndex: "startDate", width: "1%" },
    { title: "End", dataIndex: "endDate", width: "1%", render: (v) => v || "-" },
    {
      title: "Action",
      width: "1%",
      fixed: "right",
      render: (_, record) =>
        canWrite ? (
          <ActionTable
            id={record.id}
            deleteFunction={deleteContract}
            linkViewButton={`/dashboard/employee/${record.employeeId}?tab=contracts`}
            linkEditButton={`/dashboard/employee/contract/update/${record.employeeId}/${record.id}`}
          />
        ) : (
          <ActionTable
            id={record.id}
            linkViewButton={`/dashboard/employee/${record.employeeId}?tab=contracts`}
            isEditButton={false}
            isDeleteButton={false}
          />
        ),
    },
  ];

  if (!isSuccess) return null;

  return (
    <>
      <TitlePage title="Contracts" description="Employee contracts">
        <Space wrap>
          {canWrite && (
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
              Import
            </Button>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export
          </Button>
          {canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Create contract
            </Button>
          )}
        </Space>
      </TitlePage>

      <Form form={form}>
        <Space
          direction="vertical"
          size="middle"
          style={{ marginBottom: 16, width: "100%" }}
        >
          <Space wrap>
            <Space size="small" align="center">
              <span>Start Contract</span>
              <Form.Item name="startDate" style={{ marginBottom: 0 }}>
                <DatePicker.RangePicker
                  format={dateFormat}
                  placeholder={["Start from", "Start to"]}
                  onChange={(dates) =>
                    handleRangeChange("startDate", dates as DateRange)
                  }
                  style={{ width: 240 }}
                />
              </Form.Item>
            </Space>
            <Space size="small" align="center">
              <span>End Contract</span>
              <Form.Item name="endDate" style={{ marginBottom: 0 }}>
                <DatePicker.RangePicker
                  format={dateFormat}
                  placeholder={["End from", "End to"]}
                  onChange={(dates) =>
                    handleRangeChange("endDate", dates as DateRange)
                  }
                  style={{ width: 240 }}
                />
              </Form.Item>
            </Space>
          </Space>
          <Space wrap>
            <Form.Item name="search" style={{ marginBottom: 0 }}>
              <Input.Search
                placeholder="Search by employee name or number"
                allowClear
                onSearch={applyFilters}
                onClear={handleClearSearch}
                style={{ width: "clamp(200px, 32vw, 480px)" }}
                enterButton
              />
            </Form.Item>
            <Form.Item name="contractType" style={{ marginBottom: 0 }}>
              <Select
                allowClear
                placeholder="Contract type"
                style={{ width: 180 }}
                options={TYPE_OPTIONS}
                onChange={handleTypeChange}
              />
            </Form.Item>
          </Space>
        </Space>
      </Form>

      <Table<ContractResponse>
        columns={columns}
        dataSource={contracts}
        rowKey="id"
        scroll={{ x: "max-content" }}
        pagination={false}
      />

      <ImportModal
        open={importOpen}
        title="Import contracts"
        uploadEndpoint="/contracts/import"
        onClose={() => setImportOpen(false)}
        onSuccess={() => dispatch(apiSlice.util.invalidateTags(["Contracts"]))}
      />

      <Modal
        title="Create contract"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => {
          if (employeeId) {
            navigate(`/dashboard/employee/contract/create/${employeeId}`);
          }
        }}
        okButtonProps={{ disabled: !employeeId }}
        okText="Continue"
      >
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Select employee"
          style={{ width: "100%" }}
          value={employeeId}
          onChange={setEmployeeId}
          options={(employees?.data ?? []).map((employee) => ({
            value: employee.id,
            label: `${employee.employeeNumber} — ${employee.fullName}`,
          }))}
        />
      </Modal>
    </>
  );
};
