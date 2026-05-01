import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Pin,
  PartyPopper,
  Cake,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import attendanceLogs from '@/data/mock/attendance-logs.json';
import leaveBalances from '@/data/mock/leave-balances.json';
import payrollRecords from '@/data/mock/payroll-records.json';
import announcementsData from '@/data/mock/announcements.json';
import eventsData from '@/data/mock/events.json';
import shiftData from '@/data/mock/shift.json';
import colleaguesData from '@/data/mock/colleagues.json';

interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  workHours: number;
  lateMinutes: number;
  status: 'present' | 'late' | 'absent' | 'on_leave';
  source: string;
}

interface LeaveType {
  entitled: number;
  used: number;
  remaining: number;
  carryOver: number;
  convertible: number;
}

interface LeaveBalance {
  employeeId: string;
  year: number;
  VL: LeaveType;
  SL: LeaveType;
  SIL: LeaveType;
  EL: LeaveType;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  runId: string;
  period: string;
  payDate: string;
  basicPay: number;
  overtimePay: number;
  grossPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  totalDeductions: number;
  netPay: number;
  daysWorked: number;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  date: string;
  author: string;
  pinned: boolean;
}

interface CompanyEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: 'social' | 'meeting' | 'training' | 'deadline';
  rsvp: boolean;
}

interface Shift {
  employeeId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: string[];
}

interface Colleague {
  id: string;
  name: string;
  department: string;
  position: string;
  birthday: string;
  hireDate: string;
}

const logs = attendanceLogs as AttendanceLog[];
const leaveBalance = (leaveBalances as LeaveBalance[])[0];
const payroll = payrollRecords as PayrollRecord[];
const announcements = announcementsData as Announcement[];
const events = eventsData as CompanyEvent[];
const shift = shiftData as Shift;
const colleagues = colleaguesData as Colleague[];

const TODAY = '2023-11-10';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function diffYears(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return b.getFullYear() - a.getFullYear();
}

function isSameMonthDay(dateStr: string, today: string): boolean {
  return dateStr.slice(5) === today.slice(5);
}

const cardClass =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

const EASE_OUT: Easing = 'easeOut';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.05, ease: EASE_OUT },
});

