import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, Trash2,
  Calendar, DollarSign, Shield, Users, FileText, Clock,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';
import notificationsData from '@/data/mock/notifications.json';

interface Notification {
  id: string; type: string; title: string;
  message: string; time: string; read: boolean; link: string;
}

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  leave_request: { icon: Calendar,   color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950/40',  label: 'Leave' },
  payroll:       { icon: DollarSign, color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-950/40',  label: 'Payroll' },
  compliance:    { icon: Shield,     color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-950/40',      label: 'Compliance' },
  employee:      { icon: Users,      color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950/40',    label: 'Employee' },
  document:      { icon: FileText,   color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950/40', label: 'Document' },
  overtime:      { icon: Clock,      color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-950/40', label: 'Overtime' },
};

const FALLBACK_CFG = { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', label: 'System' };

const TYPE_FILTERS = ['All', 'Leave', 'Payroll', 'Compliance', 'Employee', 'Document'];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>(notificationsData as Notification[]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filtered = useMemo(() => {
    return items.filter(n => {
      const cfg = TYPE_CFG[n.type];
      if (typeFilter !== 'All' && cfg?.label !== typeFilter) return false;
      if (readFilter === 'unread' && n.read) return false;
      if (readFilter === 'read' && !n.read) return false;
      return true;
    });
  }, [items, typeFilter, readFilter]);

  const unreadCount = items.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const dismiss = (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
    toast.success('Notification dismissed');
  };

  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002d8a] transition-colors"
          >
            <CheckCheck size={15} />Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Read/Unread toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setReadFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                readFilter === f
                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unreadCount})` : 'Read'}
            </button>
          ))}
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                typeFilter === t
                  ? 'bg-[#0038a8] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-400">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Bell size={40} className="text-gray-300 dark:text-gray-700" />
          <p className="text-sm font-medium">No notifications</p>
          <p className="text-xs">You're all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {filtered.map((notif, i) => {
              const cfg = TYPE_CFG[notif.type] ?? FALLBACK_CFG;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className={`group bg-white dark:bg-gray-900 border rounded-2xl p-4 flex items-start gap-3 transition-all ${
                    !notif.read
                      ? 'border-[#0038a8]/30 shadow-sm ring-1 ring-[#0038a8]/10'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={16} className={cfg.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${notif.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#0038a8] shrink-0" />
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatDistanceToNow(parseISO(notif.time), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button
                            type="button"
                            title="Mark as read"
                            onClick={() => markRead(notif.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-green-500 transition-colors"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Dismiss"
                          onClick={() => dismiss(notif.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Action link */}
                    {notif.link && (
                      <button
                        type="button"
                        onClick={() => handleClick(notif)}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#0038a8] dark:text-blue-400 hover:underline"
                      >
                        View details <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
