import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spin } from "antd";
import { useCreateCriteriaSetMutation } from "../criteriaApi";
import { errorHandling } from "@/utils/errorUtils";

/** Creates a new DRAFT for a department (or global) and opens its editor. */
export const CreateCriteria = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [createSet] = useCreateCriteriaSetMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const departmentId = searchParams.get("departmentId") ?? undefined;

    (async () => {
      try {
        const { data } = await createSet({ departmentId }).unwrap();
        navigate(`/dashboard/criteria/${data.id}`, { replace: true });
      } catch (error) {
        errorHandling(error);
        navigate("/dashboard/criteria", { replace: true });
      }
    })();
  }, [createSet, navigate, searchParams]);

  return <Spin />;
};
