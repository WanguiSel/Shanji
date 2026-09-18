import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  profile: Record<string, unknown> | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: (session.user.email ?? null) as unknown as string,
        full_name: session.user.user_metadata?.full_name ?? null,
        avatar_url: session.user.user_metadata?.avatar_url ?? null,
        role: (session.user.user_metadata?.role ?? 'member') as string,
        organization_id: session.user.user_metadata?.organization_id ?? null,
        organization_ids: null,
        department: null,
        project_roles: {},
      });
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const { data: membersData } = await supabase.from('project_members').select('project_id, role').eq('user_id', session.user.id);
      const rolesMap: Record<string, string> = {};
      (membersData || []).forEach((m: any) => { rolesMap[m.project_id] = m.role; });
      if (profileData) {
        setProfile(profileData as Record<string, unknown>);
        if (profileData.role && !session.user.user_metadata?.role) {
          await supabase.auth.updateUser({ data: { role: profileData.role } });
        }
      }
      setUser((prev) => prev ? { ...prev, project_roles: rolesMap } : prev);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: (session.user.email ?? null) as unknown as string,
          full_name: session.user.user_metadata?.full_name ?? null,
          avatar_url: session.user.user_metadata?.avatar_url ?? null,
          role: (session.user.user_metadata?.role ?? 'member') as string,
          organization_id: session.user.user_metadata?.organization_id ?? null,
          organization_ids: null,
          department: null,
          project_roles: {},
        });
        const { data: profileData2 } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const { data: membersData2 } = await supabase.from('project_members').select('project_id, role').eq('user_id', session.user.id);
        const rolesMap2: Record<string, string> = {};
        (membersData2 || []).forEach((m: any) => { rolesMap2[m.project_id] = m.role; });
        if (profileData2) setProfile(profileData2 as Record<string, unknown>);
        setUser((prev) => prev ? { ...prev, project_roles: rolesMap2 } : prev);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => { subscription.unsubscribe(); };
  }, [loadUser]);

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
    await supabase.auth.signOut();
  }, []);

  const hasRole = useCallback((role: string) => {
    if (!profile) return false;
    return profile.role === role;
  }, [profile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}