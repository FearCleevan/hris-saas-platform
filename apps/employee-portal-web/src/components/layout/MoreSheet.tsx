import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { navItems } from './navConfig';

const MORE_PATHS = ['/expenses', '/documents', '/performance', '/benefits', '/notifications', '/settings'];

// navConfig's icons are already correct per-item — reuse them instead of a
// second hardcoded icon map that could drift out of sync.
const moreItems = navItems.filter((item) => MORE_PATHS.includes(item.path));

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

// Custom bottom sheet (no Radix Dialog/Sheet primitive installed in this
// app) built on framer-motion, which is already a dependency — avoids
// adding a new package for one component.
export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-label="More"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">More</p>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 px-4 pb-6 pt-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 dark:bg-gray-800 py-4 text-center min-h-22"
                  >
                    <Icon size={22} className="text-brand-blue" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
