import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, User, Phone, Briefcase, Shield,
  Banknote, Users, Upload, X, Plus, FileText, Paperclip, AlertCircle, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PH_PROVINCES, PH_CITIES } from '@/data/ph-locations';
import mockEmployeesData from '@/data/mock/employees.json';
import mockEmployeeDetailsData from '@/data/mock/employee-details.json';

// ─── Constants ────────────────────────────────────────────────────────────────

const PH_BANKS = [
  'BDO Unibank',
  'BPI (Bank of the Philippine Islands)',
  'Metrobank',
  'PNB (Philippine National Bank)',
  'Security Bank',
  'RCBC',
  'China Banking Corporation (China Bank)',
  'UnionBank of the Philippines',
  'EastWest Bank',
  'LANDBANK of the Philippines',
  'DBP (Development Bank of the Philippines)',
  'AUB (Asia United Bank)',
  'Maybank Philippines',
  'Robinsons Bank',
  'Sterling Bank of Asia',
  'GCash / G-Xchange',
  'Maya Bank',
  'SeaBank Philippines',
  'CIMB Bank Philippines',
  'Tonik Digital Bank',
  'OFBank',
];

const STATIC_DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'IT', 'Admin'];
const CIVIL_STATUSES     = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'];
const EMPLOYMENT_TYPES   = ['regular', 'probationary', 'contractual'];
const RELATIONSHIPS      = ['Spouse', 'Child', 'Parent', 'Sibling', 'In-law', 'Other'];

const STEPS = [
  { id: 'personal',      label: 'Personal',     icon: User },
  { id: 'contact',       label: 'Contact',       icon: Phone },
  { id: 'employment',    label: 'Employment',    icon: Briefcase },
  { id: 'govids',        label: "Gov't IDs",     icon: Shield },
  { id: 'bank',          label: 'Bank',          icon: Banknote },
  { id: 'beneficiaries', label: 'Beneficiaries', icon: Users },
  { id: 'documents',     label: 'Documents',     icon: Upload },
];

const SELECT_CLS = 'mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1';
const ERR_CLS    = 'mt-1 text-xs text-red-500';
const LBL_CLS    = 'text-xs font-medium text-gray-600 dark:text-gray-400';

// ─── Gov't ID formatters ──────────────────────────────────────────────────────

function formatSSS(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 9)}-${d.slice(9)}`;
}

function formatPhilHealth(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  if (d.length <= 2) return d;
  if (d.length <= 11) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 11)}-${d.slice(11)}`;
}

function formatPagibig(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}

