import { useNavigate } from "react-router-dom";
import { PlusOutlined, HistoryOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Table, Tag, Space, Tooltip, message } from "antd";
import { TitlePage } from "@/components";
import { role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";
import {
  useCreateCriteriaSetMutation,
  useGetCriteriaSetsQuery,
} from "@/features/criteria/criteriaApi";
import { errorHandling } from "@/utils/errorUtils";
import type { CriteriaSetResponse } from "@appraisal/types";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  SUPERSEDED: "orange",
};

export const Criteria = () => {
  const auth = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const { data, isSuccess } = useGetCriteriaSetsQuery();
  const [createCriteriaSet, { isLoading: isCreating }] =
    useCreateCriteriaSetMutation();

  const canManage = role.accessHumanResource.includes(auth.role);
  const sets = data?.data ?? [];

  const handleCreate = async () => {
    try {
      const { data: created } = await createCriteriaSet(undefined).unwrap();
      message.success("Draft criteria set created");
      navigate(`/dashboard/criteria/${created.id}`);
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<CriteriaSetResponse> = [
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
      title: "Effective date",
      dataIndex: "effectiveDate",
      render: (value) => value || "-",
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
        <TitlePage title="Criteria Sets" description="Versioned criteria">
          {canManage && (
            <Button
              type="primary"
              loading={isCreating}
              onClick={handleCreate}
              icon={<PlusOutlined />}
            >
              New draft from active
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
      </>
    );
  }
};
