import { App } from "antd";
import { Outlet } from "react-router-dom";
import { MessageBridge } from "@/components/MessageBridge/MessageBridge";

export default function AppLayout() {
  return (
    <App>
      <MessageBridge />
      <Outlet />
    </App>
  );
}
