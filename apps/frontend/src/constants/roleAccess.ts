const accessAdministrator = ["ADMINISTRATOR"];
const accessGeneralManager = ["ADMINISTRATOR", "GENERAL MANAGER"];
const accessManager = ["ADMINISTRATOR", "PRODUCTION MANAGER"];
const accessHumanResource = ["ADMINISTRATOR", "HUMAN RESOURCE"];
const accessHeadDepartment = [
  "ADMINISTRATOR",
  "HEAD DEPARTMENT SEWING",
  "HEAD DEPARTMENT CUTTING",
  "HEAD DEPARTMENT MARKER",
  "HEAD DEPARTMENT QC",
  "HEAD DEPARTMENT FINISHING",
  "HEAD DEPARTMENT SAMPLE",
];
const accessSupervisor = [
  "ADMINISTRATOR",
  "SUPERVISOR SEWING",
  "SUPERVISOR CUTTING",
  "SUPERVISOR MARKER",
  "SUPERVISOR QC",
  "SUPERVISOR FINISHING",
  "SUPERVISOR SAMPLE",
];

const accessHumanResourceManager = ["ADMINISTRATOR", "HUMAN RESOURCE MANAGER"];

export const role = {
  accessAdministrator,
  accessGeneralManager,
  accessManager,
  accessHumanResource,
  accessHeadDepartment,
  accessSupervisor,
  accessHumanResourceManager,
};

export const colorByDepartment = (value: string) => {
  let color;
  switch (value) {
    case "SEWING":
      color = "cyan";
      break;
    case "CUTTING":
      color = "magenta";
      break;
    case "SAMPLE":
      color = "green";
      break;
    case "QC":
      color = "purple";
      break;
    case "MARKER":
      color = "geekblue";
      break;
    case "FINISHING":
      color = "orange";
      break;
    default:
      color = "cyan";
  }
  return color;
};

export const colorByGender = (value: string) => {
  let color;
  switch (value) {
    case "FEMALE":
      color = "volcano";
      break;
    case "MALE":
      color = "green";
      break;
    default:
      color = "volcano";
  }
  return color;
};
