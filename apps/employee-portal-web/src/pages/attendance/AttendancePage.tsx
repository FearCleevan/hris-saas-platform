import { useState, useEffect, useCallback } from 'react';
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
import attendanceLogsRaw from '@/data/mock/attendance-logs.json';
import overtimeRequestsRaw from '@/data/mock/overtime-requests.json';
import correctionRequestsRaw from '@/data/mock/correction-requests.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'late' | 'absent' | 'on_leave' | 'half_day';

interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  workHours: number;
  lateMinutes: number;
  overtimeHours: number;
  status: AttendanceStatus;
  source: string;
}

interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  submittedAt: string;
}

interface CorrectionRequest {
  id: string;
  employeeId: string;
  date: string;
  type: 'time_in' | 'time_out' | 'both';
  original: string | null;
  requested: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = '2023-11-10';
const EASE_OUT: Easing = 'easeOut';
const ROWS_PER_PAGE = 15;

const attendanceLogs = attendanceLogsRaw as AttendanceLog[];
const overtimeRequests = overtimeRequestsRaw as OvertimeRequest[];
const correctionRequests = correctionRequestsRaw as CorrectionRequest[];

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

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAYS_OF_WEEK[d.getDay()];
}

function getLogByDate(date: string): AttendanceLog | undefined {
  return attendanceLogs.find((l) => l.date === date);
}

