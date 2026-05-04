import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  type GridRowSelectionModel,
  type GridSortModel,
} from '@mui/x-data-grid';
import { Box, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Download, Upload, Filter, Users,
  TrendingUp, UserCheck, Clock, ChevronDown, X, Check, Search,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useEmployees } from '@/hooks/useEmployees';
import type { EmployeeRow } from '@/services/employees';

type Employee = EmployeeRow;

const STATUSES = ['All', 'active', 'on_leave', 'terminated'];
const TYPES    = ['All', 'regular', 'probationary', 'contractual'];

const statusConfig = {
  active:     { label: 'Active',     color: 'success' as const },
  on_leave:   { label: 'On Leave',   color: 'warning' as const },
  terminated: { label: 'Terminated', color: 'error'   as const },
};

const typeConfig = {
  regular:       { label: 'Regular',       color: '#0038a8' },
  probationary:  { label: 'Probationary',  color: '#f59e0b' },
  contractual:   { label: 'Contractual',   color: '#6366f1' },
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `employees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function KpiCard({ label, value, icon: Icon, sub }: {
  label: string; value: number | string; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-brand-blue" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue transition-colors hover:border-gray-300 dark:hover:border-gray-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{label}: {o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { data: employees = [], isLoading, error } = useEmployees();

  useEffect(() => {
    if (error) toast.error(`Failed to load employees: ${(error as Error).message}`);
  }, [error]);

  // Filter state
  const [search,         setSearch]         = useState('');
  const [department,     setDepartment]     = useState('All');
  const [positionFilter, setPositionFilter] = useState('All');
  const [status,         setStatus]         = useState('All');
  const [type,           setType]           = useState('All');

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDept,    setBulkDept]    = useState('');
  const [bulkStatus,  setBulkStatus]  = useState('');
  const [bulkType,    setBulkType]    = useState('');

  // Sort state (controlled externally so we can show the current sort)
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // Derive unique filter options from loaded data
  const departments = useMemo(() => {
    const unique = [...new Set(employees.map((e) => e.department).filter((d) => d && d !== '—'))].sort();
    return ['All', ...unique];
  }, [employees]);

  const positions = useMemo(() => {
    const unique = [...new Set(employees.map((e) => e.position).filter((p) => p && p !== '—'))].sort();
    return ['All', ...unique];
  }, [employees]);

  const handleSelectionChange = useCallback((model: GridRowSelectionModel) => {
    const ids = model.type === 'include' ? Array.from(model.ids as Set<string>) : [];
    setSelectedIds(ids);
  }, []);

  const applyBulkUpdate = useCallback(() => {
    if (!bulkDept && !bulkStatus && !bulkType) {
      toast.error('Select at least one field to update');
      return;
    }
    const changes: string[] = [];
    if (bulkDept)   changes.push(`Department → ${bulkDept}`);
    if (bulkStatus) changes.push(`Status → ${statusConfig[bulkStatus as keyof typeof statusConfig]?.label ?? bulkStatus}`);
    if (bulkType)   changes.push(`Type → ${typeConfig[bulkType as keyof typeof typeConfig]?.label ?? bulkType}`);
    toast.success(`Updated ${selectedIds.length} employee${selectedIds.length !== 1 ? 's' : ''}: ${changes.join(', ')}`);
    setSelectedIds([]);
    setBulkDept('');
    setBulkStatus('');
    setBulkType('');
  }, [selectedIds, bulkDept, bulkStatus, bulkType]);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setDepartment('All');
    setPositionFilter('All');
    setStatus('All');
    setType('All');
  }, []);

  const hasActiveFilters = search || department !== 'All' || positionFilter !== 'All' || status !== 'All' || type !== 'All';

  // Apply filters
  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return employees.filter((e) => {
      if (department     !== 'All' && e.department !== department)     return false;
      if (positionFilter !== 'All' && e.position   !== positionFilter) return false;
      if (status         !== 'All' && e.status     !== status)         return false;
      if (type           !== 'All' && e.type       !== type)           return false;
      if (lower && !e.name.toLowerCase().includes(lower)
                && !e.position.toLowerCase().includes(lower)
                && !e.department.toLowerCase().includes(lower)
                && !(e.email ?? '').toLowerCase().includes(lower)
                && !(e.employeeNo ?? '').toLowerCase().includes(lower)) return false;
      return true;
    });
  }, [employees, search, department, positionFilter, status, type]);

  const kpis = useMemo(() => ({
    total:   employees.length,
    active:  employees.filter((e) => e.status === 'active').length,
    onLeave: employees.filter((e) => e.status === 'on_leave').length,
    newThisYear: employees.filter(
      (e) => e.hireDate && new Date(e.hireDate).getFullYear() === new Date().getFullYear()
    ).length,
  }), [employees]);

  const columns: GridColDef<Employee>[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Employee',
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
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
      field: 'employeeNo',
      headerName: 'ID',
      width: 110,
      renderCell: ({ value }) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{value}</span>
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
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${cfg?.color}18`, color: cfg?.color }}>
            {cfg?.label ?? value}
          </span>
        );
      },
    },
    {
      field: 'hireDate',
      headerName: 'Hire Date',
      width: 110,
      renderCell: ({ value }) => value ? (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {format(new Date(value), 'MMM d, yyyy')}
        </span>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      field: 'tenure',
      headerName: 'Tenure',
      width: 90,
      valueGetter: (_value, row) =>
        row.hireDate ? differenceInYears(new Date(), new Date(row.hireDate)) : 0,
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
          ₱{(value as number).toLocaleString()}
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
            {isLoading ? 'Loading…' : `${employees.length.toLocaleString()} total employees`}
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
          <Button size="sm" onClick={() => navigate('/employees/new')} className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white">
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-4 w-28 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Total Employees" value={kpis.total.toLocaleString()} icon={Users} />
            <KpiCard label="Active" value={kpis.active.toLocaleString()} icon={UserCheck}
              sub={kpis.total ? `${Math.round(kpis.active / kpis.total * 100)}% of workforce` : undefined} />
            <KpiCard label="On Leave" value={kpis.onLeave.toLocaleString()} icon={Clock} />
            <KpiCard label={`Hired in ${new Date().getFullYear()}`} value={kpis.newThisYear.toLocaleString()} icon={TrendingUp} sub="New hires" />
          </>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, position, department, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1 transition-colors"
          />
          {search && (
            <button
              type="button"
              title="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />

          <FilterSelect
            label="Department"
            value={department}
            onChange={setDepartment}
            options={departments.map((d) => ({ value: d, label: d }))}
          />

          <FilterSelect
            label="Position"
            value={positionFilter}
            onChange={setPositionFilter}
            options={positions.map((p) => ({ value: p, label: p }))}
          />

          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({
              value: s,
              label: s === 'All' ? 'All' : statusConfig[s as keyof typeof statusConfig]?.label ?? s,
            }))}
          />

          <FilterSelect
            label="Type"
            value={type}
            onChange={setType}
            options={TYPES.map((t) => ({
              value: t,
              label: t === 'All' ? 'All' : typeConfig[t as keyof typeof typeConfig]?.label ?? t,
            }))}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-brand-blue hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <ArrowUpDown className="w-3 h-3" />
            <span>
              {filtered.length.toLocaleString()} of {employees.length.toLocaleString()} employee{employees.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
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
            <span className="text-sm font-semibold shrink-0">{selectedIds.length} selected</span>
            <div className="w-px h-5 bg-gray-600 shrink-0" />

            <select value={bulkDept} onChange={(e) => setBulkDept(e.target.value)} title="Bulk Department"
              className="h-8 appearance-none px-2 rounded-lg bg-gray-700 border border-gray-600 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30">
              <option value="">Department…</option>
              {departments.filter((d) => d !== 'All').map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} title="Bulk Status"
              className="h-8 appearance-none px-2 rounded-lg bg-gray-700 border border-gray-600 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30">
              <option value="">Status…</option>
              {STATUSES.filter((s) => s !== 'All').map((s) => (
                <option key={s} value={s}>{statusConfig[s as keyof typeof statusConfig]?.label ?? s}</option>
              ))}
            </select>

            <select value={bulkType} onChange={(e) => setBulkType(e.target.value)} title="Bulk Type"
              className="h-8 appearance-none px-2 rounded-lg bg-gray-700 border border-gray-600 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30">
              <option value="">Type…</option>
              {TYPES.filter((t) => t !== 'All').map((t) => (
                <option key={t} value={t}>{typeConfig[t as keyof typeof typeConfig]?.label ?? t}</option>
              ))}
            </select>

            <button type="button" onClick={applyBulkUpdate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-gray-900 text-xs font-semibold hover:bg-gray-100 transition-colors shrink-0">
              <Check className="w-3.5 h-3.5" /> Apply
            </button>

            <button type="button" onClick={() => setSelectedIds([])} title="Clear selection"
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DataGrid */}
      <Box
        sx={{
          height: 580,
          width: '100%',
          '& .MuiDataGrid-root': { border: 'none', borderRadius: 3, overflow: 'hidden', fontSize: 13 },
          '& .MuiDataGrid-columnHeaders': { backgroundColor: 'var(--color-gray-50, #f9fafb)', fontSize: 12, fontWeight: 700 },
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
          '& .MuiDataGrid-sortIcon': { opacity: 0.7 },
          '& .MuiDataGrid-row': { cursor: 'pointer' },
          '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0, 56, 168, 0.04)' },
          '& .MuiDataGrid-row.Mui-selected': { backgroundColor: 'rgba(0, 56, 168, 0.08)' },
          '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: 'rgba(0, 56, 168, 0.12)' },
          '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' },
          '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(0,0,0,0.08)' },
          '& .MuiCheckbox-root': { color: 'rgba(0, 56, 168, 0.5)' },
          '& .MuiCheckbox-root.Mui-checked': { color: '#0038a8' },
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
          loading={isLoading}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          rowHeight={60}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          sortingOrder={['asc', 'desc']}
          checkboxSelection
          disableColumnMenu
          disableRowSelectionOnClick
          onRowSelectionModelChange={handleSelectionChange}
          slotProps={{
            loadingOverlay: {
              variant: 'skeleton',
              noRowsVariant: 'skeleton',
            },
          }}
        />
      </Box>

      {/* Footer note */}
      {!isLoading && filtered.length === 0 && employees.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          No employees match your filters.{' '}
          <button type="button" onClick={clearAllFilters} className="text-brand-blue hover:underline">
            Clear filters
          </button>
        </p>
      )}
      {!isLoading && employees.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          No employees yet.{' '}
          <button type="button" onClick={() => navigate('/employees/new')} className="text-brand-blue hover:underline">
            Add your first employee
          </button>
        </p>
      )}
    </motion.div>
  );
}
