import { useNavigate, useParams } from "react-router-dom";
import type { TableColumnsType } from "antd";
import { Button, Table, Tag, Result } from "antd";
import { TitlePage } from "@/components";
import { useViewReportQuery } from "../assessmentApi";
import dayjs from "dayjs";
import { dateFormat } from "@/utils/dateUtils";
import {
  colorByDepartment,
  colorByGender,
} from "@/constants/roleAccess";

interface DataType {
  NIP: string;
  full_name: string;
  birth_date: string;
  address: string;
  gender: string;
  position: string;
  department: string;
  end_contract: string;
}

export const ViewReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: initialValuesReport,
    isSuccess: isViewReportSuccess,
    isError: isViewReportError,
  } = useViewReportQuery(id);

  console.log(initialValuesReport);

  const columns: TableColumnsType<DataType> = [
    {
      title: "NIP",
      dataIndex: "NIP",
      key: "NIP",
      sorter: (a, b) => a.NIP.localeCompare(b.NIP),
      onFilter: (value, record) =>
        record.NIP.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Name",
      dataIndex: "full_name",
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
      onFilter: (value, record) =>
        record.full_name.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      width: "1%",
      render: (value) => {
        const color = colorByGender(value);
        return <Tag color={color}>{value}</Tag>;
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
      title: "End Contract",
      dataIndex: "end_contract",
      render: (record) => dayjs(record).format(dateFormat),
    },
  ];

  if (isViewReportError) {
    return (
      <Result
        status="error"
        title="Something error"
        subTitle="Oops, Your can't access this page."
      />
    );
  }

  if (isViewReportSuccess) {
    return (
      <>
        <TitlePage title="View Report" description="Employee assessment" />
        <Table<DataType>
          columns={columns}
          dataSource={initialValuesReport}
          scroll={{ x: "max-content" }}
          rowKey="NIP"
          style={{ margin: "36px 0" }}
        />

        <div style={{ display: "flex", justifyContent: "end", gap: 16 }}>
          <Button
            onClick={() => {
              navigate(-1);
            }}
          >
            Back
          </Button>
        </div>
      </>
    );
  }
};
