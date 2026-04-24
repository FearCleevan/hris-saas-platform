import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Users, Layers, ChevronLeft, ChevronRight, ChevronDown, Clock, Plus,
  Search, AlertTriangle, Palmtree, X, Check, UserPlus, UserMinus,
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';
import shiftsData from '@/data/mock/shifts.json';
import shiftAssignmentsData from '@/data/mock/shift-assignments.json';
import employeesData from '@/data/mock/employees.json';
import leaveRequestsData from '@/data/mock/leave-requests.json';

/* ─── Types ─── */
interface ShiftDef {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workHours: number;
  departments: string[];
  gracePeriodMinutes: number;
  color: string;
}

interface ShiftAssignment {
  id?: string;
  employeeId: string;
  shiftId: string;
  workDays: string[];
  effectiveFrom?: string;
}

interface ShiftFormInput {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  departments: string[];
  color: string;
  assignedEmployeeIds: string[];
}

type FormErrors = Partial<Record<keyof ShiftFormInput, string>>;
type TabId = 'weekly' | 'roster' | 'shifts';

/* ─── Constants ─── */
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const SHIFT_COLORS: Record<string, string> = {
  shift001: 'bg-[#0038a8]/10 text-[#0038a8] dark:bg-[#0038a8]/20 dark:text-blue-300',
  shift002: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  shift003: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400',
  shift004: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400',
  shift005: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
};

const SHIFT_THRESHOLDS: Record<string, { min: number; max: number }> = {
  shift001: { min: 25, max: 40 },
  shift002: { min: 4,  max: 8  },
  shift003: { min: 4,  max: 8  },
  shift004: { min: 2,  max: 5  },
  shift005: { min: 4,  max: 8  },
};

const COLOR_PALETTE = [
  '#0038a8', '#1d4ed8', '#7c3aed', '#6366f1',
  '#0891b2', '#059669', '#ca8a04', '#f97316',
  '#dc2626', '#ce1126', '#db2777', '#64748b',
];

const ALL_DEPARTMENTS = [...new Set(employeesData.map((e) => e.department))].sort();

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'weekly', label: 'Weekly Roster',  icon: CalendarDays },
  { id: 'roster', label: 'Shift Roster',   icon: Users },
  { id: 'shifts', label: 'Shift Settings', icon: Layers },
];

/* ─── Module-level precomputed data ─── */
const APPROVED_LEAVE_MAP: Record<string, Record<string, string>> = (() => {
  const map: Record<string, Record<string, string>> = {};
  for (const req of leaveRequestsData.filter((r) => r.status === 'approved')) {
    if (!map[req.employeeId]) map[req.employeeId] = {};
    try {
      const days = eachDayOfInterval({ start: parseISO(req.startDate), end: parseISO(req.endDate) });
      for (const day of days) {
        map[req.employeeId][format(day, 'yyyy-MM-dd')] = req.leaveTypeCode;
      }
    } catch { /* skip invalid intervals */ }
  }
  return map;
})();

/* ─── Helpers ─── */
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
  const total = (endMins - startMins - breakMins) / 60;
  return Math.max(0, parseFloat(total.toFixed(1)));
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
  return errors;
}

function getShiftBadgeClass(shiftId: string): string | null {
  return SHIFT_COLORS[shiftId] ?? null;
}

