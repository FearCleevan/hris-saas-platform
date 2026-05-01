import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Lock,
  Camera,
  Star,
  Phone,
  MapPin,
  Pencil,
  X,
  Check,
  Plus,
  Building2,
  Banknote,
  Shield,
  AlertCircle,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import profileData from '@/data/mock/profile.json';

interface Address {
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip: string;
}

interface Personal {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string | null;
  gender: string;
  civilStatus: string;
  birthday: string;
  birthPlace: string;
  nationality: string;
  religion: string;
  bloodType: string;
  address: Address;
}

interface Contact {
  companyEmail: string;
  personalEmail: string;
  mobile: string;
  landline: string | null;
}

interface Employment {
  employeeId: string;
  position: string;
  department: string;
  type: string;
  hireDate: string;
  regularizationDate: string;
  branch: string;
  supervisor: string;
  workSchedule: string;
  salary: number;
}

interface GovernmentIds {
  sss: string;
  philhealth: string;
  pagibig: string;
  tin: string;
}

interface Bank {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  mobile: string;
  address: string;
}

interface Dependent {
  id: string;
  name: string;
  relationship: string;
  birthday: string;
  beneficiary: boolean;
  percentage: number;
}

const profile = profileData as {
  employeeId: string;
  personal: Personal;
  contact: Contact;
  employment: Employment;
  governmentIds: GovernmentIds;
  bank: Bank;
  emergencyContacts: EmergencyContact[];
  dependents: Dependent[];
};

const cardClass =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function calcAge(birthday: string): number {
  const b = new Date(birthday + 'T00:00:00');
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function calcTenure(hireDate: string): string {
  const h = new Date(hireDate + 'T00:00:00');
  const now = new Date();
  let years = now.getFullYear() - h.getFullYear();
  let months = now.getMonth() - h.getMonth();
  if (months < 0) { years--; months += 12; }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  return parts.join(' ') || 'Less than a month';
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface InfoRowProps {
  label: string;
  value: string | null | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value ?? '—'}</p>
    </div>
  );
}

function SectionHeader({
  title,
  editMode,
  onEdit,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  editMode: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
      {!editMode ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
        >
          <Pencil size={13} />
          Edit
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={13} />
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-medium bg-brand-blue text-white px-3 py-1.5 rounded-lg hover:bg-brand-blue-dark transition-colors disabled:opacity-60"
          >
            <Check size={13} />
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function EditInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow"
    />
  );
}

function EditSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

interface EditRowProps {
  label: string;
  editMode: boolean;
  displayValue: string | null | undefined;
  children: React.ReactNode;
}

function EditRow({ label, editMode, displayValue, children }: EditRowProps) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      {editMode ? children : (
        <p className="text-sm font-medium text-gray-900 dark:text-white">{displayValue ?? '—'}</p>
      )}
    </div>
  );
}

