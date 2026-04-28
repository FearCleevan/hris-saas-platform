// src/pages/compliance/CompliancePage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, FileSpreadsheet, Lock, ScrollText, FileBarChart, Calendar,
  ChevronDown, CheckCircle2, XCircle, Clock, AlertTriangle, Download, Eye,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import doleData from '@/data/mock/compliance-dole.json';
import reportsData from '@/data/mock/compliance-reports.json';
import auditLogsData from '@/data/mock/compliance-audit-logs.json';
import dpaData from '@/data/mock/compliance-dpa.json';
import customReportsData from '@/data/mock/compliance-custom-reports.json';

/* ─── Types ─── */
type TabId = 'dashboard' | 'dole' | 'govreports' | 'dataprivacy' | 'audit' | 'customreports' | 'calendar';

interface DoleItem {
  id: string; requirement: string; category: string; status: string;
  completedDate: string; renewalDate: string; frequency: string;
  documentRef: string; notes: string;
}

interface GovReport {
  id: string; type: string; name: string; fullName: string; agency: string;
  frequency: string; filingDeadline: string; status: string; period: string;
  filedDate: string; employeeCount: number; totalCompensation: number;
  totalTaxWithheld: number; reference: string; nextDueDate: string;
}

interface AuditLog {
  id: string; userId: string; userName: string; action: string; module: string;
  description: string; ipAddress: string; timestamp: string;
}

interface DpaItem {
  id: string; requirement: string; category: string; status: string;
  completedDate: string; notes: string;
}

