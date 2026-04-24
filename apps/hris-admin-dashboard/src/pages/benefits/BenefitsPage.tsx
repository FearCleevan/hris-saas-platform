// src/pages/benefits/BenefitsPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, HeartPulse, Landmark, CreditCard, TrendingUp, Users,
  Search, ChevronDown, Shield, Clock, AlertTriangle, CheckCircle2,
  XCircle, Building2, PiggyBank, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import hmoPlans from '@/data/mock/benefits-hmo-plans.json';
import enrollments from '@/data/mock/benefits-enrollments.json';
import loans from '@/data/mock/benefits-loans.json';
import dependents from '@/data/mock/benefits-dependents.json';

/* ─── Types ─── */
type TabId = 'enrollment' | 'hmo' | 'government' | 'loans' | 'costs' | 'dependents';

interface HmoPlan {
  id: string; name: string; provider: string; tier: string;
  monthlyPremium: number; employerShare: number; employeeShare: number;
  coverageLimit: number; dentalCoverage: boolean; visionCoverage: boolean;
  outpatientCoverage: string; roomAndBoard: string; description: string; color: string;
}

interface Enrollment {
  id: string; employeeId: string; planId: string; coverageType: string;
  enrollmentDate: string; effectiveDate: string; expiryDate: string;
  status: string; lifeInsuranceAmount: number;
}

interface Loan {
  id: string; employeeId: string; type: string; principal: number;
  monthlyAmortization: number; balance: number; startDate: string;
  endDate: string; status: string; purpose: string;
  sss?: { loanType: string; reference: string };
  pagibig?: { loanType: string; reference: string };
  company?: { loanType: string; reference: string };
}

interface Dependent {
  id: string; employeeId: string; firstName: string; lastName: string;
  relationship: string; birthday: string; age: number; hmoEnrolled: boolean;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'enrollment', label: 'Enrollment', icon: ClipboardCheck },
  { id: 'hmo', label: 'HMO', icon: HeartPulse },
  { id: 'government', label: 'Government', icon: Landmark },
  { id: 'loans', label: 'Loans', icon: CreditCard },
  { id: 'costs', label: 'Cost Analysis', icon: TrendingUp },
  { id: 'dependents', label: 'Dependents', icon: Users },
];

const MONTHS = ['Jun 2023', 'Jul 2023', 'Aug 2023', 'Sep 2023', 'Oct 2023', 'Nov 2023'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Active',  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  expired: { label: 'Expired', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  closed:  { label: 'Closed',  color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
};

const COVERAGE_CFG: Record<string, string> = {
  individual: 'Individual',
  with_dependents: 'With Dependents',
};

