import { useState, useMemo } from 'react';
import { Brain, Loader2, Download, ChevronDown, TrendingUp, TrendingDown, Minus, RefreshCw, ShieldAlert } from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import employeesData from '@/data/mock/employees.json';
import reviewsData from '@/data/mock/performance-reviews.json';
import leaveData from '@/data/mock/leave-requests.json';
import overtimeData from '@/data/mock/overtime-requests.json';

interface Employee { id: string; name: string; position: string; department: string; status: string; hireDate: string; salary: number; type: string; }
interface Review { employeeId: string; finalRating: number; managerReview: { overallRating: number } }
interface LeaveRequest { employeeId: string; status: string; days: number; }
interface OvertimeRequest { employeeId: string; status: string; hours: number; }

interface RiskResult {
  employeeId: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  score: number;
  factors: string[];
  recommendation: string;
}

const RISK_CFG = {
  High:   { color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',    dot: 'bg-red-500',    icon: TrendingDown },
  Medium: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', icon: Minus },
  Low:    { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', dot: 'bg-green-500',   icon: TrendingUp },
};

function peso(v: number) { return `₱${v.toLocaleString()}`; }
function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }

export function AttritionRiskPredictor() {
  const employees = (employeesData as Employee[]).filter(e => e.status === 'active');
  const reviews   = reviewsData as Review[];
  const leaves    = leaveData as LeaveRequest[];
  const overtimes = overtimeData as OvertimeRequest[];

  const [results,     setResults]     = useState<RiskResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [riskFilter,  setRiskFilter]  = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [deptFilter,  setDeptFilter]  = useState('All');
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const NOW = new Date('2023-11-24');
  const departments = useMemo(() => ['All', ...new Set(employees.map(e => e.department))].sort(), [employees]);

  /* Build employee profiles for the prompt */
  const profiles = useMemo(() => {
    const deptSalaries: Record<string, number[]> = {};
    employees.forEach(e => {
      if (!deptSalaries[e.department]) deptSalaries[e.department] = [];
      deptSalaries[e.department].push(e.salary);
    });

    return employees.map(emp => {
      const tenureMonths    = differenceInMonths(NOW, new Date(emp.hireDate));
      const review          = reviews.filter(r => r.employeeId === emp.id).sort((a, b) => b.finalRating - a.finalRating)[0];
      const perfRating      = review ? review.finalRating : null;
      const leaveDays       = leaves.filter(l => l.employeeId === emp.id && l.status === 'approved').reduce((s, l) => s + l.days, 0);
      const leaveCount      = leaves.filter(l => l.employeeId === emp.id && l.status === 'approved').length;
      const otHours         = overtimes.filter(o => o.employeeId === emp.id && o.status === 'approved').reduce((s, o) => s + o.hours, 0);
      const deptSalArr      = deptSalaries[emp.department] ?? [];
      const salMedian       = deptSalArr.sort((a, b) => a - b)[Math.floor(deptSalArr.length / 2)] ?? emp.salary;
      const salBand         = emp.salary < salMedian * 0.85 ? 'Below Market' : emp.salary > salMedian * 1.15 ? 'Above Market' : 'At Market';

      return {
        id: emp.id, name: emp.name, position: emp.position, department: emp.department,
        type: emp.type, tenureMonths, salary: emp.salary, salBand,
        perfRating, leaveDays, leaveCount, otHours,
      };
    });
  }, [employees, reviews, leaves, overtimes, NOW]);

  const runPrediction = async () => {
    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
      return;
    }

    setLoading(true);
    setResults([]);
    setExpanded(null);

    const profileLines = profiles.map(p =>
      `ID:${p.id}|Name:${p.name}|Pos:${p.position}|Dept:${p.department}|Type:${p.type}|` +
      `Tenure:${p.tenureMonths}mo|Salary:${peso(p.salary)}(${p.salBand})|` +
      `PerfRating:${p.perfRating !== null ? `${p.perfRating}/5` : 'N/A'}|` +
      `LeaveDays:${p.leaveDays}(${p.leaveCount}x)|OTHours:${p.otHours}`
    ).join('\n');

    const prompt = `You are an HR analytics AI for a Philippine company. Predict the attrition risk for each employee based on their profile data.

EMPLOYEE PROFILES:
${profileLines}

Return a JSON array (no markdown) — one entry per employee:
[{
  "employeeId": "<id>",
  "riskLevel": "<High|Medium|Low>",
  "score": <integer 0-100 where 100 = certain to leave>,
  "factors": ["<key risk factor>", "<key risk factor>"],
  "recommendation": "<1-2 sentence HR action>"
}]

Risk classification:
- High (score 65-100): probationary or contractual nearing end, very short tenure (<6mo), low performance (<2.5), salary significantly below market, excessive leave or burnout (very high OT hours + high leave)
- Medium (score 35-64): below-market salary, low-medium performance, irregular leave patterns, 6-18mo tenure
- Low (score 0-34): long tenure (3+yr), above/at-market salary, strong performance, low leave and reasonable OT
- factors: max 3 short phrases per employee (e.g. "Short tenure (3 months)", "Below-market salary", "High OT burnout risk")
- recommendation: specific, actionable HR intervention

Note: For Philippine context — probationary period is 6 months; after that employees become regular. Contractual roles have higher attrition risk.`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('No client');
      const model = client.getGenerativeModel({ model: GEMINI_MODEL });
      const res   = await model.generateContent(prompt);
      let text = res.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(text) as RiskResult[];
      setResults(parsed.sort((a, b) => b.score - a.score));
      const high = parsed.filter(r => r.riskLevel === 'High').length;
      toast.success(`Prediction complete · ${high} high-risk employee${high !== 1 ? 's' : ''} identified`);
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

  const filtered = useMemo(() => {
    return results.filter(r => {
      if (riskFilter !== 'All' && r.riskLevel !== riskFilter) return false;
      const emp = employees.find(e => e.id === r.employeeId);
      if (deptFilter !== 'All' && emp?.department !== deptFilter) return false;
      return true;
    });
  }, [results, riskFilter, deptFilter, employees]);

  const exportCSV = () => {
    const headers = ['Name', 'Position', 'Department', 'Risk Level', 'Score', 'Tenure (mo)', 'Salary', 'Performance', 'Key Factors', 'Recommendation'];
    const rows = results.map(r => {
      const emp  = employees.find(e => e.id === r.employeeId);
      const prof = profiles.find(p => p.id === r.employeeId);
      return [
        `"${emp?.name ?? r.employeeId}"`, `"${emp?.position}"`, `"${emp?.department}"`,
        r.riskLevel, r.score, prof?.tenureMonths ?? '',
        emp?.salary ?? '', prof?.perfRating ?? 'N/A',
        `"${r.factors.join('; ')}"`, `"${r.recommendation}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attrition-risk-report.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Attrition risk report exported');
  };

  const counts = useMemo(() => ({
    high:   results.filter(r => r.riskLevel === 'High').length,
    medium: results.filter(r => r.riskLevel === 'Medium').length,
    low:    results.filter(r => r.riskLevel === 'Low').length,
  }), [results]);

  return (
    <div className="flex flex-col gap-5">

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">AI Attrition Risk Predictor</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Gemini analyzes tenure, performance, salary band, leave patterns, and overtime to predict flight risk for all {employees.length} active employees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              title="Risk level"
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value as typeof riskFilter)}
              className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>
          <div className="relative">
            <select
              title="Department"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 outline-none"
            >
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {results.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Download size={13} />Export CSV
              </button>
            )}
            <button
              onClick={runPrediction}
              disabled={loading}
              className="flex items-center gap-2 h-8 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            >
              {loading ? (
                <><Loader2 size={13} className="animate-spin" />Predicting…</>
              ) : results.length > 0 ? (
                <><RefreshCw size={13} />Re-run Prediction</>
              ) : (
                <><Brain size={13} />Run Prediction</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400">Analyzing {employees.length} employee profiles…</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Evaluating tenure · performance · salary bands · leave patterns</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 flex flex-col items-center gap-2 text-gray-400">
          <ShieldAlert size={40} className="text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-center font-medium">Run the prediction to see attrition risk scores</p>
          <p className="text-xs text-center text-gray-400">Gemini will analyze all {employees.length} active employees</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {(['High', 'Medium', 'Low'] as const).map(level => {
              const cfg   = RISK_CFG[level];
              const count = counts[level.toLowerCase() as 'high' | 'medium' | 'low'];
              const Icon  = cfg.icon;
              return (
                <button
                  key={level}
                  onClick={() => setRiskFilter(riskFilter === level ? 'All' : level)}
                  className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                    riskFilter === level ? `${cfg.bg} ring-2 ring-offset-1 ring-current` : `${cfg.bg} hover:shadow-sm`
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-semibold ${cfg.color}`}>{level} Risk</p>
                    <p className={`text-2xl font-extrabold ${cfg.color}`}>{count}</p>
                    <p className="text-[10px] text-gray-400">employees</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Risk Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {filtered.length} employee{filtered.length !== 1 ? 's' : ''} · sorted by risk score
              </p>
              {riskFilter !== 'All' && (
                <button onClick={() => setRiskFilter('All')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Show all
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[180px]">Employee</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Risk</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Score</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Tenure</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Salary</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Perf</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Key Factors</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const emp     = employees.find(e => e.id === r.employeeId);
                    const prof    = profiles.find(p => p.id === r.employeeId);
                    const cfg     = RISK_CFG[r.riskLevel];
                    const isOpen  = expanded === r.employeeId;
                    if (!emp || !prof) return null;

                    return (
                      <>
                        <tr
                          key={r.employeeId}
                          className={`${i < filtered.length - 1 && !isOpen ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{emp.name}</p>
                                <p className="text-[9px] text-gray-400">{emp.position} · {emp.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {r.riskLevel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-xs font-extrabold ${cfg.color}`}>{r.score}</span>
                              <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${r.score}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-gray-500 hidden md:table-cell">
                            {prof.tenureMonths < 12
                              ? `${prof.tenureMonths}mo`
                              : `${Math.floor(prof.tenureMonths / 12)}yr ${prof.tenureMonths % 12}mo`}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                            {peso(emp.salary)}
                            <span className={`ml-1 text-[9px] font-semibold ${
                              prof.salBand === 'Below Market' ? 'text-red-500' :
                              prof.salBand === 'Above Market' ? 'text-green-500' : 'text-gray-400'
                            }`}>({prof.salBand.split(' ')[0]})</span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs hidden lg:table-cell">
                            {prof.perfRating !== null ? (
                              <span className={`font-bold ${
                                prof.perfRating >= 4 ? 'text-green-600' :
                                prof.perfRating >= 3 ? 'text-amber-600' : 'text-red-500'
                              }`}>{prof.perfRating.toFixed(1)}</span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-700">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {r.factors.slice(0, 2).map((f, fi) => (
                                <span key={fi} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => setExpanded(isOpen ? null : r.employeeId)}
                              className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${isOpen ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                              {isOpen ? '▲ Hide' : '▼ Show'}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isOpen && (
                          <tr key={`${r.employeeId}-detail`} className="border-b border-gray-100 dark:border-gray-800">
                            <td colSpan={8} className={`px-4 py-3 ${cfg.bg}`}>
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-1.5">
                                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-2">All Factors:</p>
                                  {r.factors.map((f, fi) => (
                                    <span key={fi} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                                      {f}
                                    </span>
                                  ))}
                                </div>
                                <div className={`flex items-start gap-2 p-3 rounded-xl border ${cfg.bg}`}>
                                  <Brain size={14} className={`${cfg.color} shrink-0 mt-0.5`} />
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color} mb-0.5`}>HR Recommendation</p>
                                    <p className="text-xs text-gray-700 dark:text-gray-300">{r.recommendation}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Type:</span> {emp.type}</div>
                                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">OT Hours:</span> {prof.otHours}h</div>
                                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Leave Days:</span> {prof.leaveDays}d ({prof.leaveCount}x)</div>
                                  <div><span className="font-semibold text-gray-700 dark:text-gray-300">Sal. Band:</span> {prof.salBand}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
