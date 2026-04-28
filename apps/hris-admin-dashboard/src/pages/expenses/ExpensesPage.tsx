import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCheck, Image, Building2, TrendingUp, Target,
  Search, ChevronDown, Download, Plus, X, Check, Clock,
  AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Plane, UtensilsCrossed, Package, Car, Monitor, GraduationCap,
  Zap, Wrench, CalendarDays, MoreHorizontal, Eye, BotMessageSquare,
} from 'lucide-react';
import { SmartCategorizer } from './components/SmartCategorizer';
import { format } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import categoriesData from '@/data/mock/expenses-categories.json';
import claimsData from '@/data/mock/expenses-claims.json';
import companyData from '@/data/mock/expenses-company.json';
import budgetsData from '@/data/mock/expenses-budgets.json';

/* ─── Types ─── */
type TabId = 'claims' | 'approvals' | 'receipts' | 'company' | 'reports' | 'budget' | 'ai-tools';

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
interface UploadedReceipt {
  id: string; file: File; preview: string; claimId: string | null;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType; highlight?: boolean }[] = [
  { id: 'claims',   label: 'Claims',           icon: FileText },
  { id: 'approvals',label: 'Approvals',        icon: CheckCheck },
  { id: 'receipts', label: 'Receipts',         icon: Image },
  { id: 'company',  label: 'Company Expenses', icon: Building2 },
  { id: 'reports',  label: 'Reports',          icon: TrendingUp },
  { id: 'budget',   label: 'Budget vs Actual', icon: Target },
  { id: 'ai-tools', label: 'AI Categorizer',   icon: BotMessageSquare, highlight: true },
];

const MONTH_VALUES = ['2023-06', '2023-07', '2023-08', '2023-09', '2023-10', '2023-11'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  reimbursed: { label: 'Reimbursed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Plane: Plane, UtensilsCrossed: UtensilsCrossed, Package: Package,
  Car: Car, Monitor: Monitor, GraduationCap: GraduationCap,
  Zap: Zap, Wrench: Wrench, CalendarDays: CalendarDays, MoreHorizontal: MoreHorizontal,
};

const ALL_DEPARTMENTS = [...new Set(employeesData.map(e => e.department))].sort();

/* ─── Helpers ─── */
function peso(v: number) { return `₱${v.toLocaleString()}`; }
function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }

