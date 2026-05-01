import { useState, useRef } from 'react';
import { motion, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Car,
  UtensilsCrossed,
  Package,
  Phone,
  BookOpen,
  HeartPulse,
  Building2,
  MoreHorizontal,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  X,
  Paperclip,
  AlertTriangle,
  ReceiptText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import expenseCategoriesRaw from '@/data/mock/expense-categories.json';
import expenseClaimsRaw from '@/data/mock/expense-claims.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseStatus = 'pending' | 'approved' | 'rejected';

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
}

interface ExpenseClaim {
  id: string;
  employeeId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
  receiptCount: number;
  submittedAt: string;
  reimbursedAt: string | null;
  notes: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';

const expenseCategories = expenseCategoriesRaw as ExpenseCategory[];
const initialClaims = expenseClaimsRaw as ExpenseClaim[];

const CARD =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

// ─── Icon & Color Maps ────────────────────────────────────────────────────────

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  car: Car,
  utensils: UtensilsCrossed,
  package: Package,
  phone: Phone,
  'book-open': BookOpen,
  'heart-pulse': HeartPulse,
  building: Building2,
  'more-horizontal': MoreHorizontal,
};

interface CategoryColors {
  bg: string;
  text: string;
  border: string;
  selectedBg: string;
  badgeBg: string;
  badgeText: string;
  bar: string;
}

const CATEGORY_COLOR_MAP: Record<string, CategoryColors> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
    selectedBg: 'bg-blue-100 dark:bg-blue-900',
    badgeBg: 'bg-blue-100 dark:bg-blue-900',
    badgeText: 'text-blue-700 dark:text-blue-300',
    bar: '#3b82f6',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-700',
    selectedBg: 'bg-orange-100 dark:bg-orange-900',
    badgeBg: 'bg-orange-100 dark:bg-orange-900',
    badgeText: 'text-orange-700 dark:text-orange-300',
    bar: '#f97316',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-700',
    selectedBg: 'bg-purple-100 dark:bg-purple-900',
    badgeBg: 'bg-purple-100 dark:bg-purple-900',
    badgeText: 'text-purple-700 dark:text-purple-300',
    bar: '#a855f7',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-300 dark:border-cyan-700',
    selectedBg: 'bg-cyan-100 dark:bg-cyan-900',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    bar: '#06b6d4',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-300 dark:border-green-700',
    selectedBg: 'bg-green-100 dark:bg-green-900',
    badgeBg: 'bg-green-100 dark:bg-green-900',
    badgeText: 'text-green-700 dark:text-green-300',
    bar: '#22c55e',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-300 dark:border-red-700',
    selectedBg: 'bg-red-100 dark:bg-red-900',
    badgeBg: 'bg-red-100 dark:bg-red-900',
    badgeText: 'text-red-700 dark:text-red-300',
    bar: '#ef4444',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
    selectedBg: 'bg-amber-100 dark:bg-amber-900',
    badgeBg: 'bg-amber-100 dark:bg-amber-900',
    badgeText: 'text-amber-700 dark:text-amber-300',
    bar: '#f59e0b',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
    selectedBg: 'bg-gray-100 dark:bg-gray-700',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-700 dark:text-gray-300',
    bar: '#6b7280',
  },
};

