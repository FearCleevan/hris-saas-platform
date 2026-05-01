import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  File,
  Download,
  Search,
  CheckCircle,
  Circle,
  Upload,
  BookOpen,
  ClipboardList,
  FolderOpen,
  SendHorizonal,
  Info,
  X,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import myDocumentsRaw from '@/data/mock/my-documents.json';
import documentRequestsRaw from '@/data/mock/document-requests.json';
import companPoliciesRaw from '@/data/mock/company-policies.json';
import documentChecklistRaw from '@/data/mock/document-checklist.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = 'active' | 'expired';
type RequestStatus = 'processing' | 'completed' | 'cancelled';
type PolicyCategory = 'conduct' | 'leaves' | 'work-arrangement' | 'finance' | 'compliance';

interface MyDocument {
  id: string;
  employeeId: string;
  name: string;
  category: string;
  fileType: string;
  fileSize: string;
  uploadedDate: string;
  expiryDate: string | null;
  status: DocStatus;
  downloadable: boolean;
}

interface DocumentRequest {
  id: string;
  employeeId: string;
  type: string;
  typeName: string;
  purpose: string;
  requestedAt: string;
  status: RequestStatus;
  completedAt: string | null;
  notes: string | null;
}

interface CompanyPolicy {
  id: string;
  title: string;
  category: PolicyCategory;
  lastUpdated: string;
  version: string;
  summary: string;
  effectiveDate: string;
}

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  required: boolean;
  submitted: boolean;
  submittedDate: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';

const myDocuments = myDocumentsRaw as MyDocument[];
const initialRequests = documentRequestsRaw as DocumentRequest[];
const companyPolicies = companPoliciesRaw as CompanyPolicy[];
const initialChecklist = documentChecklistRaw as ChecklistItem[];

const CARD = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpiredDate(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00') < new Date();
}

// ─── Category Color Maps ──────────────────────────────────────────────────────

