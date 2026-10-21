import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import {
  App,
  Button,
  DatePicker,
  Popconfirm,
  Result,
  Select,
  Space,
  Table,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { hasAccess, roles } from "@/constants/role-access";
import {
  useDeleteDailyNoteMutation,
  useGetAccessibleEmployeesQuery,
  useGetDailyNotesQuery,
} from "../dailyNotesApi";
import { errorHandling } from "@/utils/errorUtils";
import { formatDate, formatDateTime } from "@/utils/dateUtils";
import type { DailyNoteResponse } from "@appraisal/types";

const { RangePicker } = DatePicker;

export const DailyNote = () => {
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const { message } = App.useApp();

  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [range, setRange] = useState<[string, string] | undefined>();
  const [page, setPage] = useState(1);

  const { data: employees } = useGetAccessibleEmployeesQuery();
  const { data, isSuccess } = useGetDailyNotesQuery({
    employeeId,
    dateFrom: range?.[0],
    dateTo: range?.[1],
    page,
    limit: 10,
  });
  const [deleteNote] = useDeleteDailyNoteMutation();

  const canManage = hasAccess(roles.noteManagers, auth.role);
  const notes = data?.data ?? [];

  if (!canManage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="Only supervisors and head department users can open daily notes."
      />
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id).unwrap();
      message.success("Daily note deleted");
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<DailyNoteResponse> = [
    {
      title: "Employee",
      render: (_, record) =>
        record.employeeName
          ? `${record.employeeNumber ?? "-"} — ${record.employeeName}`
          : "-",
    },
    {
      title: "Department",
      dataIndex: "departmentName",
      render: (value) => value || "-",
    },
    {
      title: "Date",
      dataIndex: "recordDate",
      render: (value) => formatDate(value),
    },
    {
      title: "Period",
      dataIndex: "period",
      render: (value) => formatDate(value),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Action",
      width: "1%",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/daily-notes/${record.id}/edit`)}
          >
            Open
          </Button>
          <Popconfirm
            title="Delete this daily note?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pagination: TablePaginationConfig = {
    current: data?.meta?.page ?? page,
    pageSize: data?.meta?.limit ?? 10,
    total: data?.meta?.total ?? 0,
    onChange: (nextPage) => setPage(nextPage),
  };

  if (!isSuccess) return null;

  return (
    <>
      <TitlePage title="Daily Notes" description="Daily activity notes">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/dashboard/daily-notes/create")}
        >
          New note
        </Button>
      </TitlePage>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Employee"
          style={{ width: 280 }}
          value={employeeId}
          onChange={(value) => {
            setEmployeeId(value);
            setPage(1);
          }}
          options={(employees?.data ?? []).map((employee) => ({
            value: employee.id,
            label: `${employee.employeeNumber} — ${employee.fullName}`,
          }))}
        />
        <RangePicker
          allowEmpty={[true, true]}
          onChange={(dates) => {
            const [from, to] = dates ?? [];
            setRange(
              from && to
                ? [from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD")]
                : undefined,
            );
            setPage(1);
          }}
        />
      </Space>

      <Table<DailyNoteResponse>
        columns={columns}
        dataSource={notes}
        rowKey="id"
        scroll={{ x: "max-content" }}
        pagination={pagination}
      />
    </>
  );
};
