import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const barColor =
    score === 0
      ? 'bg-gray-200 dark:bg-gray-700'
      : score === 1
        ? 'bg-[#ce1126]'
        : score === 2
          ? 'bg-[#fcd116]'
          : 'bg-[#059669]';
  const label = score === 0 ? '' : score === 1 ? 'Weak' : score === 2 ? 'Fair' : 'Strong';

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        {label && (
          <span
            className={`text-xs font-medium ${score === 1 ? 'text-[#ce1126]' : score === 2 ? 'text-[#b8960c]' : 'text-[#059669]'}`}
          >
            {label}
          </span>
        )}
        <div className="flex gap-3 ml-auto">
          {checks.map(({ label: cl, ok }) => (
            <span
              key={cl}
              className={`text-xs ${ok ? 'text-[#059669]' : 'text-gray-400 dark:text-gray-600'}`}
            >
              {ok ? '✓' : '○'} {cl}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { markPasswordChanged, user } = useAuthStore();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
  });

  const newPasswordValue = watch('newPassword', '');

  const onSubmit = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    markPasswordChanged();
    toast.success('Password updated successfully!');
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-blue-100/50 dark:shadow-black/30 p-8 border border-gray-100 dark:border-gray-800">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0038a8]/10 dark:bg-[#0038a8]/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#0038a8]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Set new password
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Hi {user?.name?.split(' ')[0]} — required before continuing
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 p-3 bg-[#fcd116]/10 border border-[#fcd116]/30 rounded-xl">
            Your account requires a password change before you can access the portal.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Your current password"
                  className="pl-9 pr-10"
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Toggle current password visibility"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-[#ce1126]">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  className="pl-9 pr-10"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Toggle new password visibility"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPasswordValue && <PasswordStrength password={newPasswordValue} />}
              {errors.newPassword && (
                <p className="text-xs text-[#ce1126]">{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  className="pl-9 pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-[#ce1126]">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating…
                </span>
              ) : (
                'Update Password & Continue'
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
