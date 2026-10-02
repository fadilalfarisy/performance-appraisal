import { Row, Col, Descriptions, Card, Flex, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import {
  useCountEmployeeByDepartmentQuery,
  useCountEmployeeQuery,
} from "@/features/dashboard/dashboardApi";
import { useGetCriteriaQuery } from "@/features/criteria/criteriaApi";

const { Title, Paragraph } = Typography;

export const Dashboard = () => {
  const { data: totalEmployee, isSuccess: isCountEmployeeSuccess } =
    useCountEmployeeQuery();
  const {
    data: countEmployeeByDepartment,
    isSuccess: isCountByDepartmentSuccess,
  } = useCountEmployeeByDepartmentQuery();
  const { data: initialValueCriteria, isSuccess: isGetCriteriaSuccess } =
    useGetCriteriaQuery();

  return (
    <>
      <Card style={{ margin: "16px 0" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col sm={9}>
            <Flex gap={"large"}>
              <TeamOutlined style={{ fontSize: 36, color: "purple" }} />
              <span>
                <Title level={5} className="margin-0">
                  Total Employee
                </Title>
                <Paragraph className="margin-0">
                  {isCountEmployeeSuccess ? totalEmployee.total : 0}
                </Paragraph>
              </span>
            </Flex>
          </Col>
          <Col sm={15}>
            <Descriptions size={"small"}>
              {isCountByDepartmentSuccess &&
                countEmployeeByDepartment?.map((item: any, index: number) => (
                  <Descriptions.Item key={index} label={`${item.department}`}>
                    {item.total}
                  </Descriptions.Item>
                ))}
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Card>
        <Title level={5} style={{ marginBottom: "24px" }}>
          Criteria & Preferences
        </Title>
        <Row gutter={[16, 16]}>
          {isGetCriteriaSuccess &&
            initialValueCriteria?.data?.map((item: any, index: number) => (
              <Col key={index}>
                <Card style={{ textAlign: "center" }}>
                  <Paragraph className="margin-0">{item.name || '-'}</Paragraph>
                  <Paragraph type="secondary">{`${item.weight || 0}%`}</Paragraph>
                </Card>
              </Col>
            ))}
        </Row>
      </Card>
    </>
  );
};
