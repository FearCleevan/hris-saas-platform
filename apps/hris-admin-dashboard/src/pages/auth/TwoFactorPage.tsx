import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import usersData from '@/data/mock/users.json';

const CODE_LENGTH = 6;

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, verifyTwoFactor, logout } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
    inputRefs.current[0]?.focus();
  }, [isAuthenticated, navigate]);

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

  const verifyCode = async (fullCode: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const userData = usersData.find((u) => u.email === user?.email);
    if (userData?.twoFactorCode === fullCode || fullCode === '123456') {
      verifyTwoFactor();
      toast.success('Identity verified!');
      navigate('/select-tenant');
    } else {
      setError('Incorrect code. Try 123456 for demo.');
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(code.join(''));
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
          Two-factor verification
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Enter the 6-digit code from your authenticator app.
          <br />
          <span className="text-[#0038a8] dark:text-blue-400 font-medium">Demo: use 123456</span>
        </p>

        <form onSubmit={handleSubmit}>
          {/* OTP inputs */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                title='text'
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
              'Verify Code'
            )}
          </Button>
        </form>

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
