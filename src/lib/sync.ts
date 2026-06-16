import { AppData } from '@/types';

const PASSWORD_KEY = 'ali-focus-sync-password';

export function getPassword(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PASSWORD_KEY) || '';
}

export function setPassword(pw: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PASSWORD_KEY, pw);
}

export function clearPassword(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PASSWORD_KEY);
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'unauthorized' | 'disabled';

export interface FetchResult {
  status: SyncStatus;
  data: AppData | null;
}

// Pull the latest data from the server.
export async function fetchRemote(): Promise<FetchResult> {
  try {
    const res = await fetch('/api/data', {
      headers: { 'x-sync-password': getPassword() },
      cache: 'no-store',
    });
    if (res.status === 501) return { status: 'disabled', data: null };
    if (res.status === 401) return { status: 'unauthorized', data: null };
    if (!res.ok) return { status: 'offline', data: null };
    const json = await res.json();
    if (json.configured === false) return { status: 'disabled', data: null };
    return { status: 'synced', data: (json.data as AppData) ?? null };
  } catch {
    return { status: 'offline', data: null };
  }
}

// Push the full data document to the server.
export async function pushRemote(data: AppData): Promise<SyncStatus> {
  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-password': getPassword(),
      },
      body: JSON.stringify(data),
    });
    if (res.status === 501) return 'disabled';
    if (res.status === 401) return 'unauthorized';
    if (!res.ok) return 'offline';
    return 'synced';
  } catch {
    return 'offline';
  }
}
