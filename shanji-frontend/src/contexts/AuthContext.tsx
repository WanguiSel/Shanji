import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

const ROLE_STORAGE_KEY = "shanji.role";

interface AuthContextType {
  user: User | null;
  profile: Record<string, unknown> | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  selectRole: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // The live database exposes the profile table as "Profiles".
    const { data: profileData } = await supabase
      .from("Profiles")
      .select("*")
      .eq("id", sessionUser.id)
      .maybeSingle();

    const metadata = sessionUser.user_metadata || {};
    const storedRole = typeof window !== "undefined" ? window.localStorage.getItem(ROLE_STORAGE_KEY) : null;
    const role = (profileData?.role as string | undefined)
      || (metadata.role as string | undefined)
      || storedRole
      || "member";

    setProfile((profileData as Record<string, unknown> | null) ?? null);
    setUser({
      id: sessionUser.id,
      email: sessionUser.email ?? (profileData?.email as string | null) ?? "",
      full_name: (profileData?.full_name as string | null) ?? (metadata.full_name as string | null) ?? null,
      avatar_url: (profileData?.avatar_url as string | null) ?? (metadata.avatar_url as string | null) ?? null,
      role,
      organization_id: (profileData?.organization_id as string | null) ?? (metadata.organization_id as string | null) ?? null,
      organization_ids: null,
      department: (profileData?.department as string | null) ?? (profileData?.department_id as string | null) ?? null,
      project_roles: {},
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) hydrate(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) hydrate(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'member' } },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    await supabase.auth.signOut();
  }, []);

  const hasRole = useCallback((role: string) => {
    return user?.role === role || user?.role === "admin";
  }, [user]);

  const selectRole = useCallback(async (role: string) => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    setUser((prev) => (prev ? { ...prev, role } : prev));
    await supabase.auth.updateUser({ data: { role } });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, hasRole, selectRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}