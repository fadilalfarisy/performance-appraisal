import { useNavigate } from "react-router-dom";
import { Space, Tooltip, Popconfirm, Button, message } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { PopconfirmProps } from "antd";
import { errorHandling } from "@/utils/errorUtils";

type BaseProps = {
  id: number;
};

type EditProps =
  | { isEditButton?: true; linkEditButton: string }
  | { isEditButton: false; linkEditButton?: never };

type DeleteProps =
  | { isDeleteButton?: true; deleteFunction: any }
  | { isDeleteButton: false; deleteFunction?: never };

type Props = BaseProps & EditProps & DeleteProps;

export const ActionTable = ({
  id,
  linkEditButton,
  deleteFunction,
  isEditButton = true,
  isDeleteButton = true,
}: Props) => {
  const navigate = useNavigate();

  const confirm: PopconfirmProps["onConfirm"] = async () => {
    try {
      await deleteFunction(id).unwrap();
      message.success("Record was deleted");
    } catch (error: any) {
      errorHandling(error);
    }
  };

  return (
    <Space>
      {isEditButton && (
        <Tooltip title="Edit">
          <Button
            size={"small"}
            icon={<EditOutlined />}
            onClick={() => {
              navigate(linkEditButton as string);
            }}
          />
        </Tooltip>
      )}
      {isDeleteButton && (
        <Tooltip title="Delete">
          <Popconfirm
            title="Delete Record"
            description="Are you sure to delete this record?"
            onConfirm={confirm}
            okText="Yes"
            cancelText="No"
          >
            <Button
              color="danger"
              variant="solid"
              size="small"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Tooltip>
      )}
    </Space>
  );
};
