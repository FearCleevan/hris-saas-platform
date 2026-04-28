// src/pages/documents/DocumentsPage.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, FileUser, Upload, PenTool, Clock, GitBranch,
  Search, ChevronDown, Download, Plus, X,
  FileText, FileSpreadsheet, FileImage, File, Grid3X3, List,
  AlertTriangle, CheckCircle2, FileCheck, Building2, Award,
  ScrollText, IdCard, TrendingUp, GraduationCap,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import employeesData from '@/data/mock/employees.json';
import categoriesData from '@/data/mock/documents-categories.json';
import documentsData from '@/data/mock/documents-library.json';
import versionsData from '@/data/mock/documents-versions.json';

/* ─── Types ─── */
type TabId = 'library' | '201files' | 'upload' | 'signatures' | 'expiring' | 'versions';

interface DocCategory {
  id: string; name: string; icon: string; description: string;
  color: string; accessLevel: string; requiredFor201: boolean;
  retentionMonths: number; requireESignature: boolean;
}

interface Document {
  id: string; name: string; categoryId: string; department: string;
  employeeId: string; fileType: string; fileSize: string;
  uploadedBy: string; uploadedDate: string; expiryDate: string;
  status: string; version: string; accessLevel: string;
  tags: string[]; description: string;
  esignedRequired: boolean; esignedStatus: string; esignedDate: string;
}

