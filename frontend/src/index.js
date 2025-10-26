import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // StrictMode temporarily disabled to fix Leaflet map initialization issues
  // Re-enable after implementing proper error boundary for the map component
  <App />
);
