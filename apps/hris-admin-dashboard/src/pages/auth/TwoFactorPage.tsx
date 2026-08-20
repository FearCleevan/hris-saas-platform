import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import usersData from '@/data/mock/users.json';

const CODE_LENGTH = 6;

// 'loading'   — checking whether the user already has a verified TOTP factor
// 'enroll'    — no verified factor yet: show QR + secret, first code both enrolls and verifies
// 'challenge' — factor already verified: standard login-time code entry
// 'mock'      — Supabase not configured (local/demo mode); matches project rule 2's mock fallback
type Mode = 'loading' | 'enroll' | 'challenge' | 'mock';

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, verifyTwoFactor, logout } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [mode, setMode] = useState<Mode>(isSupabaseConfigured ? 'loading' : 'mock');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    inputRefs.current[0]?.focus();
    if (isSupabaseConfigured) void initFactor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const initFactor = async () => {
    if (!supabase) return;
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      toast.error('Could not load your security settings: ' + listError.message);
      setMode('challenge'); // fail safe into challenge mode; verify() will surface a clearer error if there's truly no factor
      return;
    }

    const verifiedTotp = data?.totp?.find((f) => f.status === 'verified');
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setMode('challenge');
      return;
    }

    // No verified factor yet — enroll a new one so the QR can render immediately.
    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });
    if (enrollError || !enrollData) {
      toast.error('Could not start two-factor setup: ' + (enrollError?.message ?? 'unknown error'));
      setMode('challenge');
      return;
    }
    setFactorId(enrollData.id);
    setQrCode(enrollData.totp.qr_code);
    setSecret(enrollData.totp.secret);
    setMode('enroll');
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    setError('');
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== '') && next.join('').length === CODE_LENGTH) {
      verifyCode(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      const next = pasted.split('');
      setCode(next);
      verifyCode(pasted);
    }
  };

  const resetCodeInput = () => {
    setCode(Array(CODE_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  const verifyCode = async (fullCode: string) => {
    setIsLoading(true);

    if (mode === 'mock') {
      await new Promise((r) => setTimeout(r, 600));
      const userData = usersData.find((u) => u.email === user?.email);
      if (userData?.twoFactorCode === fullCode || fullCode === '123456') {
        verifyTwoFactor();
        toast.success('Identity verified!');
        navigate('/select-tenant');
      } else {
        setError('Incorrect code. Try 123456 for demo.');
        resetCodeInput();
      }
      setIsLoading(false);
      return;
    }

    if (!supabase || !factorId) {
      setError('Two-factor setup is not ready yet. Please wait a moment and try again.');
      setIsLoading(false);
      return;
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challengeData) {
      setError(challengeError?.message ?? 'Could not start verification. Please try again.');
      resetCodeInput();
      setIsLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: fullCode,
    });

    if (verifyError) {
      setError('Incorrect code. Please check your authenticator app and try again.');
      resetCodeInput();
      setIsLoading(false);
      return;
    }

    verifyTwoFactor();
    toast.success(mode === 'enroll' ? 'Two-factor authentication enabled!' : 'Identity verified!');
    navigate('/select-tenant');
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(code.join(''));
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => toast.success('Secret copied'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 bg-[#0038a8]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-[#0038a8]" />
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
          {mode === 'enroll' ? 'Set up two-factor authentication' : 'Two-factor verification'}
        </h2>

        {mode === 'loading' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Checking your security settings…</p>
        )}

        {mode === 'enroll' && qrCode && (
          <div className="mb-6 text-left">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
              Scan this QR code with Google Authenticator, Authy, or a similar app, then enter the 6-digit code below.
            </p>
            <div
              className="w-40 h-40 mx-auto mb-3 [&_svg]:w-full [&_svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
            {secret && (
              <button
                type="button"
                onClick={copySecret}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mx-auto font-mono"
              >
                <Copy className="w-3.5 h-3.5" />
                {secret}
              </button>
            )}
          </div>
        )}

        {mode === 'challenge' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Enter the 6-digit code from your authenticator app.
          </p>
        )}

        {mode === 'mock' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Enter the 6-digit code from your authenticator app.
            <br />
            <span className="text-[#0038a8] dark:text-blue-400 font-medium">Demo mode: use 123456</span>
          </p>
        )}

        {mode !== 'loading' && (
          <form onSubmit={handleSubmit}>
            {/* OTP inputs */}
            <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  title="text"
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all
                    ${digit ? 'border-[#0038a8] bg-[#0038a8]/5' : 'border-gray-200 dark:border-gray-700'}
                    ${error ? 'border-[#ce1126] bg-red-50 dark:bg-red-950/20' : ''}
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:border-[#0038a8] focus:ring-2 focus:ring-[#0038a8]/20`}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-[#ce1126] mb-4">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 mb-4"
              disabled={isLoading || code.some((d) => d === '')}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                mode === 'enroll' ? 'Enable & Verify' : 'Verify Code'
              )}
            </Button>
          </form>
        )}

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>
      </motion.div>
    </div>
  );
}
