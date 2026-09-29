import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, DatePicker, Select, message } from "antd";
import dayjs from "dayjs";
import {
  useCreateContractMutation,
  useUpdateContractMutation,
} from "../contractApi";
import { errorHandling } from "@/utils/errorUtils";
import { dateFormat } from "@/utils/dateUtils";
import { FormButton } from "@/components";
import { ContractStatus } from "@/constants/enum/contract.enum";
import { contractStatusOption } from "@/constants/option/contract-status";

type IContract = {
  status?: string;
  startDate?: string;
  endDate?: string | null;
};

type Props = {
  createForm: boolean;
  formFunction:
    | typeof useCreateContractMutation
    | typeof useUpdateContractMutation;
  initialValues?: IContract;
  employeeId?: string;
  contractId?: string;
};

export const ContractForm = ({
  createForm,
  formFunction,
  initialValues,
  employeeId,
  contractId,
}: Props) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [queryContract, { isLoading }] = formFunction();

  useEffect(() => {
    if (!createForm && initialValues) {
      form.setFieldsValue({
        status: initialValues.status,
        startDate: initialValues.startDate
          ? dayjs(initialValues.startDate, dateFormat)
          : null,
        endDate: initialValues.endDate
          ? dayjs(initialValues.endDate, dateFormat)
          : null,
      });
    }
  }, [createForm, form, initialValues]);

  const onFinish = async (values: any) => {
    try {
      const request = {
        status: values.status,
        startDate: values.startDate
          ? dayjs(values.startDate).format(dateFormat)
          : null,
        endDate:
          values.status === ContractStatus.PERMANENT
            ? null
            : values.endDate
              ? dayjs(values.endDate).format(dateFormat)
              : null,
      };

      if (createForm) {
        await queryContract({ id: employeeId, body: request }).unwrap();
        message.success("Record was created");
        navigate(-1);
      }

      if (!createForm) {
        await queryContract({
          id: employeeId,
          contractId,
          body: request,
        }).unwrap();
        message.success("Record was updated");
        navigate(-1);
      }
    } catch (error: any) {
      errorHandling(error);
    }
  };

  return (
    <>
      <Form
        name={createForm ? "createContract" : "updateContract"}
        onFinish={onFinish}
        form={form}
        initialValues={
          createForm
            ? {
                status: ContractStatus.CONTRACT,
              }
            : undefined
        }
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Status"
          name="status"
          rules={[
            { required: true, message: "Please select a contract status" },
          ]}
        >
          <Select options={contractStatusOption} placeholder="Select status" />
        </Form.Item>

        <Form.Item
          label="Start Date"
          name="startDate"
          rules={[{ required: true, message: "Please select a start date" }]}
        >
          <DatePicker format={dateFormat} placeholder="Start Date" />
        </Form.Item>

        <Form.Item shouldUpdate noStyle>
          {() => {
            const currentStatus = form.getFieldValue("status");

            if (currentStatus === ContractStatus.PERMANENT) {
              return null;
            }

            return (
              <Form.Item
                label="End Date"
                name="endDate"
                rules={[
                  { required: true, message: "Please select an end date" },
                ]}
              >
                <DatePicker format={dateFormat} placeholder="End Date" />
              </Form.Item>
            );
          }}
        </Form.Item>
      </Form>

      <FormButton
        submitName={createForm ? "Save" : "Update"}
        form={form}
        isLoading={isLoading}
      />
    </>
  );
};
