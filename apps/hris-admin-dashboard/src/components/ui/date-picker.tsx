import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const DAY_PICKER_CLASSES = {
  root:             'w-full select-none',
  months:           'relative',
  month:            'w-full',
  month_caption:    'flex items-center justify-between px-1 mb-3',
  caption_label:    'text-sm font-semibold text-gray-900 dark:text-white',
  nav:              'flex items-center gap-1',
  button_previous:  cn(
    'w-7 h-7 rounded-lg flex items-center justify-center',
    'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
    'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
  ),
  button_next: cn(
    'w-7 h-7 rounded-lg flex items-center justify-center',
    'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
    'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
  ),
  month_grid:  'w-full border-collapse',
  weekdays:    'flex mb-1',
  weekday:     'flex-1 text-center text-[11px] font-medium text-gray-400 dark:text-gray-500 py-1',
  weeks:       'flex flex-col gap-1',
  week:        'flex',
  day:         'flex-1 flex items-center justify-center p-0',
  day_button:  cn(
    'w-8 h-8 rounded-lg text-sm transition-colors',
    'text-gray-700 dark:text-gray-300',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    'focus:outline-none focus:ring-2 focus:ring-brand-blue/40',
    'disabled:opacity-30 disabled:cursor-not-allowed',
  ),
  selected:    '[&>button]:bg-brand-blue [&>button]:text-white [&>button]:hover:bg-brand-blue-dark',
  today:       '[&>button]:font-bold [&>button]:text-brand-blue',
  outside:     '[&>button]:opacity-30',
  disabled:    '[&>button]:opacity-30 [&>button]:cursor-not-allowed',
  hidden:      'invisible',
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = value && isValid(parseISO(value)) ? parseISO(value) : undefined;

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popH  = 320;
    const above = window.innerHeight - rect.bottom < popH && rect.top > popH;
    setPos({
      top:   above ? rect.top - popH - 8 : rect.bottom + 8,
      left:  Math.min(rect.left, window.innerWidth - Math.max(rect.width, 288) - 8),
      width: Math.max(rect.width, 288),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { calcPos(); setOpen((v) => !v); } }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors',
          'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-brand-blue/40',
          selected ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400',
          open && 'border-brand-blue ring-2 ring-brand-blue/40',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
      >
        <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected ? format(selected, 'MMMM d, yyyy') : placeholder}
        </span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? new Date()}
            classNames={DAY_PICKER_CLASSES}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />,
            }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
