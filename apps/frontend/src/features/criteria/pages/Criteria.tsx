import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined, HistoryOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import {
  Button,
  Table,
  Tag,
  Space,
  Tooltip,
  message,
  Modal,
  Select,
} from "antd";
import { TitlePage } from "@/components";
import { hasAccess, roles } from "@/constants/role-access";
import { useAppSelector } from "@/app/hooks";
import { useGetDepartmentsQuery } from "@/features/departments";
import {
  useCreateCriteriaSetMutation,
  useGetCriteriaSetsQuery,
} from "@/features/criteria/criteriaApi";
import { errorHandling } from "@/utils/errorUtils";
import type { CriteriaSetResponse } from "@appraisal/types";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  ARCHIVED: "orange",
};

export const Criteria = () => {
  const auth = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const { data, isSuccess } = useGetCriteriaSetsQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [createCriteriaSet, { isLoading: isCreating }] =
    useCreateCriteriaSetMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | undefined>();

  const canManage = hasAccess(roles.humanResource, auth.role);
  const sets = data?.data ?? [];

  const handleCreate = async () => {
    try {
      const { data: created } = await createCriteriaSet({
        departmentId,
      }).unwrap();
      message.success("Draft criteria set created");
      setCreateOpen(false);
      setDepartmentId(undefined);
      navigate(`/dashboard/criteria/${created.id}`);
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<CriteriaSetResponse> = [
    {
      title: "Department",
      dataIndex: "departmentName",
      render: (value) => value || "Global",
    },
    {
      title: "Version",
      dataIndex: "version",
      width: "1%",
      render: (value) => `v${value}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: "1%",
      render: (value) => (
        <Tag color={STATUS_COLOR[value] ?? "default"}>{value}</Tag>
      ),
    },
    {
      title: "Criteria",
      width: "1%",
      render: (_, record) => record.criteria.length,
    },
    {
      title: "Activated at",
      dataIndex: "activatedAt",
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
    { title: "Note", dataIndex: "note", render: (value) => value || "-" },
    {
      title: "Action",
      dataIndex: "id",
      width: "1%",
      fixed: "right",
      render: (id) => (
        <Space>
          <Tooltip title="Open">
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => navigate(`/dashboard/criteria/${id}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (isSuccess) {
    return (
      <>
        <TitlePage
          title="Criteria Sets"
          description="Versioned criteria per department"
        >
          {canManage && (
            <Button
              type="primary"
              loading={isCreating}
              onClick={() => setCreateOpen(true)}
              icon={<PlusOutlined />}
            >
              New draft
            </Button>
          )}
        </TitlePage>

        <Table<CriteriaSetResponse>
          columns={columns}
          dataSource={sets}
          scroll={{ x: "max-content" }}
          rowKey="id"
          pagination={false}
        />

        <Modal
          title="New criteria draft"
          open={createOpen}
          onCancel={() => {
            setCreateOpen(false);
            setDepartmentId(undefined);
          }}
          onOk={handleCreate}
          confirmLoading={isCreating}
          okText="Create draft"
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Global (all departments)"
            style={{ width: "100%" }}
            value={departmentId}
            onChange={setDepartmentId}
            options={(departments?.data ?? []).map((department) => ({
              value: department.id,
              label: department.name,
            }))}
          />
          <div style={{ marginTop: 8, color: "#8c8c8c" }}>
            Leave empty to create a global legacy set.
          </div>
        </Modal>
      </>
    );
  }
};
