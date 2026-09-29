import { Navigate, useLocation } from "react-router-dom";
import { useEffect, ReactNode } from "react";
import { useAppSelector } from "@/app/hooks";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const auth = useAppSelector((state) => state.auth);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return auth.logged ? children : <Navigate to="/" />;
}
