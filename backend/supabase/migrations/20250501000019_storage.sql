-- ══════════════════════════════════════════════════════════════════
-- Migration: Storage Buckets & Policies
-- Phase 16
-- ══════════════════════════════════════════════════════════════════

-- ── Create Buckets ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',    'avatars',    true,  2097152,   ARRAY['image/jpeg','image/png','image/webp']),
  ('documents',  'documents',  false, 52428800,  ARRAY['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('receipts',   'receipts',   false, 10485760,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('payslips',   'payslips',   false, 5242880,   ARRAY['application/pdf']),
  ('resumes',    'resumes',    false, 10485760,  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('compliance', 'compliance', false, 52428800,  NULL),
  ('signatures', 'signatures', false, 1048576,   ARRAY['image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- Storage RLS Policies
-- ══════════════════════════════════════════════════════════════════

-- ── avatars (public bucket) ────────────────────────────────────────
-- Anyone can read avatars (public bucket)
CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Authenticated users upload/update their own avatar only
CREATE POLICY "self_upload_avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "self_update_avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "self_delete_avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── documents (private) ────────────────────────────────────────────
-- File path convention: documents/{org_id}/{employee_id}/{filename}

CREATE POLICY "org_read_documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
  );

CREATE POLICY "admin_write_documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

CREATE POLICY "admin_delete_documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

-- ── receipts (private) ─────────────────────────────────────────────
-- File path convention: receipts/{org_id}/{employee_id}/{filename}

CREATE POLICY "org_read_receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
  );

CREATE POLICY "self_upload_receipt"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_delete_receipt"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

-- ── payslips (private) ─────────────────────────────────────────────
-- File path convention: payslips/{org_id}/{employee_id}/{filename}

CREATE POLICY "self_read_payslip"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (
      (SELECT is_admin())
      OR (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admin_write_payslip"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

-- ── resumes (private) ──────────────────────────────────────────────
-- File path convention: resumes/{org_id}/{applicant_id}/{filename}

CREATE POLICY "admin_read_resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

CREATE POLICY "admin_write_resumes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

-- ── compliance (private, admin only) ──────────────────────────────
CREATE POLICY "admin_read_compliance"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

CREATE POLICY "admin_write_compliance"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance'
    AND (storage.foldername(name))[1] = (SELECT get_my_org_id()::text)
    AND (SELECT is_admin())
  );

-- ── signatures (private) ───────────────────────────────────────────
CREATE POLICY "self_read_signature"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "self_write_signature"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
