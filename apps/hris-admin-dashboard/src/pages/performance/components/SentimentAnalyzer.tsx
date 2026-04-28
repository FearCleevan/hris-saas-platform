import { useState, useMemo } from 'react';
import { Brain, Loader2, ChevronDown, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import employeesData from '@/data/mock/employees.json';
import feedbackData from '@/data/mock/performance-feedback.json';

interface Feedback {
  revieweeId: string; type: string; anonymous: boolean;
  ratings: Record<string, number>; strengths: string; improvements: string;
}

interface SentimentResult {
  overall: 'Positive' | 'Neutral' | 'At Risk';
  score: number;
  themes: string[];
  positiveQuotes: string[];
  concernQuotes: string[];
  recommendation: string;
  actionRequired: boolean;
}

const SENTIMENT_CFG = {
  Positive:  { color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', icon: TrendingUp,   bar: 'bg-green-500' },
  Neutral:   { color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: Minus,        bar: 'bg-amber-500' },
  'At Risk': { color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200 dark:border-red-800',     icon: TrendingDown, bar: 'bg-red-500'   },
};

export function SentimentAnalyzer() {
  const feedbacks = feedbackData as Feedback[];
  const [selectedEmployee, setSelectedEmployee] = useState(employeesData[0].id);
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const employee = employeesData.find((e) => e.id === selectedEmployee)!;

  const empFeedbacks = useMemo(
    () => feedbacks.filter((f) => f.revieweeId === selectedEmployee),
    [selectedEmployee]
  );

  const analyze = async () => {
    if (empFeedbacks.length === 0) {
      toast.error('No feedback found for this employee');
      return;
    }
    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
      return;
    }

    setLoading(true);
    setResult(null);

    const feedbackLines = empFeedbacks.map((f, i) => `
Feedback ${i + 1} (${f.anonymous ? 'Anonymous' : f.type}):
  Avg Rating: ${(Object.values(f.ratings).reduce((s, v) => s + v, 0) / Object.keys(f.ratings).length).toFixed(1)}/5
  Strengths: ${f.strengths}
  Improvements: ${f.improvements}`).join('\n');

    const prompt = `Analyze the employee sentiment based on 360-degree feedback for a Philippine company employee.

EMPLOYEE: ${employee.name}
POSITION: ${employee.position}
DEPARTMENT: ${employee.department}
FEEDBACK COUNT: ${empFeedbacks.length} entries

FEEDBACK DATA:
${feedbackLines}

Return a JSON object with EXACTLY this structure (no markdown, just raw JSON):
{
  "overall": "<one of: Positive | Neutral | At Risk>",
  "score": <integer 0-100 representing sentiment positivity>,
  "themes": ["<key theme>", "<key theme>", "<key theme>"],
  "positiveQuotes": ["<notable positive quote or paraphrase>", "<another>"],
  "concernQuotes": ["<notable concern or paraphrase>"],
  "recommendation": "<1-2 sentence HR recommendation>",
  "actionRequired": <true if score < 50 or there are serious concerns, else false>
}

Rules:
- Positive: score 70-100 (majority of feedback is favorable, high ratings)
- Neutral: score 45-69 (mixed feedback, some concerns but balanced)
- At Risk: score 0-44 (significant negative patterns, low ratings, multiple concerns)
- themes: max 4 short keyword phrases (e.g. "Strong technical skills", "Attendance concerns")
- positiveQuotes: max 3, pick the most impactful positive observations
- concernQuotes: max 2, pick the most significant improvement needs
- recommendation: specific, actionable, professional tone`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('No client');
      const model = client.getGenerativeModel({ model: GEMINI_MODEL });
      const res = await model.generateContent(prompt);
      let text = res.response.text().trim();
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(text) as SentimentResult;
      setResult(parsed);
      toast.success('Sentiment analysis complete');
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

  const cfg = result ? SENTIMENT_CFG[result.overall] : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Employee Sentiment Analyzer</h3>
        <p className="text-xs text-gray-400 mb-4">
          Select an employee to analyze all their 360° feedback and get an AI-generated sentiment report.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Employee</label>
            <div className="relative">
              <select
                title="Employee"
                value={selectedEmployee}
                onChange={(e) => { setSelectedEmployee(e.target.value); setResult(null); }}
                className="w-full h-9 appearance-none px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                {employeesData.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} — {e.department}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
          <div className="text-xs text-gray-400">
            <span className="font-semibold text-gray-600 dark:text-gray-300">{empFeedbacks.length}</span> feedback entries found
          </div>
          <button
            onClick={analyze}
            disabled={loading || empFeedbacks.length === 0}
            className="flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shrink-0"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" />Analyzing…</>
            ) : result ? (
              <><RefreshCw size={14} />Re-analyze</>
            ) : (
              <><Brain size={14} />Analyze Sentiment</>
            )}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">Reading {empFeedbacks.length} feedback entries…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-2 text-gray-400">
          <Brain size={36} className="text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-center">Select an employee and click Analyze Sentiment<br />to generate their feedback report.</p>
        </div>
      )}

      {/* Results */}
      {!loading && result && cfg && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Overall gauge card */}
          <div className={`rounded-2xl p-5 border ${cfg.bg} ${cfg.border} flex flex-col gap-3`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                <cfg.icon size={20} className={cfg.color} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overall Sentiment</p>
                <p className={`text-xl font-extrabold ${cfg.color}`}>{result.overall}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Sentiment Score</span>
                <span className={`font-bold ${cfg.color}`}>{result.score}/100</span>
              </div>
              <div className="h-2.5 bg-white dark:bg-gray-900 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>
            {result.actionRequired && (
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">⚠️ HR Action Required</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Key Themes</p>
              <div className="flex flex-wrap gap-1.5">
                {result.themes.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quotes + recommendation */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {result.positiveQuotes.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Notable Strengths</p>
                <div className="flex flex-col gap-2">
                  {result.positiveQuotes.map((q, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{q}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.concernQuotes.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Areas of Concern</p>
                <div className="flex flex-col gap-2">
                  {result.concernQuotes.map((q, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 shrink-0">△</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{q}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`rounded-2xl p-4 border ${result.actionRequired ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${result.actionRequired ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                HR Recommendation
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.recommendation}</p>
              <button
                onClick={() => toast.success('Check-in meeting scheduled (demo)')}
                className={`mt-3 h-7 px-3 rounded-lg text-xs font-semibold text-white transition-colors ${result.actionRequired ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {result.actionRequired ? '🚨 Schedule Intervention' : '📅 Schedule Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
