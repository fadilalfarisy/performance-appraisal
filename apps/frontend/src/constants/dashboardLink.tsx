import {
  StarOutlined,
  PieChartOutlined,
  UserOutlined,
  IdcardOutlined,
  TagOutlined,
  FolderOutlined,
  FundOutlined,
  BuildFilled,
} from "@ant-design/icons";
import { role } from "@/constants/roleAccess";

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
  children?: Omit<MenuItem, "icon">[];
}

export const menuItem: MenuItem[] = [
  {
    key: "/dashboard",
    icon: <PieChartOutlined />,
    label: "Dashboard",
    roles: [
      ...role.accessAdministrator,
      ...role.accessGeneralManager,
      ...role.accessManager,
      ...role.accessHumanResource,
      ...role.accessHeadDepartment,
      ...role.accessSupervisor,
      ...role.accessHumanResourceManager,
    ],
  },

  {
    key: "/dashboard/employee",
    icon: <IdcardOutlined />,
    label: "Employee",
    roles: [
      ...role.accessAdministrator,
      ...role.accessGeneralManager,
      ...role.accessManager,
      ...role.accessHumanResource,
      ...role.accessHumanResourceManager,
    ],
  },
  {
    key: "/dashboard/criteria",
    icon: <TagOutlined />,
    label: "Criteria",
    roles: [
      ...role.accessAdministrator,
      ...role.accessGeneralManager,
      ...role.accessManager,
      ...role.accessHumanResource,
      ...role.accessHeadDepartment,
      ...role.accessSupervisor,
      ...role.accessHumanResourceManager,
    ],
  },
  {
    key: "/dashboard/performance",
    icon: <FundOutlined />,
    label: "Daily Records",
    roles: [...role.accessHeadDepartment, ...role.accessSupervisor],
  },
  {
    key: "/dashboard/report",
    icon: <FolderOutlined />,
    label: "Report",
    roles: [
      ...role.accessGeneralManager,
      ...role.accessManager,
      ...role.accessHumanResource,
      ...role.accessHeadDepartment,
      ...role.accessHumanResourceManager,
    ],
  },
  {
    key: "/assestment",
    icon: <StarOutlined />,
    label: "Assestment",
    children: [
      {
        key: "/dashboard/human-resource",
        label: "Initiate Report",
        roles: [...role.accessHumanResource],
      },
      {
        key: "/dashboard/head-department",
        label: "Assessment ",
        roles: [...role.accessHeadDepartment],
      },
      {
        key: "/dashboard/manager",
        label: "Approve Report",
        roles: [...role.accessManager],
      },
      {
        key: "/dashboard/general-manager",
        label: "Final Report",
        roles: [...role.accessGeneralManager],
      },
    ],
    roles: [
      ...role.accessGeneralManager,
      ...role.accessManager,
      ...role.accessHumanResource,
      ...role.accessHeadDepartment,
    ],
  },
  {
    key: "/dashboard/master-data",
    icon: <BuildFilled />,
    label: "Master Data",
    roles: [...role.accessAdministrator],
    children: [
      {
        key: "/dashboard/departments",
        label: "Departments",
        roles: [...role.accessAdministrator],
      },
      {
        key: "/dashboard/positions",
        label: "Positions",
        roles: [...role.accessAdministrator],
      },
    ]
  },
  {
    key: "/dashboard/user",
    icon: <UserOutlined />,
    label: "Manage User",
    roles: [...role.accessAdministrator],
    children: [
      {
        key: "/dashboard/users",
        label: "Users",
        roles: [...role.accessAdministrator],
      },
      {
        key: "/dashboard/roles",
        label: "Roles",
        roles: [...role.accessAdministrator],
      },
      {
        key: "/dashboard/permissions",
        label: "Permissions",
        roles: [...role.accessAdministrator],
      },
    ]
  }
];

export const filteredMenuByRole = (role: string) => {
  return menuItem
    .filter((item) => item.roles?.includes(role))
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByRole(item.children, role)
        : null,
    }));
};

const filterMenuByRole = (
  items: Omit<MenuItem, "children" | "icon">[],
  role: string
) => items.filter((item) => item.roles?.includes(role));
