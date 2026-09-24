// electron/main.js
// Main process: opens the built dist/monarchy.html in a plain native
// window. No default Electron menu bar (File/Edit/View/...), no browser
// chrome — this should feel like a real desktop app, not a browser
// wrapper around a webpage.

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { setupAutoUpdater } = require('./updater');
const Content = require('./content');

// Remove Electron's default application menu (File/Edit/View/Window/Help).
Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#0a0705', // the dark room the hall and the table both sit in — avoids a pale flash on load
    autoHideMenuBar: true,      // extra safety net on platforms where a menu bar can reappear
    webPreferences: {
      nodeIntegration: false,   // the app is plain browser JS/HTML/CSS — no Node API surface needed
      contextIsolation: true,
      sandbox: true,
      // The one hole in that seal: exposes window.AppUpdate (see
      // preload.js) so Settings can show real update status and let a
      // player restart into a downloaded update — nothing else about the
      // renderer's access changes. Runs fine sandboxed; contextBridge is
      // exactly what a sandboxed preload is for.
      preload: path.join(__dirname, 'preload.js')
    }
  });

  /* the newest page this copy has — the one it shipped with, or a later one
     fetched from the repo since (content.js) */
  Content.load(win);

  // Uncomment while debugging a packaged build (also note: no default
  // menu means no Ctrl+Shift+I either, since that shortcut normally
  // lives on the View menu — this openDevTools() call is the only way
  // in until/unless a menu gets added back):
  // win.webContents.openDevTools();

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();

  // AFTER the window, not before — the check and any download run in the
  // background against whatever is already on screen. Nothing in this app
  // waits on it, and a stale network or a repo with no release published
  // yet leaves the running session untouched either way. See
  // electron/updater.js for what happens and why.
  setupAutoUpdater(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
