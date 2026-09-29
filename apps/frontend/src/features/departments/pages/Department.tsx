import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Input, Flex, Table, Select, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage, ActionTable } from "@/components";
import {
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
} from "../departmentsApi";

interface DataType {
  id: number;
  username: string;
  role: string;
}

type SearchType = {
  username: string;
  role: string;
};

const InitialSearch: SearchType = {
  username: "",
  role: "",
};

export const Department = () => {
  const navigate = useNavigate();

  const [searchCategory, setSearchCategory] = useState("username");
  const [, setQuerySearch] = useState<SearchType>(InitialSearch);

  const { data, isSuccess, isError } = useGetDepartmentsQuery({});
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const handleChangeSearch = (value: string) => {
    switch (value) {
      case "username":
        setSearchCategory("username");
        break;
      case "role":
        setSearchCategory("role");
        break;
      default:
        setSearchCategory("username");
    }
  };
  const onSearch = (value: string) => {
    switch (searchCategory) {
      case "username":
        setQuerySearch({ username: value, role: "" });
        break;
      case "role":
        setQuerySearch({ username: "", role: value });
        break;
      default:
        setQuerySearch({ username: value, role: "" });
    }
  };

  const selectBefore = (
    <Select
      defaultValue="username"
      onChange={handleChangeSearch}
      style={{ width: 120 }}
    >
      <Select.Option value="username">Username</Select.Option>
      <Select.Option value="role">Role</Select.Option>
    </Select>
  );

  const columns: TableColumnsType<DataType> = [
    {
      title: "Id",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Department",
      dataIndex: "name",
    },
    {
      title: "Action",
      dataIndex: "id",
      key: "id",
      width: "1%",
      fixed: "right",
      render: (record) => (
        <ActionTable
          id={record}
          deleteFunction={deleteDepartment}
          linkEditButton={`/dashboard/departments/${record}`}
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
    console.log(data?.data);
    return (
      <>
        <TitlePage title="List Departments" description="Departments company">
          <Button
            type="primary"
            onClick={() => navigate("/dashboard/departments/create")}
            icon={<PlusOutlined />}
          >
            Add Department
          </Button>
        </TitlePage>
        <Flex gap="middle" style={{ marginBottom: "24px" }}>
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
          dataSource={data?.data}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
