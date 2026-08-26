// src/pages/auth/SetPasswordPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { setInitialPassword } from '@/services/account';
import { isSupabaseConfigured } from '@/lib/supabase';

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
        className="w-full h-10 pl-9 pr-9 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function SetPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        await setInitialPassword(user.id, newPassword);
      }
      // Reflect locally so ProtectedRoute stops redirecting here immediately —
      // the DB write above is the source of truth, this just mirrors it.
      useAuthStore.getState().login({ ...user, mustChangePassword: false }, true);
      toast.success('Password set — welcome to HRISPH!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Could not set your password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6">
        <div className="w-11 h-11 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-5 h-5 text-brand-blue" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Set Your Password</h1>
        <p className="text-sm text-gray-500 mb-6">
          {user?.name ? `Welcome, ${user.name.split(' ')[0]}! ` : ''}
          You signed in via an invite link — set a password now so you can sign in directly next time.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="new-password" className="text-xs font-semibold text-gray-500 mb-1 block">New Password</label>
            <PasswordInput id="new-password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-xs font-semibold text-gray-500 mb-1 block">Confirm Password</label>
            <PasswordInput id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            {passwordMismatch && <p className="text-[11px] text-red-500 mt-1">Passwords don't match</p>}
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="mt-5 w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
