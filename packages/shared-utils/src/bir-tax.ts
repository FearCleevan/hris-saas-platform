// BIR Withholding Tax Calculator - TRAIN Law (R.A. 10963)
// Table for Compensation Income (monthly)
// Effective January 2023 onwards

export interface WithholdingTaxResult {
  monthlyTaxableIncome: number;
  monthlyWithholdingTax: number;
  annualTaxableIncome: number;
  annualTax: number;
  effectiveRate: number;
}

interface TaxBracket {
  min: number;
  max: number;
  baseTax: number;
  rate: number;
  excessOver: number;
}

// Monthly tax table (TRAIN Law - effective 2023)
const MONTHLY_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 20833, baseTax: 0, rate: 0, excessOver: 0 },
  { min: 20833, max: 33332, baseTax: 0, rate: 0.2, excessOver: 20833 },
  { min: 33333, max: 66666, baseTax: 2500, rate: 0.25, excessOver: 33333 },
  { min: 66667, max: 166666, baseTax: 10833.33, rate: 0.3, excessOver: 66667 },
  { min: 166667, max: 666666, baseTax: 40833.33, rate: 0.32, excessOver: 166667 },
  { min: 666667, Infinity: 0, max: Infinity, baseTax: 200833.33, rate: 0.35, excessOver: 666667 },
] as TaxBracket[];

export function computeWithholdingTax(
  monthlyTaxableIncome: number,
): WithholdingTaxResult {
  const bracket = MONTHLY_TAX_BRACKETS.find(
    (b) => monthlyTaxableIncome >= b.min && monthlyTaxableIncome <= b.max,
  );

  if (!bracket) {
    return {
      monthlyTaxableIncome,
      monthlyWithholdingTax: 0,
      annualTaxableIncome: monthlyTaxableIncome * 12,
      annualTax: 0,
      effectiveRate: 0,
    };
  }

  const monthlyTax =
    bracket.baseTax + (monthlyTaxableIncome - bracket.excessOver) * bracket.rate;

  const roundedMonthlyTax = Math.max(0, Math.round(monthlyTax * 100) / 100);

  return {
    monthlyTaxableIncome,
    monthlyWithholdingTax: roundedMonthlyTax,
    annualTaxableIncome: monthlyTaxableIncome * 12,
    annualTax: roundedMonthlyTax * 12,
    effectiveRate: monthlyTaxableIncome > 0 ? roundedMonthlyTax / monthlyTaxableIncome : 0,
  };
}

export function computeTaxableIncome(
  grossPay: number,
  sssDeduction: number,
  philhealthDeduction: number,
  pagibigDeduction: number,
  nonTaxableAllowances: number = 0,
): number {
  const totalDeductions =
    sssDeduction + philhealthDeduction + pagibigDeduction + nonTaxableAllowances;
  return Math.max(0, grossPay - totalDeductions);
}
