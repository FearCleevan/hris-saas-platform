// Philippine Holidays 2024 (Proclamation No. 368, s. 2023)

export type HolidayType = 'regular' | 'special_non_working' | 'special_working';

export interface PHHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
}

export const PH_HOLIDAYS_2024: PHHoliday[] = [
  // Regular Holidays
  { date: '2024-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2024-04-09', name: 'Araw ng Kagitingan (Day of Valor)', type: 'regular' },
  { date: '2024-03-28', name: 'Maundy Thursday', type: 'regular' },
  { date: '2024-03-29', name: 'Good Friday', type: 'regular' },
  { date: '2024-04-10', name: 'Eid al-Fitr', type: 'regular' },
  { date: '2024-05-01', name: "Labor Day", type: 'regular' },
  { date: '2024-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2024-06-17', name: 'Eid al-Adha', type: 'regular' },
  { date: '2024-08-26', name: 'National Heroes Day', type: 'regular' },
  { date: '2024-11-30', name: "Bonifacio Day", type: 'regular' },
  { date: '2024-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2024-12-30', name: 'Rizal Day', type: 'regular' },

  // Special Non-Working Holidays
  { date: '2024-02-10', name: 'Chinese New Year', type: 'special_non_working' },
  { date: '2024-03-30', name: 'Black Saturday', type: 'special_non_working' },
  { date: '2024-08-21', name: 'Ninoy Aquino Day', type: 'special_non_working' },
  { date: '2024-11-01', name: "All Saints' Day", type: 'special_non_working' },
  { date: '2024-11-02', name: "All Souls' Day (Additional Special Day)", type: 'special_non_working' },
  { date: '2024-12-08', name: "Feast of the Immaculate Conception", type: 'special_non_working' },
  { date: '2024-12-24', name: 'Christmas Eve', type: 'special_non_working' },
  { date: '2024-12-31', name: "New Year's Eve", type: 'special_non_working' },
];

export const PH_HOLIDAYS_2025: PHHoliday[] = [
  // Regular Holidays
  { date: '2025-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2025-04-09', name: 'Araw ng Kagitingan (Day of Valor)', type: 'regular' },
  { date: '2025-04-17', name: 'Maundy Thursday', type: 'regular' },
  { date: '2025-04-18', name: 'Good Friday', type: 'regular' },
  { date: '2025-05-01', name: "Labor Day", type: 'regular' },
  { date: '2025-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2025-08-25', name: 'National Heroes Day', type: 'regular' },
  { date: '2025-11-30', name: "Bonifacio Day", type: 'regular' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2025-12-30', name: 'Rizal Day', type: 'regular' },

  // Special Non-Working Holidays
  { date: '2025-01-29', name: 'Chinese New Year', type: 'special_non_working' },
  { date: '2025-04-19', name: 'Black Saturday', type: 'special_non_working' },
  { date: '2025-08-21', name: 'Ninoy Aquino Day', type: 'special_non_working' },
  { date: '2025-11-01', name: "All Saints' Day", type: 'special_non_working' },
  { date: '2025-12-08', name: "Feast of the Immaculate Conception", type: 'special_non_working' },
  { date: '2025-12-24', name: 'Christmas Eve', type: 'special_non_working' },
  { date: '2025-12-31', name: "New Year's Eve", type: 'special_non_working' },
];

export function getHolidaysForYear(year: number): PHHoliday[] {
  switch (year) {
    case 2024: return PH_HOLIDAYS_2024;
    case 2025: return PH_HOLIDAYS_2025;
    default: return [];
  }
}

export function isHoliday(date: Date): PHHoliday | undefined {
  const dateStr = date.toISOString().split('T')[0]!;
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  return holidays.find((h) => h.date === dateStr);
}

export function getHolidayType(date: Date): HolidayType | null {
  const holiday = isHoliday(date);
  return holiday?.type ?? null;
}
