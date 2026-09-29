import { useState, useMemo } from "react";
import { Button, DatePicker, Drawer, Flex, Form, Input, Select } from "antd";
import { CloseOutlined, FilterOutlined } from "@ant-design/icons";
import { useGetDepartmentsQuery } from "@/features/departments";
import { useGetPositionsQuery } from "@/features/position";
import { employeeStatusOption } from "@/constants/option/employee-status";
import { contractStatusOption } from "@/constants/option/contract-status";
import { dateFormat } from "@/utils/dateUtils";
import { criteriaTypeOption } from "@/constants/option/criteria-type";

export type CriteriaSearchValues = {
  search?: string;
  departement?: string;
  position?: string;
  status?: string;
  contractStatus?: string;
  startDate?: string[];
  endDate?: string[];
};

type Props = {
  onSearch: (values: CriteriaSearchValues) => void;
  onReset: () => void;
};

export const CriteriaSearch = ({ onSearch, onReset }: Props) => {
  const [form] = Form.useForm();
  const [drawerForm] = Form.useForm();
  const [open, setOpen] = useState(false);

  const collectValues = (values: any) => {
    const result: CriteriaSearchValues = {
      search: values.search,
      departement: values.departement,
      position: values.position,
      status: values.status,
      contractStatus: values.contractStatus,
    };
    console.log(result);
    return result;
  };

  const handleInlineSearch = () => {
    const values = form.getFieldsValue();
    onSearch(collectValues(values));
  };

  const handleClearInlineSearch = () => {
    const values = form.getFieldsValue();
    onSearch({ ...values, search: undefined });
  };

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const handleApplyFilter = () => {
    const values = form.getFieldsValue();
    const drawerValues = drawerForm.getFieldsValue();
    onSearch(collectValues({ ...values, ...drawerValues }));
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
              placeholder="Search by name"
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
                placeholder="Select Type"
                allowClear
                showSearch
                optionFilterProp="label"
                options={criteriaTypeOption}
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
