const accessAdministrator = ["ADMIN"];
const accessGeneralManager = ["ADMIN", "GENERAL_MANAGER"];
const accessManager = ["ADMIN", "MANAGER"];
const accessHumanResource = ["ADMIN", "HR"];
const accessHeadDepartment = ["ADMIN", "HEAD_DEPARTMENT"];
const accessSupervisor = ["ADMIN", "SUPERVISOR"];

export const role = {
  accessAdministrator,
  accessGeneralManager,
  accessManager,
  accessHumanResource,
  accessHeadDepartment,
  accessSupervisor,
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
