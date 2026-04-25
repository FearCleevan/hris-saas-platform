// src/pages/analytics/AnalyticsPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Users, DollarSign, Clock, Sparkles, Layout,
  TrendingUp, TrendingDown, ChevronDown, Download, RefreshCw,
  AlertTriangle, CheckCircle2, Lightbulb, Eye, EyeOff, ThumbsUp,
  Briefcase, HeartPulse, FileCheck, CreditCard, Target, Shield,
  ArrowUpRight, ArrowDownRight, Minus, Building, Calendar, XCircle,
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import attendanceLogs from '@/data/mock/attendance-logs.json';
import payrollRun from '@/data/mock/payroll-runs.json';
import benefitsEnrollments from '@/data/mock/benefits-enrollments.json';
import loans from '@/data/mock/benefits-loans.json';
import jobPostings from '@/data/mock/recruitment-jobs.json';
import doleData from '@/data/mock/compliance-dole.json';
import dpaData from '@/data/mock/compliance-dpa.json';
import dashboards from '@/data/mock/analytics-dashboards.json';
import insights from '@/data/mock/analytics-insights.json';

/* ─── Types ─── */
type TabId = 'overview' | 'workforce' | 'payroll' | 'attendance' | 'insights' | 'custom';

interface Insight {
  id: string; type: string; module: string; severity: string;
  title: string; description: string; suggestedAction: string;
  confidenceScore: number; generatedDate: string; status: string;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'custom', label: 'Custom Dashboards', icon: Layout },
];

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const DEPARTMENTS = [...new Set(employeesData.map(e => e.department))].sort();
const ACTIVE_EMP = employeesData.filter(e => e.status === 'active');

