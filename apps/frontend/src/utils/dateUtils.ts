import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

dayjs.tz.setDefault("Asia/Jakarta");

export const dateFormat = "YYYY-MM-DD";
export const DATE_FORMAT = "DD MMM YYYY";
export const DATETIME_FORMAT = "DD MMM YYYY, HH:mm";

export const customDateTime = (date: string) => {
  return dayjs(date).add(7, "hour");
};

export const formatDate = (value: any) =>
  value ? dayjs(value).format(DATE_FORMAT) : "-";

export const formatDateTime = (value: any) =>
  value ? dayjs(value).format(DATETIME_FORMAT) : "-";

export const fromNow = (value: any) =>
  value ? dayjs(value).fromNow() : "-";

export const toISOString = (value: any) =>
  value ? dayjs(value).toISOString() : null;
