// src/pages/auth/ConfirmActionPage.tsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { confirmEmailChange } from '@/services/account';

// Requires an explicit button click before calling verifyOtp — deliberately
// NOT auto-confirming on page load. The email link points here (via a
// custom Supabase email template using {{ .TokenHash }}) instead of
// straight to Supabase's verify endpoint, specifically so automated
// link-prescanning (Gmail/security gateways visiting links before a human
// clicks) can't consume the single-use token before the real click.
type Status = 'idle' | 'confirming' | 'success' | 'error';

export default function ConfirmActionPage() {
  const [params] = useSearchParams();
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const missingParams = !tokenHash || type !== 'email_change';

  const handleConfirm = async () => {
    if (!tokenHash || missingParams) return;
    setStatus('confirming');
    try {
      await confirmEmailChange(tokenHash);
      setStatus('success');
    } catch (err) {
      setErrorMsg((err as Error).message || 'This link is invalid or has expired.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
        {missingParams ? (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Invalid Link</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This confirmation link is missing required information.
            </p>
            <Link to="/login" className="inline-block px-4 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-lg hover:bg-brand-blue-dark transition-colors">
              Back to Login
            </Link>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Email Updated</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Your email address has been changed. You can close this tab, or sign in with your new email below.
            </p>
            <Link to="/login" className="inline-block px-4 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-lg hover:bg-brand-blue-dark transition-colors">
              Go to Login
            </Link>
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Confirmation Failed</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
            <Link to="/profile" className="inline-block px-4 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-lg hover:bg-brand-blue-dark transition-colors">
              Back to Profile
            </Link>
          </>
        ) : (
          <>
            <Mail className="w-10 h-10 text-brand-blue mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">Confirm Email Change</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Click below to confirm this change to your account email address.
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={status === 'confirming'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-bold rounded-lg hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
            >
              {status === 'confirming' && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Email Change
            </button>
          </>
        )}
      </div>
    </div>
  );
}
