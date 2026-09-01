import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { MoreSheet } from '@/components/layout/MoreSheet';
import type { DashboardOutletContext } from './dashboardOutletContext';

// Desktop (md+) keeps the existing sidebar — it already works well with the
// extra horizontal space. Mobile gets the new primary nav: a bottom tab bar
// (BottomTabBar) for the 4 highest-frequency domains plus a "More" bottom
// sheet (MoreSheet) for the rest, replacing the old hamburger-drawer-sidebar
// pattern, which doesn't fit the mobile-first redesign.
export function DashboardLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const outletContext: DashboardOutletContext = { openMore: () => setMoreOpen(true) };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6 overflow-auto">
          <Outlet context={outletContext} />
        </main>
      </div>
      <BottomTabBar onMoreClick={() => setMoreOpen(true)} moreActive={moreOpen} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
