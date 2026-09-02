import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LogIn,
  LogOut,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import {
  getLogsForMonth,
  getLogByDate,
  clockIn,
  clockOut,
  listOvertimeRequests,
  submitOvertimeRequest,
  listCorrectionRequests,
  submitCorrectionRequest,
} from '@/services/attendance';

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';
const ROWS_PER_PAGE = 15;

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const cardClass =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: EASE_OUT },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAYS_OF_WEEK[d.getDay()];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

// ─── Types (shape returned by services/attendance.ts) ─────────────────────────

type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave' | 'half_day';

interface AttendanceLog {
  id: string;
  log_date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number | null;
  overtime_hours: number | null;
  late_minutes: number | null;
  undertime_minutes: number | null;
  status: AttendanceStatus;
  source: string;
  is_corrected: boolean;
}

interface OvertimeRequest {
  id: string;
  request_date: string;
  ot_start: string;
  ot_end: string;
  ot_hours: number;
  ot_type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
}

interface CorrectionRequest {
  id: string;
  attendance_log_id: string | null;
  correction_type: 'time_in' | 'time_out' | 'both';
  original_value: string | null;
  corrected_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const statusStyles: Record<AttendanceStatus, { bg: string; text: string; label: string }> = {
  present:  { bg: 'bg-green-100 dark:bg-green-950',  text: 'text-green-700 dark:text-green-300',  label: 'Present' },
  late:     { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300',  label: 'Late' },
  absent:   { bg: 'bg-red-100 dark:bg-red-950',      text: 'text-red-700 dark:text-red-300',      label: 'Absent' },
  on_leave: { bg: 'bg-blue-100 dark:bg-blue-950',    text: 'text-blue-700 dark:text-blue-300',    label: 'On Leave' },
  half_day: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', label: 'Half Day' },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = statusStyles[status] ?? statusStyles.present;
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
}

const otStatusStyles: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
  approved: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300' },
  rejected: { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-700 dark:text-red-300' },
};

function RequestStatusBadge({ status }: { status: string }) {
  const s = otStatusStyles[status] ?? otStatusStyles['pending'];
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}>{status}</span>;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const otSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  otType: z.string().min(1, 'OT type is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
}).refine(
  (d) => {
    if (!d.startTime || !d.endTime) return true;
    const [sh, sm] = d.startTime.split(':').map(Number);
    const [eh, em] = d.endTime.split(':').map(Number);
    return (eh * 60 + em) > (sh * 60 + sm);
  },
  { message: 'End time must be after start time', path: ['endTime'] }
);

const correctionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  correctionType: z.enum(['time_in', 'time_out', 'both']),
  correctedTimeIn: z.string().optional(),
  correctedTimeOut: z.string().optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

type OTFormValues = z.infer<typeof otSchema>;
type CorrectionFormValues = z.infer<typeof correctionSchema>;

function calcOTHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em - (sh * 60 + sm)) / 60;
  return Math.max(0, Math.round(total * 100) / 100);
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────

function getMonthlySummary(logs: AttendanceLog[]) {
  return {
    present: logs.filter((l) => l.status === 'present' || l.status === 'late').length,
    late: logs.filter((l) => l.status === 'late').length,
    absent: logs.filter((l) => l.status === 'absent').length,
    onLeave: logs.filter((l) => l.status === 'on_leave').length,
    halfDay: logs.filter((l) => l.status === 'half_day').length,
    totalHours: Math.round(logs.reduce((s, l) => s + (l.hours_worked ?? 0), 0) * 100) / 100,
    totalOT: Math.round(logs.reduce((s, l) => s + (l.overtime_hours ?? 0), 0) * 100) / 100,
    totalLateMin: logs.reduce((s, l) => s + (l.late_minutes ?? 0), 0),
  };
}

