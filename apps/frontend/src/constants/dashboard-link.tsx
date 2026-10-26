import {
  PieChartOutlined,
  UserOutlined,
  IdcardOutlined,
  TagOutlined,
  BuildFilled,
  FileDoneOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import { UserRole } from "@appraisal/types";
import { ALL_ROLES, roles } from "@/constants/role-access";

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: readonly UserRole[];
  children?: Omit<MenuItem, "icon">[];
}

export const menuItem: MenuItem[] = [
  {
    key: "/dashboard",
    icon: <PieChartOutlined />,
    label: "Dashboard",
    roles: ALL_ROLES,
  },
  {
    key: "/dashboard/appraisals",
    icon: <FileDoneOutlined />,
    label: "Appraisals",
    roles: ALL_ROLES,
  },
  {
    key: "/dashboard/employee",
    icon: <IdcardOutlined />,
    label: "Employee",
    roles: ALL_ROLES,
  },
  {
    key: "/dashboard/contracts",
    icon: <FileDoneOutlined />,
    label: "Contracts",
    roles: ALL_ROLES,
  },
  {
    key: "/dashboard/criteria",
    icon: <TagOutlined />,
    label: "Criteria",
    roles: ALL_ROLES,
  },
  {
    key: "/dashboard/daily-notes",
    icon: <FileAddOutlined />,
    label: "Daily Notes",
    roles: roles.noteManagers,
  },
  {
    key: "/dashboard/master-data",
    icon: <BuildFilled />,
    label: "Master Data",
    roles: roles.administrator,
    children: [
      {
        key: "/dashboard/departments",
        label: "Departments",
        roles: roles.administrator,
      },
      {
        key: "/dashboard/positions",
        label: "Positions",
        roles: roles.administrator,
      },
      {
        key: "/dashboard/templates",
        label: "Template",
        roles: roles.administrator,
      },
    ],
  },
  {
    key: "/dashboard/user",
    icon: <UserOutlined />,
    label: "Manage User",
    roles: roles.administrator,
    children: [
      {
        key: "/dashboard/users",
        label: "Users",
        roles: roles.administrator,
      },
    ],
  },
];

export const filteredMenuByRole = (userRole: UserRole | "") => {
  if (userRole === "") return [];
  return visibleMenuItems(menuItem, userRole).map((item) => ({
    ...item,
    children: item.children
      ? visibleMenuItems(item.children, userRole)
      : null,
  }));
};

const visibleMenuItems = <T extends { roles: readonly UserRole[] }>(
  items: T[],
  userRole: UserRole,
) =>
  items.filter(
    (item) => userRole === UserRole.ADMIN || item.roles.includes(userRole),
  );
