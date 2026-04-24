// src/pages/expenses/ExpensesPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCheck, Image, Building2, TrendingUp, Target,
  Search, ChevronDown, Download, Plus, X, Check, Clock,
  AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Plane, UtensilsCrossed, Package, Car, Monitor, GraduationCap,
  Zap, Wrench, CalendarDays, MoreHorizontal, Eye, Banknote,
  Receipt, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import categoriesData from '@/data/mock/expenses-categories.json';
import claimsDataInitial from '@/data/mock/expenses-claims.json';
import companyDataInitial from '@/data/mock/expenses-company.json';
import budgetsData from '@/data/mock/expenses-budgets.json';

/* ─── Types ─── */
type TabId = 'claims' | 'approvals' | 'receipts' | 'company' | 'reports' | 'budget';

interface Category {
  id: string; name: string; icon: string; description: string;
  monthlyBudget: number; requiresReceipt: boolean; receiptThreshold: number;
  escalationThreshold: number; color: string;
}

interface Claim {
  id: string; employeeId: string; categoryId: string; amount: number;
  date: string; description: string; receiptUrl: string;
  status: string; submittedDate: string; approvedBy: string;
  approvedDate: string; reimbursedDate: string; reimbursedRef: string;
  rejectionReason: string;
}

interface CompanyExpense {
  id: string; categoryId: string; vendor: string; description: string;
  amount: number; date: string; department: string;
  paymentMethod: string; invoiceRef: string; recurring: boolean;
}

interface Budget {
  id: string; department: string; categoryId: string; month: string;
  budget: number; actual: number;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'claims', label: 'Claims', icon: FileText },
  { id: 'approvals', label: 'Approvals', icon: CheckCheck },
  { id: 'receipts', label: 'Receipts', icon: Image },
  { id: 'company', label: 'Company Expenses', icon: Building2 },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
  { id: 'budget', label: 'Budget vs Actual', icon: Target },
];