function MonthlySummary({ logs, monthLabel }: { logs: AttendanceLog[]; monthLabel: string }) {
  const summary = getMonthlySummary(logs);
  const chips = [
    { label: 'Days Present',      value: summary.present,      color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
    { label: 'Days Late',         value: summary.late,         color: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
    { label: 'Days Absent',       value: summary.absent,       color: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
    { label: 'Total Work Hours',  value: `${summary.totalHours}h`, color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
    { label: 'Total OT Hours',    value: `${summary.totalOT}h`,   color: 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' },
    { label: 'Total Late (min)',  value: summary.totalLateMin,  color: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' },
  ];

  return (
    <motion.div {...fadeUp(0)} className={`${cardClass} mb-4`}>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Monthly Summary — {monthLabel}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {chips.map((c) => (
          <div key={c.label} className={`border rounded-xl px-3 py-2.5 ${c.color}`}>
            <p className="text-lg font-extrabold tabular-nums">{c.value}</p>
            <p className="text-[11px] font-medium mt-0.5 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Tab 1: Clock Widget ──────────────────────────────────────────────────────

function ClockTab({ employeeId, organizationId }: { employeeId: string; organizationId: string }) {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayIso());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: log } = useQuery({
    queryKey: ['attendance', 'log', employeeId, selectedDate],
    queryFn: () => getLogByDate(employeeId, selectedDate) as Promise<AttendanceLog | null>,
  });

  const clockedIn = !!log && !log.time_out;

  const clockInMutation = useMutation({
    mutationFn: () => clockIn(employeeId, organizationId, selectedDate, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Clocked in at ${formatTime(new Date().toISOString())}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => {
      if (!log?.time_in) throw new Error('No active clock-in to close.');
      return clockOut(log.id, log.time_in);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Clocked out at ${formatTime(new Date().toISOString())}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClock = useCallback(() => {
    if (selectedDate !== todayIso()) {
      toast.error('You can only clock in/out for today.');
      return;
    }
    if (!clockedIn) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Math.round(pos.coords.latitude * 100) / 100;
            const lng = Math.round(pos.coords.longitude * 100) / 100;
            setLocation({ lat, lng });
            setLocationLabel(`Captured — ${lat}, ${lng}`);
            clockInMutation.mutate();
          },
          () => {
            setLocationLabel('Location not available');
            clockInMutation.mutate();
          }
        );
      } else {
        clockInMutation.mutate();
      }
    } else {
      clockOutMutation.mutate();
    }
  }, [clockedIn, selectedDate, clockInMutation, clockOutMutation]);

  const liveTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const shortcuts = [
    { label: 'Today',     date: todayIso() },
    { label: 'Yesterday', date: getYesterday() },
  ];
  const weekDates = getWeekDates();

  const miniStats = [
    { label: 'Time In',  value: formatTime(log?.time_in ?? null) },
    { label: 'Time Out', value: formatTime(log?.time_out ?? null) },
    { label: 'Hours',    value: log?.hours_worked != null ? `${log.hours_worked}h` : '—' },
    { label: 'Status',   value: log ? statusStyles[log.status]?.label ?? log.status : '—' },
  ];

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(1)} className={cardClass}>
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDisplayDate(todayIso())}</p>
          <p className="text-5xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">{liveTime}</p>

          <button
            type="button"
            onClick={handleClock}
            disabled={clockInMutation.isPending || clockOutMutation.isPending || selectedDate !== todayIso()}
            className={[
              'w-full max-w-xs h-14 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60',
              clockedIn ? 'bg-red-500 hover:bg-red-600 active:scale-[0.98]' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]',
            ].join(' ')}
          >
            {clockedIn ? <LogOut size={20} /> : <LogIn size={20} />}
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {clockedIn && log?.time_in ? `Clocked in since ${formatTime(log.time_in)}` : 'Status: Not yet clocked in'}
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={15} className="text-emerald-600 shrink-0" />
            <span>{locationLabel ? `Location: ${locationLabel}` : 'Location: Will capture on clock in'}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {miniStats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp(2)} className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setSelectedDate(s.date)}
            className={[
              'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border',
              selectedDate === s.date ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-blue hover:text-brand-blue',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">This Week:</span>
        {weekDates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSelectedDate(d)}
            className={[
              'px-2 py-1 rounded-lg text-xs font-medium transition-colors border',
              selectedDate === d ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-blue',
            ].join(' ')}
          >
            {getDayName(d)} {new Date(d + 'T00:00:00').getDate()}
          </button>
        ))}
      </motion.div>

      <motion.div {...fadeUp(3)} className={cardClass}>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Attendance Record — {formatShortDate(selectedDate)}
        </p>
        {log ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-400 mb-1">Date</p><p className="font-semibold text-gray-900 dark:text-white">{formatShortDate(log.log_date)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Time In</p><p className="font-semibold text-gray-900 dark:text-white">{formatTime(log.time_in)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Time Out</p><p className="font-semibold text-gray-900 dark:text-white">{formatTime(log.time_out)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Work Hours</p><p className="font-semibold text-gray-900 dark:text-white">{log.hours_worked ?? 0}h</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Late (min)</p><p className="font-semibold text-gray-900 dark:text-white">{log.late_minutes ?? 0}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Status</p><StatusBadge status={log.status} /></div>
            <div><p className="text-xs text-gray-400 mb-1">Source</p><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">{log.source}</span></div>
            <div><p className="text-xs text-gray-400 mb-1">OT Hours</p><p className="font-semibold text-gray-900 dark:text-white">{log.overtime_hours ?? 0}h</p></div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <CalendarDays size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No attendance record for this date.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Tab 2: Calendar ──────────────────────────────────────────────────────────

const calendarDotColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-500', late: 'bg-amber-500', absent: 'bg-red-500', on_leave: 'bg-blue-500', half_day: 'bg-purple-500',
};

function CalendarTab({ employeeId }: { employeeId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const { data: monthLogs } = useQuery({
    queryKey: ['attendance', 'month', employeeId, yearMonth],
    queryFn: () => getLogsForMonth(employeeId, yearMonth) as Promise<AttendanceLog[]>,
  });
  const logs = monthLogs ?? [];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const logMap: Record<string, AttendanceLog> = {};
  logs.forEach((l) => { logMap[l.log_date] = l; });

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1);
    setSelected(null);
  }

  const summary = getMonthlySummary(logs);
  const selectedLog = selected ? logMap[selected] : null;
  const todayStr = todayIso();

  return (
    <motion.div {...fadeUp(1)} className="space-y-4">
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <button title="Previous month" type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-bold text-gray-900 dark:text-white">{MONTH_NAMES[month]} {year}</h3>
          <button title="Next month" type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logMap[dateStr];
            const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isSelected = selected === dateStr;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={[
                  'relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-medium transition-colors min-h-12',
                  isSelected ? 'bg-brand-blue text-white' :
                  isWeekend ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500' :
                  'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200',
                  isToday && !isSelected ? 'ring-2 ring-brand-blue ring-inset' : '',
                ].join(' ')}
              >
                {day}
                {log && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : calendarDotColors[log.status]}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{formatShortDate(selected)}</p>
          {selectedLog ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Time In</p><p className="font-semibold">{formatTime(selectedLog.time_in)}</p></div>
              <div><p className="text-xs text-gray-400">Time Out</p><p className="font-semibold">{formatTime(selectedLog.time_out)}</p></div>
              <div><p className="text-xs text-gray-400">Hours</p><p className="font-semibold">{selectedLog.hours_worked ?? 0}h</p></div>
              <div><p className="text-xs text-gray-400">Status</p><StatusBadge status={selectedLog.status} /></div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No attendance record for this date.</p>
          )}
        </motion.div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {(Object.entries(calendarDotColors) as [AttendanceStatus, string][]).map(([s, dot]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            {statusStyles[s].label}
          </span>
        ))}
      </div>

      <div className={cardClass}>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Month Summary</p>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-sm">
          {[
            { label: 'Present', value: summary.present, color: 'text-green-600' },
            { label: 'Late',    value: summary.late,    color: 'text-amber-600' },
            { label: 'Absent',  value: summary.absent,  color: 'text-red-600' },
            { label: 'On Leave', value: summary.onLeave, color: 'text-blue-600' },
            { label: 'Half Day', value: summary.halfDay, color: 'text-purple-600' },
            { label: 'Total Hrs', value: `${summary.totalHours}h`, color: 'text-indigo-600' },
            { label: 'Late Min', value: summary.totalLateMin, color: 'text-orange-600' },
          ].map((item) => (
            <div key={item.label} className="py-2">
              <p className={`text-lg font-extrabold ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tab 3: Time Logs ─────────────────────────────────────────────────────────

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

function TimeLogsTab({
  employeeId,
  onRequestCorrection,
}: {
  employeeId: string;
  onRequestCorrection: (date: string) => void;
}) {
  const options = monthOptions();
  const [monthFilter, setMonthFilter] = useState(options[0].value);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateSearch, setDateSearch] = useState('');
  const [page, setPage] = useState(1);
  const [otModalDate, setOtModalDate] = useState<string | null>(null);

  const { data: monthLogs, isLoading } = useQuery({
    queryKey: ['attendance', 'month', employeeId, monthFilter],
    queryFn: () => getLogsForMonth(employeeId, monthFilter) as Promise<AttendanceLog[]>,
  });
  const logs = monthLogs ?? [];

  const filtered = logs
    .filter((l) => statusFilter === 'all' || l.status === statusFilter)
    .filter((l) => !dateSearch || l.log_date.includes(dateSearch))
    .sort((a, b) => b.log_date.localeCompare(a.log_date));

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const monthTotals = {
    hours: Math.round(filtered.reduce((s, l) => s + (l.hours_worked ?? 0), 0) * 100) / 100,
    lateMin: filtered.reduce((s, l) => s + (l.late_minutes ?? 0), 0),
    otHours: Math.round(filtered.reduce((s, l) => s + (l.overtime_hours ?? 0), 0) * 100) / 100,
  };

  function exportCsv() {
    const header = 'Date,Day,Time In,Time Out,Hours,Late (min),OT Hours,Status,Source';
    const rows = filtered.map((l) =>
      [l.log_date, getDayName(l.log_date), formatTime(l.time_in), formatTime(l.time_out), l.hours_worked ?? 0, l.late_minutes ?? 0, l.overtime_hours ?? 0, l.status, l.source].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  return (
    <motion.div {...fadeUp(1)} className="space-y-4">
      {otModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${cardClass} w-full max-w-sm`}>
            <p className="font-bold text-gray-900 dark:text-white mb-2">File OT — {formatShortDate(otModalDate)}</p>
            <p className="text-sm text-gray-500 mb-4">Switch to the <strong>Overtime Requests</strong> tab to submit an overtime request for this date.</p>
            <button type="button" onClick={() => setOtModalDate(null)} className="w-full py-2 bg-brand-blue text-white rounded-xl font-semibold text-sm">Got it</button>
          </div>
        </div>
      )}

      <div className={`${cardClass} flex flex-wrap gap-3 items-end`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="month-filter">Month</label>
          <select
            id="month-filter"
            value={monthFilter}
            onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
          >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <option value="all">All</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="on_leave">On Leave</option>
            <option value="half_day">Half Day</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="date-search">Search Date</label>
          <input
            id="date-search"
            type="text"
            placeholder={`e.g. ${monthFilter}-10`}
            value={dateSearch}
            onChange={(e) => { setDateSearch(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 w-40"
          />
        </div>
        <div className="ml-auto">
          <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700">
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      <div className={`${cardClass} flex items-center justify-between flex-wrap gap-3`}>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''} this month
        </span>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Hours <strong className="text-gray-900 dark:text-white">{monthTotals.hours}h</strong></span>
          <span className="text-gray-500 dark:text-gray-400">Late <strong className="text-gray-900 dark:text-white">{monthTotals.lateMin}m</strong></span>
          <span className="text-gray-500 dark:text-gray-400">OT <strong className="text-gray-900 dark:text-white">{monthTotals.otHours}h</strong></span>
        </div>
      </div>

      {isLoading ? (
        <div className={`${cardClass} py-12 text-center text-gray-400`}>Loading…</div>
      ) : paged.length === 0 ? (
        <div className={`${cardClass} py-12 text-center text-gray-400 dark:text-gray-500`}>No records found.</div>
      ) : (
        <div className="space-y-3">
          {paged.map((l) => (
            <div key={l.id} className={cardClass}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatShortDate(l.log_date)}</p>
                  <p className="text-xs text-gray-400">{getDayName(l.log_date)} · {l.source}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                {[
                  { label: 'In', value: formatTime(l.time_in) },
                  { label: 'Out', value: formatTime(l.time_out) },
                  { label: 'Hours', value: l.hours_worked ?? '—' },
                  { label: 'OT', value: l.overtime_hours ?? '—' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => onRequestCorrection(l.log_date)}
                  className="flex-1 min-h-11 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                >
                  Correct
                </button>
                {(l.overtime_hours ?? 0) === 0 && (l.status === 'present' || l.status === 'late') && (
                  <button
                    type="button"
                    onClick={() => setOtModalDate(l.log_date)}
                    className="flex-1 min-h-11 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    File OT
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`${cardClass} flex items-center justify-between`}>
        <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="min-h-11 px-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Prev</button>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="min-h-11 px-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Next</button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tab 4: Overtime Requests ─────────────────────────────────────────────────

function OvertimeTab({ employeeId, organizationId }: { employeeId: string; organizationId: string }) {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['attendance', 'overtime', employeeId],
    queryFn: () => listOvertimeRequests(employeeId) as Promise<OvertimeRequest[]>,
  });

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<OTFormValues>({
    resolver: zodResolver(otSchema),
    defaultValues: { startTime: '17:00', otType: 'regular' },
  });

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const computedHours = startTime && endTime ? calcOTHours(startTime, endTime) : 0;

  async function onSubmit(data: OTFormValues) {
    try {
      await submitOvertimeRequest(employeeId, organizationId, {
        request_date: data.date,
        ot_start: `${data.date}T${data.startTime}:00`,
        ot_end: `${data.date}T${data.endTime}:00`,
        ot_hours: computedHours,
        ot_type: data.otType,
        reason: data.reason,
      });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overtime', employeeId] });
      toast.success('Overtime request submitted for approval');
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request');
    }
  }

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(1)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Submit OT Request</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-date">Date <span className="text-red-500">*</span></label>
              <input id="ot-date" type="date" {...register('date')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-type">OT Type <span className="text-red-500">*</span></label>
              <select id="ot-type" {...register('otType')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white">
                <option value="regular">Regular OT</option>
                <option value="rest_day">Rest Day</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-start">Start Time <span className="text-red-500">*</span></label>
              <input id="ot-start" type="time" {...register('startTime')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-end">End Time <span className="text-red-500">*</span></label>
              <input id="ot-end" type="time" {...register('endTime')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
            </div>
          </div>

          {computedHours > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5">
              <Clock size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{computedHours} hours OT computed</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-reason">Reason <span className="text-red-500">*</span></label>
            <textarea id="ot-reason" rows={3} {...register('reason')} placeholder="Describe the reason for overtime (min. 10 characters)..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none" />
            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
            Submit OT Request
          </button>
        </form>
      </motion.div>

      <motion.div {...fadeUp(2)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">My OT Request History</p>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
        ) : (requests ?? []).length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <Clock size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No overtime requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(requests ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatShortDate(r.request_date)} · {r.ot_hours}h</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.reason}</p>
                </div>
                <RequestStatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Tab 5: Correction Requests ───────────────────────────────────────────────

function CorrectionTab({
  employeeId,
  organizationId,
  prefillDate,
}: {
  employeeId: string;
  organizationId: string;
  prefillDate?: string;
}) {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['attendance', 'corrections', employeeId],
    queryFn: () => listCorrectionRequests(employeeId) as Promise<CorrectionRequest[]>,
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: { correctionType: 'time_in' },
  });

  useEffect(() => {
    if (prefillDate) setValue('date', prefillDate);
  }, [prefillDate, setValue]);

  const correctionType = watch('correctionType');
  const showTimeIn = correctionType === 'time_in' || correctionType === 'both';
  const showTimeOut = correctionType === 'time_out' || correctionType === 'both';

  async function onSubmit(data: CorrectionFormValues) {
    try {
      await submitCorrectionRequest(employeeId, organizationId, {
        attendance_log_id: null,
        correction_type: data.correctionType,
        corrected_value: data.correctedTimeIn ?? data.correctedTimeOut ?? '',
        reason: data.reason,
      });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'corrections', employeeId] });
      toast.success('Correction request submitted for review');
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request');
    }
  }

  const corrTypeLabel: Record<string, string> = { time_in: 'Time In', time_out: 'Time Out', both: 'Both' };

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(1)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Submit Correction Request</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-date">Date <span className="text-red-500">*</span></label>
              <input id="corr-date" type="date" {...register('date')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-type">Correction Type <span className="text-red-500">*</span></label>
              <select id="corr-type" {...register('correctionType')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white">
                <option value="time_in">Time In</option>
                <option value="time_out">Time Out</option>
                <option value="both">Both</option>
              </select>
            </div>
            {showTimeIn && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-time-in">Corrected Time In</label>
                <input id="corr-time-in" type="time" {...register('correctedTimeIn')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
            )}
            {showTimeOut && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-time-out">Corrected Time Out</label>
                <input id="corr-time-out" type="time" {...register('correctedTimeOut')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-reason">Reason <span className="text-red-500">*</span></label>
            <textarea id="corr-reason" rows={3} {...register('reason')} placeholder="Describe the reason for correction (min. 10 characters)..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none" />
            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
            Submit Correction
          </button>
        </form>
      </motion.div>

      <motion.div {...fadeUp(2)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">My Correction Request History</p>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
        ) : (requests ?? []).length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No correction requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(requests ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{corrTypeLabel[r.correction_type]} → {r.corrected_value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.reason}</p>
                </div>
                <RequestStatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const tabIcons: Record<string, React.ReactNode> = {
  daily: <Clock size={15} />,
  calendar: <CalendarDays size={15} />,
  logs: <CheckCircle2 size={15} />,
  overtime: <AlertCircle size={15} />,
  corrections: <XCircle size={15} />,
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [correctionPrefill, setCorrectionPrefill] = useState<string | undefined>();

  const currentYearMonth = todayIso().slice(0, 7);
  const { data: currentMonthLogs } = useQuery({
    queryKey: ['attendance', 'month', user?.id, currentYearMonth],
    queryFn: () => getLogsForMonth(user!.id, currentYearMonth) as Promise<AttendanceLog[]>,
    enabled: !!user?.id,
  });

  function handleRequestCorrection(date: string) {
    setCorrectionPrefill(date);
    setActiveTab('corrections');
  }

  if (!user) return null;

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(0)}>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Attendance &amp; Time</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your attendance, manage overtime and correction requests.</p>
      </motion.div>

      <MonthlySummary
        logs={currentMonthLogs ?? []}
        monthLabel={new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {[
            { value: 'daily', label: 'Clock In/Out' },
            { value: 'calendar', label: 'Calendar' },
            { value: 'logs', label: 'Time Logs' },
            { value: 'overtime', label: 'Overtime' },
            { value: 'corrections', label: 'Corrections' },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {tabIcons[t.value]}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="daily"><ClockTab employeeId={user.id} organizationId={user.organizationId} /></TabsContent>
        <TabsContent value="calendar"><CalendarTab employeeId={user.id} /></TabsContent>
        <TabsContent value="logs"><TimeLogsTab employeeId={user.id} onRequestCorrection={handleRequestCorrection} /></TabsContent>
        <TabsContent value="overtime"><OvertimeTab employeeId={user.id} organizationId={user.organizationId} /></TabsContent>
        <TabsContent value="corrections"><CorrectionTab employeeId={user.id} organizationId={user.organizationId} prefillDate={correctionPrefill} /></TabsContent>
      </Tabs>
    </div>
  );
}
