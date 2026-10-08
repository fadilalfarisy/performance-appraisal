import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Table, Button, Result, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ActionTable } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { role } from "@/constants/roleAccess";
import { useDeleteContractMutation, useGetContractsQuery } from "../contractApi";
import { contractTypeColor } from "@/constants/option/contract-status";
import { dateFormat } from "@/utils/dateUtils";
import type { ContractResponse } from "@appraisal/types";

type DataType = ContractResponse;

export const Contract = () => {
  const navigate = useNavigate();
  const { id: employeeId } = useParams();
  const auth = useAppSelector((state) => state.auth);
  const canWrite = role.accessHumanResource.includes(auth.role);

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const { data, isSuccess, isError } = useGetContractsQuery(
    employeeId
      ? { employeeId, page: pagination.current, limit: pagination.pageSize }
      : undefined,
  );
  const [deleteContract] = useDeleteContractMutation();

  const contracts = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination({ current: page, pageSize });
  };

  const columns: TableColumnsType<DataType> = [
    {
      title: "Contract Type",
      dataIndex: "contractType",
      width: "1%",
      render: (value) => (
        <Tag color={contractTypeColor[value] ?? "default"}>{value}</Tag>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      width: "1%",
      render: (value) => (value ? dayjs(value).format(dateFormat) : "-"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      width: "1%",
      render: (value) => (value ? dayjs(value).format(dateFormat) : "-"),
    },
  ];

  if (canWrite) {
    columns.push({
      title: "Action",
      width: "1%",
      fixed: "right",
      render: (_, record) => (
        <ActionTable
          id={record.id}
          linkEditButton={`/dashboard/employee/contract/update/${employeeId}/${record.id}`}
          deleteFunction={deleteContract}
        />
      ),
    });
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Something Error"
        subTitle="Oops, Your can't access this page."
      />
    );
  }

  if (isSuccess) {
    return (
      <>
        <Table<DataType>
          columns={columns}
          dataSource={contracts}
          scroll={{ x: "max-content" }}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            onChange: handleTableChange,
          }}
          style={{ marginBottom: "18px" }}
        />

        {canWrite && (
          <Button
            block
            color="default"
            variant="dashed"
            icon={<PlusOutlined />}
            onClick={() =>
              navigate(`/dashboard/employee/contract/create/${employeeId}`)
            }
          >
            Add Contract
          </Button>
        )}
      </>
    );
  }
};
