-- ══════════════════════════════════════════════════════════════════
-- Migration: Fix reject_leave_request to reverse the pending_days bump
-- Backend Phase B4 (CRUD_FIXES_BACKEND_IMPLEMENTATION.md)
--
-- Fixes: reject_leave_request (20260820000022_leave_approval_rpcs.sql)
-- was written before applyLeave() existed, and its own comment said
-- rejecting never touches leave_balances because nothing was ever
-- deducted. That's no longer true — applyLeave() now always increments
-- leave_balances.pending_days on submission (services/leaves.ts), and
-- reject_leave_request never reverses it, so every rejected request
-- permanently inflates pending_days and under-reports the employee's
-- real remaining balance forever. cancelLeave() already reverses this
-- correctly for the cancel path — this mirrors that same decrement.
-- ══════════════════════════════════════════════════════════════════

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
  v_year    INT;
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

  v_year := EXTRACT(YEAR FROM v_request.start_date)::INT;

  -- Reverse the pending_days bump applyLeave() added at submission —
  -- nothing was ever "used", so used_days stays untouched and no
  -- leave_credits_history row is written (still correct).
  UPDATE public.leave_balances
  SET pending_days = GREATEST(pending_days - v_request.total_days, 0)
  WHERE employee_id = v_request.employee_id
    AND leave_type_id = v_request.leave_type_id
    AND year = v_year;

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

GRANT EXECUTE ON FUNCTION public.reject_leave_request(UUID, TEXT) TO authenticated;
