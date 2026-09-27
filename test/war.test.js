/* war.test.js — A FIGHT, PREPARED, BROUGHT OUT AND RUN.

   grumkata, 2026-09-25, on combat: "preset combat scenes where gm makes a
   preset board and then bring it to the table", "not every combat will be
   on a grassy field ... i want the capability for field variety", "the chat
   should be visible in combat view no matter what", and the board "doe not
   actually make running or being in combat easier for the gm or player".

   So this checks, against the built page:
     a prepared fight is kept, and brought to the table whole, in one move
     a fight on the table can be kept the other way
     the ground: terrain on the mat, features on the slots, obstacles honoured
     the muster runs the round: phases, damage, conditions, moving a unit
     the chat is a layer of its own, above the field

   The immersive field itself is not booted here — under swiftshader it takes
   the renderer down (see handling.test.js); its terrain is data, checked in
   table.test.js, and was photographed per terrain when it was built. */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const site = await serve();
  const wait = ms => pg.waitForTimeout(ms);
  await pg.goto(site.url + '/monarchy.html');
  /* started = the loading screen has gone (it now rehearses a table first) */
  await pg.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30000 });
  await wait(300);
  await pg.evaluate(() => { localStorage.removeItem('monarchy.encounters.v1');
    localStorage.setItem('monarchy.chars.v2', JSON.stringify([{ id: 'c1', who: { name: 'Aldric Vane' } }])); });
  await pg.reload(); await wait(900);
  await pg.evaluate(() => window.Shell.openTable('war-' + Date.now()));
  await wait(1600);

  /* ══ THE CHAT ══════════════════════════════════════════════ */
  T('the chat is a layer of its own on the page, not inside the table\'s', await pg.evaluate(() => {
    const c = document.querySelector('.chatdock');
    return !!c && c.parentElement === document.body && +getComputedStyle(c).zIndex > 1400
        && getComputedStyle(document.getElementById('table-app')).position === 'fixed';
  }));

  /* ══ THE WAR ROOM ══════════════════════════════════════════ */
  await pg.evaluate(() => window.GmRail.press('war'));
  await wait(400);
  T('E / the rail opens the war room over the table', await pg.evaluate(() =>
    !document.getElementById('war').hidden && document.body.classList.contains('war-on')));

  await pg.evaluate(async () => {
    document.querySelector('#war [data-w="new"]').click();
    await new Promise(r => setTimeout(r, 100));
    const nm = document.getElementById('war-name');
    nm.value = 'Ambush at Crow Ford'; nm.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#war [data-w="ter"][data-k="forest"]').click();
    await new Promise(r => setTimeout(r, 50));
    const cell = (l, c) => document.querySelector(`#war .war-c[data-line="${l}"][data-col="${c}"]`).click();
    cell('e-front', 2); cell('e-front', 4);
    /* the brush is a counter on the workbench: make the next ones archers */
    const n = document.querySelector('#war-bench .wb-in[data-f="name"]');
    n.value = 'Crow Archer'; n.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#war-bench .wb-face[title="Archer"]').click();
    cell('e-back', 3);
    document.querySelector('#war [data-w="brush"][data-k="obstacle"]').click(); cell('a-front', 1);
    document.querySelector('#war [data-w="brush"][data-k="cover"]').click();    cell('e-front', 3);
    await new Promise(r => setTimeout(r, 800));
  });
  const enc = await pg.evaluate(() => window.Encounters.list()[0]);
  T('a fight made in the war room is kept, with its ground, its men and its features',
    !!enc && enc.name === 'Ambush at Crow Ford' && enc.terrain === 'forest' && enc.units.length === 3
    && enc.units.filter(u => u.name === 'Crow Archer' && u.fig === 'archer' && u.line === 'e-back').length === 1
    && enc.units.every(u => u.side === 'en')
    && enc.features.length === 2 && enc.features.some(f => f.kind === 'obstacle' && f.line === 'a-front'));
  T('and nobody can be painted into an obstacle', await pg.evaluate(() => {
    document.querySelector('#war [data-w="brush"][data-k="unit"]').click();
    document.querySelector('#war .war-c[data-line="a-front"][data-col="1"]').click();
    return !window.Encounters.list()[0].units.some(u => u.line === 'a-front' && u.col === 1);
  }));
  T('it is offered in the toolbox, under Scenes, beside a new one', await pg.evaluate(() =>
    window.Toolbox.options('scenes').some(o => o.enc && o.name === 'Ambush at Crow Ford')));

  /* ══ BROUGHT TO THE TABLE, WHOLE ════════════════════════════ */
  await pg.evaluate(() => document.querySelector('#war [data-w="bring"]').click());
  await wait(1400);
  const brought = await pg.evaluate(() => {
    const s = window.TableModel.activeScene();
    return s && { name: s.name, ter: s.setup.terrain, w: s.setup.width, feats: s.features.length,
      units: window.Tokens.inScene(s.id).map(t => [t.name, t.lineKey, t.ent.col, t.fig]) };
  });
  T('bringing it puts the whole fight on the table in one move', !!brought
    && brought.name === 'Ambush at Crow Ford' && brought.ter === 'forest' && brought.feats === 2
    && brought.units.length === 3
    && brought.units.some(u => u[0] === 'Crow Archer' && u[1] === 'e-back' && u[2] === 3 && u[3] === 'archer'));
  T('the war room steps aside and the muster opens on it', await pg.evaluate(() =>
    document.getElementById('war').hidden && window.Muster.isOpen()));
  T('the mat is the forest\'s colour, and the obstacle is drawn in its slot', await pg.evaluate(() => {
    const cw = document.querySelector('#combat-prop .cwin');
    return cw.dataset.terrain === 'forest'
        && cw.style.getPropertyValue('--mat') === window.TableContent.TERRAINS.forest.mat.ground
        && !!document.querySelector('#field .free.ft-obstacle[data-line="a-front"][data-col="1"]');
  }));
  T('every unit on the mat wears its picture, not two letters', await pg.evaluate(() =>
    [...document.querySelectorAll('#field .ent:not(.ghost)')].every(e =>
      !!e.querySelector('.coin .tl-coin .tl-art') && !e.querySelector('.tok'))));
  T('and one Ctrl+Z takes the whole fight back off the table', await pg.evaluate(async () => {
    const n0 = window.TableModel.state.things.length;
    window.TableModel.undo();
    await new Promise(r => setTimeout(r, 200));
    const gone = window.TableModel.state.things.length === 0;
    window.TableModel.redo();
    await new Promise(r => setTimeout(r, 300));
    return n0 === 4 && gone && window.TableModel.state.things.length === 4;
  }));

  /* ══ AN OBSTACLE IS HONOURED ═══════════════════════════════ */
  await pg.evaluate(() => {
    const s = window.TableModel.activeScene();
    const t = window.Toolbox.take({ kind: 'token', char: 'c1', name: 'Aldric Vane', act: 'place' }, 900, 900,
                                  { side: 'al', fig: 'spearman' });
    window.Tokens.toLine(t.id, s.id, 'a-front', 1.5);
  });
  await wait(500);
  T('a unit dropped on an obstacle stands beside it, not in it', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.source === 'char');
    return t.lineKey === 'a-front' && t.ent.col !== 1;
  }));

  /* ══ THE MUSTER RUNS THE ROUND ═════════════════════════════ */
  T('the roll is everyone, in the order they act', await pg.evaluate(() => {
    const g = [...document.querySelectorAll('#muster .mu-grp')];
    const n = g.map(x => x.querySelectorAll('.mu-row').length);
    return g.length === 3 && n[0] === 1 && n[1] === 0 && n[2] === 3
        && g[0].classList.contains('now');
  }));
  await pg.evaluate(() => document.querySelector('#muster [data-mu="end"]').click());
  await wait(300);
  T('End turn hands the phase on, and the roll lights who acts now', await pg.evaluate(() =>
    S.phase === 1 && document.querySelectorAll('#muster .mu-grp')[1].classList.contains('now')));
  await pg.evaluate(() => {
    const row = [...document.querySelectorAll('#muster .mu-row')].find(r => /Crow Archer/.test(r.textContent));
    row.click();
  });
  await wait(250);
  T('choosing someone on the roll puts their card up, large', await pg.evaluate(() =>
    /Crow Archer/.test(document.querySelector('#muster .mu-card .mu-cn').textContent)
    && !!document.querySelector('#muster .mu-card .mu-map')));
  const hurt = await pg.evaluate(async () => {
    const id = S.sel, e = entById(id), was = e.hp;
    const amt = document.getElementById('mu-amt');
    amt.value = '4'; amt.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#muster [data-mu="hurt"]').click();
    await new Promise(r => setTimeout(r, 100));
    return [was, entById(id).hp];
  });
  T('Take takes what you set', hurt[1] === hurt[0] - 4);
  await pg.evaluate(async () => {
    document.querySelector('#muster [data-mu="addc"]').click();
    await new Promise(r => setTimeout(r, 60));
    document.querySelector('#muster [data-mu="give"]').click();
    await new Promise(r => setTimeout(r, 60));
  });
  T('a condition is given from the rules\' own list', await pg.evaluate(() =>
    (entById(S.sel).cond || []).length === 1
    && Object.keys(RULES.TOKENS).includes(entById(S.sel).cond[0].n)));
  await pg.evaluate(() => document.querySelector('#muster .mu-ln[data-line="e-sec"]').click());
  await wait(300);
  T('and the line map moves them — the same move the board makes', await pg.evaluate(() => {
    const t = window.TableModel.get(S.sel);
    return lineOf(S.sel).key === 'e-sec' && t.lineKey === 'e-sec';
  }));

  /* ══ PAINTING THE GROUND ON A RUNNING FIGHT ═════════════════ */
  await pg.evaluate(() => document.querySelector('#muster [data-mu="brush"][data-k="water"]').click());
  await wait(150);
  await pg.evaluate(() => document.querySelector('#field .free[data-line="a-back"][data-col="4"]')
    .dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await wait(300);
  T('a brush in the muster paints the ground onto the board', await pg.evaluate(() =>
    window.TableModel.activeScene().features.some(f => f.kind === 'water' && f.line === 'a-back' && f.col === 4)
    && !!document.querySelector('#field .free.ft-water[data-line="a-back"][data-col="4"]')));

  /* ══ AND KEPT THE OTHER WAY ════════════════════════════════ */
  await pg.evaluate(() => document.querySelector('#muster [data-mu="save"]').click());
  await wait(300);
  T('Save as prepared keeps the fight on the table — but not the players\' characters',
    await pg.evaluate(() => {
      const l = window.Encounters.list();
      const kept = l.find(e => e.id !== l[l.length - 1].id) || l[0];
      return l.length === 2 && kept.units.length === 3 && !kept.units.some(u => u.name === 'Aldric Vane')
          && kept.features.some(f => f.kind === 'water');
    }));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
