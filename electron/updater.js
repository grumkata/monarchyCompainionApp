// electron/updater.js
//
// The REAL auto-updater: electron-updater, replacing the whole packaged
// app in place via the NSIS installer target — not the earlier hand-rolled
// updater.js at the repo root, which only ever patched the web content
// inside a fixed shell. That file is still there, unused; see the note at
// the bottom of this one.
//
// ── ONLY THE NSIS INSTALL IS AUTO-UPDATABLE ──────────────────────────
// package.json's `build.win.target` ships two things: `portable` and
// `nsis`. electron-updater's Windows mechanism works by having the NSIS
// uninstaller silently re-run a newer installer in place — there is no
// equivalent for a portable .exe, which is just a file someone downloaded
// and is running directly. So this only ever updates players who used the
// installer. Portable-exe players still have to grab a new copy by hand.
// Nothing here can fix that; it's a property of how NSIS auto-update
// works, not a bug in this file.
//
// ── HOW IT DECIDES A VERSION IS NEWER ────────────────────────────────
// electron-updater does not hit the GitHub Releases API's tag_name the
// way the old content-patch script did. `npm run dist` (once `publish` is
// configured, see package.json's `build.publish`) makes electron-builder
// write a `latest.yml` describing the build it just produced — including
// its version, taken straight from package.json's own "version" field —
// and uploads it alongside the installer when a release is actually
// published. The running app compares that against its own
// app.getVersion(). Which means: **bump package.json's "version" before
// cutting a release, or this has nothing to detect.** Nothing here bumps
// it for you, on purpose — that's a deliberate release decision, not
// something to happen as a side effect of a build.
//
// ── QUIET, BACKGROUND, APPLIED ON THE NEXT LAUNCH ────────────────────
// grumkata chose "check in the background, apply next launch" over
// blocking startup on the check. electron-updater's defaults already do
// almost exactly this — `autoDownload` and `autoInstallOnAppQuit` both
// default to true — so this wrapper mostly just: (a) skips the native
// OS "update available" toast electron-updater can show on its own
// (`checkForUpdatesAndNotify()`), because this app has gone out of its
// way everywhere else to not feel like a webpage with browser chrome
// bolted on, and a Windows system toast is exactly that; and (b) reports
// what's happening two places — the console, the same place every other
// failure in this app already goes (see 34-gl-pieces.js's glFailed(),
// for one), AND now the renderer's own Settings screen, over the one IPC
// channel preload.js opens (`window.AppUpdate` — see 16-menu.js for the
// UI this feeds).
const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let started = false;
let currentWin = null;

// ONE SHAPE FOR EVERY STATE, always carrying the version actually
// running, so the renderer never has to remember what it already knew —
// each push is a complete, standalone answer to "what's going on".
function pushStatus(state, extra) {
  if (!currentWin || currentWin.isDestroyed()) return;
  currentWin.webContents.send('update-status', Object.assign(
    { state, version: app.getVersion() }, extra || {}));
}

function setupAutoUpdater(win) {
  currentWin = win;             // kept current even on a second call (see below)
  if (started) return;
  started = true;

  // A DEV RUN HAS NOTHING TO CHECK AGAINST. Unpackaged (`npm start`), there
  // is no app-update.yml (electron-builder only writes one into a real
  // packaged build) and no meaningful app.getVersion() to compare with a
  // release — electron-updater knows this and will throw rather than
  // silently no-op. Guarding here means every ordinary dev session (and
  // every earlier screenshot/test run this project's tooling does via
  // tools/shot.js and test/serve.js) stays exactly as quiet as it always
  // was; this only ever runs inside a real installed copy. The renderer
  // still gets ONE status push, so Settings can say something true
  // ("not available in a dev build") instead of showing nothing forever.
  if (!app.isPackaged) {
    console.log('[updater] skipped — not a packaged build');
    pushStatus('unavailable');
    // still register the button handlers below, so clicking "Check for
    // Updates" in a dev build reports the same thing rather than doing
    // nothing at all — a button that appears to do nothing is worse than
    // one that explains itself.
    ipcMain.on('update-check-now', () => pushStatus('unavailable'));
    ipcMain.on('update-restart-now', () => pushStatus('unavailable'));
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;    // "apply next launch" — the whole point

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for update…');
    pushStatus('checking');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available:', info.version, '— downloading in the background');
    pushStatus('available', { latest: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    console.log('[updater] already current');
    pushStatus('not-available');
  });
  autoUpdater.on('download-progress', (p) => {
    console.log(`[updater] downloading… ${Math.round(p.percent)}%`);
    pushStatus('downloading', { percent: Math.round(p.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] update', info.version, 'downloaded — will install on quit');
    pushStatus('downloaded', { latest: info.version });
  });
  // NEVER LET A FAILED CHECK TOUCH THE RUNNING APP. Same rule the old
  // content-patch updater.js followed for the same reason: a dead network,
  // a rate-limited GitHub API call, or nobody having published a release
  // yet are all completely normal states, not application errors, and
  // must never be allowed to crash or visibly disrupt a session already
  // under way. The player sees only "couldn't check" — never a stack
  // trace or an API error string, which is console-only, developer-facing
  // detail.
  autoUpdater.on('error', (err) => {
    console.error('[updater] check failed (continuing on the current version):', err == null ? err : err.message);
    pushStatus('error');
  });

  // Settings' "Check for Updates" button. Re-running this is always
  // safe — electron-updater just runs the same flow again — so no state
  // machine is needed here beyond what the events above already report.
  ipcMain.on('update-check-now', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] checkForUpdates rejected:', err && err.message);
      pushStatus('error');
    });
  });

  // Settings' "Restart & Update Now" button — the only way this app ever
  // restarts itself without the player choosing to quit. No guard is
  // written here because electron-updater already has one, and it is the
  // one that actually matters: quitAndInstall() → install() checks for a
  // real installerPath/downloadedFileInfo, and if a stray or double click
  // fires this before anything has actually finished downloading, it
  // dispatches an 'error' (which the renderer will show as "couldn't
  // check for updates" — an odd message for that exact case, acceptable
  // for now) and does NOT call app.quit(). The button is only ever shown
  // in Settings once a 'downloaded' status has been seen, so in practice
  // this only ever fires once something real is sitting there.
  ipcMain.on('update-restart-now', () => {
    autoUpdater.quitAndInstall();
  });

  // Fired once, well after the window is already up — this is the
  // "background" half of grumkata's choice. Nothing here waits on it.
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] checkForUpdates rejected:', err && err.message);
    pushStatus('error');
  });
}

module.exports = { setupAutoUpdater };
