import { Descriptions, Dropdown, Modal, Avatar, message } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { deleteAuth } from "@/features/auth/authSlice";
import { useLazyLogoutQuery } from "@/features/auth/authApi";
import { apiSlice } from "@/api/apiSlice";
import { errorHandling } from "@/utils/errorUtils";
import { useAppDispatch, useAppSelector } from "@/app/hooks";

export const UserProfile = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const [logout] = useLazyLogoutQuery();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const items: MenuProps["items"] = [
    {
      key: "user-profile-link",
      label: "Profile",
      icon: <UserOutlined />,
      onClick: showModal,
    },
    {
      type: "divider",
    },
    {
      key: "user-logout-link",
      label: "Logout",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: async () => {
        dispatch(deleteAuth());
        localStorage.removeItem("auth");
        dispatch(apiSlice.util.resetApiState());
        navigate("/");

        try {
          await logout({}).unwrap();
          message.success("Logout was success");
        } catch (error) {
          errorHandling(error);
        }
      },
    },
  ];

  return (
    <>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Avatar
          icon={<UserOutlined />}
          style={{ backgroundColor: "rgb(200, 200, 200)", marginRight: 16 }}
        />
      </Dropdown>

      <Modal
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null}
      >
        <Descriptions layout="vertical" size={"small"} title="User Info">
          <Descriptions.Item label="Full Name">
            {auth.username}
          </Descriptions.Item>
          <Descriptions.Item label="Role">{auth.role}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </>
  );
};
