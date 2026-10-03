import { ContractStatus, ContractType } from "../enum/contract.enum";

export const contractTypeOption = [
  { label: "Permanent", value: ContractType.PERMANENT },
  { label: "Fixed term", value: ContractType.FIXED_TERM },
  { label: "Probation", value: ContractType.PROBATION },
];

export const contractStatusOption = [
  { label: "Active", value: ContractStatus.ACTIVE },
  { label: "Inactive", value: ContractStatus.INACTIVE },
];
