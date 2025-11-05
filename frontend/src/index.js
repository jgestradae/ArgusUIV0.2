import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n/config"; // Initialize i18n
import App from "./App";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // StrictMode temporarily disabled to fix Leaflet map initialization issues
  // Re-enable after implementing proper error boundary for the map component
  <AccessibilityProvider>
    <App />
  </AccessibilityProvider>
);
