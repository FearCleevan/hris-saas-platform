-- ══════════════════════════════════════════════════════════════════
-- Migration: Employee soft-delete RPC
-- Backend Phase B1 (ADMIN_DASHBOARD_AUDIT.md P0 #3 / BACKEND_IMPLEMENTATION.md)
--
-- Fixes: apps/hris-admin-dashboard's services/employees.ts calls
-- supabase.rpc('delete_employees_hard', { p_employee_ids }), which does not
-- exist in any prior migration — every delete action currently hard-fails.
--
-- Default: soft-delete, not a literal hard/cascading delete. A hard delete
-- would cascade-wipe attendance/payroll/leave/performance history for that
-- employee (all child tables reference employees ON DELETE CASCADE), which
-- is a real compliance risk for PH labor/payroll records. `employees` already
-- has both a `status` enum and an `is_active` flag, so soft-delete is
-- consistent with the existing schema's own intent, not a new pattern.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id);

-- Parameter is named p_ids (not p_employee_ids) to match the existing,
-- already-written call sites in services/employees.ts (deleteEmployee /
-- deleteEmployees), which call supabase.rpc('delete_employees_hard', { p_ids }).
CREATE OR REPLACE FUNCTION public.delete_employees_hard(p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := get_my_org_id();
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can deactivate employees';
  END IF;

  -- Only touches rows that belong to the caller's own organization —
  -- any IDs from another tenant passed in p_ids are silently excluded,
  -- not just skipped after the fact.
  UPDATE public.employees
  SET
    is_active      = false,
    status         = 'terminated',
    deactivated_at = now(),
    deactivated_by = auth.uid()
  WHERE id = ANY(p_ids)
    AND organization_id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_employees_hard(UUID[]) TO authenticated;
