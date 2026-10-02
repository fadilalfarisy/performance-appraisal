import { PlusOutlined, HistoryOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Table, Tooltip, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage } from "@/components";
import { useGetCriteriaQuery } from "@/features/criteria/criteriaApi";
import { role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";
import { useState } from "react";
import type { CriteriaVersionResponse } from "@appraisal/types";

type DataType = CriteriaVersionResponse;

export const Criteria = () => {
  const auth = useAppSelector((state) => state.auth);

  const [pagination] = useState({ current: 1, pageSize: 10 });

  const navigate = useNavigate();

  const { data: initialValueCriteria } = useGetCriteriaQuery();

  const criteria = Array.isArray(initialValueCriteria?.data)
    ? initialValueCriteria.data
    : [];

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) =>
        index + 1 + (pagination.current - 1) * pagination.pageSize,
    },
    {
      dataIndex: "id",
      hidden: true,
    },
    {
      title: "Version",
      width: "3%",
      render: (_, record) => `v${record.major}.${record.minor}.${record.patch}`,
    },
    {
      title: "Description",
      dataIndex: "description",
      width: "5%",
    },
    {
      title: "Action",
      dataIndex: "id",
      width: "1%",
      fixed: "right",
      hidden: !role.accessHumanResource.includes(auth.role),
      render: (record) => (
        <Space>
          <Tooltip title="History">
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => {
                navigate(`/dashboard/criteria/${record}`);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <TitlePage title="List Criteria" description="Criteria assessment">
        {role.accessHumanResource.includes(auth.role) && (
          <Button
            type="primary"
            onClick={() => navigate("/dashboard/criteria/create")}
            icon={<PlusOutlined />}
          >
            Add Criteria
          </Button>
        )}
      </TitlePage>

      <Table<DataType>
        columns={columns}
        dataSource={criteria}
        scroll={{ x: "max-content" }}
        rowKey="id"
        pagination={false}
      />
    </>
  );
};