interface CustomReport {
  id: string; name: string; description: string; dataSource: string;
  category: string; columns: string[]; filters: Record<string, string | undefined>;
  createdBy: string; createdDate: string; lastRun: string; schedule: string;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Shield },
  { id: 'dole', label: 'DOLE', icon: Building2 },
  { id: 'govreports', label: 'Government Reports', icon: FileSpreadsheet },
  { id: 'dataprivacy', label: 'Data Privacy', icon: Lock },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'customreports', label: 'Custom Reports', icon: FileBarChart },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  compliant:   { label: 'Compliant',   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200' },
  pending:     { label: 'Pending',     color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200' },
  overdue:     { label: 'Overdue',     color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-950/30 border-red-200' },
  filed:       { label: 'Filed',       color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
  not_filed:   { label: 'Not Filed',   color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-950/30' },
};

/* ─── Helpers ─── */
function KpiCard({ label, value, icon: IconC, sub, color }: { label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-[#0038a8]/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-[#0038a8]'}`} />
      </div>
      <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [auditModuleFilter, setAuditModuleFilter] = useState('All');
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditSearch, setAuditSearch] = useState('');
  const [calMonth, setCalMonth] = useState(new Date(2023, 11, 1));

  const dole = doleData as DoleItem[];
  const reports = reportsData as GovReport[];
  const auditLogs = auditLogsData as AuditLog[];
  const dpa = dpaData as DpaItem[];
  const customReports = customReportsData as CustomReport[];

  /* ─── Dashboard ─── */
  const dashboardKPIs = useMemo(() => ({
    doleCompliance: Math.round((dole.filter(d => d.status === 'compliant').length / dole.length) * 100),
    govReportsFiled: reports.filter(r => r.status === 'filed').length,
    dpaCompliance: Math.round((dpa.filter(d => d.status === 'compliant').length / dpa.length) * 100),
    overallScore: Math.round(((dole.filter(d => d.status === 'compliant').length / dole.length) * 35 + (reports.filter(r => r.status === 'filed').length / reports.length) * 30 + (dpa.filter(d => d.status === 'compliant').length / dpa.length) * 20 + 15)),
  }), []);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date('2023-11-24');
    const deadlines: { title: string; date: string; type: string; daysLeft: number }[] = [];
    dole.filter(d => d.status === 'pending' && d.renewalDate).forEach(d => {
      const dDate = new Date(d.renewalDate);
      deadlines.push({ title: d.requirement, date: d.renewalDate, type: 'DOLE', daysLeft: Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) });
    });
    reports.filter(r => r.status === 'pending' || r.status === 'not_filed').forEach(r => {
      const dDate = new Date(r.nextDueDate);
      deadlines.push({ title: `${r.name} - ${r.period}`, date: r.nextDueDate, type: r.agency, daysLeft: Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) });
    });
    return deadlines.sort((a, b) => a.daysLeft - b.daysLeft);
  }, []);

  /* ─── Audit Logs ─── */
  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(log => {
      if (auditModuleFilter !== 'All' && log.module !== auditModuleFilter) return false;
      if (auditActionFilter !== 'All' && log.action !== auditActionFilter) return false;
      if (q && !log.userName.toLowerCase().includes(q) && !log.description.toLowerCase().includes(q) && !log.module.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [auditModuleFilter, auditActionFilter, auditSearch]);

  const auditModules = useMemo(() => ['All', ...new Set(auditLogs.map(l => l.module))].sort(), []);
  const auditActions = useMemo(() => ['All', ...new Set(auditLogs.map(l => l.action))].sort(), []);
  const auditStats = useMemo(() => ({
    total: auditLogs.length, uniqueUsers: new Set(auditLogs.map(l => l.userId)).size, today: auditLogs.filter(l => l.timestamp.startsWith('2023-11-25')).length,
  }), []);

  /* ─── Calendar ─── */
  const calDeadlines = useMemo(() => {
    const map: Record<string, { title: string; type: string }[]> = {};
    dole.filter(d => d.renewalDate).forEach(d => {
      if (!map[d.renewalDate]) map[d.renewalDate] = [];
      map[d.renewalDate].push({ title: d.requirement, type: 'dole' });
    });
    reports.filter(r => r.nextDueDate).forEach(r => {
      if (!map[r.nextDueDate]) map[r.nextDueDate] = [];
      map[r.nextDueDate].push({ title: `${r.name} due`, type: 'report' });
    });
    return map;
  }, []);

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = getDaysInMonth(calMonth);
  const firstDayOfWeek = getDay(startOfMonth(calMonth));
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  /* ─── Render ─── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Compliance & Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Overall Compliance Score: {dashboardKPIs.overallScore}% · {upcomingDeadlines.length} upcoming deadlines
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${dashboardKPIs.overallScore >= 90 ? 'bg-green-100 text-green-700' : dashboardKPIs.overallScore >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {dashboardKPIs.overallScore}% Compliant
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

          {/* ===== DASHBOARD TAB ===== */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="DOLE Compliance" value={`${dashboardKPIs.doleCompliance}%`} icon={Building2} color={dashboardKPIs.doleCompliance >= 90 ? 'bg-green-500' : 'bg-amber-500'} />
                <KpiCard label="Reports Filed" value={`${dashboardKPIs.govReportsFiled}/${reports.length}`} icon={FileSpreadsheet} />
                <KpiCard label="DPA Compliance" value={`${dashboardKPIs.dpaCompliance}%`} icon={Lock} color={dashboardKPIs.dpaCompliance >= 95 ? 'bg-green-500' : 'bg-amber-500'} />
                <KpiCard label="Upcoming Deadlines" value={upcomingDeadlines.length} icon={AlertTriangle} color={upcomingDeadlines.length > 2 ? 'bg-red-500' : 'bg-amber-500'} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Upcoming Deadlines</h3>
                  <div className="flex flex-col gap-2">
                    {upcomingDeadlines.slice(0, 8).map((d, i) => (
                      <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${d.daysLeft <= 7 ? 'bg-red-50 dark:bg-red-950/20' : d.daysLeft <= 30 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-blue-50 dark:bg-blue-950/20'}`}>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{d.title}</p>
                          <p className="text-[10px] text-gray-400">{d.type} · Due: {format(new Date(d.date), 'MMM d, yyyy')}</p>
                        </div>
                        <span className={`text-xs font-bold ${d.daysLeft <= 7 ? 'text-red-600' : d.daysLeft <= 30 ? 'text-amber-600' : 'text-blue-600'}`}>{d.daysLeft}d left</span>
                      </div>
                    ))}
                    {upcomingDeadlines.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No upcoming deadlines</p>}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Quick Actions</h3>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setActiveTab('govreports')} className="text-xs text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-[#0038a8]/10 text-gray-700 dark:text-gray-300 transition-colors">📄 File Government Reports</button>
                    <button onClick={() => setActiveTab('audit')} className="text-xs text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-[#0038a8]/10 text-gray-700 dark:text-gray-300 transition-colors">🔍 View Audit Logs</button>
                    <button onClick={() => setActiveTab('dataprivacy')} className="text-xs text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-[#0038a8]/10 text-gray-700 dark:text-gray-300 transition-colors">🔒 Check DPA Status</button>
                    <button onClick={() => setActiveTab('customreports')} className="text-xs text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-[#0038a8]/10 text-gray-700 dark:text-gray-300 transition-colors">📊 Run Custom Report</button>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Compliance by Category</h3>
                {['DOLE', 'Government Reports', 'Data Privacy'].map(cat => {
                  const pct = cat === 'DOLE' ? dashboardKPIs.doleCompliance : cat === 'Data Privacy' ? dashboardKPIs.dpaCompliance : Math.round((reports.filter(r => r.status === 'filed').length / reports.length) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-gray-600 w-36">{cat}</span>
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== DOLE TAB ===== */}
          {activeTab === 'dole' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Compliant" value={dole.filter(d => d.status === 'compliant').length} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="Pending" value={dole.filter(d => d.status === 'pending').length} icon={Clock} color="bg-amber-500" />
                <KpiCard label="Overdue" value={dole.filter(d => d.status === 'overdue').length} icon={XCircle} color="bg-red-500" />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Requirement</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Frequency</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Renewal / Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dole.map((d, i) => {
                        const stCfg = STATUS_CFG[d.status] || STATUS_CFG.pending;
                        return (
                          <tr key={d.id} className={`${i < dole.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                            <td className="px-4 py-2.5"><span className="text-xs font-semibold text-gray-800 dark:text-white">{d.requirement}</span></td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{d.category}</span></td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{d.frequency}</span></td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{d.renewalDate ? format(new Date(d.renewalDate), 'MMM d, yyyy') : 'N/A'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== GOVERNMENT REPORTS TAB ===== */}
          {activeTab === 'govreports' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Reports Filed" value={reports.filter(r => r.status === 'filed').length} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="Pending" value={reports.filter(r => r.status === 'pending').length} icon={Clock} color="bg-amber-500" />
                <KpiCard label="Next Due" value={reports.filter(r => r.nextDueDate).sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())[0]?.name || '—'} icon={AlertTriangle} />
              </div>
              <div className="flex flex-col gap-3">
                {reports.map((r, i) => {
                  const stCfg = STATUS_CFG[r.status] || STATUS_CFG.not_filed;
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{r.fullName}</p>
                          <p className="text-xs text-gray-400">{r.agency} · {r.frequency} · Due: {r.filingDeadline}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                        <div><span className="text-gray-400">Period:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{r.period}</span></div>
                        {r.filedDate && <div><span className="text-gray-400">Filed:</span> <span className="font-semibold text-gray-700">{format(new Date(r.filedDate), 'MMM d, yyyy')}</span></div>}
                        {r.reference && <div><span className="text-gray-400">Ref:</span> <span className="font-semibold text-gray-700">{r.reference}</span></div>}
                        {r.employeeCount > 0 && <div><span className="text-gray-400">Employees:</span> <span className="font-semibold text-gray-700">{r.employeeCount}</span></div>}
                      </div>
                      <div className="flex gap-2">
                        {r.status === 'pending' && (
                          <button onClick={() => toast.success(`${r.name} for ${r.period} generated`)} className="px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold">Generate & File</button>
                        )}
                        <button onClick={() => toast.success(`Previewing ${r.name}`)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 hover:bg-gray-50"><Eye className="w-3 h-3 inline mr-1" />Preview</button>
                        {r.status === 'filed' && (
                          <button onClick={() => toast.success(`Downloading ${r.name}`)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 hover:bg-gray-50"><Download className="w-3 h-3 inline mr-1" />Download</button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== DATA PRIVACY TAB ===== */}
          {activeTab === 'dataprivacy' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="DPA Compliance" value={`${dashboardKPIs.dpaCompliance}%`} icon={Lock} color={dashboardKPIs.dpaCompliance >= 95 ? 'bg-green-500' : 'bg-amber-500'} />
                <KpiCard label="Compliant Items" value={dpa.filter(d => d.status === 'compliant').length} icon={CheckCircle2} />
                <KpiCard label="Consent Forms" value="48/50" icon={FileSpreadsheet} sub="2 pending from new hires" />
                <KpiCard label="DPO" value="emp036" icon={Shield} sub="Bianca Aquino" />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden mb-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Requirement</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Completed Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dpa.map((d, i) => {
                        const stCfg = STATUS_CFG[d.status] || STATUS_CFG.compliant;
                        return (
                          <tr key={d.id} className={`${i < dpa.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                            <td className="px-4 py-2.5">
                              <span className="text-xs font-semibold text-gray-800 dark:text-white">{d.requirement}</span>
                              <p className="text-[10px] text-gray-400">{d.notes}</p>
                            </td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{d.category}</span></td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{format(new Date(d.completedDate), 'MMM d, yyyy')}</span></td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== AUDIT LOGS TAB ===== */}
          {activeTab === 'audit' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Total Logs" value={auditStats.total} icon={ScrollText} />
                <KpiCard label="Unique Users" value={auditStats.uniqueUsers} icon={Shield} />
                <KpiCard label="Today" value={auditStats.today} icon={Clock} />
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative">
                  <select title='Select' value={auditModuleFilter} onChange={e => setAuditModuleFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {auditModules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <select title='Select' value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {auditActions.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search logs..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                </div>
                <button onClick={() => toast.success('Audit logs exported')} className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 hover:bg-gray-50"><Download className="w-3 h-3 inline mr-1" />Export</button>
                <span className="text-xs text-gray-400">{filteredAuditLogs.length} entries</span>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Timestamp</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">User</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Module</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.map((log, i) => (
                        <tr key={log.id} className={`${i < filteredAuditLogs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                          <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">{log.userName}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${log.action === 'Delete' ? 'bg-red-50 text-red-600' : log.action === 'Approve' ? 'bg-green-50 text-green-600' : log.action === 'Edit' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{log.action}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{log.module}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[300px] truncate">{log.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== CUSTOM REPORTS TAB ===== */}
          {activeTab === 'customreports' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{customReports.length} saved reports</p>
                <button onClick={() => toast.success('Report builder opened')} className="px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl">+ New Report</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {customReports.map((cr, i) => {
                  const createdBy = employeesData.find(e => e.id === cr.createdBy);
                  return (
                    <motion.div key={cr.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{cr.name}</p>
                          <p className="text-xs text-gray-400">{cr.category} · {cr.dataSource}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{cr.schedule}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{cr.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {cr.columns.map(col => <span key={col} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600">{col}</span>)}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-3">
                        <span>Created by: {createdBy?.name || cr.createdBy}</span>
                        <span>Last run: {format(new Date(cr.lastRun), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success(`Running: ${cr.name}`)} className="px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold">Run Report</button>
                        <button onClick={() => toast.success(`Downloading ${cr.name} as CSV`)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600"><Download className="w-3 h-3 inline mr-1" />Export</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== CALENDAR TAB ===== */}
          {activeTab === 'calendar' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <button title='Select' onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                <h2 className="text-base font-bold text-gray-800 dark:text-white">{format(calMonth, 'MMMM yyyy')}</h2>
                <button title='Select' onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Report Due</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Permit Renewal</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />Filing Deadline</span>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const deadlines = calDeadlines[dateStr] || [];
                  const isToday = dateStr === '2023-11-24';
                  return (
                    <div key={dateStr} className={`rounded-lg p-1.5 min-h-[60px] border ${isToday ? 'border-[#0038a8] bg-blue-50 dark:bg-blue-950/20' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
                      <span className={`text-xs font-medium block mb-0.5 ${isToday ? 'text-[#0038a8] font-bold' : 'text-gray-600'}`}>{day}</span>
                      {deadlines.map((dl, di) => (
                        <div key={di} className={`text-[8px] px-1 py-0.5 rounded mb-0.5 truncate ${dl.type === 'dole' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`} title={dl.title}>{dl.title}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}