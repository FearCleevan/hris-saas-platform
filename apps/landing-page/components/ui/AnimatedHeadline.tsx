'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const rotatingWords = [
  'Payroll',
  'Compliance',
  'Attendance',
  'Performance',
  'Benefits',
];

export function AnimatedHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % rotatingWords.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-foreground">
      Automate Your{' '}
      <span className="relative inline-flex flex-col h-[1.2em] overflow-hidden align-bottom">
        <AnimatePresence mode="wait">
          <motion.span
            key={rotatingWords[index]}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-[#0038a8] dark:text-blue-400 inline-block whitespace-nowrap"
          >
            {rotatingWords[index]}
          </motion.span>
        </AnimatePresence>
      </span>
      {'\t'}
      <span className="text-[#ce1126]">the Filipino Way</span>
    </h1>
  );
}
