import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const routeLabels: Record<string, string> = {
  employees: 'Employee Management',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  attendance: 'Attendance Tracking',
  leaves: 'Leave Management',
  schedule: 'Shifts & Schedule',
  payroll: 'Payroll Management',
  benefits: 'Benefits',
  expenses: 'Expense Management',
  documents: 'Document Management',
  performance: 'Performance Management',
  recruitment: 'Recruitment (ATS)',
  reports: 'Compliance & Reports',
  analytics: 'Analytics & Insights',
  settings: 'Settings',
  notifications: 'Notifications',
};

export default function ComingSoonPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  const label = routeLabels[segment] ?? 'This Module';

  const phaseMap: Record<string, number> = {
    employees: 4, onboarding: 5, offboarding: 5,
    attendance: 6, leaves: 7, schedule: 6,
    payroll: 8, benefits: 9, expenses: 10,
    documents: 11, performance: 12,
    recruitment: 14, reports: 13, analytics: 15,
    settings: 16,
  };
  const phase = phaseMap[segment];

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-5">
          <Construction className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
          {label}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          This module is coming in{' '}
          {phase ? (
            <span className="font-semibold text-[#0038a8] dark:text-blue-400">Phase {phase}</span>
          ) : (
            'a future phase'
          )}
          . The navigation is wired up and ready.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
