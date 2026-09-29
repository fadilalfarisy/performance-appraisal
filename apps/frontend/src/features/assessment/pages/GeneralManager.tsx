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
  useGetReportGeneralManagerQuery,
  useChangeStatusReportMutation,
  useLazyDownloadPDFQuery,
} from "../assessmentApi";
import { errorHandling } from "@/utils/errorUtils";
import { useState } from "react";
import { role, colorByDepartment } from "@/constants/roleAccess";
import { useAppSelector } from "@/app/hooks";

interface DataType {
  id: string;
  date: any;
  department: string;
  status: string;
  pdf: string;
}

export const GeneralManager = () => {
  const [selectedRow, setSelectedRow] = useState("");
  const auth = useAppSelector((state) => state.auth);

  const {
    data: initialValueReport,
    isSuccess,
    isError,
  } = useGetReportGeneralManagerQuery({});
  const [changeStatusReport] = useChangeStatusReportMutation();
  const [downloadPDF, { isLoading: isDownloadLoading }] =
    useLazyDownloadPDFQuery();

  const changeStatus = async (id: string) => {
    try {
      const result = await changeStatusReport({
        id: id,
        body: { status: "COMPLETED" },
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
        return <Tag color="green-inverse">{value}</Tag>;
      },
    },
    {
      title: "Download",
      width: "1%",
      dataIndex: "pdf",
      align: "center",
      fixed: "right",
      render: (record, data) => {
        return (
          <Tooltip title="Download">
            <Button
              icon={<CloudDownloadOutlined />}
              loading={isDownloadLoading && selectedRow === data.id}
              onClick={() => onDownloadPDF(record, data)}
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
      hidden: !role.accessGeneralManager.includes(auth.role),
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
              title="Approve Report"
              description="Are you sure to approve this report?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => changeStatus(record)}
            >
              <Tooltip title="Approve">
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
        <TitlePage title="To Approve" description="Employee assessment" />
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
