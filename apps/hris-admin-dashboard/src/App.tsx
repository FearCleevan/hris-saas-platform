import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Toaster } from 'sonner';
import { useEffect } from 'react';

import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/components/router/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { lightTheme, darkTheme } from '@/lib/theme';

import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import TwoFactorPage from '@/pages/auth/TwoFactorPage';
import TenantSelectorPage from '@/pages/auth/TenantSelectorPage';
import CompanySetupPage from '@/pages/auth/CompanySetupPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import EmployeeListPage from '@/pages/employees/EmployeeListPage';
import EmployeeProfilePage from '@/pages/employees/EmployeeProfilePage';
import NewEmployeePage from '@/pages/employees/NewEmployeePage';
import BulkUploadPage from '@/pages/employees/BulkUploadPage';
import OrgChartPage from '@/pages/employees/OrgChartPage';
import OnboardingPage from '@/pages/onboarding/OnboardingPage';
import OnboardingDetailPage from '@/pages/onboarding/OnboardingDetailPage';
import OffboardingPage from '@/pages/offboarding/OffboardingPage';
import OffboardingDetailPage from '@/pages/offboarding/OffboardingDetailPage';
import AttendancePage from '@/pages/attendance/AttendancePage';
import LeavesPage from '@/pages/leaves/LeavesPage';
import SchedulePage from '@/pages/schedule/SchedulePage';
import ComingSoonPage from '@/pages/ComingSoonPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
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
      { path: 'employees/:id/edit', element: <ComingSoonPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'onboarding/:id', element: <OnboardingDetailPage /> },
      { path: 'offboarding', element: <OffboardingPage /> },
      { path: 'offboarding/:id', element: <OffboardingDetailPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'leaves', element: <LeavesPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'payroll', element: <ComingSoonPage /> },
      { path: 'benefits', element: <ComingSoonPage /> },
      { path: 'expenses', element: <ComingSoonPage /> },
      { path: 'documents', element: <ComingSoonPage /> },
      { path: 'performance', element: <ComingSoonPage /> },
      { path: 'recruitment', element: <ComingSoonPage /> },
      { path: 'reports', element: <ComingSoonPage /> },
      { path: 'analytics', element: <ComingSoonPage /> },
      { path: 'settings/*', element: <ComingSoonPage /> },
      { path: 'notifications', element: <ComingSoonPage /> },
      { path: '*', element: <ComingSoonPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

function DarkModeSync() {
  const darkMode = useAuthStore((s) => s.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  return null;
}

export default function App() {
  const darkMode = useAuthStore((s) => s.darkMode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <DarkModeSync />
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