interface DocVersion {
  id: string; documentId: string; version: string;
  uploadedBy: string; uploadedDate: string; changeNotes: string; fileSize: string;
}

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'library', label: 'Library', icon: FolderOpen },
  { id: '201files', label: '201 Files', icon: FileUser },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'signatures', label: 'Signatures', icon: PenTool },
  { id: 'expiring', label: 'Expiring', icon: Clock },
  { id: 'versions', label: 'Versions', icon: GitBranch },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:        { label: 'Active',        color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  expiring_soon: { label: 'Expiring Soon', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  expired:       { label: 'Expired',       color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  archived:      { label: 'Archived',      color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
};

const ESIGN_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  signed:  { label: 'Signed',  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  expired: { label: 'Expired', color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-950/30' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FileCheck, Building2, Award, ScrollText, IdCard, TrendingUp, GraduationCap, AlertTriangle,
};

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText, docx: FileText, xlsx: FileSpreadsheet, jpg: FileImage, png: FileImage,
};

const ACCESS_CFG: Record<string, { label: string; color: string }> = {
  public:        { label: 'Public',        color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
  department:    { label: 'Department',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  manager:       { label: 'Manager',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  hr_admin:      { label: 'HR/Admin',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  confidential:  { label: 'Confidential',  color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

const ALL_DEPARTMENTS = ['All', ...new Set(employeesData.map(e => e.department))].sort();
const EXPIRING_OPTIONS = [7, 14, 30, 60, 90];

/* ─── Helpers ─── */
function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }

function KpiCard({ label, value, icon: IconC, sub, color }: { label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-[#0038a8]/10'}`}>
        <IconC className={`w-5 h-5 ${color ? 'text-white' : 'text-[#0038a8]'}`} />
      </div>
      <div><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [catFilter, setCatFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(employeesData[0].id);
  const [expiringDays, setExpiringDays] = useState(30);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedVersionDoc, setSelectedVersionDoc] = useState<string>('doc001');

  const categories = categoriesData as DocCategory[];
  const documents = documentsData as Document[];
  const versions = versionsData as DocVersion[];

  /* ─── Library Tab ─── */
  const filteredDocs = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter(d => {
      if (catFilter !== 'All' && d.categoryId !== catFilter) return false;
      if (deptFilter !== 'All' && d.department !== deptFilter && d.department !== 'All') return false;
      if (q && !d.name.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q) && !d.tags.some(t => t.toLowerCase().includes(q))) return false;
      return true;
    }).map(d => { const cat = categories.find(c => c.id === d.categoryId); return { ...d, cat }; });
  }, [catFilter, deptFilter, search]);

  const libraryKPIs = useMemo(() => ({
    total: documents.length,
    categories: categories.length,
    expiringSoon: documents.filter(d => d.status === 'expiring_soon').length,
    active: documents.filter(d => d.status === 'active').length,
  }), []);

  /* ─── 201 Files Tab ─── */
  const empDocs = useMemo(() => documents.filter(d => d.employeeId === selectedEmployee).map(d => { const cat = categories.find(c => c.id === d.categoryId); return { ...d, cat }; }), [selectedEmployee]);
  const selectedEmp = useMemo(() => employeesData.find(e => e.id === selectedEmployee)!, [selectedEmployee]);
  const required201Categories = useMemo(() => categories.filter(c => c.requiredFor201), []);
  const missing201 = useMemo(() => required201Categories.filter(c => !empDocs.some(d => d.categoryId === c.id)), [required201Categories, empDocs]);

  /* ─── Signatures Tab ─── */
  const sigDocs = useMemo(() => documents.filter(d => d.esignedRequired).map(d => { const cat = categories.find(c => c.id === d.categoryId); const emp = d.employeeId ? employeesData.find(e => e.id === d.employeeId) : null; return { ...d, cat, emp }; }), []);
  const pendingSigs = useMemo(() => sigDocs.filter(d => d.esignedStatus === 'pending'), [sigDocs]);
  const signedSigs = useMemo(() => sigDocs.filter(d => d.esignedStatus === 'signed'), [sigDocs]);

  /* ─── Expiring Tab ─── */
  const expiringDocs = useMemo(() => {
    const now = new Date('2023-11-24');
    return documents.filter(d => {
      if (!d.expiryDate || d.status === 'expired') {
        return d.status === 'expired';
      }
      const expiry = new Date(d.expiryDate);
      const daysLeft = differenceInDays(expiry, now);
      return daysLeft >= 0 && daysLeft <= expiringDays;
    }).map(d => {
      const cat = categories.find(c => c.id === d.categoryId);
      const emp = d.employeeId ? employeesData.find(e => e.id === d.employeeId) : null;
      const daysLeft = differenceInDays(new Date(d.expiryDate), new Date('2023-11-24'));
      return { ...d, cat, emp, daysLeft };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [expiringDays]);

  const expiringKPIs = useMemo(() => ({
    thisMonth: documents.filter(d => d.expiryDate && d.expiryDate >= '2023-11-01' && d.expiryDate <= '2023-11-30').length,
    expired: documents.filter(d => d.status === 'expired' || (d.expiryDate && d.expiryDate < '2023-11-24' && d.status !== 'archived')).length,
    within30: documents.filter(d => d.expiryDate && differenceInDays(new Date(d.expiryDate), new Date('2023-11-24')) <= 30 && differenceInDays(new Date(d.expiryDate), new Date('2023-11-24')) >= 0).length,
  }), []);

  /* ─── Versions Tab ─── */
  const versionHistory = useMemo(() => {
    return versions.filter(v => v.documentId === selectedVersionDoc).map(v => {
      const uploader = employeesData.find(e => e.id === v.uploadedBy);
      return { ...v, uploader };
    }).sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime());
  }, [selectedVersionDoc]);
  const selectedVersionDocument = useMemo(() => documents.find(d => d.id === selectedVersionDoc), [selectedVersionDoc]);
  const docsWithVersions = useMemo(() => [...new Set(versions.map(v => v.documentId))].map(id => documents.find(d => d.id === id)).filter(Boolean) as Document[], []);

  /* ─── Render ─── */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Document Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{libraryKPIs.total} documents · {libraryKPIs.categories} categories</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'library' && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button title='Select' onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><Grid3X3 className="w-3.5 h-3.5 text-gray-500" /></button>
                <button title='Select' onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}><List className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            )}
            {expiringKPIs.within30 > 0 && <button onClick={() => setActiveTab('expiring')} className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 font-semibold text-xs border border-amber-200">{expiringKPIs.within30} expiring</button>}
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(tab => { const Icon = tab.icon; return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-[#0038a8] text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );})}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

            {/* ===== LIBRARY TAB ===== */}
            {activeTab === 'library' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
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
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} title="Department" className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input type="text" placeholder="Search documents or tags..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 pr-3 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs" />
                  </div>
                  <span className="text-xs text-gray-400 ml-auto">{filteredDocs.length} documents</span>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredDocs.map((doc, i) => {
                      const FileIcon = doc.cat ? (CATEGORY_ICONS[doc.cat.icon as keyof typeof CATEGORY_ICONS] || FileText) : FileText;
                      const stCfg = STATUS_CFG[doc.status];
                      return (
                        <motion.button key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedDoc(doc)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-left hover:border-[#0038a8]/50 transition-colors group">
                          <div className="flex items-start justify-between mb-2">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: doc.cat?.color ? `${doc.cat.color}20` : '#0038a820' }}>
                              <FileIcon className="w-5 h-5" style={{ color: doc.cat?.color || '#0038a8' }} />
                            </div>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate mb-1">{doc.name}</p>
                          <p className="text-[10px] text-gray-400 truncate mb-2">{doc.description}</p>
                          <div className="flex items-center justify-between text-[9px] text-gray-400">
                            <span>{doc.cat?.name}</span>
                            <span>{doc.version} · {doc.fileSize}</span>
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
                                <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{doc.name}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{doc.cat?.name}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{doc.version}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(doc.uploadedDate), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{doc.fileSize}</td>
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
                    <select title='Select' value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium">
                      {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                  <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold">{getInitials(selectedEmp.name)}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedEmp.name}</p>
                        <p className="text-xs text-gray-400">{selectedEmp.position} · {selectedEmp.department}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">201 File Completion: {empDocs.length}/{required201Categories.length} categories</p>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round((empDocs.length / Math.max(required201Categories.length, 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                    <p className="text-xs font-semibold text-gray-500 mb-3">Missing Documents</p>
                    {missing201.length === 0 ? (
                      <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />All required documents present</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {missing201.map(c => (
                          <div key={c.id} className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                            <tr key={doc.id} className={`${i < empDocs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20`}>
                              <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-white">{doc.name}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{doc.cat?.name}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{doc.version}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{format(new Date(doc.uploadedDate), 'MMM d, yyyy')}</td>
                              <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ===== UPLOAD TAB ===== */}
            {activeTab === 'upload' && (
              <div>
                <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 mb-5 text-center hover:border-[#0038a8]/50 transition-colors cursor-pointer group">
                  <Upload className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4 group-hover:text-[#0038a8] transition-colors" />
                  <p className="text-base font-bold text-gray-500 dark:text-gray-400 mb-1">Drag & drop files here</p>
                  <p className="text-xs text-gray-400 mb-4">or click to browse — PDF, DOCX, XLSX, JPG, PNG (max 10MB)</p>
                  <button className="px-5 py-2.5 bg-[#0038a8] text-white text-sm font-semibold rounded-xl hover:bg-[#002d8a] transition-colors" onClick={() => toast.success('Upload simulated — 3 files queued')}>
                    <Plus className="w-4 h-4 inline mr-1.5" />Select Files
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['pdf','docx','xlsx','jpg','png'].map(ft => {
                    const FI = FILE_ICONS[ft] || File;
                    return (
                      <div key={ft} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center gap-3">
                        <FI className="w-8 h-8 text-gray-300" />
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{ft}</p>
                          <p className="text-[10px] text-gray-400">{ft === 'jpg' || ft === 'png' ? 'Image file' : 'Document'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== SIGNATURES TAB ===== */}
            {activeTab === 'signatures' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Documents Requiring Signature" value={sigDocs.length} icon={PenTool} />
                  <KpiCard label="Pending Signatures" value={pendingSigs.length} icon={Clock} color="bg-amber-500" />
                  <KpiCard label="Signed" value={signedSigs.length} icon={CheckCircle2} color="bg-green-500" />
                </div>
                <div className="flex flex-col gap-3">
                  {sigDocs.map((doc, i) => {
                    const esCfg = ESIGN_STATUS_CFG[doc.esignedStatus] || ESIGN_STATUS_CFG.pending;
                    return (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: doc.cat?.color ? `${doc.cat.color}20` : '#0038a820' }}>
                            <FileText className="w-4 h-4" style={{ color: doc.cat?.color || '#0038a8' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{doc.name}</p>
                            <p className="text-xs text-gray-400">{doc.cat?.name} · {doc.emp ? doc.emp.name : 'Company-wide'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${esCfg.bg} ${esCfg.color}`}>{esCfg.label}</span>
                              {doc.esignedDate && <span className="text-[10px] text-gray-400">on {format(new Date(doc.esignedDate), 'MMM d, yyyy')}</span>}
                            </div>
                          </div>
                          {doc.esignedStatus === 'pending' && (
                            <button onClick={() => toast.success(`Document "${doc.name}" signed successfully`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] shrink-0">
                              <PenTool className="w-3 h-3" />Sign
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== EXPIRING TAB ===== */}
            {activeTab === 'expiring' && (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <KpiCard label="Expiring This Month" value={expiringKPIs.thisMonth} icon={Clock} color="bg-amber-500" />
                  <KpiCard label="Already Expired" value={expiringKPIs.expired} icon={AlertTriangle} color="bg-red-500" />
                  <KpiCard label="Within 30 Days" value={expiringKPIs.within30} icon={Clock} color="bg-red-500" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-xs font-semibold text-gray-500">Show expiring within:</label>
                  <div className="flex gap-1">
                    {EXPIRING_OPTIONS.map(d => (
                      <button key={d} onClick={() => setExpiringDays(d)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${expiringDays === d ? 'bg-[#0038a8] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{d}d</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {expiringDocs.map((doc, i) => {
                    const urgency = doc.daysLeft <= 7 ? 'red' : doc.daysLeft <= 30 ? 'amber' : 'green';
                    const urgencyColor = urgency === 'red' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : urgency === 'amber' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : '';
                    return (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 ${urgencyColor || 'border-gray-200 dark:border-gray-800'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: doc.cat?.color ? `${doc.cat.color}20` : '#0038a820' }}>
                            <FileText className="w-4 h-4" style={{ color: doc.cat?.color || '#0038a8' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{doc.name}</p>
                            <p className="text-xs text-gray-400">{doc.cat?.name} {doc.emp ? `· ${doc.emp.name}` : ''}</p>
                            <p className={`text-xs mt-1 font-bold ${urgency === 'red' ? 'text-red-600' : urgency === 'amber' ? 'text-amber-600' : 'text-green-600'}`}>
                              {doc.daysLeft <= 0 ? 'EXPIRED' : `${doc.daysLeft} days remaining`} · Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <button onClick={() => toast.success(`Renewal initiated for "${doc.name}"`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0038a8] text-white text-xs font-semibold hover:bg-[#002d8a] shrink-0">Renew</button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {expiringDocs.length === 0 && <p className="text-center py-12 text-sm text-gray-400">No documents expiring within {expiringDays} days</p>}
                </div>
              </div>
            )}

            {/* ===== VERSIONS TAB ===== */}
            {activeTab === 'versions' && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <label className="text-xs font-semibold text-gray-500">Document:</label>
                  <div className="relative">
                    <select title='Select' value={selectedVersionDoc} onChange={e => setSelectedVersionDoc(e.target.value)} className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium max-w-[350px]">
                      {docsWithVersions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                </div>
                {selectedVersionDocument && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-4">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedVersionDocument.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Current: {selectedVersionDocument.version} · {selectedVersionDocument.fileSize} · {versionHistory.length} versions total</p>
                  </div>
                )}
                <div className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-700">
                  {versionHistory.map((ver, i) => (
                    <div key={ver.id} className={`mb-6 relative ${i < versionHistory.length - 1 ? '' : ''}`}>
                      <div className="absolute -left-[calc(2rem+5px)] w-3 h-3 rounded-full border-2 border-[#0038a8] bg-white dark:bg-gray-900 mt-1" />
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{ver.version}</span>
                          <span className="text-[10px] text-gray-400">{format(new Date(ver.uploadedDate), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{ver.changeNotes}</p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>Uploaded by: {ver.uploader?.name || 'Unknown'}</span>
                          <span>{ver.fileSize}</span>
                        </div>
                        {i > 0 && (
                          <button onClick={() => toast.success(`Version ${ver.version} restored`)} className="mt-2 text-[10px] font-semibold text-[#0038a8] hover:underline">Restore this version</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                <button title="Button" onClick={() => setSelectedDoc(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-semibold text-gray-800 dark:text-white text-right max-w-[280px]">{selectedDoc.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Category:</span><span className="font-semibold text-gray-800 dark:text-white">{(selectedDoc as any).cat?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Version:</span><span className="text-gray-700 dark:text-gray-300">{selectedDoc.version}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">File Size:</span><span className="text-gray-700 dark:text-gray-300">{selectedDoc.fileSize}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Upload Date:</span><span className="text-gray-700 dark:text-gray-300">{format(new Date(selectedDoc.uploadedDate), 'MMM d, yyyy')}</span></div>
                {selectedDoc.expiryDate && <div className="flex justify-between"><span className="text-gray-500">Expiry:</span><span className="text-gray-700 dark:text-gray-300">{format(new Date(selectedDoc.expiryDate), 'MMM d, yyyy')}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CFG[selectedDoc.status].bg} ${STATUS_CFG[selectedDoc.status].color}`}>{STATUS_CFG[selectedDoc.status].label}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Access:</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACCESS_CFG[selectedDoc.accessLevel]?.color}`}>{ACCESS_CFG[selectedDoc.accessLevel]?.label}</span></div>
                {selectedDoc.esignedRequired && <div className="flex justify-between"><span className="text-gray-500">E-Signature:</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESIGN_STATUS_CFG[selectedDoc.esignedStatus]?.bg} ${ESIGN_STATUS_CFG[selectedDoc.esignedStatus]?.color}`}>{ESIGN_STATUS_CFG[selectedDoc.esignedStatus]?.label}</span></div>}
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedDoc.tags.map(tag => <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{tag}</span>)}
                </div>
                <p className="text-xs text-gray-400 pt-1">{selectedDoc.description}</p>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { toast.success(`Downloading ${selectedDoc.name}`); setSelectedDoc(null); }} className="flex-1 h-10 rounded-xl bg-[#0038a8] text-white text-sm font-bold hover:bg-[#002d8a]"><Download className="w-4 h-4 inline mr-1" />Download</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}