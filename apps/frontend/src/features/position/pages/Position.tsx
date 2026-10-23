import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Input, Flex, Table, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage, ActionTable } from "@/components";
import {
  useDeletePositionMutation,
  useGetPositionsQuery,
} from "../positionsApi";
import type { PositionResponse } from "@appraisal/types";

type DataType = PositionResponse;

export const Position = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const { data, isSuccess, isError } = useGetPositionsQuery();
  const [deletePosition] = useDeletePositionMutation();

  const keyword = search.trim().toLowerCase();
  const positions = (data?.data ?? []).filter(
    (position) =>
      !keyword ||
      position.code.toLowerCase().includes(keyword) ||
      position.name.toLowerCase().includes(keyword) ||
      String(position.level).includes(keyword),
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
      title: "Positions",
      dataIndex: "name",
    },
    {
      title: "Level",
      dataIndex: "level",
      width: "1%",
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
          deleteFunction={deletePosition}
          linkEditButton={`/dashboard/positions/${record}`}
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
        <TitlePage
          title="List Positions"
          description="Position each department"
        >
          <Button
            type="primary"
            onClick={() => navigate("/dashboard/positions/create")}
            icon={<PlusOutlined />}
          >
            Add Position
          </Button>
        </TitlePage>
        <Flex gap="middle" style={{ marginBottom: "24px" }}>
          <Input.Search
            placeholder="Search by code, name, or level"
            allowClear
            onSearch={setSearch}
            onClear={() => setSearch("")}
            enterButton
            style={{ maxWidth: 500 }}
          />
        </Flex>
        <Table<DataType>
          columns={columns}
          dataSource={positions}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
