// src/pages/settings/SettingsPage.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Layers, Shield, CheckCheck, Mail, Bell, Plug, Database,
  ChevronDown, Save, ToggleLeft, ToggleRight,
  Eye, Download, RotateCcw, Clock,
  DollarSign, MessageSquare, Users, UserPlus, Send, Trash2, RefreshCw,
  UserCheck, UserX, Crown,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  sendInvite as sendInviteReal,
  getPendingInvites as getPendingInvitesReal,
  getTeamMembers as getTeamMembersReal,
  revokeInvite as revokeInviteReal,
  changeUserRole as changeUserRoleReal,
} from '@/services/invitations';
import employeesData from '@/data/mock/employees.json';
import companyData from '@/data/mock/settings-company.json';
import branchesData from '@/data/mock/settings-branches.json';
import rolesData from '@/data/mock/settings-roles.json';
import workflowsData from '@/data/mock/settings-approval-workflows.json';
import templatesData from '@/data/mock/settings-email-templates.json';
import notificationsData from '@/data/mock/settings-notifications.json';
import teamMembersData from '@/data/mock/settings-team-members.json';
import invitationsData from '@/data/mock/settings-invitations.json';
import tenantsData from '@/data/mock/tenants.json';

/* ─── Types ─── */
type TabId = 'company' | 'branches' | 'departments' | 'roles' | 'approvals' | 'templates' | 'notifications' | 'integrations' | 'backup' | 'team';

type InviteRole = 'super_admin' | 'hr_manager' | 'hr_staff' | 'accountant';

interface TeamMember {
  id: string; userId: string; name: string; email: string; avatar: string | null;
  role: InviteRole; roleName: string; roleColor: string;
  organizationId: string; organizationName: string;
  isActive: boolean; lastLoginAt: string | null; joinedAt: string;
}

interface Invitation {
  id: string; email: string; role: InviteRole; roleName: string; roleColor: string;
  organizationId: string; organizationName: string;
  sentAt: string; expiresAt: string; status: 'pending' | 'accepted' | 'expired';
}

interface Role {
  id: string; name: string; description: string; level: number;
  isDefault: boolean; userCount: number;
  permissions: Record<string, string>; color: string;
}

interface Workflow {
  id: string; name: string; module: string; triggerCondition: string;
  triggerValue: string; steps: any[]; isActive: boolean; description: string;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'branches', label: 'Branches', icon: MapPin },
  { id: 'departments', label: 'Departments', icon: Layers },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'approvals', label: 'Approval Workflows', icon: CheckCheck },
  { id: 'templates', label: 'Email Templates', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'team', label: 'Team & Access', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'backup', label: 'Backup & Restore', icon: Database },
];

const INVITE_ROLES: { value: InviteRole; label: string; color: string }[] = [
  { value: 'super_admin', label: 'Super Admin', color: '#dc2626' },
  { value: 'hr_manager',  label: 'HR Manager',  color: '#0038a8' },
  { value: 'hr_staff',    label: 'HR Staff',    color: '#7c3aed' },
  { value: 'accountant',  label: 'Accountant',  color: '#059669' },
];

const ROLE_BADGE_CLS: Record<InviteRole, string> = {
  super_admin: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
  hr_manager:  'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  hr_staff:    'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  accountant:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const ROLE_AVATAR_CLS: Record<InviteRole, string> = {
  super_admin: 'bg-red-600',
  hr_manager:  'bg-[#0038a8]',
  hr_staff:    'bg-violet-700',
  accountant:  'bg-emerald-600',
};

const MODULES = ['employees', 'payroll', 'attendance', 'benefits', 'expenses', 'documents', 'performance', 'recruitment', 'compliance', 'analytics', 'settings'];

const PERM_LABELS: Record<string, string> = {
  admin: 'Admin', write: 'Write', approve: 'Approve', write_self: 'Self Write',
  read: 'Read', read_own: 'Read Own', '': 'None',
};

const PERM_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  write: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  approve: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  write_self: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  read: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  read_own: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  '': 'bg-gray-50 text-gray-300 dark:bg-gray-900 dark:text-gray-600',
};

