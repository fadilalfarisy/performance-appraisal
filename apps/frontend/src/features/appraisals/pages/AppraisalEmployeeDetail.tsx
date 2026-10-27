import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Result,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useAppSelector } from "@/app/hooks";
import { hasAccess, roles } from "@/constants/role-access";
import { getAvailableActions } from "@/permissions/appraisalPermissions";
import {
  useGetAppraisalEmployeeQuery,
  useSaveRatingsMutation,
} from "../appraisalsApi";
import { errorHandling } from "@/utils/errorUtils";
import { formatDate } from "@/utils/dateUtils";
import { APPRAISAL_STATUS_COLOR } from "../appraisalStatus";

type AssessmentForm = {
  ratings?: Record<string, number | null>;
  comment?: string;
};

export const AppraisalEmployeeDetail = () => {
  const { id, appraisalEmployeeId } = useParams();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const { message } = App.useApp();

  const [form] = Form.useForm<AssessmentForm>();
  const allowed = hasAccess(roles.headDepartment, auth.role);

  const { data, isLoading, isError } = useGetAppraisalEmployeeQuery(
    {
      id: id ?? "",
      appraisalEmployeeId: appraisalEmployeeId ?? "",
    },
    { skip: !allowed || !id || !appraisalEmployeeId },
  );
  const [saveRatings, { isLoading: isSaving }] = useSaveRatingsMutation();

  const detail = data?.data;
  const appraisal = detail?.appraisal;
  const employee = detail?.employee;

  useEffect(() => {
    if (!detail) return;

    const ratings: Record<string, number> = {};
    for (const rating of detail.employee.ratings) {
      ratings[rating.criterionId] = rating.rating;
    }
    form.setFieldsValue({
      ratings,
      comment: detail.employee.comment ?? "",
    });
  }, [detail, form]);

  const canEdit = useMemo(
    () =>
      appraisal
        ? getAvailableActions(auth.role, appraisal.status).some(
            (action) => action.action === "editRatings",
          )
        : false,
    [appraisal, auth.role],
  );

  if (!allowed) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="Only Head Department and Admin can open the employee assessment."
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Not found"
        subTitle="You can't access this employee assessment."
      />
    );
  }

  if (isLoading || !detail || !appraisal || !employee) {
    return <Spin />;
  }

  const handleFinish = async (values: AssessmentForm) => {
    const ratings = detail.criteria
      .map((criterion) => ({
        appraisalEmployeeId: employee.id,
        criterionId: criterion.id,
        rating: values.ratings?.[criterion.id],
      }))
      .filter(
        (row): row is {
          appraisalEmployeeId: string;
          criterionId: string;
          rating: number;
        } => row.rating !== null && row.rating !== undefined,
      );

    try {
      await saveRatings({
        id: id ?? "",
        body: {
          ratings,
          comments: [
            {
              appraisalEmployeeId: employee.id,
              comment: values.comment ?? "",
            },
          ],
        },
      }).unwrap();
      message.success("Assessment saved");
    } catch (error) {
      errorHandling(error);
    }
  };

  return (
    <>
      <TitlePage
        title={`${employee.employeeName} — ${formatDate(appraisal.period)}`}
        description={`Criteria set v${appraisal.criteriaSetVersion}`}
      >
        <Button
          onClick={() => navigate(`/dashboard/appraisals/${id}`)}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
      </TitlePage>

      <Space style={{ marginBottom: 16 }} wrap>
        <Tag color={APPRAISAL_STATUS_COLOR[appraisal.status] ?? "default"}>
          {appraisal.status}
        </Tag>
        <Tag>{appraisal.departmentName ?? "Department"}</Tag>
      </Space>

      <Card title="Employee" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Employee No">
            {employee.employeeNumber || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Name">
            {employee.employeeName || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Department">
            {employee.departmentName ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Position">
            {employee.positionName ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Contract type">
            {employee.contractType ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Contract period">
            {formatDate(employee.contractStartDate)} –{" "}
            {formatDate(employee.contractEndDate)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Daily note sum" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small">
          <Statistic
            value={employee.dailyNoteSum ?? "-"}
            suffix={
              <Typography.Text type="secondary">
                informational only
              </Typography.Text>
            }
          />
          <Typography.Text type="secondary">
            {employee.contractStartDate && employee.contractEndDate
              ? `From contract start ${formatDate(
                  employee.contractStartDate,
                )} to contract end ${formatDate(employee.contractEndDate)}.`
              : "Contract window is unavailable for this appraisal employee."}
          </Typography.Text>
        </Space>
      </Card>

      {!canEdit && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Assessment is read-only"
          description="Ratings can only be changed while the appraisal is PENDING."
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {detail.criteria.map((criterion) => (
          <Card
            key={criterion.id}
            title={`${criterion.name} (${criterion.weight}%)`}
            style={{ marginBottom: 12 }}
          >
            <Space align="start" size="large" wrap>
              <Form.Item
                label={`Rating (${criterion.scaleMin}–${criterion.scaleMax})`}
                name={["ratings", criterion.id]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={criterion.scaleMin}
                  max={criterion.scaleMax}
                  precision={0}
                  disabled={!canEdit}
                  style={{ width: 120 }}
                />
              </Form.Item>

              <div>
                <Typography.Text strong>Rating scale</Typography.Text>
                <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                  {[...criterion.scaleDescriptions]
                    .sort((a, b) => a.score - b.score)
                    .map((scale) => (
                      <li key={scale.score}>
                        <Typography.Text strong>{scale.score}</Typography.Text>{" "}
                        — {scale.description}
                      </li>
                    ))}
                </ul>
              </div>
            </Space>
          </Card>
        ))}

        <Card title="Comment" style={{ marginBottom: 16 }}>
          <Form.Item name="comment" style={{ marginBottom: 0 }}>
            <Input.TextArea
              rows={3}
              disabled={!canEdit}
              placeholder="Optional comment for this employee"
            />
          </Form.Item>
        </Card>

        {canEdit && (
          <Button
            type="primary"
            htmlType="submit"
            loading={isSaving}
            icon={<SaveOutlined />}
          >
            Save assessment
          </Button>
        )}
      </Form>
    </>
  );
};
