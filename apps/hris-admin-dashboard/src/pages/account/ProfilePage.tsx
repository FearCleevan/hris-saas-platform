// src/pages/account/ProfilePage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Loader2, Building2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { changePassword, changeEmail } from '@/services/account';
import { isSupabaseConfigured } from '@/lib/supabase';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_manager:  'HR Manager',
  hr_staff:    'HR Staff',
  accountant:  'Accountant',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function PasswordInput({
  id, value, onChange, placeholder, autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-9 pl-9 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, tenant } = useAuth();

  /* ─── Change email ─── */
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [savingEmail, setSavingEmail] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
  const emailChanged = newEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();

  const handleChangeEmail = async () => {
    if (!emailValid || !emailChanged) return;
    setSavingEmail(true);
    try {
      if (isSupabaseConfigured) {
        await changeEmail(newEmail.trim());
        toast.success('Confirmation link sent — check your inbox to finish changing your email');
      } else {
        toast.success('Email updated (demo mode)');
      }
    } catch (err) {
      toast.error((err as Error).message || 'Could not update email');
    } finally {
      setSavingEmail(false);
    }
  };

  /* ─── Change password ─── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleChangePassword = async () => {
    if (!canSubmitPassword) return;
    setSavingPassword(true);
    try {
      if (isSupabaseConfigured && user?.email) {
        await changePassword(user.email, currentPassword, newPassword);
        toast.success('Password updated');
      } else {
        toast.success('Password updated (demo mode)');
      }
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error((err as Error).message || 'Could not update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-xl">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account email and password</p>
      </div>

      {/* Identity card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 bg-brand-blue">
          {getInitials(user?.name ?? 'U')}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{user?.name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span>
            {tenant?.name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{tenant.name}</span>}
          </div>
        </div>
      </div>

      {/* Change email */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-brand-blue" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Email Address</h3>
        </div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Email</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="w-full h-9 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
        />
        {emailChanged && (
          <p className="text-[10px] text-gray-400 mt-1.5">
            A confirmation link will be sent to the new address — the change won't take effect until you click it.
          </p>
        )}
        <button
          type="button"
          disabled={!emailValid || !emailChanged || savingEmail}
          onClick={handleChangeEmail}
          className="mt-3 flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
        >
          {savingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Email
        </button>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-brand-blue" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Change Password</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="current-password" className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Current Password</label>
            <PasswordInput id="current-password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="new-password" className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">New Password</label>
            <PasswordInput id="new-password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Confirm New Password</label>
            <PasswordInput id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            {passwordMismatch && <p className="text-[10px] text-red-500 mt-1">Passwords don't match</p>}
          </div>
        </div>
        <button
          type="button"
          disabled={!canSubmitPassword || savingPassword}
          onClick={handleChangePassword}
          className="mt-4 flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
        >
          {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
          Update Password
        </button>
      </div>
    </motion.div>
  );
}
