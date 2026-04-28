import {
  LayoutDashboard, Users, UserPlus, UserMinus, Clock, Calendar, CalendarDays,
  DollarSign, Heart, Receipt, FileText, Target, Briefcase, BarChart2,
  TrendingUp, Settings, BookOpen, type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
  roles?: UserRole[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { label: 'Employees', icon: Users, path: '/employees' },
      { label: 'Onboarding', icon: UserPlus, path: '/onboarding' },
      { label: 'Offboarding', icon: UserMinus, path: '/offboarding' },
    ],
  },
  {
    label: 'Time & Attendance',
    items: [
      { label: 'Attendance', icon: Clock, path: '/attendance' },
      { label: 'Leave Management', icon: Calendar, path: '/leaves' },
      { label: 'Shifts & Schedule', icon: CalendarDays, path: '/schedule' },
    ],
  },
  {
    label: 'Payroll & Benefits',
    items: [
      { label: 'Payroll', icon: DollarSign, path: '/payroll', roles: ['super_admin', 'hr_manager', 'accountant'] },
      { label: 'Benefits', icon: Heart, path: '/benefits' },
      { label: 'Expenses', icon: Receipt, path: '/expenses', roles: ['super_admin', 'hr_manager', 'accountant'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Documents', icon: FileText, path: '/documents' },
      { label: 'Performance', icon: Target, path: '/performance' },
      { label: 'Recruitment', icon: Briefcase, path: '/recruitment', roles: ['super_admin', 'hr_manager'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', icon: BarChart2, path: '/reports' },
      { label: 'Analytics', icon: TrendingUp, path: '/analytics', roles: ['super_admin', 'hr_manager', 'accountant'] },
      { label: 'HR Policy Q&A', icon: BookOpen, path: '/hr-policy' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', icon: Settings, path: '/settings', roles: ['super_admin', 'hr_manager'] },
    ],
  },
];
