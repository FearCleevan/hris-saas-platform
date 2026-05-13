import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Circle, AlertCircle, Clock,
  Building2, Calendar, ChevronDown, ChevronUp,
  FileText, Monitor, BookOpen, GraduationCap, Shield, Layers,
  ExternalLink, User,
} from 'lucide-react';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useOnboardingDetail, useUpdateOnboardingTask } from '@/hooks/useOnboarding';
import { useState } from 'react';
import type { OnboardingProgressItem } from '@/services/onboarding';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600 dark:text-blue-400',
    bg:    'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 dark:text-green-400',
    bg:    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-600 dark:text-red-400',
    bg:    'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  documents:   { icon: FileText,       label: 'Documents',   color: 'text-blue-500' },
  it_setup:    { icon: Monitor,        label: 'IT Setup',    color: 'text-indigo-500' },
  orientation: { icon: BookOpen,       label: 'Orientation', color: 'text-amber-500' },
  training:    { icon: GraduationCap,  label: 'Training',    color: 'text-purple-500' },
  compliance:  { icon: Shield,         label: 'Compliance',  color: 'text-red-500' },
  general:     { icon: Layers,         label: 'General',     color: 'text-gray-500' },
  // mock data uses plain text categories
  'Pre-Arrival':    { icon: FileText,      label: 'Pre-Arrival',    color: 'text-blue-500' },
  'Day 1':          { icon: BookOpen,      label: 'Day 1',          color: 'text-amber-500' },
  'Week 1':         { icon: GraduationCap, label: 'Week 1',         color: 'text-purple-500' },
  'First Month':    { icon: Shield,        label: 'First Month',    color: 'text-indigo-500' },
  'IT & Access':    { icon: Monitor,       label: 'IT & Access',    color: 'text-indigo-500' },
};

