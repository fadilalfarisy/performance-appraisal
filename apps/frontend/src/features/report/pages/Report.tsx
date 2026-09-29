import { useState, useEffect } from "react";
import type { TableColumnsType } from "antd";
import {
  Button,
  Table,
  Tag,
  Tooltip,
  Form,
  Drawer,
  Flex,
  DatePicker,
  Checkbox,
  Row,
  Col,
  Result,
} from "antd";
import {
  CloudDownloadOutlined,
  CloseOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { TitlePage } from "@/components";
import { useGetReportCompletedQuery } from "../reportApi";
import { useLazyDownloadPDFQuery } from "@/features/assessment/assessmentApi";
import { dateFormat, customDateTime } from "@/utils/dateUtils";
import { option } from "@/constants/optionType";

dayjs.extend(isBetween);

interface DataType {
  id: string;
  report_date: any;
  department: string;
  status: string;
}

type QueryType = {
  department: string[];
};

export const Report = () => {
  const [form] = Form.useForm();

  const [selectedRow, setSelectedRow] = useState("");
  const [open, setOpen] = useState(false);
  const [dataTable, setDataTable] = useState([]);
  const [querySearch, setQuerySearch] = useState<QueryType>({
    department: [],
  });

  const {
    data: initialValueReport,
    isSuccess,
    isError,
  } = useGetReportCompletedQuery({});
  const [downloadPDF, { isLoading: isDownloadLoading }] =
    useLazyDownloadPDFQuery();

  const onDownloadPDF = async (record: any, data: DataType) => {
    setSelectedRow(data.id);
    downloadPDF(record);
  };

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const onFinishFilter = (values: any) => {
    if (values.filter_date != undefined) {
      const date = {
        start: customDateTime(values.filter_date[0]),
        end: customDateTime(values.filter_date[1]),
      };
      console.log(date);

      const tempDateTable = initialValueReport.filter((item: DataType) => {
        const range_date = dayjs(item.report_date).isBetween(
          date.start,
          date.end,
          "day",
          "[]"
        );
        console.log(range_date);
        return range_date;
      });
      setDataTable(tempDateTable);
    } else {
      setDataTable(initialValueReport);
    }

    setQuerySearch({ department: values.department || [] });
    setOpen(false);
  };

  const onClearFilter = () => {
    form.resetFields();
    setQuerySearch({
      department: [],
    });
    setDataTable(initialValueReport);
    setOpen(false);
  };

  useEffect(() => {
    if (initialValueReport) {
      setDataTable(initialValueReport);
    }
  }, [initialValueReport]);

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
        let color;
        switch (value) {
          case "SEWING":
            color = "cyan";
            break;
          case "CUTTING":
            color = "magenta";
            break;
          case "SAMPLE":
            color = "green";
            break;
          case "QC":
            color = "purple";
            break;
          case "MARKER":
            color = "geekblue";
            break;
          case "FINISHING":
            color = "orange";
            break;
          default:
            color = "cyan";
        }
        return <Tag color={color}>{value}</Tag>;
      },
      filteredValue: querySearch.department,
      onFilter: (value, record) =>
        record.department.indexOf(value as string) === 0,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => {
        return <Tag color="blue-inverse">{value}</Tag>;
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
        <TitlePage
          title="List Report"
          description="Employee assessment"
        ></TitlePage>
        <Flex justify="flex-end">
          <Button
            color="primary"
            variant="outlined"
            htmlType="submit"
            icon={<FilterOutlined />}
            onClick={showDrawer}
            style={{ marginBottom: "24px" }}
          >
            Filter
          </Button>
        </Flex>
        <Drawer
          title="Filter"
          onClose={onClose}
          closable={false}
          open={open}
          extra={<CloseOutlined onClick={onClose} />}
        >
          <Form
            name="basic"
            onFinish={onFinishFilter}
            form={form}
            layout="vertical"
            autoComplete="off"
          >
            <Flex vertical>
              <Form.Item
                name={"filter_date"}
                label={
                  <span style={{ fontWeight: 600 }}>Range Date Report</span>
                }
              >
                <DatePicker.RangePicker
                  format={dateFormat}
                ></DatePicker.RangePicker>
              </Form.Item>

              <Form.Item
                name={"department"}
                label={<span style={{ fontWeight: 600 }}>Department</span>}
              >
                <Checkbox.Group>
                  <Row>
                    {option.department.map((item: any, index: number) => (
                      <Col span={8} key={index}>
                        <Checkbox value={item.value}>{item.label}</Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </Form.Item>
              <Flex justify="end" gap={"middle"}>
                <Button onClick={onClearFilter}>Clear</Button>
                <Button type="primary" htmlType="submit">
                  Apply
                </Button>
              </Flex>
            </Flex>
          </Form>
        </Drawer>

        <Table<DataType>
          columns={columns}
          dataSource={dataTable}
          scroll={{ x: "max-content" }}
          rowKey="id"
        />
      </>
    );
  }
};
