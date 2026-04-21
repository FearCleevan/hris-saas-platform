import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = {
  title: 'Start Free Trial — 14 Days Free',
  description: 'Start your 14-day free trial of HRISPH. No credit card required. Full access to all features.',
};

const trialPerks = [
  'Full access to all features — no restrictions',
  'Automated SSS, PhilHealth, Pag-IBIG & BIR TRAIN Law',
  'Up to 25 employees during trial',
  'Dedicated onboarding support',
  'No credit card required',
];

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#0038a8] flex-col justify-between p-12 text-white">
        <div>
          <Link href="/" className="flex items-center gap-1 font-bold text-2xl mb-12">
            <span className="text-white">HRIS</span>
            <span className="text-[#fcd116]">PH</span>
          </Link>
          <h2 className="text-3xl font-extrabold mb-4 leading-tight">
            14 days free.<br />No credit card needed.
          </h2>
          <p className="text-blue-200 text-base mb-8 leading-relaxed">
            Join 1,800+ Philippine businesses who use HRISPH to automate payroll compliance.
          </p>
          <ul className="flex flex-col gap-3">
            {trialPerks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-[#fcd116] shrink-0 mt-0.5" />
                <span className="text-blue-100">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <div className="border-t border-blue-700 pt-6">
            <p className="text-xs text-blue-300 mb-3">Trusted by Philippine companies</p>
            <div className="flex flex-wrap gap-3">
              {['JFC', 'BDO', 'SM Prime', 'Ayala', 'Aboitiz'].map((co) => (
                <span key={co} className="text-xs font-semibold bg-blue-700/50 px-3 py-1 rounded-full text-blue-100">
                  {co}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-background">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-1 font-bold text-2xl mb-8 lg:hidden">
          <span className="text-[#0038a8]">HRIS</span>
          <span className="text-[#ce1126]">PH</span>
        </Link>

        <div className="w-full max-w-md">
          <h1 className="text-xl font-extrabold text-foreground mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Set up your HRISPH workspace in under 2 minutes.
          </p>

          <SignupForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0038a8] dark:text-blue-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
          By creating an account, you agree to our{' '}
          <Link href="/terms-of-service" className="hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
