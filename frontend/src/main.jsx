import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import App from "./App.jsx";
import { BaseStyles, ThemeProvider } from "@primer/react";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </StrictMode>
);
