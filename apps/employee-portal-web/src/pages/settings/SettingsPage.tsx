import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Shield, Palette, Globe, HelpCircle,
  Eye, EyeOff, Moon, Sun, ChevronDown, ChevronRight,
  Check, Smartphone, LogOut, Laptop, AlertTriangle,
  LifeBuoy, BookOpen, MessageSquare, ExternalLink, Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// ─── types ───────────────────────────────────────────────────────────────────

type SectionId = 'account' | 'security' | 'appearance' | 'language' | 'help';

// ─── helpers ─────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{description}</p>
    </div>
  );
}

// ─── PASSWORD CHANGE FORM ────────────────────────────────────────────────────

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PwForm = z.infer<typeof pwSchema>;

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { ok: password.length >= 8 },
    { ok: /[A-Z]/.test(password) },
    { ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const color = score === 0 ? 'bg-gray-200' : score === 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-400' : 'bg-green-500';
  const label = ['', 'Weak', 'Fair', 'Strong'][score];
  const textColor = ['', 'text-red-500', 'text-amber-500', 'text-green-600'][score];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? color : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      {label && <p className={`text-xs font-medium ${textColor}`}>{label} — {['', '8+ chars, uppercase & number required', 'Add a number or uppercase', 'Great password!'][score]}</p>}
    </div>
  );
}

function ChangePasswordSection() {
  const { markPasswordChanged } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const newPw = watch('newPassword', '');

  async function onSubmit() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    markPasswordChanged();
    toast.success('Password updated successfully!');
    reset();
    setLoading(false);
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        {/* Current */}
        <div className="space-y-1.5">
          <Label htmlFor="s-current">Current password</Label>
          <div className="relative">
            <Input id="s-current" type={showCurrent ? 'text' : 'password'} placeholder="Your current password" className="pr-10" {...register('currentPassword')} />
            <button type="button" aria-label="Toggle current password visibility" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-xs text-red-500">{errors.currentPassword.message}</p>}
        </div>

        {/* New */}
        <div className="space-y-1.5">
          <Label htmlFor="s-new">New password</Label>
          <div className="relative">
            <Input id="s-new" type={showNew ? 'text' : 'password'} placeholder="Create a strong password" className="pr-10" {...register('newPassword')} />
            <button type="button" aria-label="Toggle new password visibility" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPw && <PasswordStrengthBar password={newPw} />}
          {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="s-confirm">Confirm new password</Label>
          <div className="relative">
            <Input id="s-confirm" type={showConfirm ? 'text' : 'password'} placeholder="Repeat your new password" className="pr-10" {...register('confirmPassword')} />
            <button type="button" aria-label="Toggle confirm password visibility" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" disabled={loading} className="h-10">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating…
            </span>
          ) : 'Update Password'}
        </Button>
      </form>
    </Card>
  );
}

// ─── ACCOUNT SECTION ─────────────────────────────────────────────────────────

function AccountSection() {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <SectionHeader title="Account" description="Your account information and password" />

      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Profile Overview</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-xl font-bold text-brand-blue">
            {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? 'U'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.position} · {user?.department}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
            <p className="text-xs text-gray-400 mb-0.5">Employee ID</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{user?.employeeId}</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
            <p className="text-xs text-gray-400 mb-0.5">Role</p>
            <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">To update your profile information, go to <span className="text-brand-blue">My Profile</span> and submit an edit request.</p>
      </Card>

      <ChangePasswordSection />
    </div>
  );
}

// ─── SECURITY SECTION ────────────────────────────────────────────────────────

type TwoFAStep = 'off' | 'qr' | 'verify' | 'done';

