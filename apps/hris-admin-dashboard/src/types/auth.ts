export type UserRole = 'super_admin' | 'hr_manager' | 'hr_staff' | 'accountant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  tenantIds: string[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'enterprise';
  employeeCount: number;
  logoUrl?: string | null;
  industry: string;
  location: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isTwoFactorVerified: boolean;
  pendingEmail: string | null;
}
