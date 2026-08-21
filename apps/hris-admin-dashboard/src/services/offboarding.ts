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

export type ClearanceItem = {
  id: string;
  itemId: string;
  department: string;
  title: string;
  status: 'pending' | 'cleared' | 'held';
  clearedAt: string | null;
  clearedByName: string | null;
  remarks: string | null;
  isRequired: boolean;
};

export type ExitInterview = {
  id: string | null;
  status: 'pending' | 'scheduled' | 'done';
  scheduledAt: string | null;
  conductedAt: string | null;
  primaryReason: string | null;
  wouldRecommend: boolean | null;
  satisfactionScore: number | null;
  feedback: string | null;
};

export type FinalPayBreakdown = {
  basicPayRemaining: number;
  unusedLeaveConversion: number;
  thirteenthMonthPro: number;
  sssLoanDeduction: number;
  pagibigLoanDeduction: number;
  otherDeductions: number;
  netFinalPay: number;
};

export type OffboardingRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  avatarUrl: string | null;
  position: string;
  department: string;
  separationType: string;
  lastDayOfWork: string;
  resignationDate: string | null;
  overallStatus: 'in_progress' | 'completed';
  exitInterviewStatus: 'pending' | 'scheduled' | 'done';
  exitInterviewDate: string | null;
  finalPayStatus: 'pending' | 'computed' | 'approved' | 'released';
  finalPayAmount: number | null;
  clearanceDone: number;
  clearanceTotal: number;
  clearancePct: number;
  notes: string | null;
  assignedHRId: string | null;
  resignationLetterUploaded: boolean;
  createdAt: string;
};

export type OffboardingDetail = OffboardingRecord & {
  clearanceItems: ClearanceItem[];
  exitInterview: ExitInterview;
  finalPay: FinalPayBreakdown | null;
};

export type InitiateOffboardingInput = {
  employeeId: string;
  separationType: 'resignation' | 'termination' | 'retirement' | 'end_of_contract' | 'redundancy';
  lastDayOfWork: string;
  notes?: string;
};

export type UpdateClearanceInput = {
  clearanceProgressId: string;
  status: 'pending' | 'cleared' | 'held';
  remarks?: string;
};

