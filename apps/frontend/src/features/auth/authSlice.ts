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
    setAuth: (state, action: PayloadAction<AuthState>) => {
      state.logged = action.payload.logged;
      state.username = action.payload.username;
      state.role = action.payload.role;
      state.accessToken = action.payload.accessToken;
    },
    // Used by the bootstrap and re-auth flows: the access token is refreshed
    // while the rest of the session is preserved.
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

export const { setAuth, setSession, setAccessToken, deleteAuth } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.logged;
export const selectAuthUser = (state: { auth: AuthState }) => state.auth;
