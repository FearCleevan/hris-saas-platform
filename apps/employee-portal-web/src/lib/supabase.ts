import { createClient } from '@supabase/supabase-js';
import type { EmployeeUser } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Mirrors hris-admin-dashboard/src/lib/supabase.ts's pattern exactly — same
// project, same env var names, same "gracefully unconfigured" guard so
// local dev without a .env.local doesn't hard-crash the whole app.
export const isSupabaseConfigured =
  !!supabaseUrl && supabaseUrl !== 'your_supabase_url_here' &&
  !!supabaseKey && supabaseKey !== 'your_anon_key_here';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    })
  : null;

interface EmployeeRow {
  id: string;
  organization_id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  work_email: string | null;
  employee_employment: {
    direct_manager_id: string | null;
    departments: { name: string } | null;
    positions: { title: string } | null;
  }[];
}

/**
 * Resolves the signed-in auth user to their `employees` row (RLS-scoped via
 * `self_select_employee`: `employees.user_id = auth.uid()`) — an
 * `auth.users` row isn't guaranteed to have a matching `employees` row (an
 * HR-only admin account, for instance), so a null return here is a real,
 * expected case every caller must handle, not an error to swallow.
 */
export async function fetchEmployeeContext(userId: string, authEmail: string): Promise<EmployeeUser | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, organization_id, employee_no, first_name, last_name, work_email,
      employee_employment!employee_id ( direct_manager_id, departments(name), positions(title) )
    `)
    .eq('user_id', userId)
    .maybeSingle<EmployeeRow>();

  if (error || !data) return null;

  const employment = data.employee_employment[0];

  // "manager"/"team_lead" vs. plain "employee" isn't resolvable from the
  // schema yet (would need "does anyone list me as direct_manager_id" —
  // deferred, see BACKEND_IMPLEMENTATION.md's Known Gotchas). Every real
  // account defaults to the lowest-privilege value until that's built.
  return {
    id: data.id,
    organizationId: data.organization_id,
    name: `${data.first_name} ${data.last_name}`,
    email: data.work_email ?? authEmail,
    role: 'employee',
    employeeId: data.employee_no,
    department: employment?.departments?.name ?? '—',
    position: employment?.positions?.title ?? '—',
    mustChangePassword: false,
    darkMode: false,
  };
}
