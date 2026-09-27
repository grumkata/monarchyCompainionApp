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
  /* a waiting PAGE is a reload of this window; a waiting PROGRAM is a quit
     and reinstall — updater.js decides which, the page does not need to */
  restartNow() { ipcRenderer.send('update-restart-now'); }
});

// window.AppCover: the loading screen the SHELL lays over this page, in a
// process of its own (electron/cover.js), so it is up before this page has
// drawn anything and keeps moving while this page is busy. The page reports
// how far its parse has got and when it is standing, and asks for the cover
// over a transition. wipe() and lift() resolve { ok:true } once the cover has
// actually done it, and { ok:false } when there is no cover (a page older
// than the shell's cover) — the page then uses its own. Like AppUpdate, it is
// undefined wherever this preload is not attached, and every caller checks.
contextBridge.exposeInMainWorld('AppCover', {
  progress(u) { ipcRenderer.send('app-cover:progress', u); },
  ready() { ipcRenderer.send('app-cover:ready'); },
  wipe(o) { return ipcRenderer.invoke('app-cover:wipe', o); },
  lift() { return ipcRenderer.invoke('app-cover:lift'); }
});
