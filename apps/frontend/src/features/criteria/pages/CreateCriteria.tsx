import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Spin } from "antd";
import { useCreateCriteriaSetMutation } from "../criteriaApi";
import { errorHandling } from "@/utils/errorUtils";

/** Creates a new DRAFT (copied from the active set) and opens its editor. */
export const CreateCriteria = () => {
  const navigate = useNavigate();
  const [createSet] = useCreateCriteriaSetMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const { data } = await createSet(undefined).unwrap();
        navigate(`/dashboard/criteria/${data.id}`, { replace: true });
      } catch (error) {
        errorHandling(error);
        navigate("/dashboard/criteria", { replace: true });
      }
    })();
  }, [createSet, navigate]);

  return <Spin />;
};
