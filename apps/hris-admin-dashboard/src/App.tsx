import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/router/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { lightTheme, darkTheme } from '@/lib/theme';
import { supabase, isSupabaseConfigured, fetchUserContext } from '@/lib/supabase';
import type { SupabaseProfile } from '@/lib/supabase';
import type { User, Tenant } from '@/types';

import LoginPage from '@/pages/auth/LoginPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import TwoFactorPage from '@/pages/auth/TwoFactorPage';
import TenantSelectorPage from '@/pages/auth/TenantSelectorPage';
import CompanySetupPage from '@/pages/auth/CompanySetupPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import EmployeeListPage from '@/pages/employees/EmployeeListPage';
import EmployeeProfilePage from '@/pages/employees/EmployeeProfilePage';
import NewEmployeePage from '@/pages/employees/NewEmployeePage';
import EditEmployeePage from '@/pages/employees/EditEmployeePage';
import BulkUploadPage from '@/pages/employees/BulkUploadPage';
import OrgChartPage from '@/pages/employees/OrgChartPage';
import OnboardingPage from '@/pages/onboarding/OnboardingPage';
import OnboardingDetailPage from '@/pages/onboarding/OnboardingDetailPage';
import OffboardingPage from '@/pages/offboarding/OffboardingPage';
import OffboardingDetailPage from '@/pages/offboarding/OffboardingDetailPage';
import AttendancePage from '@/pages/attendance/AttendancePage';
import LeavesPage from '@/pages/leaves/LeavesPage';
import SchedulePage from '@/pages/schedule/SchedulePage';
import PayrollPage from '@/pages/payroll/PayrollPage';
import BenefitsPage from '@/pages/benefits/BenefitsPage';
import ExpensesPage from '@/pages/expenses/ExpensesPage';
import DocumentsPage from '@/pages/documents/DocumentsPage';
import PerformancePage from '@/pages/performance/PerformancePage';
import CompliancePage from '@/pages/compliance/CompliancePage';
import RecruitmentPage from '@/pages/recruitment/RecruitmentPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import HRPolicyPage from '@/pages/hr-policy/HRPolicyPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import ComingSoonPage from '@/pages/ComingSoonPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const router = createBrowserRouter([
  // Public auth callback — no layout wrapper needed
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignUpPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/verify-2fa', element: <TwoFactorPage /> },
      {
        path: '/select-tenant',
        element: (
          <ProtectedRoute requireAuth requireTwoFactor requireTenant={false}>
            <TenantSelectorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/setup-company',
        element: (
          <ProtectedRoute requireAuth requireTwoFactor requireTenant={false}>
            <CompanySetupPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute requireAuth requireTwoFactor requireTenant>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'employees', element: <EmployeeListPage /> },
      { path: 'employees/new', element: <NewEmployeePage /> },
      { path: 'employees/upload', element: <BulkUploadPage /> },
      { path: 'employees/org-chart', element: <OrgChartPage /> },
      { path: 'employees/:id', element: <EmployeeProfilePage /> },
      { path: 'employees/:id/edit', element: <EditEmployeePage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'onboarding/:id', element: <OnboardingDetailPage /> },
      { path: 'offboarding', element: <OffboardingPage /> },
      { path: 'offboarding/:id', element: <OffboardingDetailPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'leaves', element: <LeavesPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'benefits', element: <BenefitsPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'performance', element: <PerformancePage /> },
      { path: 'recruitment', element: <RecruitmentPage /> },
      { path: 'reports', element: <CompliancePage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'hr-policy', element: <HRPolicyPage /> },
      { path: 'settings/*', element: <SettingsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: '*', element: <ComingSoonPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

// Syncs dark mode class on <html> with Zustand state
function DarkModeSync() {
  const darkMode = useAuthStore((s) => s.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  return null;
}

// On mount, checks for an existing Supabase session and hydrates the auth store.
// This makes the admin dashboard pick up sessions from the landing page redirect
// without requiring the user to log in again.
function SupabaseSessionSync() {
  const { login, setTenant, isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setChecked(true);
      return;
    }

    async function syncSession() {
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (session && !isAuthenticated) {
        let { profile, org, role } = await fetchUserContext(session.user.id);

        // First-time user: no profile row yet — create one from auth metadata
        let resolvedProfile: SupabaseProfile | null = profile;
        if (!resolvedProfile && supabase) {
          const meta = session.user.user_metadata as Record<string, string> | undefined;
          const fullName =
            meta?.full_name || meta?.name || session.user.email?.split('@')[0] || 'User';

          await supabase.from('user_profiles').upsert(
            {
              id:                   session.user.id,
              full_name:            fullName,
              organization_id:      null,
              must_change_password: false,
            },
            { onConflict: 'id' }
          );

          resolvedProfile = {
            id:                   session.user.id,
            organization_id:      null,
            full_name:            fullName,
            avatar_url:           null,
            must_change_password: false,
          };
        }

        if (resolvedProfile) {
          const user: User = {
            id:        session.user.id,
            email:     session.user.email!,
            name:      resolvedProfile.full_name,
            role:      (role ?? 'hr_staff') as User['role'],
            avatar:    resolvedProfile.avatar_url ?? undefined,
            tenantIds: org ? [org.id] : [],
          };
          login(user, true);

          if (org) {
            const tenant: Tenant = {
              id:            org.id,
              name:          org.name,
              slug:          org.slug,
              plan:          org.plan === 'trial' ? 'starter' : org.plan,
              employeeCount: 0,
              logoUrl:       org.logo_url ?? undefined,
              industry:      org.industry ?? '',
              location:      '',
            };
            setTenant(tenant);
          }
          // No org → ProtectedRoute redirects to /select-tenant → auto-redirects to /setup-company
        }
      }

      setChecked(true);
    }

    syncSession();

    // Keep the store in sync with Supabase auth events (token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // While checking the session, show nothing (the ProtectedRoute handles redirects)
  if (!checked && isSupabaseConfigured) return null;
  return null;
}

export default function App() {
  const darkMode = useAuthStore((s) => s.darkMode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <DarkModeSync />
        <SupabaseSessionSync />
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
