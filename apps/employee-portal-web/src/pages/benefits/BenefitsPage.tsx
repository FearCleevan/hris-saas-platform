import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Shield, Building2, CreditCard, CheckCircle2, Clock,
  ChevronDown, ChevronUp, AlertCircle, Users, Banknote,
  TrendingUp, FileText, X,
} from 'lucide-react';
import { format, parseISO, differenceInMonths } from 'date-fns';

import hmoData from '@/data/mock/hmo.json';
import govBenefitsData from '@/data/mock/government-benefits.json';
import loansData from '@/data/mock/loans.json';

// ─── helpers ────────────────────────────────────────────────────────────────

function currency(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(used: number, total: number) {
  return Math.min(100, Math.round((used / total) * 100));
}

// ─── shared card ────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── TAB: HMO ───────────────────────────────────────────────────────────────

function HmoTab() {
  const hmo = hmoData;
  const usedPct = pct(hmo.utilizationYTD.used, hmo.annualLimit);
  const [showHospitals, setShowHospitals] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<(typeof hmo.utilizationYTD.claims)[0] | null>(null);

  const coverageList = [
    { key: 'inpatient', label: 'Inpatient / Confinement' },
    { key: 'outpatient', label: 'Outpatient Consultations' },
    { key: 'emergency', label: 'Emergency Care' },
    { key: 'dental', label: 'Dental Services' },
    { key: 'vision', label: 'Vision / Optical' },
    { key: 'maternity', label: 'Maternity Benefits' },
    { key: 'preventive', label: 'Preventive Care' },
    { key: 'laboratory', label: 'Laboratory & Diagnostics' },
    { key: 'pharmacy', label: 'Pharmacy Benefits' },
  ] as const;

  return (
    <div className="space-y-5">
      {/* HMO Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full">
                {hmo.plan}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{hmo.provider}</h2>
            <p className="text-sm text-gray-500 mt-1">Card No: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{hmo.cardNumber}</span></p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              hmo.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Active
            </span>
            <p className="text-xs text-gray-400 mt-2">Valid until {format(parseISO(hmo.validUntil), 'MMMM dd, yyyy')}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Annual Limit</p>
            <p className="font-bold text-gray-900 dark:text-white">{currency(hmo.annualLimit)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Room & Board</p>
            <p className="font-bold text-gray-900 dark:text-white">{currency(hmo.roomAndBoard)}/day</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Member Since</p>
            <p className="font-bold text-gray-900 dark:text-white">{format(parseISO(hmo.memberSince), 'MMM yyyy')}</p>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="mt-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">YTD Utilization</span>
            <span className="font-medium text-gray-900 dark:text-white">{currency(hmo.utilizationYTD.used)} / {currency(hmo.annualLimit)}</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${usedPct > 75 ? 'bg-rose-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-green-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${usedPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{usedPct}% used</span>
            <span>{currency(hmo.utilizationYTD.remaining)} remaining</span>
          </div>
        </div>
      </Card>

      {/* Coverage & Claims row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coverage */}
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Coverage Benefits</h3>
          <ul className="space-y-2">
            {coverageList.map((c) => {
              const covered = hmo.coverage[c.key];
              return (
                <li key={c.key} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
                  {covered ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Claims */}
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Claims</h3>
          <div className="space-y-3">
            {hmo.utilizationYTD.claims.map((claim) => (
              <button
                key={claim.id}
                onClick={() => setSelectedClaim(claim)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{claim.hospital}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{claim.type} · {format(parseISO(claim.date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{currency(claim.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    claim.status === 'settled' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {claim.status === 'settled' ? 'Settled' : 'Processing'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Hospitals collapsible */}
      <Card>
        <button
          onClick={() => setShowHospitals(!showHospitals)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">Accredited Hospitals</h3>
          {showHospitals ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        <AnimatePresence>
          {showHospitals && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hmo.accreditedHospitals.map((h) => (
                  <div key={h.name} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{h.name}</p>
                      <p className="text-xs text-gray-400">{h.city}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Claim detail modal */}
      <AnimatePresence>
        {selectedClaim && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedClaim(null)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Claim Details</h3>
                <button onClick={() => setSelectedClaim(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Claim ID</span><span className="font-mono font-medium">{selectedClaim.id}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hospital</span><span className="font-medium text-right max-w-[60%]">{selectedClaim.hospital}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{format(parseISO(selectedClaim.date), 'MMMM dd, yyyy')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{selectedClaim.type}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold text-lg">{currency(selectedClaim.amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedClaim.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedClaim.status === 'settled' ? 'Settled' : 'Processing'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TAB: DEPENDENTS ────────────────────────────────────────────────────────

function DependentsTab() {
  const dependents = hmoData.dependents;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">HMO Dependents</h3>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{dependents.length} enrolled</span>
        </div>
        <div className="space-y-3">
          {dependents.map((dep, i) => (
            <motion.div
              key={dep.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700"
            >
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{dep.name}</p>
                <p className="text-sm text-gray-500">{dep.relationship} · DOB: {format(parseISO(dep.birthday), 'MMM dd, yyyy')}</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{dep.cardNumber}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                Active
              </span>
            </motion.div>
          ))}
        </div>
      </Card>

      <Card className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Adding Dependents</p>
          <p className="text-blue-700 dark:text-blue-400">To add or update your HMO dependents, submit a request through HR. You may add up to 4 qualified dependents (spouse and children under 21).</p>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: GOVERNMENT BENEFITS ────────────────────────────────────────────────

interface GovBenefitSectionProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  number: string;
  status: string;
  employeeMonthly: number;
  employerMonthly: number;
  totalYTD: number;
  employeeYTD: number;
  employerYTD: number;
  extra?: React.ReactNode;
  history: Array<{ month: string; employeeShare: number; employerShare: number; total: number; status: string }>;
}

function GovBenefitSection({
  title, icon, color, number, employeeMonthly, employerMonthly,
  totalYTD, employeeYTD, employerYTD, extra, history,
}: GovBenefitSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs font-mono text-gray-400">{number}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 mb-1">Your Share</p>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{currency(employeeMonthly)}</p>
          <p className="text-xs text-gray-400">per month</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 mb-1">Employer Share</p>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{currency(employerMonthly)}</p>
          <p className="text-xs text-gray-400">per month</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 mb-1">Total YTD</p>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{currency(totalYTD)}</p>
          <p className="text-xs text-gray-400">combined</p>
        </div>
      </div>

      {extra && <div className="mb-4">{extra}</div>}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm text-brand-blue hover:opacity-80 transition-opacity"
      >
        <span>{expanded ? 'Hide' : 'Show'} monthly history</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2">Month</th>
                    <th className="text-right py-2">Employee</th>
                    <th className="text-right py-2">Employer</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.month} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-2 text-gray-700 dark:text-gray-300">{row.month}</td>
                      <td className="py-2 text-right">{currency(row.employeeShare)}</td>
                      <td className="py-2 text-right">{currency(row.employerShare)}</td>
                      <td className="py-2 text-right font-medium">{currency(row.total)}</td>
                      <td className="py-2 text-right">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500">
        <span>Your YTD: {currency(employeeYTD)}</span>
        <span>Employer YTD: {currency(employerYTD)}</span>
      </div>
    </Card>
  );
}

function GovBenefitsTab() {
  const gov = govBenefitsData;

  return (
    <div className="space-y-5">
      <GovBenefitSection
        title="SSS — Social Security System"
        icon={<Shield className="w-5 h-5 text-blue-600" />}
        color="bg-blue-100 dark:bg-blue-900/30"
        number={gov.sss.number}
        status={gov.sss.status}
        employeeMonthly={gov.sss.employeeMonthly}
        employerMonthly={gov.sss.employerMonthly}
        totalYTD={gov.sss.totalContributionsYTD}
        employeeYTD={gov.sss.employeeShareYTD}
        employerYTD={gov.sss.employerShareYTD}
        history={gov.sss.monthlyHistory}
        extra={
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>{gov.sss.creditedYears} credited years of service</span>
          </div>
        }
      />

      <GovBenefitSection
        title="PhilHealth — PHIC"
        icon={<Heart className="w-5 h-5 text-green-600" />}
        color="bg-green-100 dark:bg-green-900/30"
        number={gov.philhealth.number}
        status={gov.philhealth.status}
        employeeMonthly={gov.philhealth.employeeMonthly}
        employerMonthly={gov.philhealth.employerMonthly}
        totalYTD={gov.philhealth.totalContributionsYTD}
        employeeYTD={gov.philhealth.employeeShareYTD}
        employerYTD={gov.philhealth.employerShareYTD}
        history={gov.philhealth.monthlyHistory}
        extra={
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <FileText className="w-4 h-4 text-green-500" />
            <span>Premium Rate: {gov.philhealth.premiumRate} of basic salary</span>
          </div>
        }
      />

      <GovBenefitSection
        title="Pag-IBIG Fund — HDMF"
        icon={<Building2 className="w-5 h-5 text-amber-600" />}
        color="bg-amber-100 dark:bg-amber-900/30"
        number={gov.pagibig.number}
        status={gov.pagibig.status}
        employeeMonthly={gov.pagibig.employeeMonthly}
        employerMonthly={gov.pagibig.employerMonthly}
        totalYTD={gov.pagibig.totalContributionsYTD}
        employeeYTD={gov.pagibig.employeeShareYTD}
        employerYTD={gov.pagibig.employerShareYTD}
        history={gov.pagibig.monthlyHistory}
        extra={
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Savings Balance</p>
              <p className="font-bold text-amber-700 dark:text-amber-300">{currency(gov.pagibig.savingsBalance)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Dividends YTD</p>
              <p className="font-bold text-amber-700 dark:text-amber-300">{currency(gov.pagibig.dividendsYTD)}</p>
            </div>
          </div>
        }
      />

      {/* BIR Summary */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">BIR — Tax Summary</h3>
            <p className="text-xs font-mono text-gray-400">TIN: {gov.bir.tin}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 mb-1">Taxable Income YTD</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{currency(gov.bir.taxableIncomeYTD)}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 mb-1">Withholding Tax YTD</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{currency(gov.bir.withholdingTaxYTD)}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 mb-1">Monthly Tax</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{currency(gov.bir.monthlyWithholdingTax)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: LOANS ──────────────────────────────────────────────────────────────

const LOAN_TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  pagibig:  { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  sss:      { color: 'text-blue-600',  bg: 'bg-blue-100 dark:bg-blue-900/30' },
  company:  { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
};

function LoansTab() {
  const loans = loansData;
  const activeLoans = loans.filter((l) => l.status === 'active');
  const paidLoans = loans.filter((l) => l.status === 'paid');
  const totalMonthlyDeductions = activeLoans.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstandingBalance, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Active Loans</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeLoans.length}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{currency(totalOutstanding)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Monthly Deductions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{currency(totalMonthlyDeductions)}</p>
        </Card>
      </div>

      {/* Active Loans */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Active Loans</h3>
        <div className="space-y-4">
          {activeLoans.map((loan, i) => {
            const cfg = LOAN_TYPE_CONFIG[loan.type] ?? { color: 'text-gray-600', bg: 'bg-gray-100' };
            const paid = loan.principalAmount - loan.outstandingBalance;
            const paidPct = pct(paid, loan.principalAmount);
            const monthsLeft = differenceInMonths(parseISO(loan.endDate), new Date());

            return (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                        <CreditCard className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{loan.typeName}</p>
                        <p className="text-xs text-gray-400">{loan.purpose} · {loan.interestRate} p.a.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className="font-bold text-gray-900 dark:text-white">{currency(loan.outstandingBalance)}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Paid: {currency(paid)}</span>
                      <span>Principal: {currency(loan.principalAmount)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-blue rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${paidPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{paidPct}% paid off</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-gray-400">Monthly</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{currency(loan.monthlyPayment)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-gray-400">Payments Left</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{loan.remainingPayments}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-gray-400">Months Left</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{Math.max(0, monthsLeft)}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-400">
                    <span>Started: {format(parseISO(loan.startDate), 'MMM d, yyyy')}</span>
                    <span>Ends: {format(parseISO(loan.endDate), 'MMM d, yyyy')}</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Paid Loans */}
      {paidLoans.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Completed Loans</h3>
          <div className="space-y-3">
            {paidLoans.map((loan) => (
              <Card key={loan.id} className="opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{loan.typeName}</p>
                      <p className="text-xs text-gray-400">{loan.purpose} · {format(parseISO(loan.startDate), 'MMM yyyy')} – {format(parseISO(loan.endDate), 'MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{currency(loan.principalAmount)}</p>
                    <span className="text-xs text-green-600 dark:text-green-400">Fully Paid</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Apply notice */}
      <Card className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <Banknote className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Apply for a Loan</p>
          <p className="text-blue-700 dark:text-blue-400">To apply for an SSS, Pag-IBIG, or company loan, please coordinate with HR or visit your respective agency's portal. Monthly deductions will reflect in your payslip.</p>
        </div>
      </Card>
    </div>
  );
}

// ─── ROOT PAGE ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'hmo',         label: 'HMO',          icon: Heart },
  { id: 'dependents',  label: 'Dependents',    icon: Users },
  { id: 'government',  label: 'Gov\'t Benefits', icon: Shield },
  { id: 'loans',       label: 'Loans',         icon: CreditCard },
] as const;

type TabId = typeof TABS[number]['id'];

export default function BenefitsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('hmo');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benefits & Loans</h1>
        <p className="text-sm text-gray-500 mt-1">Your HMO coverage, government contributions, and active loans</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                active
                  ? 'bg-white dark:bg-gray-700 text-brand-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'hmo'        && <HmoTab />}
          {activeTab === 'dependents' && <DependentsTab />}
          {activeTab === 'government' && <GovBenefitsTab />}
          {activeTab === 'loans'      && <LoansTab />}
        </motion.div>
      </AnimatePresence>

      {/* Quick status bar */}
      <Card className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Benefits updated as of</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">April 30, 2025</span>
        </div>
        <div className="flex items-center gap-2 text-sm ml-auto">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-gray-500">Questions? Contact</span>
          <span className="font-medium text-brand-blue">hr@hris-demo.ph</span>
        </div>
      </Card>
    </div>
  );
}
