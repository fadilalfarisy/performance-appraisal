import { useNavigate } from "react-router-dom";
import { Button, FormInstance } from "antd";

type Props = {
  form: FormInstance<any>;
  isLoading: boolean;
  submitName: string;
};

export const FormButton = ({ form, isLoading, submitName }: Props) => {
  const navigate = useNavigate();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "end", gap: 16 }}>
        <Button
          onClick={() => {
            navigate(-1);
          }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={isLoading}
          style={{ minWidth: "120px" }}
          onClick={() => form.submit()}
        >
          {submitName}
        </Button>
      </div>
    </>
  );
};
