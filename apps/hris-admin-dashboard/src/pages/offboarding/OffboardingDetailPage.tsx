import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle,
  Calendar, FileText, DollarSign, MessageSquare, Download,
  User, Banknote,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import offboardingData from '@/data/mock/offboarding.json';
import employeesData from '@/data/mock/employees.json';

type OffboardingRecord = typeof offboardingData[number];

const statusConfig = {
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  completed: { label: 'Completed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const exitInterviewConfig = {
  scheduled: { label: 'Scheduled', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  pending: { label: 'Not Scheduled', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  done: { label: 'Completed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function PayRow({ label, value, deduction }: { label: string; value: number; deduction?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${deduction ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
        {deduction ? '−' : '+'}₱{value.toLocaleString()}
      </span>
    </div>
  );
}


export default function OffboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const record = useMemo(() => offboardingData.find((r) => r.id === id), [id]) as OffboardingRecord | undefined;
  const employee = useMemo(() => record ? employeesData.find((e) => e.id === record.employeeId) : null, [record]);
  const hrAssignee = useMemo(() => record ? employeesData.find((e) => e.id === record.assignedHR) : null, [record]);

  if (!record || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Record not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/offboarding')} className="mt-4">Back</Button>
      </div>
    );
  }

  const cfg = statusConfig[record.status as keyof typeof statusConfig];
  const exitCfg = exitInterviewConfig[record.exitInterviewStatus as keyof typeof exitInterviewConfig];
  const daysLeft = differenceInDays(new Date(record.lastDay), new Date());
  const clearedCount = record.clearance.filter((c) => c.cleared).length;
  const clearancePct = Math.round((clearedCount / record.clearance.length) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/offboarding"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Offboarding
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {getInitials(employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{employee.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{employee.position} · {employee.department}</p>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Resigned {format(new Date(record.resignationDate), 'MMM d, yyyy')}</span>
              <span
                className={`flex items-center gap-1 font-medium ${daysLeft <= 3 && record.status !== 'completed' ? 'text-brand-red' : ''}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Last day {format(new Date(record.lastDay), 'MMM d, yyyy')}
                {record.status !== 'completed' && ` · ${Math.max(0, daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} left`}
              </span>
              <span>{record.reason}</span>
              {hrAssignee && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />HR: {hrAssignee.name}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              COE
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${employee.id}`)}>
              Profile
            </Button>
          </div>
        </div>

        {/* Clearance summary bar */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clearance Progress</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">{clearedCount}/{record.clearance.length} departments · {clearancePct}%</p>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clearancePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${clearancePct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clearance">
        <TabsList>
          <TabsTrigger value="clearance">Clearance</TabsTrigger>
          <TabsTrigger value="exit-interview">Exit Interview</TabsTrigger>
          <TabsTrigger value="final-pay">Final Pay</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Clearance Tab */}
        <TabsContent value="clearance">
          <div className="flex flex-col gap-3">
            {record.clearance.map((dept) => (
              <div
                key={dept.department}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 flex items-start gap-4 ${
                  dept.cleared
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  dept.cleared ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {dept.cleared
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Clock className="w-5 h-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{dept.department}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      dept.cleared
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {dept.cleared ? 'Cleared' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{dept.notes}</p>
                  {dept.cleared && dept.clearedBy && dept.clearedDate && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Cleared by {employeesData.find((e) => e.id === dept.clearedBy)?.name ?? dept.clearedBy} · {format(new Date(dept.clearedDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Exit Interview Tab */}
        <TabsContent value="exit-interview">
          <SectionCard title="Exit Interview">
            <div className="flex items-center gap-3 mb-5">
              <MessageSquare className="w-5 h-5 text-brand-blue" />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">Status</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${exitCfg.bg} ${exitCfg.color}`}>
                  {exitCfg.label}
                </span>
              </div>
              {record.exitInterviewDate && (
                <div className="ml-4">
                  <p className="text-xs text-gray-400">Scheduled for</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {format(new Date(record.exitInterviewDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {record.exitInterviewStatus === 'done' ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
                Exit interview completed. Feedback has been recorded and filed.
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  'Overall satisfaction with the company',
                  'Reason for leaving',
                  'Feedback on management',
                  'Would you recommend us as an employer?',
                  'Suggestions for improvement',
                ].map((q) => (
                  <div key={q}>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{q}</p>
                    <textarea
                      disabled
                      placeholder="Answer will be collected during exit interview…"
                      className="w-full h-16 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 resize-none"
                    />
                  </div>
                ))}
                <Button size="sm" className="bg-brand-blue hover:bg-brand-blue-dark text-white" disabled>
                  Submit Interview Form
                </Button>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Final Pay Tab */}
        <TabsContent value="final-pay">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Final Pay Breakdown">
              <PayRow label="Basic Pay (remaining days)" value={record.finalPay.basicPayRemaining} />
              <PayRow label="Unused Leave Conversion" value={record.finalPay.unusedLeaveConversion} />
              <PayRow label="13th Month Pay (pro-rated)" value={record.finalPay.thirteenthMonthPro} />
              {record.finalPay.sssLoanDeduction > 0 && <PayRow label="SSS Loan Deduction" value={record.finalPay.sssLoanDeduction} deduction />}
              {record.finalPay.pagibigLoanDeduction > 0 && <PayRow label="Pag-IBIG Loan Deduction" value={record.finalPay.pagibigLoanDeduction} deduction />}
              {record.finalPay.otherDeductions > 0 && <PayRow label="Other Deductions" value={record.finalPay.otherDeductions} deduction />}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Net Final Pay</span>
                <span className="text-lg font-extrabold text-brand-blue">₱{record.finalPay.netFinalPay.toLocaleString()}</span>
              </div>
            </SectionCard>

            <SectionCard title="Release Status">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${record.finalPayStatus === 'released' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                  {record.finalPayStatus === 'released'
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Clock className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {record.finalPayStatus === 'released' ? 'Final Pay Released' : 'Final Pay Pending'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {record.finalPayStatus === 'released' ? 'Transferred to registered bank account.' : 'Will be processed within 30 days after last day.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900">
                <Banknote className="w-4 h-4 text-brand-blue shrink-0" />
                Per DOLE rules, final pay must be released within 30 days from the last day of employment.
              </div>
              {record.finalPayStatus === 'pending' && (
                <Button size="sm" className="mt-4 bg-brand-blue hover:bg-brand-blue-dark text-white w-full flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  Process Final Pay
                </Button>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Required Documents">
              {[
                { label: 'Resignation Letter', uploaded: record.resignationLetterUploaded },
                { label: 'Clearance Form (signed)', uploaded: clearedCount === record.clearance.length },
                { label: 'Return of Company Property Form', uploaded: false },
                { label: 'Exit Interview Form', uploaded: record.exitInterviewStatus === 'done' },
                { label: 'Certificate of Employment (COE)', uploaded: record.status === 'completed' },
              ].map((doc) => (
                <div key={doc.label} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  {doc.uploaded
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <Clock className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />}
                  <span className={`text-sm flex-1 ${doc.uploaded ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{doc.label}</span>
                  {doc.uploaded
                    ? <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Uploaded</span>
                    : <span className="text-[10px] text-gray-400">Pending</span>}
                </div>
              ))}
            </SectionCard>

            <SectionCard title="Certificate of Employment">
              <p className="text-xs text-gray-400 mb-4">Auto-generated COE based on employee records. Available once all clearances are complete.</p>
              <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">
                <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Certificate of Employment</p>
                <p className="text-xs text-gray-400 mt-0.5">{employee.name}</p>
                <Button
                  size="sm"
                  disabled={record.status !== 'completed'}
                  className="mt-3 flex items-center gap-1.5 mx-auto bg-brand-blue hover:bg-brand-blue-dark text-white"
                >
                  <Download className="w-4 h-4" />
                  Download COE
                </Button>
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>

      {record.notes && (
        <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{record.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
