-- ══════════════════════════════════════════════════════════════════
-- Migration: Leave approval RPCs
-- Backend Phase B2 (ADMIN_DASHBOARD_AUDIT.md P0 #5 / BACKEND_IMPLEMENTATION.md)
--
-- Fixes: apps/hris-admin-dashboard's services/leaves.ts approveLeaveRequest()/
-- rejectLeaveRequest() only update leave_requests.status — they never touch
-- leave_balances (used_days/pending_days), never write leave_approvals, and
-- never write leave_credits_history, so balances silently drift from the
-- requests that were actually approved.
--
-- Defensive by design: leave_balances.pending_days is only meaningful once
-- Frontend Phase F8 (applyLeave()) exists to increment it at submission time.
-- Until then, pending_days may legitimately be 0 for a request being approved
-- here — GREATEST(pending_days - total_days, 0) avoids ever going negative.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.approve_leave_request(
  p_request_id UUID,
  p_remarks    TEXT DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id     UUID := get_my_org_id();
  v_request    public.leave_requests;
  v_year       INT;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins/managers can approve leave requests';
  END IF;

  SELECT * INTO v_request
  FROM public.leave_requests
  WHERE id = p_request_id
    AND organization_id = v_org_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Leave request has already been actioned (status: %)', v_request.status;
  END IF;

  v_year := EXTRACT(YEAR FROM v_request.start_date)::INT;

  -- Ensure a balance row exists for this employee/type/year before adjusting it.
  INSERT INTO public.leave_balances (employee_id, organization_id, leave_type_id, year)
  VALUES (v_request.employee_id, v_org_id, v_request.leave_type_id, v_year)
  ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

  UPDATE public.leave_balances
  SET
    pending_days = GREATEST(pending_days - v_request.total_days, 0),
    used_days    = used_days + v_request.total_days
  WHERE employee_id = v_request.employee_id
    AND leave_type_id = v_request.leave_type_id
    AND year = v_year;

  UPDATE public.leave_requests
  SET
    status      = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    remarks     = p_remarks
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.leave_approvals (leave_request_id, organization_id, approver_id, status, remarks, acted_at)
  VALUES (p_request_id, v_org_id, auth.uid(), 'approved', p_remarks, now());

  INSERT INTO public.leave_credits_history
    (employee_id, organization_id, leave_type_id, year, transaction_type, days, reference_id, notes, created_by)
  VALUES
    (v_request.employee_id, v_org_id, v_request.leave_type_id, v_year, 'usage', v_request.total_days, p_request_id, p_remarks, auth.uid());

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_leave_request(
  p_request_id UUID,
  p_remarks    TEXT DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id  UUID := get_my_org_id();
  v_request public.leave_requests;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins/managers can reject leave requests';
  END IF;

  SELECT * INTO v_request
  FROM public.leave_requests
  WHERE id = p_request_id
    AND organization_id = v_org_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Leave request has already been actioned (status: %)', v_request.status;
  END IF;

  -- Rejecting never touches leave_balances or leave_credits_history —
  -- nothing was ever deducted for a request that was never approved.
  UPDATE public.leave_requests
  SET
    status      = 'rejected',
    approved_by = auth.uid(),
    approved_at = now(),
    remarks     = p_remarks
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.leave_approvals (leave_request_id, organization_id, approver_id, status, remarks, acted_at)
  VALUES (p_request_id, v_org_id, auth.uid(), 'rejected', p_remarks, now());

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_leave_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_leave_request(UUID, TEXT) TO authenticated;
