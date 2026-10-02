import { message } from "antd";
import type { ApiError } from "@appraisal/types";

export const errorHandling = (error: unknown) => {
  console.error(error);
  const apiError = error as { data?: ApiError & { error?: string } };
  if (apiError?.data?.error) {
    message.error(apiError.data.error);
  } else if (apiError?.data?.message) {
    message.error(apiError.data.message);
  } else {
    message.error("Something error");
  }
};
