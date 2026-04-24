import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, HeartPulse, Landmark, CreditCard, TrendingUp, Users,
  Search, ChevronDown, Shield, Clock, AlertTriangle, CheckCircle2,
  Building2, PiggyBank, Plus, X, FileText, Download, Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import rawPlans from '@/data/mock/benefits-hmo-plans.json';
import rawEnrollments from '@/data/mock/benefits-enrollments.json';
import rawLoans from '@/data/mock/benefits-loans.json';
import rawDependents from '@/data/mock/benefits-dependents.json';

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
  { id: 'enrollment', label: 'Enrollment',    icon: ClipboardCheck },
  { id: 'hmo',        label: 'HMO',           icon: HeartPulse },
  { id: 'government', label: 'Government',    icon: Landmark },
  { id: 'loans',      label: 'Loans',         icon: CreditCard },
  { id: 'costs',      label: 'Cost Analysis', icon: TrendingUp },
  { id: 'dependents', label: 'Dependents',    icon: Users },
];

const MONTHS = ['Jun 2023', 'Jul 2023', 'Aug 2023', 'Sep 2023', 'Oct 2023', 'Nov 2023'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Active',   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  pending: { label: 'Pending',  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  expired: { label: 'Expired',  color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  closed:  { label: 'Closed',   color: 'text-gray-500 dark:text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
  remitted:{ label: 'Remitted', color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  due:     { label: 'Due',      color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
};

const LOAN_TYPE_CFG: Record<string, { label: string; color: string }> = {
  sss:     { label: 'SSS Loan',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  pagibig: { label: 'Pag-IBIG Loan', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  company: { label: 'Company Loan',  color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400' },
};

const COVERAGE_CFG: Record<string, string> = {
  individual:      'Individual',
  with_dependents: 'With Dependents',
};

/* ─── Helpers ─── */
function peso(val: number) { return `₱${val.toLocaleString()}`; }
function getInitials(name: string) { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }

function calcSSS(salary: number) {
  return { ee: Math.min(Math.round(salary * 0.045), 1350), er: Math.min(Math.round(salary * 0.085), 2550) };
}
function calcPhilHealth(salary: number) {
  const ee = Math.round(Math.min(salary, 80000) * 0.02);
  return { ee, er: ee };
}
function calcPagIBIG(salary: number) {
  const ee = Math.min(Math.round(salary * 0.02), 100);
  return { ee, er: ee };
}

const fieldCls = 'h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 w-full';
const selectCls = `${fieldCls} appearance-none`;

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
  const plans = rawPlans as HmoPlan[];

  /* mutable data state */
  const [enrollments, setEnrollments] = useState<Enrollment[]>(rawEnrollments as Enrollment[]);
  const [loans, setLoans]             = useState<Loan[]>(rawLoans as Loan[]);
  const [dependents, setDependents]   = useState<Dependent[]>(rawDependents as Dependent[]);

  /* filters */
  const [deptFilter,       setDeptFilter]       = useState('All');
  const [statusFilter,     setStatusFilter]     = useState('All');
  const [search,           setSearch]           = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'active' | 'closed'>('active');
  const [loanTypeFilter,   setLoanTypeFilter]   = useState('all');
  const [depEmpFilter,     setDepEmpFilter]     = useState('all');
  const [selectedEmpId,    setSelectedEmpId]    = useState(employeesData[0].id);
  const [hmoPlanFilter,    setHmoPlanFilter]    = useState<string | null>(null);

  /* loan form */
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanForm, setLoanForm] = useState({ employeeId: '', type: 'sss', principal: '', amortization: '', purpose: '' });

  /* dependent form */
  const [showDepForm, setShowDepForm] = useState(false);
  const [depForm, setDepForm] = useState({ employeeId: '', firstName: '', lastName: '', relationship: 'Spouse', birthday: '' });

  /* enrollment form */
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ employeeId: '', planId: '', coverageType: 'individual', lifeInsurance: '' });

  const departments = useMemo(() => ['All', ...new Set(employeesData.map(e => e.department))].sort(), []);
  const sortedEmps  = useMemo(() => [...employeesData].sort((a, b) => a.name.localeCompare(b.name)), []);

  /* ── Enrollment ── */
  const filteredEnrollments = useMemo(() => {
    const q = search.toLowerCase();
    return enrollments
      .filter(enr => {
        const emp = employeesData.find(e => e.id === enr.employeeId);
        if (!emp) return false;
        if (deptFilter !== 'All' && emp.department !== deptFilter) return false;
        if (statusFilter !== 'All' && enr.status !== statusFilter) return false;
        if (q && !emp.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .map(enr => {
        const emp  = employeesData.find(e => e.id === enr.employeeId)!;
        const plan = plans.find(p => p.id === enr.planId);
        return { ...enr, emp, plan };
      });
  }, [enrollments, deptFilter, statusFilter, search, plans]);

  const enrollKPIs = useMemo(() => ({
    total:  enrollments.length,
    active: enrollments.filter(e => e.status === 'active').length,
    pending: enrollments.filter(e => e.status === 'pending').length,
    expiringSoon: enrollments.filter(e => {
      if (e.status !== 'active') return false;
      const diff = (new Date(e.expiryDate).getTime() - new Date('2023-11-24').getTime()) / 86400000;
      return diff > 0 && diff <= 30;
    }).length,
  }), [enrollments]);

  /* ── HMO ── */
  const planStats = useMemo(() => plans.map(plan => {
    const enrolled = enrollments.filter(e => e.planId === plan.id && e.status === 'active');
    const depCount = dependents.filter(d => {
      const enr = enrollments.find(e => e.employeeId === d.employeeId && e.planId === plan.id);
      return enr && d.hmoEnrolled;
    }).length;
    return { ...plan, count: enrolled.length, totalCost: enrolled.length * plan.employerShare, depCount };
  }), [plans, enrollments, dependents]);

  const totalHMOCost = useMemo(() => planStats.reduce((s, p) => s + p.totalCost, 0), [planStats]);

  const hmoRoster = useMemo(() =>
    enrollments
      .filter(enr => enr.status === 'active' && (!hmoPlanFilter || enr.planId === hmoPlanFilter))
      .map(enr => {
        const emp  = employeesData.find(e => e.id === enr.employeeId);
        const plan = plans.find(p => p.id === enr.planId);
        const deps = dependents.filter(d => d.employeeId === enr.employeeId && d.hmoEnrolled).length;
        return emp && plan ? { ...enr, emp, plan, deps } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.emp.name.localeCompare(b.emp.name)),
    [enrollments, hmoPlanFilter, plans, dependents]);

  /* ── Government ── */
  const govTotals = useMemo(() => {
    let sssEE = 0, sssER = 0, phEE = 0, phER = 0, piEE = 0, piER = 0;
    employeesData.forEach(emp => {
      const s  = calcSSS(emp.salary);      sssEE += s.ee;  sssER += s.er;
      const p  = calcPhilHealth(emp.salary); phEE += p.ee;  phER += p.er;
      const pi = calcPagIBIG(emp.salary);  piEE  += pi.ee; piER  += pi.er;
    });
    return { sssEE, sssER, phEE, phER, piEE, piER };
  }, []);

  const govHistory = useMemo(() =>
    MONTHS.map((month, i) => ({ month, status: i < 5 ? 'remitted' : 'due', ...govTotals })),
    [govTotals]);

  const selectedEmp = useMemo(() => employeesData.find(e => e.id === selectedEmpId)!, [selectedEmpId]);
  const empGov = useMemo(() => ({
    sss: calcSSS(selectedEmp.salary),
    ph:  calcPhilHealth(selectedEmp.salary),
    pi:  calcPagIBIG(selectedEmp.salary),
  }), [selectedEmp]);

  /* ── Loans ── */
  const filteredLoans = useMemo(() =>
    loans
      .filter(l => (loanStatusFilter === 'all' || l.status === loanStatusFilter) && (loanTypeFilter === 'all' || l.type === loanTypeFilter))
      .map(l => ({ ...l, emp: employeesData.find(e => e.id === l.employeeId) })),
    [loans, loanStatusFilter, loanTypeFilter]);

  const loanKPIs = useMemo(() => {
    const active = loans.filter(l => l.status === 'active');
    return {
      activeCount:       active.length,
      totalBalance:      active.reduce((s, l) => s + l.balance, 0),
      monthlyCollections: active.reduce((s, l) => s + l.monthlyAmortization, 0),
    };
  }, [loans]);

  /* ── Cost Analysis ── */
  const costAnalysis = useMemo(() => {
    const map: Record<string, { hmo: number; count: number }> = {};
    enrollments.filter(e => e.status === 'active').forEach(enr => {
      const emp  = employeesData.find(em => em.id === enr.employeeId);
      const plan = plans.find(p => p.id === enr.planId);
      if (!emp || !plan) return;
      if (!map[emp.department]) map[emp.department] = { hmo: 0, count: 0 };
      map[emp.department].hmo   += plan.employerShare;
      map[emp.department].count += 1;
    });
    const deptCosts = Object.entries(map)
      .map(([dept, d]) => ({ dept, hmoCost: d.hmo, count: d.count, perEmp: Math.round(d.hmo / d.count) }))
      .sort((a, b) => b.hmoCost - a.hmoCost);
    return { deptCosts, maxHMO: Math.max(...deptCosts.map(d => d.hmoCost), 1) };
  }, [enrollments, plans]);

  /* ── Dependents ── */
  const filteredDeps = useMemo(() =>
    dependents
      .filter(d => depEmpFilter === 'all' || d.employeeId === depEmpFilter)
      .map(d => ({ ...d, emp: employeesData.find(e => e.id === d.employeeId) })),
    [dependents, depEmpFilter]);

  const empsWithDeps = useMemo(() =>
    [...new Set(dependents.map(d => d.employeeId))]
      .map(id => employeesData.find(e => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [dependents]);

  /* ── Action Handlers ── */
  const handleMarkLoanPaid = (id: string) => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, status: 'closed', balance: 0 } : l));
    toast.success('Loan marked as fully paid');
  };

  const handleFileLoan = () => {
    if (!loanForm.employeeId || !loanForm.principal || !loanForm.amortization) {
      toast.error('Fill all required fields'); return;
    }
    const principal = Number(loanForm.principal);
    const amort     = Number(loanForm.amortization);
    const months    = Math.ceil(principal / amort);
    const endDate   = new Date('2023-11-01');
    endDate.setMonth(endDate.getMonth() + months);
    const prefix  = loanForm.type === 'sss' ? 'SSS-SL' : loanForm.type === 'pagibig' ? 'PAG-MPL' : 'COMP-EL';
    const refNo   = `${prefix}-2023-${String(loans.length + 1).padStart(4, '0')}`;
    const newLoan: Loan = {
      id: `loan${Date.now()}`, employeeId: loanForm.employeeId, type: loanForm.type,
      principal, monthlyAmortization: amort, balance: principal,
      startDate: '2023-11-01', endDate: endDate.toISOString().split('T')[0],
      status: 'active', purpose: loanForm.purpose || 'Personal',
      ...(loanForm.type === 'sss'     && { sss:     { loanType: 'Salary Loan',       reference: refNo } }),
      ...(loanForm.type === 'pagibig' && { pagibig: { loanType: 'Multi-Purpose Loan', reference: refNo } }),
      ...(loanForm.type === 'company' && { company: { loanType: 'Emergency Loan',     reference: refNo } }),
    };
    setLoans(prev => [newLoan, ...prev]);
    setLoanForm({ employeeId: '', type: 'sss', principal: '', amortization: '', purpose: '' });
    setShowLoanForm(false);
    toast.success('Loan filed successfully');
  };

  const handleAddDependent = () => {
    if (!depForm.employeeId || !depForm.firstName || !depForm.lastName || !depForm.birthday) {
      toast.error('Fill all required fields'); return;
    }
    const age = 2023 - new Date(depForm.birthday).getFullYear();
    const emp = employeesData.find(e => e.id === depForm.employeeId)!;
    setDependents(prev => [...prev, {
      id: `dep${Date.now()}`, employeeId: depForm.employeeId,
      firstName: depForm.firstName, lastName: depForm.lastName,
      relationship: depForm.relationship, birthday: depForm.birthday,
      age, hmoEnrolled: true,
    }]);
    setDepForm({ employeeId: '', firstName: '', lastName: '', relationship: 'Spouse', birthday: '' });
    setShowDepForm(false);
    toast.success(`Dependent added and enrolled in HMO under ${emp.name}`);
  };

  const handleRemoveDependent = (id: string) => {
    setDependents(prev => prev.filter(d => d.id !== id));
    toast.success('Dependent removed');
  };

  const handleEnrollEmployee = () => {
    if (!enrollForm.employeeId || !enrollForm.planId) {
      toast.error('Select an employee and a plan'); return;
    }
    const already = enrollments.find(e => e.employeeId === enrollForm.employeeId && e.planId === enrollForm.planId && e.status !== 'expired');
    if (already) {
      toast.error('Employee is already enrolled in this plan'); return;
    }
    const effectiveDate = '2023-12-01';
    const expiryDate    = '2024-11-30';
    const newEnrollment: Enrollment = {
      id: `be${Date.now()}`,
      employeeId:        enrollForm.employeeId,
      planId:            enrollForm.planId,
      coverageType:      enrollForm.coverageType,
      enrollmentDate:    '2023-11-24',
      effectiveDate,
      expiryDate,
      status:            'active',
      lifeInsuranceAmount: enrollForm.lifeInsurance ? Number(enrollForm.lifeInsurance) : 0,
    };
    setEnrollments(prev => [newEnrollment, ...prev]);
    setEnrollForm({ employeeId: '', planId: '', coverageType: 'individual', lifeInsurance: '' });
    setShowEnrollForm(false);
    toast.success('Employee enrolled successfully');
  };

  /* ── Render ── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Benefits Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            HMO · Government Benefits · Loans · Dependents · Cost Analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 rounded-xl">
          <Shield className="w-4 h-4 text-[#0038a8]" />
          {enrollKPIs.active} active enrollments · {loanKPIs.activeCount} active loans
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-[#0038a8] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

          {/* ═════════════════════════════════════ ENROLLMENT TAB */}
          {activeTab === 'enrollment' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Enrolled"   value={enrollKPIs.total}        icon={Users} />
                <KpiCard label="Active"           value={enrollKPIs.active}       icon={CheckCircle2} sub={`${Math.round(enrollKPIs.active / enrollKPIs.total * 100)}% coverage`} />
                <KpiCard label="Pending"          value={enrollKPIs.pending}      icon={Clock} />
                <KpiCard label="Expiring Soon"    value={enrollKPIs.expiringSoon} icon={AlertTriangle} sub="Within 30 days" />
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative">
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} title="Department"
                    className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none">
                    {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title="Status"
                    className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none">
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)}
                    className="h-8 pl-8 pr-3 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none" />
                </div>
                <span className="text-xs text-gray-400">{filteredEnrollments.length} records</span>
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => toast.info('Export enrollment report')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Download className="w-3.5 h-3.5" />Export
                  </button>
                  <button type="button" onClick={() => setShowEnrollForm(v => !v)}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${showEnrollForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'bg-[#0038a8] text-white hover:bg-[#002d8a]'}`}>
                    {showEnrollForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showEnrollForm ? 'Cancel' : 'Enroll Employee'}
                  </button>
                </div>
              </div>

              {/* Inline enroll form */}
              <AnimatePresence>
                {showEnrollForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden mb-3"
                  >
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3">New Enrollment</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase">Employee *</label>
                          <select title="Employee" value={enrollForm.employeeId} onChange={e => setEnrollForm(f => ({ ...f, employeeId: e.target.value }))} className={selectCls}>
                            <option value="">Select employee…</option>
                            {sortedEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase">HMO Plan *</label>
                          <select title="HMO Plan" value={enrollForm.planId} onChange={e => setEnrollForm(f => ({ ...f, planId: e.target.value }))} className={selectCls}>
                            <option value="">Select plan…</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name} – {p.tier}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase">Coverage Type</label>
                          <select title="Coverage Type" value={enrollForm.coverageType} onChange={e => setEnrollForm(f => ({ ...f, coverageType: e.target.value }))} className={selectCls}>
                            <option value="individual">Individual</option>
                            <option value="with_dependents">With Dependents</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase">Life Insurance (₱)</label>
                          <input type="number" placeholder="e.g. 500000" value={enrollForm.lifeInsurance}
                            onChange={e => setEnrollForm(f => ({ ...f, lifeInsurance: e.target.value }))} className={fieldCls} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowEnrollForm(false)}
                          className="h-8 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          Cancel
                        </button>
                        <button type="button" onClick={handleEnrollEmployee}
                          className="h-8 px-4 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />Confirm Enrollment
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">HMO Plan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Coverage</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Life Insurance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Expiry</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map((enr, i) => {
                        const stCfg   = STATUS_CFG[enr.status];
                        const isExp   = new Date(enr.expiryDate) <= new Date('2023-12-24') && enr.status === 'active';
                        return (
                          <tr key={enr.id} className={`${i < filteredEnrollments.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {getInitials(enr.emp.name)}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{enr.emp.name}</p>
                                  <p className="text-[10px] text-gray-400">{enr.emp.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{enr.emp.department}</span></td>
                            <td className="px-4 py-2.5">
                              {enr.plan && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: enr.plan.color }}>
                                  {enr.plan.name}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{COVERAGE_CFG[enr.coverageType] ?? enr.coverageType}</span></td>
                            <td className="px-4 py-2.5"><span className="text-xs font-mono text-gray-600">{enr.lifeInsuranceAmount > 0 ? peso(enr.lifeInsuranceAmount) : '—'}</span></td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs ${isExp ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-500'}`}>
                                {format(new Date(enr.expiryDate), 'MMM d, yyyy')}
                                {isExp && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <button type="button"
                                  onClick={() => {
                                    setEnrollments(prev => prev.map(e => e.id === enr.id ? { ...e, status: enr.status === 'active' ? 'pending' : 'active' } : e));
                                    toast.success('Enrollment status updated');
                                  }}
                                  className="text-[10px] font-semibold text-[#0038a8] dark:text-blue-400 hover:underline whitespace-nowrap">
                                  {enr.status === 'active' ? 'Suspend' : 'Re-activate'}
                                </button>
                                <span className="text-gray-200 dark:text-gray-700">|</span>
                                <button type="button"
                                  onClick={() => toast.info(`Open plan change form for ${enr.emp.name}`)}
                                  className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap">
                                  Update Plan
                                </button>
                              </div>
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

          {/* ═════════════════════════════════════ HMO TAB */}
          {activeTab === 'hmo' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                {planStats.map(plan => (
                  <motion.div key={plan.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
                    className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 cursor-pointer transition-all ${
                      hmoPlanFilter === plan.id ? 'border-2' : 'border-gray-200 dark:border-gray-800'
                    }`}
                    style={hmoPlanFilter === plan.id ? { borderColor: plan.color } : {}}
                    onClick={() => setHmoPlanFilter(hmoPlanFilter === plan.id ? null : plan.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: plan.color }}>
                        {plan.tier[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{plan.name}</p>
                        <p className="text-[10px] text-gray-400">{plan.provider} · {plan.tier}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">{plan.description}</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Monthly Premium</span><span className="font-bold text-gray-800 dark:text-white">{peso(plan.monthlyPremium)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">EE Share</span><span className="font-semibold text-gray-700 dark:text-gray-300">{peso(plan.employeeShare)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">ER Share</span><span className="font-semibold text-gray-700 dark:text-gray-300">{peso(plan.employerShare)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Coverage Limit</span><span className="font-semibold text-gray-700 dark:text-gray-300">{peso(plan.coverageLimit)}</span></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: plan.color }}>{plan.count} enrolled · {plan.depCount} deps</span>
                      <span className="text-[10px] text-gray-400">{peso(plan.totalCost)}/mo ER</span>
                    </div>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {plan.dentalCoverage && <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">Dental</span>}
                      {plan.visionCoverage && <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">Vision</span>}
                      <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{plan.roomAndBoard}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Plan filter pills + total */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filter by plan:</span>
                <button type="button" onClick={() => setHmoPlanFilter(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${!hmoPlanFilter ? 'bg-[#0038a8] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  All ({enrollKPIs.active})
                </button>
                {planStats.map(p => (
                  <button key={p.id} type="button" onClick={() => setHmoPlanFilter(hmoPlanFilter === p.id ? null : p.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-opacity"
                    style={{ backgroundColor: p.color, opacity: hmoPlanFilter && hmoPlanFilter !== p.id ? 0.4 : 1 }}>
                    {p.tier} ({p.count})
                  </button>
                ))}
                <span className="ml-auto text-xs font-semibold text-gray-500">Total ER Cost: <span className="text-[#0038a8]">{peso(totalHMOCost)}/mo</span></span>
              </div>

              {/* HMO enrolled employees roster */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">
                    {hmoPlanFilter ? planStats.find(p => p.id === hmoPlanFilter)?.name : 'All Plans'} — Enrolled Members
                  </p>
                  <span className="text-xs text-gray-400">{hmoRoster.length} members</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Coverage</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">EE Premium</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ER Premium</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Dependents</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hmoRoster.map((enr, i) => (
                        <tr key={enr.id} className={`${i < hmoRoster.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: enr.plan.color }}>
                                {getInitials(enr.emp.name)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{enr.emp.name}</p>
                                <p className="text-[10px] text-gray-400">{enr.emp.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: enr.plan.color }}>{enr.plan.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{COVERAGE_CFG[enr.coverageType] ?? enr.coverageType}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-mono text-gray-600 dark:text-gray-400">{peso(enr.plan.employeeShare)}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-mono font-semibold text-[#0038a8] dark:text-blue-400">{peso(enr.plan.employerShare)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${enr.deps > 0 ? 'bg-[#0038a8]/10 text-[#0038a8]' : 'text-gray-300 dark:text-gray-700'}`}>
                              {enr.deps > 0 ? enr.deps : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(enr.expiryDate), 'MMM d, yyyy')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════ GOVERNMENT TAB */}
          {activeTab === 'government' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Monthly SSS (EE+ER)"     value={peso(govTotals.sssEE + govTotals.sssER)} icon={Building2}   sub="Combined contributions" />
                <KpiCard label="Monthly PhilHealth"       value={peso(govTotals.phEE + govTotals.phER)}   icon={HeartPulse}  sub="Combined contributions" />
                <KpiCard label="Monthly Pag-IBIG"         value={peso(govTotals.piEE + govTotals.piER)}   icon={PiggyBank}   sub="Combined contributions" />
                <KpiCard label="Total ER Gov't Cost/mo"   value={peso(govTotals.sssER + govTotals.phER + govTotals.piER)} icon={Landmark} />
              </div>

              {/* Generate remittance report buttons */}
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { label: 'SSS R-3 Report',       icon: FileText },
                  { label: 'PhilHealth RF-1',       icon: FileText },
                  { label: 'Pag-IBIG MCRF',         icon: FileText },
                  { label: 'Export All (Excel)',     icon: Download },
                ].map(({ label, icon: Icon }) => (
                  <button key={label} type="button"
                    onClick={() => toast.info(`Generating ${label}…`)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              {/* Employee-level view */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <p className="text-sm font-bold text-gray-800 dark:text-white flex-1">Individual Contribution Breakdown</p>
                  <div className="relative">
                    <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} title="Select employee"
                      className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none">
                      {sortedEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">{selectedEmp.position} · {selectedEmp.department} · Monthly Salary: {peso(selectedEmp.salary)}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'SSS',      ee: empGov.sss.ee, er: empGov.sss.er,  note: 'EE 4.5% / ER 8.5%' },
                    { label: 'PhilHealth', ee: empGov.ph.ee,  er: empGov.ph.er,   note: 'EE 2% / ER 2%' },
                    { label: 'Pag-IBIG', ee: empGov.pi.ee,  er: empGov.pi.er,   note: 'EE max ₱100' },
                  ].map(({ label, ee, er, note }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-400">Employee</span>
                        <span className="font-semibold text-gray-800 dark:text-white">{peso(ee)}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Employer</span>
                        <span className="font-semibold text-[#0038a8] dark:text-blue-400">{peso(er)}</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-1 flex justify-between text-xs">
                        <span className="text-gray-400">Total</span>
                        <span className="font-bold text-gray-800 dark:text-white">{peso(ee + er)}</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">{note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6-month contribution history */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">6-Month Remittance History (Company-wide)</p>
                  <span className="text-[10px] text-gray-400">50 employees</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[100px]">Month</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">SSS EE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">SSS ER</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">PhilHealth EE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">PhilHealth ER</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Pag-IBIG EE</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Pag-IBIG ER</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {govHistory.map((row, i) => {
                        const stCfg = STATUS_CFG[row.status];
                        return (
                          <tr key={row.month} className={`${i < govHistory.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}>
                            <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">{row.month}</td>
                            <td className="px-4 py-2.5 text-xs text-right font-mono text-gray-600 dark:text-gray-400">{peso(row.sssEE)}</td>
                            <td className="px-4 py-2.5 text-xs text-right font-mono text-gray-600 dark:text-gray-400">{peso(row.sssER)}</td>
                            <td className="px-4 py-2.5 text-xs text-right font-mono text-gray-600 dark:text-gray-400">{peso(row.phEE)}</td>
                            <td className="px-4 py-2.5 text-xs text-right font-mono text-gray-600 dark:text-gray-400">{peso(row.phER)}</td>
                            <td className="px-4 py-2.5 text-xs text-right font-mono text-gray-600 dark:text-gray-400">{peso(row.piEE)}</td>
                            <td className="px-4 py-2.5 text-xs text-right font-mono text-gray-600 dark:text-gray-400">{peso(row.piER)}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>
                                {row.status === 'remitted' && <Check className="w-3 h-3" />}
                                {stCfg.label}
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

          {/* ═════════════════════════════════════ LOANS TAB */}
          {activeTab === 'loans' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Active Loans"       value={loanKPIs.activeCount}        icon={CreditCard} />
                <KpiCard label="Total Outstanding"  value={peso(loanKPIs.totalBalance)} icon={PiggyBank}  />
                <KpiCard label="Monthly Collections" value={peso(loanKPIs.monthlyCollections)} icon={TrendingUp} sub="Total amortizations" />
              </div>

              {/* Filters + File Loan button */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {(['all', 'active', 'closed'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setLoanStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${loanStatusFilter === f ? 'bg-[#0038a8] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {f === 'all' ? 'All Status' : f}
                  </button>
                ))}
                <span className="text-gray-200 dark:text-gray-700 text-sm">|</span>
                {(['all', 'sss', 'pagibig', 'company'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setLoanTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${loanTypeFilter === t ? 'bg-[#0038a8] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {t === 'all' ? 'All Types' : LOAN_TYPE_CFG[t]?.label ?? t}
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{filteredLoans.length} loans</span>
                <button type="button" onClick={() => setShowLoanForm(!showLoanForm)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors">
                  {showLoanForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {showLoanForm ? 'Cancel' : 'File New Loan'}
                </button>
              </div>

              {/* File New Loan Inline Form */}
              <AnimatePresence>
                {showLoanForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-50 dark:bg-[#0038a8]/10 border border-[#0038a8]/30 rounded-2xl p-5 mb-4 overflow-hidden">
                    <p className="text-sm font-bold text-[#0038a8] dark:text-blue-400 mb-4">File New Loan</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Employee *</label>
                        <div className="relative">
                          <select value={loanForm.employeeId} onChange={e => setLoanForm(p => ({ ...p, employeeId: e.target.value }))} title="Employee" className={selectCls}>
                            <option value="">Select employee…</option>
                            {sortedEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Loan Type *</label>
                        <div className="relative">
                          <select value={loanForm.type} onChange={e => setLoanForm(p => ({ ...p, type: e.target.value }))} title="Loan Type" className={selectCls}>
                            <option value="sss">SSS Loan</option>
                            <option value="pagibig">Pag-IBIG Loan</option>
                            <option value="company">Company Loan</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Principal Amount *</label>
                        <input type="number" placeholder="e.g. 20000" value={loanForm.principal}
                          onChange={e => setLoanForm(p => ({ ...p, principal: e.target.value }))}
                          className={fieldCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Monthly Amortization *</label>
                        <input type="number" placeholder="e.g. 1000" value={loanForm.amortization}
                          onChange={e => setLoanForm(p => ({ ...p, amortization: e.target.value }))}
                          className={fieldCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Purpose</label>
                        <input type="text" placeholder="e.g. Medical emergency" value={loanForm.purpose}
                          onChange={e => setLoanForm(p => ({ ...p, purpose: e.target.value }))}
                          className={fieldCls} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={handleFileLoan}
                          className="h-8 w-full rounded-lg bg-[#0038a8] text-white text-xs font-bold hover:bg-[#002d8a] transition-colors">
                          Submit Loan
                        </button>
                      </div>
                    </div>
                    {loanForm.principal && loanForm.amortization && (
                      <p className="text-[10px] text-[#0038a8] mt-2">
                        Estimated term: ~{Math.ceil(Number(loanForm.principal) / Number(loanForm.amortization))} months
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loan cards */}
              <div className="flex flex-col gap-3">
                {filteredLoans.length === 0 && (
                  <div className="text-center py-16 text-sm text-gray-400">No loans found for the selected filter</div>
                )}
                {filteredLoans.map((loan, i) => {
                  const progressPct = Math.round(((loan.principal - loan.balance) / loan.principal) * 100);
                  const typeCfg = LOAN_TYPE_CFG[loan.type];
                  const stCfg  = STATUS_CFG[loan.status];
                  const ref = loan.sss?.reference ?? loan.pagibig?.reference ?? loan.company?.reference ?? '';
                  return (
                    <motion.div key={loan.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {loan.emp ? getInitials(loan.emp.name) : '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{loan.emp?.name ?? loan.employeeId}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeCfg?.color ?? ''}`}>{typeCfg?.label ?? loan.type}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                            {ref && <span className="text-[10px] text-gray-400 font-mono">{ref}</span>}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{loan.purpose}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                            <div><span className="text-gray-400">Principal: </span><span className="font-semibold text-gray-700 dark:text-gray-300">{peso(loan.principal)}</span></div>
                            <div><span className="text-gray-400">Balance: </span><span className="font-semibold text-gray-700 dark:text-gray-300">{peso(loan.balance)}</span></div>
                            <div><span className="text-gray-400">Amort: </span><span className="font-semibold text-gray-700 dark:text-gray-300">{peso(loan.monthlyAmortization)}/mo</span></div>
                            <div><span className="text-gray-400">Due: </span><span className="font-semibold text-gray-700 dark:text-gray-300">{format(new Date(loan.endDate), 'MMM yyyy')}</span></div>
                          </div>
                          {loan.status === 'active' && (
                            <div>
                              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0038a8] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{progressPct}% paid off</p>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col gap-1.5">
                          {loan.status === 'active' && (
                            <button type="button" onClick={() => handleMarkLoanPaid(loan.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold transition-colors">
                              <Check className="w-3 h-3" />Mark Paid
                            </button>
                          )}
                          {loan.status === 'closed' && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                              <CheckCircle2 className="w-3 h-3" />Paid Off
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════ COST ANALYSIS TAB */}
          {activeTab === 'costs' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total HMO Cost/mo"    value={peso(totalHMOCost)}   icon={HeartPulse} sub={`${enrollKPIs.active} enrolled`} />
                <KpiCard label="Avg HMO/Employee"      value={peso(Math.round(totalHMOCost / Math.max(enrollKPIs.active, 1)))} icon={Users} sub="Per month" />
                <KpiCard label="Active Loan Exposure"  value={peso(loanKPIs.totalBalance)}  icon={CreditCard}  sub={`${loanKPIs.activeCount} active loans`} />
                <KpiCard label="Monthly ER Gov't Cost" value={peso(govTotals.sssER + govTotals.phER + govTotals.piER)} icon={Landmark} sub="SSS + PhilHealth + Pag-IBIG" />
              </div>

              {/* Total monthly benefits cost summary */}
              <div className="bg-[#0038a8] rounded-2xl p-5 mb-4 text-white">
                <p className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-1">Total Monthly Benefits Cost to Company</p>
                <p className="text-3xl font-extrabold">
                  {peso(totalHMOCost + govTotals.sssER + govTotals.phER + govTotals.piER)}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  <div><span className="opacity-60">HMO (ER share): </span><span className="font-bold">{peso(totalHMOCost)}</span></div>
                  <div><span className="opacity-60">SSS ER: </span><span className="font-bold">{peso(govTotals.sssER)}</span></div>
                  <div><span className="opacity-60">PhilHealth ER: </span><span className="font-bold">{peso(govTotals.phER)}</span></div>
                  <div><span className="opacity-60">Pag-IBIG ER: </span><span className="font-bold">{peso(govTotals.piER)}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* HMO by department */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">HMO Cost by Department (ER Share)</h3>
                  <div className="flex flex-col gap-2.5">
                    {costAnalysis.deptCosts.map(dept => (
                      <div key={dept.dept} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-24 shrink-0 truncate">{dept.dept}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0038a8] rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${(dept.hmoCost / costAnalysis.maxHMO) * 100}%` }}>
                            <span className="text-[9px] font-bold text-white">{peso(dept.hmoCost)}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 w-20 text-right">{dept.count} emp · {peso(dept.perEmp)}/ea</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan distribution + Gov't breakdown */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">HMO Plan Distribution</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {planStats.map(plan => (
                        <div key={plan.id} className="text-center p-3 rounded-xl" style={{ backgroundColor: `${plan.color}15` }}>
                          <p className="text-2xl font-extrabold" style={{ color: plan.color }}>{plan.count}</p>
                          <p className="text-[10px] font-semibold text-gray-500">{plan.tier}</p>
                          <p className="text-[9px] text-gray-400">{peso(plan.totalCost)}/mo</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Gov't Employer Contributions Breakdown</h3>
                    {[
                      { label: 'SSS (ER)',       value: govTotals.sssER, color: '#0038a8', pct: govTotals.sssER / (govTotals.sssER + govTotals.phER + govTotals.piER) },
                      { label: 'PhilHealth (ER)', value: govTotals.phER,  color: '#059669', pct: govTotals.phER  / (govTotals.sssER + govTotals.phER + govTotals.piER) },
                      { label: 'Pag-IBIG (ER)',  value: govTotals.piER,  color: '#f97316', pct: govTotals.piER  / (govTotals.sssER + govTotals.phER + govTotals.piER) },
                    ].map(({ label, value, color, pct }) => (
                      <div key={label} className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-28 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-xs font-bold font-mono w-20 text-right" style={{ color }}>{peso(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════ DEPENDENTS TAB */}
          {activeTab === 'dependents' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Dependents"        value={dependents.length}              icon={Users} />
                <KpiCard label="HMO Enrolled"            value={dependents.filter(d => d.hmoEnrolled).length} icon={CheckCircle2} sub="Under employee's plan" />
                <KpiCard label="Employees w/ Dependents" value={empsWithDeps.length}            icon={Building2} />
                <KpiCard label="Avg Dependents/Employee" value={(dependents.length / Math.max(empsWithDeps.length, 1)).toFixed(1)} icon={TrendingUp} />
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500">Filter by Employee:</span>
                <div className="relative">
                  <select value={depEmpFilter} onChange={e => setDepEmpFilter(e.target.value)} title="Employee filter"
                    className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none">
                    <option value="all">All Employees</option>
                    {empsWithDeps.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">{filteredDeps.length} dependents</span>
                <button type="button" onClick={() => setShowDepForm(!showDepForm)}
                  className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors">
                  {showDepForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {showDepForm ? 'Cancel' : 'Add Dependent'}
                </button>
              </div>

              {/* Add Dependent Inline Form */}
              <AnimatePresence>
                {showDepForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-5 mb-4 overflow-hidden">
                    <p className="text-sm font-bold text-green-700 dark:text-green-400 mb-4">Add Dependent</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Employee *</label>
                        <div className="relative">
                          <select value={depForm.employeeId} onChange={e => setDepForm(p => ({ ...p, employeeId: e.target.value }))} title="Employee" className={selectCls}>
                            <option value="">Select employee…</option>
                            {sortedEmps.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">First Name *</label>
                        <input type="text" placeholder="First name" value={depForm.firstName}
                          onChange={e => setDepForm(p => ({ ...p, firstName: e.target.value }))} className={fieldCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Last Name *</label>
                        <input type="text" placeholder="Last name" value={depForm.lastName}
                          onChange={e => setDepForm(p => ({ ...p, lastName: e.target.value }))} className={fieldCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Relationship *</label>
                        <div className="relative">
                          <select value={depForm.relationship} onChange={e => setDepForm(p => ({ ...p, relationship: e.target.value }))} title="Relationship" className={selectCls}>
                            <option>Spouse</option>
                            <option>Child</option>
                            <option>Parent</option>
                            <option>Sibling</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Birthday *</label>
                        <input title='Date' type="date" value={depForm.birthday}
                          onChange={e => setDepForm(p => ({ ...p, birthday: e.target.value }))} className={fieldCls} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={handleAddDependent}
                          className="h-8 w-full rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
                          Add &amp; Enroll in HMO
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Dependent</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Relationship</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Age</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Birthday</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">HMO</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeps.map((dep, i) => (
                        <tr key={dep.id} className={`${i < filteredDeps.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}>
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{dep.firstName} {dep.lastName}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{dep.relationship}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-gray-500">{dep.age}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(dep.birthday), 'MMM d, yyyy')}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {dep.emp && (
                                <div className="w-5 h-5 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                                  {getInitials(dep.emp.name)}
                                </div>
                              )}
                              <span className="text-xs text-gray-500">{dep.emp?.name ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dep.hmoEnrolled ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                              {dep.hmoEnrolled ? 'Enrolled' : 'Not enrolled'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button type="button" onClick={() => handleRemoveDependent(dep.id)}
                              className="text-[10px] font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
                              Remove
                            </button>
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
