import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import { BaseStyles, ThemeProvider } from "@primer/react";
import { AuthProvider, useAuth } from "./AuthContext";

// Component to conditionally render App or Login based on auth status
const AppWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <App /> : <Login />;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <BaseStyles>
        <AuthProvider>
          <AppWrapper />
        </AuthProvider>
      </BaseStyles>
    </ThemeProvider>
  </StrictMode>
);
