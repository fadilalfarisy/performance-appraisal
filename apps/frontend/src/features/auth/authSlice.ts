import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserRole } from "@appraisal/types";

export interface AuthState {
  logged: boolean;
  username: string;
  role: UserRole | "";
  accessToken: string;
}

const initialValue: AuthState = {
  logged: false,
  username: "",
  role: "",
  accessToken: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialValue,
  reducers: {
    // Entry point for both sign-in and bootstrap restore: a session is always
    // logged in, so `logged` is not part of the payload.
    setSession: (
      state,
      action: PayloadAction<{
        accessToken: string;
        username: string;
        role: UserRole | "";
      }>,
    ) => {
      state.logged = true;
      state.accessToken = action.payload.accessToken;
      state.username = action.payload.username;
      state.role = action.payload.role;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    deleteAuth: (state) => {
      state.logged = false;
      state.username = "";
      state.role = "";
      state.accessToken = "";
    },
  },
});

export const { setSession, setAccessToken, deleteAuth } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.logged;
export const selectAuthUser = (state: { auth: AuthState }) => state.auth;
