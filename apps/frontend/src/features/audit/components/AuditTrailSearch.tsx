import { useMemo } from "react";
import { DatePicker, Form, Input, Select, Space } from "antd";
import type { Dayjs } from "dayjs";
import type { AuditLogQuery } from "@appraisal/types";
import { useGetUserQuery } from "@/features/users";
import { dateFormat } from "@/utils/dateUtils";
import { AUDIT_ACTION_OPTIONS } from "../auditActions";

export type AuditTrailFilters = Omit<
  AuditLogQuery,
  "page" | "limit" | "orderBy"
>;

type Props = {
  onSearch: (values: AuditTrailFilters) => void;
};

type DateRange = [Dayjs | null, Dayjs | null] | null;

export const AuditTrailSearch = ({ onSearch }: Props) => {
  const [form] = Form.useForm();
  const { data: usersResponse } = useGetUserQuery();

  const userOptions = useMemo(
    () =>
      (usersResponse?.data ?? []).map((user) => ({
        value: user.id,
        label: user.username,
      })),
    [usersResponse],
  );

  const collectValues = () => {
    const values = form.getFieldsValue();
    const range = values.range as DateRange | undefined;

    const filters: AuditTrailFilters = {
      userId: values.userId ?? undefined,
      entity: values.entity?.trim() || undefined,
      entityId: values.entityId?.trim() || undefined,
      action: values.action ?? undefined,
      actorType: values.actorType ?? undefined,
      search: values.search?.trim() || undefined,
    };

    if (range?.[0]) {
      filters.occurredFrom = range[0].format(dateFormat);
    }
    if (range?.[1]) {
      filters.occurredTo = range[1].format(dateFormat);
    }

    return filters;
  };

  const applyFilters = () => {
    onSearch(collectValues());
  };

  const handleClearSearch = () => {
    form.setFieldValue("search", undefined);
    applyFilters();
  };

  const handleClearText = (value: string) => {
    if (!value) applyFilters();
  };

  const handleChange = (name: keyof AuditTrailFilters, value?: string) => {
    form.setFieldValue(name, value);
    applyFilters();
  };

  const handleRangeChange = (dates: DateRange) => {
    form.setFieldValue("range", dates);
    applyFilters();
  };

  return (
    <Form form={form} style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap>
          <Form.Item name="range" style={{ marginBottom: 0 }}>
            <DatePicker.RangePicker
              format={dateFormat}
              placeholder={["From", "To"]}
              onChange={(dates) => handleRangeChange(dates as DateRange)}
              style={{ width: 240 }}
            />
          </Form.Item>
          <Form.Item name="userId" style={{ marginBottom: 0 }}>
            <Select
              placeholder="User"
              allowClear
              showSearch
              optionFilterProp="label"
              options={userOptions}
              style={{ width: 180 }}
              onChange={(value) => handleChange("userId", value)}
            />
          </Form.Item>
          <Form.Item name="actorType" style={{ marginBottom: 0 }}>
            <Select
              placeholder="Actor type"
              allowClear
              options={[
                { value: "USER", label: "USER" },
                { value: "SYSTEM", label: "SYSTEM" },
              ]}
              style={{ width: 140 }}
              onChange={(value) => handleChange("actorType", value)}
            />
          </Form.Item>
        </Space>
        <Space wrap>
          <Form.Item name="entity" style={{ marginBottom: 0 }}>
            <Input
              placeholder="Entity (e.g. user)"
              allowClear
              style={{ width: 160 }}
              onPressEnter={applyFilters}
              onChange={(event) => handleClearText(event.target.value)}
            />
          </Form.Item>
          <Form.Item name="entityId" style={{ marginBottom: 0 }}>
            <Input
              placeholder="Entity id"
              allowClear
              style={{ width: 180 }}
              onPressEnter={applyFilters}
              onChange={(event) =>
                handleClearText(event.target.value)
              }
            />
          </Form.Item>
          <Form.Item name="action" style={{ marginBottom: 0 }}>
            <Select
              placeholder="Action"
              allowClear
              showSearch
              optionFilterProp="label"
              options={AUDIT_ACTION_OPTIONS}
              style={{ width: 240 }}
              onChange={(value) => handleChange("action", value)}
            />
          </Form.Item>
          <Form.Item name="search" style={{ marginBottom: 0 }}>
            <Input.Search
              placeholder="Search username, employee number, or entity id"
              allowClear
              onClear={handleClearSearch}
              onSearch={applyFilters}
              enterButton
              style={{ width: "clamp(260px, 36vw, 520px)" }}
            />
          </Form.Item>
        </Space>
      </Space>
    </Form>
  );
};
