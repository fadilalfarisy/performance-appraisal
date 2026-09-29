import { useState, useMemo } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Table, Result } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { ActionTable, TitlePage } from "@/components";
import {
  useGetEmployeeQuery,
  useDeleteEmployeeMutation,
} from "../employeesApi";
import {
  EmployeeSearch,
  type EmployeeSearchValues,
} from "../components/EmployeeSearch";
import { role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

dayjs.extend(isBetween);

interface DataType {
  id: string;
  nip: string;
  fullName: string;
  birthDate: string;
  address: string;
  gender: string;
  status: string;
  position: { id: string; name: string };
  department: { id: string; name: string };
  contract: {
    status: string;
    startDate: string[];
    endDate: string[];
  };
}

const buildSearchParams = (values: EmployeeSearchValues | null) => {
  if (!values) {
    return {};
  }

  return Object.entries(values).reduce(
    (acc, [key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return acc;
      }

      acc[key] = value;
      return acc;
    },
    {} as Record<string, string | string[]>,
  );
};

export const Employee = () => {
  const auth = useAppSelector((state) => state.auth);

  const [searchValues, setSearchValues] = useState<EmployeeSearchValues | null>(
    null,
  );
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const navigate = useNavigate();

  const queryParams = useMemo(
    () => ({
      ...buildSearchParams(searchValues),
      page: pagination.current,
      limit: pagination.pageSize,
    }),
    [pagination.current, pagination.pageSize, searchValues],
  );

  const {
    data: initialValueEmployee,
    isSuccess,
    isError,
  } = useGetEmployeeQuery(queryParams);
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const employees = Array.isArray(initialValueEmployee?.data)
    ? initialValueEmployee.data
    : [];

  const totalItems = useMemo(() => {
    const payload = initialValueEmployee as any;

    return (
      payload?.meta?.total ??
      payload?.meta?.totalItems ??
      payload?.pagination?.total ??
      payload?.pagination?.totalItems ??
      payload?.total ??
      payload?.count ??
      employees.length
    );
  }, [employees.length, initialValueEmployee]);

  const handleSearch = (values: EmployeeSearchValues) => {
    setSearchValues(values);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setSearchValues(null);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (page: number, pageSize?: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize ?? prev.pageSize,
    }));
  };

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) =>
        index + 1 + (pagination.current - 1) * pagination.pageSize,
    },
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      hidden: true,
    },
    {
      title: "NIP",
      dataIndex: "nip",
    },
    {
      title: "Name",
      dataIndex: "fullName",
    },
    {
      title: "Department",
      dataIndex: "department",
      width: "1%",
      render: (value) => value.name,
    },
    {
      title: "Position",
      dataIndex: "position",
      render: (value) => value.name,
    },
    {
      title: "Status",
      dataIndex: "status",
    },
    {
      title: "End Contract",
      dataIndex: "contract",
      render: (value) => (value.endDate ? value.endDate : "-"),
    },
    {
      title: "Status Contract",
      dataIndex: "contract",
      render: (value) => value.status,
    },
    {
      title: "Action",
      dataIndex: "id",
      width: "1%",
      fixed: "right",
      hidden: !role.accessHumanResource.includes(auth.role),
      render: (value) => (
        <ActionTable
          linkEditButton={`/dashboard/employee/${value}`}
          id={value}
          deleteFunction={deleteEmployee}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <Result
        status="error"
        title="403 Forbidden"
        subTitle="Oops, Your can't access this page."
      />
    );
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage title="List Employees" description="All staff company">
          {role.accessHumanResource.includes(auth.role) && (
            <Button
              type="primary"
              onClick={() => {
                navigate("/dashboard/employee/create");
              }}
              icon={<PlusOutlined />}
            >
              Add Employee
            </Button>
          )}
        </TitlePage>

        <EmployeeSearch onSearch={handleSearch} onReset={handleReset} />

        <Table<DataType>
          columns={columns}
          dataSource={employees}
          scroll={{ x: "max-content" }}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: totalItems,
            showSizeChanger: true,
            pageSizeOptions: ["3", "10", "20", "50"],
            onChange: (page, pageSize) => handleTableChange(page, pageSize),
          }}
        />
      </>
    );
  }
};
