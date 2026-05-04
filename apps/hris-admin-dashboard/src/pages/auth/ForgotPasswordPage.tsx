import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface ForgotForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>();

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        toast.error(error.message || 'Failed to send reset link. Please try again.');
        setIsLoading(false);
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 1000));
    }

    setSubmittedEmail(data.email);
    setSubmitted(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-brand-blue" />
              </div>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                Forgot your password?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                No worries. Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                Check your email
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                We sent a password reset link to:
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-8">
                {submittedEmail}
              </p>

              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-brand-blue hover:underline dark:text-blue-400"
                >
                  try a different email
                </button>
                .
              </p>

              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
