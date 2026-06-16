import { Workspace } from '@/lib/api';

export function nameOf(ws: Workspace, id: string | null | undefined): string {
  if (!id) return '—';
  return ws.users.find(u => u.id === id)?.name ?? '—';
}