export type UpdateExitInterviewInput = {
  offboardingId: string;
  scheduledAt?: string;
  conductedAt?: string;
  primaryReason?: string;
  wouldRecommend?: boolean;
  satisfactionScore?: number;
  feedback?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveOverallStatus(
  clearanceStatus: string,
  finalPayStatus: string,
): 'in_progress' | 'completed' {
  return clearanceStatus === 'cleared' && finalPayStatus === 'released'
    ? 'completed'
    : 'in_progress';
}

function deriveExitStatus(interview: any): 'pending' | 'scheduled' | 'done' {
  if (!interview) return 'pending';
  if (interview.conducted_at) return 'done';
  if (interview.scheduled_at) return 'scheduled';
  return 'pending';
}

function mapClearanceRow(cp: any): ClearanceItem {
  const item = cp.clearance_items ?? {};
  return {
    id:             cp.id,
    itemId:         cp.clearance_item_id,
    department:     item.department ?? 'general',
    title:          item.title ?? 'Clearance',
    status:         cp.status,
    clearedAt:      cp.cleared_at ?? null,
    clearedByName:  null, // resolved separately if needed
    remarks:        cp.remarks ?? null,
    isRequired:     item.is_required ?? true,
  };
}

function mapRecord(row: any, clearanceRows: any[], interview: any | null): OffboardingRecord {
  const empRec = (row.employee_employment as any[])?.find((e: any) => e.is_current)
    ?? (row.employee_employment as any[])?.[0];

  const clearanceDone  = clearanceRows.filter((c) => c.status === 'cleared').length;
  const clearanceTotal = clearanceRows.length;
  const clearancePct   = clearanceTotal > 0
    ? Math.round((clearanceDone / clearanceTotal) * 100)
    : 0;

  return {
    id:                         row.id,
    employeeId:                 row.employee_id,
    employeeName:               [row.employees?.first_name, row.employees?.last_name].filter(Boolean).join(' '),
    employeeNo:                 row.employees?.employee_no ?? '',
    avatarUrl:                  row.employees?.avatar_url ?? null,
    position:                   empRec?.positions?.title ?? '—',
    department:                 empRec?.departments?.name ?? '—',
    separationType:             row.separation_type,
    lastDayOfWork:              row.last_day_of_work,
    resignationDate:            row.created_at?.split('T')[0] ?? null,
    overallStatus:              deriveOverallStatus(row.clearance_status, row.final_pay_status),
    exitInterviewStatus:        deriveExitStatus(interview),
    exitInterviewDate:          interview?.scheduled_at?.split('T')[0] ?? null,
    finalPayStatus:             row.final_pay_status,
    finalPayAmount:             row.final_pay_amount ?? null,
    clearanceDone,
    clearanceTotal,
    clearancePct,
    notes:                      row.notes ?? null,
    assignedHRId:               null,
    resignationLetterUploaded:  false,
    createdAt:                  row.created_at,
  };
}

// ── LIST ───────────────────────────────────────────────────────────────────────

export async function getOffboardingRecords(): Promise<OffboardingRecord[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  const { data, error } = await supabase
    .from('offboarding_records')
    .select(`
      id, employee_id, separation_type, last_day_of_work,
      clearance_status, final_pay_status, final_pay_amount, notes, created_at,
      employees!employee_id(
        first_name, last_name, employee_no, avatar_url,
        employee_employment!employee_id(
          is_current, date_hired,
          departments(name),
          positions(title)
        )
      ),
      clearance_progress(id, status),
      exit_interviews(id, scheduled_at, conducted_at)
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as any[]).map((row) => {
    const clearanceRows: any[] = row.clearance_progress ?? [];
    const interview = (row.exit_interviews as any[])?.[0] ?? null;
    return mapRecord(row, clearanceRows, interview);
  });
}

// ── DETAIL ─────────────────────────────────────────────────────────────────────

export async function getOffboardingDetail(id: string): Promise<OffboardingDetail | null> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  const [recRes, clearanceRes, interviewRes] = await Promise.all([
    supabase
      .from('offboarding_records')
      .select(`
        id, employee_id, separation_type, last_day_of_work,
        clearance_status, final_pay_status, final_pay_amount, notes, created_at,
        employees!employee_id(
          first_name, last_name, employee_no, avatar_url,
          employee_employment!employee_id(
            is_current, date_hired,
            departments(name),
            positions(title)
          )
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),

    supabase
      .from('clearance_progress')
      .select(`
        id, clearance_item_id, status, cleared_at, remarks,
        clearance_items(id, title, department, is_required, sort_order)
      `)
      .eq('offboarding_id', id)
      .eq('organization_id', orgId)
      .order('clearance_items(sort_order)'),

    supabase
      .from('exit_interviews')
      .select('id, scheduled_at, conducted_at, primary_reason, would_recommend, satisfaction_score, feedback')
      .eq('offboarding_id', id)
      .eq('organization_id', orgId)
      .maybeSingle(),
  ]);

  if (recRes.error) {
    if (recRes.error.code === 'PGRST116') return null;
    throw recRes.error;
  }
  if (!recRes.data) return null;

  const row        = recRes.data as any;
  const clearRows  = (clearanceRes.data ?? []) as any[];
  const interview  = interviewRes.data as any | null;

  const record        = mapRecord(row, clearRows, interview);
  const clearanceItems = clearRows
    .map(mapClearanceRow)
    .sort((a, b) => a.department.localeCompare(b.department));

  const exitInterview: ExitInterview = {
    id:               interview?.id ?? null,
    status:           deriveExitStatus(interview),
    scheduledAt:      interview?.scheduled_at ?? null,
    conductedAt:      interview?.conducted_at ?? null,
    primaryReason:    interview?.primary_reason ?? null,
    wouldRecommend:   interview?.would_recommend ?? null,
    satisfactionScore: interview?.satisfaction_score ?? null,
    feedback:         interview?.feedback ?? null,
  };

  return {
    ...record,
    clearanceItems,
    exitInterview,
    finalPay: row.final_pay_amount
      ? { basicPayRemaining: row.final_pay_amount, unusedLeaveConversion: 0, thirteenthMonthPro: 0, sssLoanDeduction: 0, pagibigLoanDeduction: 0, otherDeductions: 0, netFinalPay: row.final_pay_amount }
      : null,
  };
}

// ── UPDATE CLEARANCE ────────────────────────────────────────────────────────────

export async function updateClearanceItem(input: UpdateClearanceInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('clearance_progress')
    .update({
      status:     input.status,
      cleared_at: input.status === 'cleared' ? new Date().toISOString() : null,
      cleared_by: input.status === 'cleared' ? user?.id : null,
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
    })
    .eq('id', input.clearanceProgressId)
    .eq('organization_id', orgId);

  if (error) throw error;

  // Auto-update parent clearance_status
  const { data: all } = await supabase
    .from('clearance_progress')
    .select('status, offboarding_id')
    .eq('id', input.clearanceProgressId)
    .single();

  if (all) {
    const { data: siblings } = await supabase
      .from('clearance_progress')
      .select('status')
      .eq('offboarding_id', (all as any).offboarding_id)
      .eq('organization_id', orgId);

    const items = (siblings ?? []) as any[];
    const allCleared = items.every((i) => i.status === 'cleared');
    const anyHeld    = items.some((i) => i.status === 'held');
    const newStatus  = allCleared ? 'cleared' : anyHeld ? 'held' : 'in_progress';
    const offboardingId = (all as any).offboarding_id;

    await supabase
      .from('offboarding_records')
      .update({ clearance_status: newStatus })
      .eq('id', offboardingId)
      .eq('organization_id', orgId);

    // Clearance is the last thing to finish? Check whether final pay is
    // already released too — if so, this action just completed offboarding.
    if (newStatus === 'cleared') {
      await completeIfBothDone(offboardingId, orgId, 'final_pay_status', 'released');
    }
  }
}

