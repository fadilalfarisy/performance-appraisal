import { useParams, useNavigate } from "react-router-dom";
import { Result, Spin, Table, Tag, Button } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useGetCriteriaSetByIdQuery } from "../criteriaApi";
import { CriteriaForm } from "../components/CriteriaForm";
import { hasAccess, roles } from "@/constants/role-access";
import { useAppSelector } from "@/app/hooks";
import type { CriterionResponse } from "@appraisal/types";

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
  const editable = criteriaSet.status === "DRAFT" && canManage;

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

  return (
    <>
      <TitlePage
        title={`Criteria set v${criteriaSet.version}`}
        description="Criteria set detail"
      >
        <Button
          onClick={() => navigate("/dashboard/criteria")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>

      <Tag
        color={
          criteriaSet.status === "ACTIVE"
            ? "green"
            : criteriaSet.status === "DRAFT"
              ? "default"
              : "orange"
        }
      >
        {criteriaSet.status}
      </Tag>

      {editable ? (
        <CriteriaForm criteriaSet={criteriaSet} />
      ) : (
        <Table<CriterionResponse>
          columns={columns}
          dataSource={criteriaSet.criteria}
          rowKey="id"
          pagination={false}
          scroll={{ x: "max-content" }}
          style={{ marginTop: 16 }}
        />
      )}
    </>
  );
};
