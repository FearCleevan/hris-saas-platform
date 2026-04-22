import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, DollarSign, Calendar, FileText, BarChart2, Settings, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

interface SearchResult {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  path: string;
  category: string;
}

const allResults: SearchResult[] = [
  { label: 'Employees', sublabel: 'Manage all employees', icon: <Users className="w-4 h-4" />, path: '/employees', category: 'Pages' },
  { label: 'Payroll', sublabel: 'Process payroll & payslips', icon: <DollarSign className="w-4 h-4" />, path: '/payroll', category: 'Pages' },
  { label: 'Leave Management', sublabel: 'Approve & track leaves', icon: <Calendar className="w-4 h-4" />, path: '/leaves', category: 'Pages' },
  { label: 'Attendance', sublabel: 'Daily logs & time tracking', icon: <Calendar className="w-4 h-4" />, path: '/attendance', category: 'Pages' },
  { label: 'Documents', sublabel: '201 files & company docs', icon: <FileText className="w-4 h-4" />, path: '/documents', category: 'Pages' },
  { label: 'Reports', sublabel: 'BIR, SSS, PhilHealth reports', icon: <BarChart2 className="w-4 h-4" />, path: '/reports', category: 'Pages' },
  { label: 'Settings', sublabel: 'Company & system config', icon: <Settings className="w-4 h-4" />, path: '/settings', category: 'Pages' },
];

const shortcuts = [
  { label: 'Employees', icon: <Users className="w-4 h-4" />, path: '/employees' },
  { label: 'Payroll', icon: <DollarSign className="w-4 h-4" />, path: '/payroll' },
  { label: 'Reports', icon: <BarChart2 className="w-4 h-4" />, path: '/reports' },
  { label: 'Settings', icon: <Settings className="w-4 h-4" />, path: '/settings' },
];

export function GlobalSearch() {
  const { searchOpen, setSearchOpen } = useUIStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [searchOpen]);

  const results = query.trim()
    ? allResults.filter((r) =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.sublabel.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    setSearchOpen(false);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-20 z-50 w-full max-w-xl -translate-x-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search employees, payroll, reports…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((result) => (
                    <button
                      key={result.path}
                      type="button"
                      onClick={() => handleSelect(result.path)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left group transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0038a8]/10 flex items-center justify-center text-[#0038a8] shrink-0">
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{result.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{result.sublabel}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#0038a8] transition-colors" />
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Quick Navigation</p>
                  <div className="grid grid-cols-2 gap-2">
                    {shortcuts.map((s) => (
                      <button
                        key={s.path}
                        type="button"
                        onClick={() => handleSelect(s.path)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#0038a8]/40 hover:bg-[#0038a8]/5 text-sm text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                      >
                        <span className={cn('w-7 h-7 rounded-lg bg-[#0038a8]/10 flex items-center justify-center text-[#0038a8]')}>
                          {s.icon}
                        </span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400">
              <span><kbd className="font-mono border border-gray-200 dark:border-gray-700 rounded px-1">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono border border-gray-200 dark:border-gray-700 rounded px-1">↵</kbd> select</span>
              <span><kbd className="font-mono border border-gray-200 dark:border-gray-700 rounded px-1">ESC</kbd> close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
