import type { UUID, ISODateString } from './common';

export interface PayrollPeriod {
  id: UUID;
  startDate: ISODateString;
  endDate: ISODateString;
  payDate: ISODateString;
  status: 'draft' | 'processing' | 'approved' | 'paid';
}

export interface PayslipDeductions {
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  otherDeductions: number;
  totalDeductions: number;
}

export interface PayslipEarnings {
  basicPay: number;
  overtime: number;
  holiday: number;
  allowances: number;
  otherEarnings: number;
  grossPay: number;
}

export interface Payslip {
  id: UUID;
  employeeId: UUID;
  periodId: UUID;
  earnings: PayslipEarnings;
  deductions: PayslipDeductions;
  netPay: number;
  createdAt: ISODateString;
}
