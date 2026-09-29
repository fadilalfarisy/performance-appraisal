import { useState } from "react";
import { Layout, Menu, theme } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { UserProfile } from "@/features/users/components/UserProfile";
import { useAppSelector } from "@/app/hooks";
import { filteredMenuByRole } from "@/constants/dashboardLink";

const { Header, Sider, Content } = Layout;

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector((state) => state.auth);
  const { token } = theme.useToken();

  const filteredItems = filteredMenuByRole(auth.role)

  const selectedKey = filteredItems
    .map((i) => i.key)
    .filter((k) => location.pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0] ?? "";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          background: token.colorBgContainer,
          boxShadow: "2px 0 8px rgba(0,0,0,0.06)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: collapsed ? 14 : 18,
            color: token.colorPrimary,
            transition: "font-size 0.2s",
            padding: "0 16px",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {!collapsed && "Performance"}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={filteredItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            background: token.colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            position: "sticky",
            top: 0,
            height: 64,
            zIndex: 99
          }}
        >
          <span style={{ marginRight: 8, color: token.colorTextSecondary }}>
            {auth.username}
          </span>
          <UserProfile />
        </Header>
        <Content
          style={{
            margin: "16px",
            padding: "16px",
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
