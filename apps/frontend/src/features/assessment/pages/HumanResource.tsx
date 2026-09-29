import type { TableColumnsType } from "antd";
import { Button, Table, Tag, Tooltip, Result, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { TitlePage } from "@/components";
import {
  useDeleteReportMutation,
  useGetReportHumanResourceQuery,
} from "../assessmentApi";
import { errorHandling } from "@/utils/errorUtils";
import { colorByDepartment, role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

interface DataType {
  id: string;
  report_date: any;
  department: string;
  status: string;
}

export const HumanResource = () => {
  const auth = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const {
    data: initialValueReport,
    isSuccess,
    isError,
  } = useGetReportHumanResourceQuery({});
  const [deleteReport] = useDeleteReportMutation();

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteReport(id).unwrap();
      message.success("Record was deleted");
    } catch (error: any) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<DataType> = [
    {
      title: "Id",
      key: "id",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Date",
      dataIndex: "report_date",
      render: (record) => {
        const formatedDate = dayjs(record).format("YYYY-MM-DD");
        return `${formatedDate}`;
      },
    },
    {
      title: "Department",
      dataIndex: "department",
      width: "1%",
      render: (value) => {
        const color = colorByDepartment(value);
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => {
        return <Tag color="red-inverse">{value}</Tag>;
      },
    },
    {
      title: "View",
      dataIndex: "id",
      width: "1%",
      fixed: "right",
      hidden: !role.accessHumanResource.includes(auth.role),
      render: (value) => (
        <Tooltip title="View">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              navigate(`/dashboard/human-resource/${value}`);
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: "Delete",
      dataIndex: "id",
      width: "1%",
      fixed: "right",
      hidden: !role.accessHumanResource.includes(auth.role),
      render: (record) => (
        <Popconfirm
          title="Delete Report"
          description="Are you sure to delete this report?"
          okText="Yes"
          cancelText="No"
          onConfirm={() => handleDeleteReport(record)}
        >
          <Tooltip title="Delete">
            <Button
              color="danger"
              variant="solid"
              size="small"
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>
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
        <TitlePage title="Initiate Report" description="Employee assessment">
          {role.accessHumanResource.includes(auth.role) && (
            <Button
              type="primary"
              onClick={() => {
                navigate("/dashboard/human-resource/initiate");
              }}
              icon={<PlusOutlined />}
            >
              Create
            </Button>
          )}
        </TitlePage>
        <Table<DataType>
          columns={columns}
          dataSource={initialValueReport}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
