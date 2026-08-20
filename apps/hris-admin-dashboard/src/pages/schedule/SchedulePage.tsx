import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Users, Layers, ChevronLeft, ChevronRight, ChevronDown, Clock, Plus,
  Search, AlertTriangle, Palmtree, X, Check, Loader2, Moon, Trash2,
} from 'lucide-react';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, eachDayOfInterval,
} from 'date-fns';
import { toast } from 'sonner';
import {
  useSchedules,
  useScheduleAssignments,
  useCreateSchedule,
  useUpdateSchedule,
  useUpdateScheduleAssignments,
  useDeleteSchedule,
  type ScheduleEntry,
  type ScheduleAssignmentEntry,
} from '@/hooks/useAttendance';
import { useEmployees, type EmployeeRow } from '@/hooks/useEmployees';
import { useLeaveRequests, type LeaveRequestRow } from '@/hooks/useLeaves';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShiftFormInput {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  isNightShift: boolean;
  isFlexible: boolean;
  workDays: string[];
  departments: string[];
  color: string;
  assignedEmployeeIds: string[];
}

type FormErrors = Partial<Record<keyof ShiftFormInput, string>>;
type TabId = 'weekly' | 'roster' | 'shifts';

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const COLOR_PALETTE = [
  '#0038a8', '#1d4ed8', '#7c3aed', '#6366f1',
  '#0891b2', '#059669', '#ca8a04', '#f97316',
  '#dc2626', '#ce1126', '#db2777', '#64748b',
];

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'weekly', label: 'Weekly Roster',  icon: CalendarDays },
  { id: 'roster', label: 'Shift Roster',   icon: Users },
  { id: 'shifts', label: 'Shift Settings', icon: Layers },
];

const ALL_WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const WORK_DAY_PRESETS = [
  { label: 'Weekdays',  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'Mon – Sat', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  { label: 'All Days',  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function getWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function calcWorkHours(startTime: string, endTime: string, breakMins: number): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.max(0, parseFloat(((endMins - startMins - breakMins) / 60).toFixed(1)));
}

function detectNightShift(startTime: string, endTime: string): boolean {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) < (sh * 60 + sm);
}

function suggestCode(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 6);
}

function validateShiftForm(data: ShiftFormInput): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = 'Name is required';
  if (!data.code.trim()) errors.code = 'Code is required';
  else if (data.code.length > 6) errors.code = 'Max 6 characters';
  if (!data.startTime) errors.startTime = 'Required';
  if (!data.endTime) errors.endTime = 'Required';
  if (data.breakMinutes < 0) errors.breakMinutes = 'Cannot be negative';
  if (data.gracePeriodMinutes < 0) errors.gracePeriodMinutes = 'Cannot be negative';
  if (data.workDays.length === 0) errors.workDays = 'Select at least one work day';
  return errors;
}

// ── Shift Badge (inline-style, works with any color) ─────────────────────────

function ShiftBadge({
  code, startTime, endTime, color, size = 'md',
}: { code: string; startTime: string; endTime: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-0.5 rounded-lg text-white ${size === 'sm' ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}
      style={{ backgroundColor: color }}
    >
      <span className={`font-bold leading-none ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'}`}>{code}</span>
      <span className={`font-normal opacity-80 leading-none whitespace-nowrap ${size === 'sm' ? 'text-[8px]' : 'text-[9px]'}`}>
        {startTime}–{endTime}
      </span>
    </div>
  );
}

// ── Multi-Employee Picker ─────────────────────────────────────────────────────

