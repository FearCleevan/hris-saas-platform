import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Shield, Users, BarChart3, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured, fetchUserContext } from '@/lib/supabase';
import usersData from '@/data/mock/users.json';
import type { User, Tenant } from '@/types';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

const features = [
  { icon: Users, label: 'Manage 50+ employees per company' },
  { icon: BarChart3, label: 'Real-time payroll computation' },
  { icon: FileCheck, label: 'BIR, SSS, Pag-IBIG, PhilHealth compliant' },
  { icon: Shield, label: 'RA 10173 data privacy compliant' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setPendingEmail } = useAuth();
  const { login: storeLogin } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: false } });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);

    // ── Real Supabase auth (production) ──────────────────────────
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email:    data.email,
        password: data.password,
      });

      if (error || !authData.session) {
        toast.error(
          error?.message === 'Invalid login credentials'
            ? 'Invalid email or password.'
            : (error?.message ?? 'Sign-in failed. Please try again.')
        );
        setIsLoading(false);
        return;
      }

      const { profile, org, role } = await fetchUserContext(authData.session.user.id);

      if (!profile) {
        toast.error('Could not load your profile. Please contact support.');
        setIsLoading(false);
        return;
      }

      const user: User = {
        id:        authData.session.user.id,
        email:     authData.session.user.email!,
        name:      profile.full_name,
        role:      (role ?? 'hr_staff') as User['role'],
        avatar:    profile.avatar_url ?? undefined,
        tenantIds: org ? [org.id] : [],
      };

      storeLogin(user, true);

      if (org) {
        const tenant: Tenant = {
          id:            org.id,
          name:          org.name,
          slug:          org.slug,
          plan:          org.plan === 'trial' ? 'starter' : org.plan,
          employeeCount: 0,
          logoUrl:       org.logo_url ?? undefined,
          industry:      org.industry ?? '',
          location:      '',
        };
        useAuthStore.getState().setTenant(tenant);
        navigate('/');
      } else {
        navigate('/setup-company');
      }

      setIsLoading(false);
      return;
    }

    // ── Mock auth fallback (local dev without Supabase) ───────────
    await new Promise((r) => setTimeout(r, 800));

    const mockUser = usersData.find(
      (u) => u.email === data.email && u.password === data.password
    );

    if (!mockUser) {
      toast.error('Invalid email or password. Try admin@hris-demo.ph / Admin@123');
      setIsLoading(false);
      return;
    }

    const { password: _pw, twoFactorCode: _tfc, ...safeUser } = mockUser;

    if (mockUser.twoFactorEnabled) {
      setPendingEmail(mockUser.email);
      storeLogin(safeUser as Parameters<typeof storeLogin>[0], false);
      navigate('/verify-2fa');
    } else {
      storeLogin(safeUser as Parameters<typeof storeLogin>[0], true);
      login(safeUser as Parameters<typeof login>[0], true);
      navigate('/select-tenant');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col w-120 shrink-0 bg-brand-blue text-white relative overflow-hidden">
        {/* PH flag accent */}
        <div className="absolute top-0 left-0 right-0 flex h-1.5">
          <div className="flex-1 bg-brand-blue" />
          <div className="flex-1 bg-brand-red" />
          <div className="flex-1 bg-brand-gold" />
        </div>

        <div className="flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-base">H</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight">HRISPH</span>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold leading-tight mb-4">
              Manage your Philippine<br />workforce with confidence.
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-sm">
              Enterprise HRIS built for PH labor law, BIR compliance, and government contributions — all in one dashboard.
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

          {/* Demo creds hint */}
          <div className="bg-white/10 rounded-xl p-4 text-xs text-blue-200 space-y-1">
            <p className="font-semibold text-white mb-2">Demo Accounts</p>
            <p>admin@hris-demo.ph / Admin@123 <span className="text-brand-gold">(Super Admin)</span></p>
            <p>hr@hris-demo.ph / HR@123 <span className="text-brand-gold">(HR Manager)</span></p>
            <p>hrstaff@hris-demo.ph / Staff@123 <span className="text-brand-gold">(HR Staff)</span></p>
            <p>accounting@hris-demo.ph / Acct@123 <span className="text-brand-gold">(Accountant)</span></p>
            <p className="pt-1 text-blue-300">2FA code: <span className="font-mono text-white">123456</span></p>
          </div>
        </div>

        {/* Background decoration */}
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
            Welcome back
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Sign in to your HRISPH account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
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

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-blue hover:underline dark:text-blue-400"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
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
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-brand-red">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-brand-blue accent-brand-blue"
                {...register('rememberMe')}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </label>

            {/* Submit */}
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Google SSO stub */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={() => toast.info('Google SSO integration coming soon.')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <a
              href="https://hrisph.vercel.app/signup"
              className="text-brand-blue font-medium hover:underline dark:text-blue-400"
            >
              Start free trial
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
