import React, { useState, useEffect } from "react";
import {
  Button,
  Flex,
  Table,
  Input,
  Select,
  Form,
  DatePicker,
  Drawer,
  Radio,
  Tag,
  message,
} from "antd";
import { FilterOutlined, CloseOutlined } from "@ant-design/icons";
import type { TableColumnsType, TableProps } from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { TitlePage } from "@/components";
import { useGetEmployeeQuery } from "@/features/employees/employeesApi";
import { useCreateReportMutation } from "../assessmentApi";
import { dateFormat, customDateTime } from "@/utils/dateUtils";
import { option } from "@/constants/optionType";
import {
  colorByDepartment,
  colorByGender,
} from "@/constants/roleAccess";

dayjs.extend(isBetween);

type TableRowSelection<T extends object = object> =
  TableProps<T>["rowSelection"];

interface DataType {
  NIP: string;
  full_name: string;
  birth_date: string;
  address: string;
  gender: string;
  position: string;
  department: string;
  contract: {};
}

type QueryType = {
  NIP: string;
  full_name: string;
  department: string[];
};

type FilterForm = {
  gender: string[];
  department: string;
  filter_date: string[];
};

const initialQuery = {
  NIP: "",
  full_name: "",
  department: [],
};

export const InitiateReport = () => {
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);
  const [dataTable, setDataTable] = useState([]);
  const [searchCategory, setSearchCategory] = useState("NIP");
  const [querySearch, setQuerySearch] = useState<QueryType>(initialQuery);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data: initialValueEmployee } = useGetEmployeeQuery({});
  const [createReport, { isLoading }] = useCreateReportMutation();

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const handleChangeSearch = (value: string) => {
    switch (value) {
      case "NIP":
        setSearchCategory("NIP");
        break;
      case "full_name":
        setSearchCategory("full_name");
        break;
      default:
        setSearchCategory("NIP");
    }
  };

  const onSearch = (value: string) => {
    switch (searchCategory) {
      case "NIP":
        setQuerySearch({ ...querySearch, NIP: value, full_name: "" });
        break;
      case "full_name":
        setQuerySearch({ ...querySearch, full_name: value, NIP: "" });
        break;
      default:
        setQuerySearch({ ...querySearch, NIP: value, full_name: "" });
    }
  };

  const onFinishFilter = (values: FilterForm) => {
    if (values.filter_date != undefined) {
      const date = {
        start: customDateTime(values.filter_date[0]),
        end: customDateTime(values.filter_date[1]),
      };

      const tempDateTable = initialValueEmployee.filter((item: any) => {
        return dayjs(item.end_contract).isBetween(
          date.start,
          date.end,
          null,
          "[]"
        );
      });
      setDataTable(tempDateTable);
    } else {
      setDataTable(initialValueEmployee);
    }
    setQuerySearch({
      ...querySearch,
      department: values.department ? [values.department] : [],
    });
    setSelectedRowKeys([]);
    setOpen(false);
  };

  const onClear = () => {
    form.resetFields();
    setQuerySearch({
      ...querySearch,
      department: [],
    });
    setDataTable(initialValueEmployee);
    setOpen(false);
  };

  const start = async () => {
    const department = querySearch.department;

    try {
      if (department.length !== 1) {
        message.error("Please select the department");
      } else {
        const request = {
          department: department[0],
          employee: selectedRowKeys,
        };
        console.log(request);

        await createReport(request).unwrap();
        setSelectedRowKeys([]);
        message.success("Record was created");
      }
    } catch (error) {
      message.error("Something went wrong");
    }
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    console.log("selectedRowKeys changed: ", newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys: selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const selectBefore = (
    <Select
      defaultValue="NIP"
      onChange={handleChangeSearch}
      style={{ width: 90 }}
    >
      <Select.Option value="NIP">NIP</Select.Option>
      <Select.Option value="full_name">Name</Select.Option>
    </Select>
  );

  useEffect(() => {
    if (initialValueEmployee) {
      setDataTable(initialValueEmployee);
    }
  }, [initialValueEmployee]);

  const columns: TableColumnsType<DataType> = [
    {
      title: "NIP",
      dataIndex: "NIP",
      key: "NIP",
      fixed: "left",
      filteredValue: [querySearch.NIP],
      sorter: (a, b) => a.NIP.localeCompare(b.NIP),
      onFilter: (value, record) =>
        record.NIP.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Name",
      dataIndex: "full_name",
      filteredValue: [querySearch.full_name],
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
      filteredValue: querySearch.department,
      onFilter: (value, record) =>
        String(record.department).includes(String(value)),
      render: (value) => {
        const color = colorByDepartment(value);
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: "End Contract",
      dataIndex: "end_contract",
      render: (value) => {
        const formatedDate = dayjs(value).format(dateFormat);
        return `${formatedDate}`;
      },
    },
  ];

  return (
    <>
      <TitlePage title="Initiate Report" description="Select the employee" />

      <Flex
        gap="middle"
        justify="space-between"
        style={{ marginBottom: "16px" }}
      >
        <Input.Search
          placeholder="Search"
          allowClear
          onSearch={onSearch}
          enterButton
          addonBefore={selectBefore}
          style={{ maxWidth: 500 }}
        />
        <Button
          color="primary"
          variant="outlined"
          htmlType="submit"
          icon={<FilterOutlined />}
          onClick={showDrawer}
        >
          Filter
        </Button>
      </Flex>

      <Flex gap={"large"} align="center" style={{ marginBottom: "16px" }}>
        <Button
          type="primary"
          onClick={start}
          disabled={!hasSelected}
          loading={isLoading}
        >
          Submit
        </Button>
        {hasSelected ? `Selected ${selectedRowKeys.length} employee` : null}
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
                <span style={{ fontWeight: 600 }}>Range Date Contract</span>
              }
            >
              <DatePicker.RangePicker></DatePicker.RangePicker>
            </Form.Item>
            <Form.Item
              name={"department"}
              label={<span style={{ fontWeight: 600 }}>Department</span>}
            >
              <Radio.Group
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
                options={option.department}
              ></Radio.Group>
            </Form.Item>
            <Flex justify="end" gap={"middle"}>
              <Button onClick={onClear}>Clear</Button>
              <Button type="primary" htmlType="submit">
                Apply
              </Button>
            </Flex>
          </Flex>
        </Form>
      </Drawer>

      <Table<DataType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataTable}
        scroll={{ x: "max-content" }}
        rowKey="NIP"
      />
    </>
  );
};