const LOAN_TYPE_CFG: Record<string, { label: string; color: string }> = {
  sss:     { label: 'SSS Loan',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  pagibig: { label: 'Pag-IBIG Loan', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  company: { label: 'Company Loan', color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400' },
};

/* ─── Helpers ─── */
function peso(val: number) { return `₱${val.toLocaleString()}`; }
function getInitials(name: string) { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }

function calcSSS(salary: number): { ee: number; er: number } {
  const ee = Math.min(salary * 0.045, 1350);
  const er = Math.min(salary * 0.085, 2850);
  return { ee: Math.round(ee), er: Math.round(er) };
}

function calcPhilHealth(salary: number): { ee: number; er: number } {
  const capped = Math.min(salary, 80000);
  const ee = Math.min(capped * 0.02, 1600);
  return { ee: Math.round(ee), er: Math.round(ee) };
}

function calcPagIBIG(salary: number): { ee: number; er: number } {
  const ee = Math.min(salary * 0.02, 100);
  return { ee: Math.round(ee), er: Math.round(ee) };
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#0038a8]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#0038a8]" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function BenefitsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('enrollment');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'active' | 'closed'>('active');
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('all');
  const [depEmployeeFilter, setDepEmployeeFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(employeesData[0].id);
  const [search, setSearch] = useState('');

  const plans = hmoPlans as HmoPlan[];
  const enrollmentsData = enrollments as Enrollment[];
  const loansData = loans as Loan[];
  const dependentsData = dependents as Dependent[];

  const departments = useMemo(() => ['All', ...new Set(employeesData.map(e => e.department))].sort(), []);

  /* ─── Enrollment Tab Computations ─── */
  const filteredEnrollments = useMemo(() => {
    const q = search.toLowerCase();
    return enrollmentsData.filter((enr) => {
      const emp = employeesData.find(e => e.id === enr.employeeId);
      if (!emp) return false;
      if (deptFilter !== 'All' && emp.department !== deptFilter) return false;
      if (statusFilter !== 'All' && enr.status !== statusFilter) return false;
      if (q && !emp.name.toLowerCase().includes(q) && !emp.department.toLowerCase().includes(q)) return false;
      return true;
    }).map(enr => {
      const emp = employeesData.find(e => e.id === enr.employeeId)!;
      const plan = plans.find(p => p.id === enr.planId);
      return { ...enr, emp, plan };
    });
  }, [deptFilter, statusFilter, search]);

  const enrollmentKPIs = useMemo(() => ({
    total: enrollmentsData.length,
    active: enrollmentsData.filter(e => e.status === 'active').length,
    pending: enrollmentsData.filter(e => e.status === 'pending').length,
    expiringSoon: enrollmentsData.filter(e => {
      const expiry = new Date(e.expiryDate);
      const now = new Date('2023-11-24');
      const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return e.status === 'active' && diff <= 30 && diff > 0;
    }).length,
  }), []);

  /* ─── HMO Tab Computations ─── */
  const planStats = useMemo(() => plans.map(plan => {
    const enrolled = enrollmentsData.filter(e => e.planId === plan.id && e.status === 'active');
    return { ...plan, count: enrolled.length, totalCost: enrolled.length * plan.employerShare };
  }), [plans]);

  const totalHMOCost = useMemo(() => planStats.reduce((s, p) => s + p.totalCost, 0), [planStats]);

  /* ─── Government Computations ─── */
  const govContributions = useMemo(() => {
    return MONTHS.map(() => {
      let totalSSSEE = 0, totalSSSER = 0;
      let totalPHEE = 0, totalPHER = 0;
      let totalPIBIGEE = 0, totalPIBIGER = 0;
      employeesData.forEach(emp => {
        const sss = calcSSS(emp.salary);
        const ph = calcPhilHealth(emp.salary);
        const pi = calcPagIBIG(emp.salary);
        totalSSSEE += sss.ee; totalSSSER += sss.er;
        totalPHEE += ph.ee; totalPHER += ph.er;
        totalPIBIGEE += pi.ee; totalPIBIGER += pi.er;
      });
      return {
        month: MONTHS[MONTHS.indexOf('Nov 2023')], // simplified; real implementation would vary
        sssEE: totalSSSEE, sssER: totalSSSER,
        phEE: totalPHEE, phER: totalPHER,
        pagibigEE: totalPIBIGEE, pagibigER: totalPIBIGER,
      };
    }).map((item, i) => ({ ...item, month: MONTHS[i] }));
  }, []);

  const selectedEmp = useMemo(() => employeesData.find(e => e.id === selectedEmployee)!, [selectedEmployee]);

  const empGovContributions = useMemo(() => {
    const sss = calcSSS(selectedEmp.salary);
    const ph = calcPhilHealth(selectedEmp.salary);
    const pi = calcPagIBIG(selectedEmp.salary);
    return { sss, ph, pi };
  }, [selectedEmployee]);

  /* ─── Loans Computations ─── */
  const filteredLoans = useMemo(() => {
    return loansData.filter(l => {
      if (loanStatusFilter !== 'all' && l.status !== loanStatusFilter) return false;
      if (loanTypeFilter !== 'all' && l.type !== loanTypeFilter) return false;
      return true;
    }).map(l => {
      const emp = employeesData.find(e => e.id === l.employeeId);
      const typeCfg = LOAN_TYPE_CFG[l.type];
      return { ...l, emp, typeLabel: typeCfg?.label ?? l.type, typeColor: typeCfg?.color ?? '' };
    });
  }, [loanStatusFilter, loanTypeFilter]);

  const loanKPIs = useMemo(() => {
    const active = loansData.filter(l => l.status === 'active');
    return {
      activeCount: active.length,
      totalBalance: active.reduce((s, l) => s + l.balance, 0),
      monthlyCollections: active.reduce((s, l) => s + l.monthlyAmortization, 0),
    };
  }, []);

  /* ─── Cost Analysis Computations ─── */
  const costAnalysis = useMemo(() => {
    const deptMap: Record<string, { hmo: number; count: number }> = {};
    enrollmentsData.filter(e => e.status === 'active').forEach(enr => {
      const emp = employeesData.find(em => em.id === enr.employeeId);
      const plan = plans.find(p => p.id === enr.planId);
      if (!emp || !plan) return;
      if (!deptMap[emp.department]) deptMap[emp.department] = { hmo: 0, count: 0 };
      deptMap[emp.department].hmo += plan.employerShare;
      deptMap[emp.department].count++;
    });

    const deptCosts = Object.entries(deptMap).map(([dept, data]) => ({
      dept, hmoCost: data.hmo, count: data.count, perEmployee: Math.round(data.hmo / data.count),
    })).sort((a, b) => b.hmoCost - a.hmoCost);

    const maxHMO = Math.max(...deptCosts.map(d => d.hmoCost), 1);

    return { deptCosts, maxHMO, totalHMO: totalHMOCost };
  }, [totalHMOCost]);

  /* ─── Dependents Computations ─── */
  const filteredDependents = useMemo(() => {
    return depEmployeeFilter === 'all'
      ? dependentsData.map(d => {
          const emp = employeesData.find(e => e.id === d.employeeId);
          return { ...d, emp };
        })
      : dependentsData.filter(d => d.employeeId === depEmployeeFilter).map(d => {
          const emp = employeesData.find(e => e.id === d.employeeId);
          return { ...d, emp };
        });
  }, [depEmployeeFilter]);

  const employeesWithDependents = useMemo(
    () => [...new Set(dependentsData.map(d => d.employeeId))].map(id => {
      const emp = employeesData.find(e => e.id === id);
      return emp ? { id: emp.id, name: emp.name } : null;
    }).filter(Boolean) as { id: string; name: string }[],
    [],
  );

  /* ─── Render ─── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Benefits Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage HMO, government contributions, loans, and dependents
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="w-4 h-4" />
          <span>{enrollmentKPIs.active} active enrollments</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0038a8] text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          
          {/* ===== ENROLLMENT TAB ===== */}
          {activeTab === 'enrollment' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Enrolled" value={enrollmentKPIs.total} icon={Users} />
                <KpiCard label="Active" value={enrollmentKPIs.active} icon={CheckCircle2} sub={`${Math.round(enrollmentKPIs.active / enrollmentKPIs.total * 100)}%`} />
                <KpiCard label="Pending" value={enrollmentKPIs.pending} icon={Clock} />
                <KpiCard label="Expiring Soon" value={enrollmentKPIs.expiringSoon} icon={AlertTriangle} sub="Within 30 days" />
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative">
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} title="Department" className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title="Status" className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                </div>
                <span className="text-xs text-gray-400 ml-auto">{filteredEnrollments.length} records</span>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">HMO Plan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Coverage</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Life Insurance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map((enr, i) => {
                        const stCfg = STATUS_CFG[enr.status];
                        const isExpiring = new Date(enr.expiryDate) <= new Date('2023-12-24') && enr.status === 'active';
                        return (
                          <tr key={enr.id} className={`${i < filteredEnrollments.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold shrink-0">{getInitials(enr.emp.name)}</div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{enr.emp.name}</p>
                                  <p className="text-[10px] text-gray-400">{enr.emp.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{enr.emp.department}</span></td>
                            <td className="px-4 py-2.5">
                              {enr.plan && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: enr.plan.color }}>{enr.plan.name}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{COVERAGE_CFG[enr.coverageType] ?? enr.coverageType}</span></td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-600">{enr.lifeInsuranceAmount > 0 ? peso(enr.lifeInsuranceAmount) : '—'}</span></td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs ${isExpiring ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-500'}`}>
                                {format(new Date(enr.expiryDate), 'MMM d, yyyy')}
                                {isExpiring && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                              </span>
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

          {/* ===== HMO TAB ===== */}
          {activeTab === 'hmo' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                {planStats.map(plan => (
                  <div key={plan.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: plan.color }}>
                        {plan.tier[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{plan.name}</p>
                        <p className="text-[10px] text-gray-400">{plan.provider} · {plan.tier}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{plan.description}</p>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-gray-500 dark:text-gray-400">Monthly Premium</span>
                      <span className="font-bold text-gray-800 dark:text-white">{peso(plan.monthlyPremium)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-gray-500 dark:text-gray-400">Enrolled</span>
                      <span className="font-bold" style={{ color: plan.color }}>{plan.count} employees</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-gray-500 dark:text-gray-400">Employer Cost/mo</span>
                      <span className="font-bold text-gray-800 dark:text-white">{peso(plan.totalCost)}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Coverage: {peso(plan.coverageLimit)} · {plan.outpatientCoverage} · {plan.roomAndBoard}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Total Monthly HMO Employer Cost: {peso(totalHMOCost)}</p>
              </div>
            </div>
          )}

          {/* ===== GOVERNMENT TAB ===== */}
          {activeTab === 'government' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="SSS Contribution" value={peso(govContributions[5].sssEE + govContributions[5].sssER)} icon={Building2} sub="Combined EE + ER" />
                <KpiCard label="PhilHealth" value={peso(govContributions[5].phEE + govContributions[5].phER)} icon={HeartPulse} sub="Combined EE + ER" />
                <KpiCard label="Pag-IBIG" value={peso(govContributions[5].pagibigEE + govContributions[5].pagibigER)} icon={PiggyBank} sub="Combined EE + ER" />
                <KpiCard label="Total Gov't ER Cost" value={peso(govContributions[5].sssER + govContributions[5].phER + govContributions[5].pagibigER)} icon={Landmark} />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Employee View:</label>
                <div className="relative">
                  <select title='Select' value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">{selectedEmp.name} — Monthly Contributions</p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">SSS</p>
                    <p className="font-bold text-gray-800 dark:text-white">EE: {peso(empGovContributions.sss.ee)}</p>
                    <p className="font-bold text-gray-800 dark:text-white">ER: {peso(empGovContributions.sss.er)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">PhilHealth</p>
                    <p className="font-bold text-gray-800 dark:text-white">EE: {peso(empGovContributions.ph.ee)}</p>
                    <p className="font-bold text-gray-800 dark:text-white">ER: {peso(empGovContributions.ph.er)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-gray-400 mb-1">Pag-IBIG</p>
                    <p className="font-bold text-gray-800 dark:text-white">EE: {peso(empGovContributions.pi.ee)}</p>
                    <p className="font-bold text-gray-800 dark:text-white">ER: {peso(empGovContributions.pi.er)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">6-Month Contribution History (Company-wide)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Month</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">SSS EE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">SSS ER</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">PhilHealth EE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">PhilHealth ER</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Pag-IBIG EE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Pag-IBIG ER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {govContributions.map((item, i) => (
                        <tr key={item.month} className={`${i < govContributions.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}`}>
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">{item.month}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-600">{peso(item.sssEE)}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-600">{peso(item.sssER)}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-600">{peso(item.phEE)}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-600">{peso(item.phER)}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-600">{peso(item.pagibigEE)}</td>
                          <td className="px-4 py-2.5 text-xs text-right text-gray-600">{peso(item.pagibigER)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== LOANS TAB ===== */}
          {activeTab === 'loans' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Active Loans" value={loanKPIs.activeCount} icon={CreditCard} />
                <KpiCard label="Outstanding Balance" value={peso(loanKPIs.totalBalance)} icon={PiggyBank} />
                <KpiCard label="Monthly Collections" value={peso(loanKPIs.monthlyCollections)} icon={ArrowDownRight} />
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {(['all', 'active', 'closed'] as const).map(f => (
                  <button key={f} onClick={() => setLoanStatusFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${loanStatusFilter === f ? 'bg-[#0038a8] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{f}</button>
                ))}
                <span className="text-gray-300 dark:text-gray-600">|</span>
                {(['all', 'sss', 'pagibig', 'company'].map(t => (
                  <button key={t} onClick={() => setLoanTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${loanTypeFilter === t ? 'bg-[#0038a8] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{t === 'all' ? 'All Types' : LOAN_TYPE_CFG[t]?.label ?? t}</button>
                )))}
                <span className="text-xs text-gray-400 ml-auto">{filteredLoans.length} loans</span>
              </div>

              <div className="flex flex-col gap-3">
                {filteredLoans.map((loan, i) => {
                  const progressPct = Math.round((loan.balance / loan.principal) * 100);
                  return (
                    <motion.div key={loan.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">{loan.emp ? getInitials(loan.emp.name) : '??'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{loan.emp?.name}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${loan.typeColor}`}>{loan.typeLabel}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CFG[loan.status].bg} ${STATUS_CFG[loan.status].color}`}>{STATUS_CFG[loan.status].label}</span>
                          </div>
                          <p className="text-xs text-gray-400">{loan.purpose}</p>
                          <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                            <div><span className="text-gray-400">Principal:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{peso(loan.principal)}</span></div>
                            <div><span className="text-gray-400">Balance:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{peso(loan.balance)}</span></div>
                            <div><span className="text-gray-400">Amort:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{peso(loan.monthlyAmortization)}/mo</span></div>
                            <div><span className="text-gray-400">End Date:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{format(new Date(loan.endDate), 'MMM yyyy')}</span></div>
                          </div>
                          {loan.status === 'active' && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0038a8] rounded-full" style={{ width: `${100 - progressPct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{100 - progressPct}% paid</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== COST ANALYSIS TAB ===== */}
          {activeTab === 'costs' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total HMO Cost/mo" value={peso(costAnalysis.totalHMO)} icon={HeartPulse} sub={`${enrollmentKPIs.active} employees`} />
                <KpiCard label="Avg HMO/Employee" value={peso(Math.round(costAnalysis.totalHMO / Math.max(enrollmentKPIs.active, 1)))} icon={Users} sub="Per month" />
                <KpiCard label="Active Loans" value={loanKPIs.activeCount} icon={CreditCard} sub={peso(loanKPIs.totalBalance)} />
                <KpiCard label="Monthly ER Gov't" value={peso(govContributions[5].sssER + govContributions[5].phER + govContributions[5].pagibigER)} icon={Landmark} />
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">HMO Cost by Department</h3>
                <div className="flex flex-col gap-2.5">
                  {costAnalysis.deptCosts.map(dept => (
                    <div key={dept.dept} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 shrink-0">{dept.dept}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0038a8] rounded-full flex items-center justify-end pr-2" style={{ width: `${(dept.hmoCost / costAnalysis.maxHMO) * 100}%` }}>
                          <span className="text-[9px] font-bold text-white">{peso(dept.hmoCost)}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{dept.count} emp · {peso(dept.perEmployee)}/emp</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">HMO Plan Distribution</h3>
                <div className="grid grid-cols-4 gap-2">
                  {planStats.map(plan => (
                    <div key={plan.id} className="text-center p-3 rounded-xl" style={{ backgroundColor: `${plan.color}15` }}>
                      <p className="text-2xl font-extrabold" style={{ color: plan.color }}>{plan.count}</p>
                      <p className="text-[10px] font-semibold text-gray-500">{plan.name}</p>
                      <p className="text-[9px] text-gray-400">{peso(plan.totalCost)}/mo</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== DEPENDENTS TAB ===== */}
          {activeTab === 'dependents' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Dependents" value={dependentsData.length} icon={Users} />
                <KpiCard label="HMO Enrolled" value={dependentsData.filter(d => d.hmoEnrolled).length} icon={CheckCircle2} />
                <KpiCard label="Employees w/ Dependents" value={employeesWithDependents.length} icon={Building2} />
                <KpiCard label="Avg Dependents/Emp" value={(dependentsData.length / Math.max(employeesWithDependents.length, 1)).toFixed(1)} icon={TrendingUp} />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500">Filter by Employee:</span>
                <div className="relative">
                  <select title='Select' value={depEmployeeFilter} onChange={e => setDepEmployeeFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="all">All Employees</option>
                    {employeesWithDependents.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400 ml-auto">{filteredDependents.length} dependents</span>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Dependent</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Relationship</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Age</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Birthday</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">HMO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDependents.map((dep, i) => (
                        <tr key={dep.id} className={`${i < filteredDependents.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                          <td className="px-4 py-2.5"><span className="text-xs font-semibold text-gray-800 dark:text-white">{dep.firstName} {dep.lastName}</span></td>
                          <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{dep.relationship}</span></td>
                          <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{dep.age}</span></td>
                          <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{format(new Date(dep.birthday), 'MMM d, yyyy')}</span></td>
                          <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{dep.emp?.name ?? '—'}</span></td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dep.hmoEnrolled ? 'bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200'}`}>
                              {dep.hmoEnrolled ? 'Enrolled' : 'Not Enrolled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}