/* ─── Shift Form Modal ─── */
function ShiftFormModal({
  mode, initialData, allEmployees, currentAssignments, onSave, onClose,
}: {
  mode: 'add' | 'edit';
  initialData: ShiftDef | null;
  allEmployees: typeof employeesData;
  currentAssignments: ShiftAssignment[];
  onSave: (data: ShiftFormInput) => void;
  onClose: () => void;
}) {
  // Get currently assigned employee IDs for this shift (edit mode)
  const currentAssignedIds = useMemo(() => {
    if (mode === 'add' || !initialData) return [];
    return currentAssignments
      .filter((a) => a.shiftId === initialData.id)
      .map((a) => a.employeeId);
  }, [mode, initialData, currentAssignments]);

  const [form, setForm] = useState<ShiftFormInput>(() =>
    initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          startTime: initialData.startTime,
          endTime: initialData.endTime,
          breakMinutes: initialData.breakMinutes,
          gracePeriodMinutes: initialData.gracePeriodMinutes,
          departments: [...initialData.departments],
          color: initialData.color,
          assignedEmployeeIds: [...currentAssignedIds],
        }
      : {
          name: '', code: '', startTime: '08:00', endTime: '17:00',
          breakMinutes: 60, gracePeriodMinutes: 15, departments: [], color: '#0038a8',
          assignedEmployeeIds: [],
        },
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [employeeSearch, setEmployeeSearch] = useState('');

  const computedHours = useMemo(
    () => calcWorkHours(form.startTime, form.endTime, form.breakMinutes),
    [form.startTime, form.endTime, form.breakMinutes],
  );

  // Currently assigned employees
  const assignedEmployees = useMemo(
    () => allEmployees.filter((e) => form.assignedEmployeeIds.includes(e.id)),
    [allEmployees, form.assignedEmployeeIds],
  );

  // Searchable unassigned employees
  const unassignedEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    return allEmployees.filter(
      (e) =>
        !form.assignedEmployeeIds.includes(e.id) &&
        (!q || e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.position.toLowerCase().includes(q)),
    );
  }, [allEmployees, form.assignedEmployeeIds, employeeSearch]);

  const set = (patch: Partial<ShiftFormInput>) => setForm((p) => ({ ...p, ...patch }));

  const toggleDept = (dept: string) => {
    set({
      departments: form.departments.includes(dept)
        ? form.departments.filter((d) => d !== dept)
        : [...form.departments, dept],
    });
  };

  const addEmployee = (empId: string) => {
    set({ assignedEmployeeIds: [...form.assignedEmployeeIds, empId] });
    setEmployeeSearch('');
  };

  const removeEmployee = (empId: string) => {
    set({ assignedEmployeeIds: form.assignedEmployeeIds.filter((id) => id !== empId) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateShiftForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  const inputCls = (field: keyof ShiftFormInput) =>
    `w-full h-9 px-3 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 transition-colors ${
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
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-white">
              {mode === 'add' ? 'Add New Shift' : `Edit — ${initialData?.name ?? 'Shift'}`}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {mode === 'add' ? 'Define a new work shift for your organization' : 'Update shift definition and configuration'}
            </p>
          </div>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name + Code */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Shift Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
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
                placeholder="RDS"
                className={`${inputCls('code')} font-mono font-bold tracking-wider`}
              />
              {errors.code && <p className="text-[10px] text-red-500 mt-0.5">{errors.code}</p>}
            </div>
          </div>

          {/* Times + computed work hours */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                title="Start time"
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
                title="End time"
                value={form.endTime}
                onChange={(e) => set({ endTime: e.target.value })}
                className={inputCls('endTime')}
              />
              {errors.endTime && <p className="text-[10px] text-red-500 mt-0.5">{errors.endTime}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Work Hours</label>
              <div className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono font-bold text-gray-700 dark:text-gray-300 flex items-center select-none">
                {computedHours > 0 ? `${computedHours}h` : '—'}
              </div>
            </div>
          </div>

          {/* Break + Grace */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Break (minutes)</label>
              <input
                type="number"
                title="Break duration in minutes"
                min={0}
                max={180}
                value={form.breakMinutes}
                onChange={(e) => set({ breakMinutes: Math.max(0, Number(e.target.value)) })}
                className={inputCls('breakMinutes')}
              />
              {errors.breakMinutes && <p className="text-[10px] text-red-500 mt-0.5">{errors.breakMinutes}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Grace Period (minutes)</label>
              <input
                type="number"
                title="Grace period in minutes"
                min={0}
                max={60}
                value={form.gracePeriodMinutes}
                onChange={(e) => set({ gracePeriodMinutes: Math.max(0, Number(e.target.value)) })}
                className={inputCls('gracePeriodMinutes')}
              />
              {errors.gracePeriodMinutes && <p className="text-[10px] text-red-500 mt-0.5">{errors.gracePeriodMinutes}</p>}
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Shift Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
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

          {/* Departments */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Applicable Departments
              <span className="ml-1 text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DEPARTMENTS.map((dept) => {
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

          {/* ─── Employee Assignment (Edit mode only) ─── */}
          {mode === 'edit' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Assigned Employees
                <span className="ml-1 text-gray-400 font-normal">
                  ({assignedEmployees.length} assigned)
                </span>
              </label>

              {/* Search + Add */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search employee to add…"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 transition-colors"
                />
              </div>

              {/* Search results dropdown */}
              {employeeSearch.trim() && unassignedEmployees.length > 0 && (
                <div className="mb-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {unassignedEmployees.slice(0, 8).map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => addEmployee(emp.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {getInitials(emp.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{emp.name}</p>
                        <p className="text-[10px] text-gray-400">{emp.department} · {emp.position}</p>
                      </div>
                      <UserPlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {employeeSearch.trim() && unassignedEmployees.length === 0 && (
                <p className="text-[10px] text-gray-400 mb-2">No matching employees found</p>
              )}

              {/* Assigned employees list */}
              <div className="border border-gray-100 dark:border-gray-800 rounded-lg divide-y divide-gray-50 dark:divide-gray-800/60 max-h-48 overflow-y-auto">
                {assignedEmployees.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No employees assigned</p>
                ) : (
                  assignedEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: form.color }}
                      >
                        {getInitials(emp.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{emp.name}</p>
                        <p className="text-[10px] text-gray-400">{emp.department} · {emp.position}</p>
                      </div>
                      <button
                        type="button"
                        title={`Remove ${emp.name}`}
                        onClick={() => removeEmployee(emp.id)}
                        className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Live preview */}
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
                      <p className="text-sm font-bold text-gray-800 dark:text-white">{form.name}</p>
                      <p className="text-xs text-gray-400">
                        {form.startTime} – {form.endTime} · {computedHours}h · {form.breakMinutes}m break · {form.gracePeriodMinutes}min grace
                      </p>
                    </div>
                    <div
                      className="inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg shrink-0"
                      style={{ backgroundColor: `${form.color}20`, color: form.color }}
                    >
                      <span className="text-[10px] font-bold leading-none">{form.code}</span>
                      <span className="text-[9px] leading-none opacity-75 whitespace-nowrap">
                        {form.startTime}–{form.endTime}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: form.color || '#0038a8' }}
            >
              {mode === 'add' ? 'Add Shift' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Weekly Roster Tab ─── */
function WeeklyTab({ shifts, shiftAssignments }: { shifts: ShiftDef[]; shiftAssignments: ShiftAssignment[] }) {
  const [weekStart, setWeekStart] = useState(() => getWeekMonday(new Date(2023, 10, 6)));
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const departments = useMemo(
    () => ['all', ...new Set(employeesData.map((e) => e.department))],
    [],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return shiftAssignments
      .map((a) => {
        const emp = employeesData.find((e) => e.id === a.employeeId);
        const shift = shifts.find((s) => s.id === a.shiftId);
        return emp && shift ? { emp, shift, workDays: a.workDays as string[] } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => deptFilter === 'all' || r.emp.department === deptFilter)
      .filter((r) => !q || r.emp.name.toLowerCase().includes(q) || r.emp.position.toLowerCase().includes(q))
      .sort((a, b) => a.emp.department.localeCompare(b.emp.department) || a.emp.name.localeCompare(b.emp.name));
  }, [shifts, shiftAssignments, deptFilter, search]);

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5">
          <button
            type="button"
            title="Previous week"
            onClick={() => setWeekStart(getWeekMonday(subWeeks(weekStart, 1)))}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {format(weekDates[0], 'MMM d')} – {format(weekDates[6], 'MMM d, yyyy')}
          </span>
          <button
            type="button"
            title="Next week"
            onClick={() => setWeekStart(getWeekMonday(addWeeks(weekStart, 1)))}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="relative">
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setSearch(''); }}
            title="Filter by department"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 transition-colors"
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
            className="h-9 pl-8 pr-3 w-52 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 transition-colors"
          />
        </div>

        <span className="text-xs text-gray-400">{rows.length} employees</span>

        <div className="ml-auto flex flex-wrap gap-2 items-center">
          {shifts.map((s) => {
            const cls = getShiftBadgeClass(s.id);
            return cls ? (
              <span key={s.id} className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${cls}`}>
                {s.code} {s.startTime}–{s.endTime}
              </span>
            ) : (
              <span
                key={s.id}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg text-white"
                style={{ backgroundColor: s.color }}
              >
                {s.code} {s.startTime}–{s.endTime}
              </span>
            );
          })}
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
            <Palmtree className="w-3 h-3" />On Leave
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-900 z-10 min-w-[190px]">
                  Employee
                </th>
                {WEEK_DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={`text-center px-2 py-3 text-xs font-semibold min-w-[90px] ${
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
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-gray-400 py-12">No employees found</td>
                </tr>
              )}
              {rows.map((row, i) => {
                const badgeClass = getShiftBadgeClass(row.shift.id);
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
                              <span title="No rest day this week — potential labor violation">
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">{row.emp.department}</p>
                        </div>
                      </div>
                    </td>
                    {WEEK_DAYS.map((day, di) => {
                      const isWorking = row.workDays.includes(day);
                      const isWeekendCell = di >= 5;
                      const dateStr = format(weekDates[di], 'yyyy-MM-dd');
                      const leaveCode = isWorking ? APPROVED_LEAVE_MAP[row.emp.id]?.[dateStr] : undefined;
                      const isOnLeave = !!leaveCode;
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
                            badgeClass ? (
                              <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg ${badgeClass}`}>
                                <span className="text-[10px] font-bold leading-none">{row.shift.code}</span>
                                <span className="text-[9px] font-normal opacity-75 leading-none whitespace-nowrap">
                                  {row.shift.startTime}–{row.shift.endTime}
                                </span>
                              </div>
                            ) : (
                              <div
                                className="inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-white"
                                style={{ backgroundColor: row.shift.color }}
                              >
                                <span className="text-[10px] font-bold leading-none">{row.shift.code}</span>
                                <span className="text-[9px] font-normal opacity-75 leading-none whitespace-nowrap">
                                  {row.shift.startTime}–{row.shift.endTime}
                                </span>
                              </div>
                            )
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

