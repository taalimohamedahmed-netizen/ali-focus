// Ali Focus desktop wrapper.
// Loads the live web app and adds SILENT screenshot capture (no permission
// prompt, no "sharing screen" banner) via Electron's desktopCapturer.

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
    },
  });
  win.removeMenu();
  win.loadURL(APP_URL);
}

// Silent full-screen screenshot. Returns a PNG data URL (or null).
ipcMain.handle('capture-screen', async () => {
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
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
