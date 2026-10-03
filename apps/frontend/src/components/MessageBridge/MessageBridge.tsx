import { App } from "antd";
import { useEffect } from "react";
import { setMessageApi } from "@/utils/message";

/**
 * Publishes the Ant Design App message instance so non-component code (like the
 * error handler) can show messages that follow the theme.
 */
export const MessageBridge = () => {
  const { message } = App.useApp();

  useEffect(() => {
    setMessageApi(message);
  }, [message]);

  return null;
};
