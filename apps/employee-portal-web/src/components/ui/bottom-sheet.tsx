import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// Shared bottom-sheet primitive (extracted from MoreSheet, which was the
// first place this pattern was needed) — used anywhere a small modal dialog
// would otherwise appear, since a centered modal is a poor mobile pattern.
// Built on framer-motion (already a dependency), no Radix Dialog installed.
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 bg-white dark:bg-gray-900">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pb-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
