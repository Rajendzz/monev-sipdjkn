import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // pastikan ini mengimpor Tailwind CSS kamu
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
