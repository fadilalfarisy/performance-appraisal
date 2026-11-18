import { useMemo, useState } from "react";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { Result, Table, Tag } from "antd";
import dayjs from "dayjs";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { hasAccess, roles } from "@/constants/role-access";
import type { AuditLogResponse } from "@appraisal/types";
import { formatDateTime, toISOString } from "@/utils/dateUtils";
import { useGetAuditLogsQuery } from "../auditApi";
import {
  AuditTrailSearch,
  type AuditTrailFilters,
} from "../components/AuditTrailSearch";

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"];

export const AuditTrail = () => {
  const auth = useAppSelector((state) => state.auth);
  const canRead = hasAccess(roles.administrator, auth.role);

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filters, setFilters] = useState<AuditTrailFilters>({});

  const defaultWindow = useMemo(() => {
    const to = dayjs().endOf("day");
    const from = to.subtract(6, "day").startOf("day");

    return {
      occurredFrom: toISOString(from) ?? undefined,
      occurredTo: toISOString(to) ?? undefined,
    };
  }, []);

  const queryParams = useMemo(
    () => ({
      ...defaultWindow,
      ...filters,
      page: pagination.current,
      limit: pagination.pageSize,
    }),
    [defaultWindow, filters, pagination.current, pagination.pageSize],
  );

  const handleSearch = (values: AuditTrailFilters) => {
    setFilters(values);
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const { data, isError, isFetching } = useGetAuditLogsQuery(queryParams, {
    skip: !canRead,
  });

  if (!canRead) {
    return (
      <Result
        status="403"
        title="403 Forbidden"
        subTitle="You are not allowed to view the audit trail."
      />
    );
  }

  if (isError) {
    return (
      <Result status="error" title="Failed to load the audit trail" />
    );
  }

  const rows = data?.data ?? [];

  const columns: TableColumnsType<AuditLogResponse> = [
    {
      title: "Time",
      dataIndex: "occurredAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Actor",
      dataIndex: "username",
      render: (value: string | null, row) =>
        value ?? (row.actorType === "SYSTEM" ? <Tag>SYSTEM</Tag> : "-"),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (value: string | null) => value ?? "-",
    },
    { title: "Action", dataIndex: "action" },
    {
      title: "Entity",
      dataIndex: "entity",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "Entity ID",
      dataIndex: "entityId",
      render: (value: string | null) => value ?? "-",
    },
  ];

  const handleTableChange = (next: TablePaginationConfig) => {
    setPagination({
      current: next.current ?? 1,
      pageSize: next.pageSize ?? 10,
    });
  };

  return (
    <>
      <TitlePage
        title="Audit Trail"
        description="Recent activity across the system. The last 7 days are shown by default."
      />
      <AuditTrailSearch onSearch={handleSearch} />
      <Table<AuditLogResponse>
        dataSource={rows}
        rowKey="id"
        loading={isFetching}
        scroll={{ x: "max-content" }}
        columns={columns}
        pagination={{
          current: data?.meta?.page ?? pagination.current,
          pageSize: data?.meta?.limit ?? pagination.pageSize,
          total: data?.meta?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChange: (page, pageSize) =>
            handleTableChange({ current: page, pageSize }),
        }}
      />
    </>
  );
};
