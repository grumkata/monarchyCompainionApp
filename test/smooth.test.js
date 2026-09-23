/* ══════════════════════════════════════════════════════════════
   smooth.test.js — THE LOADING SCREEN AND THE WALK INTO A TABLE.

   grumkata: "make the loading screens smoother and transitions smoother as
   sometimes they are laggy especially going from menu to table".

   NOTHING HERE ASSERTS ON A NUMBER OF MILLISECONDS. These run under a
   software renderer that compiles shaders on the CPU, so every timing it
   reports is both enormous and unlike any real machine's — it was measuring
   with that renderer that sent the first attempt at this in the wrong
   direction entirely (see the note at the top of 28-table-boot.js). The
   timings that justified the change were taken through Electron against the
   actual GPU; what is kept here is the STRUCTURE those timings depend on,
   which is what would silently rot:

     the room is raised before anyone asks for a table
     asking for one therefore builds nothing
     the cover waits for the work rather than for a stopwatch
     a repaint is not an arrival, so nothing re-animates on every click
     the loading bar's steps are the real work, not an even count
     THE COVER KEEPS MOVING WHEN THE PAGE IS DEAD — see the bottom

   And one rule, learned the hard way and three times over: a harness is
   worth nothing until it has been shown able to report the FAILURE. Every
   wrong turn on this problem came from a measurement that could only ever
   say yes — a software renderer that cannot defer a shader link, a
   benchmark that only ever opened a warm table, an offscreen window that
   cannot see compositor animation at all, and a frame comparison that
   counted JPEG noise as movement. The last test in this file therefore
   carries its own control, and fails if the control does not freeze.
══════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  /* ══ THE LOADING SCREEN, read off the built page ════════════ */
  const page = fs.readFileSync(path.join(__dirname, '..', 'dist', 'monarchy.html'), 'utf8');
  const marks = [...page.matchAll(/__boot\((\d+),(\d+)\)/g)].map(m => +m[1] / +m[2]);
  T('the loading bar is marked in bytes parsed, not files counted',
    marks.length > 20 && Math.abs(marks[marks.length - 1] - 1) < 1e-9);
  T('so its steps are the size of the work and not all the same', (() => {
    /* an even count of files gives every step the same width; real bytes
       give a handful of big jumps (the asset packs) and a lot of small
       ones. If the biggest step is not several times the median, the
       weighting has been lost. */
    const steps = marks.map((v, i) => v - (marks[i - 1] || 0)).sort((a, b) => a - b);
    const mid = steps[Math.floor(steps.length / 2)];
    return steps[steps.length - 1] > mid * 8;
  })());
  T('and the one thing that must move while the page is busy moves on transform',
    /@keyframes bootsweep\{to\{transform:translateX\(100%\)\}\}/.test(page)
    && /\.boot-bar u\{[^}]*animation:bootsweep/.test(page));

  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const site = await serve();
  const wait = ms => pg.waitForTimeout(ms);
  await pg.goto(site.url + '/monarchy.html');

  /* ══ THE ROOM GOES UP BEFORE ANYONE ASKS ═══════════════════ */
  T('the room is raised while you are still in the hall', await pg.evaluate(() =>
    new Promise(r => {
      const t0 = Date.now();
      const tick = () => {
        if (window.TableBoot && window.TableBoot.raised) return r(true);
        if (Date.now() - t0 > 20000) return r(false);
        setTimeout(tick, 120);
      };
      tick();
    })));
  T('and no table has been laid on it yet — the room is not a table',
    await pg.evaluate(() => window.TableBoot.standing === null));
  T('the hall is still the hall while it happens', await pg.evaluate(() =>
    document.body.classList.contains('at-hall')
    && !document.body.classList.contains('at-table')));

  /* ══ SO WALKING IN BUILDS NOTHING ══════════════════════════ */
  T('walking into a table builds no room, because one is already up',
    await pg.evaluate(async () => {
      let built = 0;
      const f = window.TableGL.build;
      window.TableGL.build = function () { built++; return f.apply(this, arguments); };
      await window.Shell.openTable('smooth-' + Date.now());
      window.TableGL.build = f;
      return built === 0;
    }));
  T('and the table is nonetheless standing, with its own wood on it',
    await pg.evaluate(() => document.body.classList.contains('at-table')
      && !!window.TableBoot.standing
      && !!document.getElementById('tgl')));

  /* THE CAMERA HAS BEEN BROKEN TWICE BY A NUMBER MEASURED AT THE WRONG
     MOMENT, and raising the room early creates exactly that hazard again:
     Table3D.mount() now runs while #vp is display:none, so fitTable() —
     which is the thing that WRITES the zoom floor the chair sits at — is
     measuring a viewport of nothing. 42-shell.js re-fits after the swap for
     that reason, and this is the check that it really does. */
  T('a room raised against a viewport of nothing still fits the same',
    await pg.evaluate(() => {
      const e = window.__eye();
      /* fitted: high above the middle of the wood, the whole table in view */
      return window.Table3D.k > 0.1 && window.Table3D.k < 0.5
        && e.up > 3 && e.back > 1;
    }));
  T('and sitting all the way down still puts your eye where the seat asks',
    await pg.evaluate(async () => {
      const vp = document.getElementById('vp');
      for (let i = 0; i < 16; i++) vp.dispatchEvent(new WheelEvent('wheel',
        { deltaY: 120, bubbles: true, cancelable: true, clientX: 600, clientY: 430 }));
      await new Promise(r => setTimeout(r, 1600));
      const e = window.__eye(), want = window.Table3D.TABLE_M / 2 + 0.42;
      return Math.abs(e.back - want) < 0.06 && Math.abs(e.up - 0.70) < 0.06;
    }));

  /* ══ THE COVER WAITS FOR THE WORK ══════════════════════ */
  T('the Bend holds its cover until what it covers is finished',
    await pg.evaluate(async () => {
      /* a mid that takes its time: the cover must still be down when it
         finishes, which a fixed hold cannot promise */
      let coveredAtEnd = null;
      await window.Herald.wipe(() => new Promise(r => setTimeout(() => {
        coveredAtEnd = document.getElementById('herald').classList.contains('carded');
        r();
      }, 1400)), { title: 'Slow', sub: 'on purpose' });
      return coveredAtEnd === true;
    }));
  T('and it comes off again afterwards rather than staying down',
    await pg.evaluate(() => {
      const h = document.getElementById('herald');
      return !h.classList.contains('wiping') && !h.classList.contains('carded');
    }));

  /* ══ A REPAINT IS NOT AN ARRIVAL ═══════════════════════════ */
  await pg.evaluate(() => window.Shell.backToHall());
  await wait(1800);
  await pg.evaluate(() => document.getElementById('arms').click());
  await wait(900);
  T('raising a screen marks it as arriving, so its parts deal in',
    await pg.evaluate(() => document.getElementById('screenbody').classList.contains('fresh')));
  T('but pressing a tincture only repaints, so nothing flies in again',
    await pg.evaluate(async () => {
      document.querySelector('[data-arm="a"][data-v="azure"]').click();
      await new Promise(r => setTimeout(r, 250));
      return !document.getElementById('screenbody').classList.contains('fresh')
        /* and the screen really was rebuilt — otherwise this proves nothing */
        && document.querySelector('[data-arm="a"][data-v="azure"]').classList.contains('on');
    }));
  T('stepping to another bench turns that pane and leaves the rest alone',
    await pg.evaluate(async () => {
      document.querySelector('[data-tab="chg"]').click();
      await new Promise(r => setTimeout(r, 250));
      const pane = document.querySelector('.mk-pane');
      return pane.classList.contains('turned')
        && !document.getElementById('screenbody').classList.contains('fresh');
    }));

  /* ══ AND THE SHADER CHECKS ARE A SWITCH, NOT A DECISION ════ */
  T('shader error checks are off by default, and the switch brings them back',
    await pg.evaluate(async () => {
      const off = !window.Blazon3D.tune({ debug: {} }).debug.checkShaderErrors;
      localStorage.setItem('monarchy.shaderlog', '1');
      const on = window.Blazon3D.tune({ debug: {} }).debug.checkShaderErrors;
      localStorage.removeItem('monarchy.shaderlog');
      return off && on;
    }));

  /* ══ THE ONE THAT MATTERS ═══════════════════════════════
     grumkata: "its laggy because your putting them on the same layer so when
     the table lags the loading screen lags even though the reason it exists
     is to mask the lag".

     So: block the main thread solid and ask the COMPOSITOR what it drew.
     Playwright's screencast comes from the browser process, not from the
     page, so it can still see frames when the page cannot produce them.

     Lossless frames, because JPEG re-encodes identical pictures differently
     and an earlier version of this counted that noise as movement — it
     "passed" with no cover on screen at all.

     The film grade is turned OFF for both halves: the hall's grain is itself
     a composited transform animation, so leaving it running means the
     harness reports movement that is not the cover's. */
  const cdp = await pg.context().newCDPSession(pg);
  const shots = [];
  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    shots.push({ t: Date.now(), h: crypto.createHash('md5').update(data).digest('hex') });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch (e) {}
  });
  const blockFor = async withCover => {
    shots.length = 0;
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    const m = await pg.evaluate(cover => {
      const spin = () => { const end = performance.now() + 600; while (performance.now() < end) {} };
      if (!cover) { const from = Date.now(); spin(); return Promise.resolve({ from, to: Date.now() }); }
      return new Promise(res => {
        const mk = {};
        window.Herald.wipe(() => { mk.from = Date.now(); spin(); mk.to = Date.now(); },
          { title: 'The Table', sub: 'the table is set' }).then(() => res(mk));
      });
    }, withCover);
    await pg.waitForTimeout(400);
    await cdp.send('Page.stopScreencast');
    const during = shots.filter(x => x.t >= m.from && x.t <= m.to);
    return new Set(during.map(x => x.h)).size;
  };

  await pg.evaluate(() => window.Options.set('grade', 'off'));
  await pg.evaluate(() => window.Shell.backToHall());
  await wait(1500);

  /* the control first: with nothing composited on screen, a blocked thread
     MUST freeze. If this does not freeze, the test below proves nothing and
     is not allowed to pass on its own. */
  const still = await blockFor(false);
  T('control: with no cover up, blocking the thread freezes the screen  ('
    + still + ' distinct frame' + (still === 1 ? '' : 's') + ')', still <= 2);

  const moved = await blockFor(true);
  /* The bar is set against the CONTROL, not against an absolute count. How
     many frames the compositor gets through in 600ms depends on the machine
     and on what else it is doing, and a fixed threshold of 8 duly failed at
     7 one run in five — which is a flaky test, not a broken cover. What
     cannot be noise is the ratio: frozen is one frame, and animating is
     many. */
  T('and with the cover up it keeps animating through the same block  ('
    + moved + ' distinct frames; the control froze at ' + still + ')',
    still <= 2 && moved >= 4 && moved >= still * 4);

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
