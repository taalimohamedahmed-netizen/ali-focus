// WebAudio sound effects — no assets. Respects a mute flag in localStorage.
// Only ever triggered after a user interaction (clicks / timers), so no
// autoplay-policy issues.

const MUTE_KEY = 'aliFocusMute';

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

type Sound = 'session_finished' | 'break_finished' | 'commitment_completed' | 'penalty_applied';

const PATTERNS: Record<Sound, { freq: number; t: number; dur: number; type?: OscillatorType }[]> = {
  session_finished: [
    { freq: 880, t: 0, dur: 0.18 },
    { freq: 1320, t: 0.16, dur: 0.4 },
  ],
  break_finished: [
    { freq: 660, t: 0, dur: 0.25, type: 'sine' },
    { freq: 880, t: 0.2, dur: 0.3, type: 'sine' },
  ],
  commitment_completed: [
    { freq: 660, t: 0, dur: 0.15 },
    { freq: 880, t: 0.14, dur: 0.15 },
    { freq: 1320, t: 0.28, dur: 0.5 },
  ],
  penalty_applied: [
    { freq: 200, t: 0, dur: 0.35, type: 'sawtooth' },
    { freq: 140, t: 0.3, dur: 0.4, type: 'sawtooth' },
  ],
};

export function playSound(sound: Sound) {
  if (typeof window === 'undefined' || isMuted()) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    for (const note of PATTERNS[sound]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? 'sine';
      osc.frequency.value = note.freq;
      const start = now + note.t;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.dur);
    }
    setTimeout(() => ctx.close(), 1800);
  } catch { /* audio unavailable */ }
}

// Back-compat alias used by older callers.
export function playChime() { playSound('session_finished'); }
