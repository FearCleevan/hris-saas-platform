import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCheck, FileText, DollarSign, AlertCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import notificationsData from '@/data/mock/notifications.json';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, React.ReactNode> = {
  leave_request: <Bell className="w-4 h-4 text-[#0038a8]" />,
  payroll: <DollarSign className="w-4 h-4 text-green-600" />,
  compliance: <AlertCircle className="w-4 h-4 text-amber-600" />,
  employee: <UserPlus className="w-4 h-4 text-purple-600" />,
  document: <FileText className="w-4 h-4 text-gray-600" />,
};

const typeBg: Record<string, string> = {
  leave_request: 'bg-[#0038a8]/10',
  payroll: 'bg-green-100 dark:bg-green-950/30',
  compliance: 'bg-amber-100 dark:bg-amber-950/30',
  employee: 'bg-purple-100 dark:bg-purple-950/30',
  document: 'bg-gray-100 dark:bg-gray-800',
};

export function NotificationDrawer() {
  const { notificationDrawerOpen, setNotificationDrawerOpen } = useUIStore();
  const navigate = useNavigate();

  const handleNotificationClick = (link: string) => {
    navigate(link);
    setNotificationDrawerOpen(false);
  };

  return (
    <AnimatePresence>
      {notificationDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setNotificationDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-screen w-96 max-w-[100vw] z-50 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Notifications</h2>
                <p className="text-xs text-gray-400">
                  {notificationsData.filter((n) => !n.read).length} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-[#0038a8] dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
                <button
                  title='Mark'
                  type="button"
                  onClick={() => setNotificationDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
              {notificationsData.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif.link)}
                  className={cn(
                    'w-full flex gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer',
                    !notif.read && 'bg-[#0038a8]/3 dark:bg-[#0038a8]/5'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', typeBg[notif.type])}>
                    {typeIcons[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={cn('text-sm leading-snug', notif.read ? 'text-gray-600 dark:text-gray-400' : 'font-semibold text-gray-900 dark:text-white')}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="mt-1 w-2 h-2 rounded-full bg-[#0038a8] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notif.time), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => { navigate('/notifications'); setNotificationDrawerOpen(false); }}
                className="w-full text-center text-sm text-[#0038a8] dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                View all notifications
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
