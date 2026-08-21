-- ══════════════════════════════════════════════════════════════════
-- Migration: Offboarding completion RPC
-- Backend Phase B3 (CRUD_FIXES_BACKEND_IMPLEMENTATION.md)
--
-- Fixes: services/offboarding.ts never updates employees.is_active/status
-- anywhere. deriveOverallStatus() can report 'completed' (clearance_status
-- = 'cleared' AND final_pay_status = 'released') purely as a client-side
-- computed label, while the employee stays fully active and keeps
-- appearing in EmployeeListPage, OrgChartPage, and every employee picker
-- indefinitely.
--
-- Deviation from the CRUD_FIXES_BACKEND_IMPLEMENTATION.md spec text: it
-- describes setting `offboarding_records.status = 'completed'`, but that
-- column doesn't exist — offboarding_records has no `status` column at
-- all. "Completed" is already fully derived from clearance_status +
-- final_pay_status both being at their terminal values (that's exactly
-- what deriveOverallStatus() checks), so there's nothing else to persist
-- there. This RPC's only real job is re-deriving that same condition
-- server-side (the client's derivation is a UI hint, not a trust
-- boundary) and then actually deactivating the employee.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.complete_offboarding(p_offboarding_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := get_my_org_id();
  v_record public.offboarding_records;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can complete offboarding';
  END IF;

  SELECT * INTO v_record
  FROM public.offboarding_records
  WHERE id = p_offboarding_id
    AND organization_id = v_org_id
  FOR UPDATE;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Offboarding record not found';
  END IF;

  IF v_record.clearance_status <> 'cleared' OR v_record.final_pay_status <> 'released' THEN
    RAISE EXCEPTION 'Offboarding is not actually complete (clearance: %, final pay: %)',
      v_record.clearance_status, v_record.final_pay_status;
  END IF;

  -- Reuse the existing soft-delete RPC (round-1 migration 20260820000021)
  -- instead of duplicating its UPDATE — it's already org-scoped/admin-gated,
  -- and idempotent-safe if called twice since it just re-applies the same
  -- values to an already-inactive row.
  PERFORM public.delete_employees_hard(ARRAY[v_record.employee_id]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_offboarding(UUID) TO authenticated;
