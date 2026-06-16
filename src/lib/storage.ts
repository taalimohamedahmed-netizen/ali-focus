import { AppData, DayData, Deadline, createEmptyDayData } from '@/types';

const STORAGE_KEY = 'ali-focus-data';

function getEmptyData(): AppData {
  return { days: {}, deadlines: [] };
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return getEmptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getEmptyData();
    return JSON.parse(raw) as AppData;
  } catch {
    return getEmptyData();
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  data.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDayData(data: AppData, date: string): DayData {
  if (!data.days[date]) {
    data.days[date] = createEmptyDayData(date);
  }
  return data.days[date];
}

export function ensureTodayData(data: AppData): { data: AppData; today: DayData; todayISO: string } {
  const todayISO = new Date().toISOString().slice(0, 10);
  if (!data.days[todayISO]) {
    data.days[todayISO] = createEmptyDayData(todayISO);
  }
  return { data, today: data.days[todayISO], todayISO };
}

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): AppData | null {
  try {
    const data = JSON.parse(json);
    if (!data.days || typeof data.days !== 'object') return null;
    if (!Array.isArray(data.deadlines)) return null;
    return data as AppData;
  } catch {
    return null;
  }
}
