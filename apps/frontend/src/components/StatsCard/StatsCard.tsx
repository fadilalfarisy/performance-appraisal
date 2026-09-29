import React from "react";
import { Flex, Typography, Card } from "antd";

const { Title, Paragraph } = Typography;

type Props = {
  role: string;
  status: string;
  value: number;
  icon: React.ReactNode;
};

export const StatsCard = ({ status, role, value, icon }: Props) => {
  return (
    <Card>
      <Flex gap={"middle"}>
        {icon}
        <Flex vertical gap={"small"}>
          <span>
            <Paragraph style={{ fontWeight: "600" }} className="margin-0">
              {status}
            </Paragraph>
            <Paragraph type="secondary" className="margin-0">
              {role}
            </Paragraph>
          </span>
          <Title level={2} className="margin-0">
            {value}
          </Title>
        </Flex>
      </Flex>
    </Card>
  );
};
