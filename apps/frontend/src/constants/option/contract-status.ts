import { ContractType } from "../enum/contract.enum";

export const contractTypeOption = [
  { label: "Permanent", value: ContractType.PERMANENT },
  { label: "Fixed term", value: ContractType.FIXED_TERM },
  { label: "Probation", value: ContractType.PROBATION },
];

export const contractTypeColor: Record<string, string> = {
  // FIXED_TERM: "#eb2f96", // magenta
  // PROBATION: "#722ed1", // purple
  // PERMANENT: "#2f54eb", // geekblue
  FIXED_TERM: "magenta", // magenta
  PROBATION: "purple", // purple
  PERMANENT: "geekblue", // geekblue
};
