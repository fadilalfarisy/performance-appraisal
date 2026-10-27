import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Popconfirm,
  Result,
  Select,
  Space,
  Table,
} from "antd";
import type { Dayjs } from "dayjs";
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { hasAccess, roles } from "@/constants/role-access";
import { useGetDepartmentsQuery } from "@/features/departments";
import {
  useDeleteDailyNoteMutation,
  useGetDailyNotesQuery,
} from "../dailyNotesApi";
import { errorHandling } from "@/utils/errorUtils";
import {
  dateFormat,
  formatDate,
  formatDateTime,
} from "@/utils/dateUtils";
import type { DailyNoteResponse } from "@appraisal/types";

type DailyNoteFilters = {
  search?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const DailyNote = () => {
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const { message } = App.useApp();

  const [form] = Form.useForm();
  const [filters, setFilters] = useState<DailyNoteFilters>({});
  const [page, setPage] = useState(1);

  const { data: departments } = useGetDepartmentsQuery();
  const { data, isSuccess } = useGetDailyNotesQuery({
    ...filters,
    page,
    limit: 10,
  });
  const [deleteNote] = useDeleteDailyNoteMutation();

  const canManage = hasAccess(roles.noteManagers, auth.role);
  const notes = data?.data ?? [];

  const collectFilters = (): DailyNoteFilters => {
    const values = form.getFieldsValue();
    const date = values.date as Dayjs | undefined;
    const selectedDate = date ? date.format(dateFormat) : undefined;

    return {
      search: values.search?.trim() || undefined,
      departmentId: values.departmentId,
      dateFrom: selectedDate,
      dateTo: selectedDate,
    };
  };

  const applyFilters = () => {
    setFilters(collectFilters());
    setPage(1);
  };

  const handleClearSearch = () => {
    form.setFieldValue("search", undefined);
    applyFilters();
  };

  const handleDepartmentChange = (value?: string) => {
    form.setFieldValue("departmentId", value);
    applyFilters();
  };

  const handleDateChange = (value: Dayjs | null) => {
    form.setFieldValue("date", value ?? undefined);
    applyFilters();
  };

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
      title: "Employee No",
      dataIndex: "employeeNumber",
      width: "1%",
      render: (value) => value || "-",
    },
    {
      title: "Employee Name",
      dataIndex: "employeeName",
      width: "2%",
      render: (value) => value || "-",
    },
    {
      title: "Department",
      dataIndex: "departmentName",
      render: (value) => value || "-",
    },
    {
      title: "Criteria",
      dataIndex: "criteriaSetVersion",
      render: (value) => (value ? `v${value}` : "-"),
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
            <Button
              size="small"
              color="danger"
              variant="solid"
              icon={<DeleteOutlined />}
            />
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

      <Form form={form} style={{ marginBottom: 16 }}>
        <Space wrap>
          <Form.Item name="search" style={{ marginBottom: 0 }}>
            <Input.Search
              placeholder="Search by employee number or name"
              allowClear
              onSearch={applyFilters}
              onClear={handleClearSearch}
              enterButton
              style={{ width: "clamp(220px, 32vw, 480px)" }}
            />
          </Form.Item>
          <Form.Item name="departmentId" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Department"
              style={{ width: 220 }}
              onChange={handleDepartmentChange}
              options={(departments?.data ?? []).map((department) => ({
                value: department.id,
                label: department.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="date" style={{ marginBottom: 0 }}>
            <DatePicker
              format={dateFormat}
              placeholder="Date"
              style={{ width: 180 }}
              onChange={handleDateChange}
            />
          </Form.Item>
        </Space>
      </Form>

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