const STATUS_STYLES: Record<ExpenseStatus, { bg: string; text: string; label: string }> = {
  pending: {
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Pending',
  },
  approved: {
    bg: 'bg-green-100 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-400',
    label: 'Rejected',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function peso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCategoryColors(color: string): CategoryColors {
  return CATEGORY_COLOR_MAP[color] ?? CATEGORY_COLOR_MAP['gray'];
}

function getCategoryIcon(icon: string): LucideIcon {
  return CATEGORY_ICON_MAP[icon] ?? MoreHorizontal;
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExpenseStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function CategoryIconPill({
  category,
  size = 'sm',
}: {
  category: ExpenseCategory;
  size?: 'sm' | 'md';
}) {
  const colors = getCategoryColors(category.color);
  const Icon = getCategoryIcon(category.icon);
  const iconSize = size === 'sm' ? 13 : 16;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors.badgeBg} ${colors.badgeText}`}
    >
      <Icon size={iconSize} />
      {category.name}
    </span>
  );
}

// ─── Pinned Summary Strip ─────────────────────────────────────────────────────

function SummaryStrip({ claims }: { claims: ExpenseClaim[] }) {
  const total = claims.length;
  const totalAmount = claims.reduce((s, c) => s + c.amount, 0);
  const pending = claims.filter((c) => c.status === 'pending');
  const approved = claims.filter((c) => c.status === 'approved');
  const rejected = claims.filter((c) => c.status === 'rejected');

  const strips = [
    {
      label: 'Total Submitted',
      count: total,
      amount: totalAmount,
      icon: <ReceiptText size={18} />,
      cardColor: 'bg-white dark:bg-gray-900',
      labelColor: 'text-gray-500 dark:text-gray-400',
      valueColor: 'text-gray-900 dark:text-white',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
    },
    {
      label: 'Pending Review',
      count: pending.length,
      amount: pending.reduce((s, c) => s + c.amount, 0),
      icon: <Clock size={18} />,
      cardColor: 'bg-amber-50 dark:bg-amber-950',
      labelColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Approved & Reimbursed',
      count: approved.length,
      amount: approved.reduce((s, c) => s + c.amount, 0),
      icon: <CheckCircle2 size={18} />,
      cardColor: 'bg-green-50 dark:bg-green-950',
      labelColor: 'text-green-600 dark:text-green-400',
      valueColor: 'text-green-700 dark:text-green-300',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Rejected',
      count: rejected.length,
      amount: rejected.reduce((s, c) => s + c.amount, 0),
      icon: <XCircle size={18} />,
      cardColor: 'bg-red-50 dark:bg-red-950',
      labelColor: 'text-red-600 dark:text-red-400',
      valueColor: 'text-red-700 dark:text-red-300',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <motion.div {...fadeUp(1)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {strips.map((s) => (
        <div
          key={s.label}
          className={`${s.cardColor} border border-gray-200 dark:border-gray-800 rounded-2xl p-4`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${s.labelColor}`}>{s.label}</span>
            <span className={`p-1.5 rounded-lg ${s.iconBg} ${s.iconColor}`}>{s.icon}</span>
          </div>
          <p className={`text-2xl font-extrabold tabular-nums ${s.valueColor}`}>{s.count}</p>
          <p className={`text-xs mt-0.5 tabular-nums ${s.labelColor}`}>{peso(s.amount)}</p>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Tab 1: My Claims ─────────────────────────────────────────────────────────

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '2023-11', label: 'Nov 2023' },
  { value: '2023-10', label: 'Oct 2023' },
  { value: '2023-09', label: 'Sep 2023' },
  { value: '2023-08', label: 'Aug 2023' },
];

