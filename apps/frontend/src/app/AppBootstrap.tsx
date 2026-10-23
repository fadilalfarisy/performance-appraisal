import { useEffect, useState, type ReactNode } from "react";
import { Spin } from "antd";
import { useAppDispatch } from "@/app/hooks";
import {
  deleteAuth,
  setAccessToken,
  setSession,
} from "@/features/auth/authSlice";
import { useLazyMeQuery, useRefreshMutation } from "@/features/auth/authApi";
import { isUserRole } from "@/constants/role-access";

/**
 * Restores the session on app start: exchange the HttpOnly refresh token
 * cookie for an access token, load the current user, and seed the auth slice.
 * Shows a full-page spinner until the outcome is known.
 */
export const AppBootstrap = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const [refresh] = useRefreshMutation();
  const [loadMe] = useLazyMeQuery();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await refresh().unwrap();
        dispatch(setAccessToken(data.accessToken));

        const me = await loadMe().unwrap();
        if (cancelled) return;

        const roleValue = me.data?.roles?.[0];
        dispatch(
          setSession({
            accessToken: data.accessToken,
            username: me.data?.username ?? "",
            role: isUserRole(roleValue) ? roleValue : "",
          }),
        );
      } catch {
        if (!cancelled) dispatch(deleteAuth());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, refresh, loadMe]);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
};
