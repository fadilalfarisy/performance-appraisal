import { useState, useMemo } from "react";
import { Button, DatePicker, Drawer, Flex, Form, Input, Select } from "antd";
import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import { useGetDepartmentsQuery } from "@/features/departments";
import { useGetPositionsQuery } from "@/features/position";
import { employeeStatusOption } from "@/constants/option/employee-status";
import { contractStatusOption } from "@/constants/option/contract-status";
import { dateFormat } from "@/utils/dateUtils";

export type EmployeeSearchValues = {
  search?: string;
  departement?: string;
  position?: string;
  status?: string;
  contractStatus?: string;
  startDate?: string[];
  endDate?: string[];
};

type Props = {
  onSearch: (values: EmployeeSearchValues) => void;
  onReset: () => void;
};

export const EmployeeSearch = ({ onSearch, onReset }: Props) => {
  const [form] = Form.useForm();
  const [drawerForm] = Form.useForm();
  const [open, setOpen] = useState(false);

  const { data: departmentsResponse } = useGetDepartmentsQuery({});
  const { data: positionsResponse } = useGetPositionsQuery({});

  const departmentOption = useMemo(() => {
    const departments = departmentsResponse?.data;
    return (Array.isArray(departments) ? departments : []).map((d: any) => ({
      value: d.id,
      label: d.name,
    }));
  }, [departmentsResponse]);

  const positionOption = useMemo(() => {
    const positions = positionsResponse?.data;
    return (Array.isArray(positions) ? positions : []).map((p: any) => ({
      value: p.id,
      label: p.name,
    }));
  }, [positionsResponse]);

  const collectValues = (values: any, startDate: any, endDate: any) => {
    const result: EmployeeSearchValues = {
      search: values.search ?? undefined,
      departement: values.departement,
      position: values.position,
      status: values.status,
      contractStatus: values.contractStatus,
    };
    if (startDate && startDate.length === 2) {
      result.startDate = [
        startDate[0].format(dateFormat),
        startDate[1].format(dateFormat),
      ];
    }
    if (endDate && endDate.length === 2) {
      result.endDate = [
        endDate[0].format(dateFormat),
        endDate[1].format(dateFormat),
      ];
    }
    console.log(result);
    return result;
  };

  const handleInlineSearch = () => {
    const values = form.getFieldsValue();
    const search = values.search == "" ? { search: undefined } : values;
    const current = form.getFieldValue("currentInlineDateRange");
    onSearch(collectValues({ ...values }, current, current));
  };

  const handleClearInlineSearch = () => {
    const values = form.getFieldsValue();
    const search = values.search == "" ? { search: undefined } : values;
    console.log(search);
    onSearch(values);
  };

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const handleApplyFilter = () => {
    const values = form.getFieldsValue();
    const drawerValues = drawerForm.getFieldsValue();
    const startDateRange = drawerValues.startDate;
    const endDateRange = drawerValues.endDate;
    onSearch(
      collectValues(
        { ...values, ...drawerValues },
        startDateRange,
        endDateRange,
      ),
    );
    setOpen(false);
  };

  const handleClearFilter = () => {
    onReset();
    drawerForm.resetFields();
    setOpen(false);
  };

  return (
    <>
      <Flex gap={"middle"} justify="space-between">
        <Form form={form} style={{ flex: 1 }}>
          <Form.Item name="search">
            <Input.Search
              placeholder="Search by NIP or Name"
              allowClear
              onClear={handleClearInlineSearch}
              onSearch={handleInlineSearch}
              enterButton
            />
          </Form.Item>
        </Form>
        <Button
          color="primary"
          variant="outlined"
          icon={<FilterOutlined />}
          onClick={showDrawer}
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
        <Form form={drawerForm} layout="vertical" autoComplete="off">
          <Flex vertical gap="small">
            <Form.Item
              name="departement"
              label={<span style={{ fontWeight: 600 }}>Department</span>}
            >
              <Select
                placeholder="Select Department"
                allowClear
                showSearch
                optionFilterProp="label"
                options={departmentOption}
              />
            </Form.Item>
            <Form.Item
              name="position"
              label={<span style={{ fontWeight: 600 }}>Position</span>}
            >
              <Select
                placeholder="Select Position"
                allowClear
                showSearch
                optionFilterProp="label"
                options={positionOption}
              />
            </Form.Item>
            <Form.Item
              name="status"
              label={<span style={{ fontWeight: 600 }}>Status</span>}
            >
              <Select
                placeholder="Select Status"
                allowClear
                options={employeeStatusOption}
              />
            </Form.Item>
            <Form.Item
              name="contractStatus"
              label={<span style={{ fontWeight: 600 }}>Contract</span>}
            >
              <Select
                placeholder="Select Contract"
                allowClear
                options={contractStatusOption}
              />
            </Form.Item>
            <Form.Item
              name="startDate"
              label={
                <span style={{ fontWeight: 600 }}>Start Contract Range</span>
              }
            >
              <DatePicker.RangePicker
                format={dateFormat}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item
              name="endDate"
              label={
                <span style={{ fontWeight: 600 }}>End Contract Range</span>
              }
            >
              <DatePicker.RangePicker
                format={dateFormat}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Flex justify="end" gap="middle" style={{ marginTop: 16 }}>
              <Button onClick={handleClearFilter}>Clear</Button>
              <Button type="primary" onClick={handleApplyFilter}>
                Apply
              </Button>
            </Flex>
          </Flex>
        </Form>
      </Drawer>
    </>
  );
};
