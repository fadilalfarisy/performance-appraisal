import type { TableColumnsType } from "antd";
import { Button, Table, Tag, Tooltip, Result } from "antd";
import { EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { TitlePage } from "@/components";
import { useGetReportHeadDepartmentQuery } from "../assessmentApi";
import { role, colorByDepartment } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

interface DataType {
  id: string;
  report_date: any;
  department: string;
  status: string;
}

export const HeadDepartment = () => {
  const auth = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const {
    data: initialValueReport,
    isSuccess,
    isError,
  } = useGetReportHeadDepartmentQuery({});

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
      render: (record) => {
        return <Tag color="red-inverse">{record}</Tag>;
      },
    },
    {
      title: "More",
      dataIndex: "id",
      width: "1%",
      fixed: "right",
      hidden: !role.accessHeadDepartment.includes(auth.role),
      render: (record) => (
        <Tooltip title="Edit">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              navigate(`/dashboard/head-department/${record}`);
            }}
          />
        </Tooltip>
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
        <TitlePage title="To Assess" description="Employee assessment" />
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
