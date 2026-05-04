import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Tenant } from '@/types';

/**
 * Create a new organisation and assign the current user as Super Admin.
 * Calls a SECURITY DEFINER Postgres function so the bootstrap inserts
 * (org → roles → user_roles → user_profiles) all run as the DB owner,
 * bypassing the RLS chicken-and-egg problem.
 */
export async function createOrganization(input: {
  name: string;
  industry: string;
  companySize: string;
  plan: string;
}): Promise<Tenant> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36);

  const { data: org, error } = await supabase.rpc('create_organization', {
    p_name:         input.name,
    p_slug:         slug,
    p_plan:         input.plan,
    p_industry:     input.industry,
    p_company_size: input.companySize,
  });

  if (error) throw error;

  return {
    id:            org.id,
    name:          org.name,
    slug:          org.slug,
    plan:          org.plan === 'trial' ? 'starter' : org.plan,
    employeeCount: 0,
    logoUrl:       org.logo_url ?? undefined,
    industry:      org.industry ?? '',
    location:      '',
  };
}

/**
 * Fetch all organisations the current user belongs to.
 */
export async function getUserOrganizations(): Promise<Tenant[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error } = await supabase
    .from('user_roles')
    .select(`
      organization_id,
      organizations:organization_id (
        id, name, slug, plan, industry, company_size, logo_url
      )
    `)
    .eq('user_id', user.id);

  if (error) throw error;

  return (memberships ?? [])
    .filter((m) => m.organizations)
    .map((m) => {
      const org = m.organizations as any;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        employeeCount: 0,
        logoUrl: org.logo_url,
        industry: org.industry,
        location: '',
      };
    });
}