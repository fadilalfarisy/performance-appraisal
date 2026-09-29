import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { ProtectedRoute, AppLayout } from "@/components";
import {
  CreateDepartment,
  Department,
  UpdateDepartment,
} from "@/features/departments";
import { CreatePosition, Position, UpdatePosition } from "@/features/position";

// Lazy-loaded layouts & components
const DashboardLayout = lazy(
  () => import("@/components/DashboardLayout/DashboardLayout"),
);

// Lazy-loaded pages
const SignIn = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.SignIn })),
);
const Dashboard = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const Employee = lazy(() =>
  import("@/features/employees").then((module) => ({
    default: module.Employee,
  })),
);
const CreateEmployee = lazy(() =>
  import("@/features/employees").then((module) => ({
    default: module.CreateEmployee,
  })),
);
const UpdateEmployee = lazy(() =>
  import("@/features/employees").then((module) => ({
    default: module.UpdateEmployee,
  })),
);
const CreateContract = lazy(() =>
  import("@/features/contract").then((module) => ({
    default: module.CreateContract,
  })),
);
const UpdateContract = lazy(() =>
  import("@/features/contract").then((module) => ({
    default: module.UpdateContract,
  })),
);
const Criteria = lazy(() =>
  import("@/features/criteria").then((module) => ({
    default: module.Criteria,
  })),
);
const CreateCriteria = lazy(() =>
  import("@/features/criteria").then((module) => ({
    default: module.CreateCriteria,
  })),
);
const CreateCriteriaVersion = lazy(() =>
  import("@/features/criteria").then((module) => ({
    default: module.CreateCriteriaVersion,
  })),
);
const DetailsCriteria = lazy(() =>
  import("@/features/criteria").then((module) => ({
    default: module.DetailsCriteria,
  })),
);
const HumanResource = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.HumanResource,
  })),
);
const InitiateReport = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.InitiateReport,
  })),
);
const ViewReport = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.ViewReport,
  })),
);
const HeadDepartment = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.HeadDepartment,
  })),
);
const Assessment = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.Assessment,
  })),
);
const Manager = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.Manager,
  })),
);
const GeneralManager = lazy(() =>
  import("@/features/assessment").then((module) => ({
    default: module.GeneralManager,
  })),
);
const User = lazy(() =>
  import("@/features/users").then((module) => ({ default: module.User })),
);
const CreateUser = lazy(() =>
  import("@/features/users").then((module) => ({ default: module.CreateUser })),
);
const UpdateUser = lazy(() =>
  import("@/features/users").then((module) => ({ default: module.UpdateUser })),
);
const Role = lazy(() =>
  import("@/features/roles").then((module) => ({ default: module.Role })),
);
const CreateRole = lazy(() =>
  import("@/features/roles").then((module) => ({ default: module.CreateRole })),
);
const UpdateRole = lazy(() =>
  import("@/features/roles").then((module) => ({ default: module.UpdateRole })),
);
const Permission = lazy(() =>
  import("@/features/permissions").then((module) => ({
    default: module.Permission,
  })),
);
const CreatePermission = lazy(() =>
  import("@/features/permissions").then((module) => ({
    default: module.CreatePermission,
  })),
);
const UpdatePermission = lazy(() =>
  import("@/features/permissions").then((module) => ({
    default: module.UpdatePermission,
  })),
);
const Report = lazy(() =>
  import("@/features/report").then((module) => ({ default: module.Report })),
);
const Performance = lazy(() =>
  import("@/features/performance").then((module) => ({
    default: module.Performance,
  })),
);
const CreatePerformance = lazy(() =>
  import("@/features/performance").then((module) => ({
    default: module.CreatePerformance,
  })),
);
const UpdatePerformance = lazy(() =>
  import("@/features/performance").then((module) => ({
    default: module.UpdatePerformance,
  })),
);
const ViewPerformance = lazy(() =>
  import("@/features/performance").then((module) => ({
    default: module.ViewPerformance,
  })),
);

const ErrorPage = lazy(() =>
  import("@/features/errors/GeneralError").then((module) => ({
    default: module.ErrorPage,
  })),
);

const suspenseWrapper = (element: React.ReactNode) => (
  <Suspense fallback={<div className="center-content">Loading...</div>}>
    {element}
  </Suspense>
);

export default createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      errorElement: suspenseWrapper(<ErrorPage />),
      children: [
        {
          index: true,
          element: suspenseWrapper(<SignIn />),
        },
        {
          path: "dashboard",
          element: (
            <ProtectedRoute children={suspenseWrapper(<DashboardLayout />)} />
          ),
          children: [
            {
              index: true,
              element: suspenseWrapper(<Dashboard />),
            },
            {
              path: "employee",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Employee />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreateEmployee />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<UpdateEmployee />),
                },
                {
                  path: "contract/create/:employeeId",
                  element: suspenseWrapper(<CreateContract />),
                },
                {
                  path: "contract/update/:employeeId/:contractId",
                  element: suspenseWrapper(<UpdateContract />),
                },
              ],
            },
            {
              path: "criteria",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Criteria />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreateCriteria />),
                },
                {
                  path: ":id/version/create",
                  element: suspenseWrapper(<CreateCriteriaVersion />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<DetailsCriteria />),
                },
              ],
            },
            {
              path: "human-resource",
              element: suspenseWrapper(<HumanResource />),
            },
            {
              path: "human-resource/initiate",
              element: suspenseWrapper(<InitiateReport />),
            },
            {
              path: "human-resource/:id",
              element: suspenseWrapper(<ViewReport />),
            },
            {
              path: "head-department",
              element: suspenseWrapper(<HeadDepartment />),
            },
            {
              path: "head-department/:id",
              element: suspenseWrapper(<Assessment />),
            },
            {
              path: "manager",
              element: suspenseWrapper(<Manager />),
            },
            {
              path: "general-manager",
              element: suspenseWrapper(<GeneralManager />),
            },
            {
              path: "users",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<User />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreateUser />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<UpdateUser />),
                },
              ],
            },
            {
              path: "roles",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Role />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreateRole />),
                },
                // {
                //   path: ":id/update",
                //   element: suspenseWrapper(<UpdateRole />),
                // },
                {
                  path: ":id",
                  element: suspenseWrapper(<UpdateRole />),
                },
              ],
            },
            {
              path: "permissions",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Permission />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreatePermission />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<UpdatePermission />),
                },
              ],
            },
            {
              path: "report",
              element: suspenseWrapper(<Report />),
            },
            {
              path: "performance",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Performance />),
                },
                {
                  path: "create/:id",
                  element: suspenseWrapper(<CreatePerformance />),
                },
                {
                  path: "update/:id",
                  element: suspenseWrapper(<UpdatePerformance />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<ViewPerformance />),
                },
              ],
            },
            {
              path: "departments",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Department />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreateDepartment />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<UpdateDepartment />),
                },
              ],
            },
            {
              path: "positions",
              element: <Outlet />,
              children: [
                {
                  index: true,
                  element: suspenseWrapper(<Position />),
                },
                {
                  path: "create",
                  element: suspenseWrapper(<CreatePosition />),
                },
                {
                  path: ":id",
                  element: suspenseWrapper(<UpdatePosition />),
                },
              ],
            },
          ],
        },
        {
          path: "*",
          element: suspenseWrapper(<ErrorPage />),
        },
      ],
    },
  ],
  {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
