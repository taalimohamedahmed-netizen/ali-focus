'use client';

import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from 'react';
import { User } from '@/types';
import { supabaseConfigured } from '@/lib/supabase';
import {
  Workspace, EMPTY_WORKSPACE, loadWorkspace, loginOrCreate,
} from '@/lib/api';

const USER_KEY = 'aliFocusUser';
const POLL_MS = 15000;

interface AppContextType {
  configured: boolean;
  user: User | null;
  ws: Workspace;
  loading: boolean;
  tick: number; // 1s heartbeat for live timers
  login: (name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ws, setWs] = useState<Workspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const userRef = useRef<User | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured || !userRef.current) return;
    const data = await loadWorkspace();
    setWs(data);
  }, []);

  // restore logged-in user from localStorage (after mount, to stay SSR-safe)
  useEffect(() => {
    let restored: User | null = null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) restored = JSON.parse(raw) as User;
    } catch { /* ignore */ }
    userRef.current = restored;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(restored);
    setLoading(false);
  }, []);

  // load + poll while logged in
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await loadWorkspace();
      if (alive) { setWs(data); setLoading(false); }
    })();
    const poll = setInterval(() => { void refresh(); }, POLL_MS);
    return () => { alive = false; clearInterval(poll); };
  }, [user, refresh]);

  // 1s heartbeat for running session timers
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const res = await loginOrCreate(name, password);
    if (!res.ok) return { ok: false, error: res.error };
    userRef.current = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    userRef.current = null;
    setUser(null);
    setWs(EMPTY_WORKSPACE);
  }, []);

  return (
    <AppContext.Provider
      value={{ configured: supabaseConfigured, user, ws, loading, tick, login, logout, refresh }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