function MyClaimsTab({
  claims,
  onCancel,
}: {
  claims: ExpenseClaim[];
  onCancel: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [expandedRejected, setExpandedRejected] = useState<Set<string>>(new Set());

  const filtered = [...claims]
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => categoryFilter === 'all' || c.categoryId === categoryFilter)
    .filter((c) => !monthFilter || c.date.startsWith(monthFilter))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const statusChips = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  function toggleExpand(id: string) {
    setExpandedRejected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCancel(claim: ExpenseClaim) {
    const confirmed = window.confirm(`Cancel expense claim "${claim.description}"?`);
    if (confirmed) {
      onCancel(claim.id);
      toast.success('Expense claim cancelled');
    }
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Status:</span>
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={[
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
                statusFilter === chip.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400',
              ].join(' ')}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Category select */}
        <select
          title='Select'
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 min-w-[160px]"
        >
          <option value="all">All Categories</option>
          {expenseCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Month select */}
        <select
          title='Select'
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 min-w-[130px]"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Claims list */}
      <div className={`${CARD} p-0 overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            <ReceiptText size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No expense claims found</p>
            <p className="text-xs mt-1">Try adjusting the filters or submit a new claim.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((claim) => {
              const cat = expenseCategories.find((c) => c.id === claim.categoryId);
              const isExpanded = expandedRejected.has(claim.id);
              return (
                <li key={claim.id}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    {/* Category pill */}
                    <div className="shrink-0 pt-0.5">
                      {cat ? (
                        <CategoryIconPill category={cat} />
                      ) : (
                        <span className="text-xs text-gray-400">{claim.categoryName}</span>
                      )}
                    </div>

                    {/* Description + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {claim.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(claim.date)}</p>
                    </div>

                    {/* Receipt badge */}
                    <div className="shrink-0 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Paperclip size={12} />
                      <span>
                        {claim.receiptCount} receipt{claim.receiptCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Amount */}
                    <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      {peso(claim.amount)}
                    </p>

                    {/* Status */}
                    <div className="shrink-0">
                      <StatusBadge status={claim.status} />
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                      {claim.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(claim)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      )}
                      {claim.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(claim.id)}
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                          aria-label="Toggle rejection reason"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rejection note */}
                  {claim.status === 'rejected' && isExpanded && claim.notes && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">
                        Rejection Reason
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">{claim.notes}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tab 2: Submit Claim ──────────────────────────────────────────────────────

const MAX_FILES = 5;

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category'),
  date: z.string().min(1, 'Date is required'),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(200, 'Description must not exceed 200 characters'),
  amount: z
    .number()
    .min(1, 'Amount must be at least ₱1')
    .max(99999, 'Amount must be under ₱99,999'),
  notes: z.string().max(200, 'Notes must not exceed 200 characters').optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

function SubmitClaimTab({ onSubmitSuccess }: { onSubmitSuccess: (claim: ExpenseClaim) => void }) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categoryId: '',
      date: getTodayIso(),
      description: '',
      amount: undefined,
      notes: '',
    },
  });

  const selectedCategoryId = watch('categoryId');
  const descriptionValue = watch('description') ?? '';
  const notesValue = watch('notes') ?? '';
  const amountValue = watch('amount');

  const selectedCategory = expenseCategories.find((c) => c.id === selectedCategoryId);
  const isOverLimit =
    selectedCategory != null &&
    typeof amountValue === 'number' &&
    amountValue > selectedCategory.limit;

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const combined = [...uploadedFiles, ...files];
    if (combined.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError(null);
    setUploadedFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

  function onSubmit(data: ExpenseFormValues) {
    const cat = expenseCategories.find((c) => c.id === data.categoryId);
    const newClaim: ExpenseClaim = {
      id: `exp${Date.now()}`,
      employeeId: 'emp001',
      categoryId: data.categoryId,
      categoryName: cat?.name ?? data.categoryId,
      description: data.description,
      amount: data.amount,
      date: data.date,
      status: 'pending',
      receiptCount: uploadedFiles.length,
      submittedAt: new Date().toISOString(),
      reimbursedAt: null,
      notes: data.notes ?? null,
    };
    onSubmitSuccess(newClaim);
    toast.success('Expense claim submitted for approval');
    reset({
      categoryId: '',
      date: getTodayIso(),
      description: '',
      amount: undefined,
      notes: '',
    });
    setUploadedFiles([]);
  }

  return (
    <motion.div {...fadeUp(0)} className={`${CARD} max-w-2xl`}>
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-5">New Expense Claim</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Category grid */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {expenseCategories.map((cat) => {
              const colors = getCategoryColors(cat.color);
              const Icon = getCategoryIcon(cat.icon);
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue('categoryId', cat.id, { shouldValidate: true })}
                  className={[
                    'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all text-center',
                    isSelected
                      ? `${colors.selectedBg} ${colors.border} ${colors.text}`
                      : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
                  ].join(' ')}
                >
                  <Icon size={18} />
                  <span className="text-[11px] font-semibold leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
          {errors.categoryId && (
            <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label
            className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            htmlFor="expense-date"
          >
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="expense-date"
            type="date"
            {...register('date')}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label
            className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            htmlFor="expense-description"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <input
            id="expense-description"
            type="text"
            maxLength={200}
            placeholder="Brief description of the expense..."
            {...register('description')}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            ) : (
              <span />
            )}
            <span className="text-[10px] text-gray-400 tabular-nums">
              {descriptionValue.length}/200
            </span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label
            className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            htmlFor="expense-amount"
          >
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 pointer-events-none">
              ₱
            </span>
            <input
              id="expense-amount"
              type="number"
              min={1}
              max={selectedCategory?.limit ?? 99999}
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          {selectedCategory && (
            <p className="text-[10px] text-gray-400 mt-1">
              Category limit:{' '}
              <span className="font-semibold">{peso(selectedCategory.limit)}</span>
            </p>
          )}
          {errors.amount && (
            <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Over-limit warning */}
        {isOverLimit && selectedCategory && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This exceeds the {peso(selectedCategory.limit)} category limit. Additional approval
              may be required.
            </p>
          </div>
        )}

        {/* Upload receipts */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Upload Receipts{' '}
            <span className="text-[10px] text-gray-400 font-normal">(optional, max 5 files)</span>
          </label>

          {/* Drop zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer"
          >
            <UploadCloud size={24} className="text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click to upload or drag &amp; drop
            </p>
            <p className="text-[11px] text-gray-400">Images and PDFs accepted</p>
          </button>
          <input
            title='Select'
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleFilePick}
          />

          {fileError && (
            <p className="text-xs text-red-500 mt-1">{fileError}</p>
          )}

          {/* File chips */}
          {uploadedFiles.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {uploadedFiles.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <Paperclip size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            htmlFor="expense-notes"
          >
            Notes{' '}
            <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="expense-notes"
            rows={3}
            maxLength={200}
            placeholder="Additional context or remarks..."
            {...register('notes')}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
          />
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] text-gray-400 tabular-nums">{notesValue.length}/200</span>
          </div>
          {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Submit Claim
        </button>
      </form>
    </motion.div>
  );
}

// ─── Recharts Custom Tooltip ─────────────────────────────────────────────────

interface ExpenseTooltipPayload {
  name: string;
  value: number;
}

interface ExpenseTooltipProps {
  active?: boolean;
  payload?: ExpenseTooltipPayload[];
  label?: string;
}

function ExpenseChartTooltip({ active, payload, label }: ExpenseTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
      <p className="text-blue-600 dark:text-blue-400 tabular-nums">{peso(payload[0].value)}</p>
    </div>
  );
}

// ─── Tab 3: Summary & Reports ─────────────────────────────────────────────────

// Month labels for chart
const MONTH_LABELS = ['Aug', 'Sep', 'Oct', 'Nov'];

function buildMonthlyChartData(claims: ExpenseClaim[]) {
  const map = new Map<string, number>();
  MONTH_LABELS.forEach((m) => map.set(m, 0));

  claims.forEach((c) => {
    const d = new Date(c.date + 'T00:00:00');
    const label = d.toLocaleDateString('en-PH', { month: 'short' });
    if (map.has(label)) {
      map.set(label, (map.get(label) ?? 0) + c.amount);
    }
  });

  return MONTH_LABELS.map((m) => ({ month: m, amount: map.get(m) ?? 0 }));
}

interface CategoryTotals {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  count: number;
}

function buildCategoryTotals(claims: ExpenseClaim[]): CategoryTotals[] {
  const map = new Map<string, CategoryTotals>();

  claims.forEach((c) => {
    const cat = expenseCategories.find((ec) => ec.id === c.categoryId);
    if (!cat) return;
    const existing = map.get(c.categoryId);
    if (existing) {
      existing.total += c.amount;
      existing.count += 1;
    } else {
      map.set(c.categoryId, {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        color: cat.color,
        total: c.amount,
        count: 1,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

interface ReimbursementBatch {
  date: string;
  total: number;
  claims: ExpenseClaim[];
}

function buildReimbursementBatches(claims: ExpenseClaim[]): ReimbursementBatch[] {
  const map = new Map<string, ReimbursementBatch>();

  claims
    .filter((c) => c.status === 'approved' && c.reimbursedAt)
    .forEach((c) => {
      const dateKey = c.reimbursedAt!.slice(0, 10);
      const existing = map.get(dateKey);
      if (existing) {
        existing.total += c.amount;
        existing.claims.push(c);
      } else {
        map.set(dateKey, { date: dateKey, total: c.amount, claims: [c] });
      }
    });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function SummaryReportsTab({ claims }: { claims: ExpenseClaim[] }) {
  const monthlyData = buildMonthlyChartData(claims);
  const categoryTotals = buildCategoryTotals(claims);
  const grandTotal = categoryTotals.reduce((s, c) => s + c.total, 0);
  const batches = buildReimbursementBatches(claims);

  return (
    <div className="space-y-6">
      {/* Monthly chart */}
      <motion.div {...fadeUp(0)} className={CARD}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-gray-500 dark:text-gray-400" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            Monthly Expense Trend
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ExpenseChartTooltip />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {monthlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.amount > 0 ? '#3b82f6' : '#e5e7eb'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Category breakdown */}
      <motion.div {...fadeUp(1)} className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Category Breakdown (YTD)
        </p>
        <div className="space-y-3">
          {categoryTotals.map((cat) => {
            const pct = grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0;
            const colors = getCategoryColors(cat.color);
            const catDef = expenseCategories.find((c) => c.id === cat.categoryId);
            const Icon = catDef ? getCategoryIcon(catDef.icon) : MoreHorizontal;
            return (
              <div key={cat.categoryId}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`p-1 rounded-lg ${colors.bg} ${colors.text}`}>
                      <Icon size={12} />
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {cat.categoryName}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">
                    {peso(cat.total)}
                    <span className="text-[10px] text-gray-400 font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: colors.bar }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Top categories table */}
      <motion.div {...fadeUp(2)} className={`${CARD} p-0 overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Top Expense Categories</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                {['Rank', 'Category', 'Total Amount', '# Claims', 'Avg / Claim'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {categoryTotals.map((cat, i) => {
                const catDef = expenseCategories.find((c) => c.id === cat.categoryId);
                const colors = getCategoryColors(cat.color);
                const Icon = catDef ? getCategoryIcon(catDef.icon) : MoreHorizontal;
                const avg = cat.count > 0 ? cat.total / cat.count : 0;
                return (
                  <tr
                    key={cat.categoryId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-400">#{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded-lg ${colors.bg} ${colors.text}`}>
                          <Icon size={12} />
                        </span>
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {cat.categoryName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white tabular-nums">
                      {peso(cat.total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                      {cat.count}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                      {peso(avg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Reimbursement timeline */}
      <motion.div {...fadeUp(3)} className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Reimbursement Timeline
        </p>
        {batches.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No reimbursements yet.</p>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.date}>
                {/* Batch header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Reimbursed on {formatDate(batch.date)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums">
                    {peso(batch.total)}
                  </span>
                </div>
                {/* Batch claims */}
                <ul className="ml-4 space-y-1.5 border-l-2 border-gray-100 dark:border-gray-800 pl-4">
                  {batch.claims.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {c.description}
                      </p>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums shrink-0">
                        {peso(c.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensePage() {
  const [activeTab, setActiveTab] = useState('claims');
  const [claims, setClaims] = useState<ExpenseClaim[]>(initialClaims);

  const ytdReimbursed = claims
    .filter((c) => c.status === 'approved')
    .reduce((s, c) => s + c.amount, 0);

  function handleSubmitSuccess(claim: ExpenseClaim) {
    setClaims((prev) => [claim, ...prev]);
    setActiveTab('claims');
  }

  function handleCancel(id: string) {
    setClaims((prev) => prev.filter((c) => c.id !== id));
  }

  const tabs = [
    { value: 'claims', label: 'My Claims', icon: <ReceiptText size={15} /> },
    { value: 'submit', label: 'Submit Claim', icon: <PlusCircle size={15} /> },
    { value: 'reports', label: 'Summary & Reports', icon: <TrendingUp size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Expense Claims</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Reimbursed this year:{' '}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {peso(ytdReimbursed)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('submit')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <PlusCircle size={15} />
          New Claim
        </button>
      </motion.div>

      {/* Pinned Summary Strip */}
      <SummaryStrip claims={claims} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="claims">
          <MyClaimsTab claims={claims} onCancel={handleCancel} />
        </TabsContent>

        <TabsContent value="submit">
          <SubmitClaimTab onSubmitSuccess={handleSubmitSuccess} />
        </TabsContent>

        <TabsContent value="reports">
          <SummaryReportsTab claims={claims} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