function formatTIN(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Org data fetchers ────────────────────────────────────────────────────────

async function fetchOrgPositions(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase
    .from('user_profiles').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return [];
  const { data } = await supabase
    .from('positions').select('title').eq('organization_id', profile.organization_id).order('title');
  return (data ?? []).map((p: { title: string }) => p.title);
}

async function fetchOrgDepartments(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase
    .from('user_profiles').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return [];
  const { data } = await supabase
    .from('departments').select('name').eq('organization_id', profile.organization_id).order('name');
  return (data ?? []).map((d: { name: string }) => d.name);
}

// ─── SearchSelect ─────────────────────────────────────────────────────────────

function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={open ? query : value}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          placeholder={value ? value : placeholder}
          className={`w-full h-9 rounded-lg border ${
            error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
          } bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? filtered.map((o) => (
            <button
              key={o}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setQuery(''); setOpen(false); }}
            >
              {o}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-400">No results</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const personalSchema = z.object({
  firstName:   z.string().min(1, { error: 'First name is required' }),
  middleName:  z.string().optional(),
  lastName:    z.string().min(1, { error: 'Last name is required' }),
  birthday:    z.string().min(1, { error: 'Birthday is required' }),
  gender:      z.enum(['Male', 'Female'], { error: 'Select gender' }),
  civilStatus: z.string().min(1, { error: 'Civil status is required' }),
  nationality: z.string().min(1, { error: 'Nationality is required' }),
});
const contactSchema = z.object({
  personalEmail:         z.email({ error: 'Valid email required' }),
  companyEmail:          z.email({ error: 'Valid email required' }),
  mobile:                z.string().min(11, { error: 'Valid mobile number required' }),
  landline:              z.string().optional(),
  street:                z.string().min(1, { error: 'Street is required' }),
  city:                  z.string().min(1, { error: 'City is required' }),
  province:              z.string().min(1, { error: 'Province is required' }),
  zip:                   z.string().min(4, { error: 'ZIP code required' }),
  emergencyName:         z.string().min(1, { error: 'Emergency contact name required' }),
  emergencyRelationship: z.string().min(1, { error: 'Relationship required' }),
  emergencyPhone:        z.string().min(11, { error: 'Valid phone required' }),
});
const employmentSchema = z.object({
  position:   z.string().min(1, { error: 'Position is required' }),
  department: z.string().min(1, { error: 'Department is required' }),
  type:       z.string().min(1, { error: 'Employment type is required' }),
  hireDate:   z.string().min(1, { error: 'Hire date is required' }),
  salary:     z.string().min(1, { error: 'Salary is required' }),
});
const govidsSchema = z.object({
  sss:       z.string().optional(),
  philhealth: z.string().optional(),
  pagibig:   z.string().optional(),
  tin:       z.string().optional(),
});
const bankSchema = z.object({
  bankName:      z.string().optional(),
  accountNumber: z.string().optional(),
  accountName:   z.string().optional(),
  accountType:   z.string().optional(),
});

type AllFormData = Partial<
  z.infer<typeof personalSchema> &
  z.infer<typeof contactSchema> &
  z.infer<typeof employmentSchema> &
  z.infer<typeof govidsSchema> &
  z.infer<typeof bankSchema>
>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormField {
  name: string; label: string; type?: string;
  placeholder?: string; required?: boolean; options?: string[]; half?: boolean;
}

interface Beneficiary {
  id: string; name: string; relationship: string; birthday: string;
  type: 'primary' | 'contingent';
}

// ─── Helper: split full name ──────────────────────────────────────────────────

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName:  parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName:   parts[parts.length - 1],
  };
}

// ─── FieldGroup (personal step only) ─────────────────────────────────────────

function FieldGroup({ fields, register, errors }: {
  fields: FormField[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f) => (
        <div key={f.name} className={f.half === false ? 'sm:col-span-2' : ''}>
          <Label htmlFor={f.name} className={LBL_CLS}>
            {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          {f.options ? (
            <select id={f.name} title={f.label} {...register(f.name)} className={SELECT_CLS}>
              <option value="">Select {f.label.toLowerCase()}</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input id={f.name} type={f.type ?? 'text'} placeholder={f.placeholder} {...register(f.name)} className="mt-1" />
          )}
          {errors[f.name] && <p className={ERR_CLS}>{errors[f.name]?.message}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── BeneficiariesStep ────────────────────────────────────────────────────────

function BeneficiariesStep({ beneficiaries, onChange }: { beneficiaries: Beneficiary[]; onChange: (l: Beneficiary[]) => void }) {
  const [form, setForm] = useState({ name: '', relationship: '', birthday: '', type: 'primary' as 'primary' | 'contingent' });
  const [error, setError] = useState('');

  const add = () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.relationship)  { setError('Relationship is required.'); return; }
    setError('');
    onChange([...beneficiaries, { ...form, id: `ben_${Date.now()}` }]);
    setForm({ name: '', relationship: '', birthday: '', type: 'primary' });
  };
  const remove = (id: string) => onChange(beneficiaries.filter((b) => b.id !== id));

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
        Update beneficiaries for government benefits (SSS, Pag-IBIG, PhilHealth) and life insurance.
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Add Beneficiary</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Maria Dela Cruz" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Relationship <span className="text-red-500">*</span></Label>
            <select title="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className={SELECT_CLS}>
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Birthday</Label>
            <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select title="Beneficiary type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'primary' | 'contingent' })} className={SELECT_CLS}>
              <option value="primary">Primary</option>
              <option value="contingent">Contingent</option>
            </select>
          </div>
        </div>
        {error && <p className={ERR_CLS}>{error}</p>}
        <Button type="button" onClick={add} size="sm" className="self-start flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white">
          <Plus className="w-3.5 h-3.5" /> Add Beneficiary
        </Button>
      </div>
      {beneficiaries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Added ({beneficiaries.length})</p>
          {beneficiaries.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-xs font-bold shrink-0">
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{b.name}</p>
                  <p className="text-xs text-gray-400">
                    {b.relationship}
                    {b.birthday && ` · Born ${new Date(b.birthday).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    {' · '}
                    <span className={`font-medium ${b.type === 'primary' ? 'text-brand-blue' : 'text-gray-500'}`}>
                      {b.type.charAt(0).toUpperCase() + b.type.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                title="Remove"
                type="button"
                onClick={() => remove(b.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Users className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p className="text-xs text-gray-400">No beneficiaries added yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── DocumentsStep ────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { key: 'resume',       label: 'Resume / CV',            required: true,  hint: 'PDF or Word document' },
  { key: 'photo',        label: '2x2 ID Photo',           required: true,  hint: 'JPEG or PNG, white background' },
  { key: 'nbi',          label: 'NBI Clearance',          required: true,  hint: 'Valid within 6 months' },
  { key: 'medical',      label: 'Pre-employment Medical', required: true,  hint: 'From accredited clinic' },
  { key: 'sss_id',       label: 'SSS ID / E-1 Form',      required: false, hint: 'SSS card or E-1 member data' },
  { key: 'philhealth_id',label: 'PhilHealth MDR',         required: false, hint: 'PhilHealth member data record' },
  { key: 'pagibig_id',   label: 'Pag-IBIG MDF',           required: false, hint: 'Pag-IBIG member data form' },
  { key: 'tin_id',       label: 'TIN ID / BIR Form 1902', required: false, hint: 'TIN card or application form' },
  { key: 'diploma',      label: 'Diploma / TOR',          required: false, hint: 'Highest educational attainment' },
  { key: 'birth_cert',   label: 'Birth Certificate (PSA)',required: false, hint: 'PSA-authenticated copy' },
  { key: 'marriage_cert',label: 'Marriage Certificate',   required: false, hint: 'PSA-authenticated (if married)' },
];

function DocumentsStep({ uploads, onChange }: { uploads: Record<string, File | null>; onChange: (u: Record<string, File | null>) => void }) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const handleFile = (key: string, file: File | null) => onChange({ ...uploads, [key]: file });

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
        Upload replacement documents or add new ones to the 201 file. Previously uploaded files are preserved automatically.
      </div>
      <div className="flex flex-col gap-2">
        {DOC_TYPES.map((doc) => {
          const file = uploads[doc.key];
          return (
            <div key={doc.key} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${file ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {file ? <Check className="w-4 h-4 text-green-600 dark:text-green-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{doc.label}</p>
                    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${doc.required ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}`}>
                      {doc.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  {file ? (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate flex items-center gap-1">
                      <Paperclip className="w-3 h-3 shrink-0" />{file.name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 truncate">{doc.hint}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {file && (
                  <button title="Remove" type="button" onClick={() => handleFile(doc.key, null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <input title="Select File" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  ref={(el) => { fileRefs.current[doc.key] = el; }}
                  onChange={(e) => handleFile(doc.key, e.target.files?.[0] ?? null)} />
                <Button type="button" size="sm" variant="outline" onClick={() => fileRefs.current[doc.key]?.click()} className="text-xs h-7 px-2.5">
                  {file ? 'Change' : 'Upload'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: dbEmployee, isLoading } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();

  const buildInitialData = (): AllFormData => {
    if (dbEmployee) {
      return {
        firstName:             dbEmployee.firstName,
        middleName:            dbEmployee.middleName ?? '',
        lastName:              dbEmployee.lastName,
        birthday:              dbEmployee.birthday ?? '',
        gender:                (dbEmployee.gender as 'Male' | 'Female') ?? 'Male',
        civilStatus:           dbEmployee.civilStatus ?? '',
        nationality:           dbEmployee.nationality ?? '',
        personalEmail:         dbEmployee.personalEmail ?? '',
        companyEmail:          dbEmployee.workEmail ?? '',
        mobile:                dbEmployee.mobile ?? '',
        landline:              dbEmployee.landline ?? '',
        street:                dbEmployee.addressLine1 ?? '',
        city:                  dbEmployee.city ?? '',
        province:              dbEmployee.province ?? '',
        zip:                   dbEmployee.zipCode ?? '',
        emergencyName:         dbEmployee.emergencyName ?? '',
        emergencyRelationship: dbEmployee.emergencyRelationship ?? '',
        emergencyPhone:        dbEmployee.emergencyPhone ?? '',
        position:              dbEmployee.position ?? '',
        department:            dbEmployee.department ?? '',
        type:                  dbEmployee.employmentType ?? '',
        hireDate:              dbEmployee.dateHired ?? '',
        salary:                String(dbEmployee.salary ?? ''),
        sss:                   dbEmployee.sss ?? '',
        philhealth:            dbEmployee.philhealth ?? '',
        pagibig:               dbEmployee.pagibig ?? '',
        tin:                   dbEmployee.tin ?? '',
        bankName:              dbEmployee.bankName ?? '',
        accountNumber:         dbEmployee.accountNumber ?? '',
        accountName:           dbEmployee.accountName ?? '',
        accountType:           dbEmployee.accountType ?? '',
      };
    }
    const mockEmp     = mockEmployeesData.find((e) => e.id === id);
    const mockDetails = mockEmployeeDetailsData.find((d) => d.id === id);
    if (!mockEmp) return {};
    const { firstName, middleName, lastName } = splitName(mockEmp.name);
    return {
      firstName, middleName, lastName,
      birthday:    mockEmp.birthday ?? '',
      gender:      ((mockDetails as any)?.gender as 'Male' | 'Female') ?? 'Male',
      civilStatus: (mockDetails as any)?.civilStatus ?? '',
      nationality: (mockDetails as any)?.nationality ?? '',
      personalEmail:         (mockDetails as any)?.personalEmail ?? '',
      companyEmail:          (mockDetails as any)?.companyEmail ?? '',
      mobile:                (mockDetails as any)?.mobile ?? '',
      landline:              (mockDetails as any)?.landline ?? '',
      street:                (mockDetails as any)?.address?.street ?? '',
      city:                  (mockDetails as any)?.address?.city ?? '',
      province:              (mockDetails as any)?.address?.province ?? '',
      zip:                   (mockDetails as any)?.address?.zip ?? '',
      emergencyName:         (mockDetails as any)?.emergencyContact?.name ?? '',
      emergencyRelationship: (mockDetails as any)?.emergencyContact?.relationship ?? '',
      emergencyPhone:        (mockDetails as any)?.emergencyContact?.phone ?? '',
      position:   mockEmp.position ?? '',
      department: mockEmp.department ?? '',
      type:       mockEmp.type ?? '',
      hireDate:   mockEmp.hireDate ?? '',
      salary:     String(mockEmp.salary ?? ''),
      sss:        (mockDetails as any)?.sss ?? '',
      philhealth: (mockDetails as any)?.philhealth ?? '',
      pagibig:    (mockDetails as any)?.pagibig ?? '',
      tin:        (mockDetails as any)?.tin ?? '',
      bankName:      (mockDetails as any)?.bank?.name ?? '',
      accountNumber: (mockDetails as any)?.bank?.accountNumber ?? '',
      accountName:   (mockDetails as any)?.bank?.accountName ?? '',
      accountType:   (mockDetails as any)?.bank?.type ?? '',
    };
  };

  const [step, setStep] = useState(0);
  const [allData, setAllData] = useState<AllFormData>({});
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [uploads, setUploads] = useState<Record<string, File | null>>({});
  const [finalSubmitting, setFinalSubmitting] = useState(false);

  const schemas = [personalSchema, contactSchema, employmentSchema, govidsSchema, bankSchema];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
    reset,
  } = useForm({
    resolver: step < 5 ? zodResolver(schemas[step]) : undefined,
    defaultValues: allData,
  });

  // Fetch org positions and departments from DB
  const { data: dbPositions = [] } = useQuery({
    queryKey: ['org-positions'],
    queryFn: fetchOrgPositions,
    enabled: isSupabaseConfigured,
    staleTime: 1000 * 60 * 5,
  });

  const { data: dbDepartments = [] } = useQuery({
    queryKey: ['org-departments'],
    queryFn: fetchOrgDepartments,
    enabled: isSupabaseConfigured,
    staleTime: 1000 * 60 * 5,
  });

  const deptOptions = dbDepartments.length > 0 ? dbDepartments : STATIC_DEPARTMENTS;

  const watchedProvince = watch('province');
  const cityOptions = watchedProvince
    ? (PH_CITIES[watchedProvince] ?? [])
    : Object.values(PH_CITIES).flat().sort();

  // Pre-fill form once DB data (or mock fallback) is available
  useEffect(() => {
    if (isLoading) return;
    const initial = buildInitialData();
    setAllData(initial);
    reset(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleStepSubmit = async (data: object) => {
    setAllData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handleCustomNext = () => {
    if (step === 6) handleFinalSubmit();
    else setStep((s) => s + 1);
  };

  const handleFinalSubmit = async () => {
    if (!id) return;
    setFinalSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        // Merge accumulated step data with the live form values — getValues() includes
        // all fields registered across steps (shouldUnregister defaults to false).
        const merged = { ...allData, ...getValues() };
        await updateEmployee.mutateAsync({
          id,
          payload: merged as Parameters<typeof updateEmployee.mutateAsync>[0]['payload'],
        });
      }
      toast.success('Employee profile updated successfully!');
      navigate(`/employees/${id}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update employee');
    } finally {
      setFinalSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  const employeeExists = dbEmployee || mockEmployeesData.some((e) => e.id === id);

  if (!employeeExists) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Employee not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/employees')} className="mt-4">
          Back to list
        </Button>
      </div>
    );
  }

  const employeeName = dbEmployee?.name
    ?? mockEmployeesData.find((e) => e.id === id)?.name
    ?? 'Employee';

  const isCustomStep = step >= 5;

  const personalFields: FormField[] = [
    { name: 'firstName',   label: 'First Name',   placeholder: 'Juan',         required: true },
    { name: 'lastName',    label: 'Last Name',    placeholder: 'Dela Cruz',    required: true },
    { name: 'middleName',  label: 'Middle Name',  placeholder: 'Santos' },
    { name: 'birthday',    label: 'Birthday',     type: 'date',                required: true },
    { name: 'gender',      label: 'Gender',       options: ['Male', 'Female'], required: true },
    { name: 'civilStatus', label: 'Civil Status', options: CIVIL_STATUSES,     required: true },
    { name: 'nationality', label: 'Nationality',  placeholder: 'Filipino',     required: true, half: false },
  ];

  const Field = ({ name, label, required, half, children, error }: {
    name: string; label: string; required?: boolean; half?: boolean;
    children: React.ReactNode; error?: string;
  }) => (
    <div className={half === false ? 'sm:col-span-2' : ''}>
      <Label htmlFor={name} className={LBL_CLS}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className={ERR_CLS}>{error}</p>}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to={`/employees/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Edit Employee</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Editing profile for <span className="font-semibold text-gray-700 dark:text-gray-300">{employeeName}</span>
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done   = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                active  ? 'bg-brand-blue text-white' :
                done    ? 'bg-brand-blue/15 text-brand-blue dark:text-blue-400' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-5 h-px ${done ? 'bg-brand-blue/40' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-5">
          Step {step + 1} of {STEPS.length}: {STEPS[step].label}
        </h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Steps 0–4: react-hook-form */}
            {!isCustomStep && (
              <form onSubmit={handleSubmit(handleStepSubmit)}>

                {/* Step 0: Personal */}
                {step === 0 && (
                  <FieldGroup fields={personalFields} register={register} errors={errors} />
                )}

                {/* Step 1: Contact */}
                {step === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="companyEmail" label="Company Email" required error={errors.companyEmail?.message as string}>
                      <Input id="companyEmail" type="email" placeholder="j.delacruz@company.ph" {...register('companyEmail')} className="mt-1" />
                    </Field>
                    <Field name="personalEmail" label="Personal Email" required error={errors.personalEmail?.message as string}>
                      <Input id="personalEmail" type="email" placeholder="juan@gmail.com" {...register('personalEmail')} className="mt-1" />
                    </Field>
                    <Field name="mobile" label="Mobile" required error={errors.mobile?.message as string}>
                      <Input id="mobile" placeholder="09171234567" {...register('mobile')} className="mt-1" />
                    </Field>
                    <Field name="landline" label="Landline" error={errors.landline?.message as string}>
                      <Input id="landline" placeholder="02-8123-4567" {...register('landline')} className="mt-1" />
                    </Field>
                    <Field name="street" label="Street Address" required half={false} error={errors.street?.message as string}>
                      <Input id="street" placeholder="123 Rizal St, Brgy. Poblacion" {...register('street')} className="mt-1" />
                    </Field>

                    {/* Province — searchable combobox */}
                    <Field name="province" label="Province" required error={errors.province?.message as string}>
                      <div className="mt-1">
                        <Controller
                          name="province"
                          control={control}
                          render={({ field }) => (
                            <SearchSelect
                              value={field.value || ''}
                              onChange={(val) => {
                                field.onChange(val);
                                setValue('city', '');
                              }}
                              options={PH_PROVINCES}
                              placeholder="Select province"
                              error={errors.province?.message as string}
                            />
                          )}
                        />
                      </div>
                    </Field>

                    {/* City — filtered by selected province */}
                    <Field name="city" label="City / Municipality" required error={errors.city?.message as string}>
                      <div className="mt-1">
                        <Controller
                          name="city"
                          control={control}
                          render={({ field }) => (
                            <SearchSelect
                              value={field.value || ''}
                              onChange={field.onChange}
                              options={cityOptions}
                              placeholder={watchedProvince ? 'Select city/municipality' : 'Select province first'}
                              disabled={!watchedProvince}
                              error={errors.city?.message as string}
                            />
                          )}
                        />
                      </div>
                    </Field>

                    <Field name="zip" label="ZIP Code" required error={errors.zip?.message as string}>
                      <Input id="zip" placeholder="1210" {...register('zip')} className="mt-1" />
                    </Field>
                    <Field name="emergencyName" label="Emergency Contact Name" required error={errors.emergencyName?.message as string}>
                      <Input id="emergencyName" placeholder="Pedro Dela Cruz" {...register('emergencyName')} className="mt-1" />
                    </Field>
                    <Field name="emergencyRelationship" label="Relationship" required error={errors.emergencyRelationship?.message as string}>
                      <Input id="emergencyRelationship" placeholder="Father" {...register('emergencyRelationship')} className="mt-1" />
                    </Field>
                    <Field name="emergencyPhone" label="Emergency Phone" required error={errors.emergencyPhone?.message as string}>
                      <Input id="emergencyPhone" placeholder="09179876543" {...register('emergencyPhone')} className="mt-1" />
                    </Field>
                  </div>
                )}

                {/* Step 2: Employment */}
                {step === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Position — DB suggestions via datalist, allows free-form input */}
                    <Field name="position" label="Position / Job Title" required half={false} error={errors.position?.message as string}>
                      <div className="mt-1">
                        <input
                          id="position"
                          list="positions-datalist"
                          placeholder="e.g. Software Engineer"
                          {...register('position')}
                          className={SELECT_CLS.replace('mt-1 ', '')}
                          autoComplete="off"
                        />
                        <datalist id="positions-datalist">
                          {dbPositions.map((p) => <option key={p} value={p} />)}
                        </datalist>
                      </div>
                    </Field>

                    {/* Department — DB or static fallback */}
                    <Field name="department" label="Department" required error={errors.department?.message as string}>
                      <select id="department" {...register('department')} className={SELECT_CLS}>
                        <option value="">Select department</option>
                        {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>

                    <Field name="type" label="Employment Type" required error={errors.type?.message as string}>
                      <select id="type" {...register('type')} className={SELECT_CLS}>
                        <option value="">Select type</option>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </Field>

                    <Field name="hireDate" label="Hire Date" required error={errors.hireDate?.message as string}>
                      <Input id="hireDate" type="date" {...register('hireDate')} className="mt-1" />
                    </Field>

                    <Field name="salary" label="Monthly Basic Salary (₱)" required half={false} error={errors.salary?.message as string}>
                      <Input id="salary" type="number" placeholder="50000" {...register('salary')} className="mt-1" />
                    </Field>
                  </div>
                )}

                {/* Step 3: Gov't IDs */}
                {step === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className={LBL_CLS}>SSS Number</Label>
                      <Controller name="sss" control={control} render={({ field }) => (
                        <Input
                          value={field.value || ''}
                          onChange={(e) => field.onChange(formatSSS(e.target.value))}
                          placeholder="12-3456789-0"
                          className="mt-1"
                        />
                      )} />
                      <p className="mt-0.5 text-[10px] text-gray-400">Format: ##-#######-#</p>
                    </div>

                    <div>
                      <Label className={LBL_CLS}>PhilHealth Number</Label>
                      <Controller name="philhealth" control={control} render={({ field }) => (
                        <Input
                          value={field.value || ''}
                          onChange={(e) => field.onChange(formatPhilHealth(e.target.value))}
                          placeholder="12-345678901-2"
                          className="mt-1"
                        />
                      )} />
                      <p className="mt-0.5 text-[10px] text-gray-400">Format: ##-#########-#</p>
                    </div>

                    <div>
                      <Label className={LBL_CLS}>Pag-IBIG Number</Label>
                      <Controller name="pagibig" control={control} render={({ field }) => (
                        <Input
                          value={field.value || ''}
                          onChange={(e) => field.onChange(formatPagibig(e.target.value))}
                          placeholder="1234-5678-9012"
                          className="mt-1"
                        />
                      )} />
                      <p className="mt-0.5 text-[10px] text-gray-400">Format: ####-####-####</p>
                    </div>

                    <div>
                      <Label className={LBL_CLS}>TIN</Label>
                      <Controller name="tin" control={control} render={({ field }) => (
                        <Input
                          value={field.value || ''}
                          onChange={(e) => field.onChange(formatTIN(e.target.value))}
                          placeholder="123-456-789-001"
                          className="mt-1"
                        />
                      )} />
                      <p className="mt-0.5 text-[10px] text-gray-400">Format: ###-###-###-###</p>
                    </div>
                  </div>
                )}

                {/* Step 4: Bank */}
                {step === 4 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="bankName" label="Bank Name" error={errors.bankName?.message as string}>
                      <select id="bankName" {...register('bankName')} className={SELECT_CLS}>
                        <option value="">Select bank</option>
                        {PH_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>

                    <Field name="accountType" label="Account Type" error={errors.accountType?.message as string}>
                      <select id="accountType" {...register('accountType')} className={SELECT_CLS}>
                        <option value="">Select type</option>
                        <option value="savings">Savings</option>
                        <option value="checking">Checking</option>
                        <option value="payroll">Payroll</option>
                      </select>
                    </Field>

                    <Field name="accountNumber" label="Account Number" half={false} error={errors.accountNumber?.message as string}>
                      <Input id="accountNumber" placeholder="001234567890" {...register('accountNumber')} className="mt-1" />
                    </Field>

                    <Field name="accountName" label="Account Name (as in bank)" half={false} error={errors.accountName?.message as string}>
                      <Input id="accountName" placeholder="Juan Santos Dela Cruz" {...register('accountName')} className="mt-1" />
                    </Field>
                  </div>
                )}

                {step === 4 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Update bank details for payroll processing. Leave blank to keep existing details.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <Button type="button" variant="outline" onClick={() => step > 0 ? setStep((s) => s - 1) : navigate(`/employees/${id}`)} className="flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" />
                    {step > 0 ? 'Back' : 'Cancel'}
                  </Button>
                  <Button type="submit" className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white">
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step 5: Beneficiaries */}
            {step === 5 && (
              <div>
                <BeneficiariesStep beneficiaries={beneficiaries} onChange={setBeneficiaries} />
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="button" onClick={handleCustomNext} className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white">
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Documents */}
            {step === 6 && (
              <div>
                <DocumentsStep uploads={uploads} onChange={setUploads} />
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCustomNext}
                    disabled={finalSubmitting}
                    className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white"
                  >
                    {finalSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <><Check className="w-4 h-4" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
