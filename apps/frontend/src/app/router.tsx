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
const User = lazy(() =>
  import("@/features/users").then((module) => ({ default: module.User })),
);
const CreateUser = lazy(() =>
  import("@/features/users").then((module) => ({ default: module.CreateUser })),
);
const UpdateUser = lazy(() =>
  import("@/features/users").then((module) => ({ default: module.UpdateUser })),
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
