// electron/main.js
// Main process: opens the built dist/monarchy.html in a plain native
// window. No default Electron menu bar (File/Edit/View/...), no browser
// chrome — this should feel like a real desktop app, not a browser
// wrapper around a webpage.

const { app, BrowserWindow, Menu, session, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { setupAutoUpdater } = require('./updater');
const Content = require('./content');
const Cover = require('./cover');

// Remove Electron's default application menu (File/Edit/View/Window/Help).
Menu.setApplicationMenu(null);

// ONE COPY AT A TIME. Two windows on one profile share one set of saved
// characters and tables and overwrite each other's — a double-click on the
// shortcut should bring the first one forward, not start a second.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (!w) return;
  if (w.isMinimized()) w.restore();
  w.focus();
});

// YOUTUBE, FOR THE GM'S MUSIC (src/js/74-music.js). The page is loaded from
// file://, and a file:// page sends no Referer; since 2025 YouTube answers an
// embed that has none with "Error 153, video player configuration error". So
// the player's own frame gets a Referer of this app's id, and nothing else
// does. (Measured: without this the embed fails; with it, it plays.)
const YT_REFERER = 'https://com.grumkata.monarchy/';
function allowYouTube() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://www.youtube.com/embed/*', '*://www.youtube-nocookie.com/embed/*'] },
    (details, callback) => {
      const headers = details.requestHeaders;
      if (details.resourceType === 'subFrame') headers['Referer'] = YT_REFERER;
      callback({ requestHeaders: headers });
    });
}

// What a page loaded here may ask the computer for. The app uses full screen
// and copying a table word; it has no use for the camera, microphone,
// location or anything else, and a hostile page would.
const PERMITTED = new Set(['fullscreen', 'clipboard-sanitized-write']);

function createWindow() {
  const icon = path.join(__dirname, '..', 'build', 'icon.png');
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#0a0705', // the dark room the hall and the table both sit in — avoids a pale flash on load
    autoHideMenuBar: true,      // extra safety net on platforms where a menu bar can reappear
    ...(fs.existsSync(icon) ? { icon } : {}),   // build/icon.png, once there is one
    // NOT shown until the loading screen is painted over it (cover.js):
    // shown at once, it was a black window for a quarter of a second and
    // then a half-drawn loading screen that could not move
    show: false,
    webPreferences: {
      nodeIntegration: false,   // the app is plain browser JS/HTML/CSS — no Node API surface needed
      contextIsolation: true,
      sandbox: true,
      // The one hole in that seal: exposes window.AppUpdate (see
      // preload.js) so Settings can show real update status and let a
      // player restart into a downloaded update — nothing else about the
      // renderer's access changes. Runs fine sandboxed; contextBridge is
      // exactly what a sandboxed preload is for.
      preload: path.join(__dirname, 'preload.js'),
      // A PLAYER IN ANOTHER WINDOW IS STILL AT THE TABLE. Chromium slows the
      // timers of a hidden or minimised page — to once a minute after five
      // minutes of it — and the heartbeat that says you are still here is a
      // timer (src/js/06-session.js). Everybody else treats a beat fifteen
      // seconds old as somebody gone, so alt-tabbing to Discord made your
      // figure vanish from every other table and come back once a minute:
      // "player avatar disappears sometimes". A table you are sitting at is
      // not a background tab.
      backgroundThrottling: false
    }
  });

  // A link is opened in the person's own browser, never in this window, and
  // the window never navigates away from the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!/^file:/i.test(url)) event.preventDefault();
  });

  // THE PAGE FELL OVER. A crashed renderer used to leave a dead window. It is
  // reloaded — the tables and characters are in local storage, so nothing is
  // lost — but not in a loop: three crashes inside a minute and it stops and
  // says so, rather than flashing for ever.
  const crashes = [];
  win.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return;
    const now = Date.now();
    crashes.push(now);
    while (crashes.length && now - crashes[0] > 60000) crashes.shift();
    if (crashes.length > 3) {
      dialog.showErrorBox('Monarchy stopped',
        'The game window keeps failing (' + details.reason + '). Your characters and tables are saved. ' +
        'Close Monarchy and open it again; if it keeps happening, update your graphics driver.');
      return;
    }
    setTimeout(() => { if (!win.isDestroyed()) win.webContents.reload(); }, 800);
  });

  /* the loading screen, in its own view over the window (cover.js), which
     shows the window once it is there to be seen; and underneath it, from the
     same moment, the newest page this copy has — the one it shipped with, or
     a later one fetched from the repo since (content.js) */
  if (!Cover.attach(win, Content.pick().dir)) win.show();
  Content.load(win);

  // Uncomment while debugging a packaged build (also note: no default
  // menu means no Ctrl+Shift+I either, since that shortcut normally
  // lives on the View menu — this openDevTools() call is the only way
  // in until/unless a menu gets added back):
  // win.webContents.openDevTools();

  return win;
}

app.whenReady().then(() => {
  if (!gotLock) return;           // the second copy is already quitting
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(PERMITTED.has(permission));
  });
  allowYouTube();
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
