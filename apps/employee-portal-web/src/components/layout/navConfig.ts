import { Home, Clock, CalendarDays, Banknote, FileText, TrendingUp, Heart, Bell, Settings, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { path: '/',            label: 'Home',        icon: Home },
  { path: '/attendance',  label: 'Attendance',  icon: Clock },
  { path: '/leaves',      label: 'Leaves',      icon: CalendarDays },
  { path: '/payslip',     label: 'Payslip',     icon: Banknote },
  { path: '/expenses',    label: 'Expenses',    icon: Receipt },
  { path: '/documents',   label: 'Documents',   icon: FileText },
  { path: '/performance', label: 'Performance', icon: TrendingUp },
  { path: '/benefits',       label: 'Benefits',       icon: Heart },
  { path: '/notifications',  label: 'Notifications',  icon: Bell },
  { path: '/settings',       label: 'Settings',       icon: Settings },
];
