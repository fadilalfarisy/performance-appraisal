import { useRouteError } from "react-router-dom";
import { Result } from "antd";
import { BackButton, RefreshButton } from "@/components";

type Error = unknown | any;

export const ErrorPage = () => {
  const error: Error = useRouteError();
  console.error(error);

  return (
    <div className="center-content">
      <Result
        status="error"
        title="404 Not Found"
        subTitle="Sorry, your looking unavailable page"
        extra={[
          <BackButton type="primary" key={1} />,
          <RefreshButton key={2} />,
        ]}
      />
    </div>
  );
};
