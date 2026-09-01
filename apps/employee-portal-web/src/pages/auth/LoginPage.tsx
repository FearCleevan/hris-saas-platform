import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  FileText,
  CalendarDays,
  Clock,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

const features = [
  { icon: FileText, label: 'View & download payslips anytime' },
  { icon: CalendarDays, label: 'File and track leave requests' },
  { icon: Clock, label: 'Monitor attendance & overtime' },
  { icon: Gift, label: 'Access benefits & company perks' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: false } });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const { error } = await login(data.email, data.password);

    if (error) {
      toast.error(error);
      setIsLoading(false);
      return;
    }

    // AuthProvider resolves the employees row asynchronously after this —
    // ProtectedRoute's loading/noEmployeeRecord states handle the rest,
    // this just needs to land on the dashboard route.
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0038a8 0%, #002d8a 60%, #001f6b 100%)',
        }}
      >
        {/* PH flag stripe accent */}
        <div className="absolute top-0 left-0 right-0 flex h-1.5 z-10">
          <div className="flex-1 bg-[#0038a8]" />
          <div className="flex-1 bg-[#ce1126]" />
          <div className="flex-1 bg-[#fcd116]" />
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -left-8 w-32 h-32 rounded-full bg-white/5" />

        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-extrabold text-lg">H</span>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">HRISPH</span>
              <p className="text-blue-300 text-xs font-medium">Employee Portal</p>
            </div>
          </div>

          {/* Hero */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="text-3xl font-extrabold leading-tight mb-3 text-white">
                Your workplace,<br />simplified.
              </h1>
              <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-xs">
                Everything you need as an employee — payslips, leaves, attendance, and benefits — all in one place.
              </p>
            </motion.div>

            <motion.ul
              className="flex flex-col gap-3.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              {features.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-blue-100">
                  <span className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <Icon className="w-4 h-4 text-white" />
                  </span>
                  {label}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Role indicator */}
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
            <p className="text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">Roles supported</p>
            <div className="flex gap-2 flex-wrap">
              {['Employee', 'Manager', 'Team Lead'].map((r) => (
                <span key={r} className="px-2.5 py-1 bg-white/15 rounded-full text-xs text-white font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#0038a8] rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">H</span>
            </div>
            <div>
              <span className="text-lg font-extrabold text-gray-900 dark:text-white">HRISPH</span>
              <p className="text-gray-500 text-xs">Employee Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Sign in to your employee account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@hris-demo.ph"
                  className="pl-9"
                  autoComplete="email"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-[#ce1126]">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#0038a8] hover:underline dark:text-blue-400"
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
                <p className="text-xs text-[#ce1126]">{errors.password.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 accent-[#0038a8]"
                {...register('rememberMe')}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </label>

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
          </form>
        </motion.div>
      </div>
    </div>
  );
}
