import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authApi, type AuthUser, type UsageInfo } from "@/lib/auth-api";

interface AuthContextValue {
  user: AuthUser | null;
  usage: UsageInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me.user);
      setUsage(me.usage);
    } catch {
      setUser(null);
      setUsage(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await authApi.register(email, password, displayName);
    setUser(res.user);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    setUser(null);
    setUsage(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, usage, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
