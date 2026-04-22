import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, User, Phone, Briefcase, Shield, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STEPS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'govids', label: "Gov't IDs", icon: Shield },
  { id: 'bank', label: 'Bank', icon: Banknote },
];

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'IT', 'Admin'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'];
const EMPLOYMENT_TYPES = ['regular', 'probationary', 'contractual'];

// Step schemas
const personalSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required' }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, { error: 'Last name is required' }),
  birthday: z.string().min(1, { error: 'Birthday is required' }),
  gender: z.enum(['Male', 'Female'], { error: 'Select gender' }),
  civilStatus: z.string().min(1, { error: 'Civil status is required' }),
  nationality: z.string().min(1, { error: 'Nationality is required' }),
});

const contactSchema = z.object({
  personalEmail: z.email({ error: 'Valid email required' }),
  companyEmail: z.email({ error: 'Valid email required' }),
  mobile: z.string().min(11, { error: 'Valid mobile number required' }),
  landline: z.string().optional(),
  street: z.string().min(1, { error: 'Street is required' }),
  city: z.string().min(1, { error: 'City is required' }),
  province: z.string().min(1, { error: 'Province is required' }),
  zip: z.string().min(4, { error: 'ZIP code required' }),
  emergencyName: z.string().min(1, { error: 'Emergency contact name required' }),
  emergencyRelationship: z.string().min(1, { error: 'Relationship required' }),
  emergencyPhone: z.string().min(11, { error: 'Valid phone required' }),
});

const employmentSchema = z.object({
  position: z.string().min(1, { error: 'Position is required' }),
  department: z.string().min(1, { error: 'Department is required' }),
  type: z.string().min(1, { error: 'Employment type is required' }),
  hireDate: z.string().min(1, { error: 'Hire date is required' }),
  salary: z.string().min(1, { error: 'Salary is required' }),
});

const govidsSchema = z.object({
  sss: z.string().optional(),
  philhealth: z.string().optional(),
  pagibig: z.string().optional(),
  tin: z.string().optional(),
});

const bankSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  accountType: z.string().optional(),
});

type PersonalData = z.infer<typeof personalSchema>;
type ContactData = z.infer<typeof contactSchema>;
type EmploymentData = z.infer<typeof employmentSchema>;
type GovidsData = z.infer<typeof govidsSchema>;
type BankData = z.infer<typeof bankSchema>;

interface FormField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  half?: boolean;
}

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

export default function NewEmployeePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [allData, setAllData] = useState<Partial<PersonalData & ContactData & EmploymentData & GovidsData & BankData>>({});

  const schemas = [personalSchema, contactSchema, employmentSchema, govidsSchema, bankSchema];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schemas[step]),
    defaultValues: allData,
  });

  const handleStepSubmit = async (data: object) => {
    const merged = { ...allData, ...data };
    setAllData(merged);

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Final submission
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Employee added successfully!');
      navigate('/employees');
    }
  };

  const personalFields: FormField[] = [
    { name: 'firstName', label: 'First Name', placeholder: 'Juan', required: true },
    { name: 'lastName', label: 'Last Name', placeholder: 'Dela Cruz', required: true },
    { name: 'middleName', label: 'Middle Name', placeholder: 'Santos' },
    { name: 'birthday', label: 'Birthday', type: 'date', required: true },
    { name: 'gender', label: 'Gender', options: ['Male', 'Female'], required: true },
    { name: 'civilStatus', label: 'Civil Status', options: CIVIL_STATUSES, required: true },
    { name: 'nationality', label: 'Nationality', placeholder: 'Filipino', required: true, half: false },
  ];

  const contactFields: FormField[] = [
    { name: 'companyEmail', label: 'Company Email', type: 'email', placeholder: 'j.delacruz@company.ph', required: true },
    { name: 'personalEmail', label: 'Personal Email', type: 'email', placeholder: 'juan@gmail.com', required: true },
    { name: 'mobile', label: 'Mobile', placeholder: '09171234567', required: true },
    { name: 'landline', label: 'Landline', placeholder: '02-8123-4567' },
    { name: 'street', label: 'Street Address', placeholder: '123 Rizal Street, Brgy. Poblacion', required: true, half: false },
    { name: 'city', label: 'City', placeholder: 'Makati City', required: true },
    { name: 'province', label: 'Province', placeholder: 'Metro Manila', required: true },
    { name: 'zip', label: 'ZIP Code', placeholder: '1210', required: true },
    { name: 'emergencyName', label: 'Emergency Contact Name', placeholder: 'Pedro Dela Cruz', required: true },
    { name: 'emergencyRelationship', label: 'Relationship', placeholder: 'Father', required: true },
    { name: 'emergencyPhone', label: 'Emergency Phone', placeholder: '09179876543', required: true },
  ];

  const employmentFields: FormField[] = [
    { name: 'position', label: 'Position / Job Title', placeholder: 'Software Engineer', required: true, half: false },
    { name: 'department', label: 'Department', options: DEPARTMENTS, required: true },
    { name: 'type', label: 'Employment Type', options: EMPLOYMENT_TYPES, required: true },
    { name: 'hireDate', label: 'Hire Date', type: 'date', required: true },
    { name: 'salary', label: 'Monthly Basic Salary (₱)', type: 'number', placeholder: '50000', required: true },
  ];

  const govidsFields: FormField[] = [
    { name: 'sss', label: 'SSS Number', placeholder: '34-1234567-8' },
    { name: 'philhealth', label: 'PhilHealth Number', placeholder: '12-345678901-2' },
    { name: 'pagibig', label: 'Pag-IBIG Number', placeholder: '1234-5678-9012' },
    { name: 'tin', label: 'TIN', placeholder: '123-456-789-001' },
  ];

  const bankFields: FormField[] = [
    { name: 'bankName', label: 'Bank Name', placeholder: 'BDO Unibank' },
    { name: 'accountType', label: 'Account Type', options: ['Savings', 'Checking'] },
    { name: 'accountNumber', label: 'Account Number', placeholder: '001234567890', half: false },
    { name: 'accountName', label: 'Account Name (as in bank)', placeholder: 'Juan Santos Dela Cruz', half: false },
  ];

  const stepFields = [personalFields, contactFields, employmentFields, govidsFields, bankFields];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
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
                <div className={`w-6 h-px ${done ? 'bg-[#0038a8]/40' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-2xl">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-5">
          Step {step + 1}: {STEPS[step].label}
        </h2>

        <AnimatePresence mode="wait">
          <motion.form
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit(handleStepSubmit)}
          >
            <FieldGroup
              fields={stepFields[step]}
              register={register}
              errors={errors}
            />

            {step === STEPS.length - 1 && (
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
                {step < STEPS.length - 1 ? (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                ) : isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <><Check className="w-4 h-4" /> Add Employee</>
                )}
              </Button>
            </div>
          </motion.form>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
