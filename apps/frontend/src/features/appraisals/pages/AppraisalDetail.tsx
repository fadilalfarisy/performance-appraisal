import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Result,
  Spin,
  Card,
  Button,
  Table,
  Tag,
  InputNumber,
  Timeline,
  Modal,
  Form,
  Select,
  Input,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import {
  useGetAppraisalByIdQuery,
  useGetAppraisalHistoryQuery,
  useSaveRatingsMutation,
  useTransitionAppraisalMutation,
} from "@/features/appraisals/appraisalsApi";
import {
  getAvailableActions,
  type AvailableAction,
} from "@/permissions/appraisalPermissions";
import { errorHandling } from "@/utils/errorUtils";
import {
  AppraisalStatus,
  type AppraisalEmployeeResponse,
} from "@appraisal/types";
import { APPRAISAL_STATUS_COLOR as STATUS_COLOR } from "@/features/appraisals/appraisalStatus";

export const AppraisalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const { data, isLoading, isError } =
    useGetAppraisalByIdQuery(id);
  const { data: history } = useGetAppraisalHistoryQuery(id);
  const [saveRatings] = useSaveRatingsMutation();
  const [transition, { isLoading: isTransitioning }] =
    useTransitionAppraisalMutation();

  const [edits, setEdits] = useState<Record<string, number>>({});
  const [modalAction, setModalAction] = useState<AvailableAction | null>(null);
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
  const cellKey = (employeeId: string, criterionId: string) =>
    `${employeeId}:${criterionId}`;

  const handleSave = async () => {
    const ratings = Object.entries(edits).map(([key, rating]) => {
      const [appraisalEmployeeId, criterionId] = key.split(":");
      return { appraisalEmployeeId, criterionId, rating };
    });
    if (ratings.length === 0) return;
    try {
      await saveRatings({ id: id ?? "", body: { ratings } }).unwrap();
      setEdits({});
      message.success("Ratings saved");
    } catch (error) {
      errorHandling(error);
    }
  };

  const runTransition = async (to: AppraisalStatus, comment?: string) => {
    try {
      if (edits && to === AppraisalStatus.SUBMITTED) {
        await handleSave();
      }
      await transition({ id: id ?? "", body: { to, comment } }).unwrap();
      message.success(`Moved to ${to}`);
      setModalAction(null);
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
        const key = cellKey(record.id, criterion.id);
        const serverValue = record.ratings.find(
          (r) => r.criterionId === criterion.id,
        )?.rating;
        if (!canEdit) {
          return serverValue ?? "-";
        }
        return (
          <InputNumber
            min={criterion.scaleMin}
            max={criterion.scaleMax}
            precision={0}
            value={edits[key] ?? serverValue ?? null}
            onChange={(value) =>
              setEdits((prev) => {
                const next = { ...prev };
                if (value === null || value === undefined) {
                  delete next[key];
                } else {
                  next[key] = value as number;
                }
                return next;
              })
            }
          />
        );
      },
    })),
    {
      title: "Total",
      fixed: "right",
      width: 90,
      render: (_, record) => record.totalScore ?? "-",
    },
  ];

  return (
    <>
      <TitlePage
        title={`${appraisal.departmentName ?? "Department"} — ${appraisal.period}`}
        description={`Criteria set v${appraisal.criteriaSetVersion}`}
      >
        <Button
          onClick={() => navigate("/dashboard/appraisals")}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>

      <Tag color={STATUS_COLOR[appraisal.status] ?? "default"}>
        {appraisal.status}
      </Tag>

      {/* <Steps
        size="small"
        current={stepIndex}
        items={STATUS_ORDER.map((status) => ({ title: status }))}
        style={{ marginBottom: 16 }}
      />

      <Space style={{ marginBottom: 16 }} wrap>
        {canEdit && (
          <Button
            type="primary"
            loading={isSaving}
            disabled={dirtyCount === 0}
            onClick={handleSave}
          >
            Save ratings{dirtyCount ? ` (${dirtyCount})` : ""}
          </Button>
        )}
        {actions
          .filter((a) => a.action !== "editRatings")
          .map((available) =>
            available.action === "softDelete" ? (
              <Popconfirm
                key={available.action}
                title="Cancel this DRAFT appraisal?"
                onConfirm={async () => {
                  try {
                    await deleteAppraisal(id ?? "").unwrap();
                    message.success("Appraisal cancelled");
                    navigate("/dashboard/appraisals");
                  } catch (error) {
                    errorHandling(error);
                  }
                }}
              >
                <Button danger>{available.label}</Button>
              </Popconfirm>
            ) : (
              <Button
                key={available.action}
                danger={available.danger}
                loading={isTransitioning}
                onClick={() => onAction(available)}
              >
                {available.label}
              </Button>
            ),
          )}
      </Space> */}

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
