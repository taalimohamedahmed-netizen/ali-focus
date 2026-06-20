// Screen-capture accountability: when a focus session starts we grab 1-3
// frames at random moments during the session and upload them to Supabase
// Storage for later review.
//
// Two backends:
//  - Desktop (Electron): scheduling runs in the main process (never throttled
//    by window state), screenshots are SILENT (no prompt, no banner). The
//    renderer just receives each shot and uploads it.
//  - Browser: getDisplayMedia, which needs a user gesture + a share prompt and
//    shows the "sharing your screen" indicator (browser security). Timers run
//    in the page, so this only works while the tab stays awake.

import { supabase } from './supabase';

const BUCKET = 'screenshots';

interface Shot { sessionId: string; userId: string; dataUrl: string }
interface ElectronCapture {
  grab: () => Promise<string | null>;
  start: (p: { sessionId: string; userId: string; durationMin: number }) => void;
  stop: () => void;
  onShot: (cb: (s: Shot) => void) => void;
}
function electron(): ElectronCapture | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronCapture?: ElectronCapture }).electronCapture ?? null;
}

let stream: MediaStream | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
let shotBound = false;

// On desktop, register the upload handler once. Main process fires 'capture-shot'.
function bindShotHandler() {
  const el = electron();
  if (!el || shotBound) return;
  shotBound = true;
  el.onShot(async ({ sessionId, userId, dataUrl }) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await uploadBlob(sessionId, userId, blob);
    } catch { /* ignore */ }
  });
}

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
  if (electron()) { bindShotHandler(); return true; }
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

// Capture periodically: one shot soon after start, then a jittered shot every
// few minutes until the session is paused/finished (stopCapture clears timers).
const FIRST_SHOT_MS = 20_000;       // first frame ~20-40s in
const MIN_GAP_MS = 3 * 60_000;      // then one every 3-6 min
const MAX_EXTRA_MS = 3 * 60_000;

export function beginSchedule(sessionId: string, userId: string, durationMin: number) {
  const el = electron();
  if (el) {
    bindShotHandler();
    el.start({ sessionId, userId, durationMin }); // main process schedules + grabs
    return;
  }

  if (!isCapturing()) return;
  clearTimers();

  const scheduleNext = (delay: number) => {
    timers.push(setTimeout(async () => {
      if (!isCapturing()) return;          // stream ended → stop the chain
      await captureFromStream(sessionId, userId);
      scheduleNext(MIN_GAP_MS + Math.random() * MAX_EXTRA_MS);
    }, delay));
  };

  scheduleNext(FIRST_SHOT_MS + Math.random() * 20_000);
}

async function uploadBlob(sessionId: string, userId: string, blob: Blob) {
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

// Browser-only: draw the shared stream to a canvas and upload.
async function captureFromStream(sessionId: string, userId: string) {
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track || track.readyState !== 'live') return;

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
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, w, h);
  video.pause();
  video.srcObject = null;

  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.7));
  if (blob) await uploadBlob(sessionId, userId, blob);
}

function clearTimers() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

export function stopCapture() {
  electron()?.stop();
  clearTimers();
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}
