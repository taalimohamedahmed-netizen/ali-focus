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
const POLL_MS = 10000;
const VERSION_POLL_MS = 60000;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/ali-focus';

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

  // Pull fresh data whenever the tab becomes visible / regains focus, so a
  // teammate's update shows up the moment you look at the app again.
  useEffect(() => {
    const onWake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [refresh]);

  // Auto-reload when a new app version is deployed (beats GitHub Pages cache).
  // Compares the version seen at load against the live version.json.
  useEffect(() => {
    let loaded: string | null = null;
    const check = async () => {
      try {
        const r = await fetch(`${BASE_PATH}/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const { v } = await r.json();
        if (!v) return;
        if (loaded == null) loaded = v;
        else if (v !== loaded) window.location.reload();
      } catch { /* offline / not deployed yet — ignore */ }
    };
    void check();
    const id = setInterval(check, VERSION_POLL_MS);
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
