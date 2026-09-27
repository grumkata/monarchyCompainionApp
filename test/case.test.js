/* THE DOCK, THE ORDERS, AND THE PAPER ON THE WOOD.

   The case this file was named for was the chest's open lid; since
   2026-09-25 it is a dock at your left hand (47-hand.js), and the orders
   live in the muster (72-muster.js) rather than a writ over the board.
   table-ui.test.js owns what you take out and how it lands; this covers:

     the toolbox opens ON something, and its big kinds can be searched
     carrying something leaves the dock where it is and says what it is
     a yes is a seal, a number is a tally, a choice is a row of pennons
     a record is a prop lying on the wood, and pressing it picks it up   */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const site = await serve();
  const wait = ms => pg.waitForTimeout(ms);
  await pg.goto(site.url + '/monarchy.html');
  /* started = the loading screen has gone (it now rehearses a table first) */
  await pg.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30000 });
  await wait(300);
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    { id: 'c1', who: { name: 'Aldric Vane' } }])));
  await pg.evaluate(() => window.Shell.openTable('case-' + Date.now()));
  await wait(2200);

  /* ══ THE DOCK ══════════════════════════════════════════════ */
  await pg.evaluate(() => window.Toolbox.open());
  await wait(500);
  T('the toolbox opens ON a kind, not on an empty box', await pg.evaluate(() =>
    !document.getElementById('tbx').hidden
    && document.querySelectorAll('#tbx-grid .tbx-tile').length > 0
    && document.querySelector('.tbx-kind.on') === document.querySelectorAll('.tbx-kind')[0]
    && document.getElementById('tbx-what').textContent === 'Scenes'));

  T('the kinds, the shelf, the grid and the foot are one dock', await pg.evaluate(() => {
    const c = document.getElementById('tbx');
    return !!c && ['tbx-kinds', 'tbx-shelf', 'tbx-grid', 'tbx-foot']
      .every(id => c.contains(document.getElementById(id)));
  }));

  await pg.evaluate(() => document.querySelectorAll('.tbx-kind')[3].click());
  await wait(400);
  T('a kind with more than a shelf\'s worth gets its pennons and its find well',
    await pg.evaluate(() => {
      const tabs = document.querySelectorAll('#tbx-tabs .tbx-tab');
      return document.getElementById('tbx-what').textContent === 'Models'
        && tabs.length > 2 && tabs[0].classList.contains('on')
        && document.getElementById('tbx-shelf').classList.contains('findable')
        && /^\d+$/.test(document.getElementById('tbx-count').textContent);
    }));

  T('and typing narrows it to what you asked for', await pg.evaluate(async () => {
    const q = document.getElementById('tbx-q');
    q.value = 'barrel';
    q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    const n = [...document.querySelectorAll('#tbx-grid .tbx-tile .tbx-nm')]
      .map(e => e.textContent.toLowerCase());
    q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
    return n.length > 0 && n.every(t => t.indexOf('barrel') >= 0);
  }));

  /* ── the dock stays where it is while you carry something: it is beside
     the table now, not across the bottom of it, so there is nothing for it
     to get out of the way of ── */
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('people').find(o => o.name === 'Aldric Vane')));
  await wait(300);
  T('taking one out leaves the dock open beside the table', await pg.evaluate(() =>
    document.body.classList.contains('holding') && window.Hand.isUp()
    && getComputedStyle(document.getElementById('tbx-grid')).display !== 'none'));
  T('and says, at the foot of the table, what you are holding and how to put it down',
    await pg.evaluate(() => {
      const p = document.querySelector('.tbx-pill');
      return !!p && !p.hidden && /Aldric Vane/.test(p.textContent)
          && /wheel to change/.test(p.textContent)
          && /Aldric Vane/.test(document.getElementById('tbx-foot').textContent);
    }));
  await pg.evaluate(() => window.Hand.drop());
  await wait(300);
  T('putting it back leaves nothing in your hand', await pg.evaluate(() =>
    !document.body.classList.contains('holding') && document.querySelector('.tbx-pill').hidden));
  await pg.evaluate(() => window.Toolbox.shut());
  await wait(300);

  /* ══ THE SEAT ══════════════════════════════════════════════
     The camera has now been broken twice by a number that was measured
     against a 1.2m table and left behind when the table grew: once the
     eye (EYE_BACK) and once the metre itself (TABLE_M_HALF, which made
     every metre in the view buy 3667 units instead of 2000). __eye()
     reports where the eye actually IS, in metres, so the seat can be
     checked against what it asks for rather than looked at. */
  const eye = () => pg.evaluate(() => window.__eye());
  const wheelOut = n => pg.evaluate(count => {
    const vp = document.getElementById('vp');
    for (let i = 0; i < count; i++) vp.dispatchEvent(new WheelEvent('wheel',
      { deltaY: 120, bubbles: true, cancelable: true, clientX: 600, clientY: 430 }));
  }, n);

  await pg.evaluate(() => window.Table3D.fit());
  await wait(500);
  await wheelOut(1); await wait(400);
  T('one notch back from the fit does not throw you into the chair',
    (await eye()).up > 2);

  await wheelOut(14); await wait(1200);
  const e = await eye();
  const want = await pg.evaluate(() => window.Table3D.TABLE_M / 2 + 0.42);
  T('and sitting down puts your eye where the seat asks: ' +
    e.back.toFixed(2) + 'm back, ' + e.up.toFixed(2) + 'm up',
    Math.abs(e.back - want) < 0.05 && Math.abs(e.up - 0.70) < 0.05);
  T('which is clear of the edge of the wood, not on it',
    e.back > await pg.evaluate(() => window.Table3D.TABLE_M / 2 + 0.2));
  /* ── and the board does not stand up with you ── */
  await pg.evaluate(() => window.Toolbox.take(
    { act: 'make', kind: 'scene', scene: 'combat' }, 2200, 2200));
  await wait(1200);
  await pg.evaluate(() => window.Toolbox.take(
    { kind: 'token', name: 'Someone', act: 'place' }, 1400, 2600,
    { side: 'al', entKind: 'unit', hpMax: 10, name: 'Someone' }));
  await wait(600);
  await wheelOut(15); await wait(1400);
  /* how far a prop's own plane is turned out of the table's, in degrees */
  const tiltOf = sel => pg.evaluate(s => {
    const p = document.querySelector(s);
    if (!p) return null;
    const m = new DOMMatrix(getComputedStyle(p).transform);
    return Math.abs(Math.asin(Math.max(-1, Math.min(1, -m.m32))) * 180 / Math.PI);
  }, sel);
  T('the battlefield stays lying on the wood when you sit back',
    (await tiltOf('#combat-prop')) < 1);
  T('but a counter still stands up to face you, which is the whole trick',
    (await tiltOf('.prop.t3-token')) > 8);
  await pg.evaluate(() => window.Table3D.fit());
  await wait(400);

  /* ══ THE ORDERS ════════════════════════════════════════════ */
  await pg.evaluate(() => window.Toolbox.take({ act: 'make', kind: 'scene', scene: 'combat' }, 1200, 780));
  await wait(900);
  /* the orders of the fight that is RUNNING, which live in its muster now */
  const sceneId = await pg.evaluate(() => window.TableModel.activeScene().id);
  await pg.evaluate(id => window.SceneSetup.showOptions(id, true), sceneId);
  await wait(300);
  T('asking for a fight\'s orders opens its muster, not a writ over the board',
    await pg.evaluate(() => window.Muster.isOpen()
      && !!document.querySelector('#muster #sc-opts .sc-seal[data-opt="fog"]')
      && !document.querySelector('#sc-float:not([hidden])')));

  T('no dropdown, no checkbox, no spinner is left in the orders',
    await pg.evaluate(() => {
      const p = document.getElementById('sc-opts');
      return !p.querySelector('select') && !p.querySelector('input[type=checkbox]');
    }));

  T('a yes is a seal, and pressing it seals the order', await pg.evaluate(async id => {
    const s = document.querySelector('#sc-opts .sc-seal[data-opt="fog"]');
    if (!s || s.classList.contains('on')) return false;
    s.click();
    await new Promise(r => setTimeout(r, 120));
    const now = document.querySelector('#sc-opts .sc-seal[data-opt="fog"]');
    return window.TableModel.get(id).options.fog === true && now.classList.contains('on');
  }, sceneId));

  T('a number is a tally, struck up by its own lozenge', await pg.evaluate(async id => {
    const was = +window.TableModel.get(id).options.mana || 0;
    document.querySelector('#sc-opts .sc-step[data-for="mana"][data-step="1"]').click();
    await new Promise(r => setTimeout(r, 120));
    return +window.TableModel.get(id).options.mana === was + 1;
  }, sceneId));

  T('a choice is a row of pennons, all of them in sight', await pg.evaluate(async id => {
    const pens = document.querySelectorAll('#sc-opts .sc-pen[data-opt="flex"]');
    if (pens.length !== 3) return false;
    const pick = [...pens].find(p => p.dataset.val === 'ask');
    pick.click();
    await new Promise(r => setTimeout(r, 120));
    return window.TableModel.get(id).options.flex === 'ask'
      && document.querySelector('#sc-opts .sc-pen[data-val="ask"]').classList.contains('on');
  }, sceneId));

  /* ══ THE PAPER ═════════════════════════════════════════════ */
  await pg.evaluate(() => window.Papers.lay('c1'));
  await wait(500);
  T('a record is a real prop lying on the wood', await pg.evaluate(() => {
    const p = document.getElementById('tp-paper');
    return !!p && p.parentNode.id === 'tbl' && p.classList.contains('prop')
        && !!p.querySelector('.tp-face .leaf')
        && +p.dataset.x > 0 && +p.dataset.y > 0;
  }));
  T('and it is the hall\'s own record, not a copy of one', await pg.evaluate(() =>
    /Aldric Vane/.test(document.querySelector('#tp-paper .tp-face').textContent)));

  await pg.evaluate(() => window.Papers.read());
  await wait(600);
  T('pressing it picks it up to read, over a quiet table', await pg.evaluate(() =>
    !document.getElementById('tp').hidden
    && !document.getElementById('tp-scrim').hidden
    && document.body.classList.contains('reading')));

  await pg.evaluate(() => window.Papers.close());
  /* the sheet goes down when its animation is over, and a software-GL run
     is slow enough that a fixed wait is a coin toss — wait on the state */
  T('putting it down leaves the sheet lying where it was', await pg.evaluate(() =>
    new Promise(r => {
      const t0 = Date.now();
      const tick = () => {
        const done = document.getElementById('tp').hidden
          && document.getElementById('tp-scrim').hidden
          && !!document.getElementById('tp-paper')
          && window.Papers.laidId === 'c1';
        if (done || Date.now() - t0 > 6000) return r(done);
        setTimeout(tick, 60);
      };
      tick();
    })));

  await pg.evaluate(() => window.Papers.away());
  await wait(300);
  T('and taking it off the table takes it off the table', await pg.evaluate(() =>
    !document.getElementById('tp-paper') && window.Papers.laidId === null));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
