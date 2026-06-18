// Ali Focus desktop wrapper.
// Loads the live web app and adds SILENT screenshot capture (no permission
// prompt, no "sharing screen" banner) via Electron's desktopCapturer.
//
// Capture scheduling lives HERE in the main process (Node timers) so it is
// never throttled when the window is minimized or in the background — the
// whole point is to capture while the user works in another app.

const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');

// The web app the desktop window shows. Same Supabase backend as the browser
// version, so desktop + web users share all data.
const APP_URL = process.env.ALI_FOCUS_URL || 'https://taalimohamedahmed-netizen.github.io/ali-focus/';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    title: 'Ali Focus',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep JS running full speed when minimized/background.
      backgroundThrottling: false,
    },
  });
  win.removeMenu();
  win.webContents.setBackgroundThrottling(false);
  win.loadURL(APP_URL);
}

// Silent full-screen screenshot. Returns a PNG data URL (or null).
async function grabDataUrl() {
  try {
    const display = screen.getPrimaryDisplay();
    const sf = display.scaleFactor || 1;
    const { width, height } = display.size;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.round(width * sf), height: Math.round(height * sf) },
    });
    if (!sources.length) return null;
    return sources[0].thumbnail.toDataURL();
  } catch {
    return null;
  }
}

// One-off grab (kept for completeness / manual use).
ipcMain.handle('capture-screen', () => grabDataUrl());

// Scheduled captures, driven by the main process so window state can't stop them.
let captureTimers = [];
function clearCaptureTimers() {
  captureTimers.forEach(t => clearTimeout(t));
  captureTimers = [];
}

ipcMain.on('start-capture', (e, { sessionId, userId, durationMin }) => {
  clearCaptureTimers();
  const wc = e.sender;
  const total = Math.max(1, durationMin) * 60_000;
  const count = 1 + Math.floor(Math.random() * 3); // 1..3
  const offsets = Array.from({ length: count }, () => Math.random() * total)
    .map(o => Math.max(5_000, o)) // never before 5s
    .sort((a, b) => a - b);

  for (const at of offsets) {
    captureTimers.push(setTimeout(async () => {
      const dataUrl = await grabDataUrl();
      if (dataUrl && !wc.isDestroyed()) {
        wc.send('capture-shot', { sessionId, userId, dataUrl });
      }
    }, at));
  }
});

ipcMain.on('stop-capture', () => clearCaptureTimers());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