const eventCategoryStyles: Record<CompanyEvent['category'], { bg: string; text: string; label: string }> = {
  social:   { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', label: 'Social' },
  meeting:  { bg: 'bg-blue-100 dark:bg-blue-950',    text: 'text-blue-700 dark:text-blue-300',     label: 'Meeting' },
  training: { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300',   label: 'Training' },
  deadline: { bg: 'bg-red-100 dark:bg-red-950',      text: 'text-red-700 dark:text-red-300',       label: 'Deadline' },
};

const annCategoryStyles: Record<string, string> = {
  holiday:  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  benefits: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  event:    'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  payroll:  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  policy:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayLog = logs.find((l) => l.date === TODAY);
  const latestPayslip = payroll[0];
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(TODAY + 'T00:00:00').getDay()];
  const isWorkDay = shift.workDays.includes(dayOfWeek);

  const birthdayCelebrations = colleagues.filter((c) => isSameMonthDay(c.birthday, TODAY));
  const anniversaryCelebrations = colleagues.filter((c) => isSameMonthDay(c.hireDate, TODAY));

  const sortedAnnouncements = [...announcements].sort((a, b) =>
    Number(b.pinned) - Number(a.pinned)
  );

  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  function handleClockToggle() {
    const now = currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    if (!clockedIn) {
      setClockedIn(true);
      setClockInTime(now);
      toast.success(`Clocked in at ${now}`);
    } else {
      const inH = clockInTime ? parseInt(clockInTime.split(':')[0]) : 0;
      const inM = clockInTime ? parseInt(clockInTime.split(':')[1]) : 0;
      const outH = currentTime.getHours();
      const outM = currentTime.getMinutes();
      const worked = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
      setClockedIn(false);
      setClockInTime(null);
      toast.success(`Clocked out at ${now} · ${worked.toFixed(1)} hours worked`);
    }
  }

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(0)} className="rounded-2xl p-5 bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white flex items-center justify-between gap-4">
        <div>
          <p className="text-blue-200 text-sm mb-1">
            {new Date(TODAY + 'T00:00:00').toLocaleDateString('en-PH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-blue-200 text-sm mt-1">Welcome back to your portal.</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="bg-white/15 rounded-xl px-3 py-1.5 text-xs font-medium">
              {shift.startTime} – {shift.endTime}
            </div>
            <div
              className={[
                'rounded-xl px-3 py-1.5 text-xs font-medium',
                todayLog?.status === 'present' || todayLog?.status === 'late'
                  ? 'bg-green-500/30'
                  : 'bg-white/15',
              ].join(' ')}
            >
              {todayLog
                ? todayLog.status === 'present'
                  ? 'Present today'
                  : todayLog.status === 'late'
                    ? 'Arrived late'
                    : todayLog.status === 'on_leave'
                      ? 'On leave'
                      : 'Absent'
                : 'No record yet'}
            </div>
          </div>
        </div>
        <div className="hidden sm:flex w-14 h-14 rounded-full bg-white/20 items-center justify-center shrink-0">
          <span className="text-white text-xl font-extrabold">{user ? getInitials(user.name) : 'U'}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div {...fadeUp(1)} className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Today's Schedule
          </p>
          <p className="font-bold text-gray-900 dark:text-white text-base mb-1">{shift.shiftName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {shift.startTime} – {shift.endTime}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {shift.breakMinutes} min break
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span
                key={d}
                className={[
                  'px-2 py-0.5 rounded-lg text-xs font-medium',
                  shift.workDays.includes(d)
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
                ].join(' ')}
              >
                {d}
              </span>
            ))}
          </div>
          <div className={[
            'flex items-center gap-1.5 text-xs font-medium',
            isWorkDay ? 'text-green-600 dark:text-green-400' : 'text-gray-400',
          ].join(' ')}>
            <span className={['w-2 h-2 rounded-full', isWorkDay ? 'bg-green-500' : 'bg-gray-300'].join(' ')} />
            {isWorkDay ? 'On duty today' : 'Rest day today'}
          </div>
        </motion.div>

        <motion.div {...fadeUp(2)} className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Clock In/Out
          </p>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums mb-4 tracking-tight">
            {currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button
            type="button"
            onClick={handleClockToggle}
            className={[
              'w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-colors',
              clockedIn
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600',
            ].join(' ')}
          >
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            {clockedIn && clockInTime
              ? `Clocked in since ${clockInTime}`
              : 'Not yet clocked in'}
          </p>
        </motion.div>

        <motion.div {...fadeUp(3)} className={cardClass}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Leave Balance
          </p>
          <div className="space-y-3">
            {(
              [
                { label: 'Vacation Leave', key: 'VL', color: 'bg-brand-blue' },
                { label: 'Sick Leave',     key: 'SL', color: 'bg-amber-400' },
                { label: 'SIL',            key: 'SIL', color: 'bg-green-500' },
              ] as { label: string; key: keyof Pick<LeaveBalance, 'VL' | 'SL' | 'SIL'>; color: string }[]
            ).map(({ label, key, color }) => {
              const entry = leaveBalance[key];
              const pct = Math.round((entry.used / entry.entitled) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {entry.remaining} <span className="text-xs font-normal text-gray-400">days</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${color} rounded-full origin-left`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{entry.used} of {entry.entitled} used</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div {...fadeUp(4)} className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Latest Payslip
            </p>
            <Link to="/payslip" className="text-xs text-brand-blue font-medium hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {latestPayslip && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{latestPayslip.period}</p>
              <div className="flex gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Gross Pay</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(latestPayslip.grossPay)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Deductions</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(latestPayslip.totalDeductions)}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                <p className="text-[10px] text-gray-400 uppercase mb-0.5">Net Pay</p>
                <p className="text-2xl font-extrabold text-brand-blue">
                  {formatCurrency(latestPayslip.netPay)}
                </p>
              </div>
            </>
          )}
        </motion.div>

        <motion.div {...fadeUp(5)} className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Announcements
            </p>
            <Link to="/announcements" className="text-xs text-brand-blue font-medium hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <ul className="space-y-3">
            {sortedAnnouncements.slice(0, 3).map((ann) => (
              <li key={ann.id} className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {ann.pinned && <Pin size={11} className="text-brand-blue shrink-0" />}
                    <span
                      className={[
                        'px-1.5 py-0.5 rounded text-[10px] font-medium capitalize',
                        annCategoryStyles[ann.category] ?? 'bg-gray-100 text-gray-600',
                      ].join(' ')}
                    >
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-gray-400">{ann.date}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">{ann.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{ann.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div {...fadeUp(6)} className={cardClass}>
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Today's Celebrations
            </p>
          </div>
          {birthdayCelebrations.length === 0 && anniversaryCelebrations.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No celebrations today</p>
          ) : (
            <ul className="space-y-3">
              {birthdayCelebrations.map((c) => (
                <li key={`bd-${c.id}`} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0">
                    <Cake size={16} className="text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Birthday today! ({new Date(TODAY).getFullYear() - new Date(c.birthday).getFullYear()})
                    </p>
                  </div>
                </li>
              ))}
              {anniversaryCelebrations.map((c) => (
                <li key={`ann-${c.id}`} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center shrink-0">
                    <PartyPopper size={16} className="text-yellow-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {diffYears(c.hireDate, TODAY)} years with the company!
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div {...fadeUp(7)} className={`${cardClass} md:col-span-2`}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Upcoming Events
            </p>
          </div>
          <ul className="space-y-3">
            {sortedEvents.map((evt) => {
              const style = eventCategoryStyles[evt.category];
              return (
                <li key={evt.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 ${style.bg} ${style.text}`}>
                    {style.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{evt.title}</p>
                      {evt.rsvp && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          RSVP Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatEventDate(evt.date)} · {evt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {evt.location}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