function SecuritySection() {
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('off');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const sessions = [
    { id: 's1', device: 'Chrome on Windows 11', location: 'Quezon City, PH', lastActive: 'Active now', current: true },
    { id: 's2', device: 'Firefox on Android', location: 'Taguig, PH', lastActive: '2 days ago', current: false },
  ];

  function verifyOTP() {
    if (otp === '123456') {
      setTwoFAStep('done');
      toast.success('Two-factor authentication enabled!');
    } else {
      setOtpError('Incorrect code. Try 123456 for demo.');
    }
  }

  function disable2FA() {
    setTwoFAStep('off');
    setOtp('');
    setOtpError('');
    toast.success('2FA has been disabled.');
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Security" description="Two-factor authentication and active sessions" />

      {/* 2FA */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500">Extra security via authenticator app</p>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${twoFAStep === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            {twoFAStep === 'done' ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {twoFAStep === 'off' && (
            <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-gray-500 mb-4">Protect your account with a one-time code from Google Authenticator or Authy.</p>
              <button type="button" onClick={() => setTwoFAStep('qr')} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 transition-colors">
                Enable 2FA
              </button>
            </motion.div>
          )}

          {twoFAStep === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">Open your authenticator app and scan this QR code. Keep your backup codes safe.</p>
              </div>

              {/* Simulated QR */}
              <div className="flex justify-center">
                <div className="w-36 h-36 border-2 border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                  <div className="grid grid-cols-5 gap-0.5">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`w-5 h-5 rounded-sm ${[0,1,5,6,10,11,14,19,20,24,3,8,16,22,23,12,7,17,4,21,2,13,18,9,15][i] % 2 === 0 ? 'bg-gray-900 dark:bg-white' : 'bg-white dark:bg-gray-700'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-center text-gray-400">Or enter manually: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">JBSWY3DPEHPK3PXP</span></p>

              <div className="space-y-2">
                <Label htmlFor="otp">Enter the 6-digit code from your app</Label>
                <div className="flex gap-3">
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                    placeholder="123456"
                    className="text-center tracking-widest font-mono text-lg max-w-[140px]"
                  />
                  <button type="button" onClick={verifyOTP} disabled={otp.length !== 6} className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Verify
                  </button>
                </div>
                {otpError && <p className="text-xs text-red-500">{otpError}</p>}
              </div>

              <button type="button" onClick={() => setTwoFAStep('off')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </motion.div>
          )}

          {twoFAStep === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">2FA is active. Your account is protected.</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Backup codes (save these securely):</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['8a2f-c91d', 'b4e7-3a02', 'f81c-9d5e', 'c30a-7f12', '2e9b-4561', '6d5c-8b3a'].map((code) => (
                    <code key={code} className="text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-300">{code}</code>
                  ))}
                </div>
              </div>
              <button type="button" onClick={disable2FA} className="text-sm text-red-500 hover:text-red-700 transition-colors">
                Disable 2FA
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Active Sessions */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <Laptop className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{session.device}</p>
                  <p className="text-xs text-gray-400">{session.location} · {session.lastActive}</p>
                </div>
              </div>
              {session.current ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-medium">This device</span>
              ) : (
                <button type="button" onClick={() => toast.success('Session revoked')} className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" /> Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── APPEARANCE SECTION ───────────────────────────────────────────────────────

function AppearanceSection() {
  const { darkMode, toggleDarkMode } = useAuth();
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');

  return (
    <div className="space-y-5">
      <SectionHeader title="Appearance" description="Theme, font size, and display density" />

      {/* Theme */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Color Theme</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { if (darkMode) toggleDarkMode(); }}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${!darkMode ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Light</span>
            {!darkMode && <Check className="w-4 h-4 text-brand-blue" />}
          </button>

          <button
            type="button"
            onClick={() => { if (!darkMode) toggleDarkMode(); }}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${darkMode ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
          >
            <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-700 shadow-sm flex items-center justify-center">
              <Moon className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark</span>
            {darkMode && <Check className="w-4 h-4 text-brand-blue" />}
          </button>
        </div>
      </Card>

      {/* Font size */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Font Size</h3>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((size) => {
            const labels = { sm: 'Small', md: 'Medium', lg: 'Large' };
            const demo = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
            return (
              <button
                key={size}
                type="button"
                onClick={() => { setFontSize(size); toast.success(`Font size set to ${labels[size]}`); }}
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${fontSize === size ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
              >
                <span className={`${demo[size]} font-medium text-gray-800 dark:text-gray-200`}>Aa</span>
                <span className="text-xs text-gray-500">{labels[size]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Density */}
      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Display Density</h3>
        <p className="text-xs text-gray-400 mb-4">Controls spacing and padding throughout the portal</p>
        <div className="flex gap-2">
          {(['compact', 'normal', 'comfortable'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDensity(d); toast.success(`Density set to ${d}`); }}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all capitalize ${density === d ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/10 text-brand-blue' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── LANGUAGE SECTION ─────────────────────────────────────────────────────────

function LanguageSection() {
  const [lang, setLang] = useState<'en' | 'fil'>('en');
  const [dateFormat, setDateFormat] = useState<'mdy' | 'dmy' | 'ymd'>('mdy');
  const [saved, setSaved] = useState(false);

  const LANGUAGES = [
    { code: 'en' as const, label: 'English', flag: '🇺🇸', desc: 'Default portal language' },
    { code: 'fil' as const, label: 'Filipino', flag: '🇵🇭', desc: 'Wikang Filipino (Tagalog)' },
  ];

  const DATE_FORMATS = [
    { code: 'mdy' as const, label: 'MM/DD/YYYY', example: '05/01/2025' },
    { code: 'dmy' as const, label: 'DD/MM/YYYY', example: '01/05/2025' },
    { code: 'ymd' as const, label: 'YYYY-MM-DD', example: '2025-05-01' },
  ];

  function save() {
    setSaved(true);
    toast.success('Language preferences saved');
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Language & Region" description="Set your preferred language and date format" />

      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Display Language</h3>
        <div className="space-y-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${lang === l.code ? 'border-brand-blue bg-blue-50/60 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{l.flag}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{l.label}</p>
                  <p className="text-xs text-gray-500">{l.desc}</p>
                </div>
              </div>
              {lang === l.code && <Check className="w-5 h-5 text-brand-blue shrink-0" />}
            </button>
          ))}
        </div>

        {lang === 'fil' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400"
          >
            Ang Filipino na bersyon ay kasalukuyang nasa beta pa. Ang ilang seksyon ay mananatili sa Ingles.
          </motion.div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Date Format</h3>
        <div className="space-y-2">
          {DATE_FORMATS.map((df) => (
            <button
              key={df.code}
              type="button"
              onClick={() => setDateFormat(df.code)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${dateFormat === df.code ? 'border-brand-blue bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{df.label}</span>
                <span className="text-xs text-gray-400 ml-2">e.g. {df.example}</span>
              </div>
              {dateFormat === df.code && <Check className="w-4 h-4 text-brand-blue" />}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 transition-colors"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

// ─── HELP SECTION ─────────────────────────────────────────────────────────────

const FAQS = [
  { q: 'How do I file a leave request?', a: 'Go to the Leaves section, click "File Leave", fill in the dates and type, then submit. Your manager will receive a notification to approve or reject.' },
  { q: 'When will my payslip be available?', a: 'Payslips are available within 3 business days after each payroll cutoff (1st–15th, 16th–end of month). Check the Payslip section to download or view.' },
  { q: 'How do I correct an attendance error?', a: 'Go to the Attendance section, click "Correction Request", select the date, enter the correct time, and submit. HR will review within 2 business days.' },
  { q: 'How do I add a dependent to my HMO?', a: 'Go to Benefits → Dependents and review the instructions. Submit a request through HR with valid documents (birth/marriage certificate).' },
  { q: 'How do I submit an expense claim?', a: 'Go to Expenses, click "New Expense", select the category, enter the amount, upload receipts, and submit. Reimbursements are processed within 5 business days after approval.' },
  { q: 'How do I change my profile information?', a: 'Go to My Profile, click the "Edit" button next to the section you want to update. Changes go through an approval workflow before taking effect.' },
];

function HelpSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <SectionHeader title="Help & Support" description="FAQs, contact HR, and system information" />

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <MessageSquare className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Message HR', sub: 'Get help from the team', action: () => toast.info('Go to Notifications → Messages') },
          { icon: <BookOpen className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Employee Handbook', sub: 'View company policies', action: () => toast.info('Available in Documents → Policies') },
          { icon: <LifeBuoy className="w-5 h-5 text-green-600" />, bg: 'bg-green-100 dark:bg-green-900/30', label: 'IT Support', sub: 'Report a technical issue', action: () => toast.info('Email: support@hris-demo.ph') },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow text-left"
          >
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* FAQs */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
        </div>
        <ul>
          {FAQS.map((faq, i) => (
            <li key={i} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 pr-4">{faq.q}</span>
                <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </Card>

      {/* System info */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">System Information</h3>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['Portal Version', 'v1.0.0 (May 2025)'],
            ['API Status', 'Operational ✓'],
            ['Last Data Sync', 'May 1, 2025 at 9:00 AM'],
            ['Browser', navigator.userAgent.split(' ').slice(-2).join(' ')],
            ['Support Email', 'hr@hris-demo.ph'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>

        <a
          href="mailto:hr@hris-demo.ph"
          className="mt-4 flex items-center gap-2 text-sm text-brand-blue hover:opacity-80 transition-opacity"
        >
          <ExternalLink className="w-4 h-4" /> Contact HR directly
        </a>
      </Card>
    </div>
  );
}

// ─── ROOT PAGE ────────────────────────────────────────────────────────────────

const NAV_SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'account',    label: 'Account',    icon: <User className="w-4 h-4" /> },
  { id: 'security',   label: 'Security',   icon: <Shield className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'language',   label: 'Language',   icon: <Globe className="w-4 h-4" /> },
  { id: 'help',       label: 'Help',       icon: <HelpCircle className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('account');
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account, security, appearance, and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <aside className="lg:w-56 shrink-0">
          <nav className="lg:sticky lg:top-6 space-y-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {s.icon}
                {s.label}
                {activeSection === s.id && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
              </button>
            ))}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'account'    && <AccountSection />}
              {activeSection === 'security'   && <SecuritySection />}
              {activeSection === 'appearance' && <AppearanceSection />}
              {activeSection === 'language'   && <LanguageSection />}
              {activeSection === 'help'       && <HelpSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
