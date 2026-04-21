// Pag-IBIG (HDMF) Contribution Calculator
// Circular 274: 2% employee share, 2% employer share
// Maximum Monthly Compensation (MMC): PHP 5,000
// Maximum monthly contribution: PHP 100 (employee) + PHP 100 (employer)

export interface PagibigContribution {
  monthlyBasicSalary: number;
  employeeShare: number;
  employerShare: number;
  totalContribution: number;
}

const PAGIBIG_RATE_LOW = 0.01; // 1% for salary <= 1,500
const PAGIBIG_RATE_HIGH = 0.02; // 2% for salary > 1,500
const PAGIBIG_MAX_SALARY = 5000; // Maximum monthly compensation for computation
const PAGIBIG_EMPLOYER_RATE = 0.02;

export function computePagibigContribution(monthlySalary: number): PagibigContribution {
  const computationBase = Math.min(monthlySalary, PAGIBIG_MAX_SALARY);

  const employeeRate = monthlySalary <= 1500 ? PAGIBIG_RATE_LOW : PAGIBIG_RATE_HIGH;
  const employeeShare = computationBase * employeeRate;
  const employerShare = computationBase * PAGIBIG_EMPLOYER_RATE;

  return {
    monthlyBasicSalary: monthlySalary,
    employeeShare: Math.round(employeeShare * 100) / 100,
    employerShare: Math.round(employerShare * 100) / 100,
    totalContribution: Math.round((employeeShare + employerShare) * 100) / 100,
  };
}

export function getPagibigEmployeeShare(monthlySalary: number): number {
  return computePagibigContribution(monthlySalary).employeeShare;
}
