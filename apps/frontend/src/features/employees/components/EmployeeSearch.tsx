import { useMemo } from "react";
import { DatePicker, Form, Input, Select, Space } from "antd";
import type { Dayjs } from "dayjs";
import { useGetDepartmentsQuery } from "@/features/departments";
import { useGetPositionsQuery } from "@/features/position";
import { employeeStatusOption } from "@/constants/option/employee-status";
import { dateFormat } from "@/utils/dateUtils";

export type EmployeeSearchValues = {
  search?: string;
  department?: string;
  position?: string;
  status?: string;
  contractStartFrom?: string;
  contractStartTo?: string;
  contractEndFrom?: string;
  contractEndTo?: string;
};

type Props = {
  onSearch: (values: EmployeeSearchValues) => void;
};

type DateRange = [Dayjs | null, Dayjs | null] | null;

export const EmployeeSearch = ({ onSearch }: Props) => {
  const [form] = Form.useForm();

  const { data: departmentsResponse } = useGetDepartmentsQuery();
  const { data: positionsResponse } = useGetPositionsQuery();

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

  const collectValues = (values: any) => {
    const result: EmployeeSearchValues = {
      search: values.search ?? undefined,
      department: values.department,
      position: values.position,
      status: values.status,
    };
    const startDate: DateRange = values.startDate;
    const endDate: DateRange = values.endDate;
    if (startDate && startDate.length === 2) {
      result.contractStartFrom = startDate[0]?.format(dateFormat);
      result.contractStartTo = startDate[1]?.format(dateFormat);
    }
    if (endDate && endDate.length === 2) {
      result.contractEndFrom = endDate[0]?.format(dateFormat);
      result.contractEndTo = endDate[1]?.format(dateFormat);
    }
    return result;
  };

  const applyFilters = () => {
    onSearch(collectValues(form.getFieldsValue()));
  };

  const handleClearInlineSearch = () => {
    form.setFieldValue("search", undefined);
    applyFilters();
  };

  const handleSelectChange = (name: string, value?: string) => {
    form.setFieldValue(name, value);
    applyFilters();
  };

  const handleRangeChange = (name: "startDate" | "endDate", dates: DateRange) => {
    form.setFieldValue(name, dates);
    applyFilters();
  };

  return (
    <Form form={form} style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap>
          <Space size="small" align="center">
            <span>Start Contract</span>
            <Form.Item name="startDate" style={{ marginBottom: 0 }}>
              <DatePicker.RangePicker
                format={dateFormat}
                placeholder={["Start from", "Start to"]}
                onChange={(dates) =>
                  handleRangeChange("startDate", dates as DateRange)
                }
                style={{ width: 240 }}
              />
            </Form.Item>
          </Space>
          <Space size="small" align="center">
            <span>End Contract</span>
            <Form.Item name="endDate" style={{ marginBottom: 0 }}>
              <DatePicker.RangePicker
                format={dateFormat}
                placeholder={["End from", "End to"]}
                onChange={(dates) =>
                  handleRangeChange("endDate", dates as DateRange)
                }
                style={{ width: 240 }}
              />
            </Form.Item>
          </Space>
        </Space>
        <Space wrap>
          <Form.Item name="search" style={{ marginBottom: 0 }}>
            <Input.Search
              placeholder="Search by employee name or number"
              allowClear
              onClear={handleClearInlineSearch}
              onSearch={applyFilters}
              enterButton
              style={{ width: "clamp(200px, 32vw, 480px)" }}
            />
          </Form.Item>
          <Form.Item name="department" style={{ marginBottom: 0 }}>
            <Select
              placeholder="Department"
              allowClear
              showSearch
              optionFilterProp="label"
              options={departmentOption}
              style={{ width: 180 }}
              onChange={(value) => handleSelectChange("department", value)}
            />
          </Form.Item>
          <Form.Item name="position" style={{ marginBottom: 0 }}>
            <Select
              placeholder="Position"
              allowClear
              showSearch
              optionFilterProp="label"
              options={positionOption}
              style={{ width: 180 }}
              onChange={(value) => handleSelectChange("position", value)}
            />
          </Form.Item>
          <Form.Item name="status" style={{ marginBottom: 0 }}>
            <Select
              placeholder="Status"
              allowClear
              options={employeeStatusOption}
              style={{ width: 160 }}
              onChange={(value) => handleSelectChange("status", value)}
            />
          </Form.Item>
        </Space>
      </Space>
    </Form>
  );
};
