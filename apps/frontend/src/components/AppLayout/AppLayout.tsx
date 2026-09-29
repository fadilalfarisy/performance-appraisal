import { App } from "antd";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <App>
      <Outlet />
    </App>
  );
}
