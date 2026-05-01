import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, User, Phone, Briefcase, Shield,
  Banknote, Users, Upload, X, Plus, FileText, Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addEmployee } from '@/services/addEmployee';

const STEPS = [
  { id: 'personal',      label: 'Personal',      icon: User },
  { id: 'contact',       label: 'Contact',        icon: Phone },
  { id: 'employment',    label: 'Employment',     icon: Briefcase },
  { id: 'govids',        label: "Gov't IDs",      icon: Shield },
  { id: 'bank',          label: 'Bank',           icon: Banknote },
  { id: 'beneficiaries', label: 'Beneficiaries',  icon: Users },
  { id: 'documents',     label: 'Documents',      icon: Upload },
];

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'IT', 'Admin'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'];
const EMPLOYMENT_TYPES = ['regular', 'probationary', 'contractual'];
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'In-law', 'Other'];

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
  personalEmail:        z.email({ error: 'Valid email required' }),
  companyEmail:         z.email({ error: 'Valid email required' }),
  mobile:               z.string().min(11, { error: 'Valid mobile number required' }),
  landline:             z.string().optional(),
  street:               z.string().min(1, { error: 'Street is required' }),
  city:                 z.string().min(1, { error: 'City is required' }),
  province:             z.string().min(1, { error: 'Province is required' }),
  zip:                  z.string().min(4, { error: 'ZIP code required' }),
  emergencyName:        z.string().min(1, { error: 'Emergency contact name required' }),
  emergencyRelationship: z.string().min(1, { error: 'Relationship required' }),
  emergencyPhone:       z.string().min(11, { error: 'Valid phone required' }),
});

const employmentSchema = z.object({
  position:  z.string().min(1, { error: 'Position is required' }),
  department: z.string().min(1, { error: 'Department is required' }),
  type:      z.string().min(1, { error: 'Employment type is required' }),
  hireDate:  z.string().min(1, { error: 'Hire date is required' }),
  salary:    z.string().min(1, { error: 'Salary is required' }),
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

type PersonalData    = z.infer<typeof personalSchema>;
type ContactData     = z.infer<typeof contactSchema>;
type EmploymentData  = z.infer<typeof employmentSchema>;
type GovidsData      = z.infer<typeof govidsSchema>;
type BankData        = z.infer<typeof bankSchema>;
type AllFormData     = Partial<PersonalData & ContactData & EmploymentData & GovidsData & BankData>;

interface FormField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  half?: boolean;
}

interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  birthday: string;
  type: 'primary' | 'contingent';
}

