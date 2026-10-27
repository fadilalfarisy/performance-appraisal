import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Result,
  Spin,
  Card,
  Button,
  Table,
  Tag,
  Timeline,
  Modal,
  Form,
  Select,
  Input,
  Space,
  Popconfirm,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { downloadFile } from "@/api/downloadFile";
import {
  useDeleteAppraisalMutation,
  useGetAppraisalByIdQuery,
  useGetAppraisalHistoryQuery,
  useTransitionAppraisalMutation,
} from "@/features/appraisals/appraisalsApi";
import {
  getAvailableActions,
  type AvailableAction,
} from "@/permissions/appraisalPermissions";
import { hasAccess, roles } from "@/constants/role-access";
import { errorHandling } from "@/utils/errorUtils";
import {
  AppraisalStatus,
  type AppraisalEmployeeResponse,
} from "@appraisal/types";
import { APPRAISAL_STATUS_COLOR as STATUS_COLOR } from "@/features/appraisals/appraisalStatus";

const TRANSITION_TARGETS: Partial<
  Record<AvailableAction["action"], AppraisalStatus>
> = {
  moveToPending: AppraisalStatus.PENDING,
  submit: AppraisalStatus.SUBMITTED,
  approve: AppraisalStatus.APPROVED,
  complete: AppraisalStatus.COMPLETE,
};

const HIDDEN_ACTIONS: AvailableAction["action"][] = [
  "editRatings",
  "importRatings",
  "editEmployeeList",
];

export const AppraisalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const { data, isLoading, isError } =
    useGetAppraisalByIdQuery(id);
  const { data: history } = useGetAppraisalHistoryQuery(id);
  const [deleteAppraisal] = useDeleteAppraisalMutation();
  const [transition, { isLoading: isTransitioning }] =
    useTransitionAppraisalMutation();

  const [modalAction, setModalAction] = useState<AvailableAction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [form] = Form.useForm();

  const appraisal = data?.data;
  const actions = useMemo(
    () => (appraisal ? getAvailableActions(auth.role, appraisal.status) : []),
    [appraisal, auth.role],
  );

  if (isError) {
    return <Result status="error" title="Not found" subTitle="You can't access this appraisal." />;
  }
  if (isLoading || !appraisal) {
    return <Spin />;
  }

  const canEdit = actions.some((a) => a.action === "editRatings");
  const canOpenDetail = hasAccess(roles.headDepartment, auth.role);
  const canExport =
    appraisal.status === AppraisalStatus.COMPLETE &&
    hasAccess(roles.appraisalResultExport, auth.role);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadFile(
        `/appraisals/${id}/export-result`,
        undefined,
        `appraisal-${appraisal.period}.xlsx`,
      );
    } catch (error) {
      errorHandling(error);
    } finally {
      setIsExporting(false);
    }
  };

  const runTransition = async (to: AppraisalStatus, comment?: string) => {
    try {
      await transition({ id: id ?? "", body: { to, comment } }).unwrap();
      message.success(`Moved to ${to}`);
      setModalAction(null);
    } catch (error) {
      errorHandling(error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAppraisal(id ?? "").unwrap();
      message.success("Appraisal cancelled");
      navigate("/dashboard/appraisals");
    } catch (error) {
      errorHandling(error);
    }
  };

  const columns: TableColumnsType<AppraisalEmployeeResponse> = [
    {
      title: "Employee",
      fixed: "left",
      width: 220,
      render: (_, record) => `${record.employeeNumber} — ${record.employeeName}`,
    },
    ...appraisal.criteria.map((criterion) => ({
      title: `${criterion.name} (${criterion.weight}%)`,
      width: 120,
      render: (_: unknown, record: AppraisalEmployeeResponse) => {
        const value = record.ratings.find(
          (rating) => rating.criterionId === criterion.id,
        )?.rating;
        return value ?? "-";
      },
    })),
    {
      title: "Total",
      width: 90,
      render: (_, record) => record.totalScore ?? "-",
    },
    ...(canOpenDetail
      ? [
          {
            title: "Action",
            width: "1%",
            fixed: "right" as const,
            render: (_: unknown, record: AppraisalEmployeeResponse) => (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() =>
                  navigate(
                    `/dashboard/appraisals/${id}/employees/${record.id}`,
                  )
                }
              >
                {canEdit ? "Edit assessment" : "View assessment"}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <TitlePage
        title={`${appraisal.departmentName ?? "Department"} — ${appraisal.period}`}
        description={`Criteria set v${appraisal.criteriaSetVersion}`}
      >
        <Space>
          {canExport && (
            <Button
              icon={<DownloadOutlined />}
              loading={isExporting}
              onClick={handleExport}
            >
              Export result
            </Button>
          )}
          <Button
            onClick={() => navigate("/dashboard/appraisals")}
            icon={<ArrowLeftOutlined />}
          >
            Back
          </Button>
        </Space>
      </TitlePage>

      <Tag color={STATUS_COLOR[appraisal.status] ?? "default"}>
        {appraisal.status}
      </Tag>

      <Space style={{ marginBottom: 16 }} wrap>
        {actions
          .filter((available) => !HIDDEN_ACTIONS.includes(available.action))
          .map((available) => {
            if (available.action === "softDelete") {
              return (
                <Popconfirm
                  key={available.action}
                  title="Cancel this DRAFT appraisal?"
                  onConfirm={handleDelete}
                >
                  <Button color="danger" variant="solid">
                    {available.label}
                  </Button>
                </Popconfirm>
              );
            }
            if (available.commentRequired) {
              return (
                <Button
                  key={available.action}
                  danger={available.danger}
                  onClick={() => {
                    form.resetFields();
                    setModalAction(available);
                  }}
                >
                  {available.label}
                </Button>
              );
            }
            const target = TRANSITION_TARGETS[available.action];
            if (!target) return null;
            return (
              <Popconfirm
                key={available.action}
                title={`${available.label}?`}
                onConfirm={() => runTransition(target)}
              >
                <Button
                  type="primary"
                  danger={available.danger}
                  loading={isTransitioning}
                >
                  {available.label}
                </Button>
              </Popconfirm>
            );
          })}
      </Space>

      <Table<AppraisalEmployeeResponse>
        columns={columns}
        dataSource={appraisal.employees}
        rowKey="id"
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Card title="Status history" style={{ marginTop: 16 }}>
        <Timeline
          items={(history?.data ?? []).map((entry) => ({
            children: (
              <span>
                <b>
                  {entry.fromStatus ?? "—"} → {entry.toStatus}
                </b>{" "}
                ({entry.action}) {entry.comment ? `— ${entry.comment}` : ""}
                <br />
                <small>{new Date(entry.createdAt).toLocaleString()}</small>
              </span>
            ),
          }))}
        />
      </Card>

      <Modal
        title={modalAction?.label}
        open={Boolean(modalAction)}
        onCancel={() => setModalAction(null)}
        onOk={async () => {
          const values = await form.validateFields();
          const to =
            modalAction?.action === "reopen"
              ? AppraisalStatus.APPROVED
              : values.to;
          await runTransition(to, values.comment);
        }}
        confirmLoading={isTransitioning}
        okText={modalAction?.label}
      >
        <Form form={form} layout="vertical">
          {modalAction?.action === "sendBack" && (
            <Form.Item label="Return to" name="to" rules={[{ required: true }]}>
              <Select
                options={(modalAction.targets ?? []).map((t) => ({
                  value: t,
                  label: t,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item label="Comment" name="comment" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
