import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "katex/dist/katex.min.css";
import FTIDigitalTwinPrototype from "./App.tsx";
import { runTests } from "./models/digitalTwin";

declare global {
  interface Window {
    __FTI_TESTS__?: boolean;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined" && !window.__FTI_TESTS__) {
  window.__FTI_TESTS__ = true;
  runTests();
}

createRoot(document.getElementById("root")!).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(FTIDigitalTwinPrototype)
  )
);
