// src/pages/settings/SettingsPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Layers, Shield, CheckCheck, Mail, Bell, Plug, Database,
  ChevronDown, Save, ToggleLeft, ToggleRight,
  Eye, Download, RotateCcw, Clock,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import companyData from '@/data/mock/settings-company.json';
import branchesData from '@/data/mock/settings-branches.json';
import rolesData from '@/data/mock/settings-roles.json';
import workflowsData from '@/data/mock/settings-approval-workflows.json';
import templatesData from '@/data/mock/settings-email-templates.json';
import notificationsData from '@/data/mock/settings-notifications.json';

/* ─── Types ─── */
type TabId = 'company' | 'branches' | 'departments' | 'roles' | 'approvals' | 'templates' | 'notifications' | 'integrations' | 'backup';

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
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'backup', label: 'Backup & Restore', icon: Database },
];

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
  const [activeTab, setActiveTab] = useState<TabId>('company');
  const [selectedRole, setSelectedRole] = useState<string>('role002');
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>(
    Object.fromEntries((notificationsData as any[]).map(n => [n.id, n.enabledByDefault]))
  );

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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-[#0038a8] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
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
                  <button onClick={() => toast.success('Company profile saved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold">
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedRoleData.color }}>{selectedRoleData.name[0]}</div>
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
                    <button onClick={() => toast.success(`Previewing: ${tpl.name}`)} className="text-[10px] font-semibold text-[#0038a8] hover:underline"><Eye className="w-3 h-3 inline mr-0.5" />Preview</button>
                    <button onClick={() => toast.success('Test email sent')} className="text-[10px] font-semibold text-gray-500 hover:underline"><Mail className="w-3 h-3 inline mr-0.5" />Send Test</button>
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
                          <button onClick={() => toggleNotification(notif.id)} className="text-gray-400 hover:text-[#0038a8] transition-colors">
                            {activeToggles[notif.id] ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => toast.success('Notification preferences saved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold">
                  <Save className="w-3 h-3" />Save Preferences
                </button>
              </div>
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
                    <button onClick={() => toast.success(`Configuring ${integration.name}...`)} className="mt-3 text-[10px] font-semibold text-[#0038a8] hover:underline">
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
                  <button onClick={() => { toast.success('Backup started...'); setTimeout(() => toast.success('Backup completed! (1.8GB)'), 3000); }} className="mt-3 px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl">
                    <Download className="w-3 h-3 inline mr-1" />Backup Now
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Available Restore Points</h3>
                  {['Nov 24, 2023 02:00 AM', 'Nov 23, 2023 02:00 AM', 'Nov 22, 2023 02:00 AM'].map((rp, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      <span className="text-gray-600">{rp}</span>
                      <button onClick={() => toast.success('Restore initiated. System will be restored in approximately 15 minutes.')} className="text-[10px] font-semibold text-amber-600 hover:underline">
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