const ROLE_LABELS: Record<string, string> = {
  employee:   'New Hire',
  hr:         'HR',
  it:         'IT',
  admin:      'Admin',
  supervisor: 'Supervisor',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function getDueBadge(item: OnboardingProgressItem) {
  if (item.status === 'completed' || item.status === 'skipped') return null;
  if (!item.dueDate) return null;
  const today = new Date().toISOString().split('T')[0];
  if (item.dueDate < today) {
    return { label: 'Overdue', cls: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' };
  }
  const daysLeft = differenceInDays(parseISO(item.dueDate), new Date());
  if (daysLeft <= 3) {
    return { label: `Due in ${daysLeft}d`, cls: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
  }
  return { label: `Due ${format(parseISO(item.dueDate), 'MMM d')}`, cls: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700' };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TaskRow({
  item,
  employeeId,
  isMock,
}: {
  item: OnboardingProgressItem;
  employeeId: string;
  isMock: boolean;
}) {
  const updateMutation = useUpdateOnboardingTask();
  const isCompleted = item.status === 'completed';
  const isUpdating  = updateMutation.isPending && updateMutation.variables?.progressId === item.id;
  const dueBadge    = getDueBadge(item);

  const toggle = () => {
    if (isMock) {
      toast.info('Connect Supabase to enable task toggling.');
      return;
    }
    const nextStatus = isCompleted ? 'pending' : 'completed';
    updateMutation.mutate(
      { progressId: item.id, status: nextStatus, employeeId },
      {
        onSuccess: () => toast.success(isCompleted ? 'Task marked pending' : 'Task completed!'),
        onError:   (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={isUpdating}
        className="mt-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 rounded-full"
        aria-label={isCompleted ? 'Mark as pending' : 'Mark as complete'}
      >
        {isUpdating ? (
          <div className="w-4 h-4 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-brand-blue transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isCompleted ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>
          {item.task.title}
          {item.task.isRequired && !isCompleted && (
            <span className="ml-1.5 text-[10px] font-semibold text-red-500">*</span>
          )}
        </p>
        {item.task.description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.task.description}</p>
        )}
        {item.notes && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 italic">Note: {item.notes}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {item.task.assignedToRole && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {ROLE_LABELS[item.task.assignedToRole] ?? item.task.assignedToRole}
            </span>
          )}
          {dueBadge && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${dueBadge.cls}`}>
              {dueBadge.label}
            </span>
          )}
          {isCompleted && item.completedAt && (
            <span className="text-[10px] text-gray-400">
              Done {format(new Date(item.completedAt), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  categoryName,
  items,
  employeeId,
  isMock,
}: {
  categoryName: string;
  items: OnboardingProgressItem[];
  employeeId: string;
  isMock: boolean;
}) {
  const [open, setOpen] = useState(true);
  const catCfg   = CATEGORY_CONFIG[categoryName] ?? CATEGORY_CONFIG.general;
  const CatIcon  = catCfg.icon;
  const done     = items.filter((i) => i.status === 'completed').length;
  const total    = items.length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone  = done === total;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 ${catCfg.color}`}>
            <CatIcon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{catCfg.label}</p>
            <p className="text-xs text-gray-400">{done} of {total} completed · {pct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            {/* eslint-disable-next-line react/forbid-dom-props -- dynamic width requires inline style */}
            <div
              className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-brand-blue'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {allDone
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : open
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/80">
          {items.map((item) => (
            <TaskRow key={item.id} item={item} employeeId={employeeId} isMock={isMock} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OnboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detail, isLoading } = useOnboardingDetail(id);
  const isMock = !!(id && id.startsWith('emp'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Record not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')} className="mt-4">
          Back to Onboarding
        </Button>
      </div>
    );
  }

  const cfg         = STATUS_CONFIG[detail.overallStatus];
  const pct         = detail.totalTasks > 0 ? Math.round((detail.completedTasks / detail.totalTasks) * 100) : 0;
  const daysElapsed = detail.dateHired ? differenceInDays(new Date(), new Date(detail.dateHired)) : 0;

  // Group items by category preserving order of first appearance
  const groupedCategories = useMemo(() => {
    const map = new Map<string, OnboardingProgressItem[]>();
    for (const item of detail.items) {
      const cat = item.task.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [detail.items]);

  // Compute regularization date estimate (hire date + 6 months) for display
  const regularizationEst = detail.dateHired
    ? format(addDays(parseISO(detail.dateHired), 180), 'MMM d, yyyy')
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/onboarding"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Onboarding
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-blue flex items-center justify-center text-white text-xl font-bold shrink-0">
            {getInitials(detail.employeeName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{detail.employeeName}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {detail.position} · {detail.department}
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              {detail.dateHired && (
                <>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Started {format(new Date(detail.dateHired), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {daysElapsed} days elapsed
                  </span>
                  {regularizationEst && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Est. regularization {regularizationEst}
                    </span>
                  )}
                </>
              )}
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {detail.department}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/employees/${detail.employeeId}`)}
            className="flex items-center gap-1.5 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Profile
          </Button>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">
              {detail.completedTasks}/{detail.totalTasks} tasks · {pct}%
            </p>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            {/* eslint-disable-next-line react/forbid-dom-props -- dynamic width requires inline style */}
          <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                detail.overallStatus === 'completed' ? 'bg-green-500' :
                detail.overallStatus === 'overdue'   ? 'bg-red-500' : 'bg-brand-blue'
              }`}
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {detail.categories.map((cat) => {
              const catCfg = CATEGORY_CONFIG[cat.name] ?? CATEGORY_CONFIG.general;
              const allDone = cat.done === cat.total;
              return (
                <span
                  key={cat.name}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    allDone
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {allDone ? '✓' : `${cat.done}/${cat.total}`} {catCfg.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category checklists */}
      <div className="flex flex-col gap-3">
        {groupedCategories.map(([catName, items]) => (
          <CategoryCard
            key={catName}
            categoryName={catName}
            items={items}
            employeeId={detail.employeeId}
            isMock={isMock}
          />
        ))}
      </div>

      {isMock && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Showing demo data. Connect Supabase to enable task toggling and real-time updates.
        </p>
      )}
    </motion.div>
  );
}
