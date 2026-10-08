import { useParams, Navigate, useSearchParams } from "react-router-dom";
import { Tabs } from "antd";
import { TitlePage } from "@/components";
import {
  useGetEmployeeByIdQuery,
  useUpdateEmployeeMutation,
} from "../employeesApi";
import { EmployeeForm } from "../components/EmployeeForm";
import { Contract } from "@/features/contract";

export const UpdateEmployee = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "information";
  const {
    data: initialValueEmployee,
    isSuccess,
    isError,
  } = useGetEmployeeByIdQuery(id);

  if (isError) {
    return <Navigate to={"/dashboard/employee"} />;
  }

  if (isSuccess) {
    return (
      <>
        <TitlePage
          title="Employee"
          description="Employee information and contracts"
        />
        <Tabs
          activeKey={activeTab}
          onChange={(key) =>
            setSearchParams(key === "information" ? {} : { tab: key }, {
              replace: true,
            })
          }
          items={[
            {
              key: "information",
              label: "Information",
              children: (
                <EmployeeForm
                  createForm={false}
                  formFunction={useUpdateEmployeeMutation}
                  initialValues={initialValueEmployee?.data}
                />
              ),
            },
            {
              key: "contracts",
              label: "Contracts",
              children: <Contract />,
            },
          ]}
        />
      </>
    );
  }
};
