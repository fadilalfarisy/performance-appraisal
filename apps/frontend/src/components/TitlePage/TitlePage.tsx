import { Typography } from "antd";

type Props = {
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

const { Title, Text } = Typography;

export const TitlePage = ({ title, description, children }: Props) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "end",
        marginBottom: "32px",
      }}
    >
      <div>
        <Title level={3} className="margin-0">
          {title}
        </Title>
        <Text type="secondary">{description}</Text>
      </div>
      {children}
    </div>
  );
};