const MONTH_VALUES = ['2023-06', '2023-07', '2023-08', '2023-09', '2023-10', '2023-11'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved:   { label: 'Approved',   color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  rejected:   { label: 'Rejected',   color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  reimbursed: { label: 'Reimbursed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Plane: Plane, UtensilsCrossed: UtensilsCrossed, Package: Package,
  Car: Car, Monitor: Monitor, GraduationCap: GraduationCap,
  Zap: Zap, Wrench: Wrench, CalendarDays: CalendarDays, MoreHorizontal: MoreHorizontal,
};

const ALL_DEPARTMENTS = [...new Set(employeesData.map(e => e.department))].sort();

const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'Corporate Card', 'Petty Cash', 'Fleet Card'];

/* ─── Helpers ─── */
function peso(v: number) { return `₱${v.toLocaleString()}`; }
function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
function genId(prefix: string, existing: { id: string }[]) {
  const max = existing.reduce((m, x) => {
    const num = parseInt(x.id.replace(prefix, ''), 10);
    return num > m ? num : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/* ─── Styles ─── */
const inputCls = 'w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 transition-colors';
const selectCls = 'h-9 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 transition-colors';

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon: IconC, sub, color }: { label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-[#0038a8]/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-[#0038a8]'}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Receipt Modal ─── */
function ReceiptModal({ claim, onClose }: { claim: Claim | null; onClose: () => void }) {
  if (!claim) return null;
  const emp = employeesData.find(e => e.id === claim.employeeId);
  const cat = (categoriesData as Category[]).find(c => c.id === claim.categoryId);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Receipt Details</h3>
          <button type="button" title="Close" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl h-48 flex items-center justify-center mb-4">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Employee:</span><span className="font-semibold text-gray-800 dark:text-white">{emp?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Category:</span><span className="font-semibold text-gray-800 dark:text-white">{cat?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount:</span><span className="font-bold text-gray-800 dark:text-white">{peso(claim.amount)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="text-gray-700 dark:text-gray-300">{format(new Date(claim.date), 'MMM d, yyyy')}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Description:</span><span className="text-gray-700 dark:text-gray-300 text-right max-w-[200px]">{claim.description}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_CFG[claim.status].bg} ${STATUS_CFG[claim.status].color}`}>{STATUS_CFG[claim.status].label}</span></div>
          {claim.reimbursedRef && <div className="flex justify-between"><span className="text-gray-500">Ref:</span><span className="text-gray-700">{claim.reimbursedRef}</span></div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('claims');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [reportMonth, setReportMonth] = useState('2023-11');
  const [budgetMonth, setBudgetMonth] = useState('2023-11');
  const [budgetDept, setBudgetDept] = useState('Engineering');
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Claim | null>(null);
  const [rejectModal, setRejectModal] = useState<{ claim: Claim } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Mutable state for claims and company expenses
  const [claims, setClaims] = useState<Claim[]>(claimsDataInitial as Claim[]);
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>(companyDataInitial as CompanyExpense[]);

  // Claim submission form state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ employeeId: '', categoryId: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), description: '' });

  // Company expense form state
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState({ vendor: '', categoryId: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), department: 'Engineering', paymentMethod: 'Bank Transfer', recurring: false, invoiceRef: '' });

  // Receipt upload state
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const categories = categoriesData as Category[];
  const budgets = budgetsData as Budget[];
  const sortedEmployees = useMemo(() => [...employeesData].sort((a, b) => a.name.localeCompare(b.name)), []);

  /* ─── Claims Tab ─── */
  const filteredClaims = useMemo(() => {
    const q = search.toLowerCase();
    return claims.filter(c => {
      const emp = employeesData.find(e => e.id === c.employeeId);
      if (!emp) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (deptFilter !== 'All' && emp.department !== deptFilter) return false;
      if (q && !emp.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      return true;
    }).map(c => {
      const emp = employeesData.find(e => e.id === c.employeeId)!;
      const cat = categories.find(cat => cat.id === c.categoryId);
      return { ...c, emp, cat };
    });
  }, [claims, statusFilter, deptFilter, search]);

  const claimsKPIs = useMemo(() => ({
    total: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    pendingAmount: claims.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
    reimbursedThisMonth: claims.filter(c => c.status === 'reimbursed' && c.reimbursedDate.startsWith('2023-11')).reduce((s, c) => s + c.amount, 0),
  }), [claims]);

  /* ─── Approvals Tab ─── */
  const pendingClaims = useMemo(() => claims.filter(c => c.status === 'pending').map(c => {
    const emp = employeesData.find(e => e.id === c.employeeId)!;
    const cat = categories.find(cat => cat.id === c.categoryId);
    return { ...c, emp, cat };
  }), [claims]);

  /* ─── Company Tab ─── */
  const companyKPIs = useMemo(() => ({
    total: companyExpenses.reduce((s, c) => s + c.amount, 0),
    count: companyExpenses.length,
    recurring: companyExpenses.filter(c => c.recurring).length,
    byVendor: [...new Set(companyExpenses.map(c => c.vendor))].length,
  }), [companyExpenses]);

  /* ─── Reports Tab ─── */
  const reportData = useMemo(() => {
    const monthClaims = claims.filter(c => c.date.startsWith(reportMonth));
    const monthCompany = companyExpenses.filter(c => c.date.startsWith(reportMonth));
    const byCategory: Record<string, number> = {};
    [...monthClaims, ...monthCompany].forEach(item => {
      byCategory[item.categoryId] = (byCategory[item.categoryId] || 0) + item.amount;
    });
    const catBreakdown = categories.map(cat => ({
      ...cat, total: byCategory[cat.id] || 0,
    })).sort((a, b) => b.total - a.total);
    const maxCat = Math.max(...catBreakdown.map(c => c.total), 1);
    return { catBreakdown, maxCat, totalClaims: monthClaims.reduce((s, c) => s + c.amount, 0), totalCompany: monthCompany.reduce((s, c) => s + c.amount, 0) };
  }, [claims, companyExpenses, reportMonth]);

  /* ─── Budget Tab ─── */
  const budgetData = useMemo(() => {
    const filtered = budgets.filter(b => b.department === budgetDept && b.month === budgetMonth);
    return filtered.map(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      return { ...b, cat };
    }).sort((a, b) => (b.actual - b.budget) - (a.actual - a.budget));
  }, [budgetDept, budgetMonth]);

  const budgetKPIs = useMemo(() => {
    const totalBudget = budgetData.reduce((s, b) => s + b.budget, 0);
    const totalActual = budgetData.reduce((s, b) => s + b.actual, 0);
    const overBudget = budgetData.filter(b => b.actual > b.budget).length;
    return { totalBudget, totalActual, utilization: Math.round((totalActual / Math.max(totalBudget, 1)) * 100), overBudget };
  }, [budgetData]);

  /* ─── Actions ─── */
  const handleApprove = (claim: Claim) => {
    setClaims(prev => prev.map(c =>
      c.id === claim.id
        ? { ...c, status: 'approved', approvedBy: 'emp048', approvedDate: format(new Date(), 'yyyy-MM-dd') }
        : c
    ));
    toast.success(`Claim ${claim.id} approved`);
  };

  const handleReject = () => {
    if (!rejectModal) return;
    setClaims(prev => prev.map(c =>
      c.id === rejectModal.claim.id
        ? { ...c, status: 'rejected', rejectionReason: rejectReason, approvedBy: 'emp048', approvedDate: format(new Date(), 'yyyy-MM-dd') }
        : c
    ));
    toast.error(`Claim ${rejectModal.claim.id} rejected`);
    setRejectModal(null);
    setRejectReason('');
  };

  const handleMarkReimbursed = (claim: Claim) => {
    const ref = `REIM-${format(new Date(), 'yyyy')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    setClaims(prev => prev.map(c =>
      c.id === claim.id
        ? { ...c, status: 'reimbursed', reimbursedDate: format(new Date(), 'yyyy-MM-dd'), reimbursedRef: ref }
        : c
    ));
    toast.success(`Claim ${claim.id} marked as reimbursed (${ref})`);
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.employeeId || !claimForm.categoryId || !claimForm.amount || !claimForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newClaim: Claim = {
      id: genId('exp', claims),
      employeeId: claimForm.employeeId,
      categoryId: claimForm.categoryId,
      amount: parseFloat(claimForm.amount),
      date: claimForm.date,
      description: claimForm.description,
      receiptUrl: uploadedFiles.length > 0 ? `/receipts/mock-${uploadedFiles[0]}` : '',
      status: 'pending',
      submittedDate: format(new Date(), 'yyyy-MM-dd'),
      approvedBy: '',
      approvedDate: '',
      reimbursedDate: '',
      reimbursedRef: '',
      rejectionReason: '',
    };
    setClaims(prev => [newClaim, ...prev]);
    toast.success('Expense claim submitted');
    setShowClaimForm(false);
    setClaimForm({ employeeId: '', categoryId: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), description: '' });
    setUploadedFiles([]);
  };

  const handleSubmitCompanyExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.vendor || !companyForm.categoryId || !companyForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newExpense: CompanyExpense = {
      id: genId('ce', companyExpenses),
      vendor: companyForm.vendor,
      categoryId: companyForm.categoryId,
      amount: parseFloat(companyForm.amount),
      description: companyForm.description,
      date: companyForm.date,
      department: companyForm.department,
      paymentMethod: companyForm.paymentMethod,
      recurring: companyForm.recurring,
      invoiceRef: companyForm.invoiceRef || `INV-${format(new Date(), 'yyyyMMdd')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
    };
    setCompanyExpenses(prev => [newExpense, ...prev]);
    toast.success(`Company expense logged: ${newExpense.vendor} — ${peso(newExpense.amount)}`);
    setShowCompanyForm(false);
    setCompanyForm({ vendor: '', categoryId: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), department: 'Engineering', paymentMethod: 'Bank Transfer', recurring: false, invoiceRef: '' });
  };

  const handleReceiptUpload = () => {
    const mockFileName = `receipt-${format(new Date(), 'yyyyMMdd')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}.pdf`;
    setUploadedFiles(prev => [...prev, mockFileName]);
    toast.success(`File uploaded: ${mockFileName}`);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Employee', 'Category', 'Amount', 'Date', 'Status', 'Description'];
    const csv = [headers.join(','), ...filteredClaims.map(c => [c.id, c.emp.name, c.cat?.name ?? '', c.amount, c.date, c.status, `"${c.description}"`].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAccountingCSV = () => {
    const monthClaims = claims.filter(c => c.date.startsWith(reportMonth));
    const monthCompany = companyExpenses.filter(c => c.date.startsWith(reportMonth));
    const glCodes: Record<string, string> = {
      cat001: '6100-TVL', cat002: '6150-ME', cat003: '6200-SUP', cat004: '6250-TRN',
      cat005: '6300-SFT', cat006: '6350-TRN', cat007: '6400-UTL', cat008: '6450-MNT',
      cat009: '6500-EVT', cat010: '6999-MSC',
    };
    const headers = ['Date', 'Type', 'Employee/Vendor', 'Department', 'Category', 'GL Code', 'Description', 'Amount', 'Status', 'Payment Method', 'Reference'];
    const rows: string[][] = [];
    monthClaims.forEach(c => {
      const emp = employeesData.find(e => e.id === c.employeeId);
      const cat = categories.find(cat => cat.id === c.categoryId);
      rows.push([c.date, 'Claim', emp?.name ?? '', emp?.department ?? '', cat?.name ?? '', glCodes[c.categoryId] ?? '', `"${c.description}"`, c.amount.toString(), c.status, 'Reimbursement', c.reimbursedRef || 'Pending']);
    });
    monthCompany.forEach(ce => {
      const cat = categories.find(cat => cat.id === ce.categoryId);
      rows.push([ce.date, 'Company', ce.vendor, ce.department, cat?.name ?? '', glCodes[ce.categoryId] ?? '', `"${ce.description}"`, ce.amount.toString(), 'Paid', ce.paymentMethod, ce.invoiceRef]);
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `accounting-export-${reportMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Accounting export for ${format(new Date(reportMonth + '-01'), 'MMMM yyyy')} downloaded`);
  };

  /* ─── Render ─── */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Expense Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Track employee claims, company expenses, and budget utilization
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'claims' && (
              <>
                <button onClick={() => { setShowClaimForm(!showClaimForm); setShowCompanyForm(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors">
                  <Plus className="w-3.5 h-3.5" />Submit Claim
                </button>
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </button>
              </>
            )}
            {claimsKPIs.pending > 0 && (
              <button onClick={() => setActiveTab('approvals')} className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-200 dark:border-amber-800">
                {claimsKPIs.pending} pending
              </button>
            )}
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

            {/* ===== CLAIMS TAB ===== */}
            {activeTab === 'claims' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <KpiCard label="Total Claims" value={claimsKPIs.total} icon={FileText} />
                  <KpiCard label="Pending" value={claimsKPIs.pending} icon={Clock} sub={peso(claimsKPIs.pendingAmount)} />
                  <KpiCard label="Approved" value={claims.filter(c => c.status === 'approved').length} icon={CheckCircle2} color="bg-blue-500" />
                  <KpiCard label="Reimbursed (Nov)" value={peso(claimsKPIs.reimbursedThisMonth)} icon={Banknote} color="bg-green-500" />
                </div>

                {/* Submit Claim Inline Form */}
                <AnimatePresence>
                  {showClaimForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                      <form onSubmit={handleSubmitClaim} className="bg-white dark:bg-gray-900 border border-[#0038a8]/30 dark:border-[#0038a8]/50 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Submit New Expense Claim</h3>
                          <button title="Close" type="button" onClick={() => setShowClaimForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-500" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Employee <span className="text-red-500">*</span></label>
                            <select title="Select employee" value={claimForm.employeeId} onChange={e => setClaimForm(p => ({ ...p, employeeId: e.target.value }))} className={selectCls + ' w-full'}>
                              <option value="">Select employee...</option>
                              {sortedEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Category <span className="text-red-500">*</span></label>
                            <select title="Select category" value={claimForm.categoryId} onChange={e => setClaimForm(p => ({ ...p, categoryId: e.target.value }))} className={selectCls + ' w-full'}>
                              <option value="">Select category...</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Amount (₱) <span className="text-red-500">*</span></label>
                            <input title="Enter amount" type="number" value={claimForm.amount} onChange={e => setClaimForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" min="0" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Date</label>
                            <input title="Select date" type="date" value={claimForm.date} onChange={e => setClaimForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Description <span className="text-red-500">*</span></label>
                          <textarea title="Enter description" value={claimForm.description} onChange={e => setClaimForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the expense..." className={inputCls + ' h-16 resize-none'} />
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <button type="button" onClick={handleReceiptUpload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                            <Upload className="w-3 h-3" />Attach Receipt
                          </button>
                          {uploadedFiles.map((f, i) => (
                            <span key={i} className="text-[10px] bg-green-50 dark:bg-green-950/30 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />{f}
                            </span>
                          ))}
                          <button type="submit" className="ml-auto px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl hover:bg-[#002d8a] transition-colors">Submit Claim</button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title="Status" className={selectCls + ' text-xs'}>
                      <option value="All">All Statuses</option>
                      <option value="pending">Pending</option><option value="approved">Approved</option>
                      <option value="rejected">Rejected</option><option value="reimbursed">Reimbursed</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} title="Department" className={selectCls + ' text-xs'}>
                      <option value="All">All Departments</option>
                      {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                  </div>
                  <span className="text-xs text-gray-400 ml-auto">{filteredClaims.length} claims</span>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Amount</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Description</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClaims.map((c, i) => {
                          const stCfg = STATUS_CFG[c.status];
                          const CatIcon = c.cat ? (CATEGORY_ICONS[c.cat.icon] || MoreHorizontal) : MoreHorizontal;
                          return (
                            <tr key={c.id} className={`${i < filteredClaims.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold shrink-0">{getInitials(c.emp.name)}</div>
                                  <div><p className="text-xs font-semibold text-gray-800 dark:text-white">{c.emp.name}</p><p className="text-[10px] text-gray-400">{c.emp.department}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5"><span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"><CatIcon className="w-3 h-3" />{c.cat?.name}</span></td>
                              <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-800 dark:text-white">{peso(c.amount)}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(c.date), 'MMM d')}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell max-w-[200px] truncate">{c.description}</td>
                              <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <button type="button" title="View Receipt" onClick={() => setSelectedReceipt(c)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Eye className="w-3.5 h-3.5" /></button>
                                  {c.status === 'pending' && (
                                    <>
                                      <button type="button" title="Approve" onClick={() => handleApprove(c)} className="p-1 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 text-green-500"><Check className="w-3.5 h-3.5" /></button>
                                      <button type="button" title="Reject" onClick={() => setRejectModal({ claim: c })} className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"><X className="w-3.5 h-3.5" /></button>
                                    </>
                                  )}
                                  {c.status === 'approved' && (
                                    <button type="button" title="Mark Reimbursed" onClick={() => handleMarkReimbursed(c)} className="p-1 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600"><Banknote className="w-3.5 h-3.5" /></button>
                                  )}
                                  {c.status === 'reimbursed' && c.reimbursedRef && (
                                    <span className="text-[9px] text-green-600 font-medium">{c.reimbursedRef}</span>
                                  )}
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

            {/* ===== APPROVALS TAB ===== */}
            {activeTab === 'approvals' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Pending Approvals" value={pendingClaims.length} icon={Clock} color="bg-amber-500" />
                  <KpiCard label="Total Pending Amount" value={peso(pendingClaims.reduce((s, c) => s + c.amount, 0))} icon={FileText} />
                  <KpiCard label="Oldest Pending" value={pendingClaims.length > 0 ? format(new Date(pendingClaims.sort((a, b) => new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime())[0].submittedDate), 'MMM d') : 'N/A'} icon={AlertTriangle} />
                </div>
                {pendingClaims.length === 0 ? (
                  <div className="text-center py-16 text-sm text-gray-400">All caught up! No pending claims.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pendingClaims.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">{getInitials(c.emp.name)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5"><p className="text-sm font-semibold text-gray-800 dark:text-white">{c.emp.name}</p><span className="text-[10px] text-gray-400">{c.emp.department}</span></div>
                            <p className="text-xs text-gray-500 mb-1">{c.description}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{c.cat?.name}</span><span className="font-bold text-gray-700 dark:text-gray-300">{peso(c.amount)}</span><span>{format(new Date(c.date), 'MMM d, yyyy')}</span>
                            </div>
                            {c.amount >= 20000 && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Requires Director approval (above ₱20,000)</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => handleApprove(c)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold"><Check className="w-3 h-3" />Approve</button>
                            <button type="button" onClick={() => setRejectModal({ claim: c })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 text-gray-500 hover:text-red-500 border text-xs font-semibold"><X className="w-3 h-3" />Reject</button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== RECEIPTS TAB ===== */}
            {activeTab === 'receipts' && (
              <div>
                <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 mb-5 text-center hover:border-[#0038a8]/50 transition-colors cursor-pointer" onClick={handleReceiptUpload}>
                  <Image className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Drag & drop receipt images here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to upload (PDF, JPG, PNG accepted)</p>
                  <button type="button" className="mt-3 px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl hover:bg-[#002d8a] transition-colors">
                    <Upload className="w-3.5 h-3.5 inline mr-1" />Upload Receipt
                  </button>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mb-5 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Recently Uploaded</p>
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />{f}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mb-3">Receipt Gallery ({claims.filter(c => c.receiptUrl).length} receipts)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {claims.filter(c => c.receiptUrl).map(c => {
                    const emp = employeesData.find(e => e.id === c.employeeId);
                    return (
                      <button type="button" key={c.id} onClick={() => setSelectedReceipt(c)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-left hover:border-[#0038a8]/50 transition-colors">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20 flex items-center justify-center mb-2"><FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" /></div>
                        <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate">{emp?.name}</p>
                        <p className="text-[9px] text-gray-400">{format(new Date(c.date), 'MMM d')} · {peso(c.amount)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== COMPANY EXPENSES TAB ===== */}
            {activeTab === 'company' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <KpiCard label="Total Ops Expenses" value={peso(companyKPIs.total)} icon={Building2} />
                  <KpiCard label="Expenses" value={companyKPIs.count} icon={FileText} />
                  <KpiCard label="Recurring" value={companyKPIs.recurring} icon={ArrowUpRight} sub="Monthly" />
                  <KpiCard label="Vendors" value={companyKPIs.byVendor} icon={Package} />
                </div>

                {/* Add Company Expense Form */}
                <div className="mb-4">
                  {!showCompanyForm ? (
                    <button type="button" onClick={() => setShowCompanyForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors">
                      <Plus className="w-3.5 h-3.5" />Add Company Expense
                    </button>
                  ) : (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleSubmitCompanyExpense} className="bg-white dark:bg-gray-900 border border-[#0038a8]/30 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white">Log Company Expense</h3>
                        <button title="Close form" type="button" onClick={() => setShowCompanyForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Vendor <span className="text-red-500">*</span></label>
                          <input title="Enter vendor" type="text" value={companyForm.vendor} onChange={e => setCompanyForm(p => ({ ...p, vendor: e.target.value }))} placeholder="e.g. Meralco" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Category <span className="text-red-500">*</span></label>
                          <select title='Select' value={companyForm.categoryId} onChange={e => setCompanyForm(p => ({ ...p, categoryId: e.target.value }))} className={selectCls + ' w-full'}>
                            <option value="">Select...</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Amount (₱) <span className="text-red-500">*</span></label>
                          <input title='Enter amount' type="number" value={companyForm.amount} onChange={e => setCompanyForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Department</label>
                          <select title='Select' value={companyForm.department} onChange={e => setCompanyForm(p => ({ ...p, department: e.target.value }))} className={selectCls + ' w-full'}>
                            {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Payment Method</label>
                          <select title='Select' value={companyForm.paymentMethod} onChange={e => setCompanyForm(p => ({ ...p, paymentMethod: e.target.value }))} className={selectCls + ' w-full'}>
                            {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Date</label>
                          <input title='Select' type="date" value={companyForm.date} onChange={e => setCompanyForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Invoice Ref</label>
                          <input title='Enter' type="text" value={companyForm.invoiceRef} onChange={e => setCompanyForm(p => ({ ...p, invoiceRef: e.target.value }))} placeholder="Auto-generated if blank" className={inputCls} />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <input title='Select' type="checkbox" id="recurring" checked={companyForm.recurring} onChange={e => setCompanyForm(p => ({ ...p, recurring: e.target.checked }))} className="w-4 h-4 rounded border-gray-300" />
                          <label htmlFor="recurring" className="text-xs text-gray-600">Recurring monthly</label>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Description</label>
                        <input title='Enter' type="text" value={companyForm.description} onChange={e => setCompanyForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Electricity bill - November 2023" className={inputCls} />
                      </div>
                      <div className="flex justify-end mt-3">
                        <button type="submit" className="px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl hover:bg-[#002d8a]">Save Expense</button>
                      </div>
                    </motion.form>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Vendor</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Amount</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Recurring</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyExpenses.map((ce, i) => {
                          const cat = categories.find(c => c.id === ce.categoryId);
                          return (
                            <tr key={ce.id} className={`${i < companyExpenses.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                              <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{ce.vendor}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{cat?.name}</td>
                              <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-800 dark:text-white">{peso(ce.amount)}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{ce.department}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(ce.date), 'MMM d, yyyy')}</td>
                              <td className="px-4 py-2.5">{ce.recurring ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600">Monthly</span> : <span className="text-[10px] text-gray-400">One-time</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ===== REPORTS TAB ===== */}
            {activeTab === 'reports' && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <label className="text-xs font-semibold text-gray-500">Month:</label>
                  <div className="relative">
                    <select title="Select month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className={selectCls + ' text-xs'}>
                      {MONTH_VALUES.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <button type="button" onClick={exportAccountingCSV} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Download className="w-3.5 h-3.5" />Accounting Export
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Total Claims" value={peso(reportData.totalClaims)} icon={FileText} />
                  <KpiCard label="Total Company" value={peso(reportData.totalCompany)} icon={Building2} />
                  <KpiCard label="Combined Spend" value={peso(reportData.totalClaims + reportData.totalCompany)} icon={TrendingUp} />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Expenses by Category</h3>
                  <div className="flex flex-col gap-2.5">
                    {reportData.catBreakdown.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-32 shrink-0">{cat.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full flex items-center justify-end pr-2" style={{ backgroundColor: cat.color, width: `${(cat.total / reportData.maxCat) * 100}%` }}>
                            <span className="text-[9px] font-bold text-white">{peso(cat.total)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== BUDGET VS ACTUAL TAB ===== */}
            {activeTab === 'budget' && (
              <div>
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <div className="relative">
                    <select title="Department" value={budgetDept} onChange={e => setBudgetDept(e.target.value)} className={selectCls + ' text-xs'}>
                      {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select title="Month" value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)} className={selectCls + ' text-xs'}>
                      {MONTH_VALUES.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <KpiCard label="Budget" value={peso(budgetKPIs.totalBudget)} icon={Target} />
                  <KpiCard label="Actual" value={peso(budgetKPIs.totalActual)} icon={TrendingUp} color={budgetKPIs.utilization > 100 ? 'bg-red-500' : 'bg-green-500'} />
                  <KpiCard label="Utilization" value={`${budgetKPIs.utilization}%`} icon={budgetKPIs.utilization > 100 ? ArrowUpRight : ArrowDownRight} color={budgetKPIs.utilization > 100 ? 'bg-red-500' : budgetKPIs.utilization > 85 ? 'bg-amber-500' : 'bg-green-500'} />
                  <KpiCard label="Over Budget" value={budgetKPIs.overBudget} icon={AlertTriangle} color={budgetKPIs.overBudget > 0 ? 'bg-red-500' : 'bg-green-500'} sub="categories" />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Budget</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actual</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Variance</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetData.map((b, i) => {
                          const variance = b.actual - b.budget;
                          const pctVar = Math.round((variance / Math.max(b.budget, 1)) * 100);
                          const isOver = variance > 0;
                          return (
                            <tr key={b.id} className={`${i < budgetData.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                              <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{b.cat?.name}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-gray-500">{peso(b.budget)}</td>
                              <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-800 dark:text-white">{peso(b.actual)}</td>
                              <td className={`px-4 py-2.5 text-right text-xs font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>{isOver ? '+' : ''}{peso(variance)} ({pctVar}%)</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isOver ? 'bg-red-50 dark:bg-red-950/30 text-red-600 border-red-200' : pctVar > -15 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200' : 'bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200'}`}>
                                  {isOver ? 'Over Budget' : pctVar > -15 ? 'Near Limit' : 'Within Budget'}
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

          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && <ReceiptModal claim={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">Reject Claim</h3>
              <p className="text-xs text-gray-500 mb-3">{employeesData.find(e => e.id === rejectModal.claim.employeeId)?.name ?? 'Employee'} — {peso(rejectModal.claim.amount)}</p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full h-20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm mb-3 resize-none text-gray-800 dark:text-gray-200" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setRejectModal(null)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">Cancel</button>
                <button type="button" onClick={handleReject} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Reject</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}