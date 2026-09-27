// electron/cover.js
//
// THE LOADING SCREEN LIVES IN A PROCESS OF ITS OWN.
//
// grumkata, 2026-09-26: "the whole reason loading screens exist is to mask
// the lag in transitions". Filmed, the app's loading screens could not do
// that, for one structural reason: they were drawn INSIDE the page whose work
// they were hiding. So the startup screen could not appear until that page
// produced its first frame (a quarter of a second of black), then sat
// half-drawn and frozen for 850ms while the page parsed; and the table's
// cover stopped moving whenever the table was busy — which is the only time a
// cover is ever on screen.
//
// So the cover is its own page (dist/cover.html, built by build.js) in its
// own WebContentsView, laid over the app's in the same window. It loads in a
// few milliseconds and the window is not shown until it has; the app loads
// underneath it from the start; and it animates on its own main thread, so
// nothing the app does can stop it.
//
// The conversation, all through this file:
//   app   -> 'app-cover:progress' u     the parse, 0..1      -> cover
//   app   -> 'app-cover:ready'          the app is standing  -> cover lifts
//   app   => 'app-cover:wipe' {…}       raise the Bend, resolves once covered
//   app   => 'app-cover:lift'           take it off, resolves once gone
// The view is hidden whenever nothing is over the app, because a view on top
// takes the mouse even where it is transparent.
//
// If the page on disk is older than this (no cover.html beside it — a page
// fetched before the cover existed), attach() does nothing, every handler
// answers { ok:false }, and the app falls back on its own in-page screens.
const { WebContentsView, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const PAINT_WAIT = 1500;   // reveal the window anyway if the cover never paints
const READY_AFTER_LOAD = 6000;   // an app page too old to say it is ready (a current one rehearses a table first)
const STEP_WAIT = 2500;   // a covered/lifted reply that never comes

let view = null, win = null;
let waiting = { painted: [], covered: [], lifted: [], 'boot-lifted': [] };
let booting = false;
/* a transition has the cover. The loading screen's own lift can finish late
   — after somebody has already walked into a table — and must not take the
   view away from the transition that is now using it (filmed: it did) */
let wiping = false;

const send = (type, data) => {
  if (view && !view.webContents.isDestroyed()) view.webContents.send('cover:' + type, data);
};
const from = e => view && e.sender === view.webContents;
function settle(kind) {
  const w = waiting[kind]; waiting[kind] = [];
  w.forEach(r => r({ ok: true }));
}
function show(on) {
  if (!view) return;
  view.setVisible(on);
  if (!on && win && !win.isDestroyed()) win.webContents.focus();
}
function fit() {
  if (!view || !win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  view.setBounds({ x: 0, y: 0, width, height });
}
/* wait for the cover to say `kind`, or give up after STEP_WAIT */
function awaitReply(kind) {
  return new Promise(res => {
    const t = setTimeout(() => res({ ok: true, late: true }), STEP_WAIT);
    waiting[kind].push(r => { clearTimeout(t); res(r); });
  });
}

/* the app's page has been told it is ready, or never will be */
function bootDone() {
  if (!booting) return;
  booting = false;
  send('boot-done');
  awaitReply('boot-lifted').then(() => { if (!wiping) show(false); });
}

ipcMain.on('cover:painted', e => { if (from(e)) settle('painted'); });
ipcMain.on('cover:covered', e => { if (from(e)) settle('covered'); });
ipcMain.on('cover:lifted',  e => { if (from(e)) settle('lifted'); });
ipcMain.on('cover:boot-lifted', e => { if (from(e)) settle('boot-lifted'); });

ipcMain.on('app-cover:progress', (e, u) => { if (booting) send('boot-progress', +u || 0); });
ipcMain.on('app-cover:ready', () => bootDone());
ipcMain.handle('app-cover:wipe', (e, o) => {
  if (!view || booting) return { ok: false };
  wiping = true;
  show(true);
  const p = awaitReply('covered');
  send('wipe', o || {});
  return p;
});
ipcMain.handle('app-cover:lift', () => {
  if (!view) return { ok: false };
  const p = awaitReply('lifted').then(r => { wiping = false; show(false); return r; });
  send('lift');
  return p;
});

/* Lay the cover over `window` from `dir` (the folder the app's page is in,
   so a downloaded page gets its own matching cover), and show the window
   once the cover has loaded. Returns false when there is no cover to lay —
   then showing the window is the caller's job. */
function attach(window, dir) {
  win = window;
  const file = path.join(dir, 'cover.html');
  if (!fs.existsSync(file)) return false;
  view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'cover-preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  view.setBackgroundColor('#00000000');
  win.contentView.addChildView(view);
  fit();
  win.on('resize', fit);
  booting = true;

  /* SHOWN, BUT SEE-THROUGH, UNTIL THE COVER HAS PAINTED. A hidden window
     draws no frames, so waiting for the cover to paint before showing it
     waits for ever (measured: every launch sat out the whole wait); and
     showing it as soon as the cover had LOADED put the bare window on screen
     for the 150–300ms the cover's first frame takes to rasterise (traced:
     137ms of GPU raster and 90ms of first layout). So the window is shown at
     opacity 0, which lets it draw, and made visible when the cover says its
     first frames are done: the first thing anybody sees is the loading screen.
     The APP loads from the start, in parallel, UNDER the cover: it is in its
     own process, so it cannot hold the cover up. */
  let shown = false;
  const reveal = () => { if (shown) return; shown = true; win.setOpacity(1); };
  win.setOpacity(0);
  win.show();
  waiting.painted.push(reveal);
  setTimeout(reveal, PAINT_WAIT);          /* a cover that never paints */
  view.webContents.loadFile(file);

  /* an app page that never says it is ready — one fetched before the cover
     existed — still gets the cover off it, a beat after it has loaded */
  win.webContents.on('did-finish-load', () => setTimeout(bootDone, READY_AFTER_LOAD));
  /* and a reload of the app (restarting into a new page) is a load like any
     other: the loading screen goes back up over it */
  let first = true;
  win.webContents.on('did-start-loading', () => {
    if (first) { first = false; return; }
    booting = true;
    show(true);
    view.webContents.reload();
  });
  return true;
}

module.exports = { attach };
