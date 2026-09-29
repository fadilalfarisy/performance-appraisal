import { message } from "antd";

export const errorHandling = (error: any) => {
  console.error(error);
  if (error?.data?.error) {
    message.error(error.data.error);
  } else {
    message.error("Something error");
  }
};
