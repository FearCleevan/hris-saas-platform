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
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import MyProfilePage from '@/pages/profile/MyProfilePage';
import AttendancePage from '@/pages/attendance/AttendancePage';
import LeavePage from '@/pages/leaves/LeavePage';
import PayslipPage from '@/pages/payslip/PayslipPage';
import ExpensePage from '@/pages/expenses/ExpensePage';
import DocumentsPage from '@/pages/documents/DocumentsPage';
import ComingSoonPage from '@/pages/ComingSoonPage';
import PerformancePage from '@/pages/performance/PerformancePage';
import BenefitsPage from '@/pages/benefits/BenefitsPage';
import NotificationsPage from '@/pages/notifications/NotificationsPage';
import SettingsPage from '@/pages/settings/SettingsPage';

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
    ],
  },
  {
    path: '/change-password',
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile', element: <MyProfilePage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'leaves', element: <LeavePage /> },
      { path: 'payslip', element: <PayslipPage /> },
      { path: 'expenses', element: <ExpensePage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'performance', element: <PerformancePage /> },
      { path: 'benefits', element: <BenefitsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'settings', element: <SettingsPage /> },
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
