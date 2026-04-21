// PH Overtime Calculator - Labor Code of the Philippines
// Presidential Decree No. 442, as amended

export type DayType = 'regular' | 'rest_day' | 'special_holiday' | 'regular_holiday' | 'special_holiday_rest_day' | 'regular_holiday_rest_day';

export interface OvertimePay {
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  overtimeRate: number;
}

// Overtime rates per PH Labor Code
const OVERTIME_RATES: Record<DayType, { regular: number; overtime: number }> = {
  regular: { regular: 1.0, overtime: 1.25 },
  rest_day: { regular: 1.3, overtime: 1.69 }, // 130% regular, +30% overtime on rest day rate
  special_holiday: { regular: 1.3, overtime: 1.69 },
  regular_holiday: { regular: 2.0, overtime: 2.6 }, // 200% regular, +30% overtime
  special_holiday_rest_day: { regular: 1.5, overtime: 1.95 },
  regular_holiday_rest_day: { regular: 2.6, overtime: 3.38 },
};

const REGULAR_WORK_HOURS_PER_DAY = 8;

export function computeHourlyRate(monthlyBasicSalary: number, workingDaysPerMonth: number = 26): number {
  const dailyRate = monthlyBasicSalary / workingDaysPerMonth;
  return dailyRate / REGULAR_WORK_HOURS_PER_DAY;
}

export function computeOvertimePay(
  hourlyRate: number,
  totalHoursWorked: number,
  dayType: DayType,
): OvertimePay {
  const rates = OVERTIME_RATES[dayType];
  const regularHours = Math.min(totalHoursWorked, REGULAR_WORK_HOURS_PER_DAY);
  const overtimeHours = Math.max(0, totalHoursWorked - REGULAR_WORK_HOURS_PER_DAY);

  const regularPay = regularHours * hourlyRate * rates.regular;
  const overtimePay = overtimeHours * hourlyRate * rates.overtime;

  return {
    regularHours,
    overtimeHours,
    hourlyRate,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    totalPay: Math.round((regularPay + overtimePay) * 100) / 100,
    overtimeRate: rates.overtime,
  };
}

export function computeNightDifferential(hourlyRate: number, nightHours: number): number {
  // Night differential: 10% of hourly rate (10PM to 6AM)
  const NIGHT_DIFFERENTIAL_RATE = 0.1;
  return Math.round(hourlyRate * NIGHT_DIFFERENTIAL_RATE * nightHours * 100) / 100;
}
