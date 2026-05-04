import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import type { EmployeeRow } from '@/services/employees';
import mockEmployeesData from '@/data/mock/employees.json';
import mockEmployeeDetailsData from '@/data/mock/employee-details.json';

type Employee = EmployeeRow;

interface OrgNode {
  employee: Employee;
  children: OrgNode[];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function buildTree(employees: Employee[], supervisorMap: Map<string, string | null>): OrgNode[] {
  // Find roots: employees with no supervisor in our data
  const empIds = new Set(employees.map((e) => e.id));
  const roots = employees.filter((e) => {
    const supId = supervisorMap.get(e.id);
    return !supId || !empIds.has(supId);
  });

  function buildChildren(emp: Employee): OrgNode {
    const directReports = employees.filter((e) => supervisorMap.get(e.id) === emp.id);
    return {
      employee: emp,
      children: directReports.map(buildChildren),
    };
  }

  return roots.map(buildChildren);
}

function EmployeeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: depth * 0.05 }}
        className="relative"
      >
        <div
          className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 w-44 text-center hover:border-[#0038a8] hover:shadow-md transition-all cursor-pointer"
          onClick={() => navigate(`/employees/${node.employee.id}`)}
        >
          <div className="w-10 h-10 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-sm font-bold mx-auto mb-2">
            {getInitials(node.employee.name)}
          </div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight truncate">{node.employee.name}</p>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">{node.employee.position}</p>
          <p className="text-[10px] text-[#0038a8] dark:text-blue-400 mt-0.5">{node.employee.department}</p>

          {hasChildren && (
            <button
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-[#0038a8] transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            >
              {expanded
                ? <ChevronDown className="w-3 h-3 text-gray-500" />
                : <ChevronRight className="w-3 h-3 text-gray-500" />}
            </button>
          )}
        </div>
      </motion.div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-7 flex flex-col items-center">
          {/* Vertical line from parent */}
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          {/* Horizontal line */}
          {node.children.length > 1 && (
            <div
              className="h-px bg-gray-200 dark:bg-gray-700"
              style={{ width: `${node.children.length * 192 - 48}px` }}
            />
          )}
          {/* Children row */}
          <div className="flex items-start gap-12 mt-0">
            {node.children.map((child) => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                <EmployeeNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: liveEmployees } = useEmployees();

  const employees: Employee[] = useMemo(() => {
    if (liveEmployees && liveEmployees.length > 0) return liveEmployees;
    return mockEmployeesData.map((e) => ({
      id: e.id,
      name: e.name,
      position: e.position,
      department: e.department,
      status: e.status,
      hireDate: e.hireDate,
      birthday: e.birthday ?? '',
      salary: e.salary,
      type: e.type,
      avatar: e.avatar ?? null,
      employeeNo: e.id,
      email: null,
      managerId: mockEmployeeDetailsData.find((d) => d.id === e.id)?.supervisor ?? null,
    }));
  }, [liveEmployees]);

  const supervisorMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const e of employees) {
      map.set(e.id, e.managerId ?? null);
    }
    return map;
  }, [employees]);

  const tree = useMemo(() => buildTree(employees, supervisorMap), [employees, supervisorMap]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Organization Chart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Reporting structure across all departments</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="w-4 h-4" />
          {employees.length} employees
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 overflow-x-auto">
        <div className="min-w-max">
          {tree.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">No org structure data available.</div>
          ) : (
            <div className="flex gap-16 items-start justify-center">
              {tree.map((root) => (
                <EmployeeNode key={root.employee.id} node={root} depth={0} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Click any card to view the employee&apos;s full profile. Click the expand button to show/hide direct reports.
      </p>
    </motion.div>
  );
}
