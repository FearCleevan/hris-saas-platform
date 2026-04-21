'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

const variants: Record<NonNullable<AnimateInProps['direction']>, Variants> = {
  up: {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0 },
  },
  down: {
    hidden: { opacity: 0, y: -32 },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: 48 },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: -48 },
    visible: { opacity: 1, x: 0 },
  },
  none: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

export function AnimateIn({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 0.6,
}: AnimateInProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      variants={variants[direction]}
    >
      {children}
    </motion.div>
  );
}
