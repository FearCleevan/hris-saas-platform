import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getOrgDocuments,
  getEmployeeDocuments,
  getDocumentCategories,
  uploadDocument,
  type DocumentMeta,
  type DocumentCategory,
  type UploadDocumentPayload,
} from '@/services/documents';

const STALE_TIME = 1000 * 60 * 5;

export function useOrgDocuments() {
  return useQuery<DocumentMeta[]>({
    queryKey: ['documents', 'org'],
    queryFn: getOrgDocuments,
    staleTime: STALE_TIME,
  });
}

export function useEmployeeDocuments(employeeId: string | null) {
  return useQuery<DocumentMeta[]>({
    queryKey: ['documents', 'employee', employeeId],
    queryFn: () => getEmployeeDocuments(employeeId as string),
    enabled: !!employeeId,
    staleTime: STALE_TIME,
  });
}

export function useDocumentCategories() {
  return useQuery<DocumentCategory[]>({
    queryKey: ['document-categories'],
    queryFn: getDocumentCategories,
    staleTime: STALE_TIME,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation<void, Error, UploadDocumentPayload>({
    mutationFn: (payload) =>
      isSupabaseConfigured ? uploadDocument(payload) : Promise.resolve(),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['documents', 'org'] });
      if (variables.employeeId) {
        qc.invalidateQueries({ queryKey: ['documents', 'employee', variables.employeeId] });
      }
    },
  });
}
