import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { KPICards } from './components/KPICards';
import { AttendanceHeatmap } from './components/AttendanceHeatmap';
import { DepartmentChart } from './components/DepartmentChart';
import { ActivityFeed } from './components/ActivityFeed';
import { PendingApprovals } from './components/PendingApprovals';
import { UpcomingEvents } from './components/UpcomingEvents';
import { AnnouncementBoard } from './components/AnnouncementBoard';
import { QuickStats } from './components/QuickStats';

const greetingByHour = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardPage() {
  const { user, tenant } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-5 max-w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {greetingByHour()}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Here&apos;s what&apos;s happening at{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{tenant?.name}</span> today.
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today</p>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {new Date('2026-04-22').toLocaleDateString('en-PH', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Row 2: Heatmap + Department Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AttendanceHeatmap />
        </div>
        <div>
          <DepartmentChart />
        </div>
      </div>

      {/* Row 3: Activity Feed + Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div>
          <PendingApprovals />
        </div>
      </div>

      {/* Row 4: Quick Stats + Upcoming Events + Announcements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div>
          <QuickStats />
        </div>
        <div>
          <UpcomingEvents />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <AnnouncementBoard />
        </div>
      </div>
    </motion.div>
  );
}
