// Screen-capture accountability: when a focus session starts we grab 1-3
// frames at random moments during the session and upload them to Supabase
// Storage for later review.
//
// Two backends:
//  - Desktop (Electron): window.electronCapture.grab() takes a SILENT
//    screenshot via the main process — no permission prompt, no banner.
//  - Browser: getDisplayMedia, which needs a user gesture + a share prompt
//    and shows the "sharing your screen" indicator (browser security).

import { supabase } from './supabase';

const BUCKET = 'screenshots';

interface ElectronCapture { grab: () => Promise<string | null> }
function electron(): ElectronCapture | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronCapture?: ElectronCapture }).electronCapture ?? null;
}

let stream: MediaStream | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

export function isDesktop(): boolean {
  return electron() != null;
}

export function isCapturing(): boolean {
  if (electron()) return true;
  return stream != null && stream.getVideoTracks().some(t => t.readyState === 'live');
}

// Acquire whatever the backend needs. On desktop this is a no-op (silent).
// In the browser it MUST run synchronously inside a click handler (before any
// other await) to keep the user gesture valid.
export async function requestScreen(): Promise<boolean> {
  if (electron()) return true; // silent desktop capture, always available
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return false;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 }, audio: false });
  } catch {
    stream = null;
    return false;
  }
  stream.getVideoTracks().forEach(t => t.addEventListener('ended', stopCapture));
  return true;
}

// Schedule 1-3 captures at random points within the session duration.
export function beginSchedule(sessionId: string, userId: string, durationMin: number) {
  if (!isCapturing()) return;
  clearTimers();

  const total = Math.max(1, durationMin) * 60_000;
  const count = 1 + Math.floor(Math.random() * 3); // 1..3
  const offsets = Array.from({ length: count }, () => Math.random() * total)
    .map(o => Math.max(3_000, o))
    .sort((a, b) => a - b);

  for (const at of offsets) {
    timers.push(setTimeout(() => { void captureFrame(sessionId, userId); }, at));
  }
  if (!electron()) timers.push(setTimeout(stopCapture, total + 5_000));
}

async function grabBlob(): Promise<Blob | null> {
  const el = electron();
  if (el) {
    const dataUrl = await el.grab();
    if (!dataUrl) return null;
    return (await fetch(dataUrl)).blob();
  }
  if (!stream) return null;
  const track = stream.getVideoTracks()[0];
  if (!track || track.readyState !== 'live') return null;

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  try { await video.play(); } catch { /* ignore */ }
  await new Promise(r => setTimeout(r, 300));

  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  video.pause();
  video.srcObject = null;
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7));
}

async function captureFrame(sessionId: string, userId: string) {
  const blob = await grabBlob();
  if (!blob) return;

  const ext = blob.type.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${sessionId}/${Date.now()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg', upsert: false,
  });
  if (up.error) return;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  await supabase.from('screenshots').insert({
    session_id: sessionId,
    user_id: userId,
    path,
    url: pub.publicUrl,
    captured_at: new Date().toISOString(),
  });
}

function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

export function stopCapture() {
  clearTimers();
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}
