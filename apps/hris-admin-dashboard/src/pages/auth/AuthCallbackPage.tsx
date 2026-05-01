import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured, fetchUserContext } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { User, Tenant } from '@/types';

// Handles the redirect from the landing page after sign-in / sign-up.
// Supabase appends #access_token=...&refresh_token=... to the URL.
// The Supabase client automatically picks these up (detectSessionInUrl: true)
// and establishes the local session. We just need to read it and sync state.
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login, setTenant } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    async function handleCallback() {
      if (!isSupabaseConfigured || !supabase) {
        navigate('/login', { replace: true });
        return;
      }

      // The Supabase client resolves the session from the URL hash automatically.
      // We just need to wait a tick then call getSession().
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus('error');
        return;
      }

      const { profile, org, role } = await fetchUserContext(session.user.id);

      if (!profile) {
        setStatus('error');
        return;
      }

      const user: User = {
        id:              session.user.id,
        email:           session.user.email!,
        name:            profile.full_name,
        role:            (role ?? 'hr_staff') as User['role'],
        avatar:          profile.avatar_url ?? undefined,
        tenantIds:       org ? [org.id] : [],
      };

      // Log in with 2FA skipped (Supabase handles MFA separately in Phase 14)
      login(user, true);

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
        setTenant(tenant);
        navigate('/', { replace: true });
      } else {
        // New signup — no org yet (shouldn't happen but safety fallback)
        navigate('/setup-company', { replace: true });
      }
    }

    handleCallback();
  }, [login, navigate, setTenant]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-sm px-6">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Authentication failed</p>
          <p className="text-sm text-gray-500 mb-6">The sign-in link may have expired. Please try again.</p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  );
}
