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
import { ContractStatus, ContractType } from "@/constants/enum/contract.enum";
import {
  contractStatusOption,
  contractTypeOption,
} from "@/constants/option/contract-status";
import type { ContractResponse } from "@appraisal/types";

type Props = {
  createForm: boolean;
  formFunction:
    | typeof useCreateContractMutation
    | typeof useUpdateContractMutation;
  initialValues?: Partial<ContractResponse>;
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

  const [queryContract, { isLoading }] = (
    formFunction as unknown as () => [
      (arg: unknown) => { unwrap: () => Promise<unknown> },
      { isLoading: boolean },
    ]
  )();

  useEffect(() => {
    if (!createForm && initialValues) {
      form.setFieldsValue({
        contractType: initialValues.contractType,
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
        contractType: values.contractType,
        status: values.status ?? ContractStatus.ACTIVE,
        startDate: values.startDate
          ? dayjs(values.startDate).format(dateFormat)
          : null,
        endDate:
          values.contractType === ContractType.PERMANENT || !values.endDate
            ? null
            : dayjs(values.endDate).format(dateFormat),
      };

      if (createForm) {
        await queryContract({ employeeId, ...request }).unwrap();
        message.success("Record was created");
        navigate(-1);
      } else {
        await queryContract({ id: contractId, body: request }).unwrap();
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
            ? { contractType: ContractType.PERMANENT, status: ContractStatus.ACTIVE }
            : undefined
        }
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Contract Type"
          name="contractType"
          rules={[{ required: true, message: "Please select a contract type" }]}
        >
          <Select options={contractTypeOption} placeholder="Select type" />
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: "Please select a status" }]}
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
            const currentType = form.getFieldValue("contractType");

            if (currentType === ContractType.PERMANENT) {
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
