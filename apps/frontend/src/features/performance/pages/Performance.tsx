import { useState, useEffect } from "react";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import {
  Button,
  Input,
  Table,
  Select,
  Flex,
  Tag,
  Tooltip,
  Result,
  Space,
} from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { TitlePage } from "@/components";
import { useGetEmployeePerformanceQuery } from "../performanceApi";
import {
  colorByDepartment,
  colorByGender,
  role,
} from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

dayjs.extend(isBetween);

interface DataType {
  NIP: string;
  full_name: string;
  birth_date: string;
  address: string;
  gender: string;
  position: string;
  department: string;
  end_contract: string;
  department_id: string;
}

type QueryType = {
  NIP: string;
  full_name: string;
  department: string[];
};

const initialQuery = {
  NIP: "",
  full_name: "",
  department: [],
};

export const Performance = () => {
  const auth = useAppSelector((state) => state.auth);
  const [dataTable, setDataTable] = useState([]);
  const [searchCategory, setSearchCategory] = useState("NIP");
  const [querySearch, setQuerySearch] = useState<QueryType>(initialQuery);

  const navigate = useNavigate();

  const {
    data: initialValueEmployee,
    isError,
    isSuccess,
  } = useGetEmployeePerformanceQuery({});

  const handleChangeSearch = (value: string) => {
    switch (value) {
      case "NIP":
        setSearchCategory("NIP");
        break;
      case "full_name":
        setSearchCategory("full_name");
        break;
      default:
        setSearchCategory("NIP");
    }
  };

  const onSearch = (value: string) => {
    switch (searchCategory) {
      case "NIP":
        setQuerySearch({ ...querySearch, NIP: value, full_name: "" });
        break;
      case "full_name":
        setQuerySearch({ ...querySearch, full_name: value, NIP: "" });
        break;
      default:
        setQuerySearch({ ...querySearch, NIP: value, full_name: "" });
    }
  };

  const selectBefore = (
    <Select
      defaultValue="NIP"
      onChange={handleChangeSearch}
      style={{ width: 90 }}
    >
      <Select.Option value="NIP">NIP</Select.Option>
      <Select.Option value="full_name">Name</Select.Option>
    </Select>
  );

  useEffect(() => {
    if (initialValueEmployee) {
      setDataTable(initialValueEmployee);
    }
  }, [initialValueEmployee]);

  const columns: TableColumnsType<DataType> = [
    {
      title: "NIP",
      dataIndex: "NIP",
      key: "NIP",
      width: "5%",
      filteredValue: [querySearch.NIP],
      sorter: (a, b) => a.NIP.localeCompare(b.NIP),
      onFilter: (value, record) =>
        record.NIP.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Name",
      dataIndex: "full_name",
      width: "5%",
      filteredValue: [querySearch.full_name],
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
      onFilter: (value, record) =>
        record.full_name.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      width: "5%",
      sorter: (a, b) => a.gender.localeCompare(b.gender),
      render: (value) => {
        const color = colorByGender(value);
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: "Department",
      dataIndex: "department",
      width: "5%",
      filteredValue: querySearch.department,
      onFilter: (value, record) =>
        String(record.department_id).includes(String(value)),
      sorter: (a, b) => a.department.localeCompare(b.department),
      render: (value) => {
        const color = colorByDepartment(value);
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: "Action",
      width: "1%",
      dataIndex: "NIP",
      fixed: "right",
      hidden: ![
        ...role.accessSupervisor,
        ...role.accessHeadDepartment,
      ].includes(auth.role),
      render: (record) => (
        <Space>
          <Tooltip title="View">
            <Button
              size={"small"}
              icon={<EditOutlined />}
              onClick={() => {
                navigate(`/dashboard/performance/${record}`);
              }}
            />
          </Tooltip>
          <Tooltip title="Add">
            <Button
              size={"small"}
              type="primary"
              icon={<PlusOutlined />}
              style={{
                display: !role.accessSupervisor.includes(auth.role)
                  ? "none"
                  : "inline-block",
              }}
              onClick={() => {
                navigate(`/dashboard/performance/create/${record}`);
              }}
            />
          </Tooltip>
        </Space>
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
        <TitlePage
          title="Performance Employee"
          description="Daily performance"
        />

        <Flex
          gap="middle"
          style={{ marginBottom: "24px" }}
          justify="space-between"
        >
          <Input.Search
            placeholder="Search"
            allowClear
            onSearch={onSearch}
            enterButton
            addonBefore={selectBefore}
            style={{ maxWidth: 500 }}
          />
        </Flex>

        <Table<DataType>
          columns={columns}
          dataSource={dataTable}
          scroll={{ x: "max-content" }}
          rowKey="NIP"
        />
      </>
    );
  }
};
