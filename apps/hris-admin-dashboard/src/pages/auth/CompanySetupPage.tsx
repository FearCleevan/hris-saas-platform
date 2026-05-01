import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Users, FileText, ChevronRight,
  ChevronLeft, CheckCircle, ArrowLeft, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tenant } from '@/types';
import { createOrganization } from '@/services/organizations';

// ─── Step data ────────────────────────────────────────────────────────────────

interface Step1 {
  companyName: string;
  industry: string;
  location: string;
  employeeCount: string;
}

interface Step2 {
  tinNumber: string;
  rdoCode: string;
  plan: 'starter' | 'pro' | 'enterprise';
}

const industries = [
  'Business Process Outsourcing',
  'Construction',
  'Education',
  'Finance & Banking',
  'Food & Beverage',
  'Healthcare',
  'Hospitality & Tourism',
  'IT & Technology',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Shipping & Logistics',
  'Telecommunications',
  'Other',
];

const rdoCodes = [
  { code: 'RDO 001', label: 'RDO 001 — Laoag City' },
  { code: 'RDO 019', label: 'RDO 019 — Baguio City' },
  { code: 'RDO 022', label: 'RDO 022 — Caloocan City' },
  { code: 'RDO 038', label: 'RDO 038 — Quezon City North' },
  { code: 'RDO 039', label: 'RDO 039 — Quezon City South' },
  { code: 'RDO 040', label: 'RDO 040 — Quezon City East' },
  { code: 'RDO 044', label: 'RDO 044 — Mandaluyong City' },
  { code: 'RDO 047', label: 'RDO 047 — Manila' },
  { code: 'RDO 050', label: 'RDO 050 — Makati City' },
  { code: 'RDO 054', label: 'RDO 054 — Taguig & Pateros' },
  { code: 'RDO 055', label: 'RDO 055 — Pasig City' },
  { code: 'RDO 057', label: 'RDO 057 — Marikina City' },
  { code: 'RDO 058', label: 'RDO 058 — San Juan City' },
  { code: 'RDO 060', label: 'RDO 060 — Muntinlupa City' },
  { code: 'RDO 083', label: 'RDO 083 — Cebu City' },
  { code: 'RDO 107', label: 'RDO 107 — Cagayan de Oro' },
  { code: 'RDO 118', label: 'RDO 118 — Davao City' },
];

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '₱149/mo',
    desc: 'Up to 50 employees',
    features: ['Core HRIS', 'Payroll', 'Leave & Attendance'],
    color: 'border-gray-200 dark:border-gray-700',
    badge: '',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '₱299/mo',
    desc: 'Up to 200 employees',
    features: ['Everything in Starter', 'Analytics', 'Performance Mgmt', 'Recruitment'],
    color: 'border-[#0038a8]',
    badge: 'Most Popular',
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Unlimited employees',
    features: ['Everything in Pro', 'Multi-entity', 'Dedicated support', 'Custom integrations'],
    color: 'border-[#fcd116]',
    badge: 'Best Value',
  },
];

const STEPS = ['Company Profile', 'Government Info & Plan', 'All Set!'];

// ─── Main component ────────────────────────────────────────────────────────────

