import { useState } from 'react';
import { motion, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import {
  Target,
  Star,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Award,
  MessageSquare,
  BookOpen,
  Printer,
  Shield,
  Cloud,
  Layers,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import goalsRaw from '@/data/mock/goals.json';
import selfAssessmentRaw from '@/data/mock/self-assessment.json';
import performanceReviewsRaw from '@/data/mock/performance-reviews.json';
import feedbackRaw from '@/data/mock/feedback.json';
import trainingsRaw from '@/data/mock/trainings.json';
import certificationsRaw from '@/data/mock/certifications.json';

// ─── Types ─────────────────────────────────────────────────────────────────────

type GoalCategory = 'technical' | 'learning' | 'leadership';
type GoalStatus = 'in_progress' | 'completed';

interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  category: GoalCategory;
  status: GoalStatus;
  progress: number;
  targetDate: string;
  createdAt: string;
  keyResults: string[];
}

type CompetencyKey =
  | 'qualityOfWork'
  | 'productivity'
  | 'communication'
  | 'teamwork'
  | 'leadership'
  | 'initiative'
  | 'technicalSkills'
  | 'attendance';

type AssessmentStatus = 'draft' | 'submitted';

interface SelfAssessment {
  employeeId: string;
  cycleId: string;
  cycleName: string;
  dueDate: string;
  status: AssessmentStatus;
  ratings: Record<CompetencyKey, number>;
  accomplishments: string;
  improvements: string;
  careerGoals: string;
  lastSaved: string;
}

type ReviewStatus = 'completed';

interface PerformanceReview {
  id: string;
  employeeId: string;
  cycleId: string;
  cycleName: string;
  status: ReviewStatus;
  finalRating: number;
  reviewDate: string;
  managerName: string;
  managerComments: string;
  strengths: string;
  improvements: string;
  selfRatings: Record<CompetencyKey, number>;
  managerRatings: Record<CompetencyKey, number>;
}

type FeedbackType = 'manager' | 'peer';

interface FeedbackItem {
  id: string;
  employeeId: string;
  fromName: string;
  fromRole: string;
  type: FeedbackType;
  date: string;
  rating: number;
  message: string;
  tags: string[];
}

type TrainingStatus = 'in_progress' | 'completed';
type TrainingType = 'online' | 'in-person' | 'workshop';
type TrainingCategory = 'technical' | 'soft-skills' | 'compliance' | 'process';

interface Training {
  id: string;
  employeeId: string;
  title: string;
  provider: string;
  category: TrainingCategory;
  type: TrainingType;
  startDate: string;
  completionDate: string | null;
  status: TrainingStatus;
  hours: number;
  completedHours: number;
  certificate: boolean;
}

type CertStatus = 'active';
type CertCategory = 'cloud' | 'soft-skills' | 'process';

interface Certification {
  id: string;
  employeeId: string;
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string;
  status: CertStatus;
  category: CertCategory;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';

const goals = goalsRaw as Goal[];
const selfAssessment = selfAssessmentRaw as SelfAssessment;
const performanceReviews = performanceReviewsRaw as PerformanceReview[];
const feedbackItems = feedbackRaw as FeedbackItem[];
const trainings = trainingsRaw as Training[];
const certifications = certificationsRaw as Certification[];

const CARD =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  qualityOfWork: 'Quality of Work',
  productivity: 'Productivity',
  communication: 'Communication',
  teamwork: 'Teamwork',
  leadership: 'Leadership',
  initiative: 'Initiative',
  technicalSkills: 'Technical Skills',
  attendance: 'Attendance',
};

const COMPETENCY_KEYS: CompetencyKey[] = [
  'qualityOfWork',
  'productivity',
  'communication',
  'teamwork',
  'leadership',
  'initiative',
  'technicalSkills',
  'attendance',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00') < new Date();
}

function isExpiringSoon(dateStr: string): boolean {
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const expiry = new Date(dateStr + 'T00:00:00');
  return expiry > new Date() && expiry <= sixMonths;
}

function formatLastSaved(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

// ─── Star Display ──────────────────────────────────────────────────────────────

function StarDisplay({ rating, max = 5, size = 'sm' }: { rating: number; max?: number; size?: 'sm' | 'md' | 'lg' }) {
  const starSize = size === 'lg' ? 20 : size === 'md' ? 16 : 13;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={starSize}
          className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}
        />
      ))}
    </span>
  );
}

