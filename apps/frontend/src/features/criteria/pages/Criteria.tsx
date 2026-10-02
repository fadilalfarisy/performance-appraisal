import { PlusOutlined, HistoryOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { Button, Table, Tooltip, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { TitlePage } from "@/components";
import { useGetCriteriaQuery } from "@/features/criteria/criteriaApi";
import { role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";
import { useState } from "react";

interface DataType {
  criteria_id: number;
  criteria: string;
  weight: number;
}

export const Criteria = () => {
  const auth = useAppSelector((state) => state.auth);

  const [pagination] = useState({ current: 1, pageSize: 10 });

  const navigate = useNavigate();

  const { data: initialValueCriteria } = useGetCriteriaQuery({});

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
      title: "Criteria",
      dataIndex: "name",
      width: "3%",
    },
    {
      title: "Type",
      dataIndex: "type",
      width: "3%",
      onFilter: (value, record) =>
        record.criteria.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Weight",
      dataIndex: "weight",
      width: "1%",
      render: (record) => `${record}%`,
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

      {/* <CriteriaSearch onSearch={}/> */}

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
