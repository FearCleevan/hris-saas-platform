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
 * Change a user's role within an organization.
 * Deletes the old user_role row and inserts the new one atomically.
 */
export async function changeUserRole(
  userId: string,
  oldRoleSlug: InviteRole,
  newRoleSlug: InviteRole,
  organizationId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, slug')
    .in('slug', [oldRoleSlug, newRoleSlug])
    .is('organization_id', null);

  if (rolesError) throw rolesError;

  const oldRole = (roles ?? []).find((r: any) => r.slug === oldRoleSlug);
  const newRole = (roles ?? []).find((r: any) => r.slug === newRoleSlug);
  if (!oldRole || !newRole) throw new Error('Role not found');

  const { error: deleteError } = await supabase
    .from('user_roles')
    .delete()
    .match({ user_id: userId, role_id: oldRole.id, organization_id: organizationId });

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role_id: newRole.id, organization_id: organizationId });

  if (insertError) throw insertError;
}

export { ROLE_NAMES, ROLE_COLORS };