function getYesterday(): string {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(): string[] {
  const today = new Date(TODAY + 'T00:00:00');
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function calcOTHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em - (sh * 60 + sm)) / 60;
  return Math.max(0, Math.round(total * 100) / 100);
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

const statusStyles: Record<AttendanceStatus, { bg: string; text: string; label: string }> = {
  present:  { bg: 'bg-green-100 dark:bg-green-950',  text: 'text-green-700 dark:text-green-300',  label: 'Present' },
  late:     { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300',  label: 'Late' },
  absent:   { bg: 'bg-red-100 dark:bg-red-950',      text: 'text-red-700 dark:text-red-300',      label: 'Absent' },
  on_leave: { bg: 'bg-blue-100 dark:bg-blue-950',    text: 'text-blue-700 dark:text-blue-300',    label: 'On Leave' },
  half_day: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', label: 'Half Day' },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = statusStyles[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

const otStatusStyles: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
  approved: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300' },
  rejected: { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-700 dark:text-red-300' },
};

function RequestStatusBadge({ status }: { status: string }) {
  const s = otStatusStyles[status] ?? otStatusStyles['pending'];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}>
      {status}
    </span>
  );
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

// ─── Monthly Summary ──────────────────────────────────────────────────────────

function getMonthlySummary(yearMonth: string) {
  const logs = attendanceLogs.filter((l) => l.date.startsWith(yearMonth));
  return {
    present: logs.filter((l) => l.status === 'present' || l.status === 'late').length,
    late: logs.filter((l) => l.status === 'late').length,
    absent: logs.filter((l) => l.status === 'absent').length,
    onLeave: logs.filter((l) => l.status === 'on_leave').length,
    halfDay: logs.filter((l) => l.status === 'half_day').length,
    totalHours: Math.round(logs.reduce((s, l) => s + l.workHours, 0) * 100) / 100,
    totalOT: Math.round(logs.reduce((s, l) => s + l.overtimeHours, 0) * 100) / 100,
    totalLateMin: logs.reduce((s, l) => s + l.lateMinutes, 0),
  };
}

function MonthlySummary() {
  const summary = getMonthlySummary('2023-11');
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
        Monthly Summary — November 2023
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

function ClockTab() {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayLog = getLogByDate(selectedDate);

  const handleClock = useCallback(() => {
    const now = currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    if (!clockedIn) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Math.round(pos.coords.latitude * 100) / 100;
            const lng = Math.round(pos.coords.longitude * 100) / 100;
            setLocation(`Captured — ${lat}, ${lng}`);
          },
          () => {
            setLocation('Location not available');
          }
        );
      } else {
        setLocation('Location not available');
      }
      setClockedIn(true);
      setClockInTime(now);
      toast.success(`Clocked in at ${now}`);
    } else {
      setClockedIn(false);
      setClockInTime(null);
      toast.success(`Clocked out at ${now}`);
    }
  }, [clockedIn, currentTime]);

  const liveTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  const shortcuts = [
    { label: 'Today',     date: TODAY },
    { label: 'Yesterday', date: getYesterday() },
  ];

  const weekDates = getWeekDates();

  const miniStats = [
    { label: 'Time In',  value: todayLog?.timeIn ?? '—' },
    { label: 'Time Out', value: todayLog?.timeOut ?? '—' },
    { label: 'Hours',    value: todayLog ? `${todayLog.workHours}h` : '—' },
    { label: 'Status',   value: todayLog ? statusStyles[todayLog.status].label : '—' },
  ];

  return (
    <div className="space-y-4">
      {/* Clock Widget */}
      <motion.div {...fadeUp(1)} className={cardClass}>
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDisplayDate(TODAY)}</p>
          <p className="text-5xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
            {liveTime}
          </p>

          <button
            type="button"
            onClick={handleClock}
            className={[
              'w-full max-w-xs h-14 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-colors',
              clockedIn
                ? 'bg-red-500 hover:bg-red-600 active:scale-[0.98]'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]',
            ].join(' ')}
          >
            {clockedIn ? <LogOut size={20} /> : <LogIn size={20} />}
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {clockedIn && clockInTime
              ? `Clocked in since ${clockInTime}`
              : 'Status: Not yet clocked in'}
          </p>

          {/* GPS Row */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={15} className="text-emerald-600 shrink-0" />
            <span>
              {location
                ? `Location: ${location}`
                : 'Location: Will capture on clock in'}
            </span>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {miniStats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Date Shortcuts */}
      <motion.div {...fadeUp(2)} className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setSelectedDate(s.date)}
            className={[
              'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border',
              selectedDate === s.date
                ? 'bg-[#0038a8] text-white border-[#0038a8]'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#0038a8] hover:text-[#0038a8]',
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
              selectedDate === d
                ? 'bg-[#0038a8] text-white border-[#0038a8]'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#0038a8]',
            ].join(' ')}
          >
            {getDayName(d)} {new Date(d + 'T00:00:00').getDate()}
          </button>
        ))}
      </motion.div>

      {/* Attendance Record Card */}
      <motion.div {...fadeUp(3)} className={cardClass}>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Attendance Record — {formatShortDate(selectedDate)}
        </p>
        {todayLog ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatShortDate(todayLog.date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Time In</p>
              <p className="font-semibold text-gray-900 dark:text-white">{todayLog.timeIn ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Time Out</p>
              <p className="font-semibold text-gray-900 dark:text-white">{todayLog.timeOut ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Work Hours</p>
              <p className="font-semibold text-gray-900 dark:text-white">{todayLog.workHours}h</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Late (min)</p>
              <p className="font-semibold text-gray-900 dark:text-white">{todayLog.lateMinutes}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <StatusBadge status={todayLog.status} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Source</p>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                {todayLog.source}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">OT Hours</p>
              <p className="font-semibold text-gray-900 dark:text-white">{todayLog.overtimeHours}h</p>
            </div>
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
  present:  'bg-green-500',
  late:     'bg-amber-500',
  absent:   'bg-red-500',
  on_leave: 'bg-blue-500',
  half_day: 'bg-purple-500',
};

function CalendarTab() {
  const [year, setYear] = useState(2023);
  const [month, setMonth] = useState(10); // 0-indexed: 10 = November
  const [selected, setSelected] = useState<string | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const logMap: Record<string, AttendanceLog> = {};
  attendanceLogs.forEach((l) => {
    logMap[l.date] = l;
  });

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const monthLogs = attendanceLogs.filter((l) => {
    const d = new Date(l.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const summary = {
    present: monthLogs.filter((l) => l.status === 'present').length,
    late: monthLogs.filter((l) => l.status === 'late').length,
    absent: monthLogs.filter((l) => l.status === 'absent').length,
    onLeave: monthLogs.filter((l) => l.status === 'on_leave').length,
    halfDay: monthLogs.filter((l) => l.status === 'half_day').length,
    totalHours: Math.round(monthLogs.reduce((s, l) => s + l.workHours, 0) * 10) / 10,
    totalLateMin: monthLogs.reduce((s, l) => s + l.lateMinutes, 0),
  };

  const selectedLog = selected ? logMap[selected] : null;

  return (
    <motion.div {...fadeUp(1)} className="space-y-4">
      <div className={cardClass}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button title='Select' type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-bold text-gray-900 dark:text-white">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button title="Select" type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logMap[dateStr];
            const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isSelected = selected === dateStr;
            const isToday = dateStr === TODAY;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={[
                  'relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-medium transition-colors min-h-[48px]',
                  isSelected ? 'bg-[#0038a8] text-white' :
                  isWeekend ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500' :
                  'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200',
                  isToday && !isSelected ? 'ring-2 ring-[#0038a8] ring-inset' : '',
                ].join(' ')}
              >
                {day}
                {log && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : calendarDotColors[log.status]}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardClass}
        >
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {formatShortDate(selected)}
          </p>
          {selectedLog ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Time In</p><p className="font-semibold">{selectedLog.timeIn ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Time Out</p><p className="font-semibold">{selectedLog.timeOut ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Hours</p><p className="font-semibold">{selectedLog.workHours}h</p></div>
              <div><p className="text-xs text-gray-400">Status</p><StatusBadge status={selectedLog.status} /></div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No attendance record for this date.</p>
          )}
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {(Object.entries(calendarDotColors) as [AttendanceStatus, string][]).map(([s, dot]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            {statusStyles[s].label}
          </span>
        ))}
      </div>

      {/* Summary */}
      <div className={cardClass}>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Month Summary
        </p>
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

const MONTH_OPTIONS = [
  { value: '2023-11', label: 'November 2023' },
  { value: '2023-10', label: 'October 2023' },
  { value: '2023-09', label: 'September 2023' },
];

function TimeLogsTab({ onRequestCorrection }: { onRequestCorrection: (date: string) => void }) {
  const [monthFilter, setMonthFilter] = useState('2023-11');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateSearch, setDateSearch] = useState('');
  const [page, setPage] = useState(1);
  const [otModalDate, setOtModalDate] = useState<string | null>(null);

  const filtered = attendanceLogs
    .filter((l) => l.date.startsWith(monthFilter))
    .filter((l) => statusFilter === 'all' || l.status === statusFilter)
    .filter((l) => !dateSearch || l.date.includes(dateSearch))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const monthTotals = {
    hours: Math.round(filtered.reduce((s, l) => s + l.workHours, 0) * 100) / 100,
    lateMin: filtered.reduce((s, l) => s + l.lateMinutes, 0),
    otHours: Math.round(filtered.reduce((s, l) => s + l.overtimeHours, 0) * 100) / 100,
  };

  function exportCsv() {
    const header = 'Date,Day,Time In,Time Out,Hours,Late (min),OT Hours,Status,Source';
    const rows = filtered.map((l) =>
      [l.date, getDayName(l.date), l.timeIn ?? '', l.timeOut ?? '', l.workHours, l.lateMinutes, l.overtimeHours, l.status, l.source].join(',')
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
      {/* OT Modal */}
      {otModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${cardClass} w-full max-w-sm`}>
            <p className="font-bold text-gray-900 dark:text-white mb-2">File OT — {formatShortDate(otModalDate)}</p>
            <p className="text-sm text-gray-500 mb-4">Switch to the <strong>Overtime Requests</strong> tab to submit an overtime request for this date.</p>
            <button
              type="button"
              onClick={() => setOtModalDate(null)}
              className="w-full py-2 bg-[#0038a8] text-white rounded-xl font-semibold text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${cardClass} flex flex-wrap gap-3 items-end`}>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="month-filter">Month</label>
          <select
            id="month-filter"
            value={monthFilter}
            onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
          >
            {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            placeholder="e.g. 2023-11-10"
            value={dateSearch}
            onChange={(e) => { setDateSearch(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 w-40"
          />
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`${cardClass} p-0 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                {['Date', 'Day', 'Time In', 'Time Out', 'Hours', 'Late (min)', 'OT Hrs', 'Status', 'Source', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paged.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{l.date}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{getDayName(l.date)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{l.timeIn ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{l.timeOut ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{l.workHours || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{l.lateMinutes || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{l.overtimeHours || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize text-xs">{l.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-nowrap">
                      <button
                        type="button"
                        onClick={() => onRequestCorrection(l.date)}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 whitespace-nowrap"
                      >
                        Correct
                      </button>
                      {l.overtimeHours === 0 && (l.status === 'present' || l.status === 'late') && (
                        <button
                          type="button"
                          onClick={() => setOtModalDate(l.date)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 whitespace-nowrap"
                        >
                          File OT
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Monthly Totals ({filtered.length} records)
                </td>
                <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{monthTotals.hours}h</td>
                <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{monthTotals.lateMin}</td>
                <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{monthTotals.otHours}h</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tab 4: Overtime Requests ─────────────────────────────────────────────────

function OvertimeTab() {
  const [requests, setRequests] = useState<OvertimeRequest[]>(overtimeRequests);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OTFormValues>({
    resolver: zodResolver(otSchema),
    defaultValues: { startTime: '17:00', otType: 'regular' },
  });

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const computedHours = startTime && endTime ? calcOTHours(startTime, endTime) : 0;

  function onSubmit(data: OTFormValues) {
    const newReq: OvertimeRequest = {
      id: `ot${Date.now()}`,
      employeeId: 'emp001',
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      hours: computedHours,
      reason: data.reason,
      type: data.otType,
      status: 'pending',
      approvedBy: null,
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
    toast.success('Overtime request submitted for approval');
    reset();
  }

  return (
    <div className="space-y-4">
      {/* Form */}
      <motion.div {...fadeUp(1)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Submit OT Request</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-date">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="ot-date"
                type="date"
                {...register('date')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-type">
                OT Type <span className="text-red-500">*</span>
              </label>
              <select
                id="ot-type"
                {...register('otType')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="regular">Regular OT</option>
                <option value="rest_day">Rest Day</option>
                <option value="holiday">Holiday</option>
              </select>
              {errors.otType && <p className="text-xs text-red-500 mt-1">{errors.otType.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-start">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                id="ot-start"
                type="time"
                {...register('startTime')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-end">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                id="ot-end"
                type="time"
                {...register('endTime')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime.message}</p>}
            </div>
          </div>

          {computedHours > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5">
              <Clock size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {computedHours} hours OT computed
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="ot-reason">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="ot-reason"
              rows={3}
              {...register('reason')}
              placeholder="Describe the reason for overtime (min. 10 characters)..."
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
            />
            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0038a8] hover:bg-[#002d8a] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            Submit OT Request
          </button>
        </form>
      </motion.div>

      {/* History */}
      <motion.div {...fadeUp(2)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">My OT Request History</p>
        {requests.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <Clock size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No overtime requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Date', 'Hours', 'Type', 'Reason', 'Status', 'Submitted'].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.date}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{r.hours}h</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 capitalize text-xs">{r.type.replace('_', ' ')}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 pr-4"><RequestStatusBadge status={r.status} /></td>
                    <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(r.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Tab 5: Correction Requests ───────────────────────────────────────────────

function CorrectionTab({ prefillDate }: { prefillDate?: string }) {
  const [requests, setRequests] = useState<CorrectionRequest[]>(correctionRequests);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: { correctionType: 'time_in' },
  });

  useEffect(() => {
    if (prefillDate) {
      setValue('date', prefillDate);
    }
  }, [prefillDate, setValue]);

  const correctionType = watch('correctionType');
  const showTimeIn = correctionType === 'time_in' || correctionType === 'both';
  const showTimeOut = correctionType === 'time_out' || correctionType === 'both';

  function onSubmit(data: CorrectionFormValues) {
    const newReq: CorrectionRequest = {
      id: `cr${Date.now()}`,
      employeeId: 'emp001',
      date: data.date,
      type: data.correctionType,
      original: null,
      requested: data.correctedTimeIn ?? data.correctedTimeOut ?? '',
      reason: data.reason,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => [newReq, ...prev]);
    toast.success('Correction request submitted for review');
    reset();
  }

  const corrTypeLabel: Record<string, string> = {
    time_in: 'Time In',
    time_out: 'Time Out',
    both: 'Both',
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <motion.div {...fadeUp(1)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Submit Correction Request</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-date">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="corr-date"
                type="date"
                {...register('date')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-type">
                Correction Type <span className="text-red-500">*</span>
              </label>
              <select
                id="corr-type"
                {...register('correctionType')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="time_in">Time In</option>
                <option value="time_out">Time Out</option>
                <option value="both">Both</option>
              </select>
            </div>

            {showTimeIn && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-time-in">
                  Corrected Time In
                </label>
                <input
                  id="corr-time-in"
                  type="time"
                  {...register('correctedTimeIn')}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            )}

            {showTimeOut && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-time-out">
                  Corrected Time Out
                </label>
                <input
                  id="corr-time-out"
                  type="time"
                  {...register('correctedTimeOut')}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="corr-reason">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="corr-reason"
              rows={3}
              {...register('reason')}
              placeholder="Describe the reason for correction (min. 10 characters)..."
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
            />
            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0038a8] hover:bg-[#002d8a] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            Submit Correction
          </button>
        </form>
      </motion.div>

      {/* History */}
      <motion.div {...fadeUp(2)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">My Correction Request History</p>
        {requests.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No correction requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Date', 'Type', 'Original', 'Requested', 'Reason', 'Status'].map((h) => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.date}</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 text-xs">{corrTypeLabel[r.type] ?? r.type}</td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{r.original ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 font-medium">{r.requested}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 pr-4"><RequestStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Page Icons for tabs ──────────────────────────────────────────────────────

const tabIcons: Record<string, React.ReactNode> = {
  daily:       <Clock size={15} />,
  calendar:    <CalendarDays size={15} />,
  logs:        <CheckCircle2 size={15} />,
  overtime:    <AlertCircle size={15} />,
  corrections: <XCircle size={15} />,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [correctionPrefill, setCorrectionPrefill] = useState<string | undefined>();

  function handleRequestCorrection(date: string) {
    setCorrectionPrefill(date);
    setActiveTab('corrections');
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Attendance &amp; Time</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Track your attendance, manage overtime and correction requests.
        </p>
      </motion.div>

      {/* Monthly Summary (pinned above tabs) */}
      <MonthlySummary />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {[
            { value: 'daily',       label: 'Clock In/Out' },
            { value: 'calendar',    label: 'Calendar' },
            { value: 'logs',        label: 'Time Logs' },
            { value: 'overtime',    label: 'Overtime' },
            { value: 'corrections', label: 'Corrections' },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {tabIcons[t.value]}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="daily">
          <ClockTab />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab />
        </TabsContent>

        <TabsContent value="logs">
          <TimeLogsTab onRequestCorrection={handleRequestCorrection} />
        </TabsContent>

        <TabsContent value="overtime">
          <OvertimeTab />
        </TabsContent>

        <TabsContent value="corrections">
          <CorrectionTab prefillDate={correctionPrefill} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
