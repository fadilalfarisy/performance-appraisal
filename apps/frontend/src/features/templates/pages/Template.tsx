import { useState } from "react";
import { Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { downloadFile } from "@/api/downloadFile";
import { errorHandling } from "@/utils/errorUtils";
import { templates, type TemplateDefinition } from "../templates";

export const Template = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (record: TemplateDefinition) => {
    setDownloading(record.key);
    try {
      await downloadFile(record.path, undefined, record.fileName);
    } catch (error) {
      errorHandling(error);
    } finally {
      setDownloading(null);
    }
  };

  const columns: TableColumnsType<TemplateDefinition> = [
    {
      title: "Title",
      dataIndex: "title",
      width: "1%",
    },
    {
      title: "Description",
      dataIndex: "description",
    },
    {
      title: "Action",
      key: "action",
      width: "1%",
      fixed: "right",
      render: (_, record) => (
        <Button
          icon={<DownloadOutlined />}
          loading={downloading === record.key}
          onClick={() => handleDownload(record)}
        >
          Template
        </Button>
      ),
    },
  ];

  return (
    <>
      <TitlePage
        title="List Templates"
        description="Excel templates for every import module"
      />
      <Table<TemplateDefinition>
        columns={columns}
        dataSource={templates}
        rowKey="key"
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </>
  );
};
