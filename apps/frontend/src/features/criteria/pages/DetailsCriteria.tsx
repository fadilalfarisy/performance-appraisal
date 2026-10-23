import { useParams, useNavigate } from "react-router-dom";
import { Result, Spin, Table, Tag, Button, Space, Tabs } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useGetCriteriaSetByIdQuery } from "../criteriaApi";
import { CriteriaForm } from "../components/CriteriaForm";
import { hasAccess, roles } from "@/constants/role-access";
import { useAppSelector } from "@/app/hooks";
import {
  UserRole,
  type CriterionFieldResponse,
  type CriterionResponse,
} from "@appraisal/types";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  ARCHIVED: "orange",
};

export const DetailsCriteria = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const { data, isLoading, isError } = useGetCriteriaSetByIdQuery(id);

  if (isError) {
    return (
      <Result
        status="error"
        title="Something Error"
        subTitle="You can't access this page."
      />
    );
  }

  if (isLoading || !data) {
    return <Spin />;
  }

  const criteriaSet = data.data;
  const canManage = hasAccess(roles.humanResource, auth.role);
  const isAdmin = auth.role === UserRole.ADMIN;
  const editableDraft = criteriaSet.status === "DRAFT" && canManage;
  const editableActive = criteriaSet.status === "ACTIVE" && isAdmin;
  const editable = editableDraft || editableActive;

  const columns: TableColumnsType<CriterionResponse> = [
    { title: "Code", dataIndex: "code", width: "1%" },
    { title: "Name", dataIndex: "name" },
    {
      title: "Scale",
      width: "1%",
      render: (_, record) => `${record.scaleMin} - ${record.scaleMax}`,
    },
    {
      title: "Weight",
      dataIndex: "weight",
      width: "1%",
      render: (value) => `${value}%`,
    },
    { title: "Order", dataIndex: "displayOrder", width: "1%" },
  ];

  const fieldColumns: TableColumnsType<CriterionFieldResponse> = [
    { title: "Key", dataIndex: "fieldKey", width: "1%" },
    { title: "Label", dataIndex: "label" },
    { title: "Type", dataIndex: "inputType", width: "1%" },
    {
      title: "Required",
      dataIndex: "required",
      width: "1%",
      render: (value) => (value ? "Yes" : "No"),
    },
    { title: "Order", dataIndex: "displayOrder", width: "1%" },
  ];

  return (
    <>
      <TitlePage
        title={`Criteria set v${criteriaSet.version}`}
        description={criteriaSet.departmentName ?? "Global"}
      >
        <Button
          onClick={() => navigate("/dashboard/criteria")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>

      <Space style={{ marginBottom: 8 }}>
        <Tag color={STATUS_COLOR[criteriaSet.status] ?? "default"}>
          {criteriaSet.status}
        </Tag>
        <Tag>{criteriaSet.departmentName ?? "Global"}</Tag>
      </Space>

      {editable ? (
        <CriteriaForm
          criteriaSet={criteriaSet}
          mode={editableActive ? "active" : "draft"}
        />
      ) : (
        <Tabs
          style={{ marginTop: 16 }}
          items={[
            {
              key: "criteria",
              label: "Criteria",
              children: (
                <Table<CriterionResponse>
                  columns={columns}
                  dataSource={criteriaSet.criteria}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: "max-content" }}
                />
              ),
            },
            {
              key: "fields",
              label: "Form fields",
              children: (
                <Table<CriterionFieldResponse>
                  columns={fieldColumns}
                  dataSource={criteriaSet.fields}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: "max-content" }}
                />
              ),
            },
          ]}
        />
      )}
    </>
  );
};
