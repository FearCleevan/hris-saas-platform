// src/pages/recruitment/RecruitmentPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Columns3, Users, CalendarClock, FileCheck, TrendingUp,
  Search, ChevronDown, Plus, Star, MapPin, Clock, Phone, Monitor,
  CheckCircle2, XCircle, Download, Eye, MessageSquare, Check, X,
  ArrowRight, ArrowLeft, Filter, Building,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import jobsData from '@/data/mock/recruitment-jobs.json';
import applicantsData from '@/data/mock/recruitment-applicants.json';
import pipelineData from '@/data/mock/recruitment-pipeline.json';
import interviewsData from '@/data/mock/recruitment-interviews.json';
import offersData from '@/data/mock/recruitment-offers.json';

/* ─── Types ─── */
type TabId = 'jobs' | 'pipeline' | 'applicants' | 'interviews' | 'offers' | 'analytics';

interface Job {
  id: string; title: string; department: string; type: string; location: string;
  salaryMin: number; salaryMax: number; experienceLevel: string;
  headcount: number; filled: number; postingDate: string; closingDate: string;
  status: string; description: string; requirements: string[];
  qualifications: string[]; applicantCount: number; source: string;
}

interface Applicant {
  id: string; jobId: string; firstName: string; lastName: string;
  email: string; phone: string; location: string; source: string;
  resumeUrl: string; coverLetter: string; applicationDate: string;
  stage: string; rating: number; ratings: Record<string, number>;
  tags: string[]; notes: string;
}

interface Interview {
  id: string; applicantId: string; jobId: string; type: string; date: string;
  time: string; duration: number; interviewers: string[];
  location: string; status: string; feedback: any;
}

interface Offer {
  id: string; applicantId: string; jobId: string; position: string;
  department: string; salaryOffered: number; salaryOriginal: number;
  benefitsSummary: string; startDate: string; offerDate: string;
  expiryDate: string; status: string; notes: string;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'pipeline', label: 'Pipeline', icon: Columns3 },
  { id: 'applicants', label: 'Applicants', icon: Users },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock },
  { id: 'offers', label: 'Offers', icon: FileCheck },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

