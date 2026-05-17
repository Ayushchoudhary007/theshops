// ─────────────────────────────────────────────────────────────
// src/app/routes.tsx
// ─────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "../modules/navbar/Navbar";
import Home from "../modules/home/Home";
import Inventory from "../modules/inventory/pages/Inventory";
import AuthPage from "../modules/auth/AuthPage";
import ImportExport from "../modules/importexport/ImportExport";
import Settings from "../modules/settings/Settings";
import { OfflineRegistrationBanner } from "../modules/auth/OfflineRegistrationBanner";
import Notifications from "../modules/notifications/pages/Notifications";
import Billing from "../modules/billing/pages/Billing";
import Customers from "../modules/customers/pages/Customers";
import Reports from "../modules/reports/pages/Reports";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineRegistrationBanner />
      <Navbar />
      {children}
    </>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth — no navbar */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />

        {/* App — with navbar */}
        <Route
          path="/"
          element={
            <AppLayout>
              <Home />
            </AppLayout>
          }
        />
        <Route
          path="/inventory"
          element={
            <AppLayout>
              <Inventory />
            </AppLayout>
          }
        />
        <Route
          path="/import-export"
          element={
            <AppLayout>
              <ImportExport />
            </AppLayout>
          }
        />
        <Route
          path="/notifications"
          element={
            <AppLayout>
              <Notifications />
            </AppLayout>
          }
        />
        <Route
          path="/billing"
          element={
            <AppLayout>
              <Billing />
            </AppLayout>
          }
        />
        <Route
          path="/report"
          element={
            <AppLayout>
              <Reports />
            </AppLayout>
          }
        />
        <Route
          path="/customers"
          element={
            <AppLayout>
              <Customers />
            </AppLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <AppLayout>
              <Settings />
            </AppLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
