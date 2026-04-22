import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Search, Users, ChevronRight, LogOut, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import tenantsData from '@/data/mock/tenants.json';
import type { Tenant } from '@/types';

const planConfig = {
  starter: { label: 'Starter', variant: 'secondary' as const },
  pro: { label: 'Pro', variant: 'default' as const },
  enterprise: { label: 'Enterprise', variant: 'success' as const },
};

export default function TenantSelectorPage() {
  const navigate = useNavigate();
  const { user, setTenant, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [selecting, setSelecting] = useState<string | null>(null);

  const accessibleTenants = tenantsData.filter((t) =>
    user?.tenantIds.includes(t.id)
  );

  const filtered = accessibleTenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.industry.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (tenant: typeof tenantsData[0]) => {
    setSelecting(tenant.id);
    await new Promise((r) => setTimeout(r, 500));
    setTenant(tenant as Tenant);
    toast.success(`Welcome to ${tenant.name}`);
    navigate('/');
    setSelecting(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 bg-[#0038a8] rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-base">H</span>
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">HRISPH</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
            Select company
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Hi {user?.name?.split(' ')[0]}! Choose the company you&apos;d like to manage.
          </p>
        </div>

        {/* Search */}
        {accessibleTenants.length > 2 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search companies…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Tenant list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              No companies found.
            </div>
          ) : (
            filtered.map((tenant, i) => (
              <motion.button
                key={tenant.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(tenant)}
                disabled={!!selecting}
                className="group w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-[#0038a8] hover:shadow-md transition-all duration-200 text-left cursor-pointer disabled:opacity-70"
              >
                {/* Logo placeholder */}
                <div className="w-11 h-11 rounded-xl bg-[#0038a8]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#0038a8]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {tenant.name}
                    </span>
                    <Badge variant={planConfig[tenant.plan as keyof typeof planConfig]?.variant ?? 'secondary'} className="shrink-0">
                      {planConfig[tenant.plan as keyof typeof planConfig]?.label ?? tenant.plan}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {tenant.employeeCount} employees
                    </span>
                    <span>{tenant.industry}</span>
                    <span className="truncate hidden sm:block">{tenant.location}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="shrink-0">
                  {selecting === tenant.id ? (
                    <span className="w-5 h-5 border-2 border-[#0038a8]/30 border-t-[#0038a8] rounded-full animate-spin block" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#0038a8] group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Set up new company */}
        <div className="mt-4">
          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 shrink-0">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            type="button"
            onClick={() => navigate('/setup-company')}
            className="group w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl hover:border-brand-blue hover:bg-brand-blue/3 transition-all duration-200 text-left cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-brand-blue/10 flex items-center justify-center shrink-0 transition-colors">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-brand-blue transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white text-sm transition-colors">
                Set up a new company
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Register your organization and start a free 30-day trial
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mx-auto mt-6"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
