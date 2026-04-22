import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Building2,
  CreditCard, Shield, Banknote, Edit, AlertCircle,
  PhoneCall, User, BadgeCheck, Clock,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { Chip } from '@mui/material';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import employeesData from '@/data/mock/employees.json';
import employeeDetailsData from '@/data/mock/employee-details.json';

type Employee = typeof employeesData[number];
type EmployeeDetail = typeof employeeDetailsData[number];

const statusConfig = {
  active: { label: 'Active', color: 'success' as const },
  on_leave: { label: 'On Leave', color: 'warning' as const },
  terminated: { label: 'Terminated', color: 'error' as const },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
          {value || <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ComingSoonTab({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#0038a8]/10 flex items-center justify-center mb-4">
        <Clock className="w-6 h-6 text-[#0038a8]" />
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{feature}</p>
      <p className="text-xs text-gray-400 mt-1">This section is coming soon.</p>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const employee = useMemo(
    () => employeesData.find((e) => e.id === id) as Employee | undefined,
    [id]
  );

  const details = useMemo(
    () => employeeDetailsData.find((d) => d.id === id) as EmployeeDetail | undefined,
    [id]
  );

  const supervisor = useMemo(
    () => details?.supervisor ? employeesData.find((e) => e.id === details.supervisor) : null,
    [details]
  );

  if (!employee) {
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

  const tenure = differenceInYears(new Date(), new Date(employee.hireDate));
  const statusCfg = statusConfig[employee.status as keyof typeof statusConfig];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Back nav */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      {/* Profile header card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#0038a8] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {getInitials(employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{employee.name}</h1>
              <Chip
                label={statusCfg?.label ?? employee.status}
                color={statusCfg?.color ?? 'default'}
                size="small"
                sx={{ fontSize: 11, fontWeight: 600 }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.position}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{employee.department}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Hired {format(new Date(employee.hireDate), 'MMM d, yyyy')}</span>
              <span className="flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" />{tenure} yr{tenure !== 1 ? 's' : ''} tenure</span>
              <span className="flex items-center gap-1">
                <span className="capitalize bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                  {employee.type}
                </span>
              </span>
            </div>
            {details && (
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                {details.companyEmail && (
                  <a href={`mailto:${details.companyEmail}`} className="flex items-center gap-1 hover:text-[#0038a8] transition-colors">
                    <Mail className="w-3.5 h-3.5" />{details.companyEmail}
                  </a>
                )}
                {details.mobile && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{details.mobile}</span>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/employees/${id}/edit`)}
            className="flex items-center gap-1.5 shrink-0"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="govids">Gov&apos;t IDs &amp; Bank</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left col */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <SectionCard title="Contact Information">
                <InfoRow label="Company Email" value={details?.companyEmail} icon={Mail} />
                <InfoRow label="Personal Email" value={details?.personalEmail} icon={Mail} />
                <InfoRow label="Mobile" value={details?.mobile} icon={Phone} />
                <InfoRow label="Landline" value={details?.landline || undefined} icon={PhoneCall} />
                {details?.address && (
                  <InfoRow
                    label="Address"
                    value={`${details.address.street}, ${details.address.city}, ${details.address.province} ${details.address.zip}`}
                    icon={MapPin}
                  />
                )}
              </SectionCard>

              {details?.emergencyContact && (
                <SectionCard title="Emergency Contact">
                  <InfoRow label="Name" value={details.emergencyContact.name} icon={User} />
                  <InfoRow label="Relationship" value={details.emergencyContact.relationship} />
                  <InfoRow label="Phone" value={details.emergencyContact.phone} icon={Phone} />
                </SectionCard>
              )}

              {details?.notes && (
                <SectionCard title="Notes">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{details.notes}</p>
                </SectionCard>
              )}
            </div>

            {/* Right col */}
            <div className="flex flex-col gap-4">
              <SectionCard title="Employment Summary">
                <InfoRow label="Position" value={employee.position} />
                <InfoRow label="Department" value={employee.department} />
                <InfoRow label="Employment Type" value={employee.type.charAt(0).toUpperCase() + employee.type.slice(1)} />
                <InfoRow label="Hire Date" value={format(new Date(employee.hireDate), 'MMMM d, yyyy')} />
                {details?.regularizationDate && (
                  <InfoRow label="Regularization Date" value={format(new Date(details.regularizationDate), 'MMMM d, yyyy')} />
                )}
              </SectionCard>

              {supervisor && (
                <SectionCard title="Direct Supervisor">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/employees/${supervisor.id}`)}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {getInitials(supervisor.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{supervisor.name}</p>
                      <p className="text-xs text-gray-400">{supervisor.position}</p>
                    </div>
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Compensation">
                <InfoRow label="Monthly Salary" value={`₱${employee.salary.toLocaleString()}`} icon={Banknote} />
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Personal Information">
              <InfoRow label="Full Name" value={employee.name} icon={User} />
              <InfoRow label="Birthday" value={employee.birthday ? format(new Date(employee.birthday), 'MMMM d, yyyy') : undefined} icon={Calendar} />
              <InfoRow label="Gender" value={details?.gender} />
              <InfoRow label="Civil Status" value={details?.civilStatus} />
              <InfoRow label="Nationality" value={details?.nationality} />
            </SectionCard>

            <SectionCard title="Address">
              {details?.address ? (
                <>
                  <InfoRow label="Street" value={details.address.street} icon={MapPin} />
                  <InfoRow label="City" value={details.address.city} />
                  <InfoRow label="Province" value={details.address.province} />
                  <InfoRow label="ZIP Code" value={details.address.zip} />
                </>
              ) : (
                <p className="text-sm text-gray-400 py-4">No address on file.</p>
              )}
            </SectionCard>

            <SectionCard title="Contact">
              <InfoRow label="Personal Email" value={details?.personalEmail} icon={Mail} />
              <InfoRow label="Mobile" value={details?.mobile} icon={Phone} />
              <InfoRow label="Landline" value={details?.landline || undefined} icon={PhoneCall} />
            </SectionCard>

            {details?.emergencyContact && (
              <SectionCard title="Emergency Contact">
                <InfoRow label="Name" value={details.emergencyContact.name} icon={User} />
                <InfoRow label="Relationship" value={details.emergencyContact.relationship} />
                <InfoRow label="Phone" value={details.emergencyContact.phone} icon={Phone} />
              </SectionCard>
            )}
          </div>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Job Details">
              <InfoRow label="Employee ID" value={employee.id} />
              <InfoRow label="Position" value={employee.position} />
              <InfoRow label="Department" value={employee.department} icon={Building2} />
              <InfoRow label="Employment Type" value={employee.type.charAt(0).toUpperCase() + employee.type.slice(1)} />
              <InfoRow label="Status" value={statusCfg?.label} />
            </SectionCard>

            <SectionCard title="Dates">
              <InfoRow label="Hire Date" value={format(new Date(employee.hireDate), 'MMMM d, yyyy')} icon={Calendar} />
              {details?.regularizationDate && (
                <InfoRow label="Regularization Date" value={format(new Date(details.regularizationDate), 'MMMM d, yyyy')} icon={Calendar} />
              )}
              <InfoRow label="Tenure" value={`${tenure} year${tenure !== 1 ? 's' : ''}`} />
            </SectionCard>

            <SectionCard title="Compensation">
              <InfoRow label="Monthly Basic Salary" value={`₱${employee.salary.toLocaleString()}`} icon={Banknote} />
              <InfoRow label="Annual Salary" value={`₱${(employee.salary * 12).toLocaleString()}`} />
            </SectionCard>

            {supervisor && (
              <SectionCard title="Reporting To">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/employees/${supervisor.id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {getInitials(supervisor.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{supervisor.name}</p>
                    <p className="text-xs text-gray-400">{supervisor.position} · {supervisor.department}</p>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </TabsContent>

        {/* Gov't IDs & Bank Tab */}
        <TabsContent value="govids">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Government IDs">
              <InfoRow label="SSS Number" value={details?.sss} icon={Shield} />
              <InfoRow label="PhilHealth Number" value={details?.philhealth} icon={Shield} />
              <InfoRow label="Pag-IBIG Number" value={details?.pagibig} icon={Shield} />
              <InfoRow label="TIN" value={details?.tin} icon={CreditCard} />
            </SectionCard>

            {details?.bank && (
              <SectionCard title="Bank Account">
                <InfoRow label="Bank" value={details.bank.name} icon={Banknote} />
                <InfoRow label="Account Number" value={details.bank.accountNumber} icon={CreditCard} />
                <InfoRow label="Account Name" value={details.bank.accountName} />
                <InfoRow label="Account Type" value={details.bank.type} />
              </SectionCard>
            )}

            {!details && (
              <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-400">No government ID records on file.</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Add these details when editing this employee profile.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <ComingSoonTab feature="201 File & Documents" />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <ComingSoonTab feature="Performance Reviews" />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
