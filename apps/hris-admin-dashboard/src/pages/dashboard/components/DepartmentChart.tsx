import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import employeesData from '@/data/mock/employees.json';

const COLORS = ['#0038a8', '#ce1126', '#fcd116', '#22c55e', '#a855f7', '#f97316', '#6b7280'];

const deptCounts = employeesData.reduce<Record<string, number>>((acc, emp) => {
  acc[emp.department] = (acc[emp.department] ?? 0) + 1;
  return acc;
}, {});

const data = Object.entries(deptCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([name, value]) => ({ name, value }));

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white">{payload[0].payload.name}</p>
      <p className="text-gray-500 dark:text-gray-400">{payload[0].value} employees</p>
    </div>
  );
}

export function DepartmentChart() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">By Department</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{employeesData.length} total employees</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/employees')}
          className="text-xs text-[#0038a8] dark:text-blue-400 hover:underline font-medium cursor-pointer"
        >
          View all
        </button>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-col gap-1.5">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{entry.name}</span>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
