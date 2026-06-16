'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppData, DayData, Task, Deadline, FocusBlock } from '@/types';
import {
  loadData,
  saveData,
  getDayData,
} from '@/lib/storage';
import { fetchRemote, pushRemote, setPassword, SyncStatus } from '@/lib/sync';

interface AppContextType {
  data: AppData;
  todayData: DayData;
  todayISO: string;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  toggleTaskDone: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  startBlock: (blockId: string) => void;
  pauseBlock: (blockId: string) => void;
  finishBlock: (blockId: string) => void;
  setNotes: (notes: string) => void;
  addDeadline: (deadline: Omit<Deadline, 'id' | 'createdAt'>) => void;
  toggleDeadlineDone: (deadlineId: string) => void;
  deleteDeadline: (deadlineId: string) => void;
  completedBlocksCount: number;
  totalTodaySeconds: number;
  exportJson: () => string;
  importJson: (json: string) => boolean;
  syncStatus: SyncStatus;
  needsPassword: boolean;
  submitPassword: (pw: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({ days: {}, deadlines: [] });
  const [todayData, setTodayData] = useState<DayData>(() => getDayData(data, getTodayISO()));
  const todayISO = useRef(getTodayISO());
  const [tick, setTick] = useState(0);
  const initialized = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [needsPassword, setNeedsPassword] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPush = useRef(true);

  // Load local data immediately, then reconcile with the cloud copy.
  useEffect(() => {
    const saved = loadData();
    const iso = getTodayISO();
    todayISO.current = iso;
    const day = getDayData(saved, iso);
    setData(saved);
    setTodayData({ ...day });
    initialized.current = true;

    (async () => {
      setSyncStatus('syncing');
      const result = await fetchRemote();
      if (result.status === 'disabled') {
        setSyncStatus('disabled');
        return;
      }
      if (result.status === 'unauthorized') {
        setNeedsPassword(true);
        setSyncStatus('unauthorized');
        return;
      }
      if (result.status === 'offline') {
        setSyncStatus('offline');
        return;
      }
      const remote = result.data;
      const localUpdated = saved.updatedAt ?? 0;
      const remoteUpdated = remote?.updatedAt ?? 0;
      if (remote && remoteUpdated >= localUpdated) {
        // Cloud is the source of truth — adopt it without re-pushing.
        skipNextPush.current = true;
        saveData(remote);
        setData(remote);
        setTodayData({ ...getDayData(remote, todayISO.current) });
        setSyncStatus('synced');
      } else {
        // Local is newer (or remote is empty) — push it up.
        await pushRemote(saved);
        setSyncStatus('synced');
      }
    })();
  }, []);

  // Debounced push of any local change to the cloud.
  useEffect(() => {
    if (!initialized.current) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (syncStatus === 'disabled') return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    setSyncStatus('syncing');
    pushTimer.current = setTimeout(async () => {
      const status = await pushRemote(data);
      if (status === 'unauthorized') setNeedsPassword(true);
      setSyncStatus(status);
    }, 800);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const submitPassword = useCallback((pw: string) => {
    setPassword(pw);
    setNeedsPassword(false);
    setSyncStatus('syncing');
    (async () => {
      const result = await fetchRemote();
      if (result.status === 'unauthorized') {
        setNeedsPassword(true);
        setSyncStatus('unauthorized');
        return;
      }
      if (result.status === 'synced') {
        const remote = result.data;
        if (remote) {
          skipNextPush.current = true;
          saveData(remote);
          setData(remote);
          setTodayData({ ...getDayData(remote, todayISO.current) });
        } else {
          await pushRemote(loadData());
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus(result.status);
      }
    })();
  }, []);

  const persist = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
    const day = getDayData(newData, todayISO.current);
    setTodayData({ ...day });
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    setData(prev => {
      const newData = { ...prev, days: { ...prev.days } };
      const day = { ...getDayData(newData, todayISO.current) };
      day.tasks = [...day.tasks, { ...task, id: generateId(), createdAt: new Date().toISOString() }];
      newData.days[todayISO.current] = day;
      saveData(newData);
      setTodayData(day);
      return newData;
    });
  }, []);

  const toggleTaskDone = useCallback((taskId: string) => {
    setData(prev => {
      const newData = { ...prev, days: { ...prev.days } };
      const day = { ...getDayData(newData, todayISO.current) };
      day.tasks = day.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
      newData.days[todayISO.current] = day;
      saveData(newData);
      setTodayData(day);
      return newData;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setData(prev => {
      const newData = { ...prev, days: { ...prev.days } };
      const day = { ...getDayData(newData, todayISO.current) };
      day.tasks = day.tasks.filter(t => t.id !== taskId);
      newData.days[todayISO.current] = day;
      saveData(newData);
      setTodayData(day);
      return newData;
    });
  }, []);

  const updateBlock = useCallback((blockId: string, updater: (block: FocusBlock) => FocusBlock) => {
    setData(prev => {
      const newData = { ...prev, days: { ...prev.days } };
      const day = { ...getDayData(newData, todayISO.current) };
      day.focusBlocks = day.focusBlocks.map(b => b.id === blockId ? updater(b) : b);
      newData.days[todayISO.current] = day;
      saveData(newData);
      setTodayData(day);
      return newData;
    });
  }, []);

  const startBlock = useCallback((blockId: string) => {
    updateBlock(blockId, (b) => ({
      ...b,
      status: 'running',
      startedAt: Date.now(),
    }));
  }, [updateBlock]);

  const pauseBlock = useCallback((blockId: string) => {
    updateBlock(blockId, (b) => {
      const now = Date.now();
      const elapsed = b.startedAt ? (now - b.startedAt) / 1000 : 0;
      return {
        ...b,
        status: 'not_started',
        startedAt: null,
        totalSeconds: b.totalSeconds + elapsed,
      };
    });
  }, [updateBlock]);

  const finishBlock = useCallback((blockId: string) => {
    updateBlock(blockId, (b) => {
      const now = Date.now();
      const elapsed = b.startedAt ? (now - b.startedAt) / 1000 : 0;
      return {
        ...b,
        status: 'done',
        startedAt: null,
        totalSeconds: b.totalSeconds + elapsed,
      };
    });
  }, [updateBlock]);

  const setNotes = useCallback((notes: string) => {
    setData(prev => {
      const newData = { ...prev, days: { ...prev.days } };
      const day = { ...getDayData(newData, todayISO.current) };
      day.notes = notes;
      newData.days[todayISO.current] = day;
      saveData(newData);
      setTodayData(day);
      return newData;
    });
  }, []);

  const addDeadline = useCallback((deadline: Omit<Deadline, 'id' | 'createdAt'>) => {
    setData(prev => {
      const newData = {
        ...prev,
        deadlines: [...prev.deadlines, { ...deadline, id: generateId(), createdAt: new Date().toISOString() }],
      };
      saveData(newData);
      return newData;
    });
  }, []);

  const toggleDeadlineDone = useCallback((deadlineId: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        deadlines: prev.deadlines.map(d => d.id === deadlineId ? { ...d, done: !d.done } : d),
      };
      saveData(newData);
      return newData;
    });
  }, []);

  const deleteDeadline = useCallback((deadlineId: string) => {
    setData(prev => {
      const newData = {
        ...prev,
        deadlines: prev.deadlines.filter(d => d.id !== deadlineId),
      };
      saveData(newData);
      return newData;
    });
  }, []);

  const completedBlocksCount = todayData.focusBlocks.filter(b => b.status === 'done').length;

  const totalTodaySeconds = todayData.focusBlocks.reduce((sum, b) => {
    if (b.status === 'running' && b.startedAt) {
      return sum + b.totalSeconds + (Date.now() - b.startedAt) / 1000;
    }
    return sum + b.totalSeconds;
  }, 0);

  const exportJson = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importJson = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.days || typeof parsed.days !== 'object') return false;
      if (!Array.isArray(parsed.deadlines)) return false;
      setData(parsed);
      saveData(parsed);
      const day = getDayData(parsed, todayISO.current);
      setTodayData({ ...day });
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        data,
        todayData,
        todayISO: todayISO.current,
        addTask,
        toggleTaskDone,
        deleteTask,
        startBlock,
        pauseBlock,
        finishBlock,
        setNotes,
        addDeadline,
        toggleDeadlineDone,
        deleteDeadline,
        completedBlocksCount,
        totalTodaySeconds,
        exportJson,
        importJson,
        syncStatus,
        needsPassword,
        submitPassword,
      }}
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