const DOC_TYPES: { key: string; label: string; required: boolean; hint: string }[] = [
  { key: 'resume',    label: 'Resume / CV',              required: true,  hint: 'PDF or Word document' },
  { key: 'photo',     label: '2x2 ID Photo',             required: true,  hint: 'JPEG or PNG, white background' },
  { key: 'nbi',       label: 'NBI Clearance',            required: true,  hint: 'Valid within 6 months' },
  { key: 'medical',   label: 'Pre-employment Medical',   required: true,  hint: 'From accredited clinic' },
  { key: 'sss_id',    label: 'SSS ID / E-1 Form',        required: false, hint: 'SSS card or E-1 member data' },
  { key: 'philhealth_id', label: 'PhilHealth MDR',       required: false, hint: 'PhilHealth member data record' },
  { key: 'pagibig_id', label: 'Pag-IBIG MDF',            required: false, hint: 'Pag-IBIG member data form' },
  { key: 'tin_id',    label: 'TIN ID / BIR Form 1902',   required: false, hint: 'TIN card or application form' },
  { key: 'diploma',   label: 'Diploma / TOR',            required: false, hint: 'Highest educational attainment' },
  { key: 'birth_cert', label: 'Birth Certificate (PSA)', required: false, hint: 'PSA-authenticated copy' },
  { key: 'marriage_cert', label: 'Marriage Certificate', required: false, hint: 'PSA-authenticated (if married)' },
];

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
          <Label htmlFor={f.name} className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          {f.options ? (
            <select
              id={f.name}
              {...register(f.name)}
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-[#0038a8] focus:ring-offset-1"
            >
              <option value="">Select {f.label.toLowerCase()}</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input
              id={f.name}
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              {...register(f.name)}
              className="mt-1"
            />
          )}
          {errors[f.name] && (
            <p className="mt-1 text-xs text-red-500">{errors[f.name]?.message}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function BeneficiariesStep({
  beneficiaries,
  onChange,
}: {
  beneficiaries: Beneficiary[];
  onChange: (list: Beneficiary[]) => void;
}) {
  const [form, setForm] = useState({ name: '', relationship: '', birthday: '', type: 'primary' as 'primary' | 'contingent' });
  const [error, setError] = useState('');

  const add = () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.relationship) { setError('Relationship is required.'); return; }
    setError('');
    onChange([...beneficiaries, { ...form, id: `ben_${Date.now()}` }]);
    setForm({ name: '', relationship: '', birthday: '', type: 'primary' });
  };

  const remove = (id: string) => onChange(beneficiaries.filter((b) => b.id !== id));

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
        Beneficiaries are for government benefits (SSS, Pag-IBIG, PhilHealth) and life insurance.
        You can add multiple. This is optional.
      </div>

      {/* Add form */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Add Beneficiary</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Maria Dela Cruz"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Relationship <span className="text-red-500">*</span></Label>
            <select
              title='Select'
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-[#0038a8]"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Birthday</Label>
            <Input
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select
              title='Select'
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'primary' | 'contingent' })}
              className="mt-1 w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-[#0038a8]"
            >
              <option value="primary">Primary</option>
              <option value="contingent">Contingent</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button type="button" onClick={add} size="sm" className="self-start flex items-center gap-1.5 bg-[#0038a8] hover:bg-[#002d8a] text-white">
          <Plus className="w-3.5 h-3.5" /> Add Beneficiary
        </Button>
      </div>

      {/* List */}
      {beneficiaries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Added ({beneficiaries.length})</p>
          {beneficiaries.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0038a8]/10 flex items-center justify-center text-[#0038a8] text-xs font-bold shrink-0">
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{b.name}</p>
                  <p className="text-xs text-gray-400">
                    {b.relationship}
                    {b.birthday && ` · Born ${new Date(b.birthday).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    {' · '}
                    <span className={`font-medium ${b.type === 'primary' ? 'text-[#0038a8]' : 'text-gray-500'}`}>
                      {b.type.charAt(0).toUpperCase() + b.type.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                title='Select'
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
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">You can add them above or skip this step.</p>
        </div>
      )}
    </div>
  );
}

function DocumentsStep({
  uploads,
  onChange,
}: {
  uploads: Record<string, File | null>;
  onChange: (uploads: Record<string, File | null>) => void;
}) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = (key: string, file: File | null) => {
    onChange({ ...uploads, [key]: file });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
        Upload required documents for the 201 file. Required items must be submitted before the employee&apos;s first day.
        Files are accepted in PDF, JPG, or PNG format (max 10MB each).
      </div>

      <div className="flex flex-col gap-2">
        {DOC_TYPES.map((doc) => {
          const file = uploads[doc.key];
          return (
            <div
              key={doc.key}
              className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${file ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {file ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{doc.label}</p>
                    {doc.required ? (
                      <span className="shrink-0 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-1.5 py-0.5 rounded-full">Required</span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">Optional</span>
                    )}
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
                  <button
                    title='Select'
                    type="button"
                    onClick={() => handleFile(doc.key, null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <input
                  title='Select File'
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  ref={(el) => { fileRefs.current[doc.key] = el; }}
                  onChange={(e) => handleFile(doc.key, e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRefs.current[doc.key]?.click()}
                  className="text-xs h-7 px-2.5"
                >
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

export default function NewEmployeePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [allData, setAllData] = useState<AllFormData>({});
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [uploads, setUploads] = useState<Record<string, File | null>>({});
  const [finalSubmitting, setFinalSubmitting] = useState(false);

  const schemas = [personalSchema, contactSchema, employmentSchema, govidsSchema, bankSchema];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: step < 5 ? zodResolver(schemas[step]) : undefined,
    defaultValues: allData,
  });

  const handleStepSubmit = async (data: object) => {
    const merged = { ...allData, ...data };
    setAllData(merged);
    setStep((s) => s + 1);
  };

  const handleCustomNext = () => {
    if (step === 6) {
      handleFinalSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleFinalSubmit = async () => {
    setFinalSubmitting(true);
    try {
      await addEmployee({
        firstName: allData.firstName!,
        lastName: allData.lastName!,
        middleName: allData.middleName,
        birthday: allData.birthday!,
        gender: allData.gender! as 'Male' | 'Female',
        civilStatus: allData.civilStatus!,
        nationality: allData.nationality!,
        personalEmail: allData.personalEmail!,
        companyEmail: allData.companyEmail!,
        mobile: allData.mobile!,
        landline: allData.landline,
        street: allData.street!,
        city: allData.city!,
        province: allData.province!,
        zip: allData.zip!,
        emergencyName: allData.emergencyName!,
        emergencyRelationship: allData.emergencyRelationship!,
        emergencyPhone: allData.emergencyPhone!,
        position: allData.position!,
        department: allData.department!,
        type: allData.type!,
        hireDate: allData.hireDate!,
        salary: allData.salary!,
        sss: allData.sss,
        philhealth: allData.philhealth,
        pagibig: allData.pagibig,
        tin: allData.tin,
        bankName: allData.bankName,
        accountNumber: allData.accountNumber,
        accountName: allData.accountName,
        accountType: allData.accountType,
        beneficiaries,
      });

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added successfully!');
      navigate('/employees');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setFinalSubmitting(false);
    }
  };

  const personalFields: FormField[] = [
    { name: 'firstName',   label: 'First Name',   placeholder: 'Juan',        required: true },
    { name: 'lastName',    label: 'Last Name',    placeholder: 'Dela Cruz',   required: true },
    { name: 'middleName',  label: 'Middle Name',  placeholder: 'Santos' },
    { name: 'birthday',    label: 'Birthday',     type: 'date',               required: true },
    { name: 'gender',      label: 'Gender',       options: ['Male', 'Female'], required: true },
    { name: 'civilStatus', label: 'Civil Status', options: CIVIL_STATUSES,    required: true },
    { name: 'nationality', label: 'Nationality',  placeholder: 'Filipino',    required: true, half: false },
  ];

  const contactFields: FormField[] = [
    { name: 'companyEmail',          label: 'Company Email',         type: 'email', placeholder: 'j.delacruz@company.ph', required: true },
    { name: 'personalEmail',         label: 'Personal Email',        type: 'email', placeholder: 'juan@gmail.com',        required: true },
    { name: 'mobile',                label: 'Mobile',                placeholder: '09171234567',                          required: true },
    { name: 'landline',              label: 'Landline',              placeholder: '02-8123-4567' },
    { name: 'street',                label: 'Street Address',        placeholder: '123 Rizal Street, Brgy. Poblacion',    required: true, half: false },
    { name: 'city',                  label: 'City',                  placeholder: 'Makati City',                          required: true },
    { name: 'province',              label: 'Province',              placeholder: 'Metro Manila',                         required: true },
    { name: 'zip',                   label: 'ZIP Code',              placeholder: '1210',                                 required: true },
    { name: 'emergencyName',         label: 'Emergency Contact Name',placeholder: 'Pedro Dela Cruz',                      required: true },
    { name: 'emergencyRelationship', label: 'Relationship',          placeholder: 'Father',                               required: true },
    { name: 'emergencyPhone',        label: 'Emergency Phone',       placeholder: '09179876543',                          required: true },
  ];

  const employmentFields: FormField[] = [
    { name: 'position',   label: 'Position / Job Title',     placeholder: 'Software Engineer', required: true, half: false },
    { name: 'department', label: 'Department',               options: DEPARTMENTS,             required: true },
    { name: 'type',       label: 'Employment Type',          options: EMPLOYMENT_TYPES,        required: true },
    { name: 'hireDate',   label: 'Hire Date',                type: 'date',                    required: true },
    { name: 'salary',     label: 'Monthly Basic Salary (₱)', type: 'number', placeholder: '50000', required: true },
  ];

  const govidsFields: FormField[] = [
    { name: 'sss',        label: 'SSS Number',       placeholder: '34-1234567-8' },
    { name: 'philhealth', label: 'PhilHealth Number',placeholder: '12-345678901-2' },
    { name: 'pagibig',    label: 'Pag-IBIG Number',  placeholder: '1234-5678-9012' },
    { name: 'tin',        label: 'TIN',              placeholder: '123-456-789-001' },
  ];

  const bankFields: FormField[] = [
    { name: 'bankName',      label: 'Bank Name',                    placeholder: 'BDO Unibank' },
    { name: 'accountType',   label: 'Account Type',                 options: ['Savings', 'Checking'] },
    { name: 'accountNumber', label: 'Account Number',               placeholder: '001234567890', half: false },
    { name: 'accountName',   label: 'Account Name (as in bank)',    placeholder: 'Juan Santos Dela Cruz', half: false },
  ];

  const stepFields = [personalFields, contactFields, employmentFields, govidsFields, bankFields];
  const isCustomStep = step >= 5;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Add New Employee</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Complete all steps to register a new employee.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#0038a8] text-white'
                    : done
                    ? 'bg-[#0038a8]/15 text-[#0038a8] dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-5 h-px ${done ? 'bg-[#0038a8]/40' : 'bg-gray-200 dark:bg-gray-700'}`} />
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
            {/* Steps 0-4: react-hook-form */}
            {!isCustomStep && (
              <form onSubmit={handleSubmit(handleStepSubmit)}>
                <FieldGroup fields={stepFields[step]} register={register} errors={errors} />

                {step === 4 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Bank details are optional but required for payroll processing. You can add these later.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => step > 0 ? setStep((s) => s - 1) : navigate('/employees')}
                    className="flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {step > 0 ? 'Back' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 bg-[#0038a8] hover:bg-[#002d8a] text-white"
                  >
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
                  <Button type="button" onClick={handleCustomNext} className="flex items-center gap-1.5 bg-[#0038a8] hover:bg-[#002d8a] text-white">
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
                    className="flex items-center gap-1.5 bg-[#0038a8] hover:bg-[#002d8a] text-white"
                  >
                    {finalSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <><Check className="w-4 h-4" /> Add Employee</>
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