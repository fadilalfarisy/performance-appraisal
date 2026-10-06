import { useState } from "react";
import { Modal, Button, Alert, Upload, App } from "antd";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import { store } from "@/app/store";
import { downloadFile } from "@/api/downloadFile";
import { errorHandling } from "@/utils/errorUtils";
import type { ImportFirstError, ImportResult } from "@appraisal/types";

const baseUrl = import.meta.env.VITE_HOST_API;

type Props = {
  open: boolean;
  title?: string;
  templatePath?: string;
  uploadEndpoint: string;
  onClose: () => void;
  onSuccess?: (result: ImportResult) => void;
};

export const ImportModal = ({
  open,
  title = "Import",
  templatePath,
  uploadEndpoint,
  onClose,
  onSuccess,
}: Props) => {
  const { message } = App.useApp();
  const [file, setFile] = useState<UploadFile | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<ImportFirstError | null>(null);

  const reset = () => {
    setFile(null);
    setFileList([]);
    setError(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      if (templatePath) {
        await downloadFile(templatePath, undefined, "template.xlsx");
      }
    } catch (err) {
      errorHandling(err);
    }
  };

  const handleUpload = async () => {
    if (!file?.originFileObj) return;
    setUploading(true);
    setError(null);
    try {
      const token = store.getState().auth.accessToken;
      const form = new FormData();
      form.append("file", file.originFileObj as File);
      const response = await fetch(`${baseUrl}${uploadEndpoint}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const body = await response.json();
      if (!response.ok) {
        const details = body?.details as ImportFirstError | undefined;
        setError(
          details && details.row
            ? details
            : { row: 0, column: "", message: body?.message ?? "Import failed" },
        );
        return;
      }
      message.success(
        `Imported: ${body.data.created} created, ${body.data.updated} updated, ${body.data.skipped} skipped`,
      );
      onSuccess?.(body.data as ImportResult);
      reset();
      onClose();
    } catch (err) {
      errorHandling(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={() => {
        reset();
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={uploading}
          disabled={!file}
          onClick={handleUpload}
        >
          Import
        </Button>,
      ]}
    >
      {templatePath && (
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
          style={{ marginBottom: 12 }}
        >
          Download template
        </Button>
      )}

      <Upload.Dragger
        accept=".xlsx"
        maxCount={1}
        fileList={fileList}
        beforeUpload={(selected) => {
          setFile(selected);
          setFileList([selected]);
          return false;
        }}
        onRemove={() => {
          setFile(null);
          setFileList([]);
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag an .xlsx file here</p>
      </Upload.Dragger>

      {error && (
        <Alert
          type="error"
          style={{ marginTop: 12 }}
          showIcon
          message="The file was not imported. Fix this error and upload again."
          description={
            <>
              Row {error.row}, column {error.column}: {error.message}
            </>
          }
        />
      )}
    </Modal>
  );
};
