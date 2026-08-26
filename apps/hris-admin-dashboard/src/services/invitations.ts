import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type InviteRole = 'super_admin' | 'hr_manager' | 'hr_staff' | 'accountant';

export interface InviteMemberInput {
  email: string;
  role: InviteRole;
  organizationId: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: InviteRole;
  roleName: string;
  roleColor: string;
  organizationId: string;
  organizationName: string;
  sentAt: string;
  expiresAt: string;
  status: 'pending';
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: InviteRole;
  roleName: string;
  roleColor: string;
  organizationId: string;
  organizationName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  joinedAt: string;
}

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_manager:  'HR Manager',
  hr_staff:    'HR Staff',
  accountant:  'Accountant',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#dc2626',
  hr_manager:  '#0038a8',
  hr_staff:    '#7c3aed',
  accountant:  '#059669',
};

function getEdgeFunctionUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/${path}`;
}

/**
 * Invite a user via the `invite-member` Edge Function.
 * The Edge Function calls supabase.auth.admin.inviteUserByEmail which
 * sends the email automatically, then inserts a tracking row in invite_tokens.
 * Returns the new invite details for optimistic UI update.
 */
export async function sendInvite(input: InviteMemberInput): Promise<{
  email: string; role: InviteRole; organizationId: string;
  organizationName: string; expiresAt: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  // Get the caller's JWT to pass to the Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(getEdgeFunctionUrl('invite-member'), {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({
      email:          input.email.toLowerCase().trim(),
      role:           input.role,
      organizationId: input.organizationId,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to send invitation');

  return {
    email:            data.email,
    role:             data.role as InviteRole,
    organizationId:   data.organizationId,
    organizationName: data.organizationName,
    expiresAt:        data.expiresAt,
  };
}

/**
 * Fetch pending invitations for an organization via the get_pending_invites RPC.
 */
export async function getPendingInvites(
  organizationId: string,
  organizationName: string,
): Promise<PendingInvite[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('get_pending_invites', {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id:               row.id,
    email:            row.email,
    role:             row.role_slug as InviteRole,
    roleName:         row.role_name ?? ROLE_NAMES[row.role_slug] ?? row.role_slug,
    roleColor:        ROLE_COLORS[row.role_slug] ?? '#6b7280',
    organizationId,
    organizationName,
    sentAt:           row.sent_at,
    expiresAt:        row.expires_at,
    status:           'pending' as const,
  }));
}

/**
 * Fetch all team members for an organization via the get_team_members RPC.
 */
export async function getTeamMembers(
  organizationId: string,
  organizationName: string,
): Promise<TeamMember[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('get_team_members', {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  return (data ?? []).map((row: any, i: number) => ({
    id:               `tm-${i}`,
    userId:           row.user_id,
    name:             row.full_name || row.email,
    email:            row.email,
    avatar:           row.avatar_url ?? null,
    role:             row.role_slug as InviteRole,
    roleName:         row.role_name ?? ROLE_NAMES[row.role_slug] ?? row.role_slug,
    roleColor:        ROLE_COLORS[row.role_slug] ?? '#6b7280',
    organizationId,
    organizationName,
    isActive:         row.is_active ?? true,
    lastLoginAt:      row.last_login_at ?? null,
    joinedAt:         row.joined_at ?? '',
  }));
}

/**
 * Revoke a pending invitation via the revoke_invite RPC.
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('revoke_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

/**
 * Change a user's role within the caller's organization, via the
 * change_user_role RPC (org/admin checks and the delete+insert are
 * done atomically server-side).
 */
export async function changeUserRole(
  userId: string,
  newRoleSlug: InviteRole,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('change_user_role', {
    p_user_id: userId,
    p_new_role_slug: newRoleSlug,
  });
  if (error) throw error;
}

/**
 * Deactivate a team member via the deactivate_member RPC.
 */
export async function deactivateMember(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('deactivate_member', { p_user_id: userId });
  if (error) throw error;
}

/**
 * Reactivate a team member via the reactivate_member RPC.
 */
export async function reactivateMember(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('reactivate_member', { p_user_id: userId });
  if (error) throw error;
}

/**
 * Notifies a just-deactivated member by email via the notify-deactivation
 * Edge Function. Deliberately best-effort — deactivate_member has already
 * succeeded by the time this is called, so a failure here (missing
 * RESEND_API_KEY, network issue, etc.) must never look like the
 * deactivation itself failed. Swallows errors and returns false instead
 * of throwing.
 */
export async function notifyDeactivation(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const res = await fetch(getEdgeFunctionUrl('notify-deactivation'), {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return res.ok && data.success === true;
  } catch {
    return false;
  }
}

export { ROLE_NAMES, ROLE_COLORS };
