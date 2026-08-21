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
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}