function MultiEmployeePicker({
  allEmployees, selectedIds, conflictMap, onChange, shiftColor,
}: {
  allEmployees: EmployeeRow[];
  selectedIds: string[];
  conflictMap: Record<string, string>;
  onChange: (ids: string[]) => void;
  shiftColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q
      ? allEmployees
      : allEmployees.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.position.toLowerCase().includes(q),
        );
  }, [allEmployees, search]);

  const grouped = useMemo(() => {
    const map: Record<string, EmployeeRow[]> = {};
    for (const emp of filtered) {
      if (!map[emp.department]) map[emp.department] = [];
      map[emp.department].push(emp);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const toggleDept = (emps: EmployeeRow[]) => {
    const ids = emps.map((e) => e.id);
    const allSel = ids.every((id) => selectedIds.includes(id));
    onChange(
      allSel
        ? selectedIds.filter((id) => !ids.includes(id))
        : [...selectedIds, ...ids.filter((id) => !selectedIds.includes(id))],
    );
  };

  const selectedEmployees = allEmployees.filter((e) => selectedIds.includes(e.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors hover:border-gray-300 dark:hover:border-gray-600"
      >
        <span className={selectedIds.length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
          {selectedIds.length === 0
            ? 'Select employees…'
            : `${selectedIds.length} employee${selectedIds.length !== 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by name, role, or department…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto">
              {grouped.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No employees found</p>
              )}
              {grouped.map(([dept, emps]) => {
                const deptSelected = emps.every((e) => selectedIds.includes(e.id));
                const deptPartial  = !deptSelected && emps.some((e) => selectedIds.includes(e.id));
                return (
                  <div key={dept}>
                    <button
                      type="button"
                      onClick={() => toggleDept(emps)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          deptSelected ? 'bg-brand-blue border-brand-blue' : deptPartial ? 'border-brand-blue' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {deptSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        {deptPartial  && <span className="block w-2 h-px bg-brand-blue" />}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex-1 text-left">
                        {dept}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {emps.filter((e) => selectedIds.includes(e.id)).length}/{emps.length}
                      </span>
                    </button>

                    {emps.map((emp) => {
                      const selected     = selectedIds.includes(emp.id);
                      const conflictCode = conflictMap[emp.id];
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggle(emp.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left ${
                            selected ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? '' : 'border-gray-300 dark:border-gray-600'}`}
                            style={selected ? { backgroundColor: shiftColor, borderColor: shiftColor } : undefined}
                          >
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ backgroundColor: selected ? shiftColor : '#9ca3af' }}
                          >
                            {getInitials(emp.name)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{emp.name}</span>
                            <span className="block text-[10px] text-gray-400">{emp.position}</span>
                          </span>
                          {conflictCode && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 shrink-0 whitespace-nowrap">
                              In {conflictCode}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <span className="text-[10px] text-gray-400">{selectedIds.length} selected</span>
                <button type="button" onClick={() => onChange([])} className="text-[10px] font-semibold text-red-500 hover:underline">
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedEmployees.map((emp) => (
            <span
              key={emp.id}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: shiftColor }}
            >
              {emp.name.split(' ')[0]}
              <button type="button" aria-label={`Remove ${emp.name}`} onClick={() => toggle(emp.id)} className="opacity-70 hover:opacity-100">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shift Form Modal ──────────────────────────────────────────────────────────

function ShiftFormModal({
  mode, initialData, allEmployees, allShifts, currentAssignments, onSave, onClose, isSaving,
}: {
  mode: 'add' | 'edit';
  initialData: ScheduleEntry | null;
  allEmployees: EmployeeRow[];
  allShifts: ScheduleEntry[];
  currentAssignments: ScheduleAssignmentEntry[];
  onSave: (data: ShiftFormInput) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const allDepartments = useMemo(
    () => [...new Set(allEmployees.map((e) => e.department))].sort(),
    [allEmployees],
  );

  const currentAssignedIds = useMemo(() => {
    if (!initialData) return [];
    return currentAssignments.filter((a) => a.scheduleId === initialData.id).map((a) => a.employeeId);
  }, [initialData, currentAssignments]);

  const conflictMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of currentAssignments) {
      if (initialData && a.scheduleId === initialData.id) continue;
      const shift = allShifts.find((s) => s.id === a.scheduleId);
      if (shift) map[a.employeeId] = shift.code;
    }
    return map;
  }, [currentAssignments, initialData, allShifts]);

  const [form, setForm] = useState<ShiftFormInput>(() =>
    initialData
      ? {
          name:               initialData.name,
          code:               initialData.code,
          startTime:          initialData.startTime,
          endTime:            initialData.endTime,
          breakMinutes:       initialData.breakMinutes,
          gracePeriodMinutes: initialData.gracePeriodMinutes,
          isNightShift:       initialData.isNightShift,
          isFlexible:         initialData.isFlexible,
          workDays:           [...initialData.workDays],
          departments:        [...initialData.departments],
          color:              initialData.color,
          assignedEmployeeIds: [...currentAssignedIds],
        }
      : {
          name: '', code: '', startTime: '08:00', endTime: '17:00',
          breakMinutes: 60, gracePeriodMinutes: 15,
          isNightShift: false, isFlexible: false,
          workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          departments: [], color: '#0038a8',
          assignedEmployeeIds: [],
        },
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (patch: Partial<ShiftFormInput>) => setForm((p) => ({ ...p, ...patch }));

  const computedHours = useMemo(
    () => calcWorkHours(form.startTime, form.endTime, form.breakMinutes),
    [form.startTime, form.endTime, form.breakMinutes],
  );

  const nightShiftAuto = detectNightShift(form.startTime, form.endTime);

  const toggleDept = (dept: string) =>
    set({ departments: form.departments.includes(dept) ? form.departments.filter((d) => d !== dept) : [...form.departments, dept] });

  const toggleWorkDay = (day: string) =>
    set({ workDays: form.workDays.includes(day) ? form.workDays.filter((d) => d !== day) : [...form.workDays, day] });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validateShiftForm({ ...form, isNightShift: nightShiftAuto });
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({ ...form, isNightShift: nightShiftAuto });
  };

  const inputCls = (field: keyof ShiftFormInput) =>
    `w-full h-9 px-3 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors ${
      errors[field] ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
    }`;

  const showPreview = form.name.trim() && form.code.trim();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-white">
              {mode === 'add' ? 'Add New Shift' : `Edit — ${initialData?.name ?? 'Shift'}`}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {mode === 'add' ? 'Define a new work shift for your organization' : 'Update shift definition and employee assignments'}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">

          {/* ── Name + Code ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Shift Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const autoCode = suggestCode(name);
                  set({ name, code: form.code === '' || form.code === suggestCode(form.name) ? autoCode : form.code });
                }}
                placeholder="e.g. Morning Shift"
                className={inputCls('name')}
              />
              {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase().slice(0, 6) })}
                placeholder="MRN"
                className={`${inputCls('code')} font-mono font-bold tracking-wider`}
              />
              {errors.code && <p className="text-[10px] text-red-500 mt-0.5">{errors.code}</p>}
            </div>
          </div>

          {/* ── Times ── */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                aria-label="Start time"
                value={form.startTime}
                onChange={(e) => set({ startTime: e.target.value })}
                className={inputCls('startTime')}
              />
              {errors.startTime && <p className="text-[10px] text-red-500 mt-0.5">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                aria-label="End time"
                value={form.endTime}
                onChange={(e) => set({ endTime: e.target.value })}
                className={inputCls('endTime')}
              />
              {errors.endTime && <p className="text-[10px] text-red-500 mt-0.5">{errors.endTime}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Work Hours</label>
              <div className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 select-none">
                {computedHours > 0 ? `${computedHours}h` : '—'}
                {nightShiftAuto && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <Moon className="w-2.5 h-2.5" /> Night
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Break + Grace + Flexible ── */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Break (min)</label>
              <input
                type="number"
                aria-label="Break duration in minutes"
                min={0} max={180}
                value={form.breakMinutes}
                onChange={(e) => set({ breakMinutes: Math.max(0, Number(e.target.value)) })}
                className={inputCls('breakMinutes')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Grace (min)</label>
              <input
                type="number"
                aria-label="Grace period in minutes"
                min={0} max={60}
                value={form.gracePeriodMinutes}
                onChange={(e) => set({ gracePeriodMinutes: Math.max(0, Number(e.target.value)) })}
                className={inputCls('gracePeriodMinutes')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Flexible</label>
              <button
                type="button"
                onClick={() => set({ isFlexible: !form.isFlexible })}
                className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                  form.isFlexible
                    ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400'
                }`}
              >
                {form.isFlexible ? 'Flexible' : 'Fixed'}
                <span className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${form.isFlexible ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${form.isFlexible ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>
            </div>
          </div>

          {/* ── Work Days ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Work Days <span className="text-red-500">*</span>
                <span className="ml-1 font-normal text-gray-400">({form.workDays.length} days)</span>
              </label>
              <div className="flex gap-1">
                {WORK_DAY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set({ workDays: [...p.days] })}
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                      p.days.length === form.workDays.length && p.days.every((d) => form.workDays.includes(d))
                        ? 'border-transparent text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    style={
                      p.days.length === form.workDays.length && p.days.every((d) => form.workDays.includes(d))
                        ? { backgroundColor: form.color }
                        : undefined
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5">
              {ALL_WEEK_DAYS.map((day) => {
                const active    = form.workDays.includes(day);
                const isWeekend = day === 'Sat' || day === 'Sun';
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-colors border ${
                      active
                        ? 'text-white border-transparent'
                        : isWeekend
                        ? 'bg-gray-50 dark:bg-gray-800/30 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={active ? { backgroundColor: form.color } : undefined}
                  >
                    {day.slice(0, 1)}
                    <span className="hidden sm:inline">{day.slice(1)}</span>
                  </button>
                );
              })}
            </div>
            {errors.workDays && <p className="text-[10px] text-red-500 mt-1">{errors.workDays}</p>}
          </div>

          {/* ── Color ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Shift Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Select color ${c}`}
                  onClick={() => set({ color: c })}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    form.color === c ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-gray-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {form.color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* ── Departments ── */}
          {allDepartments.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Applicable Departments
                <span className="ml-1 text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allDepartments.map((dept) => {
                  const active = form.departments.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDept(dept)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                        active
                          ? 'text-white border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      style={active ? { backgroundColor: form.color, borderColor: form.color } : undefined}
                    >
                      {active && <Check className="w-2.5 h-2.5 inline mr-1" />}
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Assign Employees ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Assigned Employees
              {Object.keys(conflictMap).length > 0 && (
                <span className="ml-2 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                  · {Object.keys(conflictMap).length} in other shifts
                </span>
              )}
            </label>
            <MultiEmployeePicker
              allEmployees={allEmployees}
              selectedIds={form.assignedEmployeeIds}
              conflictMap={conflictMap}
              onChange={(ids) => set({ assignedEmployeeIds: ids })}
              shiftColor={form.color}
            />
          </div>

          {/* ── Live preview ── */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: form.color }}
                    >
                      {form.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{form.name}</p>
                        {nightShiftAuto && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5">
                            <Moon className="w-2.5 h-2.5" /> Night
                          </span>
                        )}
                        {form.isFlexible && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                            Flexible
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {form.startTime}–{form.endTime} · {computedHours}h · {form.breakMinutes}m break · {form.workDays.join(', ')}
                      </p>
                    </div>
                    <ShiftBadge code={form.code} startTime={form.startTime} endTime={form.endTime} color={form.color} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-10 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: form.color || '#0038a8' }}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'add' ? 'Add Shift' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Weekly Roster Tab ─────────────────────────────────────────────────────────

function WeeklyTab({
  shifts, assignments, employees, leaveRequests, isLoading,
}: {
  shifts: ScheduleEntry[];
  assignments: ScheduleAssignmentEntry[];
  employees: EmployeeRow[];
  leaveRequests: LeaveRequestRow[];
  isLoading: boolean;
}) {
  const [weekStart, setWeekStart] = useState(() => getWeekMonday(new Date()));
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch]         = useState('');

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const departments = useMemo(
    () => ['all', ...new Set(employees.map((e) => e.department))].sort(),
    [employees],
  );

  const approvedLeaveMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const req of leaveRequests.filter((r) => r.status === 'approved')) {
      if (!map[req.employeeId]) map[req.employeeId] = {};
      try {
        const days = eachDayOfInterval({ start: parseISO(req.startDate), end: parseISO(req.endDate) });
        for (const day of days) {
          map[req.employeeId][format(day, 'yyyy-MM-dd')] = req.leaveTypeCode;
        }
      } catch { /* skip invalid intervals */ }
    }
    return map;
  }, [leaveRequests]);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assignments
      .map((a) => {
        const emp   = employees.find((e) => e.id === a.employeeId);
        const shift = shifts.find((s) => s.id === a.scheduleId);
        return emp && shift ? { emp, shift, workDays: shift.workDays.length > 0 ? shift.workDays : a.workDays } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => deptFilter === 'all' || r.emp.department === deptFilter)
      .filter((r) => !q || r.emp.name.toLowerCase().includes(q) || r.emp.position.toLowerCase().includes(q))
      .sort((a, b) => a.emp.department.localeCompare(b.emp.department) || a.emp.name.localeCompare(b.emp.name));
  }, [assignments, employees, shifts, deptFilter, search]);

  const goToCurrentWeek = () => setWeekStart(getWeekMonday(new Date()));
  const isCurrentWeek = weekStart.toDateString() === getWeekMonday(new Date()).toDateString();

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekStart(getWeekMonday(subWeeks(weekStart, 1)))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap px-1">
            {format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}
          </span>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekStart(getWeekMonday(addWeeks(weekStart, 1)))}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {!isCurrentWeek && (
          <button
            type="button"
            onClick={goToCurrentWeek}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition-colors"
          >
            Today
          </button>
        )}

        <div className="relative">
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setSearch(''); }}
            title="Filter by department"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 pr-3 w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          />
        </div>

        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          : <span className="text-xs text-gray-400">{rows.length} employees</span>
        }

        {/* Shift legend */}
        <div className="ml-auto flex flex-wrap gap-2 items-center">
          {shifts.map((s) => (
            <ShiftBadge key={s.id} code={s.code} startTime={s.startTime} endTime={s.endTime} color={s.color} size="sm" />
          ))}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
            <Palmtree className="w-3 h-3" />
            <span className="text-[9px] font-semibold">On Leave</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-900 z-10 min-w-47.5">
                  Employee
                </th>
                {WEEK_DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={`text-center px-2 py-3 text-xs font-semibold min-w-22.5 ${
                      i >= 5 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div>{day}</div>
                    <div className="text-[10px] font-normal text-gray-400 dark:text-gray-500">
                      {format(weekDates[i], 'MMM d')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-gray-400 py-12">
                    No employees scheduled
                  </td>
                </tr>
              )}
              {rows.map((row, i) => {
                const hasNoRestDay = row.workDays.length >= 6;
                return (
                  <tr
                    key={row.emp.id}
                    className={`${i < rows.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors ${
                      hasNoRestDay ? 'border-l-2 border-l-red-500' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900 z-10 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: row.shift.color }}
                        >
                          {getInitials(row.emp.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight whitespace-nowrap">
                              {row.emp.name}
                            </p>
                            {hasNoRestDay && (
                              <span title="No rest day — potential labor violation">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">{row.emp.department}</p>
                        </div>
                      </div>
                    </td>
                    {WEEK_DAYS.map((day, di) => {
                      const isWorking    = row.workDays.includes(day);
                      const isWeekendCell = di >= 5;
                      const dateStr      = format(weekDates[di], 'yyyy-MM-dd');
                      const leaveCode    = isWorking ? approvedLeaveMap[row.emp.id]?.[dateStr] : undefined;
                      const isOnLeave    = !!leaveCode;

                      return (
                        <td
                          key={day}
                          className={`px-2 py-2.5 text-center ${isWeekendCell ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
                        >
                          {isOnLeave ? (
                            <div className="inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                              <Palmtree className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-none">{leaveCode}</span>
                            </div>
                          ) : isWorking ? (
                            <ShiftBadge
                              code={row.shift.code}
                              startTime={row.shift.startTime}
                              endTime={row.shift.endTime}
                              color={row.shift.color}
                            />
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-gray-700">Off</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Shift Roster Tab ──────────────────────────────────────────────────────────

function RosterTab({
  shifts, assignments, employees, isLoading,
}: {
  shifts: ScheduleEntry[];
  assignments: ScheduleAssignmentEntry[];
  employees: EmployeeRow[];
  isLoading: boolean;
}) {
  const rosterByShift = useMemo(() => {
    return shifts.map((shift) => {
      const assigned = assignments
        .filter((a) => a.scheduleId === shift.id)
        .map((a) => employees.find((e) => e.id === a.employeeId))
        .filter((e): e is EmployeeRow => e !== undefined)
        .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
      return { shift, employees: assigned };
    });
  }, [shifts, assignments, employees]);

  const unassignedAlerts = rosterByShift.filter((r) => r.employees.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {unassignedAlerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {unassignedAlerts.map((item) => (
            <div
              key={item.shift.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <span className="font-bold">{item.shift.code} – {item.shift.name}:</span>{' '}
                No employees assigned to this shift
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rosterByShift.map((item, i) => (
          <motion.div
            key={item.shift.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border ${
              item.employees.length === 0
                ? 'border-amber-300 dark:border-amber-900/50'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            {/* Shift header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: item.shift.color }}
              >
                {item.shift.code}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-white">{item.shift.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{item.shift.startTime} – {item.shift.endTime}</span>
                  <span>· {item.shift.workHours}h · {item.shift.breakMinutes}m break</span>
                </div>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0"
                style={{ backgroundColor: item.shift.color }}
              >
                {item.employees.length} staff
              </span>
            </div>

            {/* Employee list */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60 max-h-64 overflow-y-auto">
              {item.employees.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No employees assigned</p>
              ) : (
                item.employees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: item.shift.color }}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{emp.name}</p>
                      <p className="text-[10px] text-gray-400">{emp.position}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{emp.department}</span>
                  </div>
                ))
              )}
            </div>

            {/* Work days footer */}
            <div className="px-4 py-2.5 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
              <div className="flex items-center gap-1.5">
                {WEEK_DAYS.map((day) => {
                  const isWorkDay = item.shift.workDays.includes(day);
                  return (
                    <span
                      key={day}
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        !isWorkDay ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'text-white'
                      }`}
                      style={isWorkDay ? { backgroundColor: item.shift.color } : undefined}
                    >
                      {day[0]}
                    </span>
                  );
                })}
                <span className="text-[10px] text-gray-400 ml-1">Grace: {item.shift.gracePeriodMinutes}min</span>
              </div>
            </div>
          </motion.div>
        ))}

        {shifts.length === 0 && (
          <div className="col-span-2 text-center py-16 text-sm text-gray-400">
            No shifts configured yet
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shift Settings Tab ────────────────────────────────────────────────────────

function ShiftsSettingsTab({
  shifts, assignments, onEdit, onAdd, onDelete, isDeleting, isLoading,
}: {
  shifts: ScheduleEntry[];
  assignments: ScheduleAssignmentEntry[];
  onEdit: (shift: ScheduleEntry) => void;
  onAdd: () => void;
  onDelete: (shift: ScheduleEntry) => void;
  isDeleting: boolean;
  isLoading: boolean;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shifts.map((shift, i) => {
        const assignedCount = assignments.filter((a) => a.scheduleId === shift.id).length;
        return (
          <motion.div
            key={shift.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: shift.color }}
              >
                {shift.code}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{shift.name}</p>
                <p className="text-xs text-gray-400">{shift.workHours}h/day · {shift.breakMinutes}m break</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4 text-gray-400" />
              {shift.startTime} – {shift.endTime}
            </div>

            <p className="text-xs text-gray-400 mb-2">Grace period: {shift.gracePeriodMinutes} min</p>

            {shift.isNightShift && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mr-1.5">
                Night Shift
              </span>
            )}
            {shift.isFlexible && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400">
                Flexible
              </span>
            )}

            {shift.departments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                {shift.departments.map((dept) => (
                  <span
                    key={dept}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">{assignedCount} employee{assignedCount !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEdit(shift)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-brand-blue hover:underline"
                >
                  Edit Shift
                </button>
                {confirmingId === shift.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => { onDelete(shift); setConfirmingId(null); }}
                      className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md disabled:opacity-50"
                    >
                      Confirm?
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="text-[10px] font-semibold text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={assignedCount > 0}
                    title={assignedCount > 0 ? 'Unassign all employees before deleting this shift' : 'Delete this shift'}
                    onClick={() => setConfirmingId(shift.id)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-brand-red disabled:opacity-40 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Add new shift */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: shifts.length * 0.06 }}
        onClick={onAdd}
        className="bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 min-h-45 hover:border-brand-blue/50 hover:text-brand-blue hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-brand-blue/10 flex items-center justify-center transition-colors">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold">Add New Shift</span>
      </motion.button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [activeTab,  setActiveTab]  = useState<TabId>('weekly');
  const [shiftModal, setShiftModal] = useState<{ mode: 'add' | 'edit'; shift: ScheduleEntry | null } | null>(null);
  const [isSaving,   setIsSaving]   = useState(false);

  const { data: shifts      = [], isLoading: loadingShifts } = useSchedules();
  const { data: assignments = [], isLoading: loadingAssign } = useScheduleAssignments();
  const { data: employees   = [], isLoading: loadingEmps   } = useEmployees();
  const { data: leaveRequests = []                          } = useLeaveRequests();

  const createShift      = useCreateSchedule();
  const updateShift      = useUpdateSchedule();
  const updateAssignments = useUpdateScheduleAssignments();
  const deleteShift      = useDeleteSchedule();

  const handleDeleteShift = async (shift: ScheduleEntry) => {
    try {
      await deleteShift.mutateAsync({ id: shift.id });
      toast.success(`Shift "${shift.name}" deleted`);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete this shift');
    }
  };

  const isLoading = loadingShifts || loadingAssign || loadingEmps;

  const stats = useMemo(() => {
    const shiftCounts = shifts.map((s) => ({
      shift: s,
      count: assignments.filter((a) => a.scheduleId === s.id).length,
    }));
    return { shiftCounts, totalAssigned: assignments.length };
  }, [shifts, assignments]);

  const handleSaveShift = async (data: ShiftFormInput) => {
    if (!shiftModal) return;
    setIsSaving(true);
    try {
      const { assignedEmployeeIds, ...scheduleInput } = data;
      if (shiftModal.mode === 'add') {
        const created = await createShift.mutateAsync(scheduleInput);
        if (assignedEmployeeIds.length > 0) {
          await updateAssignments.mutateAsync({ scheduleId: created.id, employeeIds: assignedEmployeeIds });
        }
        toast.success(`Shift "${data.name}" created`);
      } else if (shiftModal.shift) {
        await updateShift.mutateAsync({ id: shiftModal.shift.id, ...data });
        await updateAssignments.mutateAsync({ scheduleId: shiftModal.shift.id, employeeIds: assignedEmployeeIds });
        toast.success(`Shift "${data.name}" updated`);
      }
      setShiftModal(null);
    } catch {
      toast.error('Failed to save shift');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Shifts & Schedule</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isLoading
                ? 'Loading…'
                : `${stats.totalAssigned} employees across ${shifts.length} shift type${shifts.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.shiftCounts.map(({ shift, count }) => (
              <span
                key={shift.id}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: shift.color }}
              >
                {shift.code}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'weekly' && (
              <WeeklyTab
                shifts={shifts}
                assignments={assignments}
                employees={employees}
                leaveRequests={leaveRequests}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'roster' && (
              <RosterTab
                shifts={shifts}
                assignments={assignments}
                employees={employees}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'shifts' && (
              <ShiftsSettingsTab
                shifts={shifts}
                assignments={assignments}
                onEdit={(shift) => setShiftModal({ mode: 'edit', shift })}
                onAdd={() => setShiftModal({ mode: 'add', shift: null })}
                onDelete={handleDeleteShift}
                isDeleting={deleteShift.isPending}
                isLoading={isLoading}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Shift form modal */}
      <AnimatePresence>
        {shiftModal && (
          <ShiftFormModal
            mode={shiftModal.mode}
            initialData={shiftModal.shift}
            allEmployees={employees}
            allShifts={shifts}
            currentAssignments={assignments}
            onSave={handleSaveShift}
            onClose={() => !isSaving && setShiftModal(null)}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>
    </>
  );
}
