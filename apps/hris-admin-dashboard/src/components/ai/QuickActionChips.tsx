interface Props {
  onSelect: (text: string) => void;
}

const CHIPS = [
  'Employees on leave today',
  'Pending approvals',
  'Top performers',
  'Payroll this month',
  'Upcoming birthdays',
  'Headcount by department',
  'Generate an announcement',
  'Go to attendance',
];

export function QuickActionChips({ onSelect }: Props) {
  return (
    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        Quick actions
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onSelect(chip)}
            className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
