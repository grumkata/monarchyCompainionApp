/* ══════════════════════════════════════════════════════════════
   table-ui.test.js — THE CHEST, THE BAR, AND WHAT IS IN YOUR HAND.

   Runs against the built dist/monarchy.html, so it tests what
   actually ships rather than what the sources say.

   The old version of this file tested a drawer with tabs, a search
   field and a grid of cards, and it PASSED — which is the problem.
   Every one of those assertions was a check that the menu grumkata
   kept rejecting was still exactly where he left it. The assertions
   below are written from his own words instead:

     "it should be like mario maker or minecraft ui where you SEE
      the item your about to put down like a physical thing"

     "when you go to grab something it should show you the options
      of grabbing it, you shouldn't just grab a piece of art and
      then separately choose the art after placing it"

     "the combat scene should be locked in place and fitted on the
      table ... on creation locked in place and fitted to the
      fucking table"

   So: no slot may contain a word. What you take out must be in your
   hand, on the wood, before it is anywhere else. The choice must be
   makeable while it is in your hand. A scene must land fitted.
══════════════════════════════════════════════════════════════ */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const path = require('path');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const file = 'file://' + path.join(__dirname, '../dist/monarchy.html');
  const st = () => pg.evaluate(() => JSON.parse(JSON.stringify(window.TableModel.state)));
  const wait = ms => pg.waitForTimeout(ms);

  await pg.goto(file);
  await wait(900);
  /* three people in the hall's roster, because a table is mostly the people
     at it and the bar has to offer them BY NAME rather than offering a blank
     counter you then type a name into */
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    { id: 'c1', who: { name: 'Aldric Vane' } },
    { id: 'c2', who: { name: 'Mira Solthorn' } },
    { id: 'c3', who: { name: 'Brother Kell' } }])));
  await pg.evaluate(() => window.Shell.openTable('t-' + Date.now()));
  await wait(1500);

  /* ══ THE TABLE ITSELF ══════════════════════════════════════ */
  T('a new table is empty besides the chest and the bin', await pg.evaluate(() =>
    window.TableModel.isEmpty()
    && !!document.getElementById('tb-anchor') && !!document.getElementById('tb-bin-prop')
    && document.querySelectorAll('.prop.t3-thing').length === 0));

  /* THE TABLE IS A MODEL. It used to be four CSS .edge faces round a
     rectangle pretending to have thickness. grumkata: "find a good looking
     circular table and replace the current table with that" — so the wood is
     Table_Round_A out of the Assets pack, drawn on its own canvas under the
     props, and .slab is now nothing but the round hit area they live on. */
  T('the table is a real round model, not four CSS faces', await pg.evaluate(() =>
    !!document.getElementById('vp') && !!document.getElementById('tbl')
    && document.querySelectorAll('#tbl .slab.round').length === 1
    && document.querySelectorAll('#tbl .edge').length === 0
    && !!document.getElementById('tglu')
    && typeof WOOD === 'object' && !!WOOD.Table_Round_A
    && /rotateX\(/.test(document.getElementById('tbl').style.transform)));

  /* and it is measured off the wood, not guessed: two invisible marks at the
     ends of a diameter give the model its centre and its width on screen */
  T('and it is sized off the wood itself, by two marks a diameter apart',
    await pg.evaluate(() => {
      /* the marks sit at the two ends of the horizontal diameter. Perspective
         makes the near edge wider than the far one, so this distance is NOT
         the slab's bounding box — it is the width of the wood across its
         middle, which is exactly what the model has to be scaled to. Check it
         by going back the other way: what point on the wood is each mark? */
      const P = e => { const r = document.getElementById(e).getBoundingClientRect();
                       return window.Table3D.screenToTable(r.left, r.top); };
      const l = P('tm-l'), r = P('tm-r');
      return Math.abs(l.x) < 6 && Math.abs(r.x - window.Table3D.TW) < 6
          && Math.abs(l.y - window.Table3D.TH / 2) < 6
          && Math.abs(r.y - window.Table3D.TH / 2) < 6;
    }));

  T('and it stands on a floor at its own depth, so panning parallaxes',
    await pg.evaluate(() => {
      const f = document.querySelector('.floorboards');
      if (!f) return false;
      /* the floor lives BELOW the table canvas now (#tblu, z-index 0) — inside
         #tbl it painted straight over the wood and the table was invisible */
      if (!f.closest('#tblu')) return false;
      /* the browser hands back a matrix3d; m43 is the z translation */
      const m = getComputedStyle(f).transform.match(/matrix3d\(([^)]+)\)/);
      return !!m && parseFloat(m[1].split(',')[14]) < -300;
    }));

  /* THE ROOM. The fit used to run the slab edge to edge with the viewport, so
     you never once saw where the table ended — "it doesn't look 3d ... not
     like a real table you're playing on with friends". You have to be able to
     see that it is an object. */
  T('the fit leaves the table some room to be an object in', await pg.evaluate(() => {
    const s = document.querySelector('#tbl .slab').getBoundingClientRect();
    const v = document.getElementById('vp').getBoundingClientRect();
    return s.width < v.width * 0.96 && s.left > v.left + 8;
  }));

  T('the chest is the real asset, drawn in GL', await pg.evaluate(() =>
    typeof CHEST === 'object' && !!CHEST.lid && !!CHEST.open
    && !!document.getElementById('tgl') && !!window.TableGL && window.TableGL.ready));

  /* THE BIN IS ON THE TABLE. grumkata: "take the bin and remove it from being
     stuck to the screen instead imbed it into the table just like the chest
     bottom left is prefrable". The old objection — that framing a scene
     carried a bin pinned to the wood off the viewport — died when the camera
     was clamped to the table. */
  T('the bin is embedded in the wood, not stuck to the screen', await pg.evaluate(() => {
    const e = document.getElementById('tb-bin-prop');
    return e.parentNode === document.getElementById('tbl')
        && e.classList.contains('prop') && e.classList.contains('fixed')
        && getComputedStyle(e).position !== 'fixed';
  }));
  T('and both it and the chest stand INSIDE the circle, on wood that exists',
    await pg.evaluate(() => {
      const R = window.Table3D.TW / 2, cx = R, cy = window.Table3D.TH / 2;
      return ['tb-bin-prop', 'tb-anchor'].every(id => {
        const e = document.getElementById(id);
        return Math.hypot(+e.dataset.x - cx, +e.dataset.y - cy) < R * 0.85;
      });
    }));
  T('and it is on screen, so the GL layer draws it', await pg.evaluate(() => {
    const r = document.getElementById('tb-bin-prop').getBoundingClientRect();
    return r.width > 40 && r.right <= window.innerWidth + 1
        && r.bottom <= window.innerHeight + 1;
  }));

  /* ══ THE BAR ═══════════════════════════════════════════════ */
  T('the bar is down to begin with', await pg.evaluate(() =>
    !window.Hand.isUp() && !document.querySelector('.hb.up')));

  await pg.click('#tb-anchor', { force: true });
  await wait(700);
  T('opening the chest brings the bar up', await pg.evaluate(() =>
    window.Hand.isUp() && !!document.querySelector('.hb.up')
    && document.querySelectorAll('.hb-slot').length > 0));

  /* THE ASSERTION THIS WHOLE FILE EXISTS FOR.
     Every slot holds a drawing, and NO SLOT PRINTS THE THING'S NAME. The two
     letters moulded into a counter are not a label — they are on the piece
     itself, the way they are on the pieces on the board — so the test is
     about names, which is what the rule is actually about. */
  /* NOT "no letters anywhere in the slot" any more, and the difference
     matters. A scene's slot is now the real battlefield sheet made small
     (51-preview.js), and that sheet has words ON it — Backline, The Line,
     End Turn — because the object itself does. Words that are part of the
     thing are not a label. What must never come back is a slot whose text is
     a CAPTION: a name written beside the drawing because the drawing did not
     say enough. So: something is drawn, and no text lives outside it. */
  T('NOTHING IN A SLOT IS A LABEL — every slot holds a drawing', await pg.evaluate(() => {
    const s = [...document.querySelectorAll('.hb-slot')];
    if (!s.length) return false;
    return s.every(x => {
      if (!x.querySelector('.fg, .pv')) return false;   /* a drawing is in there */
      const c = x.cloneNode(true);
      c.querySelectorAll('.fg, .pv, .hb-key').forEach(n => n.remove());
      return !/\S/.test(c.textContent);
    });
  }));

  T('the name appears once, above the bar, for whatever you point at',
    await pg.evaluate(async () => {
      document.querySelectorAll('.hb-slot')[0]
        .dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await new Promise(r => setTimeout(r, 80));
      const t = document.getElementById('hb-tip');
      return t.classList.contains('on') && t.textContent.trim().length > 0;
    }));

  /* ══ THE PLANK HOLDS KINDS; THE TRAY HOLDS THE ACTUAL THINGS ══
     grumkata: "you should select an object generalization then get a list of
     options + custom option and from there you place it". */
  T('the plank holds the kinds, and always the same ones', await pg.evaluate(() =>
    window.Toolbox.KINDS().map(k => k.id).join(',')
      === 'scenes,people,art,models,papers,notes'));

  T('and every kind slot is drawn as a real member of that kind, not a symbol',
    await pg.evaluate(() => {
      const K = window.Toolbox.KINDS();
      const models = K.find(k => k.id === 'models');
      const art = K.find(k => k.id === 'art');
      return !!(models.figv && models.figv.model) && !!(art.figv && art.figv.art);
    }));

  T('the people tray is your roster, then someone else, then a formation',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('people');
      const n = o.map(x => x.name);
      return n.includes('Aldric Vane') && n.includes('Mira Solthorn')
          && o[o.length - 2].custom === 'npc' && o[o.length - 1].custom === 'form';
    }));

  T('the art tray is the art inside the app, and ends in one off your machine',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('art');
      return o.length > 10 && o.some(x => /^art:sprite:/.test(x.id))
          && o.some(x => /^art:charge:/.test(x.id))
          && o[o.length - 1].custom === 'picture';
    }));

  T('and the models tray is the assets that were already baked in',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('models');
      return o.length > 15 && o.every(x => x.kind === 'model' && !!x.v.model)
          && o.some(x => x.name === 'Tree');
    }));

  await pg.evaluate(() => document.querySelectorAll('.hb-slot')[1].click());
  await wait(300);
  T('picking a kind opens its tray, drawn the same way the plank is',
    await pg.evaluate(() => {
      const t = document.getElementById('hb-tray');
      return !t.hidden && t.querySelectorAll('.hb-opt').length ===
             window.Toolbox.options('people').length
          && t.querySelectorAll('.hb-opt .fg').length ===
             t.querySelectorAll('.hb-opt').length;
    }));
  T('and the slots that MAKE one are marked, not written out',
    await pg.evaluate(() => {
      const c = document.querySelectorAll('#hb-tray .hb-opt.custom');
      return c.length === 2 && [...c].every(b => !!b.querySelector('.hb-plus')
        && !/[A-Za-z]{3,}/.test(b.textContent));   /* a small tray, no names */
    }));

  /* ══ TAKING ONE OUT ════════════════════════════════════════ */
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('scenes').find(o => o.name === 'Combat')));
  await wait(300);
  await pg.mouse.move(700, 450);
  await wait(250);

  T('taking one out puts it IN YOUR HAND, on the wood', await pg.evaluate(() =>
    document.body.classList.contains('holding')
    && !!document.querySelector('#tbl .hand-hold')
    && !!document.querySelector('#tbl .hand-hold .fg, #tbl .hand-hold .pv')));

  /* grumkata, twice: "for scenes and combat YOU STILL ARNT SHOWING WHAT YOUR
     PUTTING DOWN FFS". What is over the wood is the battlefield sheet, with
     its ranks and its Line — not a little green grid standing for one. */
  T('and a SCENE in your hand is the sheet itself, not an icon of one',
    await pg.evaluate(() => {
      const h = document.querySelector('#tbl .hand-hold');
      return !!h.querySelector('.pv .cwin')
          && h.querySelectorAll('.pv .line').length === 8
          && !!h.querySelector('.pv .mid');
    }));

  T('and its shadow is a second object lying on the boards', await pg.evaluate(() =>
    !!document.querySelector('#tbl .hand-shade')
    && +document.querySelector('#tbl .hand-hold').dataset.z
       > +document.querySelector('#tbl .hand-shade').dataset.z + 40));

  /* THE CHOICE IS MADE IN THE HAND. */
  T('a battlefield in your hand shows you the widths it could be',
    await pg.evaluate(() => {
      const r = document.getElementById('hb-rack');
      /* three sheets, at three different widths — the choice is the board
         getting wider in front of you, not a number in a dialog */
      const w = [...r.querySelectorAll('.hb-var')].map(b => {
        const bd = b.querySelector('.pv .board');
        return bd ? bd.style.getPropertyValue('--w') : null;
      });
      return !r.hidden && w.length === 3 && w.every(Boolean)
          && new Set(w).size === 3;
    }));

  /* the width lives on the sheet's own board now, because the thing in your
     hand IS the sheet — same custom property 32-combat-app.js renders with */
  const cols = () => pg.evaluate(() =>
    +document.querySelector('.hand-hold .pv .board').style.getPropertyValue('--w'));
  const wide0 = await cols();
  await pg.mouse.wheel(0, 120);
  await wait(300);
  const wide1 = await cols();
  T('and the wheel WIDENS THE BOARD IN YOUR HAND, not a number in a dialog',
    wide0 === 8 && wide1 === 12);

  T('a scene you are holding already sits fitted on the slab', await pg.evaluate(() => {
    const g = document.querySelector('.hand-hold');
    return Math.abs(+g.dataset.x - (window.Table3D.TW - 1180) / 2) < 2
        && Math.abs(+g.dataset.y - (window.Table3D.TH - 1426) / 2) < 2;
  }));

  await pg.mouse.move(640, 420);
  await pg.mouse.down(); await pg.mouse.up();
  await wait(900);
  let s = await st();
  T('letting go of it makes it a thing on the table',
    s.things.length === 1 && s.things[0].kind === 'scene' && s.things[0].scene === 'combat');
  T('with the width you chose while you were holding it', s.things[0].setup.width === 12);
  T('and it starts running', s.active === s.things[0].id);
  /* the wood's size is the app's to say — it changed once (square, so a
     round table could be inscribed in it) and hard-coded numbers here failed
     a passing app. Ask it. */
  const TBL = await pg.evaluate(() => [window.Table3D.TW, window.Table3D.TH]);
  T('LOCKED IN PLACE AND FITTED, on creation', s.things[0].locked === true
    && Math.abs(s.things[0].x - (TBL[0] - 1180) / 2) < 2
    && Math.abs(s.things[0].y - (TBL[1] - 1426) / 2) < 2);
  T('and the whole of it is on the wood, not hanging off the edge',
    s.things[0].x >= 0 && s.things[0].y >= 0
    && s.things[0].x + s.things[0].w <= TBL[0] && s.things[0].y + s.things[0].h <= TBL[1]);
  T('and inside the CIRCLE, which is the part you can actually see',
    (() => { const t = s.things[0], cx = TBL[0]/2, cy = TBL[1]/2, R = TBL[0]/2;
      return [[t.x,t.y],[t.x+t.w,t.y],[t.x,t.y+t.h],[t.x+t.w,t.y+t.h]]
        .every(([x,y]) => Math.hypot(x-cx, y-cy) <= R + 1); })());
  T('putting a scene down empties your hand — one of those is a whole evening',
    await pg.evaluate(() => !window.Hand.held && !document.body.classList.contains('holding')));

  T('the combat sheet IS the scene, not a card about it', await pg.evaluate(() => {
    const el = document.getElementById('combat-prop');
    return el && el.style.display !== 'none'
        && !document.querySelector('.prop.t3-scene[data-id]');
  }));
  T('the lines are the rules\' eight, at the width you chose', await pg.evaluate(() =>
    typeof S !== 'undefined' && S.lines.length === 8 && S.width === 12));

  /* ══ A PIECE, WHERE YOU PUT IT ═════════════════════════════ */
  await pg.click('#tb-anchor', { force: true });
  await wait(600);
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('people').find(o => o.name === 'Aldric Vane')));
  await wait(300);
  await pg.mouse.move(560, 560);
  await wait(250);

  T('a person out of the chest is that person, drawn as a counter',
    await pg.evaluate(() => {
      const e = document.querySelector('.hand-hold .fg-tok b');
      return !!e && e.textContent === 'AV';
    }));
  T('and you may turn them over to the other side before you place them',
    await pg.evaluate(() => document.querySelectorAll('#hb-rack .hb-var').length === 2));

  const want = await pg.evaluate(() => window.Table3D.screenToTable(560, 560));
  await pg.mouse.down(); await pg.mouse.up();
  await wait(600);
  s = await st();
  const tok = s.things.find(t => t.kind === 'token');
  T('it lands where you let go of it, on the wood', !!tok
    && Math.abs(tok.x + tok.w / 2 - want.x) < 45
    && Math.abs(tok.y + tok.h / 2 - want.y) < 45);
  T('and it IS the character — its hit points come from the record',
    !!tok && tok.char === 'c1' && !!tok.ent && tok.ent.name === 'Aldric Vane');
  T('you are still holding one, the way Mario Maker leaves a brick in your hand',
    await pg.evaluate(() => !!window.Hand.held));

  await pg.keyboard.press('Escape');
  await wait(300);
  T('and Escape puts it back', await pg.evaluate(() =>
    !window.Hand.held && !document.querySelector('.hand-hold')));

  /* ══ THE PICTURE IS CHOSEN BEFORE ANYTHING IS IN YOUR HAND ══
     grumkata: "art should be able to pull from art inside the program ...
     and external art". Both live in the same tray, so which picture is
     settled before you are carrying anything, never after you place it. */
  T('the art inside the app is offered as itself, not as a name',
    await pg.evaluate(() => {
      const o = window.Toolbox.options('art').find(x => /^art:sprite:/.test(x.id));
      return !!o && /^data:image/.test(o.v.src || '');
    }));

  /* ── AND IT LANDS AT ITS OWN PROPORTIONS ──────────────────
     "artwork not autofitting to the image". A pack entry has no pixel size
     written down anywhere, so the picture is decoded on the way down and the
     box corrects itself — which is why this is tested by placing one rather
     than by reading a number off the offer. */
  await pg.evaluate(() => {
    const o = window.Toolbox.options('art').find(x => x.id === 'art:sprite:archer');
    window.Toolbox.take(o, 700, 700, o.v);
  });
  await wait(600);
  T('and a picture lands at its own proportions, with nothing drawn round it',
    await pg.evaluate(async () => {
      const t = window.TableModel.state.things.filter(x => x.kind === 'art').pop();
      if (!t) return false;
      const real = await new Promise(r => {
        const im = new Image();
        im.onload = () => r(im.naturalWidth / im.naturalHeight);
        im.onerror = () => r(0);
        im.src = t.src;
      });
      if (!real) return false;
      if (Math.abs(t.w / t.h - real) > 0.02) return false;
      const pic = document.querySelector('.prop.t3-art .t3-pic');
      const cs = pic && getComputedStyle(pic);
      /* no frame this app invented for your artwork */
      return !!cs && cs.paddingTop === '0px' && cs.borderTopWidth === '0px';
    }));

  T('and a picture off your machine is measured and kept',
    await pg.evaluate(() => {
      const before = window.Library.art.all().length;
      const e = window.Library.art.add({ name: 'Test', src: 'data:image/gif;base64,R0lGOD',
                                         w: 400, h: 250 });
      const after = window.Library.art.all().length;
      const found = window.Library.art.get(e.id);
      window.Library.art.remove(e.id);
      return after === before + 1 && !!found && found.w === 400;
    }));
  T('and a map and a backdrop are chosen the same way', await pg.evaluate(() => {
    const m = window.Figures.variantsFor({ kind: 'scene', scene: 'exploration' });
    const b2 = window.Figures.variantsFor({ kind: 'scene', scene: 'stage' });
    return m.pick === 'image' && m.field === 'map'
        && b2.pick === 'image' && b2.field === 'backdrop';
  }));

  /* ══ A MODEL IS A MODEL ════════════════════════════════════
     grumkata: "3d models dont work at all even though i have so many assets
     to use". They are drawn by the GL layer over an invisible anchor, the
     same way the chest is, out of the packs that were already baked in. */
  await pg.evaluate(() => {
    const o = window.Toolbox.options('models').find(x => x.name === 'Tree');
    window.Toolbox.take(o, 500, 500, o.v);
  });
  await wait(500);
  T('a model put down is a real asset, not a drawing of a block',
    await pg.evaluate(() => {
      const t = window.TableModel.state.things.find(x => x.kind === 'model');
      if (!t || t.model !== 'kit:tree') return false;
      const el = document.querySelector('.prop.t3-model[data-id="' + t.id + '"]');
      /* the face is deliberately empty — the GL layer paints over its rect */
      return !!el && !!el.querySelector('.t3-mdl-grab')
          && !el.querySelector('img') && el.getBoundingClientRect().width > 10;
    }));
  T('and it stands as wide as its own entry says, not a fixed box',
    await pg.evaluate(() => {
      const t = window.TableModel.state.things.find(x => x.kind === 'model');
      const m = window.Library.models.get('kit:tree');
      return t.w === m.foot && t.h === m.foot;
    }));

  /* a preview that is a render of the thing, cached only once its textures
     have actually arrived — see the note in 27-table-gl.js */
  await pg.evaluate(() => new Promise(r => {
    if (!window.TableGL.waiting) return r();
    window.TableGL.onTextures(r); setTimeout(r, 6000);
  }));
  T('and its preview in the box is a render of it, not an impression of one',
    await pg.evaluate(() => {
      const png = window.TableGL.thumb('kit:tree', 96);
      return typeof png === 'string' && png.indexOf('data:image/png') === 0
          && png.length > 900;
    }));

  /* ══ A COUNTER IS ONE OF THREE THINGS ══════════════════════ */
  await pg.evaluate(() => {
    const o = window.Toolbox.blankToken('npc');
    o.v.name = 'Hollow Knight'; o.v.hpMax = 26; o.v.side = 'en';
    window.Toolbox.take(o, 400, 1500, o.v);
    const f = window.Toolbox.blankToken('form');
    f.v.name = 'Levies'; f.v.entKind = 'form';
    window.Toolbox.take(f, 900, 1500, f.v);
  });
  await wait(400);
  T('an NPC is its own thing, with the stats you gave it', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.name === 'Hollow Knight');
    return !!t && t.source === 'npc' && !t.char
        && t.ent.max === 26 && t.ent.side === 'en' && t.ent.pc === false;
  }));
  T('a formation is a body of troops, and stands wider than a person',
    await pg.evaluate(() => {
      const f = window.TableModel.state.things.find(x => x.name === 'Levies');
      const p = window.TableModel.state.things.find(x => x.source === 'npc');
      return !!f && f.source === 'form' && f.ent.kind === 'form' && f.w > p.w;
    }));
  T('and a counter that came from a record keeps the record\'s health',
    await pg.evaluate(() => {
      const t = window.TableModel.state.things.find(x => x.source === 'char');
      if (!t) return false;
      const was = t.ent.max;
      window.Tokens.edit(t.id, { max: 999 });        /* refused: it is the record's */
      const still = window.TableModel.get(t.id).ent.max === was;
      window.Tokens.edit(t.id, { info: 'owes me a favour' });
      return still && window.TableModel.get(t.id).info === 'owes me a favour';
    }));
  T('a counter can wear a face out of the art inside the app',
    await pg.evaluate(() => {
      const t = window.TableModel.state.things.find(x => x.source === 'npc');
      window.Tokens.edit(t.id, { art: 'sprite:lich',
        src: window.Library.art.get('sprite:lich').src });
      const el = document.querySelector('.prop.t3-token[data-id="' + t.id + '"] .fg-tok');
      return !!el && el.classList.contains('faced') && !!el.querySelector('.fg-disc img');
    }));

  /* ══ THE BIN IS A DELETE, AND HAS NO INTERFACE ═════════════
     grumkata: "from the bin there should be no ui, just when you drag it
     take the most recently binned item and deletes it". It used to keep
     twelve things, wear a count badge, and open a tray you browsed — which
     made the bin a second inventory to keep tidy. */
  await pg.evaluate(id => window.TableModel.bin(id), tok.id);
  await wait(400);
  s = await st();
  T('the bin takes it off the table', !s.things.some(t => t.id === tok.id));
  T('and shows nothing at all — no count, no badge, nothing to open',
    await pg.evaluate(() => {
      const b = document.getElementById('tb-bin-prop');
      return !document.getElementById('tb-bin-count')
          && !/\S/.test(b.textContent)
          && typeof window.Toolbox.openBin !== 'function';
    }));
  T('and it has no tray of its own to open', await pg.evaluate(async () => {
    const before = document.querySelectorAll('.hb-slot').length;
    document.getElementById('tb-bin-prop').click();
    await new Promise(r => setTimeout(r, 250));
    /* nothing about the bar changed, and the bin is not a kind you can ask
       for — `options('bin')` used to hand back everything you had thrown out */
    return document.querySelectorAll('.hb-slot').length === before
        && window.Toolbox.options('bin').length === 0
        && !window.Toolbox.KINDS().some(k => k.id === 'bin');
  }));
  /* the one step back, and it is a keystroke rather than furniture */
  T('Ctrl+Z is the whole of the bin\'s interface', await pg.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown',
      { key: 'z', ctrlKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    return window.TableModel.state.things.some(t => t.kind === 'token')
        && window.TableModel.state.bin.length === 0;
  }));

  /* ══ IT SURVIVES A RELOAD ══════════════════════════════════ */
  const was = await st();
  await pg.reload(); await wait(1100);
  await pg.evaluate(id => window.Shell.openTable(id), was.id);
  await wait(1300);
  const now = await st();
  T('everything is where it was after a reload',
    now.things.length === was.things.length && now.active === was.active
    && now.things[0].setup.width === 12);

  /* ══ THE BOX IS THE GM'S ═══════════════════════════════════ */
  await pg.evaluate(() => { _sessionRole = 'player'; window.Toolbox.gate(); });
  T('a player is not shown a box they cannot open', await pg.evaluate(() =>
    document.getElementById('tb-anchor').hidden
    && document.getElementById('tb-bin-prop').hidden));
  await pg.evaluate(() => { _sessionRole = 'assistant'; window.Toolbox.gate(); });
  T('an assistant is', await pg.evaluate(() =>
    !document.getElementById('tb-anchor').hidden));
  await pg.evaluate(() => { _sessionRole = null; window.Toolbox.gate(); });
  T('and solo play is its own GM', await pg.evaluate(() =>
    !document.getElementById('tb-anchor').hidden && window.TableModel.mayUseBox()));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
