import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Table, Tag, Select, Space, Tabs, message, Popconfirm } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined, ThunderboltOutlined, EyeOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { useGetDepartmentsQuery } from "@/features/departments";
import {
  useDeleteAppraisalMutation,
  useGetAppraisalsQuery,
  useRunSchedulerMutation,
} from "@/features/appraisals/appraisalsApi";
import { errorHandling } from "@/utils/errorUtils";
import { AppraisalStatus, UserRole, type AppraisalResponse } from "@appraisal/types";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING: "gold",
  SUBMITTED: "blue",
  APPROVED: "cyan",
  COMPLETE: "green",
};

const NEEDS_ACTION: Record<string, AppraisalStatus> = {
  [UserRole.HR]: AppraisalStatus.DRAFT,
  [UserRole.HEAD_DEPARTMENT]: AppraisalStatus.PENDING,
  [UserRole.MANAGER]: AppraisalStatus.SUBMITTED,
  [UserRole.GENERAL_MANAGER]: AppraisalStatus.APPROVED,
  [UserRole.ADMIN]: AppraisalStatus.COMPLETE,
};

export const Appraisal = () => {
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const isAdmin = auth.role === UserRole.ADMIN;
  const isHr = auth.role === UserRole.HR;

  const [status, setStatus] = useState<AppraisalStatus | undefined>();
  const [department, setDepartment] = useState<string | undefined>();
  const [needsAction, setNeedsAction] = useState(false);

  const { data, isSuccess } = useGetAppraisalsQuery({
    status: needsAction ? NEEDS_ACTION[auth.role] : status,
    department,
    page: 1,
    limit: 50,
  });
  const { data: departments } = useGetDepartmentsQuery();
  const [deleteAppraisal] = useDeleteAppraisalMutation();
  const [runScheduler, { isLoading: isRunning }] = useRunSchedulerMutation();

  const appraisals = data?.data ?? [];

  const handleRunScheduler = async () => {
    try {
      const result = await runScheduler({}).unwrap();
      message.success(
        `Scheduler done: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`,
      );
    } catch (error) {
      errorHandling(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppraisal(id).unwrap();
      message.success("Appraisal cancelled");
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<AppraisalResponse> = [
    { title: "Department", dataIndex: "departmentName", render: (v) => v || "-" },
    { title: "Period", dataIndex: "period" },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => <Tag color={STATUS_COLOR[value] ?? "default"}>{value}</Tag>,
    },
    { title: "Employees", width: "1%", render: (_, record) => record.employees?.length ?? "-" },
    { title: "Source", dataIndex: "source", width: "1%" },
    {
      title: "Action",
      width: "1%",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/appraisals/${record.id}`)}
          >
            Open
          </Button>
          {isHr && record.status === AppraisalStatus.DRAFT && (
            <Popconfirm
              title="Cancel this DRAFT appraisal?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" danger>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!isSuccess) return null;

  return (
    <>
      <TitlePage title="Appraisals" description="Performance appraisal periods">
        <Space>
          {isAdmin && (
            <Button
              icon={<ThunderboltOutlined />}
              loading={isRunning}
              onClick={handleRunScheduler}
            >
              Run scheduler now
            </Button>
          )}
          {isHr && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/dashboard/appraisals/new")}
            >
              Create appraisal
            </Button>
          )}
        </Space>
      </TitlePage>

      <Tabs
        activeKey={needsAction ? "mine" : "all"}
        onChange={(key) => setNeedsAction(key === "mine")}
        items={[
          { key: "all", label: "All" },
          {
            key: "mine",
            label: `Needs my action${
              NEEDS_ACTION[auth.role] ? ` (${NEEDS_ACTION[auth.role]})` : ""
            }`,
          },
        ]}
      />

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          disabled={needsAction}
          options={Object.values(AppraisalStatus).map((s) => ({
            value: s,
            label: s,
          }))}
        />
        <Select
          allowClear
          placeholder="Department"
          style={{ width: 220 }}
          value={department}
          onChange={setDepartment}
          options={(departments?.data ?? []).map((d) => ({
            value: d.id,
            label: d.name,
          }))}
        />
      </Space>

      <Table<AppraisalResponse>
        columns={columns}
        dataSource={appraisals}
        rowKey="id"
        scroll={{ x: "max-content" }}
        pagination={false}
      />
    </>
  );
};
