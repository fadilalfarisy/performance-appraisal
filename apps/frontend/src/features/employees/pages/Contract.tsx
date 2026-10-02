import { useNavigate, useParams } from "react-router-dom";
import { Table, Button, Result } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ActionTable } from "@/components";
import {
  useDeleteContractMutation,
  useGetContractEmployeeQuery,
} from "../contractApi";
import { dateFormat } from "@/utils/dateUtils";
import type { ContractResponse } from "@appraisal/types";

type DataType = ContractResponse;

export const Contract = () => {
  const navigate = useNavigate();
  const { id: employeeId } = useParams();

  const {
    data: initialValueContract,
    isSuccess,
    isError,
  } = useGetContractEmployeeQuery(employeeId);
  const [deleteContract] = useDeleteContractMutation();

  const contracts = Array.isArray(initialValueContract)
    ? initialValueContract
    : [];

  const handleDelete = async (contractId: string) => {
    if (!employeeId) {
      return;
    }

    return deleteContract({ id: employeeId, contractId }).unwrap();
  };

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: "5%",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      width: "5%",
      render: (record) => (record ? dayjs(record).format(dateFormat) : "-"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      width: "5%",
      render: (record) => (record ? dayjs(record).format(dateFormat) : "-"),
    },
    {
      title: "Action",
      dataIndex: "id",
      key: "id",
      width: "1%",
      fixed: "right",
      render: (value) => (
        <ActionTable
          linkEditButton={`/dashboard/employee/contract/update/${employeeId}/${value}`}
          id={value}
          deleteFunction={handleDelete}
        />
      ),
    },
  ];

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
          pagination={false}
          style={{
            marginBottom: "18px",
          }}
        />

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
      </>
    );
  }
};