const STAGE_CFG: Record<string, { label: string; color: string }> = {
  screening: { label: 'Screening', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  phone_interview: { label: 'Phone Interview', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' },
  technical_assessment: { label: 'Technical Assessment', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  on_site_interview: { label: 'On-site Interview', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  final_interview: { label: 'Final Interview', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' },
  offer: { label: 'Offer', color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
  hired: { label: 'Hired', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

const OFFER_STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  negotiated: { label: 'Negotiated', color: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500' },
};

const PIPELINE_STAGES = ['screening', 'phone_interview', 'technical_assessment', 'on_site_interview', 'final_interview', 'offer', 'hired'];

/* ─── Helpers ─── */
function peso(v: number) { return `₱${v.toLocaleString()}`; }
function getInitials(first: string, last: string) { return `${first[0]}${last[0]}`.toUpperCase(); }

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

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<TabId>('jobs');
  const [selectedJob, setSelectedJob] = useState<string>('job001');
  const [jobFilter, setJobFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [search, setSearch] = useState('');

  const jobs = jobsData as Job[];
  const applicants = applicantsData as Applicant[];
  const interviews = interviewsData as Interview[];
  const offers = offersData as Offer[];

  const selectedJobData = useMemo(() => jobs.find(j => j.id === selectedJob)!, [selectedJob]);

  /* ─── Jobs Tab ─── */
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => jobFilter === 'All' || j.status === jobFilter);
  }, [jobFilter]);

  const jobKPIs = useMemo(() => ({
    active: jobs.filter(j => j.status === 'active').length,
    totalApplicants: jobs.reduce((s, j) => s + j.applicantCount, 0),
    openPositions: jobs.filter(j => j.status === 'active').reduce((s, j) => s + (j.headcount - j.filled), 0),
    avgTimeToFill: 28,
  }), []);

  /* ─── Pipeline Tab ─── */
  const pipelineApplicants = useMemo(() => {
    return applicants.filter(a => a.jobId === selectedJob && a.stage !== 'rejected');
  }, [selectedJob]);

  const applicantsByStage = useMemo(() => {
    const map: Record<string, Applicant[]> = {};
    PIPELINE_STAGES.forEach(s => { map[s] = []; });
    pipelineApplicants.forEach(a => {
      if (map[a.stage]) map[a.stage].push(a);
    });
    return map;
  }, [pipelineApplicants]);

  /* ─── Applicants Tab ─── */
  const filteredApplicants = useMemo(() => {
    const q = search.toLowerCase();
    return applicants.filter(a => {
      const job = jobs.find(j => j.id === a.jobId);
      if (jobFilter !== 'All' && a.jobId !== jobFilter) return false;
      if (stageFilter !== 'All' && a.stage !== stageFilter) return false;
      if (q && !`${a.firstName} ${a.lastName}`.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q) && !a.tags.some(t => t.includes(q))) return false;
      return true;
    }).map(a => {
      const job = jobs.find(j => j.id === a.jobId);
      return { ...a, job };
    });
  }, [jobFilter, stageFilter, search]);

  const applicantKPIs = useMemo(() => ({
    total: applicants.length,
    shortlisted: applicants.filter(a => ['on_site_interview', 'final_interview', 'offer'].includes(a.stage)).length,
    interviewed: applicants.filter(a => ['on_site_interview', 'final_interview'].includes(a.stage) || a.stage === 'offer' || a.stage === 'hired').length,
    hired: applicants.filter(a => a.stage === 'hired').length,
  }), []);

  /* ─── Interviews Tab ─── */
  const upcomingInterviews = useMemo(() => interviews.filter(i => i.status === 'scheduled').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(i => {
    const app = applicants.find(a => a.id === i.applicantId);
    const job = jobs.find(j => j.id === i.jobId);
    const interviewersList = i.interviewers.map(id => employeesData.find(e => e.id === id)).filter(Boolean);
    return { ...i, app, job, interviewersList };
  }), []);

  const completedInterviews = useMemo(() => interviews.filter(i => i.status === 'completed').map(i => {
    const app = applicants.find(a => a.id === i.applicantId);
    return { ...i, app };
  }), []);

  /* ─── Offers Tab ─── */
  const offerKPIs = useMemo(() => ({
    total: offers.length,
    accepted: offers.filter(o => o.status === 'accepted').length,
    pending: offers.filter(o => o.status === 'sent' || o.status === 'draft').length,
    rate: Math.round((offers.filter(o => o.status === 'accepted').length / Math.max(offers.filter(o => o.status !== 'draft').length, 1)) * 100),
  }), []);

  /* ─── Analytics Tab ─── */
  const analytics = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    applicants.forEach(a => { sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1; });
    const sources = Object.entries(sourceCounts).map(([name, count]) => ({ name, count }));
    const maxSource = Math.max(...sources.map(s => s.count), 1);

    const monthlyApps = [8, 12, 5, 10, 7, 15];
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    const maxMonthly = Math.max(...monthlyApps, 1);

    const stageCounts = PIPELINE_STAGES.map(s => applicants.filter(a => a.stage === s).length);
    const totalInPipeline = stageCounts.reduce((s, c) => s + c, 0);

    return { sources, maxSource, monthlyApps, months, maxMonthly, stageCounts, totalInPipeline };
  }, []);

  /* ─── Render ─── */
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Recruitment (ATS)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {jobKPIs.active} active jobs · {jobKPIs.openPositions} open positions · {jobKPIs.totalApplicants} total applicants
          </p>
        </div>
        <button onClick={() => toast.success('New job posting created')} className="px-4 py-2 bg-[#0038a8] text-white text-xs font-semibold rounded-xl hover:bg-[#002d8a]">
          <Plus className="w-3.5 h-3.5 inline mr-1" />Post New Job
        </button>
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => { const Icon = tab.icon; return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-[#0038a8] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Icon className="w-4 h-4" />{tab.label}
          </button>
        );})}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

          {/* ===== JOBS TAB ===== */}
          {activeTab === 'jobs' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Active Jobs" value={jobKPIs.active} icon={Briefcase} />
                <KpiCard label="Total Applicants" value={jobKPIs.totalApplicants} icon={Users} />
                <KpiCard label="Open Positions" value={jobKPIs.openPositions} icon={Building} />
                <KpiCard label="Avg Time-to-Fill" value={`${jobKPIs.avgTimeToFill}d`} icon={Clock} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <select title='Select' value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="All">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400 ml-auto">{filteredJobs.length} jobs</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobs.map((job, i) => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{job.title}</p>
                        <p className="text-xs text-gray-400">{job.department} · {job.type} · {job.location}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${job.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : job.status === 'draft' ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div><span className="text-gray-400">Salary:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{peso(job.salaryMin)}-{peso(job.salaryMax)}</span></div>
                      <div><span className="text-gray-400">Experience:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{job.experienceLevel}</span></div>
                      <div><span className="text-gray-400">Headcount:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{job.filled}/{job.headcount} filled</span></div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{job.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>Posted: {format(new Date(job.postingDate), 'MMM d')} · Closes: {format(new Date(job.closingDate), 'MMM d')}</span>
                      <span>{job.applicantCount} applicants</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ===== PIPELINE TAB (KANBAN) ===== */}
          {activeTab === 'pipeline' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold text-gray-500">Job:</label>
                <div className="relative">
                  <select title='Select' value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    {jobs.filter(j => j.status === 'active').map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">{pipelineApplicants.length} candidates in pipeline</span>
              </div>
              <div className="overflow-x-auto pb-3">
                <div className="flex gap-3" style={{ minWidth: '1050px' }}>
                  {PIPELINE_STAGES.map(stage => {
                    const stageCfg = STAGE_CFG[stage] || { label: stage, color: 'bg-gray-100 text-gray-600' };
                    const stageApps = applicantsByStage[stage] || [];
                    return (
                      <div key={stage} className="flex-1 min-w-[140px]">
                        <div className={`rounded-xl px-3 py-2 mb-2 ${stageCfg.color.split(' ')[0]} bg-opacity-20`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{stageCfg.label}</span>
                            <span className="text-xs font-bold">{stageApps.length}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {stageApps.map(app => (
                            <div key={app.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 hover:border-[#0038a8]/40 transition-colors cursor-pointer">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[9px] font-bold">{getInitials(app.firstName, app.lastName)}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-gray-800 dark:text-white truncate">{app.firstName} {app.lastName}</p>
                                </div>
                              </div>
                              <RatingStars value={app.rating} />
                              {app.tags.slice(0, 2).map(tag => <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 mr-1">{tag}</span>)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== APPLICANTS TAB ===== */}
          {activeTab === 'applicants' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total" value={applicantKPIs.total} icon={Users} />
                <KpiCard label="Shortlisted" value={applicantKPIs.shortlisted} icon={Star} color="bg-amber-500" />
                <KpiCard label="Interviewed" value={applicantKPIs.interviewed} icon={CalendarClock} />
                <KpiCard label="Hired" value={applicantKPIs.hired} icon={CheckCircle2} color="bg-green-500" />
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative">
                  <select title='Select' value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="All">All Jobs</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <select title='Select' value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                    <option value="All">All Stages</option>
                    {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_CFG[s]?.label || s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 pr-3 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                </div>
                <span className="text-xs text-gray-400 ml-auto">{filteredApplicants.length} applicants</span>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Applicant</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Job</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Stage</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Rating</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplicants.map((a, i) => {
                        const stCfg = STAGE_CFG[a.stage] || STAGE_CFG.screening;
                        return (
                          <tr key={a.id} className={`${i < filteredApplicants.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold">{getInitials(a.firstName, a.lastName)}</div>
                                <div><p className="text-xs font-semibold text-gray-800 dark:text-white">{a.firstName} {a.lastName}</p><p className="text-[9px] text-gray-400">{a.email}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{a.job?.title || '—'}</td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stCfg.color}`}>{stCfg.label}</span></td>
                            <td className="px-4 py-2.5 text-center"><RatingStars value={a.rating} /></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{a.source}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(a.applicationDate), 'MMM d')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== INTERVIEWS TAB ===== */}
          {activeTab === 'interviews' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                <KpiCard label="Upcoming" value={upcomingInterviews.length} icon={CalendarClock} color="bg-blue-500" />
                <KpiCard label="Completed" value={completedInterviews.length} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="This Week" value={upcomingInterviews.filter(i => differenceInDays(new Date(i.date), new Date('2023-11-24')) <= 7).length} icon={Clock} />
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">Upcoming Interviews ({upcomingInterviews.length})</p>
              <div className="flex flex-col gap-3 mb-5">
                {upcomingInterviews.map((intv, i) => (
                  <div key={intv.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold">{intv.app ? getInitials(intv.app.firstName, intv.app.lastName) : '?'}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{intv.app?.firstName} {intv.app?.lastName}</p>
                          <p className="text-xs text-gray-400">{intv.job?.title} · {intv.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{format(new Date(intv.date), 'MMM d')} · {intv.time}</p>
                        <p className="text-[10px] text-gray-400">{intv.duration}min · {intv.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                      <span>Interviewers: {intv.interviewersList.map((e: any) => e?.name || 'Unknown').join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== OFFERS TAB ===== */}
          {activeTab === 'offers' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Offers" value={offerKPIs.total} icon={FileCheck} />
                <KpiCard label="Accepted" value={offerKPIs.accepted} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="Pending" value={offerKPIs.pending} icon={Clock} color="bg-amber-500" />
                <KpiCard label="Acceptance Rate" value={`${offerKPIs.rate}%`} icon={TrendingUp} color={offerKPIs.rate >= 75 ? 'bg-green-500' : 'bg-amber-500'} />
              </div>
              <div className="flex flex-col gap-3">
                {offers.map((off, i) => {
                  const stCfg = OFFER_STATUS_CFG[off.status] || OFFER_STATUS_CFG.draft;
                  const app = applicants.find(a => a.id === off.applicantId);
                  return (
                    <motion.div key={off.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{app?.firstName} {app?.lastName} — {off.position}</p>
                          <p className="text-xs text-gray-400">{off.department}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stCfg.color}`}>{stCfg.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                        <div><span className="text-gray-400">Salary:</span> <span className="font-bold text-gray-700">{peso(off.salaryOffered)}</span></div>
                        {off.startDate && <div><span className="text-gray-400">Start:</span> <span className="font-semibold text-gray-700">{format(new Date(off.startDate), 'MMM d')}</span></div>}
                        {off.offerDate && <div><span className="text-gray-400">Sent:</span> <span className="font-semibold text-gray-700">{format(new Date(off.offerDate), 'MMM d')}</span></div>}
                        {off.expiryDate && <div><span className="text-gray-400">Expires:</span> <span className="font-semibold text-gray-700">{format(new Date(off.expiryDate), 'MMM d')}</span></div>}
                      </div>
                      <p className="text-[10px] text-gray-400">{off.benefitsSummary}</p>
                      {off.status === 'negotiated' && <p className="text-xs text-amber-600 mt-1">Original: {peso(off.salaryOriginal)} → Negotiated: {peso(off.salaryOffered)}</p>}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== ANALYTICS TAB ===== */}
          {activeTab === 'analytics' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiCard label="Total Applicants" value={applicantKPIs.total} icon={Users} />
                <KpiCard label="In Pipeline" value={analytics.totalInPipeline} icon={Columns3} />
                <KpiCard label="Hired" value={applicantKPIs.hired} icon={CheckCircle2} color="bg-green-500" />
                <KpiCard label="Offer Acceptance" value={`${offerKPIs.rate}%`} icon={TrendingUp} color="bg-blue-500" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Pipeline Funnel</h3>
                  <div className="flex flex-col gap-2">
                    {PIPELINE_STAGES.map((stage, i) => {
                      const count = analytics.stageCounts[i];
                      const pct = analytics.totalInPipeline > 0 ? Math.round((count / analytics.totalInPipeline) * 100) : 0;
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-32">{STAGE_CFG[stage]?.label}</span>
                          <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0038a8] rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 3)}%` }}>
                              <span className="text-[9px] font-bold text-white">{count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Source Effectiveness</h3>
                  <div className="flex flex-col gap-2">
                    {analytics.sources.map(src => (
                      <div key={src.name} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20">{src.name}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full flex items-center justify-end pr-2 ${src.name === 'LinkedIn' ? 'bg-blue-500' : src.name === 'JobStreet' ? 'bg-amber-500' : src.name === 'Indeed' ? 'bg-indigo-500' : 'bg-green-500'}`} style={{ width: `${(src.count / analytics.maxSource) * 100}%` }}>
                            <span className="text-[9px] font-bold text-white">{src.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Applications Trend</h3>
                <div className="flex items-end gap-3 h-24">
                  {analytics.monthlyApps.map((count, i) => {
                    const pct = (count / analytics.maxMonthly) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-600">{count}</span>
                        <div className="w-full bg-[#0038a8] rounded-t-md" style={{ height: `${pct}%`, minHeight: '4px' }} />
                        <span className="text-[10px] text-gray-400">{analytics.months[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}