// Calls complete_offboarding once both clearance and final pay have reached
// their terminal state — safe to call from either update path (clearance or
// final pay), whichever one finishes second, since the RPC re-derives
// completion server-side and no-ops if called again.
async function completeIfBothDone(
  offboardingId: string,
  orgId: string,
  otherColumn: 'clearance_status' | 'final_pay_status',
  otherTerminalValue: string,
): Promise<void> {
  const { data: rec } = await supabase!
    .from('offboarding_records')
    .select(otherColumn)
    .eq('id', offboardingId)
    .eq('organization_id', orgId)
    .single();
  if ((rec as any)?.[otherColumn] === otherTerminalValue) {
    const { error } = await supabase!.rpc('complete_offboarding', { p_offboarding_id: offboardingId });
    if (error) throw error;
  }
}

// ── UPDATE EXIT INTERVIEW ───────────────────────────────────────────────────────

export async function upsertExitInterview(input: UpdateExitInterviewInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from('exit_interviews')
    .select('id')
    .eq('offboarding_id', input.offboardingId)
    .eq('organization_id', orgId)
    .maybeSingle();

  const payload: Record<string, any> = {
    offboarding_id:  input.offboardingId,
    organization_id: orgId,
    ...(input.scheduledAt    !== undefined ? { scheduled_at:      input.scheduledAt }    : {}),
    ...(input.conductedAt    !== undefined ? { conducted_at:      input.conductedAt, conducted_by: user?.id } : {}),
    ...(input.primaryReason  !== undefined ? { primary_reason:    input.primaryReason }  : {}),
    ...(input.wouldRecommend !== undefined ? { would_recommend:   input.wouldRecommend } : {}),
    ...(input.satisfactionScore !== undefined ? { satisfaction_score: input.satisfactionScore } : {}),
    ...(input.feedback       !== undefined ? { feedback:          input.feedback }       : {}),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('exit_interviews')
      .update(payload)
      .eq('id', existing.id)
      .eq('organization_id', orgId);
    if (error) throw error;
  } else {
    // Need employee_id — fetch from offboarding record
    const { data: rec } = await supabase
      .from('offboarding_records')
      .select('employee_id')
      .eq('id', input.offboardingId)
      .single();
    const { error } = await supabase
      .from('exit_interviews')
      .insert({ ...payload, employee_id: (rec as any)?.employee_id });
    if (error) throw error;
  }
}

// ── UPDATE FINAL PAY STATUS ─────────────────────────────────────────────────────

export async function updateFinalPayStatus(
  offboardingId: string,
  status: 'computed' | 'approved' | 'released',
  amount?: number,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();

  const { error } = await supabase
    .from('offboarding_records')
    .update({
      final_pay_status: status,
      ...(amount !== undefined ? { final_pay_amount: amount } : {}),
      ...(status === 'released' ? { final_pay_date: new Date().toISOString().split('T')[0] } : {}),
    })
    .eq('id', offboardingId)
    .eq('organization_id', orgId);

  if (error) throw error;

  // Final pay is the last thing to finish? Check whether clearance is
  // already cleared too — if so, this action just completed offboarding.
  if (status === 'released') {
    await completeIfBothDone(offboardingId, orgId, 'clearance_status', 'cleared');
  }
}

// ── INITIATE OFFBOARDING ────────────────────────────────────────────────────────

export async function initiateOffboarding(input: InitiateOffboardingInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const orgId = await getAuthOrgId();
  const { data: { user } } = await supabase.auth.getUser();

  // Find default checklist
  const { data: checklist } = await supabase
    .from('offboarding_checklists')
    .select('id')
    .eq('organization_id', orgId)
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  const { data: record, error: recErr } = await supabase
    .from('offboarding_records')
    .insert({
      employee_id:      input.employeeId,
      organization_id:  orgId,
      checklist_id:     (checklist as any)?.id ?? null,
      separation_type:  input.separationType,
      last_day_of_work: input.lastDayOfWork,
      clearance_status: 'pending',
      final_pay_status: 'pending',
      notes:            input.notes ?? null,
      initiated_by:     user?.id,
    })
    .select('id')
    .single();

  if (recErr) throw recErr;
  const offboardingId = (record as any).id;

  // Seed clearance_progress from checklist items
  if ((checklist as any)?.id) {
    const { data: items } = await supabase
      .from('clearance_items')
      .select('id')
      .eq('checklist_id', (checklist as any).id)
      .eq('organization_id', orgId);

    if (items && items.length > 0) {
      await supabase.from('clearance_progress').insert(
        (items as any[]).map((item) => ({
          offboarding_id:    offboardingId,
          clearance_item_id: item.id,
          organization_id:   orgId,
          status:            'pending',
        })),
      );
    }
  }

  return offboardingId;
}
