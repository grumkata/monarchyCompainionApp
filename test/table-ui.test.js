/* ══════════════════════════════════════════════════════════════
   table-ui.test.js — THE TOOLBOX, THE WORKBENCH, AND WHAT IS IN YOUR HAND.

   Runs against the built dist/monarchy.html, so it tests what
   actually ships rather than what the sources say.

   The version of this file before 2026-09-25 tested a chest standing
   on the wood, a bin beside it and a bar that came up out of the
   chest — and it passed, right up until grumkata asked for all three
   to go. The assertions below are written from his words instead:

     "remove the physical toolbox and bin they look mid"

     "we need the ability to add things to the table to be more
      custmisable BEFORE Placing them"

     "tokens souldnt look how they currently look same with many
      objects in the toolbox who look weird and artifical and
      straight up dont work sometimes"

   and keep the rules the chest got right: what you take out is in
   your hand, over the wood, before it is anywhere else; a scene lands
   fitted to the table; the box is the GM's.
══════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  /* NO executablePath — Playwright resolves its own install. --no-sandbox is
     needed in a container, and swiftshader gives a headless box a GL context. */
  const b = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
  });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const site = await serve();
  const file = site.url + '/monarchy.html';
  const st = () => pg.evaluate(() => JSON.parse(JSON.stringify(window.TableModel.state)));
  const wait = ms => pg.waitForTimeout(ms);
  /* press like a person does — page.click waits on navigations that never
     come against this page (see the note this used to carry) */
  const press = async sel => {
    const r = await pg.evaluate(s => {
      const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }, sel);
    if (!r) throw new Error('nothing to press: ' + sel);
    await pg.mouse.move(r.x, r.y);
    await wait(60);
    await pg.mouse.down(); await wait(70); await pg.mouse.up();
  };

  await pg.goto(file);
  await wait(900);
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    { id: 'c1', who: { name: 'Aldric Vane' } },
    { id: 'c2', who: { name: 'Mira Solthorn' } },
    { id: 'c3', who: { name: 'Brother Kell' } }])));
  await pg.evaluate(() => window.Shell.openTable('t-' + Date.now()));
  await wait(1500);

  /* ══ THE TABLE ITSELF ══════════════════════════════════════ */
  T('a new table is empty — nothing stands on the wood, not even a chest or a bin',
    await pg.evaluate(() =>
      window.TableModel.isEmpty()
      && !document.getElementById('tb-anchor') && !document.getElementById('tb-bin-prop')
      && document.querySelectorAll('#tbl .prop.t3-thing').length === 0));

  T('the table is a real round model, not four CSS faces', await pg.evaluate(() =>
    !!document.getElementById('vp') && !!document.getElementById('tbl')
    && document.querySelectorAll('#tbl .slab.round').length === 1
    && document.querySelectorAll('#tbl .edge').length === 0
    && !!document.getElementById('tglu')
    && typeof WOOD === 'object' && !!WOOD.Table_Round_A
    && /rotateX\(/.test(document.getElementById('tbl').style.transform)));

  T('and it is sized off the wood itself, by two marks a diameter apart',
    await pg.evaluate(() => {
      const P = e => { const r = document.getElementById(e).getBoundingClientRect();
                       return window.Table3D.screenToTable(r.left, r.top); };
      const l = P('tm-l'), r = P('tm-r');
      return Math.abs(l.x) < 6 && Math.abs(r.x - window.Table3D.TW) < 6
          && Math.abs(l.y - window.Table3D.TH / 2) < 6
          && Math.abs(r.y - window.Table3D.TH / 2) < 6;
    }));

  T('and it stands on the room\'s own floor, at a depth of its own',
    await pg.evaluate(() => {
      if (document.querySelector('.floorboards')) return false;
      if (document.querySelector('#tblu .floor')) return false;
      const rows = window.TableGL.planRows();
      if (!rows.some(r => r.k === 'floor')) return false;
      return Math.abs(window.__stageZ()) > 40;
    }));

  T('the fit leaves the table some room to be an object in', await pg.evaluate(() => {
    const s = document.querySelector('#tbl .slab').getBoundingClientRect();
    const v = document.getElementById('vp').getBoundingClientRect();
    return s.width < v.width * 0.96 && s.left > v.left + 8;
  }));

  T('the chest, the bin and the plastic board-game bits are not built in any more',
    await pg.evaluate(() => typeof CHEST === 'undefined' && typeof BIN3D === 'undefined'
      && typeof BITS === 'undefined' && !!window.TableGL && window.TableGL.ready));

  /* ══ THE TOOLBOX IS ON THE SCREEN ══════════════════════════ */
  T('the GM has a rail, and the toolbox is on it', await pg.evaluate(() => {
    const r = document.querySelector('.gmr');
    return !!r && !r.hidden && !!r.querySelector('[data-g="box"]')
        && !!r.querySelector('[data-g="war"]');
  }));
  T('the toolbox is shut to begin with', await pg.evaluate(() =>
    !window.Hand.isUp() && !window.Toolbox.isOpen()));

  await press('.gmr [data-g="box"]');
  await wait(600);
  T('pressing it docks the toolbox at your left hand', await pg.evaluate(() => {
    const d = document.getElementById('tbx');
    if (!d || d.hidden || !window.Hand.isUp()) return false;
    const r = d.getBoundingClientRect();
    return r.left < 120 && r.width < 460 && r.height > 500
        && document.querySelectorAll('#tbx .tbx-kind').length === 6;
  }));
  T('and the table\'s view moves over to make room for it, rather than lying under it',
    await pg.evaluate(() => {
      const d = document.getElementById('tbx').getBoundingClientRect();
      return document.getElementById('vp').getBoundingClientRect().left >= d.right - 1;
    }));

  T('the six kinds are the same six', await pg.evaluate(() =>
    window.Toolbox.KINDS().map(k => k.id).join(',') === 'scenes,people,art,models,papers,notes'));
  T('and each is drawn as a real member of itself, with its name', await pg.evaluate(() => {
    const K = window.Toolbox.KINDS();
    const tabs = [...document.querySelectorAll('#tbx .tbx-kind')];
    return !!K.find(k => k.id === 'models').figv.model && !!K.find(k => k.id === 'art').figv.art
        && tabs.every(t => !!t.querySelector('.fg, .pv') && /\S/.test(t.querySelector('b').textContent));
  }));

  T('the people are your roster, then a new person, then a new formation',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('people'), n = o.map(x => x.name);
      return n.includes('Aldric Vane') && n.includes('Mira Solthorn')
          && o[o.length - 2].custom === 'npc' && o[o.length - 1].custom === 'form';
    }));
  T('the art is the pictures inside the app, and ends in one from your computer',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('art');
      return o.filter(x => /^art:sprite:/.test(x.id)).length === 5
          && o[o.length - 1].custom === 'picture'
          && !o.some(x => /^art:charge:/.test(x.id));
    }));
  /* "many objects in the toolbox who look weird and artifical" */
  T('the models are real assets — and the plastic pieces and the cream tray are gone',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('models');
      return o.length > 60 && o.every(x => x.kind === 'model' && !!x.v.model)
          && o.some(x => x.name === 'Tree')
          && !o.some(x => /^model:(bit|prop):/.test(x.id));
    }));
  T('with the wilds and a dungeon to build with', await pg.evaluate(() => {
    const g = window.Library.models.groups().map(x => x.name);
    return g.includes('Wilds') && g.includes('Dungeon') && g.includes('Stonework')
        && !!window.Library.models.get('dun:pillar') && !!window.Library.models.get('terra:dead1');
  }));

  await pg.evaluate(() => document.querySelectorAll('#tbx .tbx-kind')[1].click());
  await wait(300);
  T('every tile is the thing itself, with its name under it', await pg.evaluate(() => {
    const t = [...document.querySelectorAll('#tbx-grid .tbx-tile')];
    return t.length === window.Toolbox.options('people').length
        && t.every(x => !!x.querySelector('.fg') && /\S/.test(x.querySelector('.tbx-nm').textContent));
  }));

  /* ══ CUSTOMISED BEFORE IT IS PLACED ════════════════════════ */
  await pg.evaluate(() => [...document.querySelectorAll('#tbx-grid .tbx-tile')]
    .find(x => /new person/i.test(x.textContent)).click());
  await wait(400);
  T('choosing one opens its workbench — nothing is in your hand yet', await pg.evaluate(() =>
    !document.getElementById('tbx-bench').hidden && !window.Hand.held
    && ['Name', 'Side', 'Size', 'Health', 'Look', 'Picture'].every(l =>
         [...document.querySelectorAll('#tbx-bench .wb-lbl')].some(x => x.textContent.trim().indexOf(l) === 0))));

  await pg.evaluate(async () => {
    const q = s => document.querySelector('#tbx-bench ' + s);
    const nm = q('.wb-in[data-f="name"]');
    nm.value = 'Hollow Knight'; nm.dispatchEvent(new Event('input', { bubbles: true }));
    q('.wb-pen[data-f="side"][data-val="en"]').click();
    const hp = q('.wb-num[data-f="hpMax"]');
    hp.value = '26'; hp.dispatchEvent(new Event('change', { bubbles: true }));
    q('.wb-pen[data-f="look"][data-val="coin"]').click();
    q('.wb-face[title="Lich"]').click();
    await new Promise(r => setTimeout(r, 100));
  });
  T('and the thing on the bench changes as you choose', await pg.evaluate(() => {
    const coin = document.querySelector('#tbx-bench #wb-stage .tl-coin.en');
    const art = coin && coin.querySelector('.tl-art');
    return !!art && art.style.backgroundImage.indexOf(SPRITES.lich.src) >= 0
        && /Hollow Knight/.test(document.querySelector('#tbx-bench .wb-plate').textContent);
  }));

  await pg.evaluate(() => document.querySelector('#tbx-bench [data-wb="take"]').click());
  await wait(300);
  await pg.mouse.move(820, 560);
  await wait(300);
  T('taking it puts what you made IN YOUR HAND, over the wood', await pg.evaluate(() =>
    document.body.classList.contains('holding')
    && !!window.Hand.held && window.Hand.held.variant.name === 'Hollow Knight'
    && !!document.querySelector('#tbl .hand-hold .fg-tok.en.look-coin')));
  T('and its shadow is a second object lying on the boards', await pg.evaluate(() =>
    !!document.querySelector('#tbl .hand-shade')
    && +document.querySelector('#tbl .hand-hold').dataset.z
       > +document.querySelector('#tbl .hand-shade').dataset.z + 40));

  const want = await pg.evaluate(() => window.Table3D.screenToTable(820, 560));
  await pg.mouse.down(); await pg.mouse.up();
  await wait(600);
  let s = await st();
  const hk = s.things.find(t => t.name === 'Hollow Knight');
  T('it lands where you let go of it', !!hk
    && Math.abs(hk.x + hk.w / 2 - want.x) < 45 && Math.abs(hk.y + hk.h / 2 - want.y) < 45);
  T('exactly as you made it', !!hk && hk.ent.side === 'en' && hk.ent.max === 26
    && hk.look === 'coin' && hk.ent.look === 'coin' && hk.fig === 'lich' && hk.source === 'npc');
  T('and you are still holding one, the way Mario Maker leaves a brick in your hand',
    await pg.evaluate(() => !!window.Hand.held));
  await pg.keyboard.press('Escape');
  await wait(300);
  T('Escape puts it back', await pg.evaluate(() =>
    !window.Hand.held && !document.querySelector('.hand-hold')));

  /* ══ A FIGHT, SET UP BEFORE IT IS PUT DOWN ═════════════════ */
  await pg.evaluate(() => { window.Hand.closeBench(true); document.querySelectorAll('#tbx .tbx-kind')[0].click(); });
  await wait(300);
  await pg.evaluate(() => [...document.querySelectorAll('#tbx-grid .tbx-tile')]
    .find(x => x.querySelector('.tbx-nm').textContent === 'Combat').click());
  await wait(400);
  T('a fight\'s bench offers its ground and its width', await pg.evaluate(() =>
    document.querySelectorAll('#tbx-bench .wb-ter').length === 8
    && !!document.querySelector('#tbx-bench .wb-num[data-f="width"]')));
  await pg.evaluate(async () => {
    const q = s => document.querySelector('#tbx-bench ' + s);
    q('.wb-ter[data-val="dungeon"]').click();
    for (let i = 0; i < 4; i++) q('.wb-step[data-f="width"][data-step="1"]').click();
    const nm = q('.wb-in[data-f="name"]');
    nm.value = 'The Crypt'; nm.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
  });
  T('and the mat on the bench is that ground\'s colour', await pg.evaluate(() => {
    const cw = document.querySelector('#tbx-bench #wb-stage .cwin');
    return !!cw && cw.dataset.terrain === 'dungeon'
        && cw.style.getPropertyValue('--mat') === window.TableContent.TERRAINS.dungeon.mat.ground;
  }));
  await pg.evaluate(() => document.querySelector('#tbx-bench [data-wb="place"]').click());
  await wait(1200);
  s = await st();
  const sc = s.things.find(t => t.kind === 'scene');
  const TBL = await pg.evaluate(() => [window.Table3D.TW, window.Table3D.TH]);
  T('it lands as you set it: its ground, its width, its name', !!sc
    && sc.setup.terrain === 'dungeon' && sc.setup.width === 12 && sc.name === 'The Crypt');
  T('LOCKED IN PLACE AND FITTED, and running', !!sc && sc.locked === true && s.active === sc.id
    && Math.abs(sc.x - (TBL[0] - 1180) / 2) < 2 && Math.abs(sc.y - (TBL[1] - 1426) / 2) < 2);
  T('inside the circle, which is the part you can actually see', !!sc &&
    [[sc.x, sc.y], [sc.x + sc.w, sc.y], [sc.x, sc.y + sc.h], [sc.x + sc.w, sc.y + sc.h]]
      .every(([x, y]) => Math.hypot(x - TBL[0] / 2, y - TBL[1] / 2) <= TBL[0] / 2 + 1));
  T('the combat sheet IS the scene, dressed in its ground', await pg.evaluate(() => {
    const el = document.getElementById('combat-prop');
    return el && el.style.display !== 'none' && el.dataset.terrain === 'dungeon'
        && !document.querySelector('.prop.t3-scene[data-id]');
  }));
  T('the lines are the rules\' eight, at the width you chose', await pg.evaluate(() =>
    typeof S !== 'undefined' && S.lines.length === 8 && S.width === 12));
  T('and the muster opens with it, where the toolbox was', await pg.evaluate(() =>
    window.Muster.isOpen() && !window.Toolbox.isOpen()
    && !document.getElementById('muster').hidden));

  /* ══ PICTURES AND MODELS ═══════════════════════════════════ */
  T('the art inside the app is offered as itself, not as a name',
    await pg.evaluate(async () => {
      const o = window.Toolbox.options('art').find(x => /^art:sprite:/.test(x.id));
      const src = o && o.v && o.v.src;
      if (!src) return false;
      return await new Promise(r => {
        const im = new Image();
        im.onload = () => r(im.naturalWidth > 0 && im.naturalHeight > 0);
        im.onerror = () => r(false);
        im.src = src;
      });
    }));
  await pg.evaluate(() => {
    const o = window.Toolbox.options('art').find(x => x.id === 'art:sprite:archer');
    window.Toolbox.take(o, 700, 700, o.v);
  });
  await wait(600);
  T('a picture lands at its own proportions, with nothing drawn round it',
    await pg.evaluate(async () => {
      const t = window.TableModel.state.things.filter(x => x.kind === 'art').pop();
      if (!t) return false;
      const real = await new Promise(r => {
        const im = new Image();
        im.onload = () => r(im.naturalWidth / im.naturalHeight);
        im.onerror = () => r(0);
        im.src = t.src;
      });
      if (!real || Math.abs(t.w / t.h - real) > 0.02) return false;
      const pic = document.querySelector('.prop.t3-art .t3-pic');
      const cs = pic && getComputedStyle(pic);
      return !!cs && cs.paddingTop === '0px' && cs.borderTopWidth === '0px';
    }));
  T('a picture from your computer is measured and kept', await pg.evaluate(() => {
    const before = window.Library.art.all().length;
    const e = window.Library.art.add({ name: 'Test', src: 'data:image/gif;base64,R0lGOD', w: 400, h: 250 });
    const after = window.Library.art.all().length;
    const found = window.Library.art.get(e.id);
    window.Library.art.remove(e.id);
    return after === before + 1 && !!found && found.w === 400;
  }));
  T('a map and a backdrop are chosen as pictures', await pg.evaluate(() => {
    const m = window.Figures.variantsFor({ kind: 'scene', scene: 'exploration' });
    const b2 = window.Figures.variantsFor({ kind: 'scene', scene: 'stage' });
    return m.pick === 'image' && m.field === 'map' && b2.pick === 'image' && b2.field === 'backdrop';
  }));

  await pg.evaluate(() => {
    const o = window.Toolbox.options('models').find(x => x.name === 'Tree');
    window.Toolbox.take(o, 500, 500, Object.assign({}, o.v, { rot: 90 }));
  });
  await wait(500);
  T('a model put down is a real asset, not a drawing of a block', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'model');
    if (!t || t.model !== 'kit:tree') return false;
    const el = document.querySelector('.prop.t3-model[data-id="' + t.id + '"]');
    return !!el && !!el.querySelector('.t3-mdl-grab') && !el.querySelector('img')
        && el.getBoundingClientRect().width > 10;
  }));
  T('it stands as wide as its own entry says, facing the way it was set', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'model');
    const m = window.Library.models.get('kit:tree');
    return t.w === m.foot && t.h === m.foot && t.rot === 90;
  }));
  await pg.evaluate(() => { window.TableGL.thumb('kit:tree', 96); });
  await pg.evaluate(() => new Promise(r => {
    if (!window.TableGL.waiting) return r();
    window.TableGL.onTextures(r); setTimeout(r, 8000);
  }));
  T('and its preview is a render of it, at any facing', await pg.evaluate(() => {
    const a = window.TableGL.thumb('kit:tree', 96), q = window.TableGL.thumb('kit:tree', 96, Math.PI / 2);
    return typeof a === 'string' && a.indexOf('data:image/png') === 0 && a.length > 900
        && typeof q === 'string' && q !== a;
  }));

  /* ══ A COUNTER IS ONE OF THREE THINGS, AND LOOKS LIKE SOMEBODY ═ */
  await pg.evaluate(() => {
    const f = window.Toolbox.blankToken('form');
    f.v.name = 'Levies'; f.v.entKind = 'form'; f.v.bodies = 12;
    window.Toolbox.take(f, 900, 1500, f.v);
    window.Toolbox.take({ kind: 'token', char: 'c1', name: 'Aldric Vane', act: 'place' }, 1100, 1500,
                        { side: 'al', fig: 'spearman' });
  });
  await wait(400);
  /* "straight up dont work sometimes": a formation came out undefined/undefined */
  T('a formation is a body of troops with a body\'s numbers', await pg.evaluate(() => {
    const f = window.TableModel.state.things.find(x => x.name === 'Levies');
    const p = window.TableModel.state.things.find(x => x.name === 'Hollow Knight');
    const e = f && f.ent;
    return !!e && f.source === 'form' && e.kind === 'form' && e.total === 12 && e.alive === 12
        && e.hpea > 0 && typeof e.skl === 'string' && e.lead === 'Stable' && f.w > p.w;
  }));
  T('an NPC is its own thing, with the stats you gave it', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.name === 'Hollow Knight');
    return !!t && t.source === 'npc' && !t.char && t.ent.max === 26 && t.ent.pc === false;
  }));
  T('a counter that came from a record keeps the record\'s health', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.source === 'char');
    if (!t) return false;
    const was = t.ent.max;
    window.Tokens.edit(t.id, { max: 999 });
    const still = window.TableModel.get(t.id).ent.max === was;
    window.Tokens.edit(t.id, { info: 'owes me a favour' });
    return still && window.TableModel.get(t.id).info === 'owes me a favour';
  }));
  /* "tokens souldnt look how they currently look" — no meeple, a person */
  T('a standing counter is a picture on a base, not a plastic meeple', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.source === 'char');
    const el = document.querySelector('.prop.t3-token[data-id="' + t.id + '"] .fg-stand');
    return !!el && el.dataset.src === SPRITES.spearman.src && el.dataset.cut === '1'
        && el.dataset.side === 'al';
  }));

  /* ══ WHAT REPLACED THE BIN ═════════════════════════════════ */
  const hkId = hk && hk.id;
  await pg.evaluate(id => window.TableModel.select(id), hkId);
  await wait(250);
  T('selecting a piece shows what you can do to it', await pg.evaluate(() => {
    const i = document.querySelector('.insp');
    return !!i && !i.hidden && /Hollow Knight/.test(i.textContent)
        && ['edit', 'dup', 'bin'].every(k => !!i.querySelector('[data-i="' + k + '"]'));
  }));
  await pg.evaluate(() => document.querySelector('.insp [data-i="dup"]').click());
  await wait(300);
  T('Duplicate makes another one beside it', await pg.evaluate(() =>
    window.TableModel.state.things.filter(x => x.name === 'Hollow Knight').length === 2));
  await pg.evaluate(() => document.querySelector('.insp [data-i="bin"]').click());
  await wait(300);
  T('Remove takes it off the table', await pg.evaluate(() =>
    window.TableModel.state.things.filter(x => x.name === 'Hollow Knight').length === 1));
  T('and Ctrl+Z puts it back', await pg.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    return window.TableModel.state.things.filter(x => x.name === 'Hollow Knight').length === 2;
  }));
  await pg.evaluate(id => { window.TableModel.select(id); document.querySelector('.insp [data-i="edit"]').click(); }, hkId);
  await wait(400);
  T('Edit opens the same workbench it was made on, changing it where it stands',
    await pg.evaluate(async id => {
      const q = s => document.querySelector('#tbx-bench ' + s);
      if (!q('.wb.editing')) return false;
      q('.wb-pen[data-f="look"][data-val="standee"]').click();
      await new Promise(r => setTimeout(r, 100));
      return window.TableModel.get(id).look === 'standee';
    }, hkId));

  /* ══ IT SURVIVES A RELOAD ══════════════════════════════════ */
  const was = await st();
  await pg.reload(); await wait(1100);
  await pg.evaluate(id => window.Shell.openTable(id), was.id);
  await wait(1300);
  const now = await st();
  T('everything is where it was after a reload',
    now.things.length === was.things.length && now.active === was.active
    && now.things.find(t => t.kind === 'scene').setup.terrain === 'dungeon');

  /* ══ THE BOX IS THE GM'S ═══════════════════════════════════ */
  await pg.evaluate(() => { _sessionRole = 'player'; window.Toolbox.gate(); });
  T('a player is not shown the GM\'s rail, and the box will not open for them',
    await pg.evaluate(() => {
      window.Toolbox.open();
      return document.querySelector('.gmr').hidden && !window.Toolbox.isOpen();
    }));
  await pg.evaluate(() => { _sessionRole = 'assistant'; window.Toolbox.gate(); });
  T('an assistant is', await pg.evaluate(() => !document.querySelector('.gmr').hidden));
  await pg.evaluate(() => { _sessionRole = null; window.Toolbox.gate(); });
  T('and solo play is its own GM', await pg.evaluate(() =>
    !document.querySelector('.gmr').hidden && window.TableModel.mayUseBox()));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
