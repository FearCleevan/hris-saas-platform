import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type DocumentMeta = {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: 'active' | 'draft' | 'archived' | 'expired';
  uploadedAt: string;
  tags: string[] | null;
  employeeId: string | null;
  categoryId: string | null;
  expiresAt: string | null;
  version: number;
};

export type DocumentCategory = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  requiresSignature: boolean;
  retentionYears: number | null;
};

const DOC_TITLE_MAP: Record<string, string> = {
  resume:        'Resume / CV',
  photo:         '2x2 ID Photo',
  nbi:           'NBI Clearance',
  medical:       'Pre-employment Medical',
  sss_id:        'SSS ID / E-1 Form',
  philhealth_id: 'PhilHealth MDR',
  pagibig_id:    'Pag-IBIG MDF',
  tin_id:        'TIN ID / BIR Form 1902',
  diploma:       'Diploma / TOR',
  birth_cert:    'Birth Certificate (PSA)',
  marriage_cert: 'Marriage Certificate',
};

async function getAuthOrgId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const orgId = (user.app_metadata?.org_id as string | undefined)
    ?? (user.user_metadata?.org_id as string | undefined);
  if (orgId) return orgId;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) throw new Error('Organization ID not found');
  return profile.organization_id;
}

async function uploadSingleDocument(
  employeeId: string,
  orgId: string,
  uploadedById: string | null,
  docKey: string,
  file: File,
): Promise<void> {
  if (!supabase) return;

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const fileName = `${docKey}-${Date.now()}.${ext}`;
  // No leading "documents/" — the bucket (selected via .from('documents') below)
  // already provides that; RLS policies require (storage.foldername(name))[1]
  // to be the org ID (see 20250501000019_storage.sql:53-74). Prepending the
  // bucket name here shifted every folder index by one and made every real
  // upload/read fail RLS silently until this was found and fixed.
  const filePath = `${orgId}/${employeeId}/${fileName}`;

  const { error: storageErr } = await supabase.storage
    .from('documents')
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (storageErr) throw storageErr;

  const { error: dbErr } = await supabase
    .from('documents')
    .insert({
      organization_id: orgId,
      employee_id:     employeeId,
      title:           DOC_TITLE_MAP[docKey] ?? docKey,
      file_name:       fileName,
      file_path:       filePath,
      file_size:       file.size,
      mime_type:       file.type,
      status:          'active',
      uploaded_by:     uploadedById,
      tags:            [docKey],
    });
  if (dbErr) throw dbErr;
}

export async function uploadEmployeeDocuments(
  employeeId: string,
  uploads: Record<string, File | null>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const entries = Object.entries(uploads).filter(([, file]) => file !== null) as [string, File][];
  if (entries.length === 0) return;

  const orgId = await getAuthOrgId();
  const { data: { user } } = await supabase.auth.getUser();

  await Promise.all(
    entries.map(([key, file]) =>
      uploadSingleDocument(employeeId, orgId, user?.id ?? null, key, file)
    )
  );
}

const DOC_SELECT = 'id, employee_id, category_id, title, file_name, file_path, file_size, mime_type, status, expires_at, version, created_at, tags';

function mapDocumentRow(d: {
  id: string; employee_id: string | null; category_id: string | null; title: string;
  file_name: string; file_path: string; file_size: number | null; mime_type: string | null;
  status: DocumentMeta['status']; expires_at: string | null; version: number;
  created_at: string; tags: string[] | null;
}): DocumentMeta {
  return {
    id:         d.id,
    title:      d.title,
    fileName:   d.file_name,
    filePath:   d.file_path,
    fileSize:   d.file_size ?? 0,
    mimeType:   d.mime_type ?? '',
    status:     d.status,
    uploadedAt: d.created_at,
    tags:       d.tags,
    employeeId: d.employee_id,
    categoryId: d.category_id,
    expiresAt:  d.expires_at,
    version:    d.version,
  };
}

export async function getEmployeeDocuments(employeeId: string): Promise<DocumentMeta[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('documents')
    .select(DOC_SELECT)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDocumentRow);
}

// Org-wide document listing — used by the Documents module's Library/Expiring
// tabs, distinct from getEmployeeDocuments() which is scoped to one employee's
// 201-file uploads. See FRONTEND_IMPLEMENTATION.md Phase F10.
export async function getOrgDocuments(): Promise<DocumentMeta[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('documents')
    .select(DOC_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDocumentRow);
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('document_categories')
    .select('id, name, code, description, requires_signature, retention_years')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    description: c.description,
    requiresSignature: c.requires_signature,
    retentionYears: c.retention_years,
  }));
}

export interface UploadDocumentPayload {
  employeeId: string | null;
  categoryId: string | null;
  title: string;
  file: File;
}

// Generic single-file upload for the Documents module's Upload tab — not
// tied to the fixed 11 employee-201-file keys uploadEmployeeDocuments() uses.
export async function uploadDocument(payload: UploadDocumentPayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const orgId = await getAuthOrgId();
  const { data: { user } } = await supabase.auth.getUser();

  const ext = payload.file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const scope = payload.employeeId ?? 'company-wide';
  const fileName = `${payload.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.${ext}`;
  // Same fix as uploadSingleDocument above — no leading "documents/" (see its comment).
  const filePath = `${orgId}/${scope}/${fileName}`;

  const { error: storageErr } = await supabase.storage
    .from('documents')
    .upload(filePath, payload.file, { upsert: true, contentType: payload.file.type });
  if (storageErr) throw storageErr;

  const { error: dbErr } = await supabase.from('documents').insert({
    organization_id: orgId,
    employee_id:     payload.employeeId,
    category_id:     payload.categoryId,
    title:           payload.title,
    file_name:       fileName,
    file_path:       filePath,
    file_size:       payload.file.size,
    mime_type:       payload.file.type,
    status:          'active',
    uploaded_by:     user?.id ?? null,
  });
  if (dbErr) throw dbErr;
}

export async function getDocumentDownloadUrl(filePath: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600);

  return data?.signedUrl ?? null;
}