export default function CompanySetupPage() {
  const navigate = useNavigate();
  const { setTenant, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 bg-[#0038a8] rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-base">H</span>
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">HRISPH</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
            Set up your company
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This takes about 2 minutes. You can update everything later in Settings.
          </p>
        </div>

        {/* Step indicator */}
        {step < 2 && (
          <div className="flex items-center gap-2 mb-8 justify-center">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'bg-[#0038a8] text-white' :
                    'bg-gray-200 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    i === step ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${i < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step panels */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Step1Panel
              key="step1"
              onNext={(data) => { setStep1Data(data); setStep(1); }}
              onBack={() => { logout(); navigate('/login'); }}
            />
          )}
          {step === 1 && step1Data && (
            <Step2Panel
              key="step2"
              step1Data={step1Data}
              isLoading={isLoading}
              onNext={async (data) => {
                setIsLoading(true);
                try {
                  const newTenant = await createOrganization({
                    name: step1Data.companyName,
                    industry: step1Data.industry,
                    companySize: step1Data.employeeCount,
                    plan: data.plan,
                  });

                  setTenant(newTenant);
                  toast.success(`Organization "${newTenant.name}" created.`);
                  setStep(2);
                } catch (error: any) {
                  toast.error(error.message || 'Failed to create organization');
                } finally {
                  setIsLoading(false);
                }
              }}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && step1Data && (
            <SuccessPanel
              key="step3"
              companyName={step1Data.companyName}
              onGo={() => {
                toast.success(`Welcome to HRISPH! Your company has been set up.`);
                navigate('/');
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Step 1: Company Profile ──────────────────────────────────────────────────

function Step1Panel({ onNext, onBack }: { onNext: (d: Step1) => void; onBack: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step1>();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-7 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#0038a8]/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#0038a8]" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Company Profile</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Basic information about your organization</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-5">
        {/* Company name */}
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company / Business Name *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="companyName"
              placeholder="e.g. Maharlika Manufacturing Corp."
              className="pl-9"
              {...register('companyName', { required: 'Company name is required' })}
            />
          </div>
          {errors.companyName && <p className="text-xs text-[#ce1126]">{errors.companyName.message}</p>}
        </div>

        {/* Industry */}
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry *</Label>
          <select
            id="industry"
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0038a8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('industry', { required: 'Industry is required' })}
            defaultValue=""
          >
            <option value="" disabled>Select your industry…</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          {errors.industry && <p className="text-xs text-[#ce1126]">{errors.industry.message}</p>}
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location">Office Location *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="location"
              placeholder="e.g. Makati City, Metro Manila"
              className="pl-9"
              {...register('location', { required: 'Location is required' })}
            />
          </div>
          {errors.location && <p className="text-xs text-[#ce1126]">{errors.location.message}</p>}
        </div>

        {/* Employee count */}
        <div className="space-y-1.5">
          <Label htmlFor="employeeCount">Approximate Employee Count *</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              id="employeeCount"
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0038a8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              {...register('employeeCount', { required: true })}
              defaultValue=""
            >
              <option value="" disabled>How many employees?</option>
              <option value="1-10">1 – 10 employees</option>
              <option value="11-50">11 – 50 employees</option>
              <option value="51-200">51 – 200 employees</option>
              <option value="201-500">201 – 500 employees</option>
              <option value="501+">501+ employees</option>
            </select>
          </div>
          {errors.employeeCount && <p className="text-xs text-[#ce1126]">Please select employee count</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Button type="submit" className="ml-auto">
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ─── Step 2: Government Info & Plan ──────────────────────────────────────────

function Step2Panel({
  step1Data, isLoading, onNext, onBack,
}: {
  step1Data: Step1;
  isLoading: boolean;
  onNext: (d: Step2) => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, watch, setValue } = useForm<Step2>({
    defaultValues: { plan: 'pro' },
  });
  const selectedPlan = watch('plan');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-7 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
          <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Government & Plan</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">For {step1Data.companyName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-6">
        {/* TIN + RDO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tinNumber">Company TIN <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              id="tinNumber"
              placeholder="000-000-000-000"
              {...register('tinNumber')}
            />
            <p className="text-[10px] text-gray-400">Required for BIR form generation</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rdoCode">BIR RDO <span className="text-gray-400 font-normal">(optional)</span></Label>
            <select
              id="rdoCode"
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0038a8] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              {...register('rdoCode')}
              defaultValue=""
            >
              <option value="">Select RDO…</option>
              {rdoCodes.map((rdo) => (
                <option key={rdo.code} value={rdo.code}>{rdo.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Plan selection */}
        <div className="space-y-2.5">
          <Label>Choose a Plan</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setValue('plan', plan.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                  selectedPlan === plan.id
                    ? `${plan.color} bg-[#0038a8]/3 dark:bg-[#0038a8]/10`
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    plan.id === 'pro' ? 'bg-[#0038a8] text-white' : 'bg-[#fcd116] text-gray-900'
                  }`}>
                    {plan.badge}
                  </span>
                )}
                <p className="font-bold text-gray-900 dark:text-white text-sm">{plan.name}</p>
                <p className="text-[#0038a8] dark:text-blue-400 font-bold text-sm">{plan.price}</p>
                <p className="text-[10px] text-gray-400 mb-2">{plan.desc}</p>
                <ul className="space-y-0.5">
                  {plan.features.map((f) => (
                    <li key={f} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                      <CheckCircle className="w-2.5 h-2.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            You’re starting a free 30-day trial. No credit card required.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <Button type="submit" className="ml-auto" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up…
              </span>
            ) : (
              <>
                Finish Setup
                <CheckCircle className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ─── Step 3: Success ──────────────────────────────────────────────────────────

function SuccessPanel({ companyName, onGo }: { companyName: string; onGo: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 shadow-sm text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
        className="w-20 h-20 rounded-2xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-6"
      >
        <Sparkles className="w-10 h-10 text-green-600 dark:text-green-400" />
      </motion.div>

      <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
        You’re all set!
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        <span className="font-semibold text-gray-800 dark:text-gray-200">{companyName}</span> is ready on HRISPH.
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        Start by adding your employees, configuring payroll settings, and setting up leave policies.
      </p>

      {/* Next steps checklist */}
      <div className="text-left bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-8 space-y-2.5">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Suggested next steps</p>
        {[
          'Add your first employees (or import via CSV)',
          'Configure your payroll cutoff periods',
          'Set up leave types and accrual policies',
          'Invite HR managers and staff with roles',
          'Connect your biometric devices (optional)',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-gray-400">{i + 1}</span>
            </div>
            {step}
          </div>
        ))}
      </div>

      <Button className="w-full h-12 text-base" onClick={onGo}>
        Go to Dashboard
        <ChevronRight className="w-5 h-5" />
      </Button>
    </motion.div>
  );
}