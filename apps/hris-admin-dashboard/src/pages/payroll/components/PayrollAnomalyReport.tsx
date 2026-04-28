import { useState } from 'react';
import {
  ShieldAlert, Loader2, RefreshCw, Download, CheckSquare2,
  AlertTriangle, Info, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { getGeminiClient, GEMINI_MODEL, isGeminiAvailable } from '@/lib/gemini';
import payrollRunsData from '@/data/mock/payroll-runs.json';
import payrollRecordsData from '@/data/mock/payroll-records.json';
import employeesData from '@/data/mock/employees.json';

interface PayrollRecord {
  id: string; runId: string; employeeId: string;
  daysWorked: number; basicPay: number; overtimePay: number;
  transportationAllowance: number; mealAllowance: number; grossPay: number;
  sss: number; philhealth: number; pagibig: number; withholdingTax: number;
  sssLoan: number; pagibigLoan: number; companyLoan: number;
  tardiness: number; totalDeductions: number; netPay: number;
}

interface PayrollRun {
  id: string; period: string; status: string;
  totalGross: number; totalNetPay: number; employeeCount: number;
}

type RiskLevel = 'High' | 'Medium' | 'Low';

interface Anomaly {
  employeeId: string;
  issueType: string;
  currentValue: string;
  expectedRange: string;
  riskLevel: RiskLevel;
  detail: string;
}

interface AnomalyReport {
  summary: string;
  totalAnomalies: number;
  anomalies: Anomaly[];
}

const RISK_CFG: Record<RiskLevel, { color: string; bg: string; border: string; dot: string }> = {
  High:   { color: 'text-red-700 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800',    dot: 'bg-red-500' },
  Medium: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  Low:    { color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800',   dot: 'bg-blue-500' },
};

function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PayrollAnomalyReport() {
  const runs = payrollRunsData as PayrollRun[];
  const records = payrollRecordsData as PayrollRecord[];

  const [selectedRunId, setSelectedRunId] = useState(runs[runs.length - 1]?.id || '');
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const runRecords = records.filter((r) => r.runId === selectedRunId);

  const toggleReviewed = (index: number) => {
    setReviewed((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const runAudit = async () => {
    if (!isGeminiAvailable()) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env');
      return;
    }
    if (runRecords.length === 0) {
      toast.error('No records found for this payroll run');
      return;
    }

    setLoading(true);
    setReport(null);
    setReviewed(new Set());

    const recordLines = runRecords.map((r) => {
      const emp = employeesData.find((e) => e.id === r.employeeId);
      const computedGross = r.basicPay + r.overtimePay + r.transportationAllowance + r.mealAllowance;
      const computedDeductions = r.sss + r.philhealth + r.pagibig + r.withholdingTax + r.sssLoan + r.pagibigLoan + r.companyLoan + r.tardiness;
      return `${r.employeeId}|${emp?.name || 'Unknown'}|${emp?.salary || 0}|${r.daysWorked}|${r.basicPay}|${r.overtimePay}|${r.grossPay}|${computedGross}|${r.sss}|${r.philhealth}|${r.pagibig}|${r.withholdingTax}|${r.totalDeductions}|${computedDeductions}|${r.netPay}`;
    }).join('\n');

    const prompt = `You are a payroll auditor for a Philippine company. Analyze this payroll run for anomalies.

PAYROLL RUN: ${selectedRun?.period || selectedRunId}
TOTAL EMPLOYEES: ${runRecords.length}
TOTAL GROSS: ${peso(selectedRun?.totalGross || 0)}

RECORDS (format: empId|name|monthlySalary|daysWorked|basicPay|overtimePay|grossPay|computedGross|sss|philhealth|pagibig|tax|totalDeductions|computedDeductions|netPay):
${recordLines}

Analyze each record for these Philippine payroll anomalies:
1. GROSS PAY MISMATCH: grossPay ≠ computedGross (basicPay + overtimePay + allowances)
2. DEDUCTION MISMATCH: totalDeductions ≠ computedDeductions (sum of individual deductions)
3. MISSING STATUTORY: sss=0 OR philhealth=0 OR pagibig=0 (should never be zero for active employees)
4. NEGATIVE NET PAY: netPay <= 0
5. HIGH OVERTIME: overtimePay > basicPay * 0.5 (overtime exceeding 50% of basic pay is unusual)
6. ZERO TAX HIGH SALARY: withholdingTax=0 AND basicPay > 20833 (above ₱250K/year is taxable under TRAIN Law)
7. DAYS WORKED: daysWorked < 5 or daysWorked > 13 for a semi-monthly period
8. BASIC PAY VS SALARY: basicPay should be approximately monthlySalary/2 (±10%); flag if deviation exceeds 15%

Return ONLY a raw JSON object (no markdown, no explanation):
{
  "summary": "<1 sentence: X anomalies found across Y employees in [period]>",
  "totalAnomalies": <integer>,
  "anomalies": [
    {
      "employeeId": "<id>",
      "issueType": "<concise issue name>",
      "currentValue": "<actual value found>",
      "expectedRange": "<what it should be>",
      "riskLevel": "<High | Medium | Low>",
      "detail": "<one clear sentence explaining the issue>"
    }
  ]
}

Rules:
- Only report REAL anomalies — do not flag things that look normal
- High risk: missing statutory deductions, negative net pay, gross/deduction math errors
- Medium risk: high overtime, zero tax on taxable salary
- Low risk: minor days-worked deviations, basic pay rounding
- If no anomalies found, return totalAnomalies: 0 and empty anomalies array
- Maximum 15 anomalies — prioritize by risk level`;

    try {
      const client = getGeminiClient();
      if (!client) throw new Error('No client');
      const model = client.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(text) as AnomalyReport;
      setReport(parsed);
      if (parsed.totalAnomalies === 0) {
        toast.success('No anomalies detected — payroll looks clean!');
      } else {
        toast.warning(`${parsed.totalAnomalies} anomal${parsed.totalAnomalies === 1 ? 'y' : 'ies'} found`);
      }
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

  const exportReport = () => {
    if (!report) return;
    const lines = [
      `Payroll Anomaly Report — ${selectedRun?.period}`,
      `Generated: ${new Date().toLocaleDateString('en-PH')}`,
      `Summary: ${report.summary}`,
      '',
      'Employee ID,Issue Type,Current Value,Expected Range,Risk Level,Detail,Reviewed',
      ...report.anomalies.map((a, i) =>
        `${a.employeeId},"${a.issueType}","${a.currentValue}","${a.expectedRange}",${a.riskLevel},"${a.detail}",${reviewed.has(i) ? 'Yes' : 'No'}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-anomaly-${selectedRunId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Anomaly report exported');
  };

  const highCount  = report?.anomalies.filter((a) => a.riskLevel === 'High').length   ?? 0;
  const medCount   = report?.anomalies.filter((a) => a.riskLevel === 'Medium').length  ?? 0;
  const reviewedCount = reviewed.size;

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">AI Payroll Anomaly Detector</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Gemini scans all records for math errors, missing statutory deductions, unusual overtime, and TRAIN Law tax gaps.
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Payroll Run to Audit</label>
            <div className="relative">
              <select
                title="Payroll Run"
                value={selectedRunId}
                onChange={(e) => { setSelectedRunId(e.target.value); setReport(null); setReviewed(new Set()); }}
                className="w-full h-9 appearance-none px-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.period} — {r.status} ({r.employeeCount} employees)
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          <div className="text-xs text-gray-400">
            <span className="font-semibold text-gray-600 dark:text-gray-300">{runRecords.length}</span> records
            {selectedRun && <> · <span className="font-semibold text-gray-600 dark:text-gray-300">{peso(selectedRun.totalGross)}</span> gross</>}
          </div>

          <button
            onClick={runAudit}
            disabled={loading}
            className="flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shrink-0"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" />Analyzing {runRecords.length} records…</>
            ) : report ? (
              <><RefreshCw size={14} />Re-run Audit</>
            ) : (
              <><ShieldAlert size={14} />Run AI Audit</>
            )}
          </button>

          {report && report.totalAnomalies > 0 && (
            <button
              onClick={exportReport}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
            >
              <Download size={14} />Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">AI is scanning {runRecords.length} payroll records…</p>
          <p className="text-xs text-gray-400">Checking for math errors, missing deductions, and TRAIN Law compliance</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !report && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-2 text-gray-400">
          <ShieldAlert size={36} className="text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-center">Select a payroll run and click<br />"Run AI Audit" to scan for anomalies.</p>
        </div>
      )}

      {/* Clean result */}
      {!loading && report && report.totalAnomalies === 0 && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <CheckSquare2 size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-bold text-green-700 dark:text-green-400">Payroll Looks Clean</p>
          <p className="text-xs text-green-600 dark:text-green-500 text-center">{report.summary}</p>
        </div>
      )}

      {/* Anomaly report */}
      {!loading && report && report.totalAnomalies > 0 && (
        <div className="flex flex-col gap-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Anomalies', value: report.totalAnomalies, color: 'text-gray-800 dark:text-white' },
              { label: 'High Risk',   value: highCount,  color: 'text-red-600 dark:text-red-400' },
              { label: 'Medium Risk', value: medCount,   color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Reviewed',    value: `${reviewedCount}/${report.totalAnomalies}`, color: 'text-green-600 dark:text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Summary text */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{report.summary}</p>
          </div>

          {/* Anomaly table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 w-10">✓</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Issue</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Current Value</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Expected</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {report.anomalies.map((a, i) => {
                    const risk = RISK_CFG[a.riskLevel] || RISK_CFG.Low;
                    const emp = employeesData.find((e) => e.id === a.employeeId);
                    const isReviewed = reviewed.has(i);

                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 dark:border-gray-800/60 transition-colors ${
                          isReviewed
                            ? 'bg-gray-50/60 dark:bg-gray-800/20 opacity-60'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/20'
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleReviewed(i)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mx-auto ${
                              isReviewed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                            }`}
                            title="Mark as reviewed"
                          >
                            {isReviewed && <CheckSquare2 size={12} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {emp?.name || a.employeeId}
                          </p>
                          {emp && <p className="text-[10px] text-gray-400">{emp.department}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{a.issueType}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 max-w-[240px]">{a.detail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 hidden md:table-cell font-mono">
                          {a.currentValue}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-500 hidden lg:table-cell">
                          {a.expectedRange}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                            {a.riskLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <Info size={12} className="text-gray-400 shrink-0" />
              <p className="text-[10px] text-gray-400">Click the checkbox to mark each anomaly as reviewed. Export to CSV for payroll team records.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
