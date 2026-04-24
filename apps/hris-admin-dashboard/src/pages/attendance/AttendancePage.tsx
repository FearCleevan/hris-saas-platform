import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CalendarDays, BarChart2, Layers, Globe2,
  CheckCircle2, XCircle, Timer, AlertCircle, Coffee,
  ChevronLeft, ChevronRight, ChevronDown,
  Check, X, Plus, Search, UserPlus, UserMinus,
} from 'lucide-react';
import { format, parseISO, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { toast } from 'sonner';
import attendanceLogs from '@/data/mock/attendance-logs.json';
import employeesData from '@/data/mock/employees.json';
import overtimeRequestsData from '@/data/mock/overtime-requests.json';
import shiftsData from '@/data/mock/shifts.json';
import shiftAssignmentsData from '@/data/mock/shift-assignments.json';
import holidaysData from '@/data/mock/ph-holidays.json';

type TabId = 'daily' | 'calendar' | 'reports' | 'overtime' | 'shifts' | 'holidays';

/* ─── Shift Types ─── */
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
  id: string;
  employeeId: string;
  shiftId: string;
  workDays: string[];
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

const STATUS_CFG = {
  present:  { label: 'Present',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  late:     { label: 'Late',     color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  absent:   { label: 'Absent',   color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  on_leave: { label: 'On Leave', color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  half_day: { label: 'Half Day', color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
};

const OT_STATUS_CFG = {
  pending:  { label: 'Pending',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
};

const HOLIDAY_TYPE_CFG = {
  regular:             { label: 'Regular Holiday',       color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/30' },
  special_non_working: { label: 'Special Non-Working',   color: 'text-amber-600 dark:text-amber-400',bg: 'bg-amber-50 dark:bg-amber-950/30' },
  special_working:     { label: 'Special Working',       color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-950/30' },
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'daily',    label: 'Daily',    icon: Clock },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'reports',  label: 'Reports',  icon: BarChart2 },
  { id: 'overtime', label: 'Overtime', icon: Timer },
  { id: 'shifts',   label: 'Shifts',   icon: Layers },
  { id: 'holidays', label: 'Holidays', icon: Globe2 },
];

const ALL_DATES = [...new Set(attendanceLogs.map((l) => l.date))].sort();

const COLOR_PALETTE = [
  '#0038a8', '#1d4ed8', '#7c3aed', '#6366f1',
  '#0891b2', '#059669', '#ca8a04', '#f97316',
  '#dc2626', '#ce1126', '#db2777', '#64748b',
];

const ALL_DEPARTMENTS = [...new Set(employeesData.map((e) => e.department))].sort();

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
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

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.present;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function KpiCard({
  label, value, icon: Icon, color,
}: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
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

  const assignedEmployees = useMemo(
    () => allEmployees.filter((e) => form.assignedEmployeeIds.includes(e.id)),
    [allEmployees, form.assignedEmployeeIds],
  );

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

/* ─── Daily Tab ─── */
function DailyTab({
  selectedDate, setSelectedDate,
}: { selectedDate: string; setSelectedDate: (d: string) => void }) {
  const logs = useMemo(() => attendanceLogs.filter((l) => l.date === selectedDate), [selectedDate]);

  const kpis = useMemo(() => ({
    present: logs.filter((l) => l.status === 'present').length,
    late:    logs.filter((l) => l.status === 'late').length,
    absent:  logs.filter((l) => l.status === 'absent').length,
    onLeave: logs.filter((l) => l.status === 'on_leave').length,
    halfDay: logs.filter((l) => l.status === 'half_day').length,
  }), [logs]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            title="Select date"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0038a8]/40 focus:border-[#0038a8] transition-colors"
          >
            {ALL_DATES.map((d) => (
              <option key={d} value={d}>{format(parseISO(d), 'EEEE, MMMM d, yyyy')}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <span className="text-xs text-gray-400">{logs.length} employees tracked</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Present"  value={kpis.present}  icon={CheckCircle2} color="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" />
        <KpiCard label="Late"     value={kpis.late}     icon={Clock}        color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" />
        <KpiCard label="Absent"   value={kpis.absent}   icon={XCircle}      color="bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400" />
        <KpiCard label="On Leave" value={kpis.onLeave}  icon={Coffee}       color="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" />
        <KpiCard label="Half Day" value={kpis.halfDay}  icon={AlertCircle}  color="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Dept</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Time In</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Time Out</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Late</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Hours</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const emp = employeesData.find((e) => e.id === log.employeeId);
                if (!emp) return null;
                return (
                  <tr
                    key={log.id}
                    className={`${i < logs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/80' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-gray-400">{emp.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{emp.department}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{log.timeIn || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{log.timeOut || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {log.lateMinutes > 0 ? (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{log.lateMinutes}m</span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-gray-700 dark:text-gray-300">{log.workHours}h</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={log.status} />
                    </td>
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

/* ─── Calendar Tab ─── */
function CalendarTab({
  setSelectedDate, setActiveTab,
}: { setSelectedDate: (d: string) => void; setActiveTab: (t: TabId) => void }) {
  const [viewMonth, setViewMonth] = useState(new Date(2023, 9, 1));

  const dateMap = useMemo(() => {
    const map: Record<string, { present: number; late: number; halfDay: number; total: number }> = {};
    for (const log of attendanceLogs) {
      if (!map[log.date]) map[log.date] = { present: 0, late: 0, halfDay: 0, total: 0 };
      map[log.date].total++;
      if (log.status === 'present')  map[log.date].present++;
      if (log.status === 'late')     map[log.date].late++;
      if (log.status === 'half_day') map[log.date].halfDay++;
    }
    return map;
  }, []);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDayOfWeek = getDay(startOfMonth(viewMonth));

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canGoPrev = viewMonth > new Date(2023, 9, 1);
  const canGoNext = viewMonth < new Date(2023, 10, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          title='Year'
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h2 className="text-base font-bold text-gray-800 dark:text-white">{format(viewMonth, 'MMMM yyyy')}</h2>
        <button
          title='Month'
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          disabled={!canGoNext}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />≥90% present</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />70–89%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />&lt;70%</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ce1126] inline-block" />Holiday</span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isWeekendDay = idx % 7 === 0 || idx % 7 === 6;
          const data = dateMap[dateStr];
          const holiday = holidaysData.find((h) => h.date === dateStr);

          let cellBg = 'bg-gray-50 dark:bg-gray-800/40';
          let pct = 0;
          if (data && !isWeekendDay) {
            pct = Math.round(((data.present + data.late + data.halfDay) / data.total) * 100);
            cellBg = pct >= 90 ? 'bg-green-100 dark:bg-green-950/30' : pct >= 70 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-red-100 dark:bg-red-950/30';
          }

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (data && !isWeekendDay) {
                  setSelectedDate(dateStr);
                  setActiveTab('daily');
                }
              }}
              disabled={!data || isWeekendDay}
              title={data && !isWeekendDay ? `${pct}% attendance — click to view` : undefined}
              className={`rounded-lg p-1.5 text-center transition-all ${
                data && !isWeekendDay ? 'cursor-pointer hover:ring-2 hover:ring-[#0038a8]/30' : 'cursor-default opacity-40'
              } ${cellBg}`}
            >
              <span className={`text-xs font-medium block ${isWeekendDay ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                {day}
              </span>
              {holiday && <span className="w-1.5 h-1.5 bg-[#ce1126] rounded-full mx-auto mt-0.5 block" />}
              {data && !isWeekendDay && (
                <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight block">{pct}%</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">Click a working day to view daily attendance</p>
    </div>
  );
}

/* ─── Reports Tab ─── */
function ReportsTab() {
  const { topLate, topAbsent, totals } = useMemo(() => {
    const lateMap: Record<string, number> = {};
    const absentMap: Record<string, number> = {};
    const totals = { present: 0, late: 0, absent: 0, on_leave: 0, half_day: 0 };

    for (const log of attendanceLogs) {
      if (log.status === 'late')    { lateMap[log.employeeId] = (lateMap[log.employeeId] || 0) + log.lateMinutes; }
      if (log.status === 'absent')  { absentMap[log.employeeId] = (absentMap[log.employeeId] || 0) + 1; }
      if (log.status in totals)     { totals[log.status as keyof typeof totals]++; }
    }

    const topLate = Object.entries(lateMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, mins]) => ({ emp: employeesData.find((e) => e.id === id)!, mins }))
      .filter((r) => r.emp);

    const topAbsent = Object.entries(absentMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, count]) => ({ emp: employeesData.find((e) => e.id === id)!, count }))
      .filter((r) => r.emp);

    return { topLate, topAbsent, totals };
  }, []);

  const maxLate   = topLate[0]?.mins ?? 1;
  const maxAbsent = topAbsent[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Top 10 — Most Late (Total Minutes)</h3>
          <div className="flex flex-col gap-2.5">
            {topLate.map(({ emp, mins }, i) => (
              <div key={emp.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {getInitials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{emp.name}</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-2 shrink-0">{mins}m</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(mins / maxLate) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Top 10 — Most Absent (Days)</h3>
          <div className="flex flex-col gap-2.5">
            {topAbsent.map(({ emp, count }, i) => (
              <div key={emp.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {getInitials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{emp.name}</span>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 ml-2 shrink-0">{count}d</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(count / maxAbsent) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Period Summary — Oct 2 to Nov 10, 2023</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.entries(totals) as [keyof typeof totals, number][]).map(([s, count]) => {
            const cfg = STATUS_CFG[s];
            const pct = ((count / attendanceLogs.length) * 100).toFixed(1);
            return (
              <div key={s} className={`rounded-xl p-3 border ${cfg.bg}`}>
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className={`text-xs font-medium ${cfg.color} opacity-80`}>{cfg.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{pct}% of records</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Overtime Tab ─── */
function OvertimeTab() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [statuses, setStatuses] = useState<Record<string, string>>(
    () => Object.fromEntries(overtimeRequestsData.map((r) => [r.id, r.status])),
  );

  const filtered = useMemo(
    () => overtimeRequestsData.filter((r) => filter === 'all' || statuses[r.id] === filter),
    [filter, statuses],
  );

  const approve = (id: string) => {
    setStatuses((p) => ({ ...p, [id]: 'approved' }));
    toast.success('Overtime request approved');
  };

  const reject = (id: string) => {
    setStatuses((p) => ({ ...p, [id]: 'rejected' }));
    toast.error('Overtime request rejected');
  };

  const pendingCount = Object.values(statuses).filter((s) => s === 'pending').length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              filter === f
                ? 'bg-[#0038a8] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f}{f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">No overtime requests</div>
        )}
        {filtered.map((req, i) => {
          const emp = employeesData.find((e) => e.id === req.employeeId);
          if (!emp) return null;
          const currentStatus = statuses[req.id];
          const stCfg = OT_STATUS_CFG[currentStatus as keyof typeof OT_STATUS_CFG] ?? OT_STATUS_CFG.pending;
          const approver = req.approvedBy ? employeesData.find((e) => e.id === req.approvedBy!) : null;

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{emp.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>
                      {stCfg.label}
                    </span>
                    {req.type === 'restday' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
                        Rest Day
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{emp.position} · {emp.department}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{format(parseISO(req.date), 'MMM d, yyyy')} · {req.startTime}–{req.endTime}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{req.hours}h OT</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">"{req.reason}"</p>
                  {approver && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {currentStatus === 'approved' ? 'Approved' : 'Reviewed'} by {approver.name}
                      {req.approvedAt ? ` · ${format(new Date(req.approvedAt), 'MMM d, yyyy h:mm a')}` : ''}
                    </p>
                  )}
                  {req.remarks && (
                    <p className="text-[10px] text-[#ce1126] mt-1">Note: {req.remarks}</p>
                  )}
                </div>
                {currentStatus === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approve(req.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                    >
                      <Check className="w-3 h-3" />Approve
                    </button>
                    <button
                      onClick={() => reject(req.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-[#ce1126] border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-colors"
                    >
                      <X className="w-3 h-3" />Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shifts Tab ─── */
function ShiftsTab({
  shifts, onEdit, onAdd,
}: {
  shifts: ShiftDef[];
  onEdit: (shift: ShiftDef) => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shifts.map((shift, i) => (
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
              <span key={dept} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {dept}
              </span>
            )) : (
              <span className="text-[10px] text-gray-400 italic">No departments specified</span>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400">{shift.workHours}h/day</span>
            <button
              type="button"
              onClick={() => onEdit(shift)}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#0038a8] hover:underline"
            >
              Edit Shift
            </button>
          </div>
        </motion.div>
      ))}

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
  );
}

/* ─── Holidays Tab ─── */
function HolidaysTab() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">Philippine Holidays 2023</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {holidaysData.length} holidays · Per Proclamation No. 90 & RA 9849
        </p>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
        {holidaysData.map((h) => {
          const typeCfg = HOLIDAY_TYPE_CFG[h.type as keyof typeof HOLIDAY_TYPE_CFG] ?? HOLIDAY_TYPE_CFG.regular;
          const isPast = new Date(h.date) < new Date('2023-10-02');
          return (
            <div key={h.id} className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${isPast ? 'opacity-40' : ''}`}>
              <div className="w-12 shrink-0 text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{format(parseISO(h.date), 'MMM')}</p>
                <p className="text-xl font-extrabold text-[#0038a8] leading-tight">{format(parseISO(h.date), 'd')}</p>
                <p className="text-[9px] text-gray-400">{format(parseISO(h.date), 'EEE')}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{h.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{h.description}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${typeCfg.bg} ${typeCfg.color} shrink-0 hidden sm:block`}>
                {typeCfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('daily');
  const [selectedDate, setSelectedDate] = useState('2023-11-10');
  const [shifts, setShifts] = useState<ShiftDef[]>(shiftsData as ShiftDef[]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>(() =>
    shiftAssignmentsData.map(({ employeeId, shiftId, workDays }) => ({
      id: `${shiftId}-${employeeId}`,
      employeeId,
      shiftId,
      workDays,
    })),
  );
  const [shiftModal, setShiftModal] = useState<{ mode: 'add' | 'edit'; shift: ShiftDef | null } | null>(null);

  const pendingOT = useMemo(
    () => overtimeRequestsData.filter((r) => r.status === 'pending').length,
    [],
  );

  const todayKpis = useMemo(() => {
    const logs = attendanceLogs.filter((l) => l.date === selectedDate);
    if (!logs.length) return null;
    const attended = logs.filter((l) => l.status === 'present' || l.status === 'late').length;
    return { pct: Math.round((attended / logs.length) * 100), total: logs.length };
  }, [selectedDate]);

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

      setShifts((prev) =>
        prev.map((s) =>
          s.id === updatedId
            ? { ...s, name: data.name, code: data.code, startTime: data.startTime, endTime: data.endTime, breakMinutes: data.breakMinutes, gracePeriodMinutes: data.gracePeriodMinutes, departments: data.departments, color: data.color, workHours: calcWorkHours(data.startTime, data.endTime, data.breakMinutes) }
            : s,
        ),
      );

      setShiftAssignments((prev) => {
        let updated = prev.filter((a) => a.shiftId !== updatedId);
        updated = updated.filter((a) => !data.assignedEmployeeIds.includes(a.employeeId));
        const newAssignments: ShiftAssignment[] = data.assignedEmployeeIds.map((empId) => ({
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track daily attendance, overtime, and shift schedules
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {todayKpis && (
            <span>
              <span className="font-bold text-[#0038a8]">{todayKpis.pct}%</span> attendance on selected date
            </span>
          )}
          {pendingOT > 0 && (
            <button
              onClick={() => setActiveTab('overtime')}
              className="ml-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
            >
              {pendingOT} OT pending
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
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
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'daily'    && <DailyTab selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
          {activeTab === 'calendar' && <CalendarTab setSelectedDate={setSelectedDate} setActiveTab={setActiveTab} />}
          {activeTab === 'reports'  && <ReportsTab />}
          {activeTab === 'overtime' && <OvertimeTab />}
          {activeTab === 'shifts'   && (
            <ShiftsTab
              shifts={shifts}
              onEdit={(shift) => setShiftModal({ mode: 'edit', shift })}
              onAdd={() => setShiftModal({ mode: 'add', shift: null })}
            />
          )}
          {activeTab === 'holidays' && <HolidaysTab />}
        </motion.div>
      </AnimatePresence>

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
    </motion.div>
  );
}