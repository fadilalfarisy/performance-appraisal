import { capitalizeString } from "@/utils/stringUtils";
import { ContractStatus } from "../enum/contract.enum";

export const contractStatusOption = [
  {
    label: capitalizeString(ContractStatus.CONTRACT),
    value: ContractStatus.CONTRACT,
  },
  {
    label: capitalizeString(ContractStatus.PERMANENT),
    value: ContractStatus.PERMANENT,
  },
];
