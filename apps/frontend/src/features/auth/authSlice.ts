import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  logged: boolean;
  username: string;
  role: string;
  accessToken: string;
}

const initialValue: AuthState = {
  logged: false,
  username: "",
  role: "",
  accessToken: "",
};

const getInitialState = (): AuthState => {
  const authLocalStorage = localStorage.getItem("auth");
  if (authLocalStorage) {
    const authJSON = JSON.parse(authLocalStorage);
    return {
      logged: true,
      ...authJSON,
    };
  }
  return initialValue;
};

const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    setAuth: (state, action: PayloadAction<AuthState>) => {
      const authLocalStorage = {
        username: action.payload.username,
        role: action.payload.role,
        accessToken: action.payload.accessToken,
      };
      state.logged = action.payload.logged;
      state.username = action.payload.username;
      state.role = action.payload.role;
      state.accessToken = action.payload.accessToken;
      localStorage.setItem("auth", JSON.stringify(authLocalStorage));
    },
    deleteAuth: (state) => {
      state.logged = false;
      state.username = "";
      state.role = "";
      state.accessToken = "";
      localStorage.removeItem("auth");
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      const newToken = action.payload;
      state.accessToken = newToken;
      const authLocalStorage = localStorage.getItem("auth");
      if (authLocalStorage) {
        const authJSON = JSON.parse(authLocalStorage);
        const newAuth = JSON.stringify({
          ...authJSON,
          accessToken: newToken,
        });
        localStorage.setItem("auth", newAuth);
      }
    },
  },
});

export const { setAuth, deleteAuth, setAccessToken } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const selectIsAuthenticated = (state: any) => state.auth.logged;
export const selectAuthUser = (state: any) => state.auth;
