import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  type GridRowSelectionModel,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid';
import { Box, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Download, Upload, Filter, Users,
  TrendingUp, UserCheck, Clock, ChevronDown, X, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import employeesData from '@/data/mock/employees.json';

type Employee = typeof employeesData[number];

const DEPARTMENTS = ['All', 'Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'IT', 'Admin'];
const STATUSES = ['All', 'active', 'on_leave', 'terminated'];
const TYPES = ['All', 'regular', 'probationary', 'contractual'];

const statusConfig = {
  active: { label: 'Active', color: 'success' as const },
  on_leave: { label: 'On Leave', color: 'warning' as const },
  terminated: { label: 'Terminated', color: 'error' as const },
};

const typeConfig = {
  regular: { label: 'Regular', color: '#0038a8' },
  probationary: { label: 'Probationary', color: '#f59e0b' },
  contractual: { label: 'Contractual', color: '#6366f1' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function exportCSV(rows: Employee[]) {
  const headers = ['ID', 'Name', 'Position', 'Department', 'Status', 'Type', 'Hire Date', 'Salary'];
  const csv = [
    headers.join(','),
    ...rows.map((r) => [
      r.id, `"${r.name}"`, `"${r.position}"`, r.department,
      r.status, r.type, r.hireDate, r.salary,
    ].join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: number | string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#0038a8]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#0038a8]" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ px: 2, pb: 1, pt: 1.5 }}>
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDept, setBulkDept] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkType, setBulkType] = useState('');

  const handleSelectionChange = useCallback((model: GridRowSelectionModel) => {
    const ids = model.type === 'include'
      ? Array.from(model.ids as Set<string>)
      : [];
    setSelectedIds(ids);
  }, []);

  const applyBulkUpdate = useCallback(() => {
    if (!bulkDept && !bulkStatus && !bulkType) {
      toast.error('Select at least one field to update');
      return;
    }
    const changes: string[] = [];
    if (bulkDept) changes.push(`Department → ${bulkDept}`);
    if (bulkStatus) changes.push(`Status → ${statusConfig[bulkStatus as keyof typeof statusConfig]?.label ?? bulkStatus}`);
    if (bulkType) changes.push(`Type → ${typeConfig[bulkType as keyof typeof typeConfig]?.label ?? bulkType}`);
    toast.success(`Updated ${selectedIds.length} employee${selectedIds.length !== 1 ? 's' : ''}: ${changes.join(', ')}`);
    setSelectedIds([]);
    setBulkDept('');
    setBulkStatus('');
    setBulkType('');
  }, [selectedIds, bulkDept, bulkStatus, bulkType]);

  const filtered = useMemo(() => {
    return employeesData.filter((e) => {
      if (department !== 'All' && e.department !== department) return false;
      if (status !== 'All' && e.status !== status) return false;
      if (type !== 'All' && e.type !== type) return false;
      return true;
    });
  }, [department, status, type]);

  const kpis = useMemo(() => ({
    total: employeesData.length,
    active: employeesData.filter((e) => e.status === 'active').length,
    onLeave: employeesData.filter((e) => e.status === 'on_leave').length,
    newThisYear: employeesData.filter((e) => new Date(e.hireDate).getFullYear() === 2023).length,
  }), []);

  const columns: GridColDef<Employee>[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Employee',
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(row.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{row.name}</p>
            <p className="text-xs text-gray-400 leading-tight">{row.position}</p>
          </div>
        </div>
      ),
    },
    {
      field: 'department',
      headerName: 'Department',
      width: 130,
      renderCell: ({ value }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: ({ value }) => {
        const cfg = statusConfig[value as keyof typeof statusConfig];
        return <Chip label={cfg?.label ?? value} color={cfg?.color ?? 'default'} size="small" sx={{ fontSize: 11, fontWeight: 600 }} />;
      },
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: ({ value }) => {
        const cfg = typeConfig[value as keyof typeof typeConfig];
        return (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${cfg?.color}18`, color: cfg?.color }}>
            {cfg?.label ?? value}
          </span>
        );
      },
    },
    {
      field: 'hireDate',
      headerName: 'Hire Date',
      width: 110,
      renderCell: ({ value }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {format(new Date(value), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      field: 'tenure',
      headerName: 'Tenure',
      width: 90,
      valueGetter: (_value, row) => differenceInYears(new Date(), new Date(row.hireDate)),
      renderCell: ({ value }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value} yr{value !== 1 ? 's' : ''}</span>
      ),
    },
    {
      field: 'salary',
      headerName: 'Salary',
      width: 120,
      renderCell: ({ value }) => (
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          ₱{value.toLocaleString()}
        </span>
      ),
    },
  ], []);

  const handleRowClick = useCallback((params: GridRowParams<Employee>) => {
    navigate(`/employees/${params.row.id}`);
  }, [navigate]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your workforce — {employeesData.length} total employees
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/employees/upload')} className="hidden sm:flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} className="hidden sm:flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => navigate('/employees/new')} className="flex items-center gap-1.5 bg-[#0038a8] hover:bg-[#002d8a] text-white">
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Employees" value={kpis.total} icon={Users} />
        <KpiCard label="Active" value={kpis.active} icon={UserCheck} sub={`${Math.round(kpis.active / kpis.total * 100)}% of workforce`} />
        <KpiCard label="On Leave" value={kpis.onLeave} icon={Clock} />
        <KpiCard label="Hired in 2023" value={kpis.newThisYear} icon={TrendingUp} sub="New hires" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />

        {([
          { label: 'Department', value: department, setter: setDepartment, options: DEPARTMENTS.map((d) => ({ value: d, label: d })) },
          { label: 'Status', value: status, setter: setStatus, options: STATUSES.map((s) => ({ value: s, label: s === 'All' ? 'All' : statusConfig[s as keyof typeof statusConfig]?.label ?? s })) },
          { label: 'Type', value: type, setter: setType, options: TYPES.map((t) => ({ value: t, label: t === 'All' ? 'All' : typeConfig[t as keyof typeof typeConfig]?.label ?? t })) },
        ] as const).map((filter) => (
          <div key={filter.label} className="relative">
            <select
              value={filter.value}
              onChange={(e) => filter.setter(e.target.value)}
              title={filter.label}
              className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue transition-colors hover:border-gray-300 dark:hover:border-gray-600"
            >
              {filter.options.map((o) => (
                <option key={o.value} value={o.value}>{filter.label}: {o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>
        ))}

        {(department !== 'All' || status !== 'All' || type !== 'All') && (
          <button
            type="button"
            onClick={() => { setDepartment('All'); setStatus('All'); setType('All'); }}
            className="text-xs text-[#0038a8] hover:underline"
          >
            Clear
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700"
          >
            <span className="text-sm font-semibold shrink-0">
              {selectedIds.length} selected
            </span>
            <div className="w-px h-5 bg-gray-600 shrink-0" />

            <select
              value={bulkDept}
              onChange={(e) => setBulkDept(e.target.value)}
              title="Bulk Department"
              className="h-8 appearance-none px-2 rounded-lg bg-gray-700 border border-gray-600 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="">Department…</option>
              {DEPARTMENTS.filter((d) => d !== 'All').map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              title="Bulk Status"
              className="h-8 appearance-none px-2 rounded-lg bg-gray-700 border border-gray-600 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="">Status…</option>
              {STATUSES.filter((s) => s !== 'All').map((s) => (
                <option key={s} value={s}>{statusConfig[s as keyof typeof statusConfig]?.label ?? s}</option>
              ))}
            </select>

            <select
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value)}
              title="Bulk Type"
              className="h-8 appearance-none px-2 rounded-lg bg-gray-700 border border-gray-600 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="">Type…</option>
              {TYPES.filter((t) => t !== 'All').map((t) => (
                <option key={t} value={t}>{typeConfig[t as keyof typeof typeConfig]?.label ?? t}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={applyBulkUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-gray-900 text-xs font-semibold hover:bg-gray-100 transition-colors shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              title="Clear selection"
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DataGrid */}
      <Box
        sx={{
          height: 560,
          width: '100%',
          '& .MuiDataGrid-root': { border: 'none', borderRadius: 3, overflow: 'hidden' },
          '& .MuiDataGrid-columnHeaders': { backgroundColor: 'var(--color-gray-50, #f9fafb)', fontSize: 12, fontWeight: 600 },
          '& .MuiDataGrid-row': { cursor: 'pointer' },
          '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0, 56, 168, 0.04)' },
          '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(0,0,0,0.08)' },
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          rowHeight={60}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{ toolbar: CustomToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          checkboxSelection
          disableColumnMenu
          disableRowSelectionOnClick
          onRowSelectionModelChange={handleSelectionChange}
        />
      </Box>
    </motion.div>
  );
}
