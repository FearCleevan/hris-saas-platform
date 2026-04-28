import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Keyboard, UserPlus, DollarSign, Calendar, BarChart2, BookOpen } from 'lucide-react';
import { navSections } from '@/components/layout/navConfig';
import employeesData from '@/data/mock/employees.json';

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

function getInitials(n: string) { return n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase(); }

interface Props { isOpen: boolean; onClose: () => void; }

export function CommandPalette({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback((path: string) => { navigate(path); onClose(); }, [navigate, onClose]);

  /* Build all items */
  const allItems = useMemo((): CommandItem[] => {
    const quickActions: CommandItem[] = [
      { id: 'qa-add-emp', group: 'Quick Actions', label: 'Add New Employee',      sublabel: 'Create employee record',      icon: <UserPlus size={15} className="text-indigo-500" />, action: () => go('/employees/new') },
      { id: 'qa-payroll', group: 'Quick Actions', label: 'Go to Payroll',          sublabel: 'Process payroll runs',        icon: <DollarSign size={15} className="text-green-500" />, action: () => go('/payroll') },
      { id: 'qa-leaves',  group: 'Quick Actions', label: 'Approve Leave Requests', sublabel: 'Review pending leaves',       icon: <Calendar size={15} className="text-amber-500" />, action: () => go('/leaves') },
      { id: 'qa-reports', group: 'Quick Actions', label: 'Generate Reports',       sublabel: 'BIR, SSS, PhilHealth',       icon: <BarChart2 size={15} className="text-blue-500" />, action: () => go('/reports') },
      { id: 'qa-policy',  group: 'Quick Actions', label: 'HR Policy Q&A',          sublabel: 'Ask about labor law',        icon: <BookOpen size={15} className="text-purple-500" />, action: () => go('/hr-policy') },
    ];

    const navItems: CommandItem[] = navSections.flatMap(section =>
      section.items.map(item => ({
        id: `nav-${item.path}`,
        group: 'Navigate',
        label: item.label,
        sublabel: item.path,
        icon: <item.icon size={15} className="text-gray-400" />,
        action: () => go(item.path),
      }))
    );

    const empItems: CommandItem[] = employeesData
      .filter(e => e.status === 'active')
      .map(emp => ({
        id: `emp-${emp.id}`,
        group: 'Employees',
        label: emp.name,
        sublabel: `${emp.position} · ${emp.department}`,
        icon: (
          <div className="w-5 h-5 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-[8px] font-bold shrink-0">
            {getInitials(emp.name)}
          </div>
        ),
        action: () => go(`/employees/${emp.id}`),
      }));

    return [...quickActions, ...navItems, ...empItems];
  }, [go]);

  /* Filter items */
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allItems.filter(i => i.group === 'Quick Actions' || i.group === 'Navigate');
    return allItems.filter(i =>
      i.label.toLowerCase().includes(q) ||
      (i.sublabel?.toLowerCase().includes(q))
    );
  }, [query, allItems]);

  /* Group filtered */
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return map;
  }, [filtered]);

  /* Flat index map for keyboard nav */
  const flatItems = useMemo(() => filtered, [filtered]);

  /* Reset on open */
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  /* Sync cursor when filtered changes */
  useEffect(() => { setCursor(0); }, [query]);

  /* Keyboard navigation */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatItems[cursor]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  /* Scroll active item into view */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cursor="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, employees, actions…"
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
                {flatItems.length === 0 && (
                  <p className="text-center py-8 text-sm text-gray-400">No results for "{query}"</p>
                )}

                {Array.from(grouped.entries()).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-1.5">{group}</p>
                    {items.map(item => {
                      const idx = globalIndex++;
                      const isActive = cursor === idx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-cursor={idx}
                          onClick={item.action}
                          onMouseEnter={() => setCursor(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[10px] text-gray-400 truncate">{item.sublabel}</p>
                            )}
                          </div>
                          {isActive && <ArrowRight size={13} className="text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer hints */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Keyboard size={11} />
                  <kbd className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded text-[9px]">↑↓</kbd> navigate
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <kbd className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded text-[9px]">↵</kbd> select
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <kbd className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded text-[9px]">Esc</kbd> close
                </div>
                <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600">{flatItems.length} results</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