const DEPARTMENTS_LIST = [...new Set(employeesData.map(e => e.department))].sort();

/* ─── Helpers ─── */
function KpiCard({ label, value, icon: IconC, color }: { label: string; value: string | number; icon: React.ElementType; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-[#0038a8]/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-[#0038a8]'}`} />
      </div>
      <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<TabId>('company');
  const [selectedRole, setSelectedRole] = useState<string>('role002');
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>(
    Object.fromEntries((notificationsData as any[]).map(n => [n.id, n.enabledByDefault]))
  );

  // Team & Access state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(teamMembersData as TeamMember[]);
  const [invitations, setInvitations] = useState<Invitation[]>(invitationsData as Invitation[]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('hr_staff');
  const [inviteOrgId, setInviteOrgId] = useState(user?.tenantIds?.[0] ?? 't001');
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  // Orgs this super admin manages (for multi-org invite)
  const myOrgs = useMemo(
    () => tenantsData.filter((t: any) => user?.tenantIds?.includes(t.id)),
    [user?.tenantIds]
  );
  const isMultiOrg = myOrgs.length > 1;

  // Load real team data from Supabase when the team tab becomes active
  const loadTeamData = useCallback(async () => {
    if (!isSupabaseConfigured) return; // stay on mock data in local dev
    const orgId   = user?.tenantIds?.[0] ?? '';
    const orgName = (myOrgs[0] as any)?.name ?? '';
    if (!orgId) return;
    setTeamLoading(true);
    try {
      const [members, invites] = await Promise.all([
        getTeamMembersReal(orgId, orgName),
        getPendingInvitesReal(orgId, orgName),
      ]);
      setTeamMembers(members);
      setInvitations(invites);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load team data');
    } finally {
      setTeamLoading(false);
    }
  }, [user?.tenantIds, myOrgs]);

  useEffect(() => {
    if (activeTab === 'team') loadTeamData();
  }, [activeTab, loadTeamData]);

  const company = companyData;
  const branches = branchesData as any[];
  const roles = rolesData as Role[];
  const workflows = workflowsData as Workflow[];
  const templates = templatesData as any[];
  const notifications = notificationsData as any[];

  const selectedRoleData = useMemo(() => roles.find(r => r.id === selectedRole)!, [selectedRole]);

  const toggleNotification = (id: string) => {
    setActiveToggles(prev => ({ ...prev, [id]: !prev[id] }));
    toast.success('Notification preference updated');
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (invitations.some(i => i.email === email)) {
      toast.error('A pending invitation already exists for this email');
      return;
    }

    const roleInfo = INVITE_ROLES.find(r => r.value === inviteRole)!;
    const orgInfo  = myOrgs.find((o: any) => o.id === inviteOrgId) as any;

    // Optimistic update
    const tempInvite: Invitation = {
      id:               `inv${Date.now()}`,
      email,
      role:             inviteRole,
      roleName:         roleInfo.label,
      roleColor:        roleInfo.color,
      organizationId:   inviteOrgId,
      organizationName: orgInfo?.name ?? '',
      sentAt:           new Date().toISOString(),
      expiresAt:        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status:           'pending',
    };
    setInvitations(prev => [tempInvite, ...prev]);
    setInviteEmail('');

    if (isSupabaseConfigured) {
      try {
        await sendInviteReal({ email, role: inviteRole, organizationId: inviteOrgId });
        toast.success(`Invitation email sent to ${email}`);
      } catch (err: any) {
        // Roll back optimistic update on failure
        setInvitations(prev => prev.filter(i => i.id !== tempInvite.id));
        setInviteEmail(email);
        toast.error(err?.message ?? 'Failed to send invitation');
      }
    } else {
      toast.success(`Invitation sent to ${email} (demo mode — no email sent)`);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    setInvitations(prev => prev.filter(i => i.id !== id));
    if (isSupabaseConfigured) {
      try {
        await revokeInviteReal(id);
        toast.success('Invitation revoked');
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to revoke invitation');
        loadTeamData(); // re-sync
      }
    } else {
      toast.success('Invitation revoked (demo mode)');
    }
  };

  const handleResendInvite = async (email: string) => {
    if (isSupabaseConfigured) {
      try {
        await sendInviteReal({ email, role: inviteRole, organizationId: inviteOrgId });
        toast.success(`Invitation resent to ${email}`);
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to resend invitation');
      }
    } else {
      toast.success(`Invitation resent to ${email} (demo mode)`);
    }
  };

  const handleToggleMemberStatus = (userId: string) => {
    setTeamMembers(prev =>
      prev.map(m => m.userId === userId ? { ...m, isActive: !m.isActive } : m)
    );
    const member = teamMembers.find(m => m.userId === userId);
    toast.success(`${member?.name} ${member?.isActive ? 'deactivated' : 'reactivated'}`);
  };

  const handleChangeRole = async (userId: string, newRole: InviteRole) => {
    const member  = teamMembers.find(m => m.userId === userId);
    const roleInfo = INVITE_ROLES.find(r => r.value === newRole)!;

    // Optimistic update
    setTeamMembers(prev =>
      prev.map(m => m.userId === userId
        ? { ...m, role: newRole, roleName: roleInfo.label, roleColor: roleInfo.color }
        : m)
    );
    setChangingRoleFor(null);

    if (isSupabaseConfigured && member) {
      try {
        await changeUserRoleReal(userId, member.role, newRole, inviteOrgId);
        toast.success('Role updated successfully');
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to update role');
        loadTeamData(); // re-sync
      }
    } else {
      toast.success('Role updated (demo mode)');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Settings & Administration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {company.name} · {company.activeEmployees} employees · {branches.length} locations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => { const Icon = tab.icon; return (
          <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Icon className="w-4 h-4" />{tab.label}
          </button>
        );})}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

          {/* ===== COMPANY TAB ===== */}
          {activeTab === 'company' && (
            <div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">Company Profile</h3>
                  <button type="button" onClick={() => toast.success('Company profile saved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold">
                    <Save className="w-3 h-3" />Save Changes
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-gray-400">Company Name:</span><p className="font-semibold text-gray-800 dark:text-white">{company.name}</p></div>
                  <div><span className="text-gray-400">Legal Name:</span><p className="font-semibold text-gray-800 dark:text-white">{company.legalName}</p></div>
                  <div><span className="text-gray-400">TIN:</span><p className="font-semibold text-gray-800 dark:text-white">{company.taxId}</p></div>
                  <div><span className="text-gray-400">SEC Registration:</span><p className="font-semibold text-gray-800 dark:text-white">{company.secRegistration}</p></div>
                  <div><span className="text-gray-400">SSS Employer No.:</span><p className="font-semibold text-gray-800 dark:text-white">{company.sssEmployerNo}</p></div>
                  <div><span className="text-gray-400">PhilHealth Employer No.:</span><p className="font-semibold text-gray-800 dark:text-white">{company.philhealthEmployerNo}</p></div>
                  <div><span className="text-gray-400">Pag-IBIG Employer No.:</span><p className="font-semibold text-gray-800 dark:text-white">{company.pagibigEmployerNo}</p></div>
                  <div><span className="text-gray-400">BIR RDO:</span><p className="font-semibold text-gray-800 dark:text-white">{company.birRdo}</p></div>
                  <div><span className="text-gray-400">Industry:</span><p className="font-semibold text-gray-800 dark:text-white">{company.industry}</p></div>
                  <div><span className="text-gray-400">Address:</span><p className="font-semibold text-gray-800 dark:text-white">{company.address}, {company.city}, {company.province} {company.zipCode}</p></div>
                  <div><span className="text-gray-400">Phone:</span><p className="font-semibold text-gray-800 dark:text-white">{company.phone}</p></div>
                  <div><span className="text-gray-400">Email:</span><p className="font-semibold text-gray-800 dark:text-white">{company.email}</p></div>
                  <div><span className="text-gray-400">Fiscal Year Start:</span><p className="font-semibold text-gray-800 dark:text-white">{company.fiscalYearStart === '01' ? 'January' : company.fiscalYearStart}</p></div>
                  <div><span className="text-gray-400">Timezone:</span><p className="font-semibold text-gray-800 dark:text-white">{company.timezone}</p></div>
                  <div><span className="text-gray-400">Founded:</span><p className="font-semibold text-gray-800 dark:text-white">{format(new Date(company.foundingDate), 'MMMM d, yyyy')}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* ===== BRANCHES TAB ===== */}
          {activeTab === 'branches' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Active Branches" value={branches.filter((b: any) => b.status === 'active').length} icon={MapPin} />
                <KpiCard label="Total Locations" value={branches.length} icon={Building2} />
                <KpiCard label="HQ Employees" value={branches.find((b: any) => b.isPrimary)?.employeeCount || 0} icon={Shield} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {branches.map((branch: any, i: number) => (
                  <motion.div key={branch.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 ${branch.isPrimary ? 'border-[#0038a8] ring-1 ring-[#0038a8]/10' : 'border-gray-200 dark:border-gray-800'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{branch.name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{branch.code}</span>
                          {branch.isPrimary && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0038a8]/10 text-[#0038a8]">HQ</span>}
                        </div>
                        <p className="text-xs text-gray-400">{branch.address}, {branch.city}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${branch.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>{branch.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                      <div><span className="text-gray-400">Contact:</span> <span className="font-semibold text-gray-700">{branch.contactPerson || '—'}</span></div>
                      <div><span className="text-gray-400">Phone:</span> <span className="font-semibold text-gray-700">{branch.contactPhone || '—'}</span></div>
                      <div><span className="text-gray-400">Employees:</span> <span className="font-bold text-gray-700">{branch.employeeCount}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {branch.facilities.map((f: string) => <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600">{f}</span>)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ===== DEPARTMENTS TAB ===== */}
          {activeTab === 'departments' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Departments" value={DEPARTMENTS_LIST.length} icon={Layers} />
                <KpiCard label="Employees" value={employeesData.length} icon={Shield} />
                <KpiCard label="Avg Team Size" value={Math.round(employeesData.length / DEPARTMENTS_LIST.length)} icon={Shield} />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Headcount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Avg Salary</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Active Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEPARTMENTS_LIST.map((dept, i) => {
                        const emps = employeesData.filter(e => e.department === dept);
                        const avgSalary = Math.round(emps.reduce((s, e) => s + e.salary, 0) / Math.max(emps.length, 1));
                        return (
                          <tr key={dept} className={`${i < DEPARTMENTS_LIST.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}`}>
                            <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{dept}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{emps.length}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">₱{avgSalary.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">Jan 2021</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== ROLES & PERMISSIONS TAB ===== */}
          {activeTab === 'roles' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Select Role:</label>
                <div className="relative">
                  <select title='Select' value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.userCount} users)</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: selectedRoleData.color }}>{selectedRoleData.name[0]}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedRoleData.name}</p>
                    <p className="text-xs text-gray-400">{selectedRoleData.description} · Level {selectedRoleData.level} · {selectedRoleData.userCount} users</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Module</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Permission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod, i) => {
                        const perm = selectedRoleData.permissions[mod] || '';
                        const cfg = PERM_COLORS[perm] || PERM_COLORS[''];
                        return (
                          <tr key={mod} className={`${i < MODULES.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}`}>
                            <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">{mod}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg}`}>{PERM_LABELS[perm] || 'None'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== APPROVAL WORKFLOWS TAB ===== */}
          {activeTab === 'approvals' && (
            <div>
              <div className="flex flex-col gap-3">
                {workflows.map((wf, i) => (
                  <motion.div key={wf.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{wf.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{wf.module} · Trigger: {wf.triggerCondition} {wf.triggerValue}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${wf.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>{wf.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{wf.description}</p>
                    <div className="flex items-center gap-2">
                      {wf.steps.map((step: any, si: number) => (
                        <div key={si} className="flex items-center gap-2">
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-1.5 text-center">
                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Step {step.order}</p>
                            <p className="text-[9px] text-blue-600 dark:text-blue-300">{step.roleName}</p>
                            <p className="text-[8px] text-gray-400">{step.timeoutHours}h timeout</p>
                          </div>
                          {si < wf.steps.length - 1 && <span className="text-gray-300">→</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ===== EMAIL TEMPLATES TAB ===== */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {templates.map((tpl: any, i: number) => (
                <motion.div key={tpl.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{tpl.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{tpl.module} · {tpl.variables.length} variables</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tpl.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>{tpl.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Subject: "{tpl.subject}"</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tpl.variables.map((v: string) => <span key={v} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600">{`{{${v}}}`}</span>)}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => toast.success(`Previewing: ${tpl.name}`)} className="text-[10px] font-semibold text-brand-blue hover:underline"><Eye className="w-3 h-3 inline mr-0.5" />Preview</button>
                    <button type="button" onClick={() => toast.success('Test email sent')} className="text-[10px] font-semibold text-gray-500 hover:underline"><Mail className="w-3 h-3 inline mr-0.5" />Send Test</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ===== NOTIFICATIONS TAB ===== */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Notification</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Module</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Channels</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Frequency</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notif: any, i: number) => (
                      <tr key={notif.id} className={`${i < notifications.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}`}>
                        <td className="px-4 py-2.5"><span className="text-xs font-semibold text-gray-800 dark:text-white">{notif.label}</span></td>
                        <td className="px-4 py-2.5"><span className="text-xs text-gray-500 capitalize">{notif.module}</span></td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            {notif.channels.map((ch: string) => <span key={ch} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 capitalize">{ch.replace('_', ' ')}</span>)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><span className="text-xs text-gray-500 capitalize">{notif.frequency}</span></td>
                        <td className="px-4 py-2.5 text-center">
                          <button type="button" onClick={() => toggleNotification(notif.id)} className="text-gray-400 hover:text-brand-blue transition-colors">
                            {activeToggles[notif.id] ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => toast.success('Notification preferences saved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold">
                  <Save className="w-3 h-3" />Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ===== TEAM & ACCESS TAB ===== */}
          {activeTab === 'team' && (
            <div className="flex flex-col gap-5">

              {/* Loading overlay */}
              {teamLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#0038a8]/30 border-t-[#0038a8] rounded-full animate-spin mr-3" />
                  <span className="text-sm text-gray-400">Loading team data…</span>
                </div>
              )}

              {!teamLoading && (<>

              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total Members" value={teamMembers.length} icon={Users} />
                <KpiCard label="Active Members" value={teamMembers.filter(m => m.isActive).length} icon={UserCheck} />
                <KpiCard label="Pending Invites" value={invitations.filter(i => i.status === 'pending').length} icon={Send} />
                <KpiCard label="Organizations" value={myOrgs.length} icon={Building2} />
              </div>

              {/* Invite panel — Super Admin only */}
              {isSuperAdmin && (
                <div className="bg-white dark:bg-gray-900 border border-[#0038a8]/30 ring-1 ring-[#0038a8]/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#0038a8]/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[#0038a8]" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">Invite Team Member</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                      className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/30"
                    />
                    <div className="relative">
                      <select
                        title="Select role"
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as InviteRole)}
                        className="h-9 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038a8]/30"
                      >
                        {INVITE_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    </div>
                    {isMultiOrg && (
                      <div className="relative">
                        <select
                          title="Select organization"
                          value={inviteOrgId}
                          onChange={e => setInviteOrgId(e.target.value)}
                          className="h-9 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038a8]/30"
                        >
                          {myOrgs.map((o: any) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={handleSendInvite}
                      className="h-9 px-4 rounded-lg bg-brand-blue text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap hover:bg-[#0030a0] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />Send Invite
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    The invitee will receive a sign-up link valid for 7 days. Only Super Admins can send invitations.
                  </p>
                </div>
              )}

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white">Pending Invitations</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{invitations.filter(i => i.status === 'pending').length} pending</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Email</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
                          {isMultiOrg && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Organization</th>}
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Sent</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Expires</th>
                          {isSuperAdmin && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((inv, i) => (
                          <tr key={inv.id} className={`${i < invitations.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}`}>
                            <td className="px-4 py-2.5 text-xs font-medium text-gray-800 dark:text-white">{inv.email}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE_CLS[inv.role] ?? 'bg-gray-100 text-gray-500'}`}>
                                {inv.roleName}
                              </span>
                            </td>
                            {isMultiOrg && <td className="px-4 py-2.5 text-xs text-gray-500">{inv.organizationName}</td>}
                            <td className="px-4 py-2.5 text-xs text-gray-400">{formatDistanceToNow(new Date(inv.sentAt), { addSuffix: true })}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{format(new Date(inv.expiresAt), 'MMM d, yyyy')}</td>
                            {isSuperAdmin && (
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <button type="button" onClick={() => handleResendInvite(inv.email)} className="text-[10px] font-semibold text-brand-blue hover:underline flex items-center gap-0.5">
                                    <RefreshCw className="w-3 h-3" />Resend
                                  </button>
                                  <button type="button" onClick={() => handleRevokeInvite(inv.id)} className="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-0.5">
                                    <Trash2 className="w-3 h-3" />Revoke
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Team Members Table */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">Team Members</h3>
                  {!isSuperAdmin && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />View only — Super Admin can manage roles
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Member</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
                        {isMultiOrg && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Organization</th>}
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Last Active</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                        {isSuperAdmin && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member, i) => (
                        <tr key={member.id} className={`${i < teamMembers.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} ${!member.isActive ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${ROLE_AVATAR_CLS[member.role] ?? 'bg-gray-400'}`}>
                                {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold text-gray-800 dark:text-white">{member.name}</p>
                                  {member.role === 'super_admin' && <Crown className="w-3 h-3 text-amber-500" />}
                                  {member.userId === user?.id && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0038a8]/10 text-[#0038a8] font-semibold">You</span>}
                                </div>
                                <p className="text-[10px] text-gray-400">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            {isSuperAdmin && changingRoleFor === member.userId && member.userId !== user?.id ? (
                              <div className="relative inline-block">
                                <select
                                  title="Change role"
                                  defaultValue={member.role}
                                  autoFocus
                                  onChange={e => handleChangeRole(member.userId, e.target.value as InviteRole)}
                                  onBlur={() => setChangingRoleFor(null)}
                                  className="h-7 appearance-none pl-2 pr-6 rounded-lg border border-[#0038a8] bg-white dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-white focus:outline-none"
                                >
                                  {INVITE_ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                              </div>
                            ) : (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-default ${ROLE_BADGE_CLS[member.role] ?? 'bg-gray-100 text-gray-500'}`}
                                title={isSuperAdmin && member.userId !== user?.id ? 'Click Actions to change role' : ''}
                              >
                                {member.roleName}
                              </span>
                            )}
                          </td>
                          {isMultiOrg && <td className="px-4 py-2.5 text-xs text-gray-500">{member.organizationName}</td>}
                          <td className="px-4 py-2.5 text-xs text-gray-400">
                            {member.lastLoginAt ? formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true }) : 'Never'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${member.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-2.5 text-center">
                              {member.userId === user?.id ? (
                                <span className="text-[10px] text-gray-300">—</span>
                              ) : (
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setChangingRoleFor(prev => prev === member.userId ? null : member.userId)}
                                    className="text-[10px] font-semibold text-brand-blue hover:underline flex items-center gap-0.5"
                                  >
                                    <Shield className="w-3 h-3" />Role
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberStatus(member.userId)}
                                    className={`text-[10px] font-semibold hover:underline flex items-center gap-0.5 ${member.isActive ? 'text-red-500' : 'text-green-600'}`}
                                  >
                                    {member.isActive ? <><UserX className="w-3 h-3" />Deactivate</> : <><UserCheck className="w-3 h-3" />Reactivate</>}
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>)}

            </div>
          )}

          {/* ===== INTEGRATIONS TAB ===== */}
          {activeTab === 'integrations' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { name: 'IoT Biometric Device', desc: 'Fingerprint & face recognition time attendance', status: 'available', icon: Clock },
                { name: 'Accounting Software (Xero)', desc: 'Sync payroll data to accounting system', status: 'available', icon: DollarSign },
                { name: 'Slack Integration', desc: 'HR notifications and approvals via Slack', status: 'available', icon: MessageSquare },
                { name: 'Email (SMTP)', desc: 'Outgoing email server configuration', status: 'connected', icon: Mail },
                { name: 'SSO / SAML', desc: 'Single sign-on integration', status: 'coming_soon', icon: Shield },
                { name: 'API Webhooks', desc: 'Custom webhook endpoints for events', status: 'available', icon: Plug },
              ].map((integration, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <integration.icon className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{integration.name}</p>
                        <p className="text-xs text-gray-400">{integration.desc}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${integration.status === 'connected' ? 'bg-green-50 text-green-600' : integration.status === 'available' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                      {integration.status === 'connected' ? 'Connected' : integration.status === 'available' ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                  {integration.status !== 'coming_soon' && (
                    <button type="button" onClick={() => toast.success(`Configuring ${integration.name}...`)} className="mt-3 text-[10px] font-semibold text-brand-blue hover:underline">
                      {integration.status === 'connected' ? 'Configure' : 'Connect'}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* ===== BACKUP & RESTORE TAB ===== */}
          {activeTab === 'backup' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Last Backup" value="Nov 24, 2023" icon={Clock} />
                <KpiCard label="Backup Size" value="1.8 GB" icon={Database} />
                <KpiCard label="Backup Type" value="Full System" icon={Shield} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Backup Schedule</h3>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">Full System Backup</span>
                    <span className="font-semibold text-gray-700">Daily at 2:00 AM</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">Database Backup</span>
                    <span className="font-semibold text-gray-700">Every 6 hours</span>
                  </div>
                  <button type="button" onClick={() => { toast.success('Backup started...'); setTimeout(() => toast.success('Backup completed! (1.8GB)'), 3000); }} className="mt-3 px-4 py-2 bg-brand-blue text-white text-xs font-semibold rounded-xl">
                    <Download className="w-3 h-3 inline mr-1" />Backup Now
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Available Restore Points</h3>
                  {['Nov 24, 2023 02:00 AM', 'Nov 23, 2023 02:00 AM', 'Nov 22, 2023 02:00 AM'].map((rp, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      <span className="text-gray-600">{rp}</span>
                      <button type="button" onClick={() => toast.success('Restore initiated. System will be restored in approximately 15 minutes.')} className="text-[10px] font-semibold text-amber-600 hover:underline">
                        <RotateCcw className="w-3 h-3 inline mr-0.5" />Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}