import { useEffect, useState } from "react";
import { Button, Grid, Layout, Menu, theme } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { UserProfile } from "@/features/users/components/UserProfile";
import { useAppSelector } from "@/app/hooks";
import { filteredMenuByRole } from "@/constants/dashboard-link";

const { Header, Sider, Content } = Layout;

export default function DashboardLayout() {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector((state) => state.auth);
  const { token } = theme.useToken();

  useEffect(() => {
    setCollapsed(screens.sm ? false : true);
  }, [screens]);

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
        trigger={null}
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
            // fontSize: collapsed ? 14 : 18,
            fontSize: 18,
            color: token.colorPrimary,
            // transition: "font-size 0.2s",
            padding: "0 16px",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {!collapsed ? "Performance" : "P"}
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
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            position: "sticky",
            top: 0,
            height: 64,
            zIndex: 99
          }}
        >
          <Button
            type="text"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 8, color: token.colorTextSecondary }}>
              {auth.username}
            </span>
            <UserProfile />
          </div>
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
