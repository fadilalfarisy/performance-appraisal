import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Input, Flex, Table, Select, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage, ActionTable } from "@/components";
import { useDeleteUserMutation, useGetUserQuery } from "../usersApi";
import type { UserResponse } from "@appraisal/types";

type DataType = UserResponse;

type SearchType = {
  username: string;
  role: string;
};

const InitialSearch: SearchType = {
  username: "",
  role: "",
};

export const User = () => {
  const navigate = useNavigate();

  const [searchCategory, setSearchCategory] = useState("username");
  const [querySearch, setQuerySearch] = useState<SearchType>(InitialSearch);

  const { data, isSuccess, isError } = useGetUserQuery();
  const [deleteUser] = useDeleteUserMutation();
  const users = data?.data ?? [];

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
      title: "Username",
      dataIndex: "username",
      filteredValue: [querySearch.username],
      onFilter: (value, record) =>
        record.username.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (record) => record || "-",
      // filteredValue: [querySearch.role],
      // onFilter: (value, record) =>
      //   record.role.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Employee",
      dataIndex: "employee",
      render: (record) => record?.fullName || "-",
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
          deleteFunction={deleteUser}
          linkEditButton={`/dashboard/users/${record}`}
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
        <TitlePage title="List User" description="Account user system">
          <Button
            type="primary"
            onClick={() => navigate("/dashboard/users/create")}
            icon={<PlusOutlined />}
          >
            Add User
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
          dataSource={Array.isArray(users) ? users : []}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
