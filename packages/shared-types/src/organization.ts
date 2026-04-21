import type { UUID, ISODateString } from './common';

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
  createdAt: ISODateString;
}

export interface Department {
  id: UUID;
  organizationId: UUID;
  name: string;
  code: string;
  headEmployeeId?: UUID;
  parentDepartmentId?: UUID;
}

export interface Position {
  id: UUID;
  organizationId: UUID;
  departmentId: UUID;
  title: string;
  level: number;
  minSalary?: number;
  maxSalary?: number;
}
