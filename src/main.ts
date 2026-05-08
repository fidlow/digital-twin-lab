import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import FTIDigitalTwinPrototype from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(FTIDigitalTwinPrototype)
  )
);