function ProfileHeader() {
  const { personal, employment } = profile;
  const fullName = [personal.firstName, personal.middleName, personal.lastName]
    .filter(Boolean)
    .join(' ');
  const tenure = calcTenure(employment.hireDate);

  function handlePhotoClick() {
    toast.success('Profile photo updated');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${cardClass} flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-4`}
    >
      <div className="relative shrink-0">
        <div className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center">
          <span className="text-white text-2xl font-extrabold tracking-tight">
            {getInitials(fullName)}
          </span>
        </div>
        <button
          type="button"
          onClick={handlePhotoClick}
          title="Edit profile photo"
          className="absolute bottom-0 right-0 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <Camera size={13} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{fullName}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {employment.position} · {employment.department}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
            {employment.employeeId}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-950 text-xs font-semibold text-green-700 dark:text-green-300">
            Regular Employee
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-brand-blue-light dark:bg-blue-950 text-xs font-semibold text-brand-blue dark:text-blue-300">
            {tenure}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function TabOverview() {
  const { personal, contact, employment } = profile;

  const [personalEdit, setPersonalEdit] = useState(false);
  const [civilStatus, setCivilStatus] = useState(personal.civilStatus);
  const [religion, setReligion] = useState(personal.religion);

  const [addressEdit, setAddressEdit] = useState(false);
  const [street, setStreet] = useState(personal.address.street);
  const [barangay, setBarangay] = useState(personal.address.barangay);
  const [city, setCity] = useState(personal.address.city);
  const [province, setProvince] = useState(personal.address.province);
  const [zip, setZip] = useState(personal.address.zip);

  const [contactEdit, setContactEdit] = useState(false);
  const [personalEmail, setPersonalEmail] = useState(contact.personalEmail);
  const [mobile, setMobile] = useState(contact.mobile);
  const [landline, setLandline] = useState(contact.landline ?? '');

  function savePersonal() {
    setPersonalEdit(false);
    toast.success('Personal info updated');
  }

  function saveAddress() {
    setAddressEdit(false);
    toast.success('Address updated');
  }

  function saveContact() {
    setContactEdit(false);
    toast.success('Contact details updated');
  }

  const employmentTypeLabel = capitalizeFirst(employment.type);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cardClass}
        >
          <SectionHeader
            title="Personal Information"
            editMode={personalEdit}
            onEdit={() => setPersonalEdit(true)}
            onSave={savePersonal}
            onCancel={() => setPersonalEdit(false)}
          />
          <InfoRow label="Gender" value={personal.gender} />
          <EditRow label="Civil Status" editMode={personalEdit} displayValue={civilStatus}>
            <EditSelect
              value={civilStatus}
              onChange={setCivilStatus}
              options={['Single', 'Married', 'Widowed', 'Separated', 'Annulled']}
            />
          </EditRow>
          <InfoRow
            label="Birthday"
            value={`${formatDate(personal.birthday)} (Age: ${calcAge(personal.birthday)})`}
          />
          <InfoRow label="Birth Place" value={personal.birthPlace} />
          <InfoRow label="Nationality" value={personal.nationality} />
          <EditRow label="Religion" editMode={personalEdit} displayValue={religion}>
            <EditInput value={religion} onChange={setReligion} placeholder="Religion" />
          </EditRow>
          <InfoRow label="Blood Type" value={personal.bloodType} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className={cardClass}
        >
          <SectionHeader
            title="Address"
            editMode={addressEdit}
            onEdit={() => setAddressEdit(true)}
            onSave={saveAddress}
            onCancel={() => setAddressEdit(false)}
          />
          <EditRow label="Street" editMode={addressEdit} displayValue={street}>
            <EditInput value={street} onChange={setStreet} placeholder="Street" />
          </EditRow>
          <EditRow label="Barangay" editMode={addressEdit} displayValue={barangay}>
            <EditInput value={barangay} onChange={setBarangay} placeholder="Barangay" />
          </EditRow>
          <EditRow label="City" editMode={addressEdit} displayValue={city}>
            <EditInput value={city} onChange={setCity} placeholder="City" />
          </EditRow>
          <EditRow label="Province" editMode={addressEdit} displayValue={province}>
            <EditInput value={province} onChange={setProvince} placeholder="Province" />
          </EditRow>
          <EditRow label="ZIP Code" editMode={addressEdit} displayValue={zip}>
            <EditInput value={zip} onChange={setZip} placeholder="ZIP Code" />
          </EditRow>
        </motion.div>
      </div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className={cardClass}
        >
          <SectionHeader
            title="Contact Details"
            editMode={contactEdit}
            onEdit={() => setContactEdit(true)}
            onSave={saveContact}
            onCancel={() => setContactEdit(false)}
          />
          <div className="py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Company Email</p>
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-gray-400 shrink-0" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{contact.companyEmail}</p>
            </div>
          </div>
          <EditRow label="Personal Email" editMode={contactEdit} displayValue={personalEmail}>
            <input
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow"
            />
          </EditRow>
          <EditRow label="Mobile" editMode={contactEdit} displayValue={mobile}>
            <EditInput value={mobile} onChange={setMobile} placeholder="+63 9XX XXX XXXX" />
          </EditRow>
          <EditRow label="Landline" editMode={contactEdit} displayValue={landline || null}>
            <EditInput value={landline} onChange={setLandline} placeholder="Optional" />
          </EditRow>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className={cardClass}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Employment Details</h3>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Lock size={12} />
              View only
            </span>
          </div>
          <InfoRow label="Employee ID" value={employment.employeeId} />
          <InfoRow label="Position" value={employment.position} />
          <InfoRow label="Department" value={employment.department} />
          <InfoRow label="Employment Type" value={employmentTypeLabel} />
          <InfoRow label="Hire Date" value={formatDate(employment.hireDate)} />
          <InfoRow label="Regularization Date" value={formatDate(employment.regularizationDate)} />
          <InfoRow label="Branch" value={employment.branch} />
          <InfoRow label="Supervisor" value={employment.supervisor} />
          <InfoRow label="Work Schedule" value={employment.workSchedule} />
        </motion.div>
      </div>
    </div>
  );
}

function TabGovernmentIds() {
  const { governmentIds } = profile;

  const ids = [
    {
      key: 'sss',
      label: 'Social Security System',
      short: 'SSS',
      value: governmentIds.sss,
      accent: 'border-brand-blue',
      iconBg: 'bg-blue-100 dark:bg-blue-950',
      iconText: 'text-brand-blue',
    },
    {
      key: 'philhealth',
      label: 'Philippine Health Insurance',
      short: 'PhilHealth',
      value: governmentIds.philhealth,
      accent: 'border-green-500',
      iconBg: 'bg-green-100 dark:bg-green-950',
      iconText: 'text-green-600',
    },
    {
      key: 'pagibig',
      label: 'Pag-IBIG Fund',
      short: 'Pag-IBIG',
      value: governmentIds.pagibig,
      accent: 'border-orange-500',
      iconBg: 'bg-orange-100 dark:bg-orange-950',
      iconText: 'text-orange-600',
    },
    {
      key: 'tin',
      label: 'Bureau of Internal Revenue',
      short: 'TIN',
      value: governmentIds.tin,
      accent: 'border-purple-500',
      iconBg: 'bg-purple-100 dark:bg-purple-950',
      iconText: 'text-purple-600',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
        <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Government ID numbers are managed by HR. Contact{' '}
          <a href="mailto:hr@hris-demo.ph" className="font-semibold underline">
            hr@hris-demo.ph
          </a>{' '}
          to update.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ids.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-l-4 ${item.accent} rounded-2xl p-5`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <Shield size={18} className={item.iconText} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{item.short}</p>
                </div>
              </div>
              <Lock size={14} className="text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
            </div>
            <p className="mt-3 text-base font-mono font-semibold text-gray-900 dark:text-white tracking-wider">
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function TabBankAccount() {
  const { bank } = profile;

  function handleRequestUpdate() {
    toast.success('Bank update request submitted. HR will verify within 3-5 business days.');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg"
    >
      <div className={cardClass}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <span className="text-brand-blue font-extrabold text-xl">
              {bank.bankName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{bank.bankName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{bank.accountType} Account</p>
          </div>
        </div>

        <InfoRow label="Account Name" value={bank.accountName} />
        <div className="py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Account Number</p>
          <div className="flex items-center gap-2">
            <Banknote size={14} className="text-gray-400 shrink-0" />
            <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white tracking-widest">
              {bank.accountNumber}
            </p>
          </div>
        </div>
        <InfoRow label="Account Type" value={bank.accountType} />

        <div className="mt-5 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <Lock size={14} className="text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Account numbers are partially masked for security
          </p>
        </div>

        <button
          type="button"
          onClick={handleRequestUpdate}
          className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm bg-brand-blue text-white hover:bg-brand-blue-dark transition-colors"
        >
          Request Update
        </button>
      </div>
    </motion.div>
  );
}

interface EmergencyContactFormState {
  name: string;
  relationship: string;
  mobile: string;
  address: string;
}

const RELATIONSHIP_OPTIONS = ['Spouse', 'Father', 'Mother', 'Sibling', 'Child', 'Other'];

function EmergencyContactCard({
  contact: ec,
  index,
}: {
  contact: EmergencyContact;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EmergencyContactFormState>({
    name: ec.name,
    relationship: ec.relationship,
    mobile: ec.mobile,
    address: ec.address,
  });

  function handleSave() {
    setEditing(false);
    toast.success('Emergency contact updated');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className={cardClass}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue-light dark:bg-blue-950 flex items-center justify-center shrink-0">
            <span className="text-brand-blue font-bold text-sm">{getInitials(form.name)}</span>
          </div>
          <div>
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-blue w-full"
              />
            ) : (
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{form.name}</p>
            )}
            {editing ? (
              <select
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                className="mt-1 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-brand-blue font-medium">
                {form.relationship}
              </span>
            )}
          </div>
        </div>

        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-brand-blue-dark transition-colors shrink-0"
          >
            <Pencil size={12} />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs font-semibold bg-brand-blue text-white px-2.5 py-1 rounded-lg hover:bg-brand-blue-dark transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Phone size={13} className="text-gray-400 shrink-0" />
          {editing ? (
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-blue flex-1"
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">{form.mobile}</p>
          )}
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
          {editing ? (
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-blue flex-1"
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">{form.address}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TabEmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(profile.emergencyContacts);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState<EmergencyContactFormState>({
    name: '',
    relationship: 'Spouse',
    mobile: '',
    address: '',
  });

  function handleAdd() {
    if (!newForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const newContact: EmergencyContact = {
      id: `ec${Date.now()}`,
      name: newForm.name,
      relationship: newForm.relationship,
      mobile: newForm.mobile,
      address: newForm.address,
    };
    setContacts((prev) => [...prev, newContact]);
    setNewForm({ name: '', relationship: 'Spouse', mobile: '', address: '' });
    setAddOpen(false);
    toast.success('Emergency contact added');
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contacts.map((ec, i) => (
          <EmergencyContactCard key={ec.id} contact={ec} index={i} />
        ))}
      </div>

      {addOpen ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cardClass}
        >
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">New Emergency Contact</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Name</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Relationship</label>
              <select
                value={newForm.relationship}
                onChange={(e) => setNewForm((f) => ({ ...f, relationship: e.target.value }))}
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Mobile</label>
              <input
                type="text"
                value={newForm.mobile}
                onChange={(e) => setNewForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="+63 9XX XXX XXXX"
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">Address</label>
              <input
                type="text"
                value={newForm.address}
                onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="text-sm font-semibold bg-brand-blue text-white px-4 py-2 rounded-xl hover:bg-brand-blue-dark transition-colors"
            >
              Add Contact
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors py-2"
        >
          <Plus size={16} />
          Add Contact
        </button>
      )}
    </div>
  );
}

function TabDependents() {
  const { dependents } = profile;

  function handleRequestUpdate() {
    toast.success('Dependent update request submitted.');
  }

  const totalPct = dependents
    .filter((d) => d.beneficiary)
    .reduce((sum, d) => sum + d.percentage, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Dependents & Beneficiaries</h3>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Lock size={12} />
            View only
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Name</th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Relationship</th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Birthday</th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Beneficiary</th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-2">Benefit %</th>
              </tr>
            </thead>
            <tbody>
              {dependents.map((dep, i) => (
                <motion.tr
                  key={dep.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="border-b border-gray-50 dark:border-gray-800 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-blue-light dark:bg-blue-950 flex items-center justify-center shrink-0">
                        <span className="text-brand-blue text-[10px] font-bold">{getInitials(dep.name)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{dep.name}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{dep.relationship}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(dep.birthday)}{' '}
                      <span className="text-gray-400">(Age {calcAge(dep.birthday)})</span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {dep.beneficiary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                        <Star size={10} className="fill-current" />
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td className="py-3">
                    {dep.beneficiary ? (
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dep.percentage}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total beneficiary allocation</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">Total: {totalPct}%</span>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
        <Building2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            To update dependents, please submit a request to HR.
          </p>
          <button
            type="button"
            onClick={handleRequestUpdate}
            className="mt-2 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark underline transition-colors"
          >
            Request Update
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MyProfilePage() {
  return (
    <div>
      <ProfileHeader />

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex-nowrap min-w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="gov-ids">Government IDs</TabsTrigger>
            <TabsTrigger value="bank">Bank Account</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Contacts</TabsTrigger>
            <TabsTrigger value="dependents">Dependents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <TabOverview />
        </TabsContent>

        <TabsContent value="gov-ids">
          <TabGovernmentIds />
        </TabsContent>

        <TabsContent value="bank">
          <TabBankAccount />
        </TabsContent>

        <TabsContent value="emergency">
          <TabEmergencyContacts />
        </TabsContent>

        <TabsContent value="dependents">
          <TabDependents />
        </TabsContent>
      </Tabs>
    </div>
  );
}
