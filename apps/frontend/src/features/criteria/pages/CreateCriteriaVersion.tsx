import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spin } from "antd";
import {
  useCreateCriteriaSetMutation,
  useGetCriteriaSetByIdQuery,
} from "../criteriaApi";
import { errorHandling } from "@/utils/errorUtils";

/** Creates a new DRAFT for the same department as the source set. */
export const CreateCriteriaVersion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: source, isSuccess } = useGetCriteriaSetByIdQuery(id);
  const [createSet] = useCreateCriteriaSetMutation();
  const started = useRef(false);

  useEffect(() => {
    if (!isSuccess || !source || started.current) return;
    started.current = true;

    (async () => {
      try {
        const { data } = await createSet({
          departmentId: source.data.departmentId ?? undefined,
        }).unwrap();
        navigate(`/dashboard/criteria/${data.id}`, { replace: true });
      } catch (error) {
        errorHandling(error);
        navigate("/dashboard/criteria", { replace: true });
      }
    })();
  }, [createSet, navigate, source, isSuccess]);

  return <Spin />;
};
