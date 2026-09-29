import { useNavigate, useParams } from "react-router-dom";
import { Table, Button, Result } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ActionTable } from "@/components";
import {
  useDeletePerformanceMutation,
  useGetPerformanceByEmployeeQuery,
} from "../performanceApi";
import { dateFormat } from "@/utils/dateUtils";
import { role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

interface DataType {
  performance_id: string;
  employee_NIP: string;
  quantity: number;
  quality: number;
  discipline: number;
  running_instruction: number;
  production_target: number;
  date_performance: string;
  responsibility: number;
  religiousity: number;
}

export const PerformanceByEmployee = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAppSelector((state) => state.auth);

  const {
    data: initialValuePerformance,
    isSuccess,
    isError,
  } = useGetPerformanceByEmployeeQuery(id);
  const [deletePerformance] = useDeletePerformanceMutation();

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "date_performance",
      width: "5%",
      render: (record) => {
        const formatedDate = dayjs(record).format(dateFormat);
        return `${formatedDate}`;
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: "1%",
    },
    {
      title: "Quality",
      dataIndex: "quality",
      width: "1%",
    },
    {
      title: "Discipline",
      dataIndex: "discipline",
      width: "1%",
    },
    {
      title: "Running Instruction",
      dataIndex: "running_instruction",
      width: "1%",
    },
    {
      title: "Responsibility",
      dataIndex: "responsibility",
      width: "1%",
    },
    {
      title: "Religiousity",
      dataIndex: "religiousity",
      width: "1%",
    },
    {
      title: "Action",
      dataIndex: "performance_id",
      key: "performance_id",
      width: "1%",
      fixed: "right",
      hidden: !role.accessSupervisor.includes(auth.role),
      render: (value) => (
        <ActionTable
          linkEditButton={`/dashboard/performance/update/${value}`}
          id={value}
          deleteFunction={deletePerformance}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <Result
        status="error"
        title="Something error"
        subTitle="Oops, Your can't access this page."
      />
    );
  }

  if (isSuccess) {
    return (
      <>
        <Table<DataType>
          columns={columns}
          dataSource={initialValuePerformance}
          scroll={{ x: "max-content" }}
          rowKey="performance_id"
          pagination={false}
          style={{
            marginBottom: "18px",
          }}
        />

        {role.accessSupervisor.includes(auth.role) && (
          <Button
            block
            color="default"
            variant="dashed"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/dashboard/performance/create/${id}`)}
          >
            Add Performance
          </Button>
        )}
      </>
    );
  }
};