const DOC_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  employment:   { bg: 'bg-blue-100 dark:bg-blue-900',   text: 'text-blue-700 dark:text-blue-300' },
  certificates: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  tax:          { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300' },
  government:   { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
  medical:      { bg: 'bg-red-100 dark:bg-red-900',     text: 'text-red-700 dark:text-red-300' },
  credentials:  { bg: 'bg-cyan-100 dark:bg-cyan-900',   text: 'text-cyan-700 dark:text-cyan-300' },
};

function docCategoryColor(cat: string): { bg: string; text: string } {
  return DOC_CATEGORY_COLORS[cat] ?? { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' };
}

const POLICY_CATEGORY_COLORS: Record<PolicyCategory, { bg: string; text: string }> = {
  conduct:          { bg: 'bg-red-100 dark:bg-red-900',    text: 'text-red-700 dark:text-red-300' },
  leaves:           { bg: 'bg-blue-100 dark:bg-blue-900',  text: 'text-blue-700 dark:text-blue-300' },
  'work-arrangement': { bg: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-700 dark:text-teal-300' },
  finance:          { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300' },
  compliance:       { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
};

function policyCategoryLabel(cat: PolicyCategory): string {
  const labels: Record<PolicyCategory, string> = {
    conduct: 'Conduct',
    leaves: 'Leaves',
    'work-arrangement': 'Work Arrangement',
    finance: 'Finance',
    compliance: 'Compliance',
  };
  return labels[cat];
}

const REQUEST_STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  processing: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', label: 'Processing' },
  completed:  { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', label: 'Completed' },
  cancelled:  { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-600 dark:text-red-400',     label: 'Cancelled' },
};

// ─── Policy Modal Content Generator ──────────────────────────────────────────

function getPolicyBody(policy: CompanyPolicy): string[] {
  switch (policy.id) {
    case 'pol001':
      return [
        'All employees are expected to conduct themselves in a professional, ethical, and respectful manner at all times. This includes maintaining integrity in all business dealings, treating colleagues, clients, and stakeholders with dignity and respect, and avoiding any behavior that could be considered discriminatory, harassing, or offensive.',
        'Conflicts of interest must be disclosed promptly to the immediate supervisor or the HR Department. Employees must not use company resources, information, or relationships for personal gain. Confidential company information must be protected at all times and must not be shared with unauthorized individuals inside or outside the organization.',
        'Violations of this Code of Conduct will be subject to disciplinary action, up to and including termination of employment, in accordance with the Disciplinary Action Guidelines. Employees are encouraged to report suspected violations through the designated reporting channels without fear of retaliation.',
      ];
    case 'pol002':
      return [
        'Employees are entitled to the following leave types per year: Vacation Leave (VL) — 15 days, Sick Leave (SL) — 15 days, Service Incentive Leave (SIL) — 5 days (convertible to cash), and Emergency Leave (EL) — 3 days. Maternity, Paternity, and Solo Parent Leave are governed by applicable Philippine laws (RA 11210, RA 8187, RA 8972).',
        'Leave requests must be filed through the Employee Portal at least 3 working days in advance for VL, and as soon as possible for SL and EL. Medical certificates are required for SL absences of 3 or more consecutive days. Approval is subject to operational requirements and manager discretion.',
        'Unused VL may be carried over to the following year up to a maximum of 10 days. Unused SIL credits are convertible to cash at year-end at the employee\'s daily rate. Leave credits do not accumulate during unpaid leave periods. All leave filings are subject to final approval by the employee\'s direct supervisor and the HR Department.',
      ];
    case 'pol003':
      return [
        'Employees may be eligible for Work-From-Home (WFH) arrangements subject to the nature of their role, performance standing, and operational requirements. Eligibility is determined by the department head in coordination with HR. Employees on probationary status are generally not eligible for WFH unless specifically approved.',
        'WFH employees are responsible for maintaining a suitable and secure work environment at home. Company-issued equipment must be used in accordance with the IT Security Policy. Employees must be reachable during core hours (9:00 AM – 4:00 PM) and are expected to maintain the same level of productivity and output quality as in-office work.',
        'Attendance is tracked through the Employee Portal time-in/time-out system. WFH privilege may be revoked at any time based on performance, attendance issues, or business needs. All WFH arrangements must be formally approved and documented through HR.',
      ];
    case 'pol004':
      return [
        'The company maintains a zero-tolerance policy on all forms of sexual harassment in the workplace, in accordance with Republic Act No. 7877 (Anti-Sexual Harassment Act of 1995) and RA 11313 (Safe Spaces Act). This policy applies to all employees, contractors, clients, and visitors at any company premises or company-related events.',
        'Sexual harassment includes any unwelcome sexual advances, requests for sexual favors, or other verbal or physical conduct of a sexual nature that affects an individual\'s employment, creates an intimidating, hostile, or offensive work environment. All incidents must be reported to the designated Committee on Decorum and Investigation (CODI).',
        'The company commits to conduct thorough and impartial investigations within the prescribed timelines. Complainants are protected from retaliation. Offenders found guilty after due process will face disciplinary sanctions including suspension or dismissal, and may be referred to appropriate authorities for criminal prosecution.',
      ];
    case 'pol005':
      return [
        'The company collects and processes employee personal data in compliance with Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations. Employee data is collected solely for lawful HR management purposes including payroll processing, benefits administration, compliance reporting, and performance management.',
        'Employees have the right to access their personal data held by the company, request corrections to inaccurate data, and object to processing in certain circumstances. Data is stored securely with access restricted to authorized personnel only. The company maintains data retention schedules and securely disposes of data no longer needed.',
        'Any data breach affecting employee personal data will be reported to the National Privacy Commission (NPC) and affected individuals within the prescribed period. Employees who suspect a data breach or privacy violation should immediately report it to the Data Privacy Officer (DPO). Unauthorized disclosure of personal data is a disciplinary offense.',
      ];
    case 'pol006':
      return [
        'The company reimburses legitimate business expenses incurred by employees in the performance of their duties. Reimbursable expense categories include transportation, meals (client entertainment), communication, training materials, and other pre-approved business expenses. Personal expenses are not reimbursable.',
        'Expense claims must be filed within 30 calendar days from the date of expenditure. Claims must be supported by original official receipts or invoices. Category spending limits apply as specified in the Expense Categories guide. Claims exceeding category limits require additional approval from the Department Head and Finance.',
        'Approved reimbursements will be processed in the next available payroll cycle or within 10 business days. Falsification of receipts or submission of non-business expenses constitutes fraud and will result in immediate disciplinary action including recovery of the reimbursed amount and possible termination.',
      ];
    case 'pol007':
      return [
        'The company follows a progressive disciplinary process in accordance with DOLE Department Order No. 147-15. Offenses are classified into minor, serious, and grave categories. Minor offenses typically result in verbal or written warnings for first-time occurrences, escalating to suspension or dismissal for repeated violations.',
        'Serious offenses such as insubordination, chronic tardiness, and unauthorized absences may result in suspension or dismissal depending on frequency and circumstances. Grave offenses such as theft, fraud, physical assault, and gross insubordination may result in immediate dismissal upon due process.',
        'Due process requires that employees be given a written notice detailing the charges and afforded an opportunity to explain in writing (Notice to Explain). A hearing or conference may be conducted when warranted. A Notice of Decision will be issued within the prescribed period. Employees may request a review through HR.',
      ];
    case 'pol008':
      return [
        'All company IT systems, devices, networks, and data must be used for legitimate business purposes only. Personal use should be minimal and must not interfere with work performance or consume excessive bandwidth. Employees must not access, download, or distribute illegal, offensive, or unauthorized content.',
        'Employees are responsible for maintaining the security of their login credentials. Passwords must meet minimum complexity requirements and must not be shared. Employees must lock their workstations when unattended. Unauthorized installation of software is prohibited. Company data must not be stored on personal devices without explicit IT approval.',
        'Security incidents including suspected malware, phishing attempts, unauthorized access, or data loss must be reported to the IT Security team immediately. The company monitors network traffic and system activity for security purposes. Violations of this policy are subject to disciplinary action and may result in civil or criminal liability.',
      ];
    default:
      return [
        'This policy outlines the company\'s guidelines and standards for the relevant area of operation. All employees are expected to read, understand, and comply with the provisions of this policy.',
        'Non-compliance with this policy may result in disciplinary action in accordance with the Disciplinary Action Guidelines. Questions regarding this policy should be directed to the Human Resources Department.',
        'This policy is subject to periodic review and may be updated to reflect changes in applicable laws, regulations, or business requirements. Employees will be notified of significant changes.',
      ];
  }
}

// ─── Policy Modal ─────────────────────────────────────────────────────────────

function PolicyModal({
  policy,
  onClose,
}: {
  policy: CompanyPolicy;
  onClose: () => void;
}) {
  const catColors = POLICY_CATEGORY_COLORS[policy.category];
  const bodyParagraphs = getPolicyBody(policy);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${catColors.bg} ${catColors.text}`}>
                {policyCategoryLabel(policy.category)}
              </span>
              <span className="text-[11px] text-gray-400">{policy.version}</span>
            </div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">{policy.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Effective {formatDate(policy.effectiveDate)} &middot; Last updated {formatDate(policy.lastUpdated)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            aria-label="Close policy"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {bodyParagraphs.map((para, i) => (
            <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {para}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={() => toast.info(`Downloading ${policy.title} PDF...`)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <Download size={14} />
            Download PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab 1: My Documents ──────────────────────────────────────────────────────

const DOC_CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'employment', label: 'Employment' },
  { value: 'certificates', label: 'Certificates' },
  { value: 'tax', label: 'Tax' },
  { value: 'government', label: 'Government' },
  { value: 'medical', label: 'Medical' },
  { value: 'credentials', label: 'Credentials' },
];

function MyDocumentsTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = myDocuments.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {DOC_CATEGORY_FILTERS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setCategoryFilter(chip.value)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
              categoryFilter === chip.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className={`${CARD} p-12 text-center`}>
          <FolderOpen size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No documents found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting the search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((doc) => {
            const isExpired = doc.status === 'expired';
            const expiryIsFuture = doc.expiryDate && !isExpiredDate(doc.expiryDate);
            const catColors = docCategoryColor(doc.category);

            return (
              <div
                key={doc.id}
                className={[
                  CARD,
                  'p-5 hover:shadow-md transition-shadow',
                  isExpired ? 'border-l-4 border-l-red-400' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`shrink-0 p-2.5 rounded-xl ${isExpired ? 'bg-red-50 dark:bg-red-950' : 'bg-blue-50 dark:bg-blue-950'}`}>
                    {doc.fileType === 'pdf' ? (
                      <FileText size={20} className={isExpired ? 'text-red-500' : 'text-blue-500'} />
                    ) : (
                      <File size={20} className="text-blue-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${catColors.bg} ${catColors.text}`}>
                        {doc.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isExpired
                            ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                            : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                        }`}
                      >
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Uploaded {formatDate(doc.uploadedDate)} &middot; {doc.fileSize}
                    </p>

                    {doc.expiryDate && (
                      <p
                        className={`text-[11px] mt-0.5 font-medium ${
                          isExpired
                            ? 'text-red-500 dark:text-red-400'
                            : expiryIsFuture
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        Expires {formatDate(doc.expiryDate)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Download */}
                {doc.downloadable && (
                  <button
                    type="button"
                    onClick={() => toast.info(`Downloading ${doc.name}...`)}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Download size={13} />
                    Download
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Tab 2: Request Documents ─────────────────────────────────────────────────

const DOC_TYPE_OPTIONS = [
  { value: 'COE', label: 'Certificate of Employment (COE)' },
  { value: 'PAYSLIP_CERT', label: 'Payslip Certification (last 3 months)' },
  { value: 'EMP_VERIFICATION', label: 'Employment Verification Letter' },
  { value: 'SERVICE_RECORD', label: 'Service Record' },
  { value: 'LEAVE_CERT', label: 'Leave Balance Certification' },
  { value: 'BIR_2316', label: 'BIR Form 2316' },
  { value: 'OTHER', label: 'Other' },
];

const requestSchema = z.object({
  docType: z.string().min(1, 'Document type is required'),
  customType: z.string().optional(),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  urgency: z.enum(['standard', 'urgent']),
  delivery: z.enum(['email', 'pickup']),
});

type RequestFormValues = z.infer<typeof requestSchema>;

function RequestDocumentsTab({
  requests,
  onAddRequest,
}: {
  requests: DocumentRequest[];
  onAddRequest: (req: DocumentRequest) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      docType: '',
      customType: '',
      purpose: '',
      urgency: 'standard',
      delivery: 'email',
    },
  });

  const docType = watch('docType');

  function onSubmit(data: RequestFormValues) {
    const typeOption = DOC_TYPE_OPTIONS.find((o) => o.value === data.docType);
    const typeName =
      data.docType === 'OTHER' && data.customType
        ? data.customType
        : (typeOption?.label ?? data.docType);

    const newReq: DocumentRequest = {
      id: `req${Date.now()}`,
      employeeId: 'emp001',
      type: data.docType,
      typeName,
      purpose: data.purpose,
      requestedAt: new Date().toISOString(),
      status: 'processing',
      completedAt: null,
      notes: null,
    };

    onAddRequest(newReq);
    toast.success('Document request submitted. You will be notified once ready.');
    reset({
      docType: '',
      customType: '',
      purpose: '',
      urgency: 'standard',
      delivery: 'email',
    });
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-6">
      {/* Request Form */}
      <div className={`${CARD} p-5`}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-5">New Document Request</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Document Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="req-doc-type">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              id="req-doc-type"
              {...register('docType')}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select document type...</option>
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.docType && <p className="text-xs text-red-500 mt-1">{errors.docType.message}</p>}
          </div>

          {/* Custom type field */}
          {docType === 'OTHER' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="req-custom-type">
                Specify Document Type <span className="text-red-500">*</span>
              </label>
              <input
                id="req-custom-type"
                type="text"
                placeholder="e.g., Certificate of No Pending Case"
                {...register('customType')}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
          )}

          {/* Purpose */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="req-purpose">
              Purpose <span className="text-red-500">*</span>
            </label>
            <textarea
              id="req-purpose"
              rows={3}
              placeholder="e.g., Visa application, Bank loan, Rental requirement"
              {...register('purpose')}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
            />
            {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose.message}</p>}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Urgency <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" value="standard" {...register('urgency')} className="mt-0.5" />
                <span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Standard</span>
                  <span className="text-xs text-gray-400 ml-1.5">3–5 business days</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="radio" value="urgent" {...register('urgency')} className="mt-0.5" />
                <span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Urgent</span>
                  <span className="text-xs text-gray-400 ml-1.5">1–2 business days</span>
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                    additional fee may apply
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Delivery */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Delivery Method <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" value="email" {...register('delivery')} />
                <span className="text-sm text-gray-900 dark:text-white">Email</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" value="pickup" {...register('delivery')} />
                <span className="text-sm text-gray-900 dark:text-white">Pick-up at HR Office</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <SendHorizonal size={14} />
            Submit Request
          </button>
        </form>
      </div>

      {/* Request History */}
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Request History</p>
        {requests.length === 0 ? (
          <div className={`${CARD} p-10 text-center`}>
            <ClipboardList size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No document requests yet</p>
          </div>
        ) : (
          <div className={`${CARD} p-0 overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                    {['Document Type', 'Purpose', 'Requested', 'Status', 'Completed', 'Notes'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {requests.map((req) => {
                    const s = REQUEST_STATUS_STYLES[req.status];
                    return (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {req.typeName}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[160px] truncate">
                          {req.purpose}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {formatDateTime(req.requestedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {req.completedAt ? formatDateTime(req.completedAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">
                          {req.notes ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tab 3: Upload Documents ──────────────────────────────────────────────────

const CHECKLIST_CATEGORY_ORDER = ['identity', 'government', 'clearance', 'medical', 'credentials'];

const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  identity:    'Identity',
  government:  'Government',
  clearance:   'Clearance',
  medical:     'Medical',
  credentials: 'Credentials',
};

function UploadDocumentsTab({
  checklist,
  onUpload,
}: {
  checklist: ChecklistItem[];
  onUpload: (id: string) => void;
}) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const requiredItems = checklist.filter((c) => c.required);
  const submittedRequired = requiredItems.filter((c) => c.submitted).length;
  const totalRequired = requiredItems.length;
  const completenessPercent = totalRequired > 0 ? Math.round((submittedRequired / totalRequired) * 100) : 100;

  const progressColor =
    completenessPercent >= 80
      ? 'bg-green-500'
      : completenessPercent >= 50
      ? 'bg-amber-500'
      : 'bg-red-500';

  const progressTextColor =
    completenessPercent >= 80
      ? 'text-green-600 dark:text-green-400'
      : completenessPercent >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  function handleFileChange(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(id);
      toast.success('Document uploaded successfully');
      if (fileInputRefs.current[id]) {
        fileInputRefs.current[id]!.value = '';
      }
    }
  }

  const groupedByCategory = CHECKLIST_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CHECKLIST_CATEGORY_LABELS[cat] ?? cat,
    items: checklist.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <motion.div {...fadeUp(0)} className="space-y-5">
      {/* Progress bar */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white">201 File Completeness</p>
          <span className={`text-sm font-extrabold tabular-nums ${progressTextColor}`}>
            {completenessPercent}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${completenessPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">
          {submittedRequired} of {totalRequired} required documents submitted
        </p>
      </div>

      {/* Note banner */}
      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
        <Info size={15} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Uploaded files are reviewed by HR within 2 business days.
        </p>
      </div>

      {/* Checklist by category */}
      {groupedByCategory.map((group, gi) => {
        const submittedCount = group.items.filter((i) => i.submitted).length;
        return (
          <motion.div key={group.category} {...fadeUp(gi + 1)} className={`${CARD} p-0 overflow-hidden`}>
            {/* Category header */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{group.label}</p>
              <span className="text-xs text-gray-400 font-medium">
                {submittedCount}/{group.items.length} submitted
              </span>
            </div>

            {/* Items */}
            <ul className="px-5">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  {/* Status icon */}
                  {item.submitted ? (
                    <CheckCircle size={18} className="shrink-0 text-green-500" />
                  ) : (
                    <Circle size={18} className="shrink-0 text-gray-300 dark:text-gray-600" />
                  )}

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{item.name}</p>
                    {item.submitted && item.submittedDate ? (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Submitted on {formatDate(item.submittedDate)}
                      </p>
                    ) : null}
                  </div>

                  {/* Required/Optional badge */}
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      item.required
                        ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {item.required ? 'Required' : 'Optional'}
                  </span>

                  {/* Upload button if not submitted */}
                  {!item.submitted && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        <Upload size={12} />
                        Upload
                      </button>
                      <input
                        title="Input"
                        ref={(el) => { fileInputRefs.current[item.id] = el; }}
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(item.id, e)}
                      />
                    </>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── Tab 4: Company Policies ──────────────────────────────────────────────────

const POLICY_CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'conduct', label: 'Conduct' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'work-arrangement', label: 'Work Arrangement' },
  { value: 'finance', label: 'Finance' },
  { value: 'compliance', label: 'Compliance' },
];

function CompanyPoliciesTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPolicy, setSelectedPolicy] = useState<CompanyPolicy | null>(null);

  const handleClose = useCallback(() => setSelectedPolicy(null), []);

  const filtered = companyPolicies.filter((pol) => {
    const matchesSearch =
      pol.title.toLowerCase().includes(search.toLowerCase()) ||
      pol.summary.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || pol.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {POLICY_CATEGORY_FILTERS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setCategoryFilter(chip.value)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
              categoryFilter === chip.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Policy grid */}
      {filtered.length === 0 ? (
        <div className={`${CARD} p-12 text-center`}>
          <BookOpen size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No policies found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting the search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((pol, i) => {
            const catColors = POLICY_CATEGORY_COLORS[pol.category];
            return (
              <motion.div
                key={pol.id}
                {...fadeUp(i)}
                className={`${CARD} p-5 hover:shadow-md transition-shadow flex flex-col`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${catColors.bg} ${catColors.text}`}>
                    {policyCategoryLabel(pol.category)}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">{pol.version}</span>
                </div>

                <p className="font-bold text-sm text-gray-900 dark:text-white mb-1">{pol.title}</p>

                <p className="text-xs text-gray-400 mb-2">
                  Last updated {formatDate(pol.lastUpdated)}
                </p>

                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3 flex-1">
                  {pol.summary}
                </p>

                <p className="text-[11px] text-gray-400 mb-3">
                  Effective {formatDate(pol.effectiveDate)}
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedPolicy(pol)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <BookOpen size={12} />
                  View Policy
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedPolicy && (
        <PolicyModal policy={selectedPolicy} onClose={handleClose} />
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('my-docs');
  const [requests, setRequests] = useState<DocumentRequest[]>(initialRequests);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);

  // Completeness calculation for header badge
  const requiredItems = checklist.filter((c) => c.required);
  const submittedRequired = requiredItems.filter((c) => c.submitted).length;
  const totalRequired = requiredItems.length;
  const completenessPercent =
    totalRequired > 0 ? Math.round((submittedRequired / totalRequired) * 100) : 100;

  function handleAddRequest(req: DocumentRequest) {
    setRequests((prev) => [req, ...prev]);
  }

  function handleUpload(id: string) {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, submitted: true, submittedDate: new Date().toISOString().slice(0, 10) }
          : item
      )
    );
  }

  const tabs = [
    { value: 'my-docs',  label: 'My Documents',    icon: <FolderOpen size={15} /> },
    { value: 'request',  label: 'Request Documents', icon: <ClipboardList size={15} /> },
    { value: 'upload',   label: 'Upload Documents',  icon: <Upload size={15} /> },
    { value: 'policies', label: 'Company Policies',  icon: <BookOpen size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Documents &amp; Requests
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Your files, certificates, and company policies
          </p>
        </div>
        {/* 201 completeness badge */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
            completenessPercent >= 80
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : completenessPercent >= 50
              ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
          }`}
        >
          <FileText size={14} />
          201 File: {completenessPercent}% complete
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="my-docs">
          <MyDocumentsTab />
        </TabsContent>

        <TabsContent value="request">
          <RequestDocumentsTab requests={requests} onAddRequest={handleAddRequest} />
        </TabsContent>

        <TabsContent value="upload">
          <UploadDocumentsTab checklist={checklist} onUpload={handleUpload} />
        </TabsContent>

        <TabsContent value="policies">
          <CompanyPoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
