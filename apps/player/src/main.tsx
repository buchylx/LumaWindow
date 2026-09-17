import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ControlWindow } from "./ControlWindow";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("control") ? (
      <ControlWindow />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
