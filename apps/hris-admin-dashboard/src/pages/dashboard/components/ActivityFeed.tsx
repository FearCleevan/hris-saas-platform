import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, CheckCircle, DollarSign, Clock, FileText, Target, CreditCard, UserMinus, FileCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import activitiesData from '@/data/mock/activities.json';

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  new_hire: { icon: <UserPlus className="w-3.5 h-3.5" />, bg: 'bg-green-100 dark:bg-green-950/30', color: 'text-green-600 dark:text-green-400' },
  leave_approved: { icon: <CheckCircle className="w-3.5 h-3.5" />, bg: 'bg-[#0038a8]/10', color: 'text-[#0038a8] dark:text-blue-400' },
  payroll: { icon: <DollarSign className="w-3.5 h-3.5" />, bg: 'bg-purple-100 dark:bg-purple-950/30', color: 'text-purple-600 dark:text-purple-400' },
  overtime: { icon: <Clock className="w-3.5 h-3.5" />, bg: 'bg-amber-100 dark:bg-amber-950/30', color: 'text-amber-600 dark:text-amber-400' },
  document: { icon: <FileText className="w-3.5 h-3.5" />, bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' },
  performance: { icon: <Target className="w-3.5 h-3.5" />, bg: 'bg-indigo-100 dark:bg-indigo-950/30', color: 'text-indigo-600 dark:text-indigo-400' },
  expense: { icon: <CreditCard className="w-3.5 h-3.5" />, bg: 'bg-orange-100 dark:bg-orange-950/30', color: 'text-orange-600 dark:text-orange-400' },
  offboarding: { icon: <UserMinus className="w-3.5 h-3.5" />, bg: 'bg-red-100 dark:bg-red-950/30', color: 'text-red-600 dark:text-red-400' },
  compliance: { icon: <FileCheck className="w-3.5 h-3.5" />, bg: 'bg-teal-100 dark:bg-teal-950/30', color: 'text-teal-600 dark:text-teal-400' },
};

const fallback = { icon: <CheckCircle className="w-3.5 h-3.5" />, bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-400' };

export function ActivityFeed() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Recent Activity</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Latest HR actions across your company</p>
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gray-100 dark:bg-gray-800" />

        <div className="flex flex-col gap-0">
          {activitiesData.map((activity) => {
            const config = typeConfig[activity.type] ?? fallback;
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => navigate(activity.link)}
                className="group flex gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-1 -mx-1 transition-colors text-left cursor-pointer"
              >
                {/* Icon */}
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10', config.bg, config.color)}>
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                    {activity.message}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                    </p>
                    {activity.actor !== 'System' && activity.actor !== 'HR System' && (
                      <>
                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        <p className="text-[10px] text-gray-400">{activity.actor}</p>
                      </>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0038a8] transition-colors shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