const fieldCls = 'h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 w-full';
const selectCls = `${fieldCls} appearance-none`;

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Receipt Details</h3>
          <button title="Close" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
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
          <div className="flex justify-between"><span className="text-gray-500">Status:</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_CFG[claim.status].bg} ${STATUS_CFG[claim.status].color}`}>
              {STATUS_CFG[claim.status].label}
            </span>
          </div>
          {claim.reimbursedRef && (
            <div className="flex justify-between"><span className="text-gray-500">Ref:</span><span className="text-xs font-mono text-gray-700 dark:text-gray-300">{claim.reimbursedRef}</span></div>
          )}
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

  const categories = categoriesData as Category[];
  const [claims, setClaims] = useState<Claim[]>(claimsData as Claim[]);
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>(companyData as CompanyExpense[]);
  const budgets = budgetsData as Budget[];

  /* claim form */
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ employeeId: '', categoryId: '', amount: '', date: '', description: '' });

  /* company expense form */
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    categoryId: '', vendor: '', description: '', amount: '', date: '',
    department: ALL_DEPARTMENTS[0] || '', paymentMethod: 'bank_transfer', recurring: false,
  });

  /* receipt upload */
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    const previews = uploadedReceipts.map(r => r.preview);
    return () => { previews.forEach(p => URL.revokeObjectURL(p)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (valid.length === 0) { toast.error('Upload image or PDF files only'); return; }
    const newReceipts: UploadedReceipt[] = valid.map(file => ({
      id: `upl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file, preview: URL.createObjectURL(file), claimId: null,
    }));
    setUploadedReceipts(prev => [...newReceipts, ...prev]);
    toast.success(`${valid.length} receipt${valid.length > 1 ? 's' : ''} uploaded`);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleLinkClaim = (receiptId: string, claimId: string) => {
    setUploadedReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, claimId } : r));
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, receiptUrl: 'uploaded' } : c));
    toast.success('Receipt linked to claim');
    setLinkingId(null);
  };

  const handleRemoveUploaded = (id: string) => {
    setUploadedReceipts(prev => {
      const r = prev.find(x => x.id === id);
      if (r) URL.revokeObjectURL(r.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const sortedEmps = useMemo(() => [...employeesData].sort((a, b) => a.name.localeCompare(b.name)), []);

  /* ─── Derived Data ─── */
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
    reimbursedThisMonth: claims.filter(c => c.status === 'reimbursed' && c.reimbursedDate?.startsWith('2023-11')).reduce((s, c) => s + c.amount, 0),
  }), [claims]);

  const pendingClaims = useMemo(() =>
    claims.filter(c => c.status === 'pending').map(c => {
      const emp = employeesData.find(e => e.id === c.employeeId)!;
      const cat = categories.find(cat => cat.id === c.categoryId);
      return { ...c, emp, cat };
    }),
    [claims]);

  const companyKPIs = useMemo(() => ({
    total: companyExpenses.reduce((s, c) => s + c.amount, 0),
    count: companyExpenses.length,
    recurring: companyExpenses.filter(c => c.recurring).length,
    byVendor: [...new Set(companyExpenses.map(c => c.vendor))].length,
  }), [companyExpenses]);

  const reportData = useMemo(() => {
    const monthClaims = claims.filter(c => c.date.startsWith(reportMonth));
    const monthCompany = companyExpenses.filter(c => c.date.startsWith(reportMonth));
    const byCategory: Record<string, number> = {};
    [...monthClaims, ...monthCompany].forEach(item => {
      byCategory[item.categoryId] = (byCategory[item.categoryId] || 0) + item.amount;
    });
    const catBreakdown = categories.map(cat => ({ ...cat, total: byCategory[cat.id] || 0 })).sort((a, b) => b.total - a.total);
    return {
      catBreakdown,
      maxCat: Math.max(...catBreakdown.map(c => c.total), 1),
      totalClaims: monthClaims.reduce((s, c) => s + c.amount, 0),
      totalCompany: monthCompany.reduce((s, c) => s + c.amount, 0),
    };
  }, [reportMonth, claims, companyExpenses]);

  const budgetData = useMemo(() =>
    budgets
      .filter(b => b.department === budgetDept && b.month === budgetMonth)
      .map(b => ({ ...b, cat: categories.find(c => c.id === b.categoryId) }))
      .sort((a, b) => (b.actual - b.budget) - (a.actual - a.budget)),
    [budgetDept, budgetMonth]);

  const budgetKPIs = useMemo(() => {
    const totalBudget = budgetData.reduce((s, b) => s + b.budget, 0);
    const totalActual = budgetData.reduce((s, b) => s + b.actual, 0);
    return {
      totalBudget, totalActual,
      utilization: Math.round((totalActual / Math.max(totalBudget, 1)) * 100),
      overBudget: budgetData.filter(b => b.actual > b.budget).length,
    };
  }, [budgetData]);

  /* ─── Action Handlers ─── */
  const handleApprove = (claim: Claim) => {
    setClaims(prev => prev.map(c => c.id === claim.id
      ? { ...c, status: 'approved', approvedBy: 'HR Manager', approvedDate: '2023-11-24' }
      : c));
    toast.success(`Approved — ${employeesData.find(e => e.id === claim.employeeId)?.name}`);
  };

  const handleReject = () => {
    if (!rejectModal) return;
    setClaims(prev => prev.map(c => c.id === rejectModal.claim.id
      ? { ...c, status: 'rejected', rejectionReason: rejectReason }
      : c));
    toast.error('Claim rejected');
    setRejectModal(null);
    setRejectReason('');
  };

  const handleMarkReimbursed = (claim: Claim) => {
    const ref = `REF-${Date.now().toString().slice(-6)}`;
    setClaims(prev => prev.map(c => c.id === claim.id
      ? { ...c, status: 'reimbursed', reimbursedDate: '2023-11-24', reimbursedRef: ref }
      : c));
    toast.success(`Reimbursed · ${ref}`);
  };

  const handleSubmitClaim = () => {
    if (!claimForm.employeeId || !claimForm.categoryId || !claimForm.amount || !claimForm.date) {
      toast.error('Fill all required fields'); return;
    }
    const newClaim: Claim = {
      id: `clm${Date.now()}`, employeeId: claimForm.employeeId, categoryId: claimForm.categoryId,
      amount: Number(claimForm.amount), date: claimForm.date, description: claimForm.description,
      receiptUrl: '', status: 'pending', submittedDate: '2023-11-24',
      approvedBy: '', approvedDate: '', reimbursedDate: '', reimbursedRef: '', rejectionReason: '',
    };
    setClaims(prev => [newClaim, ...prev]);
    setClaimForm({ employeeId: '', categoryId: '', amount: '', date: '', description: '' });
    setShowClaimForm(false);
    toast.success('Expense claim submitted');
  };

  const handleAddCompanyExpense = () => {
    if (!companyForm.categoryId || !companyForm.vendor || !companyForm.amount || !companyForm.date) {
      toast.error('Fill all required fields'); return;
    }
    const ref = `INV-${Date.now().toString().slice(-6)}`;
    const newExpense: CompanyExpense = {
      id: `ce${Date.now()}`, categoryId: companyForm.categoryId, vendor: companyForm.vendor,
      description: companyForm.description, amount: Number(companyForm.amount),
      date: companyForm.date, department: companyForm.department,
      paymentMethod: companyForm.paymentMethod, invoiceRef: ref, recurring: companyForm.recurring,
    };
    setCompanyExpenses(prev => [newExpense, ...prev]);
    setCompanyForm({ categoryId: '', vendor: '', description: '', amount: '', date: '', department: ALL_DEPARTMENTS[0] || '', paymentMethod: 'bank_transfer', recurring: false });
    setShowCompanyForm(false);
    toast.success('Company expense logged');
  };

  const exportCSV = () => {
    const headers = ['ID', 'Employee', 'Department', 'Category', 'Amount', 'Date', 'Status', 'Description'];
    const csv = [
      headers.join(','),
      ...filteredClaims.map(c => [c.id, c.emp.name, c.emp.department, c.cat?.name ?? '', c.amount, c.date, c.status, `"${c.description}"`].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `expense-claims-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAccounting = () => {
    const headers = ['Date', 'Reference', 'Type', 'Employee / Vendor', 'Department', 'Category', 'GL Code', 'Description', 'Amount', 'Payment Method', 'Status', 'Approved By', 'Reimbursed Ref'];
    const claimRows = claims
      .filter(c => c.status !== 'rejected')
      .map(c => {
        const emp = employeesData.find(e => e.id === c.employeeId);
        const cat = categories.find(cat => cat.id === c.categoryId);
        return [c.date, c.id, 'Employee Claim', emp?.name ?? '', emp?.department ?? '', cat?.name ?? '', `EXP-${c.categoryId.toUpperCase()}`, `"${c.description}"`, c.amount, 'Reimbursement', c.status, c.approvedBy || '', c.reimbursedRef || ''].join(',');
      });
    const companyRows = companyExpenses.map(ce => {
      const cat = categories.find(cat => cat.id === ce.categoryId);
      return [ce.date, ce.invoiceRef, 'Company Expense', ce.vendor, ce.department, cat?.name ?? '', `OPS-${ce.categoryId.toUpperCase()}`, `"${ce.description}"`, ce.amount, ce.paymentMethod, 'recorded', '', ''].join(',');
    });
    const csv = [headers.join(','), ...claimRows, ...companyRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `accounting-export-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Render ─── */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Expense Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Track employee claims, company expenses, and budget utilization
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'claims' && (
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            )}
            {claimsKPIs.pending > 0 && (
              <button onClick={() => setActiveTab('approvals')} className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-200 dark:border-amber-800">
                {claimsKPIs.pending} pending
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? tab.highlight ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#0038a8] text-white shadow-sm'
                    : tab.highlight ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                <Icon className="w-4 h-4" />{tab.label}
                {tab.highlight && !isActive && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">AI</span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

            {/* ═══════════ CLAIMS TAB ═══════════ */}
            {activeTab === 'claims' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <KpiCard label="Total Claims" value={claimsKPIs.total} icon={FileText} />
                  <KpiCard label="Pending" value={claimsKPIs.pending} icon={Clock} sub={peso(claimsKPIs.pendingAmount)} />
                  <KpiCard label="Approved" value={claims.filter(c => c.status === 'approved').length} icon={CheckCircle2} color="bg-blue-500" />
                  <KpiCard label="Reimbursed (Nov)" value={peso(claimsKPIs.reimbursedThisMonth)} icon={ArrowDownRight} color="bg-green-500" />
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title="Status"
                      className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      <option value="All">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="reimbursed">Reimbursed</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} title="Department"
                      className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      <option value="All">All Departments</option>
                      {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                      className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-400">{filteredClaims.length} claims</span>
                    <button type="button" onClick={() => setShowClaimForm(v => !v)}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${showClaimForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'bg-[#0038a8] text-white hover:bg-[#002d8a]'}`}>
                      {showClaimForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showClaimForm ? 'Cancel' : 'Submit Claim'}
                    </button>
                  </div>
                </div>

                {/* Submit claim inline form */}
                <AnimatePresence>
                  {showClaimForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-3">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3">New Expense Claim</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Employee *</label>
                            <select title="Employee" value={claimForm.employeeId} onChange={e => setClaimForm(f => ({ ...f, employeeId: e.target.value }))} className={selectCls}>
                              <option value="">Select…</option>
                              {sortedEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Category *</label>
                            <select title="Category" value={claimForm.categoryId} onChange={e => setClaimForm(f => ({ ...f, categoryId: e.target.value }))} className={selectCls}>
                              <option value="">Select…</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Amount (₱) *</label>
                            <input type="number" placeholder="0" value={claimForm.amount} onChange={e => setClaimForm(f => ({ ...f, amount: e.target.value }))} className={fieldCls} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Date *</label>
                            <input type="date" title="Date" value={claimForm.date} onChange={e => setClaimForm(f => ({ ...f, date: e.target.value }))} className={fieldCls} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
                            <input type="text" placeholder="Brief description…" value={claimForm.description} onChange={e => setClaimForm(f => ({ ...f, description: e.target.value }))} className={fieldCls} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowClaimForm(false)}
                            className="h-8 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Cancel
                          </button>
                          <button type="button" onClick={handleSubmitClaim}
                            className="h-8 px-4 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />Submit Claim
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
                                  <div>
                                    <p className="text-xs font-semibold text-gray-800 dark:text-white">{c.emp.name}</p>
                                    <p className="text-[10px] text-gray-400">{c.emp.department}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                  <CatIcon className="w-3 h-3" />{c.cat?.name}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-800 dark:text-white">{peso(c.amount)}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(c.date), 'MMM d')}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell max-w-[200px] truncate">{c.description}</td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <button title="View Receipt" onClick={() => setSelectedReceipt(c)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {c.status === 'pending' && (
                                    <>
                                      <button title="Approve" onClick={() => handleApprove(c)} className="p-1 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 text-green-500"><Check className="w-3.5 h-3.5" /></button>
                                      <button title="Reject" onClick={() => setRejectModal({ claim: c })} className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"><X className="w-3.5 h-3.5" /></button>
                                    </>
                                  )}
                                  {c.status === 'approved' && (
                                    <button title="Mark as Reimbursed" onClick={() => handleMarkReimbursed(c)}
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors whitespace-nowrap">
                                      Reimburse
                                    </button>
                                  )}
                                  {c.status === 'reimbursed' && c.reimbursedRef && (
                                    <span className="text-[10px] font-mono text-gray-400">{c.reimbursedRef}</span>
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

            {/* ═══════════ APPROVALS TAB ═══════════ */}
            {activeTab === 'approvals' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Pending Approvals" value={pendingClaims.length} icon={Clock} color="bg-amber-500" />
                  <KpiCard label="Total Pending Amount" value={peso(pendingClaims.reduce((s, c) => s + c.amount, 0))} icon={FileText} />
                  <KpiCard label="Oldest Pending"
                    value={pendingClaims.length > 0
                      ? format(new Date([...pendingClaims].sort((a, b) => new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime())[0].submittedDate), 'MMM d')
                      : 'N/A'}
                    icon={AlertTriangle} />
                </div>
                {pendingClaims.length === 0 ? (
                  <div className="text-center py-16 text-sm text-gray-400">All caught up! No pending claims.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pendingClaims.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">{getInitials(c.emp.name)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{c.emp.name}</p>
                              <span className="text-[10px] text-gray-400">{c.emp.department}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{c.description}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{c.cat?.name}</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">{peso(c.amount)}</span>
                              <span>{format(new Date(c.date), 'MMM d, yyyy')}</span>
                            </div>
                            {c.amount >= 20000 && (
                              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />Requires Director approval (above ₱20,000)
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleApprove(c)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold">
                              <Check className="w-3 h-3" />Approve
                            </button>
                            <button onClick={() => setRejectModal({ claim: c })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 text-xs font-semibold">
                              <X className="w-3 h-3" />Reject
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ RECEIPTS TAB ═══════════ */}
            {activeTab === 'receipts' && (
              <div>
                {/* Hidden file input */}
                <input
                title='Select'
                  ref={fileInputRef} type="file" multiple accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                />

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-2xl p-10 mb-5 text-center cursor-default transition-all duration-200 select-none ${isDragOver
                    ? 'border-[#0038a8] bg-[#0038a8]/5 scale-[1.01]'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                    }`}
                >
                  <motion.div animate={{ scale: isDragOver ? 1.15 : 1 }} transition={{ duration: 0.15 }}>
                    <Image className={`w-12 h-12 mx-auto mb-3 transition-colors ${isDragOver ? 'text-[#0038a8]' : 'text-gray-300 dark:text-gray-600'}`} />
                  </motion.div>
                  <p className={`text-sm font-semibold transition-colors ${isDragOver ? 'text-[#0038a8]' : 'text-gray-500 dark:text-gray-400'}`}>
                    {isDragOver ? 'Drop receipts here!' : 'Drag & drop receipts here'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Supports JPEG, PNG, WebP, PDF</p>

                  {/* Button to manually open file dialog – the ONLY clickable element */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="mt-4 px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl hover:bg-[#002d8a] transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> Choose Files
                  </button>
                </div>

                {/* Newly uploaded receipts */}
                {uploadedReceipts.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Uploaded ({uploadedReceipts.length})
                        <span className="ml-2 text-[10px] font-normal text-amber-500">⚙ OCR processing (placeholder)</span>
                      </p>
                      <button type="button" onClick={() => { uploadedReceipts.forEach(r => URL.revokeObjectURL(r.preview)); setUploadedReceipts([]); }}
                        className="text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors">
                        Clear all
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {uploadedReceipts.map(r => {
                        const linkedClaim = claims.find(c => c.id === r.claimId);
                        const isImage = r.file.type.startsWith('image/');
                        return (
                          <div key={r.id} className="bg-white dark:bg-gray-900 border-2 border-[#0038a8]/30 rounded-xl p-3 relative group">
                            {/* Remove button */}
                            <button type="button" onClick={() => handleRemoveUploaded(r.id)}
                              title="Remove"
                              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <X className="w-3 h-3" />
                            </button>

                            {/* Preview */}
                            <div className="rounded-lg h-24 overflow-hidden mb-2 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                              {isImage ? (
                                <img src={r.preview} alt={r.file.name} className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="w-10 h-10 text-gray-400" />
                              )}
                            </div>

                            {/* File info */}
                            <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate mb-0.5">{r.file.name}</p>
                            <p className="text-[9px] text-gray-400 mb-2">{(r.file.size / 1024).toFixed(0)} KB</p>

                            {/* Link to claim */}
                            {linkedClaim ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />Linked
                                </span>
                                <button type="button" onClick={() => setLinkingId(r.id)}
                                  className="text-[9px] text-gray-400 hover:text-gray-600 ml-auto">change</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setLinkingId(linkingId === r.id ? null : r.id)}
                                className="text-[9px] font-semibold text-[#0038a8] hover:underline">
                                + Link to claim
                              </button>
                            )}

                            {/* Inline claim picker */}
                            <AnimatePresence>
                              {linkingId === r.id && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden mt-2">
                                  <select
                                    title="Link claim" defaultValue=""
                                    onChange={e => { if (e.target.value) handleLinkClaim(r.id, e.target.value); }}
                                    className="w-full h-7 text-[10px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 appearance-none">
                                    <option value="" disabled>Select claim…</option>
                                    {claims.filter(c => c.status !== 'rejected').map(c => {
                                      const emp = employeesData.find(e => e.id === c.employeeId);
                                      return <option key={c.id} value={c.id}>{emp?.name} — {peso(c.amount)} ({format(new Date(c.date), 'MMM d')})</option>;
                                    })}
                                  </select>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Claims with receipts gallery */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
                    Receipt Gallery — Claims with Receipts ({claims.filter(c => c.receiptUrl).length})
                  </p>
                  {claims.filter(c => c.receiptUrl).length === 0 ? (
                    <p className="text-center py-10 text-xs text-gray-400">No receipts attached to claims yet</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {claims.filter(c => c.receiptUrl).slice(0, 12).map(c => {
                        const emp = employeesData.find(e => e.id === c.employeeId);
                        const stCfg = STATUS_CFG[c.status];
                        return (
                          <button key={c.id} type="button" onClick={() => setSelectedReceipt(c)}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-left hover:border-[#0038a8]/50 hover:shadow-sm transition-all group">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20 flex items-center justify-center mb-2 group-hover:bg-[#0038a8]/5 transition-colors relative overflow-hidden">
                              <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                              <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-white dark:bg-gray-900 rounded px-1 text-gray-400">VIEW</span>
                            </div>
                            <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate">{emp?.name}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-[9px] text-gray-400">{format(new Date(c.date), 'MMM d')} · {peso(c.amount)}</p>
                              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════ COMPANY EXPENSES TAB ═══════════ */}
            {activeTab === 'company' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <KpiCard label="Total Ops Expenses" value={peso(companyKPIs.total)} icon={Building2} />
                  <KpiCard label="Expenses" value={companyKPIs.count} icon={FileText} />
                  <KpiCard label="Recurring" value={companyKPIs.recurring} icon={ArrowUpRight} sub="Monthly" />
                  <KpiCard label="Vendors" value={companyKPIs.byVendor} icon={Package} />
                </div>

                <div className="flex justify-end mb-3">
                  <button type="button" onClick={() => setShowCompanyForm(v => !v)}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${showCompanyForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'bg-[#0038a8] text-white hover:bg-[#002d8a]'}`}>
                    {showCompanyForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showCompanyForm ? 'Cancel' : 'Log Expense'}
                  </button>
                </div>

                {/* Log company expense inline form */}
                <AnimatePresence>
                  {showCompanyForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-3">
                      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-3">Log Company Expense</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Vendor *</label>
                            <input type="text" placeholder="Vendor name" value={companyForm.vendor} onChange={e => setCompanyForm(f => ({ ...f, vendor: e.target.value }))} className={fieldCls} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Category *</label>
                            <select title="Category" value={companyForm.categoryId} onChange={e => setCompanyForm(f => ({ ...f, categoryId: e.target.value }))} className={selectCls}>
                              <option value="">Select…</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Amount (₱) *</label>
                            <input type="number" placeholder="0" value={companyForm.amount} onChange={e => setCompanyForm(f => ({ ...f, amount: e.target.value }))} className={fieldCls} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Date *</label>
                            <input type="date" title="Date" value={companyForm.date} onChange={e => setCompanyForm(f => ({ ...f, date: e.target.value }))} className={fieldCls} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Department</label>
                            <select title="Department" value={companyForm.department} onChange={e => setCompanyForm(f => ({ ...f, department: e.target.value }))} className={selectCls}>
                              {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Payment Method</label>
                            <select title="Payment Method" value={companyForm.paymentMethod} onChange={e => setCompanyForm(f => ({ ...f, paymentMethod: e.target.value }))} className={selectCls}>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="credit_card">Credit Card</option>
                              <option value="cash">Cash</option>
                              <option value="check">Check</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
                            <input type="text" placeholder="Brief description" value={companyForm.description} onChange={e => setCompanyForm(f => ({ ...f, description: e.target.value }))} className={fieldCls} />
                          </div>
                          <div className="flex flex-col justify-end pb-1">
                            <label className="flex items-center gap-2 h-8 cursor-pointer">
                              <input type="checkbox" checked={companyForm.recurring} onChange={e => setCompanyForm(f => ({ ...f, recurring: e.target.checked }))} className="w-3.5 h-3.5 rounded accent-[#0038a8]" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">Recurring monthly</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowCompanyForm(false)}
                            className="h-8 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Cancel
                          </button>
                          <button type="button" onClick={handleAddCompanyExpense}
                            className="h-8 px-4 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] transition-colors flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />Log Expense
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
                              <td className="px-4 py-2.5">
                                {ce.recurring
                                  ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600">Monthly</span>
                                  : <span className="text-[10px] text-gray-400">One-time</span>}
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

            {/* ═══════════ REPORTS TAB ═══════════ */}
            {activeTab === 'reports' && (
              <div>
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  <label className="text-xs font-semibold text-gray-500">Month:</label>
                  <div className="relative">
                    <select title="Month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                      className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      {MONTH_VALUES.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="ml-auto">
                    <button type="button" onClick={exportAccounting}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Download className="w-3.5 h-3.5" />Export for Accounting
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Total Claims" value={peso(reportData.totalClaims)} icon={FileText} />
                  <KpiCard label="Total Company" value={peso(reportData.totalCompany)} icon={Building2} />
                  <KpiCard label="Combined Spend" value={peso(reportData.totalClaims + reportData.totalCompany)} icon={TrendingUp} />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Expenses by Category</h3>
                  <div className="flex flex-col gap-2.5">
                    {reportData.catBreakdown.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-32 shrink-0">{cat.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ backgroundColor: cat.color, width: `${(cat.total / reportData.maxCat) * 100}%` }}>
                            {cat.total > 0 && <span className="text-[9px] font-bold text-white">{peso(cat.total)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════ BUDGET VS ACTUAL TAB ═══════════ */}
            {activeTab === 'budget' && (
              <div>
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <div className="relative">
                    <select title="Department" value={budgetDept} onChange={e => setBudgetDept(e.target.value)}
                      className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select title="Month" value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)}
                      className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
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
                              <td className={`px-4 py-2.5 text-right text-xs font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                                {isOver ? '+' : ''}{peso(variance)} ({pctVar}%)
                              </td>
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

            {/* ═══════════ AI TOOLS TAB ═══════════ */}
            {activeTab === 'ai-tools' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                  <BotMessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">AI Expense Categorizer</p>
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                      Powered by Gemini · Live category suggestions as you type, plus bulk re-categorization of all pending claims.
                    </p>
                  </div>
                </div>
                <SmartCategorizer />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-gray-200 dark:border-gray-700"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3">Reject Claim</h3>
              <p className="text-xs text-gray-500 mb-3">
                {employeesData.find(e => e.id === rejectModal.claim.employeeId)?.name ?? 'Employee'} — {peso(rejectModal.claim.amount)}
              </p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full h-20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm mb-3 resize-none" />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleReject} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Reject</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
