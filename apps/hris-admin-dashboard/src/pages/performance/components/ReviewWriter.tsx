import { useState } from 'react';
import { Wand2, Loader2, Copy, Check, Printer, ChevronDown, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import employeesData from '@/data/mock/employees.json';
import cyclesData from '@/data/mock/performance-cycles.json';

const COMPETENCIES = [
  { key: 'qualityOfWork',   label: 'Work Quality' },
  { key: 'productivity',    label: 'Productivity' },
  { key: 'teamwork',        label: 'Teamwork' },
  { key: 'communication',   label: 'Communication' },
  { key: 'initiative',      label: 'Initiative' },
  { key: 'leadership',      label: 'Leadership' },
  { key: 'technicalSkills', label: 'Technical Skills' },
  { key: 'attendance',      label: 'Attendance' },
];

interface Cycle { id: string; name: string; period: string }

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={18}
            className={`transition-colors ${n <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-500 w-4">{value > 0 ? value : ''}</span>
    </div>
  );
}

export function ReviewWriter() {
  const cycles = cyclesData as Cycle[];
  const [selectedEmployee, setSelectedEmployee] = useState(employeesData[0].id);
  const [selectedCycle, setSelectedCycle] = useState(cycles[0]?.id || '');
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(COMPETENCIES.map((c) => [c.key, 0]))
  );
  const [notes, setNotes] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const employee = employeesData.find((e) => e.id === selectedEmployee)!;
  const cycle = cycles.find((c) => c.id === selectedCycle);
  const avgRating = (() => {
    const filled = Object.values(ratings).filter((v) => v > 0);
    return filled.length > 0 ? filled.reduce((s, v) => s + v, 0) / filled.length : 0;
  })();

  const setRating = (key: string, val: number) =>
    setRatings((prev) => ({ ...prev, [key]: val }));

  const generate = async () => {
    const missingRatings = COMPETENCIES.filter((c) => ratings[c.key] === 0);
    if (missingRatings.length > 0) {
      toast.error(`Please rate all competencies (${missingRatings.map((c) => c.label).join(', ')} missing)`);
      return;
    }
    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
      return;
    }

    setLoading(true);
    setOutput('');

    const ratingLines = COMPETENCIES.map(
      (c) => `  - ${c.label}: ${ratings[c.key]}/5`
    ).join('\n');

    const ratingLabel =
      avgRating >= 4.5 ? 'Outstanding' :
      avgRating >= 3.5 ? 'Exceeds Expectations' :
      avgRating >= 2.5 ? 'Meets Expectations' : 'Needs Improvement';

    const prompt = `Write a formal, professional performance review for a Philippine-based company.

EMPLOYEE: ${employee.name}
POSITION: ${employee.position}
DEPARTMENT: ${employee.department}
REVIEW CYCLE: ${cycle?.name || 'Current Cycle'} (${cycle?.period || ''})
OVERALL RATING: ${avgRating.toFixed(1)}/5.0 — ${ratingLabel}

COMPETENCY RATINGS (1=Poor, 2=Below Average, 3=Meets Expectations, 4=Exceeds, 5=Outstanding):
${ratingLines}

MANAGER'S OBSERVATIONS:
${notes.trim() || '(No additional notes provided — infer from ratings)'}

INSTRUCTIONS:
- Write a formal manager evaluation in 4 sections:
  1. OVERALL PERFORMANCE SUMMARY (2-3 sentences, start with employee name)
  2. KEY STRENGTHS (2-3 specific paragraphs based on high-rated competencies)
  3. AREAS FOR DEVELOPMENT (1-2 specific areas based on lower-rated competencies)
  4. DEVELOPMENT RECOMMENDATIONS & GOALS (2-3 actionable goals for next cycle)
- Use professional Philippine corporate English
- Be specific to the competency ratings — do NOT be vague or generic
- Tone: constructive, balanced, and motivating
- Do NOT include placeholder brackets [ ] — write everything in full
- End with a one-sentence overall recommendation (retain/promote/improve)`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('No client');
      const model = client.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      setOutput(result.response.text());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`AI error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Review copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const print = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Performance Review — ${employee.name}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.6}
      h1{font-size:18px;margin-bottom:4px}p.sub{color:#666;font-size:12px;margin-bottom:24px}
      pre{white-space:pre-wrap;font-family:inherit;font-size:14px}</style></head>
      <body><h1>Performance Review: ${employee.name}</h1>
      <p class="sub">${employee.position} · ${employee.department} · ${cycle?.name || ''}</p>
      <pre>${output}</pre></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-0.5">Performance Review Writer</h3>
          <p className="text-xs text-gray-400">Rate each competency and add notes — AI writes the full formal appraisal.</p>
        </div>

        {/* Employee + Cycle selects */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Employee</label>
            <div className="relative">
              <select
                title="Employee"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full h-9 appearance-none px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                {employeesData.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} — {e.department}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Review Cycle</label>
            <div className="relative">
              <select
                title="Cycle"
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="w-full h-9 appearance-none px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Competency ratings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Competency Ratings</label>
            {avgRating > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                avgRating >= 4.5 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                avgRating >= 3.5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                avgRating >= 2.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              }`}>
                Avg: {avgRating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            {COMPETENCIES.map((comp) => (
              <div key={comp.key} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-28 shrink-0">{comp.label}</span>
                <StarRating value={ratings[comp.key]} onChange={(v) => setRating(comp.key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* Manager notes */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
            Manager Observations <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            placeholder="e.g.&#10;- Delivered Project X ahead of schedule&#10;- Great teamwork during Q4 crunch&#10;- Needs to improve documentation habits"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 resize-none leading-relaxed"
          />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Writing review…</>
          ) : (
            <><Wand2 size={16} />Generate Performance Review</>
          )}
        </button>
      </div>

      {/* Output panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Generated Review</h3>
          {output && (
            <div className="flex items-center gap-2">
              <button
                onClick={print}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Printer size={12} />Print
              </button>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[320px]">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <p className="text-sm">AI is writing the formal review…</p>
            </div>
          )}
          {!loading && !output && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <Wand2 size={32} className="text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-center">Rate the competencies and click<br />Generate to produce the review.</p>
            </div>
          )}
          {!loading && output && (
            <div className="overflow-y-auto max-h-[480px] pr-1">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-gray-300 font-sans">
                {output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
