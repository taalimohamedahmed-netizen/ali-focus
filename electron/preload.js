// Exposes a silent screenshot API to the web app. capture.ts detects
// window.electronCapture and uses it instead of the browser's getDisplayMedia.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronCapture', {
  grab: () => ipcRenderer.invoke('capture-screen'),
});
