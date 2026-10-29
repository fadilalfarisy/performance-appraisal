import { useEffect, useRef, useState, type ReactNode } from "react";
import { Spin } from "antd";
import type { ApiResponse, RefreshResponse } from "@appraisal/types";
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
  // Single-flight: concurrent runs (StrictMode, Fast Refresh, or a remount)
  // share one request instead of firing duplicate refreshes. The backend no
  // longer rotates the refresh token, so this avoids extra calls rather than
  // protecting correctness.
  const refreshRequestRef = useRef<Promise<ApiResponse<RefreshResponse>> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!refreshRequestRef.current) {
          refreshRequestRef.current = refresh()
            .unwrap()
            .finally(() => {
              refreshRequestRef.current = null;
            });
        }
        const { data } = await refreshRequestRef.current;
        if (cancelled) return;
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