const INSIGHT_TYPE_CFG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trend: { label: 'Trend', icon: TrendingUp, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  anomaly: { label: 'Anomaly', icon: AlertTriangle, color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
  prediction: { label: 'Prediction', icon: Lightbulb, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  recommendation: { label: 'Recommendation', icon: ThumbsUp, color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
};

const SEVERITY_CFG: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/10',
  warning: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10',
  info: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10',
  positive: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/10',
};

/* ─── Helpers ─── */
function peso(v: number) { return `₱${(v / 1000).toFixed(0)}K`; }
function pesoFull(v: number) { return `₱${v.toLocaleString()}`; }
function pct(v: number, total: number) { return total > 0 ? `${Math.round((v / total) * 100)}%` : '0%'; }

function KpiCard({ label, value, icon: IconC, sub, color, trend }: { label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string; trend?: 'up' | 'down' | 'flat' }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-brand-blue/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-brand-blue'}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
          {trend === 'flat' && <Minus className="w-3 h-3 text-gray-400" />}
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [insightTypeFilter, setInsightTypeFilter] = useState('All');
  const [insightStatusFilter, setInsightStatusFilter] = useState('All');
  const [insightsList, setInsightsList] = useState<Insight[]>(insights as Insight[]);

  /* ─── Workforce Computations ─── */
  const workforce = useMemo(() => {
    const headcountTrend = [48, 49, 50, 50, 49, 50];
    const deptBreakdown = DEPARTMENTS.map(dept => ({
      name: dept,
      count: employeesData.filter(e => e.department === dept).length,
    })).sort((a, b) => b.count - a.count);
    const maxDept = Math.max(...deptBreakdown.map(d => d.count), 1);

    const ageGroups = { '20-25': 0, '26-30': 0, '31-35': 0, '36-40': 0, '41-45': 0, '46+': 0 };
    employeesData.forEach(e => {
      const age = differenceInYears(new Date(), new Date(e.hireDate)) + 25;
      if (age <= 25) ageGroups['20-25']++;
      else if (age <= 30) ageGroups['26-30']++;
      else if (age <= 35) ageGroups['31-35']++;
      else if (age <= 40) ageGroups['36-40']++;
      else if (age <= 45) ageGroups['41-45']++;
      else ageGroups['46+']++;
    });

    const tenureGroups = { '<1yr': 0, '1-2yr': 0, '2-3yr': 0, '3-5yr': 0, '5+yr': 0 };
    const now = new Date('2023-11-24');
    employeesData.forEach(e => {
      const yrs = differenceInYears(now, new Date(e.hireDate));
      if (yrs < 1) tenureGroups['<1yr']++;
      else if (yrs < 2) tenureGroups['1-2yr']++;
      else if (yrs < 3) tenureGroups['2-3yr']++;
      else if (yrs < 5) tenureGroups['3-5yr']++;
      else tenureGroups['5+yr']++;
    });

    const typeDist = { regular: 0, probationary: 0, contractual: 0 };
    employeesData.forEach(e => { if (e.type in typeDist) typeDist[e.type as keyof typeof typeDist]++; });

    const genderDist = { male: 30, female: 20 };

    return { headcountTrend, deptBreakdown, maxDept, ageGroups, tenureGroups, typeDist, genderDist };
  }, []);

  /* ─── Payroll Computations ─── */
  const payroll = useMemo(() => {
    const totalPayroll = (payrollRun as any[]).reduce((s: number, p: any) => s + (p.grossPay || 0), 0);
    const totalOvertime = (payrollRun as any[]).reduce((s: number, p: any) => s + (p.overtimePay || 0), 0);
    const avgSalary = Math.round(totalPayroll / employeesData.length);
    const trend = [3800000, 3850000, 3900000, 3920000, 3950000, 3980000];
    const maxTrend = Math.max(...trend, 1);
    const deptCosts = DEPARTMENTS.map(dept => ({
      name: dept,
      cost: employeesData.filter(e => e.department === dept).reduce((s, e) => s + e.salary, 0),
    })).sort((a, b) => b.cost - a.cost);
    const maxDeptCost = Math.max(...deptCosts.map(d => d.cost), 1);

    return { totalPayroll, totalOvertime, avgSalary, trend, maxTrend, deptCosts, maxDeptCost };
  }, []);

  /* ─── Attendance Computations ─── */
  const attendance = useMemo(() => {
    const logs = attendanceLogs as any[];
    const total = logs.length;
    const present = logs.filter((l: any) => l.status === 'present' || l.status === 'late').length;
    const rate = Math.round((present / Math.max(total, 1)) * 100);
    const absent = logs.filter((l: any) => l.status === 'absent').length;
    const late = logs.filter((l: any) => l.status === 'late').length;

    const monthlyLate = MONTHS.map(() => Math.floor(Math.random() * 30) + 10);
    const dayOfWeekAbsence = { 'Mon': 18, 'Tue': 10, 'Wed': 12, 'Thu': 8, 'Fri': 15, 'Sat': 2, 'Sun': 1 };
    const maxDOW = Math.max(...Object.values(dayOfWeekAbsence), 1);

    const lateTrend = [15, 18, 12, 20, 14, late];

    return { rate, absent, late, total, monthlyLate, dayOfWeekAbsence, maxDOW, lateTrend };
  }, []);

  /* ─── Overview KPIs ─── */
  const overview = useMemo(() => ({
    headcount: employeesData.length,
    payrollCost: peso(payroll.totalPayroll / 1000),
    attendanceRate: `${attendance.rate}%`,
    openPositions: (jobPostings as any[]).filter((j: any) => j.status === 'active').reduce((s: number, j: any) => s + (j.headcount - j.filled), 0),
    activeLoans: (loans as any[]).filter((l: any) => l.status === 'active').length,
    complianceScore: Math.round(((doleData as any[]).filter((d: any) => d.status === 'compliant').length / (doleData as any[]).length * 35) + ((dpaData as any[]).filter((d: any) => d.status === 'compliant').length / (dpaData as any[]).length * 30) + 30),
  }), [payroll.totalPayroll, attendance.rate]);

  /* ─── Filtered Insights ─── */
  const filteredInsights = useMemo(() => {
    return insightsList.filter(i => {
      if (insightTypeFilter !== 'All' && i.type !== insightTypeFilter) return false;
      if (insightStatusFilter !== 'All' && i.status !== insightStatusFilter) return false;
      return true;
    });
  }, [insightTypeFilter, insightStatusFilter, insightsList]);

  const dismissInsight = (id: string) => {
    setInsightsList(prev => prev.map(i => i.id === id ? { ...i, status: 'dismissed' } : i));
    toast.success('Insight dismissed');
  };

  /* ─── Render ─── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Analytics & Insights</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Data-driven insights across all HR modules · Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.success('Dashboard refreshed')} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh
          </button>
          <button onClick={() => toast.success('Report exported')} className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold">
            <Download className="w-3.5 h-3.5 inline mr-1" />Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => { const Icon = tab.icon; return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Icon className="w-4 h-4" />{tab.label}
          </button>
        );})}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
                <KpiCard label="Total Headcount" value={overview.headcount} icon={Users} trend="flat" />
                <KpiCard label="Monthly Payroll" value={overview.payrollCost} icon={DollarSign} trend="up" />
                <KpiCard label="Attendance Rate" value={overview.attendanceRate} icon={Clock} trend="down" />
                <KpiCard label="Open Positions" value={overview.openPositions} icon={Briefcase} trend="up" />
                <KpiCard label="Active Loans" value={overview.activeLoans} icon={CreditCard} />
                <KpiCard label="Compliance" value={`${overview.complianceScore}%`} icon={Shield} color={overview.complianceScore >= 90 ? 'bg-green-500' : 'bg-amber-500'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Headcount Trend</h3>
                  <div className="flex items-end gap-4 h-32">
                    {workforce.headcountTrend.map((v, i) => {
                      const pctVal = (v / 52) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-gray-600">{v}</span>
                          <div className="w-full bg-brand-blue rounded-t-md" style={{ height: `${pctVal}%`, minHeight: '4px' }} />
                          <span className="text-[10px] text-gray-400">{MONTHS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Department Distribution</h3>
                  <div className="flex flex-col gap-2">
                    {workforce.deptBreakdown.slice(0, 6).map(dept => (
                      <div key={dept.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-20 truncate">{dept.name}</span>
                        <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-blue rounded-full flex items-center justify-end pr-1" style={{ width: `${(dept.count / workforce.maxDept) * 100}%` }}>
                            <span className="text-[8px] font-bold text-white">{dept.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Latest AI Insights</h3>
                <div className="flex flex-col gap-2">
                  {filteredInsights.slice(0, 3).map(ins => {
                    const typeCfg = INSIGHT_TYPE_CFG[ins.type];
                    return (
                      <div key={ins.id} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 border-l-4 ${SEVERITY_CFG[ins.severity]}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${typeCfg.color}`}>{typeCfg.label}</span>
                          <span className="text-xs font-semibold text-gray-800 dark:text-white">{ins.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{ins.description.substring(0, 100)}...</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== WORKFORCE TAB ===== */}
          {activeTab === 'workforce' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Headcount" value={workforce.headcountTrend[5]} icon={Users} />
                <KpiCard label="Active Employees" value={ACTIVE_EMP.length} icon={CheckCircle2} color="bg-green-500" sub={pct(ACTIVE_EMP.length, employeesData.length)} />
                <KpiCard label="Avg Tenure" value={`${(differenceInMonths(new Date('2023-11-24'), new Date('2020-06-15')) / 12).toFixed(1)} yrs`} icon={Clock} />
                <KpiCard label="Turnover Rate" value="4.2%" icon={TrendingDown} color="bg-amber-500" sub="Annualized" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Headcount by Department</h3>
                  <div className="flex flex-col gap-2">
                    {workforce.deptBreakdown.map(dept => (
                      <div key={dept.name} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-28">{dept.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0038a8] rounded-full flex items-center justify-end pr-2" style={{ width: `${(dept.count / workforce.maxDept) * 100}%` }}>
                            <span className="text-[9px] font-bold text-white">{dept.count}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400">{pct(dept.count, employeesData.length)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Age Distribution</h3>
                  <div className="flex items-end gap-3 h-28">
                    {Object.entries(workforce.ageGroups).map(([range, count]) => {
                      const pctVal = (count / 20) * 100;
                      return (
                        <div key={range} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-600">{count}</span>
                          <div className="w-full bg-[#6366f1] rounded-t-md" style={{ height: `${Math.max(pctVal, 5)}%`, minHeight: '4px' }} />
                          <span className="text-[9px] text-gray-400">{range}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Tenure Distribution</h3>
                  {Object.entries(workforce.tenureGroups).map(([range, count]) => (
                    <div key={range} className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-gray-500 w-12">{range}</span>
                      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0891b2] rounded-full" style={{ width: `${(count / employeesData.length) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-600 font-bold">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Employment Type</h3>
                  {Object.entries(workforce.typeDist).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 capitalize">{type}</span>
                      <span className="text-xs font-bold text-gray-700">{count} ({pct(count, employeesData.length)})</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Gender Ratio</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-6 bg-blue-500 rounded-full flex items-center justify-center" style={{ width: `${(workforce.genderDist.male / 50) * 100}%` }}>
                      <span className="text-[10px] font-bold text-white">{workforce.genderDist.male}</span>
                    </div>
                    <span className="text-xs text-gray-400">Male</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-6 bg-pink-400 rounded-full flex items-center justify-center" style={{ width: `${(workforce.genderDist.female / 50) * 100}%` }}>
                      <span className="text-[10px] font-bold text-white">{workforce.genderDist.female}</span>
                    </div>
                    <span className="text-xs text-gray-400">Female</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== PAYROLL TAB ===== */}
          {activeTab === 'payroll' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Monthly Payroll" value={pesoFull(payroll.totalPayroll)} icon={DollarSign} trend="up" />
                <KpiCard label="Cost per Employee" value={pesoFull(payroll.avgSalary)} icon={Users} />
                <KpiCard label="Overtime Cost" value={pesoFull(payroll.totalOvertime)} icon={Clock} trend="down" />
                <KpiCard label="13th Month Accrual" value={pesoFull(Math.round(payroll.totalPayroll / 12))} icon={Calendar} sub="Monthly" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">6-Month Payroll Trend</h3>
                  <div className="flex items-end gap-4 h-36">
                    {payroll.trend.map((v, i) => {
                      const pctVal = (v / payroll.maxTrend) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-600">{peso(v / 1000)}</span>
                          <div className="w-full bg-[#059669] rounded-t-md" style={{ height: `${pctVal}%`, minHeight: '4px' }} />
                          <span className="text-[10px] text-gray-400">{MONTHS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Cost by Department</h3>
                  <div className="flex flex-col gap-2">
                    {payroll.deptCosts.map(dept => (
                      <div key={dept.name} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-28">{dept.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#7c3aed] rounded-full flex items-center justify-end pr-2" style={{ width: `${(dept.cost / payroll.maxDeptCost) * 100}%` }}>
                            <span className="text-[9px] font-bold text-white">{peso(dept.cost / 1000)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== ATTENDANCE TAB ===== */}
          {activeTab === 'attendance' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Attendance Rate" value={`${attendance.rate}%`} icon={CheckCircle2} color={attendance.rate >= 90 ? 'bg-green-500' : 'bg-amber-500'} />
                <KpiCard label="Absenteeism" value={`${Math.round((attendance.absent / Math.max(attendance.total, 1)) * 100)}%`} icon={XCircle} color="bg-red-500" />
                <KpiCard label="Late Arrivals" value={attendance.late} icon={Clock} color="bg-amber-500" />
                <KpiCard label="Total Records" value={attendance.total} icon={BarChart3} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Late Arrivals Trend</h3>
                  <div className="flex items-end gap-4 h-28">
                    {attendance.lateTrend.map((v, i) => {
                      const maxL = Math.max(...attendance.lateTrend, 1);
                      const pctVal = (v / maxL) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-600">{v}</span>
                          <div className="w-full bg-[#f59e0b] rounded-t-md" style={{ height: `${pctVal}%`, minHeight: '4px' }} />
                          <span className="text-[10px] text-gray-400">{MONTHS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Absences by Day of Week</h3>
                  <div className="flex items-end gap-3 h-28">
                    {Object.entries(attendance.dayOfWeekAbsence).map(([day, count]) => {
                      const pctVal = (count / attendance.maxDOW) * 100;
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-600">{count}</span>
                          <div className="w-full bg-[#dc2626] rounded-t-md" style={{ height: `${pctVal}%`, minHeight: '4px' }} />
                          <span className="text-[10px] text-gray-400">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== INSIGHTS TAB ===== */}
          {activeTab === 'insights' && (
            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative">
                  <select title='Select' value={insightTypeFilter} onChange={e => setInsightTypeFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="All">All Types</option>
                    <option value="trend">Trend</option><option value="anomaly">Anomaly</option>
                    <option value="prediction">Prediction</option><option value="recommendation">Recommendation</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <select title='Select' value={insightStatusFilter} onChange={e => setInsightStatusFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="All">All Status</option>
                    <option value="active">Active</option><option value="dismissed">Dismissed</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <button onClick={() => { toast.success('Analyzing data...'); setTimeout(() => toast.success('New insights generated!'), 2000); }} className="ml-auto px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold">
                  <Sparkles className="w-3 h-3 inline mr-1" />Generate Insights
                </button>
                <span className="text-xs text-gray-400">{filteredInsights.length} insights</span>
              </div>
              <div className="flex flex-col gap-3">
                {filteredInsights.map((ins, i) => {
                  const typeCfg = INSIGHT_TYPE_CFG[ins.type];
                  const TypeIcon = typeCfg.icon;
                  return (
                    <motion.div key={ins.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 border-l-4 ${SEVERITY_CFG[ins.severity]}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${typeCfg.color}`}><TypeIcon className="w-2.5 h-2.5 inline mr-0.5" />{typeCfg.label}</span>
                          <span className="text-[9px] text-gray-400">{ins.module}</span>
                          <span className="text-[9px] text-gray-400">Confidence: {ins.confidenceScore}%</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{format(new Date(ins.generatedDate), 'MMM d')}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">{ins.title}</p>
                      <p className="text-xs text-gray-500 mb-2">{ins.description}</p>
                      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 mb-2">
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">💡 Suggested Action:</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-300">{ins.suggestedAction}</p>
                      </div>
                      <div className="flex gap-2">
                        {ins.status === 'active' && (
                          <button onClick={() => dismissInsight(ins.id)} className="text-[10px] font-semibold text-gray-500 hover:text-red-500"><EyeOff className="w-3 h-3 inline mr-0.5" />Dismiss</button>
                        )}
                        <button onClick={() => toast.success('Action implemented')} className="text-[10px] font-semibold text-[#0038a8] hover:underline">✓ Implement</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== CUSTOM DASHBOARDS TAB ===== */}
          {activeTab === 'custom' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{(dashboards as any[]).length} saved dashboards</p>
                <button onClick={() => toast.success('New dashboard created')} className="px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl">+ New Dashboard</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(dashboards as any[]).map((dash: any, i: number) => (
                  <motion.div key={dash.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 ${dash.isDefault ? 'border-[#0038a8] ring-1 ring-[#0038a8]/20' : 'border-gray-200 dark:border-gray-800'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{dash.name}</p>
                          {dash.isDefault && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0038a8]/10 text-[#0038a8] font-semibold">Default</span>}
                        </div>
                        <p className="text-xs text-gray-400">{dash.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {dash.widgets.map((w: any) => (
                        <span key={w.id} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{w.title}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{dash.widgets.length} widgets · Layout: {dash.layout}</span>
                      <span>Modified: {format(new Date(dash.lastModified), 'MMM d')}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => toast.success(`Viewing: ${dash.name}`)} className="px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold"><Eye className="w-3 h-3 inline mr-1" />View</button>
                      <button onClick={() => toast.success('Dashboard exported')} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600"><Download className="w-3 h-3 inline mr-1" />Export</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}