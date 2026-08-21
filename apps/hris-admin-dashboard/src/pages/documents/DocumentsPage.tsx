// src/pages/documents/DocumentsPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, FileUser, Upload, PenTool, Clock, GitBranch,
  Search, ChevronDown, Download, Plus, X,
  FileText, Grid3X3, List,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useEmployees } from '@/hooks/useEmployees';
import {
  useOrgDocuments, useEmployeeDocuments, useDocumentCategories, useUploadDocument,
} from '@/hooks/useDocuments';
import { getDocumentDownloadUrl, type DocumentMeta } from '@/services/documents';

/* ─── Types ─── */
type TabId = 'library' | '201files' | 'upload' | 'signatures' | 'expiring' | 'versions';
type StatusFilter = 'All' | DocumentMeta['status'];

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'library', label: 'Library', icon: FolderOpen },
  { id: '201files', label: '201 Files', icon: FileUser },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'signatures', label: 'Signatures', icon: PenTool },
  { id: 'expiring', label: 'Expiring', icon: Clock },
  { id: 'versions', label: 'Versions', icon: GitBranch },
];

const STATUS_CFG: Record<DocumentMeta['status'], { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  draft:    { label: 'Draft',    color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
  expired:  { label: 'Expired',  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  archived: { label: 'Archived', color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
};

const EXPIRING_OPTIONS = [7, 14, 30, 60, 90];

// Must match the `documents` bucket's real config in
// backend/supabase/migrations/20250501000019_storage.sql — a different
// bucket (e.g. receipts=10MB) would have different limits, so don't reuse
// this outside the Documents module.
const DOCUMENTS_MAX_BYTES = 50 * 1024 * 1024;
const DOCUMENTS_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const DOCUMENTS_ALLOWED_LABEL = 'PDF, JPEG, PNG, DOC, DOCX';

function bytesToLabel(n: number) {
  if (n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }

function KpiCard({ label, value, icon: IconC, sub, color }: { label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-brand-blue/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-brand-blue'}`} />
      </div>
      <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
    </div>
  );
}

function ComingSoon({ note }: { note: string }) {
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
        <Clock className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Not built yet</p>
      <p className="text-xs text-gray-400">{note}</p>
    </div>
  );
}

/* ─── Main Page ─── */
export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [expiringDays, setExpiringDays] = useState(30);
  const [selectedDoc, setSelectedDoc] = useState<DocumentMeta | null>(null);

  const { data: employees = [] } = useEmployees();
  const { data: categories = [], isLoading: categoriesLoading } = useDocumentCategories();
  const { data: documents = [], isLoading: documentsLoading } = useOrgDocuments();

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized';

  /* ─── Library Tab ─── */
  const filteredDocs = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((d) => {
      if (catFilter !== 'All' && d.categoryId !== catFilter) return false;
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (q && !d.title.toLowerCase().includes(q) && !(d.tags ?? []).some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [documents, catFilter, statusFilter, search]);

  const libraryKPIs = useMemo(() => ({
    total: documents.length,
    categories: categories.length,
    expiringSoon: documents.filter((d) => {
      if (!d.expiresAt) return false;
      const daysLeft = differenceInDays(new Date(d.expiresAt), new Date());
      return daysLeft >= 0 && daysLeft <= 30;
    }).length,
    active: documents.filter((d) => d.status === 'active').length,
  }), [documents, categories]);

  /* ─── 201 Files Tab ─── */
  const { data: empDocs = [], isLoading: empDocsLoading } = useEmployeeDocuments(selectedEmployee || null);
  const selectedEmp = employees.find((e) => e.id === selectedEmployee);

  /* ─── Expiring Tab ─── */
  const expiringDocs = useMemo(() => {
    const now = new Date();
    return documents
      .filter((d) => d.expiresAt)
      .map((d) => ({ ...d, daysLeft: differenceInDays(new Date(d.expiresAt as string), now) }))
      .filter((d) => d.daysLeft <= expiringDays)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [documents, expiringDays]);

  const expiringKPIs = useMemo(() => {
    const now = new Date();
    const withExpiry = documents.filter((d) => d.expiresAt);
    return {
      expired: withExpiry.filter((d) => differenceInDays(new Date(d.expiresAt as string), now) < 0).length,
      within30: withExpiry.filter((d) => {
        const days = differenceInDays(new Date(d.expiresAt as string), now);
        return days >= 0 && days <= 30;
      }).length,
      withExpiry: withExpiry.length,
    };
  }, [documents]);

  /* ─── Upload Tab ─── */
  const upload = useUploadDocument();
  const [uploadEmployeeId, setUploadEmployeeId] = useState('');
  const [uploadCategoryId, setUploadCategoryId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) return;
    if (uploadFile.size > DOCUMENTS_MAX_BYTES) {
      toast.error(`File is too large — max ${bytesToLabel(DOCUMENTS_MAX_BYTES)}`);
      return;
    }
    if (!DOCUMENTS_ALLOWED_MIME.includes(uploadFile.type)) {
      toast.error(`Unsupported file type — allowed: ${DOCUMENTS_ALLOWED_LABEL}`);
      return;
    }
    try {
      await upload.mutateAsync({
        employeeId: uploadEmployeeId || null,
        categoryId: uploadCategoryId || null,
        title: uploadTitle.trim(),
        file: uploadFile,
      });
      toast.success(`"${uploadTitle}" uploaded`);
      setUploadTitle(''); setUploadFile(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not upload this file');
    }
  };

  const isLoading = documentsLoading || categoriesLoading;

  /* ─── Render ─── */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Document Management</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{libraryKPIs.total} documents · {libraryKPIs.categories} categories</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'library' && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button title='Grid view' onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><Grid3X3 className="w-3.5 h-3.5 text-gray-500" /></button>
                <button title='Table view' onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><List className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            )}
            {expiringKPIs.within30 > 0 && <button onClick={() => setActiveTab('expiring')} className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 font-semibold text-xs border border-amber-200">{expiringKPIs.within30} expiring</button>}
          </div>
        </div>

        <div className="flex items-center gap-1 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(tab => { const Icon = tab.icon; return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
            </button>
          );})}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

            {/* ===== LIBRARY TAB ===== */}
            {activeTab === 'library' && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <KpiCard label="Total Documents" value={libraryKPIs.total} icon={FolderOpen} />
                  <KpiCard label="Active" value={libraryKPIs.active} icon={CheckCircle2} color="bg-green-500" />
                  <KpiCard label="Categories" value={libraryKPIs.categories} icon={Grid3X3} />
                  <KpiCard label="Expiring Soon" value={libraryKPIs.expiringSoon} icon={Clock} color="bg-amber-500" />
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="relative">
                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)} title="Category" className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      <option value="All">All Categories</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} title="Status" className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      <option value="All">All Statuses</option>
                      {(['active', 'draft', 'archived', 'expired'] as const).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input type="text" placeholder="Search documents or tags..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 pr-3 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                  </div>
                  <span className="text-xs text-gray-400 ml-auto">{filteredDocs.length} documents</span>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
                ) : filteredDocs.length === 0 ? (
                  <div className="text-center py-16 text-sm text-gray-400">No documents found</div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredDocs.map((doc, i) => {
                      const stCfg = STATUS_CFG[doc.status];
                      return (
                        <motion.button key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedDoc(doc)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-left hover:border-brand-blue/50 transition-colors group">
                          <div className="flex items-start justify-between mb-2">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-blue/10">
                              <FileText className="w-5 h-5 text-brand-blue" />
                            </div>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate mb-1">{doc.title}</p>
                          <p className="text-[10px] text-gray-400 truncate mb-2">{catName(doc.categoryId)}</p>
                          <div className="flex items-center justify-between text-[9px] text-gray-400">
                            <span>v{doc.version}</span>
                            <span>{bytesToLabel(doc.fileSize)}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Document</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Version</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Upload Date</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Size</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocs.map((doc, i) => {
                            const stCfg = STATUS_CFG[doc.status];
                            return (
                              <tr key={doc.id} className={`${i < filteredDocs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 cursor-pointer`} onClick={() => setSelectedDoc(doc)}>
                                <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{doc.title}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{catName(doc.categoryId)}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">v{doc.version}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{bytesToLabel(doc.fileSize)}</td>
                                <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== 201 FILES TAB ===== */}
            {activeTab === '201files' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-xs font-semibold text-gray-500">Employee:</label>
                  <div className="relative">
                    <select title='Select employee' value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      <option value="">Select an employee…</option>
                      {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                </div>

                {!selectedEmployee ? (
                  <div className="text-center py-16 text-sm text-gray-400">Select an employee to view their 201 file</div>
                ) : (
                  <>
                    {selectedEmp && (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold">{getInitials(selectedEmp.name)}</div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedEmp.name}</p>
                          <p className="text-xs text-gray-400">{selectedEmp.position} · {selectedEmp.department} · {empDocs.length} document{empDocs.length !== 1 ? 's' : ''} on file</p>
                        </div>
                        <button
                          onClick={() => { setUploadEmployeeId(selectedEmployee); setActiveTab('upload'); }}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-dark"
                        >
                          <Plus className="w-3.5 h-3.5" />Upload Document
                        </button>
                      </div>
                    )}
                    {empDocsLoading ? (
                      <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
                    ) : empDocs.length === 0 ? (
                      <div className="text-center py-12 text-sm text-gray-400">No documents on file for this employee yet</div>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Document</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Version</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Upload Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empDocs.map((doc, i) => {
                                const stCfg = STATUS_CFG[doc.status];
                                return (
                                  <tr key={doc.id} className={`${i < empDocs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 cursor-pointer`} onClick={() => setSelectedDoc(doc)}>
                                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{doc.title}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500">{catName(doc.categoryId)}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500">v{doc.version}</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</td>
                                    <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ===== UPLOAD TAB ===== */}
            {activeTab === 'upload' && (
              <div className="max-w-xl">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Title</label>
                    <input
                      type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. NBI Clearance"
                      className="w-full h-9 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Employee (optional — leave blank for a company-wide document)</label>
                    <select
                      value={uploadEmployeeId} onChange={(e) => setUploadEmployeeId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                    >
                      <option value="">Company-wide document</option>
                      {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Category (optional)</label>
                    <select
                      value={uploadCategoryId} onChange={(e) => setUploadCategoryId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">File</label>
                    <input
                      type="file"
                      accept={DOCUMENTS_ALLOWED_MIME.join(',')}
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      className="w-full text-xs text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Max {bytesToLabel(DOCUMENTS_MAX_BYTES)} — {DOCUMENTS_ALLOWED_LABEL}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!uploadFile || !uploadTitle.trim() || upload.isPending}
                    onClick={handleUpload}
                    className="mt-2 flex items-center justify-center gap-2 h-10 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue-dark disabled:opacity-50"
                  >
                    {upload.isPending ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />}
                    Upload
                  </button>
                </div>
              </div>
            )}

            {/* ===== SIGNATURES TAB ===== */}
            {activeTab === 'signatures' && (
              <ComingSoon note="The e_signatures table exists in the schema, but no signing workflow reads or writes it yet. Adding real e-signature requests/approvals is a larger, separate feature." />
            )}

            {/* ===== EXPIRING TAB ===== */}
            {activeTab === 'expiring' && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Documents With Expiry" value={expiringKPIs.withExpiry} icon={FolderOpen} />
                  <KpiCard label="Already Expired" value={expiringKPIs.expired} icon={AlertTriangle} color="bg-red-500" />
                  <KpiCard label="Within 30 Days" value={expiringKPIs.within30} icon={Clock} color="bg-amber-500" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-xs font-semibold text-gray-500">Show expiring within:</label>
                  <div className="flex gap-1">
                    {EXPIRING_OPTIONS.map(d => (
                      <button key={d} onClick={() => setExpiringDays(d)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${expiringDays === d ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{d}d</button>
                    ))}
                  </div>
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {expiringDocs.map((doc, i) => {
                      const urgency = doc.daysLeft <= 7 ? 'red' : doc.daysLeft <= 30 ? 'amber' : 'green';
                      const urgencyColor = urgency === 'red' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : urgency === 'amber' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : '';
                      return (
                        <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 ${urgencyColor || 'border-gray-200 dark:border-gray-800'}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-blue/10">
                              <FileText className="w-4 h-4 text-brand-blue" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{doc.title}</p>
                              <p className="text-xs text-gray-400">{catName(doc.categoryId)}</p>
                              <p className={`text-xs mt-1 font-bold ${urgency === 'red' ? 'text-red-600' : urgency === 'amber' ? 'text-amber-600' : 'text-green-600'}`}>
                                {doc.daysLeft < 0 ? 'EXPIRED' : `${doc.daysLeft} days remaining`} · Expires {format(new Date(doc.expiresAt as string), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {expiringDocs.length === 0 && <p className="text-center py-12 text-sm text-gray-400">No documents expiring within {expiringDays} days</p>}
                  </div>
                )}
              </div>
            )}

            {/* ===== VERSIONS TAB ===== */}
            {activeTab === 'versions' && (
              <ComingSoon note="The document_versions table exists in the schema, but nothing writes a new version row on re-upload yet — every document just tracks a single version number in place. Real version history is a separate feature." />
            )}

          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedDoc(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-5 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-white">Document Details</h3>
                <button title="Close" onClick={() => setSelectedDoc(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-semibold text-gray-800 dark:text-white text-right max-w-[280px]">{selectedDoc.title}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Category:</span><span className="font-semibold text-gray-800 dark:text-white">{catName(selectedDoc.categoryId)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Version:</span><span className="text-gray-700 dark:text-gray-300">v{selectedDoc.version}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">File Size:</span><span className="text-gray-700 dark:text-gray-300">{bytesToLabel(selectedDoc.fileSize)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Upload Date:</span><span className="text-gray-700 dark:text-gray-300">{format(new Date(selectedDoc.uploadedAt), 'MMM d, yyyy')}</span></div>
                {selectedDoc.expiresAt && <div className="flex justify-between"><span className="text-gray-500">Expiry:</span><span className="text-gray-700 dark:text-gray-300">{format(new Date(selectedDoc.expiresAt), 'MMM d, yyyy')}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CFG[selectedDoc.status].bg} ${STATUS_CFG[selectedDoc.status].color}`}>{STATUS_CFG[selectedDoc.status].label}</span></div>
                {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedDoc.tags.map(tag => <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{tag}</span>)}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={async () => {
                    const url = await getDocumentDownloadUrl(selectedDoc.filePath);
                    if (url) window.open(url, '_blank');
                    else toast.error('Could not generate a download link');
                  }}
                  className="flex-1 h-10 rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue-dark"
                >
                  <Download className="w-4 h-4 inline mr-1" />Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
