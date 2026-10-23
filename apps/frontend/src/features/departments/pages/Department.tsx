import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Input, Flex, Table, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage, ActionTable } from "@/components";
import {
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
} from "../departmentsApi";
import type { DepartmentResponse } from "@appraisal/types";

type DataType = DepartmentResponse;

export const Department = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const { data, isSuccess, isError } = useGetDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const keyword = search.trim().toLowerCase();
  const departments = (data?.data ?? []).filter(
    (department) =>
      !keyword ||
      department.code.toLowerCase().includes(keyword) ||
      department.name.toLowerCase().includes(keyword),
  );

  const columns: TableColumnsType<DataType> = [
    {
      title: "Id",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Code",
      dataIndex: "code",
      width: "1%",
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
            placeholder="Search by code or name"
            allowClear
            onSearch={setSearch}
            onClear={() => setSearch("")}
            enterButton
            style={{ maxWidth: 500 }}
          />
        </Flex>
        <Table<DataType>
          columns={columns}
          dataSource={departments}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
