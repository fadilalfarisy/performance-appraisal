import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

export const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Result
        status="403"
        title="403 Forbidden"
        subTitle="You do not have access to this page."
        extra={
          <Button type="primary" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        }
      />
    </div>
  );
};
