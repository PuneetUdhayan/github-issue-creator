import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from '@primer/react';
import Popup from "./pages/Popup";

ReactDOM.createRoot(document.body).render(
  <React.StrictMode>
    <ThemeProvider>
      <Popup />
    </ThemeProvider>
  </React.StrictMode>
);
