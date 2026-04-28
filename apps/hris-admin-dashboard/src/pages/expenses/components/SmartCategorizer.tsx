import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, Tag, RefreshCw, Check, ChevronDown, BotMessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import categoriesData from '@/data/mock/expenses-categories.json';
import claimsData from '@/data/mock/expenses-claims.json';
import employeesData from '@/data/mock/employees.json';

interface Category { id: string; name: string; description: string; color: string; icon: string; }
interface Claim {
  id: string; employeeId: string; categoryId: string;
  amount: number; date: string; description: string; status: string;
}
interface BulkSuggestion {
  claimId: string; suggestedCategoryId: string;
  currentCategoryId: string; reason: string;
  confidence: 'High' | 'Medium' | 'Low';
}

const CONFIDENCE_CFG = {
  High:   { color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  Medium: { color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  Low:    { color: 'text-gray-500 dark:text-gray-400',    bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
};

function peso(v: number) { return `₱${v.toLocaleString()}`; }

export function SmartCategorizer() {
  const categories = categoriesData as Category[];
  const allClaims  = claimsData as Claim[];
  const pendingClaims = allClaims.filter(c => c.status === 'pending');

  /* ─── Live Suggester ─── */
  const [descInput,   setDescInput]   = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [suggestion,  setSuggestion]  = useState<{ categoryId: string; reason: string; confidence: string } | null>(null);
  const [suggesting,  setSuggesting]  = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoryListStr = categories.map(c => `${c.id}: ${c.name} — ${c.description}`).join('\n');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (descInput.trim().length < 5) { setSuggestion(null); return; }
    if (!isGeminiAvailable()) return;

    debounceRef.current = setTimeout(async () => {
      setSuggesting(true);
      setSuggestion(null);
      try {
        const client = getGeminiClient();
        if (!client) throw new Error('No client');
        const model = client.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = `You are an expense categorizer for a Philippine company.

Available categories:
${categoryListStr}

Expense: "${descInput}"${amountInput ? ` · Amount: ₱${amountInput}` : ''}

Return JSON only (no markdown):
{"categoryId":"<best category id>","reason":"<one sentence>","confidence":"<High|Medium|Low>"}`;

        const res = await model.generateContent(prompt);
        let text = res.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        setSuggestion(JSON.parse(text));
      } catch {
        // silent — live suggester shouldn't interrupt typing
      } finally {
        setSuggesting(false);
      }
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [descInput, amountInput, categoryListStr]);

  const suggestedCat = suggestion ? categories.find(c => c.id === suggestion.categoryId) : null;

  /* ─── Bulk Re-Categorizer ─── */
  const [bulkResults, setBulkResults] = useState<BulkSuggestion[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [applied,     setApplied]     = useState<Set<string>>(new Set());

  const runBulk = async () => {
    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
      return;
    }
    if (pendingClaims.length === 0) {
      toast.error('No pending claims to analyze');
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    setApplied(new Set());

    const claimLines = pendingClaims.map((c, i) => {
      const emp     = employeesData.find(e => e.id === c.employeeId);
      const currCat = categories.find(cat => cat.id === c.categoryId);
      return `${i + 1}. ID:${c.id} | Employee:${emp?.name ?? c.employeeId} | Amount:₱${c.amount} | CurrentCategory:${currCat?.name ?? c.categoryId} | Description:"${c.description}"`;
    }).join('\n');

    const prompt = `You are an AI expense categorizer for a Philippine company. Review these pending expense claims and suggest the most accurate category for each.

AVAILABLE CATEGORIES:
${categoryListStr}

PENDING CLAIMS:
${claimLines}

Return a JSON array (no markdown):
[{"claimId":"<id>","suggestedCategoryId":"<best category id>","currentCategoryId":"<current category id>","reason":"<one sentence>","confidence":"<High|Medium|Low>"}]

Rules:
- Only suggest a different category if you are confident it's a better match
- If the current category is already correct, keep the same categoryId
- Base decisions on description text and amount context`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('No client');
      const model  = client.getGenerativeModel({ model: GEMINI_MODEL });
      const res    = await model.generateContent(prompt);
      let text = res.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(text) as BulkSuggestion[];
      setBulkResults(parsed);
      const changes = parsed.filter(s => s.suggestedCategoryId !== s.currentCategoryId).length;
      toast.success(`Analysis complete · ${changes} re-categorization${changes !== 1 ? 's' : ''} suggested`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('JSON')) {
        toast.error('AI returned unexpected format. Try again.');
      } else {
        toast.error(`AI error: ${msg}`);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const applyOne = (claimId: string) => {
    setApplied(prev => new Set([...prev, claimId]));
    toast.success('Category updated (demo)');
  };

  const applyAll = () => {
    const changes = bulkResults.filter(s => s.suggestedCategoryId !== s.currentCategoryId && !applied.has(s.claimId));
    setApplied(prev => new Set([...prev, ...changes.map(s => s.claimId)]));
    toast.success(`Applied ${changes.length} category update${changes.length !== 1 ? 's' : ''} (demo)`);
  };

  const changesCount = bulkResults.filter(s => s.suggestedCategoryId !== s.currentCategoryId).length;
  const pendingApply = bulkResults.filter(s => s.suggestedCategoryId !== s.currentCategoryId && !applied.has(s.claimId)).length;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Section 1: Live Category Suggester ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Live Category Suggester</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Type an expense description and Gemini will suggest the best category in real-time (600ms debounce).
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Description</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Grab to client meeting, Team lunch at BGC, AWS monthly bill…"
                value={descInput}
                onChange={e => setDescInput(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400"
              />
              {suggesting && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 animate-spin" />
              )}
            </div>
          </div>

          <div className="w-32">
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Amount (₱) <span className="font-normal">optional</span></label>
            <input
              type="number"
              placeholder="0"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Suggestion result */}
        <div className="mt-3 min-h-[52px] flex items-center">
          {!isGeminiAvailable() && descInput.trim().length >= 5 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Configure <code className="font-mono text-[11px]">VITE_GEMINI_API_KEY</code> in .env to enable live suggestions.
            </p>
          )}

          {isGeminiAvailable() && descInput.trim().length < 5 && (
            <p className="text-xs text-gray-400">Type at least 5 characters to get a suggestion…</p>
          )}

          {suggesting && (
            <div className="flex items-center gap-2 text-xs text-indigo-500">
              <Loader2 size={14} className="animate-spin" />
              Asking Gemini…
            </div>
          )}

          {!suggesting && suggestion && suggestedCat && (
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                style={{ backgroundColor: `${suggestedCat.color}18`, borderColor: `${suggestedCat.color}40`, color: suggestedCat.color }}
              >
                <Tag size={12} />
                {suggestedCat.name}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CONFIDENCE_CFG[suggestion.confidence as keyof typeof CONFIDENCE_CFG]?.bg} ${CONFIDENCE_CFG[suggestion.confidence as keyof typeof CONFIDENCE_CFG]?.color}`}>
                {suggestion.confidence} confidence
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{suggestion.reason}"</p>
            </div>
          )}
        </div>

        {/* Category reference */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Available Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <span
                key={c.id}
                className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                style={{ backgroundColor: `${c.color}18`, borderColor: `${c.color}40`, color: c.color }}
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 2: Bulk Re-Categorizer ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <BotMessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Bulk Re-Categorizer</h3>
            </div>
            <p className="text-xs text-gray-400">
              Gemini reviews all {pendingClaims.length} pending claim{pendingClaims.length !== 1 ? 's' : ''} and suggests more accurate categories where needed.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {bulkResults.length > 0 && changesCount > 0 && pendingApply > 0 && (
              <button
                onClick={applyAll}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
              >
                <Check size={13} />Apply All ({pendingApply})
              </button>
            )}
            <button
              onClick={runBulk}
              disabled={bulkLoading || pendingClaims.length === 0}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
            >
              {bulkLoading ? (
                <><Loader2 size={13} className="animate-spin" />Analyzing…</>
              ) : bulkResults.length > 0 ? (
                <><RefreshCw size={13} />Re-analyze</>
              ) : (
                <><Sparkles size={13} />Analyze {pendingClaims.length} Claims</>
              )}
            </button>
          </div>
        </div>

        {/* Loading */}
        {bulkLoading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
            <p className="text-sm text-gray-400">Analyzing {pendingClaims.length} pending claims…</p>
          </div>
        )}

        {/* Empty state */}
        {!bulkLoading && bulkResults.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <Sparkles size={32} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm">Click "Analyze Claims" to run bulk AI categorization.</p>
          </div>
        )}

        {/* Results table */}
        {!bulkLoading && bulkResults.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs">
              <span className="text-gray-500">{bulkResults.length} claims analyzed</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{changesCount} re-categorizations suggested</span>
              <span className="text-green-600 dark:text-green-400">{applied.size} applied</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Current</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">AI Suggestion</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Confidence</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((s, i) => {
                    const claim      = pendingClaims.find(c => c.id === s.claimId);
                    const emp        = claim ? employeesData.find(e => e.id === claim.employeeId) : null;
                    const currCat    = categories.find(c => c.id === s.currentCategoryId);
                    const suggestCat = categories.find(c => c.id === s.suggestedCategoryId);
                    const isChange   = s.suggestedCategoryId !== s.currentCategoryId;
                    const isApplied  = applied.has(s.claimId);
                    const cfgKey     = (s.confidence in CONFIDENCE_CFG ? s.confidence : 'Low') as keyof typeof CONFIDENCE_CFG;
                    const cfg        = CONFIDENCE_CFG[cfgKey];

                    return (
                      <tr
                        key={s.claimId}
                        className={`${i < bulkResults.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} ${isChange && !isApplied ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}
                      >
                        <td className="px-4 py-2.5">
                          <div>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{emp?.name ?? s.claimId}</p>
                            <p className="text-[9px] text-gray-400">{emp?.department}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell max-w-[180px] truncate">
                          {claim?.description}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {claim ? peso(claim.amount) : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{currCat?.name ?? s.currentCategoryId}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {suggestCat ? (
                            <div className="flex items-center gap-1.5">
                              {isChange && <span className="text-indigo-500 text-[10px] font-bold">→</span>}
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                                style={{ backgroundColor: `${suggestCat.color}18`, borderColor: `${suggestCat.color}40`, color: suggestCat.color }}
                              >
                                {suggestCat.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                            {s.confidence}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isApplied ? (
                            <span className="flex items-center justify-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                              <Check size={12} />Applied
                            </span>
                          ) : isChange ? (
                            <button
                              onClick={() => applyOne(s.claimId)}
                              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                            >
                              Apply
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">No change</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Reason tooltip area — show all reasons if results present */}
      {!bulkLoading && bulkResults.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">AI Reasoning</p>
          <div className="flex flex-col gap-1.5">
            {bulkResults.filter(s => s.suggestedCategoryId !== s.currentCategoryId).slice(0, 8).map(s => {
              const claim = pendingClaims.find(c => c.id === s.claimId);
              const emp   = claim ? employeesData.find(e => e.id === claim.employeeId) : null;
              const suggestCat = categories.find(c => c.id === s.suggestedCategoryId);
              return (
                <div key={s.claimId} className="flex items-start gap-2">
                  <ChevronDown size={12} className="text-indigo-400 mt-0.5 shrink-0 rotate-[-90deg]" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{emp?.name ?? s.claimId}</span>
                    {' '}→ <span style={{ color: suggestCat?.color ?? '#6366f1' }}>{suggestCat?.name}</span>
                    : {s.reason}
                  </p>
                </div>
              );
            })}
            {bulkResults.filter(s => s.suggestedCategoryId !== s.currentCategoryId).length === 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">✓ All current categories look correct — no changes needed.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