// ─── Star Input (clickable) ────────────────────────────────────────────────────

function StarInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < (hover || value);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i + 1)}
            onMouseEnter={() => !disabled && setHover(i + 1)}
            onMouseLeave={() => !disabled && setHover(0)}
            className="focus:outline-none disabled:cursor-not-allowed"
            aria-label={`Rate ${i + 1} out of 5`}
          >
            <Star
              size={18}
              className={
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
              }
            />
          </button>
        );
      })}
    </span>
  );
}

// ─── Category Badge ────────────────────────────────────────────────────────────

const GOAL_CATEGORY_STYLES: Record<GoalCategory, { bg: string; text: string; label: string }> = {
  technical: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', label: 'Technical' },
  learning: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', label: 'Learning' },
  leadership: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', label: 'Leadership' },
};

const GOAL_STATUS_STYLES: Record<GoalStatus, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', label: 'Completed' },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', label: 'In Progress' },
};

// ─── Tab 1: My Goals ───────────────────────────────────────────────────────────

function MyGoalsTab() {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const overallProgress =
    goals.length > 0
      ? Math.round((goals.filter((g) => g.progress === 100).length / goals.length) * 100)
      : 0;

  function toggleExpand(id: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {/* Header row */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Q4 2023 Goals</p>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {completedCount}/{goals.length} completed
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{overallProgress}% of goals completed</p>
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {goals.map((goal, i) => {
          const catStyle = GOAL_CATEGORY_STYLES[goal.category];
          const statusStyle = GOAL_STATUS_STYLES[goal.status];
          const isExpanded = expandedGoals.has(goal.id);
          const overdue = goal.status !== 'completed' && isOverdue(goal.targetDate);

          return (
            <motion.div key={goal.id} {...fadeUp(i + 1)} className={CARD}>
              <div className="flex items-start gap-3">
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${catStyle.bg} ${catStyle.text}`}>
                      {catStyle.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white mb-1">{goal.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {goal.description}
                  </p>

                  {/* Progress bar */}
                  <div className="mb-1.5">
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${goal.progress === 100 ? 'bg-emerald-500' : 'bg-blue-700'}`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-gray-400">{goal.progress}% complete</span>
                      <span className={`text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                        Due {formatDate(goal.targetDate)}
                        {overdue && ' (Overdue)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(goal.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors mt-0.5"
                  aria-label="Toggle key results"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {/* Key Results (collapsible) */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Key Results
                  </p>
                  <ul className="space-y-1.5">
                    {goal.keyResults.map((kr, ki) => {
                      const done = goal.progress === 100 || kr.toLowerCase().includes('(done)');
                      return (
                        <li key={ki} className="flex items-start gap-2">
                          <CheckCircle2
                            size={14}
                            className={`shrink-0 mt-0.5 ${done ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                          />
                          <span className={`text-xs ${done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}`}>
                            {kr}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Tab 2: Self-Assessment ────────────────────────────────────────────────────

function SelfAssessmentTab() {
  const [ratings, setRatings] = useState<Record<CompetencyKey, number>>(selfAssessment.ratings);
  const [accomplishments, setAccomplishments] = useState(selfAssessment.accomplishments);
  const [improvements, setImprovements] = useState(selfAssessment.improvements);
  const [careerGoals, setCareerGoals] = useState(selfAssessment.careerGoals);
  const [status, setStatus] = useState<AssessmentStatus>(selfAssessment.status);
  const [lastSaved, setLastSaved] = useState(selfAssessment.lastSaved);

  const isSubmitted = status === 'submitted';

  function handleRatingChange(key: CompetencyKey, val: number) {
    if (isSubmitted) return;
    setRatings((prev) => ({ ...prev, [key]: val }));
  }

  function handleSaveDraft() {
    const now = new Date().toISOString();
    setLastSaved(now);
    toast.success('Draft saved');
  }

  function handleSubmit() {
    setStatus('submitted');
    setLastSaved(new Date().toISOString());
    toast.success('Self-assessment submitted for manager review');
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-5 max-w-3xl">
      {/* Cycle banner */}
      <div className={`${CARD} bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{selfAssessment.cycleName}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Due {formatDate(selfAssessment.dueDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                isSubmitted
                  ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}
            >
              {isSubmitted ? 'Submitted' : 'Draft'}
            </span>
            <span className="text-[11px] text-blue-500 dark:text-blue-400">
              Auto-saved {formatLastSaved(lastSaved)}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Competency Ratings */}
      <div className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Competency Ratings</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          Rate yourself on each competency from 1 (needs improvement) to 5 (exceptional).
        </p>
        <div className="space-y-4">
          {COMPETENCY_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[160px]">
                {COMPETENCY_LABELS[key]}
              </label>
              <div className="flex items-center gap-3">
                <StarInput
                  value={ratings[key]}
                  onChange={(v) => handleRatingChange(key, v)}
                  disabled={isSubmitted}
                />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-8 text-right tabular-nums">
                  {ratings[key]}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Written Responses */}
      <div className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Written Responses</p>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5" htmlFor="sa-accomplishments">
              Key Accomplishments this period <span className="text-red-500">*</span>
            </label>
            <textarea
              id="sa-accomplishments"
              rows={4}
              disabled={isSubmitted}
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Describe your key accomplishments..."
            />
            {accomplishments.length < 20 && (
              <p className="text-xs text-amber-600 mt-1">Minimum 20 characters required</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5" htmlFor="sa-improvements">
              Areas for Improvement
            </label>
            <textarea
              id="sa-improvements"
              rows={3}
              disabled={isSubmitted}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="What would you like to improve?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5" htmlFor="sa-career-goals">
              Career Goals
            </label>
            <textarea
              id="sa-career-goals"
              rows={3}
              disabled={isSubmitted}
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Describe your career goals..."
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          disabled={isSubmitted}
          onClick={handleSaveDraft}
          className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={isSubmitted || accomplishments.length < 20}
          onClick={handleSubmit}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Self-Assessment
        </button>
        {isSubmitted && (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            Submitted — awaiting manager review.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tab 3: My Reviews ─────────────────────────────────────────────────────────

function MyReviewsTab() {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (performanceReviews.length === 0) {
    return (
      <motion.div {...fadeUp(0)} className={`${CARD} py-16 text-center`}>
        <Award size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No performance reviews yet</p>
        <p className="text-xs text-gray-400 mt-1">Your completed reviews will appear here.</p>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {performanceReviews.map((review, i) => {
        const isExpanded = expandedReviews.has(review.id);
        return (
          <motion.div key={review.id} {...fadeUp(i)} className={CARD}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">{review.cycleName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reviewed {formatDate(review.reviewDate)} &middot; by {review.managerName}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 capitalize">
                  {review.status}
                </span>
                <button
                  type="button"
                  onClick={() => toggleExpand(review.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                  aria-label="Toggle review details"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {/* Final Rating */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                {review.finalRating.toFixed(1)}
              </span>
              <div>
                <StarDisplay rating={review.finalRating} size="md" />
                <p className="text-[11px] text-gray-400 mt-0.5">/ 5.0 Final Rating</p>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                {/* Manager comments */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Manager Comments
                  </p>
                  <blockquote className="border-l-3 border-blue-400 pl-4 py-1 bg-blue-50 dark:bg-blue-950 rounded-r-xl">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      &ldquo;{review.managerComments}&rdquo;
                    </p>
                  </blockquote>
                </div>

                {/* Strengths + Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      Strengths
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{review.strengths}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      Areas for Improvement
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{review.improvements}</p>
                  </div>
                </div>

                {/* Ratings comparison table */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Ratings Comparison
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/60">
                          {['Competency', 'Self', 'Manager', 'Diff'].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {COMPETENCY_KEYS.map((key) => {
                          const selfR = review.selfRatings[key];
                          const mgrR = review.managerRatings[key];
                          const diff = mgrR - selfR;
                          return (
                            <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                {COMPETENCY_LABELS[key]}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">{selfR}/5</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">{mgrR}/5</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`text-xs font-bold tabular-nums ${
                                    diff > 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : diff < 0
                                      ? 'text-red-500 dark:text-red-400'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Print/Download */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toast.info('Downloading review...')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Printer size={13} />
                    Print / Download
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── Tab 4: Feedback Received ──────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  technical:     { bg: 'bg-blue-100 dark:bg-blue-950',    text: 'text-blue-700 dark:text-blue-300' },
  quality:       { bg: 'bg-indigo-100 dark:bg-indigo-950',text: 'text-indigo-700 dark:text-indigo-300' },
  initiative:    { bg: 'bg-violet-100 dark:bg-violet-950',text: 'text-violet-700 dark:text-violet-300' },
  communication: { bg: 'bg-cyan-100 dark:bg-cyan-950',    text: 'text-cyan-700 dark:text-cyan-300' },
  teamwork:      { bg: 'bg-teal-100 dark:bg-teal-950',    text: 'text-teal-700 dark:text-teal-300' },
  helpful:       { bg: 'bg-green-100 dark:bg-green-950',  text: 'text-green-700 dark:text-green-300' },
  mentoring:     { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
  leadership:    { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300' },
  patience:      { bg: 'bg-orange-100 dark:bg-orange-950',text: 'text-orange-700 dark:text-orange-300' },
  collaboration: { bg: 'bg-rose-100 dark:bg-rose-950',    text: 'text-rose-700 dark:text-rose-300' },
  responsiveness:{ bg: 'bg-pink-100 dark:bg-pink-950',    text: 'text-pink-700 dark:text-pink-300' },
};

function tagColor(tag: string): { bg: string; text: string } {
  return TAG_COLORS[tag] ?? { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function FeedbackReceivedTab() {
  const [filter, setFilter] = useState<'all' | FeedbackType>('all');

  const filtered = feedbackItems.filter((fb) => filter === 'all' || fb.type === filter);

  const avgRating =
    feedbackItems.length > 0
      ? feedbackItems.reduce((s, fb) => s + fb.rating, 0) / feedbackItems.length
      : 0;

  const managerCount = feedbackItems.filter((fb) => fb.type === 'manager').length;
  const peerCount = feedbackItems.filter((fb) => fb.type === 'peer').length;

  const filterChips: { value: 'all' | FeedbackType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'manager', label: 'Manager' },
    { value: 'peer', label: 'Peer' },
  ];

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {/* Summary row */}
      <div className={CARD}>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Avg rating display */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {avgRating.toFixed(1)}
              </span>
            </div>
            <div>
              <StarDisplay rating={avgRating} size="md" />
              <p className="text-xs text-gray-400 mt-0.5">Avg from {feedbackItems.length} feedback</p>
            </div>
          </div>

          {/* Type breakdown */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-center">
              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{managerCount}</p>
              <p className="text-[11px] text-gray-400">Manager</p>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">{peerCount}</p>
              <p className="text-[11px] text-gray-400">Peer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {filterChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setFilter(chip.value)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
              filter === chip.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Feedback cards */}
      <div className="space-y-3">
        {filtered.map((fb, i) => {
          const isManager = fb.type === 'manager';
          return (
            <motion.div key={fb.id} {...fadeUp(i)} className={CARD}>
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    isManager
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  {getInitials(fb.fromName)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fb.fromName}</p>
                      <p className="text-[11px] text-gray-400">{fb.fromRole} &middot; {formatDate(fb.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StarDisplay rating={fb.rating} size="sm" />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isManager
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {isManager ? 'Manager' : 'Peer'}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
                    {fb.message}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {fb.tags.map((tag) => {
                      const tc = tagColor(tag);
                      return (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${tc.bg} ${tc.text}`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Tab 5: Training & Certifications ─────────────────────────────────────────

const TRAINING_CATEGORY_STYLES: Record<TrainingCategory, { bg: string; text: string; label: string }> = {
  technical:    { bg: 'bg-blue-100 dark:bg-blue-950',   text: 'text-blue-700 dark:text-blue-300',   label: 'Technical' },
  'soft-skills':{ bg: 'bg-purple-100 dark:bg-purple-950',text: 'text-purple-700 dark:text-purple-300',label: 'Soft Skills' },
  compliance:   { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-700 dark:text-red-300',     label: 'Compliance' },
  process:      { bg: 'bg-teal-100 dark:bg-teal-950',   text: 'text-teal-700 dark:text-teal-300',   label: 'Process' },
};

const TRAINING_TYPE_STYLES: Record<TrainingType, { bg: string; text: string; label: string }> = {
  online:      { bg: 'bg-cyan-100 dark:bg-cyan-950',    text: 'text-cyan-700 dark:text-cyan-300',   label: 'Online' },
  'in-person': { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300', label: 'In-Person' },
  workshop:    { bg: 'bg-emerald-100 dark:bg-emerald-950',text: 'text-emerald-700 dark:text-emerald-300',label: 'Workshop' },
};

const TRAINING_STATUS_STYLES: Record<TrainingStatus, { bg: string; text: string; label: string }> = {
  completed:   { bg: 'bg-green-100 dark:bg-green-950',  text: 'text-green-700 dark:text-green-300', label: 'Completed' },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-950',  text: 'text-amber-700 dark:text-amber-300', label: 'In Progress' },
};

const CERT_CATEGORY_ICONS: Record<CertCategory, LucideIcon> = {
  cloud:        Cloud,
  'soft-skills':MessageSquare,
  process:      Layers,
};

const CERT_CATEGORY_STYLES: Record<CertCategory, { bg: string; text: string }> = {
  cloud:        { bg: 'bg-blue-100 dark:bg-blue-950',   text: 'text-blue-600 dark:text-blue-400' },
  'soft-skills':{ bg: 'bg-purple-100 dark:bg-purple-950',text: 'text-purple-600 dark:text-purple-400' },
  process:      { bg: 'bg-teal-100 dark:bg-teal-950',   text: 'text-teal-600 dark:text-teal-400' },
};

type TrainingFilter = 'all' | TrainingStatus | TrainingCategory;

function TrainingCertificationsTab() {
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>('all');

  const filteredTrainings = trainings.filter((t) => {
    if (trainingFilter === 'all') return true;
    if (trainingFilter === 'in_progress' || trainingFilter === 'completed') return t.status === trainingFilter;
    return t.category === trainingFilter;
  });

  const totalHoursCompleted = trainings
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + t.completedHours, 0);
  const inProgressCount = trainings.filter((t) => t.status === 'in_progress').length;

  const trainingFilterChips: { value: TrainingFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'technical', label: 'Technical' },
    { value: 'soft-skills', label: 'Soft Skills' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'process', label: 'Process' },
  ];

  return (
    <motion.div {...fadeUp(0)} className="space-y-6">
      {/* Training History section */}
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Training History</p>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {trainingFilterChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setTrainingFilter(chip.value)}
              className={[
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
                trainingFilter === chip.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400',
              ].join(' ')}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Training cards */}
        <div className="space-y-3">
          {filteredTrainings.map((training, i) => {
            const catStyle = TRAINING_CATEGORY_STYLES[training.category];
            const typeStyle = TRAINING_TYPE_STYLES[training.type];
            const statusStyle = TRAINING_STATUS_STYLES[training.status];
            const progressPct = training.hours > 0
              ? Math.round((training.completedHours / training.hours) * 100)
              : 0;

            return (
              <motion.div key={training.id} {...fadeUp(i)} className={CARD}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white mb-0.5">
                      {training.title}
                    </p>
                    <p className="text-xs text-gray-400 mb-2">{training.provider}</p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${catStyle.bg} ${catStyle.text}`}>
                        {catStyle.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                        {typeStyle.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-1.5">
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${training.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-700'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {training.completedHours} of {training.hours} hours
                      </p>
                    </div>

                    {training.completionDate && (
                      <p className="text-[11px] text-gray-400">
                        Completed {formatDate(training.completionDate)}
                      </p>
                    )}
                  </div>

                  {/* Certificate badge */}
                  {training.certificate && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-[11px] font-semibold border border-green-200 dark:border-green-800">
                      <GraduationCap size={12} />
                      Certificate Earned
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {filteredTrainings.length === 0 && (
            <div className={`${CARD} py-10 text-center`}>
              <BookOpen size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No trainings match this filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Certifications section */}
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Certifications</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certifications.map((cert, i) => {
            const CertIcon = CERT_CATEGORY_ICONS[cert.category] ?? Shield;
            const certCatStyle = CERT_CATEGORY_STYLES[cert.category];
            const expiringSoon = cert.expiryDate ? isExpiringSoon(cert.expiryDate) : false;
            const expired = cert.expiryDate
              ? new Date(cert.expiryDate + 'T00:00:00') < new Date()
              : false;

            return (
              <motion.div key={cert.id} {...fadeUp(i)} className={CARD}>
                <div className="flex items-start gap-3">
                  {/* Icon circle */}
                  <div className={`shrink-0 p-2.5 rounded-xl ${certCatStyle.bg}`}>
                    <CertIcon size={20} className={certCatStyle.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{cert.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cert.issuingOrg}</p>

                    <div className="mt-2 space-y-0.5">
                      <p className="text-[11px] text-gray-400">
                        Issued: <span className="font-medium text-gray-600 dark:text-gray-300">{formatDate(cert.issueDate)}</span>
                      </p>
                      {cert.expiryDate ? (
                        <p className={`text-[11px] font-medium ${expired ? 'text-red-500' : expiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                          Expires: {formatDate(cert.expiryDate)}
                          {expiringSoon && !expired && ' (Expiring soon)'}
                          {expired && ' (Expired)'}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400">No expiry</p>
                      )}
                    </div>

                    <p className="text-[10px] font-mono text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg inline-block">
                      {cert.credentialId}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 capitalize">
                    {cert.status}
                  </span>
                </div>

                {/* View credential button */}
                <button
                  type="button"
                  onClick={() => toast.info('Opening credential...')}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink size={12} />
                  View Credential
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Learning Summary */}
      <div className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Learning Summary</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
              {totalHoursCompleted}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Training Hours Completed</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 tabular-nums">
              {certifications.length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Certifications Held</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {inProgressCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">In-Progress Trainings</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('goals');

  // Latest review rating
  const latestReview = performanceReviews[0];

  const tabs = [
    { value: 'goals',       label: 'My Goals',         icon: <Target size={15} /> },
    { value: 'assessment',  label: 'Self-Assessment',  icon: <MessageSquare size={15} /> },
    { value: 'reviews',     label: 'My Reviews',       icon: <Award size={15} /> },
    { value: 'feedback',    label: 'Feedback Received',icon: <Star size={15} /> },
    { value: 'training',    label: 'Training & Certs', icon: <BookOpen size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">My Performance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Goals, assessments, reviews, and growth tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Current cycle badge */}
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Clock size={13} />
            Q4 2023 — Self-Assessment Due Nov 30
          </span>

          {/* Latest rating */}
          {latestReview && (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              Last Rating: {latestReview.finalRating.toFixed(1)} / 5.0
            </span>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="goals">
          <MyGoalsTab />
        </TabsContent>

        <TabsContent value="assessment">
          <SelfAssessmentTab />
        </TabsContent>

        <TabsContent value="reviews">
          <MyReviewsTab />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackReceivedTab />
        </TabsContent>

        <TabsContent value="training">
          <TrainingCertificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
