import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { RequirePermission } from "@/shared/components/RequirePermission";
import { RequireCompanySetup } from "@/shared/components/RequireCompanySetup";

// Communication
import { Communication } from '@/back-office/pages/communication/Communication';
// Support Chat (Separate from Communication)
import { BusinessOwnerSupport } from '@/app/pages/support/BusinessOwnerSupport';
import { AdminSupportTickets } from '@/back-office/pages/admin/AdminSupportTickets'; 

// Front-office
import { LandingPage } from "@/front-office/pages/LandingPage";
import { MockPaymentPage } from "@/front-office/pages/MockPaymentPage";

// Layouts
import { AuthLayout } from "@/back-office/templates/AuthLayout";
import { DashboardLayout } from "@/back-office/templates/DashboardLayout";
import { PlatformAdminLayout } from "@/back-office/templates/PlatformAdminLayout";

// Auth Pages
import { Login } from "@/app/pages/auth/Login";
import { Register } from "@/back-office/pages/auth/Register";
import { ForgotPassword } from "@/back-office/pages/auth/ForgotPassword";
import AcceptInvite from "@/app/pages/auth/AcceptInvite";
import OAuthSuccess from "@/app/pages/auth/OAuthSuccess";
import ForceChangePassword from "@/app/pages/auth/ForceChangePassword";
import { SecurityQuestionsSetup } from "@/back-office/pages/auth/SecurityQuestionsSetup";
import OAuthCallback from "@/app/pages/auth/OAuthCallback";

// Dashboard Pages
import { Dashboard } from "@/back-office/pages/dashboard/Dashboard";
import CreateBusiness from "@/back-office/pages/businesses/CreateBusiness";
import { Invoices } from "@/app/pages/invoices/Invoices";
import { CreateInvoice } from "@/app/pages/invoices/CreateInvoice";
import { ViewInvoice } from "@/app/pages/invoices/ViewInvoice";
import { Expenses } from "@/app/pages/expenses/Expenses";
import { CreateExpense } from "@/app/pages/expenses/CreateExpense";
import { Clients } from "@/app/pages/clients/Clients";
import { ClientDetails } from "@/app/pages/clients/ClientDetails";
import { Team } from "@/app/pages/team/Team";
import { TeamAIInsights } from "@/app/pages/team/TeamAIInsights";
import { Reports } from "@/app/pages/reports/Reports";
import { Settings } from "@/app/pages/settings/Settings";

// Platform Admin pages
import { AdminOverview } from "@/app/pages/admin/AdminOverview";
import { BusinessOwners } from "@/app/pages/admin/BusinessOwners";
import { Businesses } from "@/app/pages/admin/Businesses";
import { Analytics } from "@/app/pages/admin/Analytics";
import RegistrationRequestsAdmin from "@/app/pages/admin/RegistrationRequestsAdmin";

// AI & Company
import { AIInsights } from "@/app/pages/ai/AIInsights";
import CompanySetup from "@/app/pages/businesses/CompanySetup";

export const router = createBrowserRouter([
  // PUBLIC
  { path: "/", element: <LandingPage /> },
  { path: "/auth/oauth-callback", element: <OAuthCallback /> },
  { path: "/oauth-success", element: <OAuthSuccess /> },
  { path: "/mock-payment/:id", element: <MockPaymentPage /> },

  // AUTH
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "force-change-password", element: <ForceChangePassword /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "accept-invite", element: <AcceptInvite /> },
      {
        path: "setup-security-questions",
        element: (
          <SecurityQuestionsSetup
            token={localStorage.getItem("access_token") ?? ""}
            onComplete={async () => {
              const { BusinessesApi } = await import("@/shared/lib/services/businesses");
              const list: any[] = await BusinessesApi.listMine();
              if (!list || list.length === 0) {
                window.location.href = "/dashboard";
                return;
              }
              const business = list[list.length - 1];
              localStorage.setItem("current_business_id", String(business.id));
              localStorage.setItem("pending_setup_business_id", String(business.id));
              window.dispatchEvent(new Event("business-changed"));
              window.location.href = "/dashboard/company/setup";
            }}
          />
        ),
      },
    ],
  },

  // PLATFORM ADMIN (Back-Office Admin)
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["platform_admin"]}>
        <PlatformAdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminOverview /> },
      { path: "businesses", element: <Businesses /> },
      { path: "owners", element: <BusinessOwners /> },
      { path: "analytics", element: <Analytics /> },
      { path: "settings", element: <Settings /> },
      { path: "registration-requests", element: <RegistrationRequestsAdmin /> },
      { path: "support", element: <AdminSupportTickets /> },
    ],
  },

  // DASHBOARD (Business Owner / Team Members)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute
        roles={[
          "business_owner",
          "business_admin",
          "accountant",
          "team_member",
          "client",
          "platform_admin",
        ]}
      >
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "company/setup", element: <CompanySetup /> },
      // Chat interne au business
      { path: 'communication', element: <Communication /> },
      // Support Chat avec IA
      {
        path: "support",
        element: (
          <RequireCompanySetup>
            <BusinessOwnerSupport />
          </RequireCompanySetup>
        ),
      },

      {
        index: true,
        element: (
          <RequireCompanySetup>
            <Dashboard />
          </RequireCompanySetup>
        ),
      },

      {
        path: "businesses/new",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="businesses:write">
              <CreateBusiness />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // AI
      {
        path: "ai-insights",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="ai:read">
              <AIInsights />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // INVOICES
      {
        path: "invoices",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="invoices:read">
              <Invoices />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },
      {
        path: "invoices/create",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="invoices:write">
              <CreateInvoice />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },
      {
        path: "invoices/:id",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="invoices:read">
              <ViewInvoice />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // EXPENSES
      {
        path: "expenses",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="expenses:read">
              <Expenses />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },
      {
        path: "expenses/create",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="expenses:write">
              <CreateExpense />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // CLIENTS
      {
        path: "clients",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="clients:read">
              <Clients />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },
      {
        path: "clients/:id",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="clients:read">
              <ClientDetails />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // TEAM
      {
        path: "team",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="team:read">
              <Team />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // TEAM AI INSIGHTS
      {
        path: "team/ai-insights",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="team:read">
              <TeamAIInsights />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // REPORTS
      {
        path: "reports",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="reports:read">
              <Reports />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },

      // SETTINGS
      {
        path: "settings",
        element: (
          <RequireCompanySetup>
            <RequirePermission permission="settings:read">
              <Settings />
            </RequirePermission>
          </RequireCompanySetup>
        ),
      },
    ],
  },
]);