import { useEffect, useMemo, useState } from "react";
import { Form, Input, message, Result, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { FormButton } from "@/components";
import { useGetPermissionsQuery } from "@/features/permissions";
import { errorHandling } from "@/utils/errorUtils";
import { useCreateRoleMutation, useUpdateRoleMutation } from "../rolesApi";

type Permission = {
  id?: string;
  permissionId?: string;
  name: string;
  description?: string;
};

type RoleInitialValues = {
  name?: string;
  description?: string;
  permissions?: Permission[];
};

type Props = {
  createForm: boolean;
  formFunction: typeof useCreateRoleMutation | typeof useUpdateRoleMutation;
  initialValues?: RoleInitialValues;
};

const { Title, Text } = Typography;

export const RoleForm = ({
  createForm,
  formFunction,
  initialValues,
}: Props) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<
    React.Key[]
  >([]);

  const [queryRole, { isLoading }] = formFunction();
  const {
    data: permissionsResponse,
    isError: isPermissionError,
    isSuccess: isPermissionSuccess,
  } = useGetPermissionsQuery({});

  const permissions = useMemo(() => {
    const permissionData = permissionsResponse?.data || [];

    return permissionData.map((permission: Permission) => ({
      id: permission.id,
      name: permission.name,
      description: permission.description,
    }));
  }, [permissionsResponse]);

  useEffect(() => {
    if (!createForm && initialValues?.permissions) {
      setSelectedPermissionIds(
        initialValues.permissions
          .map((permission) => permission.id)
          .filter(Boolean) as string[],
      );
    }
  }, [createForm, initialValues]);

  const columns: TableColumnsType<Permission> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Permission",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value) => value || "-",
    },
  ];

  const onFinish = async (values: any) => {
    const body = {
      name: values.name,
      description: values.description,
      permissions: selectedPermissionIds,
    };

    try {
      if (createForm) {
        await queryRole(body).unwrap();
        message.success("Record was created");
        form.resetFields();
        setSelectedPermissionIds([]);
      }
      if (!createForm) {
        await queryRole({ id, body }).unwrap();
        message.success("Record was updated");
        navigate(-1);
      }
    } catch (err: any) {
      errorHandling(err);
    }
  };

  const onFinishFailed = (error: any) => {
    console.log("Received values of form: ", error);
  };

  if (isPermissionError) {
    return (
      <Result
        status="error"
        title="Something Error"
        subTitle="Permission data could not be loaded."
      />
    );
  }

  return (
    <>
      <Form
        name={createForm ? "Create Role" : "Update Role"}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        form={form}
        initialValues={createForm ? {} : { ...initialValues }}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          label="Name"
          name="name"
          hasFeedback
          rules={[{ required: true, whitespace: true }]}
        >
          <Input placeholder="HR" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          hasFeedback
          rules={[{ required: true, whitespace: true }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Contract management and employee review"
          />
        </Form.Item>
      </Form>

      <div style={{ marginBottom: "24px" }}>
        <Title level={5}>Permissions</Title>
        <Text type="secondary">Select permissions for this role.</Text>
      </div>

      <Table<Permission>
        columns={columns}
        dataSource={permissions}
        loading={!isPermissionSuccess}
        pagination={false}
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedPermissionIds,
          onChange: setSelectedPermissionIds,
        }}
        scroll={{ x: "max-content" }}
        style={{ marginBottom: "24px" }}
      />

      <FormButton
        submitName={createForm ? "Save" : "Update"}
        form={form}
        isLoading={isLoading}
      />
    </>
  );
};
