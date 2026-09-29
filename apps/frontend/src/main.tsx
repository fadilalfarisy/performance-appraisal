import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import router from "@/app/router";
import { store } from "@/app/store";
import { antdTheme } from "@/styles/theme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={antdTheme}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ConfigProvider>
    </Provider>
  </StrictMode>
);
