// Shared type for DashboardLayout's <Outlet context={...}> so pages (e.g.
// DashboardPage's QuickActionGrid) can open the same MoreSheet the
// BottomTabBar controls, without a new global store for one boolean.
export interface DashboardOutletContext {
  openMore: () => void;
}
