import { supabase, isSupabaseConfigured } from '@/lib/supabase';

async function getAuthOrgId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const orgId =
    (user.app_metadata?.org_id as string | undefined) ??
    (user.user_metadata?.org_id as string | undefined);
  if (orgId) return orgId;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) throw new Error('Organization not found');
  return profile.organization_id;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type OnboardingTaskInfo = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  assignedToRole: string | null;
  isRequired: boolean;
  dueDaysAfterHire: number;
  sortOrder: number;
};

export type OnboardingProgressItem = {
  id: string;
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  task: OnboardingTaskInfo;
};

export type OnboardingRecord = {
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  avatarUrl: string | null;
  position: string;
  department: string;
  dateHired: string;
  overallStatus: 'in_progress' | 'completed' | 'overdue';
  totalTasks: number;
  completedTasks: number;
  categories: { name: string; done: number; total: number }[];
};

export type OnboardingDetail = OnboardingRecord & {
  items: OnboardingProgressItem[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeStatus(
  items: { status: string; dueDate: string | null }[],
): 'in_progress' | 'completed' | 'overdue' {
  const today = new Date().toISOString().split('T')[0];
  const required = items.filter((i) => i.status !== 'skipped');
  if (required.length === 0) return 'in_progress';
  const allDone = required.every((i) => i.status === 'completed');
  if (allDone) return 'completed';
  const overdue = required.some(
    (i) => i.dueDate && i.dueDate < today && i.status !== 'completed',
  );
  return overdue ? 'overdue' : 'in_progress';
}

function mapTaskRow(p: any): OnboardingProgressItem {
  const t = p.onboarding_tasks ?? {};
  return {
    id:          p.id,
    taskId:      p.task_id,
    status:      p.status,
    dueDate:     p.due_date ?? null,
    completedAt: p.completed_at ?? null,
    notes:       p.notes ?? null,
    task: {
      id:               t.id ?? p.task_id,
      title:            t.title ?? '',
      description:      t.description ?? null,
      category:         t.category ?? 'general',
      assignedToRole:   t.assigned_to_role ?? null,
      isRequired:       t.is_required ?? true,
      dueDaysAfterHire: t.due_days_after_hire ?? 1,
      sortOrder:        t.sort_order ?? 0,
    },
  };
}

function buildCategories(items: OnboardingProgressItem[]) {
  const map = new Map<string, { done: number; total: number }>();
  for (const item of items) {
    const cat = item.task.category;
    const cur = map.get(cat) ?? { done: 0, total: 0 };
    map.set(cat, {
      done:  cur.done  + (item.status === 'completed' ? 1 : 0),
      total: cur.total + 1,
    });
  }
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
}

// ── LIST ───────────────────────────────────────────────────────────────────────

export async function getOnboardingRecords(): Promise<OnboardingRecord[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, first_name, last_name, employee_no, avatar_url,
      employee_employment!employee_id(
        date_hired, is_current,
        departments(name),
        positions(title)
      ),
      onboarding_progress!inner(
        id, task_id, status, due_date, completed_at,
        onboarding_tasks(id, title, category, is_required)
      )
    `)
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (error) throw error;

  return (data as any[]).map((row) => {
    const empRec = (row.employee_employment as any[])?.find((e: any) => e.is_current)
      ?? (row.employee_employment as any[])?.[0];

    const progressRows: any[] = row.onboarding_progress ?? [];
    const items = progressRows.map(mapTaskRow);

    return {
      employeeId:     row.id,
      employeeName:   [row.first_name, row.last_name].filter(Boolean).join(' '),
      employeeNo:     row.employee_no,
      avatarUrl:      row.avatar_url ?? null,
      position:       empRec?.positions?.title ?? '—',
      department:     empRec?.departments?.name ?? '—',
      dateHired:      empRec?.date_hired ?? '',
      overallStatus:  computeStatus(items.map((i) => ({ status: i.status, dueDate: i.dueDate }))),
      totalTasks:     items.length,
      completedTasks: items.filter((i) => i.status === 'completed').length,
      categories:     buildCategories(items),
    };
  });
}

// ── DETAIL ────────────────────────────────────────────────────────────────────

export async function getOnboardingDetail(employeeId: string): Promise<OnboardingDetail | null> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  const [empRes, progressRes] = await Promise.all([
    supabase
      .from('employees')
      .select(`
        id, first_name, last_name, employee_no, avatar_url,
        employee_employment!employee_id(
          date_hired, is_current,
          departments(name),
          positions(title)
        )
      `)
      .eq('id', employeeId)
      .eq('organization_id', orgId)
      .single(),

    supabase
      .from('onboarding_progress')
      .select(`
        id, task_id, status, due_date, completed_at, notes,
        onboarding_tasks(id, title, description, category, assigned_to_role, is_required, due_days_after_hire, sort_order)
      `)
      .eq('employee_id', employeeId)
      .eq('organization_id', orgId),
  ]);

  if (empRes.error) {
    if (empRes.error.code === 'PGRST116') return null;
    throw empRes.error;
  }
  if (!empRes.data) return null;
  if (progressRes.error) console.warn('[getOnboardingDetail] progress query failed:', progressRes.error.message);

  const row = empRes.data as any;
  const empRec = (row.employee_employment as any[])?.find((e: any) => e.is_current)
    ?? (row.employee_employment as any[])?.[0];

  const items = ((progressRes.data ?? []) as any[])
    .map(mapTaskRow)
    .sort((a, b) => a.task.sortOrder - b.task.sortOrder || a.task.category.localeCompare(b.task.category));

  return {
    employeeId:     row.id,
    employeeName:   [row.first_name, row.last_name].filter(Boolean).join(' '),
    employeeNo:     row.employee_no,
    avatarUrl:      row.avatar_url ?? null,
    position:       empRec?.positions?.title ?? '—',
    department:     empRec?.departments?.name ?? '—',
    dateHired:      empRec?.date_hired ?? '',
    overallStatus:  computeStatus(items.map((i) => ({ status: i.status, dueDate: i.dueDate }))),
    totalTasks:     items.length,
    completedTasks: items.filter((i) => i.status === 'completed').length,
    categories:     buildCategories(items),
    items,
  };
}

// ── INITIATE ONBOARDING ───────────────────────────────────────────────────────

export async function initiateOnboarding(
  employeeId: string,
  startDate: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  // Find the default active workflow
  const { data: workflow, error: wfErr } = await supabase
    .from('onboarding_workflows')
    .select('id')
    .eq('organization_id', orgId)
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  if (wfErr) throw wfErr;
  if (!workflow) throw new Error('No default onboarding workflow found. Set one up in Settings first.');

  // Fetch tasks belonging to that workflow
  const { data: tasks, error: tasksErr } = await supabase
    .from('onboarding_tasks')
    .select('id, due_days_after_hire')
    .eq('workflow_id', workflow.id)
    .eq('organization_id', orgId);

  if (tasksErr) throw tasksErr;
  if (!tasks || tasks.length === 0) throw new Error('The default workflow has no tasks. Add tasks in Settings first.');

  // Delete any existing progress for this employee (re-initiate support)
  await supabase
    .from('onboarding_progress')
    .delete()
    .eq('employee_id', employeeId)
    .eq('organization_id', orgId);

  const start = new Date(startDate);
  const rows = (tasks as any[]).map((t) => {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + (t.due_days_after_hire ?? 7));
    return {
      employee_id:     employeeId,
      organization_id: orgId,
      workflow_id:     (workflow as any).id,
      task_id:         t.id,
      status:          'pending',
      due_date:        dueDate.toISOString().split('T')[0],
    };
  });

  const { error } = await supabase.from('onboarding_progress').insert(rows);
  if (error) throw error;
}

// ── TOGGLE TASK ───────────────────────────────────────────────────────────────

export async function updateOnboardingTaskStatus(
  progressId: string,
  status: 'pending' | 'completed' | 'skipped',
  notes?: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  const { error } = await supabase
    .from('onboarding_progress')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      ...(notes !== undefined ? { notes } : {}),
    })
    .eq('id', progressId)
    .eq('organization_id', orgId);

  if (error) throw error;
}
