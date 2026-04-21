'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { DemoModal } from '@/components/sections/DemoModal';

interface DemoModalContextValue {
  open: () => void;
}

const DemoModalContext = createContext<DemoModalContextValue>({ open: () => {} });

export function useDemoModal() {
  return useContext(DemoModalContext);
}

export function DemoModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DemoModalContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      <DemoModal open={isOpen} onOpenChange={setIsOpen} />
    </DemoModalContext.Provider>
  );
}
