import type { UUID, ISODateString } from './common';

export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type EmploymentType = 'regular' | 'probationary' | 'contractual' | 'part_time';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated';

export interface Employee {
  id: UUID;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string;
  phone?: string;
  dateOfBirth: ISODateString;
  civilStatus: CivilStatus;
  gender: 'male' | 'female' | 'other';
  address: EmployeeAddress;
  employmentDetails: EmploymentDetails;
  governmentIds: GovernmentIds;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EmployeeAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  region: string;
}

export interface EmploymentDetails {
  departmentId: UUID;
  positionId: UUID;
  status: EmploymentStatus;
  type: EmploymentType;
  dateHired: ISODateString;
  dateRegularized?: ISODateString;
  dateTerminated?: ISODateString;
  basicSalary: number;
  payFrequency: 'semi_monthly' | 'monthly' | 'weekly';
}

export interface GovernmentIds {
  sssNumber?: string;
  philhealthNumber?: string;
  pagibigNumber?: string;
  tinNumber?: string;
}
