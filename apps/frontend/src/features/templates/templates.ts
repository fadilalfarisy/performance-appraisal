export type TemplateDefinition = {
  key: string;
  title: string;
  description: string;
  path: string;
  fileName: string;
};

export const templates: TemplateDefinition[] = [
  {
    key: "employees",
    title: "Employees",
    description:
      "Creates new employees and updates existing ones, matched by employee number.",
    path: "/employees/import-template",
    fileName: "employees-template.xlsx",
  },
  {
    key: "contracts",
    title: "Contracts",
    description:
      "Creates or updates contracts, matched by employee number and contract start date.",
    path: "/contracts/import-template",
    fileName: "contracts-template.xlsx",
  },
];
