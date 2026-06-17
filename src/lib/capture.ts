// Screen-capture accountability: when a focus session starts we ask the user
// once to share their screen, then grab 1-3 frames at random moments during
// the session and upload them to Supabase Storage for later review.
//
// Browser limits (cannot be bypassed in a web app):
//  - getDisplayMedia must be triggered by a user gesture (the Start click).
//  - The browser shows a "you are sharing your screen" indicator.
//  - If the user stops sharing, capture stops. Reloading the page drops the
//    stream (a new gesture is required to share again).

import { supabase } from './supabase';

const BUCKET = 'screenshots';

let stream: MediaStream | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

export function isCapturing(): boolean {
  return stream != null && stream.getVideoTracks().some(t => t.readyState === 'live');
}

// Ask for the screen stream. MUST be called synchronously inside a click
// handler (before any other await) to keep the user gesture valid.
export async function requestScreen(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return false;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 1 },
      audio: false,
    });
  } catch {
    stream = null;
    return false; // user denied or unsupported
  }
  // If the user clicks the browser's "Stop sharing", tear everything down.
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
    .map(o => Math.max(3_000, o)) // never before 3s (let the frame settle)
    .sort((a, b) => a - b);

  for (const at of offsets) {
    timers.push(setTimeout(() => { void captureFrame(sessionId, userId); }, at));
  }
  // Auto-release the stream shortly after the planned duration.
  timers.push(setTimeout(stopCapture, total + 5_000));
}

async function captureFrame(sessionId: string, userId: string) {
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track || track.readyState !== 'live') return;

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  try { await video.play(); } catch { /* ignore */ }
  await new Promise(r => setTimeout(r, 300)); // let a frame paint

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
  if (!blob) return;

  const path = `${userId}/${sessionId}/${Date.now()}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg', upsert: false,
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
