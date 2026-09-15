// electron/preload.js
//
// The one deliberate hole in an otherwise sealed renderer
// (contextIsolation: true, sandbox: true, nodeIntegration: false — see
// main.js). Runs in its own isolated world with a little Node/Electron
// access, and hands the page exactly two verbs and one inbound channel
// through `contextBridge` — nothing that looks like `require`, nothing
// that reaches the filesystem, nothing the page could use to do anything
// this wasn't built for.
//
// window.AppUpdate is what src/js/16-menu.js reads. It is undefined
// everywhere this app runs WITHOUT this preload attached — a plain
// browser via test/serve.js, or an Electron window opened by
// tools/shot.js — both of which build their own BrowserWindow with no
// `preload` set. Every consumer of window.AppUpdate has to check it
// exists before touching it for exactly that reason.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AppUpdate', {
  // status is pushed, not pulled — the renderer never asks "what's the
  // state right now", main just tells it every time something changes,
  // starting with one push right after this listener is wired (see
  // updater.js's pushStatus at the end of setupAutoUpdater).
  onStatus(cb) {
    ipcRenderer.on('update-status', (_event, status) => cb(status));
  },
  checkNow() { ipcRenderer.send('update-check-now'); },
  restartNow() { ipcRenderer.send('update-restart-now'); }
});
