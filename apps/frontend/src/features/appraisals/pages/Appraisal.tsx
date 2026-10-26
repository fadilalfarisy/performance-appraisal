import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  APPRAISAL_STATUS_COLOR,
  APPRAISAL_STATUS_ORDER,
  resolveStatusTab,
} from "@/features/appraisals/appraisalStatus";
import { errorHandling } from "@/utils/errorUtils";
import { AppraisalStatus, UserRole, type AppraisalResponse } from "@appraisal/types";

export const Appraisal = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useAppSelector((state) => state.auth);
  const isAdmin = auth.role === UserRole.ADMIN;
  const isHr = auth.role === UserRole.HR;
  const canManageAppraisals = isHr || isAdmin;

  const activeTab = resolveStatusTab(searchParams.get("tab"), auth.role);
  const [department, setDepartment] = useState<string | undefined>();

  const { data, isSuccess } = useGetAppraisalsQuery({
    status: activeTab,
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
      render: (value) => (
        <Tag color={APPRAISAL_STATUS_COLOR[value] ?? "default"}>{value}</Tag>
      ),
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
          {canManageAppraisals && record.status === AppraisalStatus.DRAFT && (
            <Popconfirm
              title="Cancel this DRAFT appraisal?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" color="danger" variant="solid">
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
          {canManageAppraisals && (
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
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key }, { replace: true })}
        items={APPRAISAL_STATUS_ORDER.map((s) => ({ key: s, label: s }))}
      />

      <Space style={{ marginBottom: 16 }}>
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
