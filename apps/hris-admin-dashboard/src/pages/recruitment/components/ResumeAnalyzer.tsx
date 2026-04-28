import { useState } from 'react';
import { ScanSearch, Loader2, ChevronDown, CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import jobsData from '@/data/mock/recruitment-jobs.json';

interface Job { id: string; title: string; department: string; requirements: string[]; qualifications: string[] }

interface Analysis {
  matchScore: number;
  recommendation: 'Strong Candidate' | 'Consider' | 'Not a Match';
  summary: string;
  skillsMatched: string[];
  skillsGaps: string[];
  strengths: string[];
  redFlags: string[];
  experienceYears: number | null;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2.5 flex-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-lg font-black ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
        {score}%
      </span>
    </div>
  );
}

function RecommendationBadge({ label }: { label: string }) {
  const cfg: Record<string, { color: string; icon: React.ElementType }> = {
    'Strong Candidate': { color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800', icon: CheckCircle2 },
    'Consider': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: MinusCircle },
    'Not a Match': { color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertCircle },
  };
  const { color, icon: Icon } = cfg[label] || cfg['Consider'];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export function ResumeAnalyzer() {
  const jobs = jobsData as Job[];
  const [cvText, setCvText] = useState('');
  const [selectedJob, setSelectedJob] = useState(jobs[0]?.id || '');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!cvText.trim()) { toast.error('Please paste the candidate CV text'); return; }
    if (!isGeminiAvailable()) { toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.'); return; }

    const job = jobs.find((j) => j.id === selectedJob);
    if (!job) { toast.error('Please select a job'); return; }

    setLoading(true);
    setAnalysis(null);

    const prompt = `Analyze this candidate's CV for the following job position.

JOB POSITION:
Title: ${job.title}
Department: ${job.department}
Requirements: ${job.requirements.join(', ')}
Qualifications: ${job.qualifications.join(', ')}

CANDIDATE CV:
${cvText.slice(0, 3000)}

Return a JSON object with EXACTLY this structure (no markdown, just raw JSON):
{
  "matchScore": <integer 0-100>,
  "recommendation": "<one of: Strong Candidate | Consider | Not a Match>",
  "summary": "<2-3 sentence candidate summary>",
  "experienceYears": <number or null>,
  "skillsMatched": ["<skill>", ...],
  "skillsGaps": ["<missing skill>", ...],
  "strengths": ["<strength>", ...],
  "redFlags": ["<concern>", ...]
}

Rules:
- matchScore 75+ = Strong Candidate, 50-74 = Consider, <50 = Not a Match
- skillsMatched: only skills explicitly found in CV that match requirements
- skillsGaps: required skills NOT found in CV
- strengths: max 4 bullet points
- redFlags: max 3 bullet points, only real concerns
- Be specific and honest, not generic`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('No client');
      const model = client.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      // Strip markdown code fences if present
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(text) as Analysis;
      setAnalysis(parsed);
      toast.success('Resume analysis complete');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('JSON')) {
        toast.error('AI returned unexpected format. Try again.');
      } else {
        toast.error(`AI error: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = () => {
    toast.success('Analysis saved to applicant record (demo)');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-0.5">Resume / CV Analyzer</h3>
          <p className="text-xs text-gray-400">Paste candidate CV text and select the target role — AI scores the match instantly.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Target Job Position</label>
          <div className="relative">
            <select
              title="Job"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full h-9 appearance-none px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
            >
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.department}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
            Candidate CV / Resume Text
          </label>
          <textarea
            placeholder="Paste the full CV text here…&#10;&#10;Example:&#10;Juan dela Cruz&#10;Software Engineer with 5 years of experience&#10;Skills: React, Node.js, PostgreSQL…"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 resize-none leading-relaxed"
          />
          <p className="text-[10px] text-gray-400 mt-1">{cvText.length} chars · max 3,000 processed</p>
        </div>

        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Analyzing Resume…</>
          ) : (
            <><ScanSearch size={16} />Analyze Resume</>
          )}
        </button>
      </div>

      {/* Output panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Analysis Results</h3>
          {analysis && (
            <button
              onClick={saveAnalysis}
              className="h-7 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Save to Record
            </button>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
            <p className="text-sm">AI is reading the CV…</p>
          </div>
        )}

        {!loading && !analysis && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400 min-h-[300px]">
            <ScanSearch size={32} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-center">Analysis results will appear here.<br />Paste a CV and click Analyze.</p>
          </div>
        )}

        {!loading && analysis && (
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[520px] pr-1">
            {/* Score */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Match Score</p>
                <RecommendationBadge label={analysis.recommendation} />
              </div>
              <ScoreBadge score={analysis.matchScore} />
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Summary</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
              {analysis.experienceYears !== null && (
                <p className="text-xs text-gray-400 mt-1">Experience: <span className="font-semibold text-gray-600 dark:text-gray-300">{analysis.experienceYears} year{analysis.experienceYears !== 1 ? 's' : ''}</span></p>
              )}
            </div>

            {/* Skills matched */}
            {analysis.skillsMatched.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Skills Matched</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.skillsMatched.map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills gaps */}
            {analysis.skillsGaps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Skill Gaps</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.skillsGaps.map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Strengths</p>
                <ul className="flex flex-col gap-1">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red flags */}
            {analysis.redFlags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Red Flags</p>
                <ul className="flex flex-col gap-1">
                  {analysis.redFlags.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