/* ─── Shift Roster Tab ─── */
function RosterTab({ shifts, shiftAssignments }: { shifts: ShiftDef[]; shiftAssignments: ShiftAssignment[] }) {
  const rosterByShift = useMemo(() => {
    return shifts.map((shift) => {
      const assigned = shiftAssignments
        .filter((a) => a.shiftId === shift.id)
        .map((a) => employeesData.find((e) => e.id === a.employeeId))
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
      return { shift, employees: assigned };
    });
  }, [shifts, shiftAssignments]);

  const staffingAlerts = useMemo(() => {
    return rosterByShift
      .map(({ shift, employees }) => {
        const t = SHIFT_THRESHOLDS[shift.id];
        if (!t) return null;
        if (employees.length < t.min)
          return { id: shift.id, code: shift.code, name: shift.name, type: 'under' as const, count: employees.length, threshold: t };
        if (employees.length > t.max)
          return { id: shift.id, code: shift.code, name: shift.name, type: 'over' as const, count: employees.length, threshold: t };
        return null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  }, [rosterByShift]);

  return (
    <div>
      {staffingAlerts.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {staffingAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium border ${
                alert.type === 'under'
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <span className="font-bold">{alert.code} – {alert.name}:</span>{' '}
                {alert.type === 'under'
                  ? `Understaffed — ${alert.count} assigned, minimum required is ${alert.threshold.min}`
                  : `Overstaffed — ${alert.count} assigned, maximum is ${alert.threshold.max}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rosterByShift.map((item, i) => {
          const badgeClass = getShiftBadgeClass(item.shift.id);
          const t = SHIFT_THRESHOLDS[item.shift.id];
          const isUnderstaffed = t && item.employees.length < t.min;
          const isOverstaffed = t && item.employees.length > t.max;
          return (
            <motion.div
              key={item.shift.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border ${
                isUnderstaffed ? 'border-red-300 dark:border-red-900/50'
                : isOverstaffed ? 'border-amber-300 dark:border-amber-900/50'
                : 'border-gray-200 dark:border-gray-800'
              }`}
            >
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
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {badgeClass ? (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}>
                      {item.employees.length} staff
                    </span>
                  ) : (
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: item.shift.color }}
                    >
                      {item.employees.length} staff
                    </span>
                  )}
                  {t && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isUnderstaffed ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                      : isOverstaffed ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {isUnderstaffed ? `↓ min ${t.min}` : isOverstaffed ? `↑ max ${t.max}` : `✓ ${t.min}–${t.max}`}
                    </span>
                  )}
                </div>
              </div>

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

              <div className="px-4 py-2.5 border-t border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <div className="flex items-center gap-1.5">
                  {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => {
                    const isWorkDay =
                      day !== 'Sat' && day !== 'Sun' && !(item.shift.code === 'CWW' && day === 'Fri');
                    return (
                      <span
                        key={day}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                          isWorkDay ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
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
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shift Settings Tab ─── */
function ShiftsSettingsTab({
  shifts, shiftAssignments, onEdit, onAdd,
}: {
  shifts: ShiftDef[];
  shiftAssignments: ShiftAssignment[];
  onEdit: (shift: ShiftDef) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((shift, i) => {
          const assignedCount = shiftAssignments.filter((a) => a.shiftId === shift.id).length;
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

              <div className="flex flex-wrap gap-1.5 mb-3">
                {shift.departments.length > 0 ? shift.departments.map((dept) => (
                  <span
                    key={dept}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  >
                    {dept}
                  </span>
                )) : (
                  <span className="text-[10px] text-gray-400 italic">No departments specified</span>
                )}
              </div>

              {SHIFT_THRESHOLDS[shift.id] && (
                <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400">
                  <Users className="w-3 h-3" />
                  <span>Target: {SHIFT_THRESHOLDS[shift.id].min}–{SHIFT_THRESHOLDS[shift.id].max} staff</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400">{assignedCount} employee{assignedCount !== 1 ? 's' : ''}</span>
                <button
                  type="button"
                  onClick={() => onEdit(shift)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#0038a8] hover:underline"
                >
                  Edit Shift
                </button>
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
          className="bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-gray-400 min-h-[180px] hover:border-[#0038a8]/50 hover:text-[#0038a8] hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-[#0038a8]/10 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold">Add New Shift</span>
        </motion.button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<TabId>('weekly');
  const [shifts, setShifts] = useState<ShiftDef[]>(shiftsData as ShiftDef[]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>(shiftAssignmentsData as ShiftAssignment[]);
  const [shiftModal, setShiftModal] = useState<{ mode: 'add' | 'edit'; shift: ShiftDef | null } | null>(null);

  const stats = useMemo(() => {
    const shiftCounts = shifts.map((s) => ({
      shift: s,
      count: shiftAssignments.filter((a) => a.shiftId === s.id).length,
    }));
    return { shiftCounts, totalAssigned: shiftAssignments.length };
  }, [shifts, shiftAssignments]);

  const handleSaveShift = (data: ShiftFormInput) => {
    if (!shiftModal) return;
    if (shiftModal.mode === 'add') {
      const newId = `shift${String(shifts.length + 1).padStart(3, '0')}`;
      const newShift: ShiftDef = {
        id: newId,
        workHours: calcWorkHours(data.startTime, data.endTime, data.breakMinutes),
        ...data,
      };
      setShifts((prev) => [...prev, newShift]);
      toast.success(`Shift "${data.name}" added`);
    } else if (shiftModal.shift) {
      const updatedId = shiftModal.shift.id;

      // Update shift definition
      setShifts((prev) =>
        prev.map((s) =>
          s.id === updatedId
            ? { ...s, name: data.name, code: data.code, startTime: data.startTime, endTime: data.endTime, breakMinutes: data.breakMinutes, gracePeriodMinutes: data.gracePeriodMinutes, departments: data.departments, color: data.color, workHours: calcWorkHours(data.startTime, data.endTime, data.breakMinutes) }
            : s,
        ),
      );

      // Update shift assignments
      // 1. Remove all current assignments for this shift
      // 2. Remove any employee who is now assigned to this shift from their previous shift
      // 3. Add new assignments for this shift
      setShiftAssignments((prev) => {
        let updated = prev.filter((a) => a.shiftId !== updatedId);
        // Remove any existing assignments for employees being added to this shift
        updated = updated.filter((a) => !data.assignedEmployeeIds.includes(a.employeeId));
        // Add new assignments
        const newAssignments: ShiftAssignment[] = data.assignedEmployeeIds.map((empId, idx) => ({
          id: `${updatedId}-${empId}`,
          employeeId: empId,
          shiftId: updatedId,
          workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        }));
        return [...updated, ...newAssignments];
      });

      toast.success(`Shift "${data.name}" updated`);
    }
    setShiftModal(null);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Shifts & Schedule</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {stats.totalAssigned} employees across {shifts.length} shift type{shifts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.shiftCounts.map(({ shift, count }) => {
              const cls = getShiftBadgeClass(shift.id);
              return cls ? (
                <span key={shift.id} className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cls}`}>
                  {shift.code}: {count}
                </span>
              ) : (
                <span
                  key={shift.id}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: shift.color }}
                >
                  {shift.code}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'weekly' && <WeeklyTab shifts={shifts} shiftAssignments={shiftAssignments} />}
            {activeTab === 'roster' && <RosterTab shifts={shifts} shiftAssignments={shiftAssignments} />}
            {activeTab === 'shifts' && (
              <ShiftsSettingsTab
                shifts={shifts}
                shiftAssignments={shiftAssignments}
                onEdit={(shift) => setShiftModal({ mode: 'edit', shift })}
                onAdd={() => setShiftModal({ mode: 'add', shift: null })}
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
            allEmployees={employeesData}
            currentAssignments={shiftAssignments}
            onSave={handleSaveShift}
            onClose={() => setShiftModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}