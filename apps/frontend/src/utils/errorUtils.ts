import { message as staticMessage } from "antd";
import type { ApiError } from "@appraisal/types";
import { getMessageApi } from "./message";

export const errorHandling = (error: unknown) => {
  console.error(error);
  const msg = getMessageApi() ?? staticMessage;
  const data = (error as { data?: ApiError & { error?: string } })?.data;

  if (data?.error) {
    msg.error(data.error);
  } else if (data?.message) {
    msg.error(data.message);
  } else {
    msg.error("Something error");
  }
};
