import { Descriptions, Typography } from "antd";
import type { AuditLogResponse } from "@appraisal/types";

export const formatDetail = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") return String(value);

  return Object.keys(value).length === 0
    ? undefined
    : JSON.stringify(value, null, 2);
};

export const AuditLogDetails = ({ record }: { record: AuditLogResponse }) => {
  const items = [
    { key: "before", label: "Before", value: formatDetail(record.before) },
    { key: "after", label: "After", value: formatDetail(record.after) },
    {
      key: "metadata",
      label: "Metadata",
      value: formatDetail(record.metadata),
    },
    { key: "ip", label: "IP address", value: formatDetail(record.ipAddress) },
    { key: "request", label: "Request ID", value: formatDetail(record.requestId) },
  ];

  return (
    <Descriptions
      size="small"
      column={1}
      bordered
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        children: item.value ? (
          <Typography.Paragraph
            style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
          >
            {item.value}
          </Typography.Paragraph>
        ) : (
          "-"
        ),
      }))}
    />
  );
};
