import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Button, Form, Input, Row, Col } from "antd";
import { TitlePage } from "@/components";
import { useGetEmployeeByIdQuery } from "@/features/employees/employeesApi";
import { PerformanceByEmployee } from "./PerformanceByEmployee";

export const ViewPerformance = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const {
    data: initialValueEmployee,
    isSuccess,
    isError,
  } = useGetEmployeeByIdQuery(id);

  if (isError) {
    return <Navigate to={"/dashboard/performance"} />;
  }

  if (isSuccess) {
    console.log(initialValueEmployee);
    return (
      <>
        <TitlePage
          title="Performance Employee"
          description="Individual performance"
        />
        <Form
          name="Performance Employee"
          initialValues={initialValueEmployee}
          layout="vertical"
          autoComplete="off"
        >
          <Row gutter={[16, 0]}>
            <Col sm={24} md={12}>
              <Form.Item
                label="NIP"
                name="NIP"
                hasFeedback
                rules={[
                  {
                    required: true,
                    whitespace: true,
                  },
                  { min: 6, max: 6, message: "NIP must be 6 characters long" },
                  {
                    pattern: new RegExp(/^[0-9]*$/),
                    message: "NIP is not a valid number",
                  },
                ]}
              >
                <Input
                  disabled
                  className="disable"
                  style={{ color: "black" }}
                />
              </Form.Item>
              <Form.Item
                label="Name"
                name="full_name"
                hasFeedback
                rules={[{ required: true, min: 3, max: 60, whitespace: true }]}
              >
                <Input
                  disabled
                  className="disable"
                  style={{ color: "black" }}
                />
              </Form.Item>
            </Col>

            <Col sm={24} md={12}>
              <Form.Item
                label="Department"
                name="department"
                hasFeedback
                rules={[{ required: true }]}
              >
                <Input
                  disabled
                  className="disable"
                  style={{ color: "black" }}
                />
              </Form.Item>

              <Form.Item
                label="Position"
                name="position"
                hasFeedback
                rules={[{ required: true }]}
              >
                <Input
                  disabled
                  className="disable"
                  style={{ color: "black" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <PerformanceByEmployee />

        <div
          style={{
            display: "flex",
            justifyContent: "end",
            marginTop: "36px",
          }}
        >
          <Button onClick={() => navigate(-1)}>Back</Button>
        </div>
      </>
    );
  }
};
