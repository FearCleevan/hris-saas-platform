import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { addEmployee } from '@/services/addEmployee';
import { isSupabaseConfigured } from '@/lib/supabase';

const TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'middle_name', 'birthday', 'gender', 'civil_status',
  'personal_email', 'company_email', 'mobile', 'street', 'city', 'province', 'zip',
  'position', 'department', 'type', 'hire_date', 'salary',
  'sss', 'philhealth', 'pagibig', 'tin',
  'bank_name', 'account_number', 'account_name', 'account_type',
];

function downloadTemplate() {
  const csv = TEMPLATE_HEADERS.join(',') + '\nMaria,Santos,,1990-04-25,Female,Single,m.santos@gmail.com,m.santos@company.ph,09171234567,123 Rizal St,Makati City,Metro Manila,1210,Software Engineer,Engineering,regular,2024-01-15,65000,,,,,,,';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee-bulk-upload-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type UploadStatus = 'idle' | 'parsing' | 'preview' | 'uploading' | 'done' | 'error';

interface ParsedRow {
  row: number;
  name: string;
  position: string;
  department: string;
  valid: boolean;
  errors: string[];
  payload: Parameters<typeof addEmployee>[0];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n');
  const dataLines = lines.slice(1).filter((l) => l.trim());
  return dataLines.map((line, i) => {
    // TEMPLATE_HEADERS order:
    // 0:first_name 1:last_name 2:middle_name 3:birthday 4:gender 5:civil_status
    // 6:personal_email 7:company_email 8:mobile 9:street 10:city 11:province 12:zip
    // 13:position 14:department 15:type 16:hire_date 17:salary
    // 18:sss 19:philhealth 20:pagibig 21:tin
    // 22:bank_name 23:account_number 24:account_name 25:account_type
    const cols = line.split(',');
    const firstName  = cols[0]?.trim();
    const lastName   = cols[1]?.trim();
    const position   = cols[13]?.trim();
    const department = cols[14]?.trim();
    const hireDate   = cols[16]?.trim();
    const salary     = cols[17]?.trim();
    const errors: string[] = [];
    if (!firstName)  errors.push('Missing first name');
    if (!lastName)   errors.push('Missing last name');
    if (!position)   errors.push('Missing position');
    if (!department) errors.push('Missing department');
    if (!hireDate)   errors.push('Missing hire date');
    if (!salary)     errors.push('Missing salary');
    return {
      row: i + 2,
      name: `${firstName} ${lastName}`.trim() || '(unknown)',
      position: position || '—',
      department: department || '—',
      valid: errors.length === 0,
      errors,
      payload: {
        firstName:   firstName  ?? '',
        lastName:    lastName   ?? '',
        middleName:  cols[2]?.trim() || undefined,
        birthday:    cols[3]?.trim() ?? '',
        gender:      (cols[4]?.trim() as 'Male' | 'Female') ?? 'Male',
        civilStatus: cols[5]?.trim() ?? '',
        nationality: 'Filipino',
        personalEmail: cols[6]?.trim() ?? '',
        companyEmail:  cols[7]?.trim() ?? '',
        mobile:        cols[8]?.trim() ?? '',
        street:        cols[9]?.trim() ?? '',
        city:          cols[10]?.trim() ?? '',
        province:      cols[11]?.trim() ?? '',
        zip:           cols[12]?.trim() ?? '',
        position:      position  ?? '',
        department:    department ?? '',
        type:          cols[15]?.trim() ?? 'regular',
        hireDate:      hireDate  ?? '',
        salary:        salary    ?? '0',
        sss:        cols[18]?.trim() || undefined,
        philhealth: cols[19]?.trim() || undefined,
        pagibig:    cols[20]?.trim() || undefined,
        tin:        cols[21]?.trim() || undefined,
        bankName:      cols[22]?.trim() || undefined,
        accountNumber: cols[23]?.trim() || undefined,
        accountName:   cols[24]?.trim() || undefined,
        accountType:   cols[25]?.trim() || undefined,
        beneficiaries: [],
      },
    };
  });
}

export default function BulkUploadPage() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      toast.error('Only CSV files are supported.');
      return;
    }
    setFile(f);
    setStatus('parsing');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setStatus('preview');
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to upload.');
      return;
    }
    setStatus('uploading');
    if (isSupabaseConfigured) {
      let succeeded = 0;
      let failed = 0;
      for (const row of validRows) {
        try {
          await addEmployee(row.payload);
          succeeded++;
        } catch {
          failed++;
        }
      }
      setStatus('done');
      if (failed > 0) {
        toast.warning(`${succeeded} added, ${failed} failed. Check console for details.`);
      } else {
        toast.success(`${succeeded} employee${succeeded !== 1 ? 's' : ''} added successfully!`);
      }
    } else {
      await new Promise((r) => setTimeout(r, 1000));
      setStatus('done');
      toast.success(`${validRows.length} employees added successfully! (mock mode)`);
    }
  };

  const reset = () => {
    setStatus('idle');
    setFile(null);
    setRows([]);
  };

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Bulk Upload Employees</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Upload a CSV file to add multiple employees at once.</p>

      <div className="max-w-2xl space-y-5">
        {/* Step 1: Download template */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">Step 1 — Download template</p>
              <p className="text-xs text-gray-400">Use our CSV template to ensure proper formatting.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex items-center gap-1.5 shrink-0">
              <Download className="w-4 h-4" />
              Template
            </Button>
          </div>
        </div>

        {/* Step 2: Upload */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Step 2 — Upload your file</p>

          <AnimatePresence mode="wait">
            {status === 'idle' || status === 'parsing' ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? 'border-brand-blue bg-brand-blue/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-blue/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  title='file'
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <FileSpreadsheet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {status === 'parsing' ? 'Parsing file…' : 'Drop your CSV here, or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV files only · Max 500 employees per batch</p>
              </motion.div>
            ) : status === 'done' ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10 text-center"
              >
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{validCount} employees added successfully!</p>
                <Button variant="outline" size="sm" onClick={reset} className="mt-4">Upload another file</Button>
              </motion.div>
            ) : (
              <motion.div key="file-info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <FileSpreadsheet className="w-8 h-8 text-brand-blue shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{file?.name}</p>
                  <p className="text-xs text-gray-400">{rows.length} rows detected</p>
                </div>
                <button title='Select' onClick={reset} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 3: Preview & confirm */}
        {(status === 'preview' || status === 'uploading') && rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Step 3 — Review &amp; confirm</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" />{validCount} valid</span>
                {errorCount > 0 && <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3.5 h-3.5" />{errorCount} errors</span>}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2.5 font-medium text-gray-500">Row</th>
                    <th className="text-left p-2.5 font-medium text-gray-500">Name</th>
                    <th className="text-left p-2.5 font-medium text-gray-500 hidden sm:table-cell">Position</th>
                    <th className="text-left p-2.5 font-medium text-gray-500 hidden sm:table-cell">Dept</th>
                    <th className="text-left p-2.5 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.row} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-2.5 text-gray-400">{r.row}</td>
                      <td className="p-2.5 font-medium text-gray-800 dark:text-gray-200">{r.name}</td>
                      <td className="p-2.5 text-gray-500 hidden sm:table-cell">{r.position}</td>
                      <td className="p-2.5 text-gray-500 hidden sm:table-cell">{r.department}</td>
                      <td className="p-2.5">
                        {r.valid ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />OK</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1" title={r.errors.join(', ')}><AlertCircle className="w-3 h-3" />Error</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Rows with errors will be skipped. Fix them in your CSV and re-upload, or proceed to import only valid rows.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={status === 'uploading' || validCount === 0}
                className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white"
              >
                {status === 'uploading' ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" />Import {validCount} Employee{validCount !== 1 ? 's' : ''}</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
