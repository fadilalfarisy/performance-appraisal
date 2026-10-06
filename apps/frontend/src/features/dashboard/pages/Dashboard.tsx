import {
  Row,
  Col,
  Card,
  Flex,
  Typography,
  Descriptions,
  Statistic,
  Empty,
  Tag,
} from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useGetDashboardSummaryQuery } from "@/features/dashboard/dashboardApi";
import { useGetActiveCriteriaSetQuery } from "@/features/criteria/criteriaApi";

const { Paragraph } = Typography;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING: "gold",
  SUBMITTED: "blue",
  APPROVED: "cyan",
  COMPLETE: "green",
};

export const Dashboard = () => {
  const { data: summary, isSuccess } = useGetDashboardSummaryQuery();
  const { data: activeCriteriaSet, isSuccess: criteriaSuccess } =
    useGetActiveCriteriaSetQuery();

  return (
    <>
      <Card title="Appraisals by status" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {isSuccess &&
            summary.data.appraisalsByStatus.map((item) => (
              <Col key={item.status} xs={12} sm={8} md={4}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Statistic
                    title={<Tag color={STATUS_COLOR[item.status]}>{item.status}</Tag>}
                    value={item.count}
                  />
                </Card>
              </Col>
            ))}
        </Row>
      </Card>

      <Card title="Employees" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Flex gap="large" align="center">
              <TeamOutlined style={{ fontSize: 36, color: "purple" }} />
              <Statistic
                title="Total employees"
                value={isSuccess ? summary.data.employees.total : 0}
              />
            </Flex>
          </Col>
          <Col xs={24} sm={16}>
            <Descriptions size="small" column={2}>
              {isSuccess &&
                summary.data.employees.byDepartment.map((item) => (
                  <Descriptions.Item key={item.departmentId} label={item.department}>
                    {item.total}
                  </Descriptions.Item>
                ))}
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Card title="Active criteria">
        {criteriaSuccess && activeCriteriaSet?.data ? (
          <Row gutter={[16, 16]}>
            {activeCriteriaSet.data.criteria.map((criterion) => (
              <Col key={criterion.id}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Paragraph className="margin-0">
                    {criterion.name || "-"}
                  </Paragraph>
                  <Paragraph type="secondary">{`${criterion.weight}%`}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No active criteria set" />
        )}
      </Card>
    </>
  );
};
