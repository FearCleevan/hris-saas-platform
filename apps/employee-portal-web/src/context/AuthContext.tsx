import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured, fetchEmployeeContext } from '@/lib/supabase';
import type { EmployeeUser } from '@/types';

interface AuthContextValue {
  user: EmployeeUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  // True when a real Supabase session exists but resolves to no `employees`
  // row (e.g. an HR-only admin account, not an employee) — a distinct case
  // from "not signed in at all," so the UI can say why instead of silently
  // bouncing back to the login form.
  noEmployeeRecord: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Real Supabase Auth session, resolved to an `employees` row via
// fetchEmployeeContext. `loading` starts true so ProtectedRoute doesn't
// redirect to /login before the session has had a chance to load from
// storage — a real redirect flash on every page refresh otherwise.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolveSession(userId: string | undefined, email: string | undefined) {
      if (!userId) {
        if (!cancelled) {
          setUser(null);
          setNoEmployeeRecord(false);
        }
        return;
      }
      const employee = await fetchEmployeeContext(userId, email ?? '');
      if (!cancelled) {
        setUser(employee);
        setNoEmployeeRecord(!employee);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveSession(session?.user.id, session?.user.email).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session?.user.id, session?.user.email);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: 'Supabase is not configured for this environment.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function logout(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setNoEmployeeRecord(false);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, noEmployeeRecord, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
