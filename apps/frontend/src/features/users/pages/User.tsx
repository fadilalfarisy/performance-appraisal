import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Input, Flex, Table, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage, ActionTable } from "@/components";
import { useDeleteUserMutation, useGetUserQuery } from "../usersApi";
import type { UserResponse } from "@appraisal/types";

type DataType = UserResponse;

export const User = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const { data, isSuccess, isError } = useGetUserQuery();
  const [deleteUser] = useDeleteUserMutation();
  const users = data?.data ?? [];

  const keyword = search.trim().toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      !keyword ||
      user.username.toLowerCase().includes(keyword) ||
      user.role.toLowerCase().includes(keyword),
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
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (record) => record || "-",
    },
    {
      title: "Active",
      dataIndex: "isActive",
      render: (record) => (record ? "Yes" : "No"),
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
            placeholder="Search by username or role"
            allowClear
            onSearch={setSearch}
            onClear={() => setSearch("")}
            enterButton
            style={{ maxWidth: 500 }}
          />
        </Flex>
        <Table<DataType>
          columns={columns}
          dataSource={Array.isArray(filteredUsers) ? filteredUsers : []}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
