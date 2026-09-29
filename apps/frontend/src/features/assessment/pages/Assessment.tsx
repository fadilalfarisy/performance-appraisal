import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { TableColumnsType } from "antd";
import { Button, Form, Input, Table, message, Select, Result } from "antd";
import { TitlePage } from "@/components";
import {
  useChangeStatusReportMutation,
  useGetAssessQuery,
  useUpdateAssessMutation,
  useGeneratePDFMutation,
  useLazyDownloadPDFQuery,
  useLazyGetDataPerformanceQuery,
} from "../assessmentApi";
import { errorHandling } from "@/utils/errorUtils";

interface DataType {
  NIP: string;
  full_name: string;
  criteria_1: number;
  criteria_2: number;
  criteria_3: number;
  criteria_4: number;
  criteria_5: number;
  criteria_6: number;
  report_id: number;
}

export const Assessment = () => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const [selectedRowKeys, setSelectedRowKeys] = useState("");

  const [getDataPerformance, { data: dataPerformance }] =
    useLazyGetDataPerformanceQuery();
  const {
    data: initialValuesAssess,
    isSuccess: isGetAssessSuccess,
    isError: isGetAssessError,
  } = useGetAssessQuery(id);
  const [updateAsses, { isLoading }] = useUpdateAssessMutation();
  const [changeStatusReport, { isLoading: isLoadingChangeStatus }] =
    useChangeStatusReportMutation();
  const [generatePDF, { isLoading: isLoadingGeneratePDF }] =
    useGeneratePDFMutation();
  const [downloadPDF] = useLazyDownloadPDFQuery();

  const isEditing = (record: DataType) => {
    return record.NIP !== selectedRowKeys;
  };

  const onFinish = async (values: any) => {
    try {
      console.log(values);
      await updateAsses(values).unwrap();
      message.success("Record was created");
      setSelectedRowKeys("");
    } catch (error: any) {
      errorHandling(error);
    }
  };

  const onGeneratePDF = async () => {
    try {
      const fileName = await generatePDF(id).unwrap();
      console.log(fileName);
      downloadPDF(fileName);
    } catch (error) {
      errorHandling(error);
    }
  };

  const changeStatus = async () => {
    try {
      const result = await changeStatusReport({
        id: id,
        body: { status: "ASSESSED" },
      }).unwrap();
      console.log(result);
      navigate(-1);
    } catch (error) {
      errorHandling(error);
    }
  };

  console.log(dataPerformance);

  const columns: TableColumnsType<DataType> = [
    {
      title: "NIP",
      dataIndex: "NIP",
      key: "NIP",
      width: "1%",
    },
    {
      title: "Name",
      dataIndex: "full_name",
      width: "1%",
    },
    {
      title: "C1",
      dataIndex: "criteria_1",
      width: "10%",
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          value
        ) : (
          <>
            <Form.Item
              name="criteria_1"
              rules={[{ required: true, message: "" }]}
            >
              <Select
                allowClear
                options={[
                  { value: 5, label: ">=95%" },
                  { value: 4, label: ">=90%" },
                  { value: 3, label: ">=85%" },
                  { value: 2, label: ">=90%" },
                  { value: 1, label: "<80%" },
                ]}
                placeholder="C1"
              />
            </Form.Item>
            <Form.Item name="NIP" className="hide">
              <Input></Input>
            </Form.Item>
            <Form.Item name="full_name" className="hide">
              <Input></Input>
            </Form.Item>
            <Form.Item name="report_id" className="hide">
              <Input></Input>
            </Form.Item>
            <span style={{ fontSize: "12px" }}>
              {dataPerformance?.quantity.toFixed(2)} / {dataPerformance?.target}{" "}
              = {dataPerformance?.percentage_quantity.toFixed(2)}%
            </span>
          </>
        );
      },
    },
    {
      title: "C2",
      dataIndex: "criteria_2",
      width: "10%",
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          value
        ) : (
          <>
            <Form.Item
              name="criteria_2"
              rules={[{ required: true, message: "" }]}
            >
              <Select
                allowClear
                options={[
                  { value: 5, label: "0%" },
                  { value: 4, label: "<=1%" },
                  { value: 3, label: "<=2%" },
                  { value: 2, label: "<=3%" },
                  { value: 1, label: ">3%" },
                ]}
                placeholder="C2"
              />
            </Form.Item>
            <span style={{ fontSize: "12px" }}>
              {dataPerformance?.quality.toFixed(2)} / {dataPerformance?.target}{" "}
              = {dataPerformance?.percentage_quality.toFixed(2)}%
            </span>
          </>
        );
      },
    },
    {
      title: "C3",
      dataIndex: "criteria_3",
      width: "10%",
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          value
        ) : (
          <>
            <Form.Item
              name="criteria_3"
              rules={[{ required: true, message: "" }]}
            >
              <Select
                allowClear
                options={[
                  { value: 3, label: "Good" },
                  { value: 2, label: "Average" },
                  { value: 1, label: "Bad" },
                ]}
                placeholder="C3"
              />
            </Form.Item>
            <span style={{ fontSize: "12px" }}>
              {dataPerformance?.running_instruction
                ? dataPerformance.running_instruction
                : "-"}
            </span>
          </>
        );
      },
    },
    {
      title: "C4",
      dataIndex: "criteria_4",
      width: "10%",
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          value
        ) : (
          <>
            <Form.Item
              name="criteria_4"
              rules={[{ required: true, message: "" }]}
            >
              <Select
                allowClear
                options={[
                  { value: 5, label: ">=95%" },
                  { value: 4, label: ">=90%" },
                  { value: 3, label: ">=85%" },
                  { value: 2, label: ">=80%" },
                  { value: 1, label: "<80%" },
                ]}
                placeholder="C4"
              />
            </Form.Item>
            <span style={{ fontSize: "12px" }}>
              {Math.round(dataPerformance?.discipline)}%
            </span>
          </>
        );
      },
    },
    {
      title: "C5",
      dataIndex: "criteria_5",
      width: "10%",
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          value
        ) : (
          <>
            <Form.Item
              name="criteria_5"
              rules={[{ required: true, message: "" }]}
            >
              <Select
                allowClear
                options={[
                  { value: 3, label: "Good" },
                  { value: 2, label: "Average" },
                  { value: 1, label: "Bad" },
                ]}
                placeholder="C5"
              />
            </Form.Item>
            <span style={{ fontSize: "12px" }}>
              {dataPerformance?.responsibility
                ? dataPerformance.responsibility
                : "-"}
            </span>
          </>
        );
      },
    },
    {
      title: "C6",
      dataIndex: "criteria_6",
      width: "10%",
      render: (value, record) => {
        const editable = isEditing(record);
        return editable ? (
          value
        ) : (
          <>
            <Form.Item
              name="criteria_6"
              rules={[{ required: true, message: "" }]}
            >
              <Select
                allowClear
                options={[
                  { value: 3, label: "Good" },
                  { value: 2, label: "Average" },
                  { value: 1, label: "Bad" },
                ]}
                placeholder="C6"
              />
            </Form.Item>
            <span style={{ fontSize: "12px" }}>
              {dataPerformance?.religiousity
                ? dataPerformance.religiousity
                : "-"}
            </span>
          </>
        );
      },
    },
    {
      title: "Action",
      width: "1%",
      fixed: "right",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Button
            type="link"
            onClick={() => {
              setSelectedRowKeys(record.NIP);
              getDataPerformance(record.NIP);
              form.setFieldsValue({
                NIP: record.NIP,
                full_name: record.full_name,
                criteria_1: record.criteria_1,
                criteria_2: record.criteria_2,
                criteria_3: record.criteria_3,
                criteria_4: record.criteria_4,
                criteria_5: record.criteria_5,
                criteria_6: record.criteria_6,
                report_id: record.report_id,
              });
            }}
          >
            Edit
          </Button>
        ) : (
          <div>
            <Button
              onClick={() => setSelectedRowKeys("")}
              style={{ margin: "0 6px 6px 0" }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Save
            </Button>
          </div>
        );
      },
    },
  ];

  if (isGetAssessError) {
    return (
      <Result
        status="error"
        title="403 Forbidden"
        subTitle="Oops, Your can't access this page."
      />
    );
  }

  if (isGetAssessSuccess) {
    return (
      <>
        <TitlePage title="Assessment" description="Form employee assessment" />
        <Form form={form} onFinish={onFinish}>
          <Table<DataType>
            columns={columns}
            dataSource={initialValuesAssess}
            scroll={{ x: "max-content" }}
            rowKey="NIP"
            style={{ margin: "36px 0" }}
            size="small"
          />
        </Form>

        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
        >
          <Button
            color="primary"
            variant="outlined"
            loading={isLoadingGeneratePDF}
            onClick={() => onGeneratePDF()}
          >
            Download PDF
          </Button>
          <div>
            <Button
              onClick={() => {
                navigate(-1);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={isLoadingChangeStatus}
              onClick={changeStatus}
              style={{ minWidth: "120px", marginLeft: "16px" }}
            >
              Submit
            </Button>
          </div>
        </div>
      </>
    );
  }
};
