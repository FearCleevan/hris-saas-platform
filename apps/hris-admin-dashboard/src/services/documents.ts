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
  const filePath = `documents/${orgId}/${employeeId}/${fileName}`;

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

export async function getEmployeeDocuments(employeeId: string): Promise<DocumentMeta[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, file_name, file_path, file_size, mime_type, status, created_at, tags')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((d) => ({
    id:         d.id,
    title:      d.title,
    fileName:   d.file_name,
    filePath:   d.file_path,
    fileSize:   d.file_size ?? 0,
    mimeType:   d.mime_type ?? '',
    status:     d.status,
    uploadedAt: d.created_at,
    tags:       d.tags,
  }));
}

export async function getDocumentDownloadUrl(filePath: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600);

  return data?.signedUrl ?? null;
}
