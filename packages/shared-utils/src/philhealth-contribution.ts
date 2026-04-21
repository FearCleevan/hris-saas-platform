// PhilHealth Contribution Calculator
// Circular 2023-0009: Premium Rate = 5% effective 2024
// Minimum Monthly Basic Salary (MBS): PHP 10,000 -> PHP 500/month total
// Maximum MBS: PHP 100,000 -> PHP 5,000/month total
// Employee share = Employer share = 50% of total premium

export interface PhilhealthContribution {
  monthlyBasicSalary: number;
  premiumRate: number;
  totalMonthlyPremium: number;
  employeeShare: number;
  employerShare: number;
}

const PHILHEALTH_RATE = 0.05; // 5% for 2024
const PHILHEALTH_MIN_SALARY = 10000;
const PHILHEALTH_MAX_SALARY = 100000;

export function computePhilhealthContribution(monthlySalary: number): PhilhealthContribution {
  const computationBase = Math.max(
    PHILHEALTH_MIN_SALARY,
    Math.min(monthlySalary, PHILHEALTH_MAX_SALARY),
  );

  const totalPremium = computationBase * PHILHEALTH_RATE;
  const employeeShare = totalPremium / 2;
  const employerShare = totalPremium / 2;

  return {
    monthlyBasicSalary: monthlySalary,
    premiumRate: PHILHEALTH_RATE,
    totalMonthlyPremium: Math.round(totalPremium * 100) / 100,
    employeeShare: Math.round(employeeShare * 100) / 100,
    employerShare: Math.round(employerShare * 100) / 100,
  };
}

export function getPhilhealthEmployeeShare(monthlySalary: number): number {
  return computePhilhealthContribution(monthlySalary).employeeShare;
}
