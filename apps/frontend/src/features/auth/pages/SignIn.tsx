import { useNavigate } from "react-router-dom";
import { Button, Form, Input, Typography, Card } from "antd";
import { useSignInMutation } from "@/features/auth/authApi";
import { errorHandling } from "@/utils/errorUtils";
import { useAppDispatch } from "@/app/hooks";
import { setAuth } from "@/features/auth/authSlice";
import { tokenStorage } from "@/features/auth/tokenStorage";

const { Title, Paragraph } = Typography;

type SignInForm = {
  username: string;
  password: string;
};

export const SignIn = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useSignInMutation();

  const onFinish = async (values: SignInForm) => {
    try {
      const { data } = await login(values).unwrap();
      tokenStorage.setRefreshToken(data.refreshToken);
      dispatch(
        setAuth({
          logged: true,
          username: data.username,
          fullName: "",
          role: data.role ?? "",
          accessToken: data.accessToken,
        }),
      );
      navigate("/dashboard");
    } catch (error) {
      errorHandling(error);
    }
  };

  return (
    <span
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: 60,
      }}
    >
      <Card style={{ flex: 1, maxWidth: 500 }}>
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <Title>Login</Title>
          <Paragraph>Performance Appraisal Tool</Paragraph>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, min: 3, max: 20 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, min: 6, max: 255 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button block type="primary" htmlType="submit" loading={isLoading}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </span>
  );
};
