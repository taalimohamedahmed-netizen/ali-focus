// Exposes a silent screenshot API to the web app. capture.ts detects
// window.electronCapture and uses it instead of the browser's getDisplayMedia.
//
// Scheduling runs in the main process; the renderer just receives each shot
// (as a data URL) and uploads it to Supabase.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronCapture', {
  grab: () => ipcRenderer.invoke('capture-screen'),
  start: (payload) => ipcRenderer.send('start-capture', payload),
  stop: () => ipcRenderer.send('stop-capture'),
  onShot: (cb) => ipcRenderer.on('capture-shot', (_e, data) => cb(data)),
});
