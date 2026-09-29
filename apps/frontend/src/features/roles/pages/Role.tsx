import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Input, Flex, Table, Select, Result, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage, ActionTable } from "@/components";
import { useDeleteRoleMutation, useGetRolesQuery } from "../rolesApi";

interface DataType {
  id: string;
  name: string;
  description: string;
  permissions: any[];
}

type SearchType = {
  name: string;
};

const InitialSearch: SearchType = {
  name: "",
};

export const Role = () => {
  const navigate = useNavigate();

  const [searchCategory, setSearchCategory] = useState("name");
  const [querySearch, setQuerySearch] = useState<SearchType>(InitialSearch);

  const { data, isSuccess, isError } = useGetRolesQuery({});
  const [deleteRole] = useDeleteRoleMutation();

  const handleChangeSearch = (value: string) => {
    switch (value) {
      case "name":
        setSearchCategory("name");
        break;
      default:
        setSearchCategory("name");
    }
  };

  const onSearch = (value: string) => {
    switch (searchCategory) {
      case "name":
        setQuerySearch({ name: value });
        break;
      default:
        setQuerySearch({ name: value });
    }
  };

  const selectBefore = (
    <Select
      defaultValue="name"
      onChange={handleChangeSearch}
      style={{ width: 120 }}
    >
      <Select.Option value="name">Name</Select.Option>
    </Select>
  );

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      hidden: true
    },
    {
      title: "Name",
      dataIndex: "name",
      filteredValue: [querySearch.name],
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(String(value).toLowerCase()),
    },
    // {
    //   title: "Description",
    //   dataIndex: "description",
    //   key: "description",
    // },
    {
      title: "Permissions",
      dataIndex: "permissions",
      key: "permissions",
      render: (permissions: any[]) => (
        <Flex gap="4px" wrap="wrap">
          {permissions && permissions.length > 0 ? (
            permissions.map((perm: any) => {
              const name = typeof perm === "string" ? perm : (perm?.name || perm?.id || JSON.stringify(perm));
              return (
                <Tag color="blue" key={name}>
                  {name}
                </Tag>
              );
            })
          ) : (
            <span style={{ color: "#aaa", fontStyle: "italic" }}>No permissions</span>
          )}
        </Flex>
      ),
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
          deleteFunction={deleteRole}
          linkEditButton={`/dashboard/roles/${record}`}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <Result
        status="error"
        title="403 Forbidden"
        subTitle="Oops, You can't access this page."
      />
    );
  }

  if (isSuccess) {
    console.log(data?.data);
    return (
      <>
        <TitlePage title="List Role" description="Role user system">
          <Button
            type="primary"
            onClick={() => navigate("/dashboard/roles/create")}
            icon={<PlusOutlined />}
          >
            Add Role
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
          dataSource={data?.data || data}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
