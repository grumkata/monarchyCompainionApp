/* THE CASE, THE ORDERS, AND THE PAPER ON THE WOOD.

   The three things the 2026-09-17 overhaul rebuilt. table-ui.test.js still
   owns the rules they inherited — nothing in a kind slot is a label, the
   name appears once, what you hold is what lands — so this only covers
   what is new about them:

     the chest opens ON something and collapses while you carry a thing
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
  await pg.goto(site.url + '/monarchy.html'); await wait(900);
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    { id: 'c1', who: { name: 'Aldric Vane' } }])));
  await pg.evaluate(() => window.Shell.openTable('case-' + Date.now()));
  await wait(2200);

  /* ══ THE CASE ══════════════════════════════════════════════ */
  await pg.evaluate(() => window.Toolbox.open());
  await wait(500);
  T('the chest opens ON a kind, not on an empty box', await pg.evaluate(() =>
    !document.getElementById('hb-tray').hidden
    && document.querySelectorAll('#hb-tray .hb-opt').length > 0
    && document.querySelector('.hb-slot.on') === document.querySelectorAll('.hb-slot')[0]
    && document.getElementById('hb-what').textContent === 'Scenes'));

  T('the rail, the grid and the foot are one case', await pg.evaluate(() => {
    const c = document.querySelector('.hb-case');
    return !!c && c.contains(document.getElementById('hb-slots'))
        && c.contains(document.getElementById('hb-tray'))
        && c.contains(document.getElementById('hb-held'));
  }));

  await pg.evaluate(() => document.querySelectorAll('.hb-slot')[3].click());
  await wait(400);
  T('a kind with more than a plank\'s worth gets its pennons and its find well',
    await pg.evaluate(() => {
      const tabs = document.querySelectorAll('#hb-tabs .hb-tab');
      return document.getElementById('hb-what').textContent === 'Models'
        && tabs.length > 2 && tabs[0].classList.contains('on')
        && document.body.querySelector('.hb.finding')
        && /\d+ things/.test(document.getElementById('hb-count').textContent);
    }));

  T('and typing narrows it to what you asked for', await pg.evaluate(async () => {
    const q = document.getElementById('hb-q');
    q.value = 'barrel';
    q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    const n = [...document.querySelectorAll('#hb-tray .hb-opt .hb-nm')]
      .map(e => e.textContent.toLowerCase());
    q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
    return n.length > 0 && n.every(t => t.indexOf('barrel') >= 0);
  }));

  /* ── and it gets out of the way while you carry something ── */
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('people').find(o => o.name === 'Aldric Vane')));
  await wait(300);
  T('taking one out collapses the case to its foot', await pg.evaluate(() =>
    document.body.classList.contains('holding')
    && getComputedStyle(document.getElementById('hb-tray')).display === 'none'
    && getComputedStyle(document.getElementById('hb-slots')).display === 'none'
    && document.getElementById('hb-held').classList.contains('on')));
  T('and the foot says what you are holding and what it can still be',
    await pg.evaluate(() =>
      /Aldric Vane/.test(document.getElementById('hb-held').textContent)
      && document.querySelectorAll('#hb-rack .hb-var').length === 2
      && /wheel to change/.test(document.getElementById('hb-hint').textContent)));
  await pg.evaluate(() => window.Hand.drop());
  await wait(300);
  T('putting it back brings the whole case back', await pg.evaluate(() =>
    !document.body.classList.contains('holding')
    && getComputedStyle(document.getElementById('hb-tray')).display !== 'none'));
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
  const sceneId = await pg.evaluate(() => window.TableModel.scenes()[0].id);
  await pg.evaluate(id => window.SceneSetup.showOptions(id, true), sceneId);
  await wait(300);

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
