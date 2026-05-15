import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// Initialize i18next
i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: "tr",
    lng: localStorage.getItem("language") || "tr",
    ns: ["common"],
    defaultNS: "common",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    interpolation: {
      escapeValue: false,
    },
  });

// MUI theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#6C63FF", light: "#9D97FF", dark: "#4A42D4" },
    secondary: { main: "#FF6584", light: "#FF92A8", dark: "#D94060" },
    success: { main: "#43D9AD" },
    background: { default: "#F4F6FB", paper: "#FFFFFF" },
    text: { primary: "#1A1D2E", secondary: "#6B7280" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingTop: 10, paddingBottom: 10 },
        containedPrimary: {
          background: "linear-gradient(135deg, #6C63FF 0%, #9D97FF 100%)",
          boxShadow: "0 4px 15px rgba(108,99,255,0.35)",
          "&:hover": { boxShadow: "0 6px 20px rgba(108,99,255,0.45)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { "& .MuiOutlinedInput-root": { borderRadius: 10 } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          color: "#1A1D2E",
          boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
        },
      },
    },
  },
});

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </HelmetProvider>
  </React.StrictMode>
);
