// src/pages/performance/PerformancePage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Target, UserCheck, Star, Users2, History, TrendingUp,
  ChevronDown, AlertTriangle, CheckCircle2, Clock,
  StarIcon, Edit3,
  Trophy, BotMessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import cyclesData from '@/data/mock/performance-cycles.json';
import reviewsData from '@/data/mock/performance-reviews.json';
import goalsData from '@/data/mock/performance-goals.json';
import feedbackData from '@/data/mock/performance-feedback.json';
import { ReviewWriter } from './components/ReviewWriter';
import { SentimentAnalyzer } from './components/SentimentAnalyzer';

/* ─── Types ─── */
type TabId = 'reviews' | 'goals' | 'self' | 'evaluations' | 'feedback' | 'history' | 'promotions' | 'ai-tools';

interface Cycle {
  id: string; name: string; period: string; status: string;
  selfAssessmentStart: string; selfAssessmentEnd: string;
  managerReviewStart: string; managerReviewEnd: string;
  calibrationStart: string; calibrationEnd: string;
  departments: string[]; totalParticipants: number;
  completedReviews: number; averageRating: number;
}

interface Review {
  id: string; employeeId: string; cycleId: string; status: string;
  selfAssessment: any; managerReview: any; finalRating: number;
}

interface Goal {
  id: string; employeeId: string; cycleId: string; objective: string;
  keyResults: any[]; category: string; weight: number;
  status: string; dueDate: string; departmentObjective: string;
}

interface Feedback {
  id: string; revieweeId: string; reviewerId: string; type: string;
  cycleId: string; anonymous: boolean; ratings: Record<string, number>;
  strengths: string; improvements: string; submittedDate: string; status: string;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType; highlight?: boolean }[] = [
  { id: 'reviews',     label: 'Reviews',         icon: ClipboardList },
  { id: 'goals',       label: 'Goals',            icon: Target },
  { id: 'self',        label: 'Self-Assessment',  icon: UserCheck },
  { id: 'evaluations', label: 'Evaluations',      icon: Star },
  { id: 'feedback',    label: '360 Feedback',     icon: Users2 },
  { id: 'history',     label: 'History',          icon: History },
  { id: 'promotions',  label: 'Promotions',       icon: TrendingUp },
  { id: 'ai-tools',    label: 'AI Tools',         icon: BotMessageSquare, highlight: true },
];

