import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CalendarDays, BarChart2, Globe2,
  CheckCircle2, XCircle, Timer, AlertCircle, Coffee,
  ChevronLeft, ChevronRight,
  Check, X,
  Loader2, MapPin,
} from 'lucide-react';
import { format, parseISO, getDaysInMonth, startOfMonth, startOfWeek, getDay } from 'date-fns';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  useAttendanceLogs,
  useMonthlyAttendanceSummary,
  useAttendanceLogsForReports,
  useOvertimeRequests,
  useApproveOvertimeRequest,
  useRejectOvertimeRequest,
  useHolidays,
} from '@/hooks/useAttendance';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'daily' | 'calendar' | 'reports' | 'overtime' | 'holidays';

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_CFG = {
  present:        { label: 'Present',        color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  late:           { label: 'Late',           color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  absent:         { label: 'Absent',         color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  on_leave:       { label: 'On Leave',       color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  half_day:       { label: 'Half Day',       color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  holiday:        { label: 'Holiday',        color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' },
  rest_day:       { label: 'Rest Day',       color: 'text-gray-600 dark:text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' },
  work_from_home: { label: 'Work From Home', color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800' },
};

const OT_STATUS_CFG = {
  pending:   { label: 'Pending',   color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved:  { label: 'Approved',  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  rejected:  { label: 'Rejected',  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' },
};

const HOLIDAY_TYPE_CFG = {
  regular_holiday:     { label: 'Regular Holiday',     color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/30' },
  special_non_working: { label: 'Special Non-Working', color: 'text-amber-600 dark:text-amber-400',bg: 'bg-amber-50 dark:bg-amber-950/30' },
  special_working:     { label: 'Special Working',     color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-950/30' },
  company:             { label: 'Company Holiday',     color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'daily',    label: 'Daily',    icon: Clock },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'reports',  label: 'Reports',  icon: BarChart2 },
  { id: 'overtime', label: 'Overtime', icon: Timer },
  { id: 'holidays', label: 'Holidays', icon: Globe2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.present;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
      </td>
    </tr>
  );
}

// ── Daily Tab ─────────────────────────────────────────────────────────────────

function DailyTab({
  selectedDate, setSelectedDate,
}: { selectedDate: string; setSelectedDate: (d: string) => void }) {
  const { data: logs = [], isLoading } = useAttendanceLogs(selectedDate);

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
          <input
            type="date"
            aria-label="Select date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          />
        </div>
        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          : <span className="text-xs text-gray-400">{logs.length} employees tracked</span>
        }
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden lg:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRow cols={8} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No attendance records for {selectedDate}.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`${i < logs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/80' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {getInitials(log.employeeName)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                            {log.employeeName}
                            {log.isCorrected && (
                              <span className="ml-1 text-[9px] text-amber-600 dark:text-amber-400 font-medium">[Corrected]</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400">{log.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{log.department}</span>
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
                      <span className="text-xs text-gray-700 dark:text-gray-300">{log.workHours > 0 ? `${log.workHours}h` : '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{log.source}</span>
                        {(log.locationLat || log.locationLng) && (
                          <span title={`${log.locationLat}, ${log.locationLng}`}>
                            <MapPin className="w-3 h-3 text-green-500 shrink-0" aria-label={`Location ${log.locationLat}, ${log.locationLng}`} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab({
  setSelectedDate, setActiveTab,
}: { setSelectedDate: (d: string) => void; setActiveTab: (t: TabId) => void }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const { data: dateMap = {}, isLoading } = useMonthlyAttendanceSummary(year, month);
  const { data: holidays = [] } = useHolidays(year);

  const daysInMonth    = getDaysInMonth(viewMonth);
  const firstDayOfWeek = getDay(startOfMonth(viewMonth));

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          title="Previous month"
          aria-label="Previous month"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">{format(viewMonth, 'MMMM yyyy')}</h2>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <button
          type="button"
          title="Next month"
          aria-label="Next month"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />≥90% present</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />70–89%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />&lt;70%</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-red inline-block" />Holiday</span>
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
          const holiday = holidays.find((h) => h.date === dateStr);

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
                data && !isWeekendDay ? 'cursor-pointer hover:ring-2 hover:ring-brand-blue/30' : 'cursor-default opacity-40'
              } ${cellBg}`}
            >
              <span className={`text-xs font-medium block ${isWeekendDay ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                {day}
              </span>
              {holiday && <span className="w-1.5 h-1.5 bg-brand-red rounded-full mx-auto mt-0.5 block" />}
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

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate   = now.toISOString().slice(0, 10);

  const { data: logs = [], isLoading } = useAttendanceLogsForReports(startDate, endDate);

  const { topLate, topAbsent, totals } = useMemo(() => {
    const lateMap:   Record<string, { name: string; mins: number }> = {};
    const absentMap: Record<string, { name: string; count: number }> = {};
    const totals = { present: 0, late: 0, absent: 0, on_leave: 0, half_day: 0 };

    for (const log of logs) {
      if (log.status === 'late') {
        if (!lateMap[log.employeeId]) lateMap[log.employeeId] = { name: log.employeeName, mins: 0 };
        lateMap[log.employeeId].mins += log.lateMinutes;
      }
      if (log.status === 'absent') {
        if (!absentMap[log.employeeId]) absentMap[log.employeeId] = { name: log.employeeName, count: 0 };
        absentMap[log.employeeId].count++;
      }
      if (log.status in totals) totals[log.status as keyof typeof totals]++;
    }

    const topLate = Object.entries(lateMap)
      .sort((a, b) => b[1].mins - a[1].mins).slice(0, 10)
      .map(([id, v]) => ({ empId: id, name: v.name, mins: v.mins }));

    const topAbsent = Object.entries(absentMap)
      .sort((a, b) => b[1].count - a[1].count).slice(0, 10)
      .map(([id, v]) => ({ empId: id, name: v.name, count: v.count }));

    return { topLate, topAbsent, totals };
  }, [logs]);

  const maxLate   = topLate[0]?.mins ?? 1;
  const maxAbsent = topAbsent[0]?.count ?? 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Top 10 — Most Late (Total Minutes)</h3>
          <div className="flex flex-col gap-2.5">
            {topLate.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No late records this period.</p>}
            {topLate.map(({ empId, name, mins }, i) => (
              <div key={empId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{name}</span>
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

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Top 10 — Most Absent (Days)</h3>
          <div className="flex flex-col gap-2.5">
            {topAbsent.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No absent records this period.</p>}
            {topAbsent.map(({ empId, name, count }, i) => (
              <div key={empId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{name}</span>
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

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">
          Month-to-Date Summary — {format(new Date(startDate), 'MMM d')} to {format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.entries(totals) as [keyof typeof totals, number][]).map(([s, count]) => {
            const cfg = STATUS_CFG[s];
            const pct = logs.length > 0 ? ((count / logs.length) * 100).toFixed(1) : '0.0';
            return (
              <div key={s} className={`rounded-xl p-3 border ${cfg.bg}`}>
                <p className={`text-xl sm:text-2xl font-bold ${cfg.color}`}>{count}</p>
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

// ── Overtime Tab ──────────────────────────────────────────────────────────────

function OvertimeTab() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: requests = [], isLoading } = useOvertimeRequests();
  const approve = useApproveOvertimeRequest();
  const reject  = useRejectOvertimeRequest();

  const filtered = useMemo(
    () => requests.filter((r) => filter === 'all' || r.status === filter),
    [requests, filter],
  );

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const handleApprove = async (id: string) => {
    await approve.mutateAsync({ id });
    toast.success('Overtime request approved');
  };

  const handleReject = async (id: string) => {
    await reject.mutateAsync({ id });
    toast.error('Overtime request rejected');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              filter === f
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>

      <div className="flex flex-col gap-3">
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">No overtime requests</div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        {filtered.map((req, i) => {
          const stCfg = OT_STATUS_CFG[req.status as keyof typeof OT_STATUS_CFG] ?? OT_STATUS_CFG.pending;
          const isPending = approve.isPending || reject.isPending;

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(req.employeeName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{req.employeeName}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>
                      {stCfg.label}
                    </span>
                    {req.type === 'rest_day' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
                        Rest Day
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{req.position} · {req.department}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{format(parseISO(req.date), 'MMM d, yyyy')} · {req.startTime}–{req.endTime}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{req.hours}h OT</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">"{req.reason}"</p>
                  {req.approvedByName && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {req.status === 'approved' ? 'Approved' : 'Reviewed'} by {req.approvedByName}
                      {req.approvedAt ? ` · ${format(new Date(req.approvedAt), 'MMM d, yyyy h:mm a')}` : ''}
                    </p>
                  )}
                  {req.remarks && (
                    <p className="text-[10px] text-brand-red mt-1">Note: {req.remarks}</p>
                  )}
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(req.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {approve.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-brand-red border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {reject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      Reject
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

// ── Holidays Tab ──────────────────────────────────────────────────────────────

function HolidaysTab() {
  const currentYear = new Date().getFullYear();
  const { data: yearHolidays = [], isLoading } = useHolidays(currentYear);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">Philippine Public Holidays</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {yearHolidays.length} holidays · {currentYear}
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : yearHolidays.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          No {currentYear} holidays have been added yet for this organization.
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
          {yearHolidays.map((h) => {
            const typeCfg = HOLIDAY_TYPE_CFG[h.type] ?? HOLIDAY_TYPE_CFG.regular_holiday;
            const isPast = new Date(h.date) < new Date();
            return (
              <div
                key={h.id}
                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-2.5 sm:py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${isPast ? 'opacity-40' : ''}`}
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">{format(parseISO(h.date), 'MMM')}</p>
                  <p className="text-xl font-extrabold text-brand-blue leading-tight">{format(parseISO(h.date), 'd')}</p>
                  <p className="text-[9px] text-gray-400">{format(parseISO(h.date), 'EEE')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">{h.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.isNationwide ? 'Nationwide' : 'Company-specific'}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${typeCfg.bg} ${typeCfg.color} shrink-0 hidden sm:block`}>
                  {typeCfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('daily');
  const [selectedDate, setSelectedDate] = useState(TODAY);

  // OT pending count for header badge
  const { data: otRequests = [] } = useOvertimeRequests();
  const pendingOT = otRequests.filter((r) => r.status === 'pending').length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track daily attendance, overtime, and holidays
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {pendingOT > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('overtime')}
              className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
            >
              {pendingOT} OT pending
            </button>
          )}
        </div>
      </div>

      {/* Date shortcuts — daily tab only */}
      {activeTab === 'daily' && (() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const shortcuts = [
          { label: 'Today',      date: todayStr },
          { label: 'This Week',  date: weekStart,  sub: format(parseISO(weekStart), 'MMM d') },
          { label: 'This Month', date: monthStart,  sub: format(parseISO(monthStart), 'MMM yyyy') },
        ];
        return (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 mr-1">Jump to:</span>
            {shortcuts.map(({ label, date, sub }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                  selectedDate === date
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {label}
                {sub && selectedDate !== date && (
                  <span className="opacity-60">({sub})</span>
                )}
              </button>
            ))}
            <span className="hidden sm:inline text-xs text-gray-400 ml-auto">
              Viewing: <span className="font-semibold text-gray-600 dark:text-gray-300">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
            </span>
          </div>
        );
      })()}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
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
          {activeTab === 'daily' && (
            <DailyTab selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          )}
          {activeTab === 'calendar' && (
            <CalendarTab setSelectedDate={setSelectedDate} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'overtime' && <OvertimeTab />}
          {activeTab === 'holidays' && <HolidaysTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
