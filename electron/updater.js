// electron/updater.js
//
// TWO KINDS OF UPDATE, ONE VOICE.
//
//   THE PAGE     electron/content.js. Everything that changes week to week —
//                the hall, the table, the rules, the pictures — fetched
//                straight from the repo when package.json's version goes up
//                and dist/ is pushed. No installer, no release, no wizard:
//                the window reloads onto the new page. This is THE update.
//
//   THE PROGRAM  electron-updater, below. Electron itself, main.js, this
//                folder — the things a page cannot replace. It needs a real
//                GitHub release with the installer on it, so it is kept for
//                the rare change that has to reach the program, and it is
//                silent unless one has actually been downloaded.
//
// grumkata, on finding out the first kind did not exist: "i didnt realise
// by update it was literally just reinstalling it every tiem which ismt what
// a fucking update is". Correct — see content.js for the rest.
//
// Both report here, and the renderer is told ONE thing: a waiting page wins
// over a waiting program, and a check in progress is only shown when nothing
// is waiting. They used to share a channel without this, and whichever
// answered last decided whether the hall's "update ready" card showed.
//
// ── ONLY THE INSTALLED COPY UPDATES ITS PROGRAM ──────────────────────
// electron-updater's Windows mechanism re-runs a newer NSIS installer; a
// portable .exe has no equivalent. The PAGE updates in both — it lives in
// the user's own app data, not next to the program.
const { app, ipcMain } = require('electron');
const Content = require('./content');

let started = false;
let currentWin = null;
const last = { content: null, shell: null };

/* what the renderer is told, always complete: the page it is running and,
   separately, the program it is running in */
function push() {
  if (!currentWin || currentWin.isDestroyed()) return;
  const c = last.content || {}, s = last.shell || {};
  let st;
  if (c.state === 'downloaded') st = Object.assign({ kind: 'content' }, c);
  else if (s.state === 'downloaded') st = Object.assign({ kind: 'shell' }, s);
  else st = c.state ? Object.assign({ kind: 'content' }, c) : Object.assign({ kind: 'shell' }, s);
  currentWin.webContents.send('update-status', Object.assign({ state: 'unavailable' }, st, {
    version: (Content.running && Content.running.version) || app.getVersion(),
    shell: app.getVersion()
  }));
}
const fromContent = st => { last.content = st; push(); };
const fromShell = st => { last.shell = st; push(); };

const CHECK_EVERY = 30 * 60 * 1000;

function setupAutoUpdater(win) {
  currentWin = win;             /* kept current even on a second call */
  if (started) return;
  started = true;

  /* a reloaded page re-registers its listener and has heard nothing yet */
  win.webContents.on('did-finish-load', push);

  /* ── THE PAGE ─────────────────────────────────────────────── */
  if (Content.enabled()) {
    /* a few seconds in, so the check never competes with the first draw */
    setTimeout(() => Content.check(fromContent), 4000);
    setInterval(() => Content.check(fromContent), CHECK_EVERY);
  } else {
    console.log('[updater] page updates off — not a packaged build');
    last.content = { state: 'unavailable' };
  }

  ipcMain.on('update-check-now', () => {
    if (Content.enabled()) Content.check(fromContent); else push();
    if (shellUpdater) shellUpdater.checkForUpdates().catch(() => {});
  });

  /* "Update now" in the hall. A waiting page is a reload — a second, and the
     same window. A waiting program is the old way: quit and install. */
  ipcMain.on('update-restart-now', () => {
    if (Content.ready && Content.apply(currentWin)) {
      last.content = { state: 'not-available' };
      return;
    }
    if (last.shell && last.shell.state === 'downloaded' && shellUpdater) {
      shellUpdater.quitAndInstall();
      return;
    }
    push();
  });

  setupShell();
}

/* ── THE PROGRAM ──────────────────────────────────────────────
   electron-updater, quiet. Only a program actually downloaded is worth
   telling anyone about; "no release found" is the normal state of a repo
   whose updates all go through the page, not an error. */
let shellUpdater = null;
function setupShell() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');
  shellUpdater = autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', info =>
    console.log('[updater] program ' + info.version + ' available — downloading'));
  autoUpdater.on('update-downloaded', info => {
    console.log('[updater] program ' + info.version + ' downloaded — installs on quit');
    fromShell({ state: 'downloaded', latest: info.version });
  });
  autoUpdater.on('error', err =>
    console.log('[updater] no program update (' + (err && err.message ? err.message.split('\n')[0] : err) + ')'));
  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { setupAutoUpdater };
