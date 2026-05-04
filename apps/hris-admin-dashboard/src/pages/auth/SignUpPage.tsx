import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Building2, CheckCircle, Shield, Users, BarChart3, FileCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User as UserType } from '@/types';

interface SignUpForm {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  password: string;
}

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const features = [
  { icon: Users,    label: 'Manage 50+ employees per company' },
  { icon: BarChart3, label: 'Real-time payroll computation' },
  { icon: FileCheck, label: 'BIR, SSS, Pag-IBIG, PhilHealth compliant' },
  { icon: Shield,   label: 'RA 10173 data privacy compliant' },
];

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [employeeCount, setEmployeeCount] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>();

  const onSubmit = async (data: SignUpForm) => {
    setIsLoading(true);
    const fullName = `${data.firstName} ${data.lastName}`;

    // ── Real Supabase sign-up ──────────────────────────────────────
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            full_name: fullName,
            company_name: data.companyName,
            company_size: employeeCount,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message || 'Sign-up failed. Please try again.');
        setIsLoading(false);
        return;
      }

      if (authData.session) {
        await supabase.from('user_profiles').upsert(
          {
            id: authData.session.user.id,
            full_name: fullName,
            organization_id: null,
            must_change_password: false,
          },
          { onConflict: 'id' }
        );

        const user: UserType = {
          id: authData.session.user.id,
          email: authData.session.user.email!,
          name: fullName,
          role: 'hr_staff',
          tenantIds: [],
        };
        storeLogin(user, true);
        toast.success("Account created! Let's set up your company.");
        navigate('/setup-company');
      } else {
        setEmailSent(data.email);
      }

      setIsLoading(false);
      return;
    }

    // ── Mock fallback (local dev without Supabase) ─────────────────
    await new Promise((r) => setTimeout(r, 800));
    const mockUser: UserType = {
      id: `mock-${Date.now()}`,
      email: data.email,
      name: fullName,
      role: 'hr_staff',
      tenantIds: [],
    };
    storeLogin(mockUser, true);
    toast.success("Account created! Let's set up your company.");
    navigate('/setup-company');
    setIsLoading(false);
  };

  // ── Email-confirmation waiting screen ─────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            We sent a confirmation link to:
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-6">
            {emailSent}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-8 leading-relaxed">
            Click the link in the email to confirm your account — you'll be taken straight to company setup.
            Didn't receive it?{' '}
            <button
              type="button"
              onClick={() => setEmailSent(null)}
              className="text-brand-blue hover:underline dark:text-blue-400"
            >
              Try a different email
            </button>
            .
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col w-120 shrink-0 bg-brand-blue text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 flex h-1.5">
          <div className="flex-1 bg-brand-blue" />
          <div className="flex-1 bg-brand-red" />
          <div className="flex-1 bg-brand-gold" />
        </div>

        <div className="flex flex-col h-full px-10 py-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-base">H</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight">HRISPH</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold leading-tight mb-4">
              Start managing your<br />team the smarter way.
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-sm">
              Free 30-day trial. No credit card required. Full access to all features from day one.
            </p>

            <ul className="flex flex-col gap-4">
              {features.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-blue-100">
                  <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">H</span>
            </div>
            <span className="text-lg font-extrabold text-gray-900 dark:text-white">HRISPH</span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
            Create your account
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Start your free 30-day trial — no credit card needed.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* First + Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  autoComplete="given-name"
                  {...register('firstName', { required: 'Required' })}
                />
                {errors.firstName && (
                  <p className="text-xs text-brand-red">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="dela Cruz"
                  autoComplete="family-name"
                  {...register('lastName', { required: 'Required' })}
                />
                {errors.lastName && (
                  <p className="text-xs text-brand-red">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Work Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.ph"
                  className="pl-9"
                  autoComplete="email"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-brand-red">{errors.email.message}</p>
              )}
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Corp"
                  className="pl-9"
                  autoComplete="organization"
                  {...register('companyName', { required: 'Company name is required' })}
                />
              </div>
              {errors.companyName && (
                <p className="text-xs text-brand-red">{errors.companyName.message}</p>
              )}
            </div>

            {/* Number of Employees */}
            <div className="space-y-1.5">
              <Label htmlFor="employeeCount">Number of Employees</Label>
              <div className="relative">
                <select
                  id="employeeCount"
                  aria-label="Number of employees"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select range…</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPassword ? 'hide' : 'show'}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-brand-red">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading || !employeeCount}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                'Start Free 14-Day Trial'
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              No credit card required. Cancel anytime.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-blue font-medium hover:underline dark:text-blue-400"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