const COMPETENCIES = [
  { key: 'qualityOfWork', label: 'Quality of Work', weight: 20 },
  { key: 'productivity', label: 'Productivity', weight: 15 },
  { key: 'communication', label: 'Communication', weight: 15 },
  { key: 'teamwork', label: 'Teamwork', weight: 15 },
  { key: 'leadership', label: 'Leadership', weight: 10 },
  { key: 'initiative', label: 'Initiative', weight: 10 },
  { key: 'technicalSkills', label: 'Technical Skills', weight: 10 },
  { key: 'attendance', label: 'Attendance', weight: 5 },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:           { label: 'Draft',         color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200' },
  self_assessment: { label: 'Self-Assessment', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200' },
  manager_review:  { label: 'Manager Review',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200' },
  completed:       { label: 'Completed',      color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200' },
  calibrating:     { label: 'Calibrating',    color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  submitted:       { label: 'Submitted',       color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
  pending:         { label: 'Pending',         color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
};

const GOAL_STATUS_CFG: Record<string, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
  at_risk:  { label: 'At Risk',  color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  behind:   { label: 'Behind',   color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
  completed:{ label: 'Completed',color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
};

/* ─── Helpers ─── */
function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
function ratingColor(r: number): string { return r >= 4.5 ? 'text-green-600' : r >= 3.5 ? 'text-blue-600' : r >= 2.5 ? 'text-amber-600' : 'text-red-600'; }
function ratingBg(r: number): string { return r >= 4.5 ? 'bg-green-500' : r >= 3.5 ? 'bg-blue-500' : r >= 2.5 ? 'bg-amber-500' : 'bg-red-500'; }

function KpiCard({ label, value, icon: IconC, sub, color }: { label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-[#0038a8]/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-[#0038a8]'}`} />
      </div>
      <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
    </div>
  );
}

function RatingDot({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`w-3 h-3 rounded-full ${i < Math.round(value) ? ratingBg(value) : 'bg-gray-200 dark:bg-gray-700'}`} />
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('reviews');
  const [selectedCycle, setSelectedCycle] = useState('cycle002');
  const [selectedEmployee, setSelectedEmployee] = useState(employeesData[0].id);
  const [historyEmployee, setHistoryEmployee] = useState(employeesData[0].id);

  const cycles = cyclesData as Cycle[];
  const reviews = reviewsData as Review[];
  const goals = goalsData as Goal[];
  const feedbacks = feedbackData as Feedback[];

  const activeCycle = useMemo(() => cycles.find(c => c.id === selectedCycle)!, [selectedCycle]);

  /* ─── Reviews Tab ─── */
  const cycleReviews = useMemo(() => reviews.filter(r => r.cycleId === selectedCycle).map(r => {
    const emp = employeesData.find(e => e.id === r.employeeId);
    return { ...r, emp };
  }).sort((a, b) => (b.finalRating || 0) - (a.finalRating || 0)), [selectedCycle]);

  const reviewKPIs = useMemo(() => ({
    total: activeCycle.totalParticipants,
    completed: cycleReviews.filter(r => r.status === 'completed').length,
    inProgress: cycleReviews.filter(r => r.status !== 'completed' && r.status !== 'draft').length,
    avgRating: activeCycle.averageRating,
  }), [activeCycle, cycleReviews]);

  /* ─── Goals Tab ─── */
  const empGoals = useMemo(() => goals.filter(g => g.employeeId === selectedEmployee && g.cycleId === selectedCycle).map(g => ({ ...g })), [selectedEmployee, selectedCycle]);
  const goalKPIs = useMemo(() => ({
    active: empGoals.filter(g => g.status !== 'completed').length,
    completed: empGoals.filter(g => g.status === 'completed').length,
    onTrack: empGoals.filter(g => g.status === 'on_track').length,
    atRisk: empGoals.filter(g => g.status === 'at_risk' || g.status === 'behind').length,
  }), [empGoals]);

  /* ─── Self-Assessment Tab ─── */
  const selfReview = useMemo(() => reviews.find(r => r.employeeId === selectedEmployee && r.cycleId === selectedCycle), [selectedEmployee, selectedCycle]);
  const selfEmp = useMemo(() => employeesData.find(e => e.id === selectedEmployee)!, [selectedEmployee]);

  /* ─── Evaluations Tab ─── */
  const pendingEvaluations = useMemo(() => reviews.filter(r => r.cycleId === selectedCycle && (r.status === 'self_assessment' || r.status === 'manager_review')).map(r => {
    const emp = employeesData.find(e => e.id === r.employeeId);
    return { ...r, emp };
  }), [selectedCycle]);
  const completedEvaluations = useMemo(() => reviews.filter(r => r.cycleId === selectedCycle && r.status === 'completed').map(r => {
    const emp = employeesData.find(e => e.id === r.employeeId);
    return { ...r, emp };
  }).sort((a, b) => (b.managerReview?.overallRating || 0) - (a.managerReview?.overallRating || 0)), [selectedCycle]);

  /* ─── Feedback Tab ─── */
  const empFeedbacks = useMemo(() => feedbacks.filter(f => f.revieweeId === selectedEmployee && f.cycleId === selectedCycle).map(f => {
    const reviewer = f.anonymous ? null : employeesData.find(e => e.id === f.reviewerId);
    return { ...f, reviewer, avgRating: Object.values(f.ratings).reduce((s, r) => s + r, 0) / Object.keys(f.ratings).length };
  }), [selectedEmployee, selectedCycle]);

  /* ─── History Tab ─── */
  const historyReviews = useMemo(() => reviews.filter(r => r.employeeId === historyEmployee && r.cycleId !== selectedCycle && r.status === 'completed').map(r => {
    const cycle = cycles.find(c => c.id === r.cycleId);
    return { ...r, cycle };
  }).sort((a, b) => new Date(b.cycle?.managerReviewEnd || '').getTime() - new Date(a.cycle?.managerReviewEnd || '').getTime()), [historyEmployee, selectedCycle]);
  const historyEmp = useMemo(() => employeesData.find(e => e.id === historyEmployee)!, [historyEmployee]);

  /* ─── Promotions Tab ─── */
  const promotionCandidates = useMemo(() => {
    return reviews.filter(r => r.cycleId === selectedCycle && r.status === 'completed' && (r.finalRating || r.managerReview?.overallRating || 0) >= 4.0).map(r => {
      const emp = employeesData.find(e => e.id === r.employeeId);
      const rating = r.finalRating || r.managerReview?.overallRating || 0;
      return { ...r, emp, rating, readiness: rating >= 4.5 ? 'Ready Now' : rating >= 4.2 ? '6 Months' : '12 Months' };
    }).sort((a, b) => b.rating - a.rating);
  }, [selectedCycle]);

  /* ─── Render ─── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Performance Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCycle.name} · {activeCycle.period} · {reviewKPIs.completed}/{reviewKPIs.total} reviews completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select title='Select' value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => { const Icon = tab.icon; return (
          <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors
              ${activeTab === tab.id
                ? 'bg-[#0038a8] text-white shadow-sm'
                : tab.highlight
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Icon className="w-4 h-4" />{tab.label}
            {tab.highlight && activeTab !== tab.id && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">AI</span>
            )}
          </button>
        );})}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

          {/* ===== REVIEWS TAB ===== */}
          {activeTab === 'reviews' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Reviews" value={reviewKPIs.total} icon={ClipboardList} />
                <KpiCard label="Completed" value={reviewKPIs.completed} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="In Progress" value={reviewKPIs.inProgress} icon={Clock} color="bg-amber-500" />
                <KpiCard label="Avg Rating" value={reviewKPIs.avgRating.toFixed(1)} icon={StarIcon} color="bg-blue-500" sub="/ 5.0" />
              </div>
              <div className="flex gap-2 mb-4 text-xs text-gray-500">
                <span>Self-Assessment: {format(new Date(activeCycle.selfAssessmentStart), 'MMM d')} – {format(new Date(activeCycle.selfAssessmentEnd), 'MMM d')}</span>
                <span>·</span>
                <span>Manager Review: {format(new Date(activeCycle.managerReviewStart), 'MMM d')} – {format(new Date(activeCycle.managerReviewEnd), 'MMM d')}</span>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Self Score</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Manager Score</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Final Rating</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycleReviews.map((r, i) => {
                        const stCfg = STATUS_CFG[r.status];
                        const selfAvg = r.selfAssessment ? Object.values(r.selfAssessment).filter(v => typeof v === 'number') : [];
                        const selfScore = selfAvg.length > 0 ? (selfAvg as number[]).reduce((s, v) => s + v, 0) / selfAvg.length : 0;
                        const mgrScore = r.managerReview?.overallRating || 0;
                        return (
                          <tr key={r.id} className={`${i < cycleReviews.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold">{getInitials(r.emp?.name || '')}</div>
                                <div><p className="text-xs font-semibold text-gray-800 dark:text-white">{r.emp?.name}</p><p className="text-[10px] text-gray-400">{r.emp?.department}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center"><span className="text-xs font-bold">{selfScore > 0 ? selfScore.toFixed(1) : '—'}</span></td>
                            <td className="px-4 py-2.5 text-center"><span className={`text-xs font-bold ${mgrScore > 0 ? ratingColor(mgrScore) : 'text-gray-400'}`}>{mgrScore > 0 ? mgrScore.toFixed(1) : '—'}</span></td>
                            <td className="px-4 py-2.5 text-center">
                              {r.finalRating > 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  <RatingDot value={r.finalRating} />
                                  <span className={`text-xs font-bold ml-1 ${ratingColor(r.finalRating)}`}>{r.finalRating.toFixed(1)}</span>
                                </div>
                              ) : <span className="text-xs text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== GOALS TAB ===== */}
          {activeTab === 'goals' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Employee:</label>
                <div className="relative">
                  <select title='Select' value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Active Goals" value={goalKPIs.active} icon={Target} />
                <KpiCard label="On Track" value={goalKPIs.onTrack} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="At Risk" value={goalKPIs.atRisk} icon={AlertTriangle} color="bg-red-500" />
                <KpiCard label="Completed" value={goalKPIs.completed} icon={Trophy} color="bg-blue-500" />
              </div>
              <div className="flex flex-col gap-3">
                {empGoals.length === 0 && <p className="text-center py-12 text-sm text-gray-400">No goals set for this cycle</p>}
                {empGoals.map((goal, i) => {
                  const stColor = GOAL_STATUS_CFG[goal.status];
                  return (
                    <motion.div key={goal.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stColor.color}`}>{stColor.label}</span>
                            <span className="text-[10px] text-gray-400">{goal.category} · Weight: {goal.weight}%</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{goal.objective}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Aligns with: {goal.departmentObjective}</p>
                        </div>
                      </div>
                      {goal.keyResults.map((kr: any) => {
                        const pct = Math.round((kr.current / kr.target) * 100);
                        return (
                          <div key={kr.id} className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">{kr.description}</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">{kr.current}/{kr.target} {kr.unit}</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-gray-400 mt-2">Due: {format(new Date(goal.dueDate), 'MMM d, yyyy')}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== SELF-ASSESSMENT TAB ===== */}
          {activeTab === 'self' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Employee:</label>
                <div className="relative">
                  <select title='Select' value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                {selfReview && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CFG[selfReview.status].bg} ${STATUS_CFG[selfReview.status].color}`}>{STATUS_CFG[selfReview.status].label}</span>}
              </div>
              {!selfReview || selfReview.status === 'draft' ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
                  <Edit3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-500">Self-assessment not yet started</p>
                  <button onClick={() => toast.success('Self-assessment started')} className="mt-3 px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl">Start Self-Assessment</button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold">{getInitials(selfEmp.name)}</div>
                    <div><p className="text-sm font-bold text-gray-800 dark:text-white">{selfEmp.name}</p><p className="text-xs text-gray-400">{selfEmp.position}</p></div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mb-3">Competency Ratings</p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {COMPETENCIES.map(comp => (
                      <div key={comp.key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{comp.label} ({comp.weight}%)</span>
                        <RatingDot value={(selfReview.selfAssessment as any)[comp.key] || 0} />
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Key Accomplishments</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{selfReview.selfAssessment?.accomplishments || '—'}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Areas for Improvement</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{selfReview.selfAssessment?.improvements || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Career Goals</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{selfReview.selfAssessment?.careerGoals || '—'}</p>
                  </div>
                  {selfReview.status === 'self_assessment' && (
                    <button onClick={() => toast.success('Self-assessment submitted')} className="mt-4 px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl">Submit Self-Assessment</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== EVALUATIONS TAB ===== */}
          {activeTab === 'evaluations' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Pending Reviews" value={pendingEvaluations.length} icon={Clock} color="bg-amber-500" />
                <KpiCard label="Completed" value={completedEvaluations.length} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="Avg Rating" value={completedEvaluations.length > 0 ? (completedEvaluations.reduce((s, r) => s + (r.managerReview?.overallRating || 0), 0) / completedEvaluations.length).toFixed(1) : '—'} icon={StarIcon} color="bg-blue-500" />
              </div>
              {pendingEvaluations.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Pending Manager Reviews ({pendingEvaluations.length})</p>
                  <div className="flex flex-col gap-3">
                    {pendingEvaluations.map((r) => (
                      <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold">{getInitials(r.emp?.name || '')}</div>
                          <div><p className="text-sm font-semibold text-gray-800 dark:text-white">{r.emp?.name}</p><p className="text-xs text-gray-400">{r.emp?.department}</p></div>
                        </div>
                        <button onClick={() => toast.success(`Evaluation submitted for ${r.emp?.name}`)} className="px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold">Complete Review</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Completed Evaluations ({completedEvaluations.length})</p>
                <div className="flex flex-col gap-2">
                  {completedEvaluations.map((r) => (
                    <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold">{getInitials(r.emp?.name || '')}</div>
                        <div><p className="text-sm font-semibold text-gray-800 dark:text-white">{r.emp?.name}</p><p className="text-xs text-gray-400">{r.emp?.department}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <RatingDot value={r.managerReview?.overallRating || 0} />
                        <span className={`text-sm font-bold ${ratingColor(r.managerReview?.overallRating || 0)}`}>{(r.managerReview?.overallRating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== 360 FEEDBACK TAB ===== */}
          {activeTab === 'feedback' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Employee:</label>
                <div className="relative">
                  <select title='Select' value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">{empFeedbacks.length} feedback entries</span>
              </div>
              <div className="flex flex-col gap-3">
                {empFeedbacks.length === 0 && <p className="text-center py-12 text-sm text-gray-400">No feedback received yet</p>}
                {empFeedbacks.map((fb, i) => (
                  <motion.div key={fb.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${fb.anonymous ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                          {fb.anonymous ? 'Anonymous' : fb.reviewer?.name || 'Unknown'} · {fb.type}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1">{format(new Date(fb.submittedDate), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold">{fb.avgRating.toFixed(1)}</span>
                        <RatingDot value={fb.avgRating} />
                      </div>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-green-600 mb-0.5">Strengths:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{fb.strengths}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-600 mb-0.5">Areas for Improvement:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{fb.improvements}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Employee:</label>
                <div className="relative">
                  <select title='Select' value={historyEmployee} onChange={e => setHistoryEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold">{getInitials(historyEmp.name)}</div>
                  <div><p className="text-sm font-bold text-gray-800 dark:text-white">{historyEmp.name}</p><p className="text-xs text-gray-400">{historyEmp.position} · {historyEmp.department}</p></div>
                </div>
                {historyReviews.length > 0 && (
                  <div className="flex items-end gap-2 h-24">
                    {historyReviews.map((r) => {
                      const rating = r.finalRating || r.managerReview?.overallRating || 0;
                      const pct = (rating / 5) * 100;
                      return (
                        <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${ratingColor(rating)}`}>{rating.toFixed(1)}</span>
                          <div className="w-full rounded-t-md" style={{ height: `${pct}%`, backgroundColor: rating >= 4 ? '#22c55e' : rating >= 3 ? '#3b82f6' : '#f59e0b', minHeight: '4px' }} />
                          <span className="text-[9px] text-gray-400">{r.cycle?.name?.replace('2023', '').trim() || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {historyReviews.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">No historical reviews available</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyReviews.map((r) => {
                    const rating = r.finalRating || r.managerReview?.overallRating || 0;
                    return (
                      <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">{r.cycle?.name}</p>
                            <p className="text-xs text-gray-400">{r.cycle?.period}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <RatingDot value={rating} />
                            <span className={`text-lg font-extrabold ${ratingColor(rating)}`}>{rating.toFixed(1)}</span>
                          </div>
                        </div>
                        {r.managerReview?.comments && <p className="text-xs text-gray-500 italic">"{r.managerReview.comments}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== PROMOTIONS TAB ===== */}
          {activeTab === 'promotions' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Candidates" value={promotionCandidates.length} icon={TrendingUp} />
                <KpiCard label="Ready Now" value={promotionCandidates.filter(c => c.readiness === 'Ready Now').length} icon={Trophy} color="bg-green-500" />
                <KpiCard label="6 Months" value={promotionCandidates.filter(c => c.readiness === '6 Months').length} icon={Clock} color="bg-amber-500" />
                <KpiCard label="12 Months" value={promotionCandidates.filter(c => c.readiness === '12 Months').length} icon={Clock} color="bg-blue-500" />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Department</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Rating</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Readiness</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotionCandidates.map((c, i) => (
                        <tr key={c.id} className={`${i < promotionCandidates.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold">{getInitials(c.emp?.name || '')}</div>
                              <span className="text-xs font-semibold text-gray-800 dark:text-white">{c.emp?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{c.emp?.department}</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1"><RatingDot value={c.rating} /><span className={`text-xs font-bold ml-1 ${ratingColor(c.rating)}`}>{c.rating.toFixed(1)}</span></div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.readiness === 'Ready Now' ? 'bg-green-50 text-green-600' : c.readiness === '6 Months' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{c.readiness}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => toast.success(`Promotion recommended for ${c.emp?.name}`)} className="text-[10px] font-semibold text-[#0038a8] hover:underline">Recommend</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== AI TOOLS TAB ===== */}
          {activeTab === 'ai-tools' && (
            <div className="flex flex-col gap-8">
              <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Gemini AI Performance Tools</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Powered by Google Gemini (free tier). Requires <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded text-[10px]">VITE_GEMINI_API_KEY</code> in your <code className="bg-indigo-100 dark:bg-indigo-900 px-1 rounded text-[10px]">.env</code> file.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-1">Performance Review Writer</h2>
                <p className="text-xs text-gray-400 mb-4">Rate each competency → AI drafts a complete, formal appraisal ready to save or print.</p>
                <ReviewWriter />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
                <h2 className="text-base font-bold text-gray-800 dark:text-white mb-1">Employee Sentiment Analyzer</h2>
                <p className="text-xs text-gray-400 mb-4">AI reads all 360° feedback for an employee and generates a sentiment score, key themes, and HR recommendation.</p>
                <SentimentAnalyzer />
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}