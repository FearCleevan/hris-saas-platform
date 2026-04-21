// SSS 2024 Contribution Table (R.A. 11199 - Social Security Act of 2018)
// Effective January 2024: 14% contribution rate

export interface SSSContribution {
  monthlyBasicSalary: number;
  employeeShare: number;
  employerShare: number;
  totalContribution: number;
  mpf: number; // Mandatory Provident Fund (for salary >= 20,250)
}

interface SSSBracket {
  min: number;
  max: number;
  msc: number; // Monthly Salary Credit
  employeeShare: number;
  employerShare: number;
  mpf: number;
}

// SSS 2024 contribution table brackets
const SSS_BRACKETS: SSSBracket[] = [
  { min: 0, max: 4249.99, msc: 4000, employeeShare: 180, employerShare: 380, mpf: 0 },
  { min: 4250, max: 4749.99, msc: 4500, employeeShare: 202.5, employerShare: 427.5, mpf: 0 },
  { min: 4750, max: 5249.99, msc: 5000, employeeShare: 225, employerShare: 475, mpf: 0 },
  { min: 5250, max: 5749.99, msc: 5500, employeeShare: 247.5, employerShare: 522.5, mpf: 0 },
  { min: 5750, max: 6249.99, msc: 6000, employeeShare: 270, employerShare: 570, mpf: 0 },
  { min: 6250, max: 6749.99, msc: 6500, employeeShare: 292.5, employerShare: 617.5, mpf: 0 },
  { min: 6750, max: 7249.99, msc: 7000, employeeShare: 315, employerShare: 665, mpf: 0 },
  { min: 7250, max: 7749.99, msc: 7500, employeeShare: 337.5, employerShare: 712.5, mpf: 0 },
  { min: 7750, max: 8249.99, msc: 8000, employeeShare: 360, employerShare: 760, mpf: 0 },
  { min: 8250, max: 8749.99, msc: 8500, employeeShare: 382.5, employerShare: 807.5, mpf: 0 },
  { min: 8750, max: 9249.99, msc: 9000, employeeShare: 405, employerShare: 855, mpf: 0 },
  { min: 9250, max: 9749.99, msc: 9500, employeeShare: 427.5, employerShare: 902.5, mpf: 0 },
  { min: 9750, max: 10249.99, msc: 10000, employeeShare: 450, employerShare: 950, mpf: 0 },
  { min: 10250, max: 10749.99, msc: 10500, employeeShare: 472.5, employerShare: 997.5, mpf: 0 },
  { min: 10750, max: 11249.99, msc: 11000, employeeShare: 495, employerShare: 1045, mpf: 0 },
  { min: 11250, max: 11749.99, msc: 11500, employeeShare: 517.5, employerShare: 1092.5, mpf: 0 },
  { min: 11750, max: 12249.99, msc: 12000, employeeShare: 540, employerShare: 1140, mpf: 0 },
  { min: 12250, max: 12749.99, msc: 12500, employeeShare: 562.5, employerShare: 1187.5, mpf: 0 },
  { min: 12750, max: 13249.99, msc: 13000, employeeShare: 585, employerShare: 1235, mpf: 0 },
  { min: 13250, max: 13749.99, msc: 13500, employeeShare: 607.5, employerShare: 1282.5, mpf: 0 },
  { min: 13750, max: 14249.99, msc: 14000, employeeShare: 630, employerShare: 1330, mpf: 0 },
  { min: 14250, max: 14749.99, msc: 14500, employeeShare: 652.5, employerShare: 1377.5, mpf: 0 },
  { min: 14750, max: 15249.99, msc: 15000, employeeShare: 675, employerShare: 1425, mpf: 0 },
  { min: 15250, max: 15749.99, msc: 15500, employeeShare: 697.5, employerShare: 1472.5, mpf: 0 },
  { min: 15750, max: 16249.99, msc: 16000, employeeShare: 720, employerShare: 1520, mpf: 0 },
  { min: 16250, max: 16749.99, msc: 16500, employeeShare: 742.5, employerShare: 1567.5, mpf: 0 },
  { min: 16750, max: 17249.99, msc: 17000, employeeShare: 765, employerShare: 1615, mpf: 0 },
  { min: 17250, max: 17749.99, msc: 17500, employeeShare: 787.5, employerShare: 1662.5, mpf: 0 },
  { min: 17750, max: 18249.99, msc: 18000, employeeShare: 810, employerShare: 1710, mpf: 0 },
  { min: 18250, max: 18749.99, msc: 18500, employeeShare: 832.5, employerShare: 1757.5, mpf: 0 },
  { min: 18750, max: 19249.99, msc: 19000, employeeShare: 855, employerShare: 1805, mpf: 0 },
  { min: 19250, max: 19749.99, msc: 19500, employeeShare: 877.5, employerShare: 1852.5, mpf: 0 },
  { min: 19750, max: 20249.99, msc: 20000, employeeShare: 900, employerShare: 1900, mpf: 0 },
  // MPF applies for salary >= 20,250
  { min: 20250, max: 20749.99, msc: 20000, employeeShare: 900, employerShare: 1900, mpf: 22.5 },
  { min: 20750, max: 29750, msc: 20000, employeeShare: 900, employerShare: 1900, mpf: 0 }, // simplified; actual MPF varies
];

export function computeSSSContribution(monthlySalary: number): SSSContribution {
  const bracket = SSS_BRACKETS.find(
    (b) => monthlySalary >= b.min && monthlySalary <= b.max,
  );

  if (!bracket) {
    // Max bracket: salary > 29,750
    return {
      monthlyBasicSalary: monthlySalary,
      employeeShare: 1350,
      employerShare: 2850,
      totalContribution: 4200,
      mpf: 0,
    };
  }

  return {
    monthlyBasicSalary: monthlySalary,
    employeeShare: bracket.employeeShare,
    employerShare: bracket.employerShare,
    totalContribution: bracket.employeeShare + bracket.employerShare,
    mpf: bracket.mpf,
  };
}

export function getSSSEmployeeShare(monthlySalary: number): number {
  return computeSSSContribution(monthlySalary).employeeShare;
}
