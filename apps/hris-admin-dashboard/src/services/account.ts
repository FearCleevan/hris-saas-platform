import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Change the current user's password. Re-authenticates with the current
 * password first — Supabase's own auth.updateUser() doesn't require this,
 * but skipping it would let anyone with a live session (e.g. an unattended
 * browser tab) change the password with no proof of knowing the current one.
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) throw new Error('Current password is incorrect');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Request an email change. Supabase sends a confirmation link to the new
 * address (and, depending on project auth settings, the old one too) — the
 * change only takes effect once that link is clicked, not immediately.
 */
export async function changeEmail(newEmail: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  // Route the confirmation link through /auth/callback (same as
  // SignUpPage/ForgotPasswordPage) so the returned session hash actually
  // gets processed instead of landing on the bare root unhandled.
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${window.location.origin}/auth/callback` },
  );
  if (error) throw error;
}

/**
 * Completes an email-change confirmation given the token_hash from the
 * confirmation link. Called from a page requiring an explicit button click
 * (ConfirmActionPage) rather than on page load — the email's link points
 * there instead of straight to Supabase's verify endpoint specifically so
 * automated link-prescanning (Gmail/security gateways visiting links before
 * a human clicks) can't consume the single-use token first.
 */
export async function confirmEmailChange(tokenHash: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email_change' });
  if (error) throw error;
}
