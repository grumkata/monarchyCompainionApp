/* ══════════════════════════════════════════════════════════════
   shot.js — photograph the built app.

     npx electron tools/shot.js               # the hall
     npx electron tools/shot.js table         # a table, from above
     npx electron tools/shot.js chest out.png # framed on the chest
     npx electron tools/shot.js box           # the toolbox open
     npx electron tools/shot.js bar           # the hand bar
     npx electron tools/shot.js tables        # a hall cloth: tables, chars,
                                              #   settings, join, arms

   Add a view by adding a line to VIEWS.

   THIS REPLACES ELEVEN SCRIPTS — shot-bar, shot-box, shot-chest,
   shot-flow, shot-hall, shot-table, shot-tok, shot-two, dbg-pass,
   dbg-scale and diag. Each was written for one afternoon's question and
   every one had rotted identically: they required playwright from
   `/home/claude/.npm-global/...` and opened
   `file:///tmp/mon/dist/monarchy.html`, both paths inside a container
   that no longer exists, so not one of them could run.

   ── AND WHY THIS IS ELECTRON AND NOT PLAYWRIGHT ──────────────
   The obvious rewrite is Playwright, like the tests. It does not work,
   and the reason is worth recording so nobody spends the afternoon I
   just did on it.

   three.js creates its context without preserveDrawingBuffer, so the
   colour buffer is not guaranteed to survive the frame it was drawn in.
   Playwright's screenshot reads the canvas after compositing and gets an
   empty one: the page comes out BLACK, with the DOM chrome drawn neatly
   on top, which looks far more like a broken app than a broken camera.
   Headless Chrome also has no GPU, so the tavern renders in software at
   roughly a frame a second and the wait needed to get even one frame is
   longer than the screenshot is worth.

   Electron's capturePage() composites the real window, the same one the
   app ships in, and file:// resolves the textures there — which it does
   NOT in plain Chrome, see test/serve.js. So the camera is the product.
══════════════════════════════════════════════════════════════ */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

/* Each view is what to run in the page once the table is up, as source —
   it is sent across to the renderer, so it cannot close over anything
   here. `null` means stay in the hall. */
const VIEWS = {
  hall:  null,
  table: 'true',
  chest: 'Table3D.frame(document.getElementById("tb-anchor"))',
  box:   'Toolbox.open()',
  bar:   'Hand && Hand.show && Hand.show()'
};
/* Views that stay in the hall and open one of its cloths. Kept apart from
   VIEWS because they must NOT walk into a table first. */
const HALL = {
  tables:   'Menu.take("tables")',
  chars:    'Menu.take("chars")',
  settings: 'Menu.take("set")',
  join:     'Menu.take("join")',
  arms:     'document.getElementById("arms").click()'
};

const view = process.argv[2] || 'hall';
const out = path.resolve(process.argv[3] || ('shot-' + view + '.png'));
const page = path.join(__dirname, '..', 'dist', 'monarchy.html');

if (!(view in VIEWS) && !(view in HALL)) {
  console.error('  views: ' + Object.keys(VIEWS).concat(Object.keys(HALL)).join(', '));
  process.exit(1);
}
if (!fs.existsSync(page)) {
  console.error('  no dist/monarchy.html — run: node build.js');
  process.exit(1);
}

app.on('window-all-closed', () => {});
process.on('uncaughtException', e => { console.error('  ' + e.message); app.exit(1); });

app.whenReady().then(async () => {
  /* ── OFFSCREEN, NOT MERELY HIDDEN ──────────────────────────
     A plain `show:false` window stops producing frames. capturePage() then
     hands back the last frame it did paint, so every change made after load
     was missing from the picture — `box` came out identical to `table` —
     and the Web Animations clock never advanced, so a hall cloth stayed at
     clip-path frame 0 and was never in the picture at all. Offscreen
     rendering keeps painting a window nobody can see, and the frame is taken
     from its own paint event. */
  const win = new BrowserWindow({ width: 1500, height: 950, show: false,
    webPreferences: { contextIsolation: true, sandbox: true,
                      offscreen: true, backgroundThrottling: false } });
  win.webContents.setFrameRate(30);
  let frame = null;
  win.webContents.on('paint', (e, dirty, img) => { frame = img; });
  win.webContents.on('console-message', (e) => {
    if ((e.level === 'error' || e.level === 'warning') && !/Security Warning/.test(e.message))
      console.log('  page: ' + e.message);
  });

  await win.loadFile(page);
  await wait(1200);

  if (view in HALL) {
    await wait(2500);
    await win.webContents.executeJavaScript(HALL[view]).catch(e =>
      console.log('  view failed: ' + e.message));
    await wait(1400);
  } else if (VIEWS[view] !== null) {
    await win.webContents.executeJavaScript("Shell.openTable('shot-" + Date.now() + "')");
    await wait(2500);
    /* The room's textures arrive on their own schedule and a photograph
       taken before they land is the blank-grey picture this tool exists to
       stop being taken. TableGL already counts what is outstanding. */
    await win.webContents.executeJavaScript(`new Promise(function(r){
      if (!window.TableGL || !TableGL.waiting) return r();
      TableGL.onTextures(r); setTimeout(r, 9000);
    })`).catch(() => {});
    await win.webContents.executeJavaScript(VIEWS[view]).catch(e =>
      console.log('  view failed: ' + e.message));
    await wait(1500);
  } else {
    await wait(5000);
  }

  win.webContents.invalidate();
  await wait(300);
  if (!frame) { console.error('  no frame was painted'); app.exit(1); return; }
  fs.writeFileSync(out, frame.toPNG());
  console.log('  wrote ' + out);
  app.exit(0);
});

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
