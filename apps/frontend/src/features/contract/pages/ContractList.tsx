import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Modal,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { TitlePage, ActionTable, ImportModal } from "@/components";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { apiSlice } from "@/api/apiSlice";
import { downloadFile } from "@/api/downloadFile";
import { errorHandling } from "@/utils/errorUtils";
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

export const ContractList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const canWrite = hasAccess(roles.humanResource, auth.role);

  const [search, setSearch] = useState("");
  const [contractType, setContractType] = useState<ContractType | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | undefined>();

  const { data, isSuccess } = useGetContractsQuery({
    search,
    contractType,
    page: 1,
    limit: 50,
  });
  const { data: employees } = useGetEmployeeQuery({ limit: 50 });
  const [deleteContract] = useDeleteContractMutation();

  const contracts = data?.data ?? [];
  const filters = { search, contractType };

  const handleExport = async () => {
    try {
      await downloadFile("/contracts/export", filters, "contracts.xlsx");
    } catch (error) {
      errorHandling(error);
    }
  };

  const handleTemplate = async () => {
    try {
      await downloadFile(
        "/contracts/import-template",
        undefined,
        "contracts-template.xlsx",
      );
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
        <Space>
          {canWrite && (
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleTemplate}
            >
              Template
            </Button>
          )}
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

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Employee name or number"
          allowClear
          onSearch={setSearch}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="Contract type"
          style={{ width: 180 }}
          options={TYPE_OPTIONS}
          value={contractType}
          onChange={setContractType}
        />
      </Space>

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
        templatePath="/contracts/import-template"
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
