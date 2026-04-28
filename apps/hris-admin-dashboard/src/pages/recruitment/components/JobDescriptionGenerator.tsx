import { useState } from 'react';
import { Wand2, Copy, Check, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Sales', 'Operations', 'IT', 'Admin', 'Marketing'];
const EMP_TYPES = ['Regular', 'Contractual', 'Project-based', 'Part-time'];

interface Form {
  title: string;
  department: string;
  empType: string;
  responsibilities: string;
  skills: string[];
  skillInput: string;
}

export function JobDescriptionGenerator() {
  const [form, setForm] = useState<Form>({
    title: '',
    department: 'Engineering',
    empType: 'Regular',
    responsibilities: '',
    skills: [],
    skillInput: '',
  });
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s], skillInput: '' }));
    }
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  };

  const generate = async () => {
    if (!form.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
      return;
    }

    setLoading(true);
    setOutput('');

    const prompt = `Write a complete, professional job description for a Philippine-based company.

Job Details:
- Title: ${form.title}
- Department: ${form.department}
- Employment Type: ${form.empType}
- Key Responsibilities: ${form.responsibilities || '(infer from job title)'}
- Required Skills: ${form.skills.length > 0 ? form.skills.join(', ') : '(infer from job title)'}

Requirements:
1. Write in professional Philippine business English
2. Structure: Role Overview → Key Responsibilities (numbered list) → Qualifications & Requirements → What We Offer
3. "What We Offer" section should include Philippine-standard benefits: SSS, Pag-IBIG, PhilHealth, HMO, 13th month pay, and 2 relevant perks
4. Keep it realistic for the Philippine job market
5. Do NOT use placeholder text — write complete, ready-to-post content
6. DOLE-compliant language (avoid age/gender discrimination)

Output only the job description text with clear section headers. No preamble.`;

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
    toast.success('Job description copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const useJD = () => {
    toast.success('Job description applied — fill in the job posting form above.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-0.5">Job Description Generator</h3>
          <p className="text-xs text-gray-400">Fill in the details and let Gemini write a full, DOLE-compliant job description.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Job Title *</label>
          <input
            type="text"
            placeholder="e.g. Senior Software Engineer"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Department</label>
            <select
              title="Department"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
            >
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Employment Type</label>
            <select
              title="Employment Type"
              value={form.empType}
              onChange={(e) => setForm((f) => ({ ...f, empType: e.target.value }))}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
            >
              {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
            Key Responsibilities <span className="font-normal text-gray-400">(optional — bullet points OK)</span>
          </label>
          <textarea
            placeholder="e.g.&#10;- Design and maintain REST APIs&#10;- Mentor junior developers&#10;- Lead technical architecture discussions"
            value={form.responsibilities}
            onChange={(e) => setForm((f) => ({ ...f, responsibilities: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Required Skills</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add a skill and press Enter"
              value={form.skillInput}
              onChange={(e) => setForm((f) => ({ ...f, skillInput: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 h-8 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400"
            />
            <button
              onClick={addSkill}
              className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-900/70 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.skills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Generating…</>
          ) : (
            <><Wand2 size={16} />Generate Job Description</>
          )}
        </button>
      </div>

      {/* Output panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Generated Output</h3>
          {output && (
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={useJD}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Use This JD
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[300px]">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <p className="text-sm">Gemini is writing your job description…</p>
            </div>
          )}
          {!loading && !output && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
              <Wand2 size={32} className="text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-center">Fill in the form and click<br />Generate to see the result here.</p>
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
