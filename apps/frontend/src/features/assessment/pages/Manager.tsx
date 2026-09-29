import { useState } from "react";
import type { TableColumnsType } from "antd";
import { Button, Table, Tag, Tooltip, Popconfirm, Result, Space } from "antd";
import {
  CloudDownloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { TitlePage } from "@/components";
import {
  useChangeStatusReportMutation,
  useGetReportManagerQuery,
  useLazyDownloadPDFQuery,
} from "../assessmentApi";
import { errorHandling } from "@/utils/errorUtils";
import { colorByDepartment, role } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

interface DataType {
  id: string;
  date: any;
  department: string;
  status: string;
}

export const Manager = () => {
  const [selectedRow, setSelectedRow] = useState("");
  const auth = useAppSelector((state) => state.auth);

  const {
    data: initialValueReport,
    isSuccess,
    isError,
  } = useGetReportManagerQuery({});
  const [changeStatusReport] = useChangeStatusReportMutation();
  const [downloadPDF, { isLoading: isDownloadLoading }] =
    useLazyDownloadPDFQuery();

  const changeStatus = async (id: string) => {
    try {
      const result = await changeStatusReport({
        id: id,
        body: { status: "VERIFIED" },
      }).unwrap();
      console.log(result);
    } catch (error) {
      errorHandling(error);
    }
  };

  const rejectReport = async (id: string) => {
    try {
      const result = await changeStatusReport({
        id: id,
        body: { status: "CREATED" },
      }).unwrap();
      console.log(result);
    } catch (error) {
      errorHandling(error);
    }
  };

  const onDownloadPDF = async (record: any, data: DataType) => {
    setSelectedRow(data.id);
    downloadPDF(record);
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
        return <Tag color="orange-inverse">{value}</Tag>;
      },
    },
    {
      title: "Download",
      width: "1%",
      dataIndex: "pdf",
      align: "center",
      fixed: "right",
      render: (value, record) => {
        return (
          <Tooltip title="Download">
            <Button
              icon={<CloudDownloadOutlined />}
              loading={isDownloadLoading && selectedRow === record.id}
              onClick={() => onDownloadPDF(value, record)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Action",
      width: "1%",
      dataIndex: "id",
      fixed: "right",
      align: "center",
      hidden: !role.accessManager.includes(auth.role),
      render: (record) => {
        return (
          <Space>
            <Popconfirm
              title="Reject Report"
              description="Are you sure to reject this report?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => rejectReport(record)}
            >
              <Tooltip title="Reject">
                <Button
                  color="danger"
                  variant="solid"
                  size="small"
                  icon={<CloseOutlined />}
                />
              </Tooltip>
            </Popconfirm>

            <Popconfirm
              title="Verify Report"
              description="Are you sure to verify this report?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => changeStatus(record)}
            >
              <Tooltip title="Verify">
                <Button type="primary" size="small" icon={<CheckOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
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
        <TitlePage title="To Verify" description="Employee assessment" />
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
