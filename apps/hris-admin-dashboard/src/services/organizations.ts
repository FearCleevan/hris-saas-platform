import { supabase } from '@/lib/supabase';
import type { Tenant } from '@/types';

/**
 * Create a new organisation and assign the current user as Super Admin.
 */
export async function createOrganization(input: {
  name: string;
  industry: string;
  companySize: string;
  plan: string;
}): Promise<Tenant> {
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Generate a URL-friendly slug
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

  // 3. Insert the organisation
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: input.name,
      slug,
      plan: input.plan,
      industry: input.industry,
      company_size: input.companySize,
    })
    .select('id, name, slug, plan, industry, company_size, logo_url')
    .single();

  if (orgErr) throw orgErr;

  const orgId = org.id;

  // 4. Seed roles for this org
  const { error: rolesErr } = await supabase
    .from('roles')
    .insert([
      { organization_id: orgId, name: 'Super Admin', slug: 'super_admin', is_system: true },
      { organization_id: orgId, name: 'HR Manager', slug: 'hr_manager', is_system: true },
      { organization_id: orgId, name: 'HR Staff', slug: 'hr_staff', is_system: true },
      { organization_id: orgId, name: 'Accountant', slug: 'accountant', is_system: true },
    ]);

  if (rolesErr) throw rolesErr;

  // 5. Get the super_admin role id
  const { data: superAdminRole } = await supabase
    .from('roles')
    .select('id')
    .eq('organization_id', orgId)
    .eq('slug', 'super_admin')
    .single();

  if (!superAdminRole) throw new Error('Failed to assign admin role');

  // 6. Assign the user to this org and role
  const { error: userRoleErr } = await supabase
    .from('user_roles')
    .insert({
      user_id: user.id,
      role_id: superAdminRole.id,
      organization_id: orgId,
    });

  if (userRoleErr) throw userRoleErr;

  // 7. (Optional) Update user profile to point to this org
  await supabase
    .from('user_profiles')
    .upsert({ id: user.id, organization_id: orgId }, { onConflict: 'id' });

  // Return a Tenant object matching your app type
  return {
    id: orgId,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    employeeCount: 0,
    logoUrl: org.logo_url,
    industry: org.industry,
    location: '', // not stored yet
  };
}

/**
 * Fetch all organisations the current user belongs to.
 */
export async function getUserOrganizations(): Promise<Tenant[]> {
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
        employeeCount: 0, // you can add a count later
        logoUrl: org.logo_url,
        industry: org.industry,
        location: '', // not stored
      };
    });
}