import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";

import { App } from "./App";
import { AuthProvider } from "./state/AuthContext";
import { FiltersProvider } from "./state/FiltersContext";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Switching back to a previously viewed filter set comes from cache
      // without a visible loading delay (PRD section 9.1).
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FiltersProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </FiltersProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
