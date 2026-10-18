import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./app/routes";
import { Layout } from "./app/shell/Layout";
import "./design-system/styles/index.css";
import { ApiError, RequestTimeoutError } from "./lib/api/client";
import { I18nProvider } from "./lib/i18n";
import { applyPreferences, readPreferences } from "./app/shell/preferences";
import { updateFavicon } from "./app/shell/favicon";

const preferences = readPreferences();
applyPreferences(preferences.theme, preferences.effects);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (!document.documentElement.dataset.theme) updateFavicon();
});

export const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx (bad key, forbidden, not found) or a timeout will not fix itself
      // on retry; a 5xx or a network blip might.
      retry: (failureCount, error) => {
        if (error instanceof RequestTimeoutError) return false;
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <Layout>
            <AppRoutes />
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  </React.StrictMode>
);
