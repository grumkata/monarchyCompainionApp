/* ══════════════════════════════════════════════════════════════
   handling.test.js — HOW IT FEELS IN THE HAND.

   Two things grumkata reported that no other suite could have
   caught, because both are about the relationship between where
   the pointer is and where the app thinks it is:

     "dragging a item it desynced so you drag faster than it moves
      and its hard to use"

     "when you go interactive on the combat map any movement
      immediately boots you which sucks"

   The first is a maths bug that only shows away from the centre of
   the view, so it is tested AT THE EDGES on purpose. The second is
   a rule about the table that did not know the field existed.
══════════════════════════════════════════════════════════════ */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const path = require('path');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const W = ms => pg.waitForTimeout(ms);
  await pg.goto('file://' + path.join(__dirname, '../dist/monarchy.html'));
  await W(900);
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    { id: 'c1', who: { name: 'Aldric Vane' } }])));
  await pg.evaluate(() => window.Shell.openTable('h-' + Date.now()));
  await W(1400);

  /* ══ THE DRAG TRACKS THE POINTER ═══════════════════════════ */
  await pg.evaluate(() => window.TableModel.put({ kind: 'note', x: 1300, y: 900,
                                                  w: 300, h: 210, text: '' }));
  await W(400);

  /* Drag from four different places in the view, including the corners, where
     a scale-factor approximation is most wrong. After each drag the point of
     the note you took hold of must still be under the pointer. */
  const drag = async (fx, fy, tx, ty) => pg.evaluate(async ([fx, fy, tx, ty]) => {
    const el = document.querySelector('.prop.t3-note');
    const grip = el.querySelector('.grip');
    const before = window.Table3D.screenToTable(fx, fy);
    const held = { x: before.x - +el.dataset.x, y: before.y - +el.dataset.y };
    const P = (t, x, y) => grip.dispatchEvent(new PointerEvent(t, {
      bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true }));
    /* the move and the up are listened for on window, not on the grip */
    const Pw = (t, x, y) => window.dispatchEvent(new PointerEvent(t, {
      bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true }));
    P('pointerdown', fx, fy);
    Pw('pointermove', tx, ty);
    const after = window.Table3D.screenToTable(tx, ty);
    const err = { x: Math.abs((+el.dataset.x + held.x) - after.x),
                  y: Math.abs((+el.dataset.y + held.y) - after.y) };
    Pw('pointerup', tx, ty);
    return err;
  }, [fx, fy, tx, ty]);

  /* move it somewhere reachable first */
  let e1 = await drag(600, 500, 620, 520);
  T('a piece stays under the point of it you took hold of', e1.x <= 1 && e1.y <= 1);

  const el0 = await pg.evaluate(() => {
    const el = document.querySelector('.prop.t3-note');
    const r = el.getBoundingClientRect();
    return [Math.round(r.x + r.width / 2), Math.round(r.y + 20)];
  });
  let e2 = await drag(el0[0], el0[1], 300, 780);
  T('and still does when dragged to the near corner, where the wood is widest',
    e2.x <= 2 && e2.y <= 2);

  const el1 = await pg.evaluate(() => {
    const el = document.querySelector('.prop.t3-note');
    const r = el.getBoundingClientRect();
    return [Math.round(r.x + r.width / 2), Math.round(r.y + 20)];
  });
  let e3 = await drag(el1[0], el1[1], 980, 300);
  T('and at the far corner, where it is narrowest', e3.x <= 2 && e3.y <= 2);

  /* ── AND EVERY KIND OF PIECE IS ITS OWN HANDLE ────────────
     A note used to be draggable only by a title bar nine pixels tall, with a
     body under it that swallowed the press outright. Every piece is grabbed
     from anywhere on it now; the few real controls on one are excepted. */
  const grabbable = async (sel) => pg.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'missing';
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    return !!(hit && hit.closest && hit.closest('.grip')) ? true : ('no grip: ' +
      (hit ? hit.className : 'nothing'));
  }, sel);

  await pg.evaluate(() => {
    const o = window.Toolbox.options('models').find(x => x.name === 'Boulder');
    window.Toolbox.take(o, 1900, 700, o.v);
    const a = window.Toolbox.options('art').find(x => x.id === 'art:sprite:lich');
    window.Toolbox.take(a, 2100, 1300, a.v);
    window.Tokens.make({ source: 'npc', name: 'A watchman', x: 400, y: 1500 });
  });
  await W(700);
  T('the middle of a note is a handle',   await grabbable('.prop.t3-note') === true);
  T('the middle of a model is a handle',  await grabbable('.prop.t3-model') === true);
  T('the middle of a picture is a handle',await grabbable('.prop.t3-art') === true);
  T('the middle of a counter is a handle',await grabbable('.prop.t3-token') === true);

  /* and writing on a note is a second, deliberate act */
  /* PUT THE NOTE SOMEWHERE OF ITS OWN FIRST. The drags above leave it
     wherever the last one ended, and on a round table 2600 across that
     happened to be exactly under the boulder — so the double-click went to
     the boulder's grab surface and the note never opened. The failure was
     this fixture stacking two pieces, not the note; a test that clicks a
     point has to own that point. */
  await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'note');
    window.TableModel.move(t.id, 1300, 1900);
  });
  await W(400);
  T('a note is shut until you double-click it', await pg.evaluate(() =>
    document.querySelector('.nt-body').getAttribute('contenteditable') === 'false'));
  T('and nothing else is lying on top of it', await pg.evaluate(() => {
    const n = document.querySelector('.prop.t3-note .nt-body');
    const r = n.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!hit && !!hit.closest('.prop.t3-note');
  }));
  /* TWO PRESSES, DISPATCHED IN THE PAGE. Not page.dblclick and not two
     page.mouse presses: opening a note is counted from pointerdown, because
     picking a note up calls preventDefault and that eats the browser's own
     dblclick — and a press driven from OUTSIDE this page takes about three
     seconds to come back under swiftshader, which is nine times the 450ms
     the second press has to arrive within. The gap being an artefact of the
     harness rather than of the app is exactly the kind of thing that gets
     mistaken for a bug, so the presses are sent from inside, back to back,
     the way a hand sends them. */
  await pg.evaluate(() => {
    const n = document.querySelector('.prop.t3-note .nt-body');
    const r = n.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const P = () => document.elementFromPoint(x, y)
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true,
        clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true }));
    P(); P();
  });
  await W(250);
  T('and then it is open, and the table stops hearing your keys',
    await pg.evaluate(() => {
      const n = document.querySelector('.nt-body');
      return n.getAttribute('contenteditable') === 'true'
          && !n.classList.contains('grip')
          && document.activeElement === n;
    }));
  await pg.keyboard.type('a rumour');
  await pg.evaluate(() => document.querySelector('.nt-body').blur());
  await W(300);
  T('what you wrote is kept, and it is a handle again', await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'note');
    const n = document.querySelector('.nt-body');
    return /a rumour/.test(t.text || '')
        && n.getAttribute('contenteditable') === 'false' && n.classList.contains('grip');
  }));

  /* ══ THE IMMERSIVE VIEW DOES NOT THROW YOU OUT ═════════════
     Against a STUB field, deliberately. The bug was never in the field —
     it was in this file's rule that pressing off a locked scene lets go of
     it, which did not know the field existed. Booting the real field costs a
     grass instancer and a sky, and under swiftshader it takes the renderer
     down; stubbing it tests the rule that was actually wrong, and does it in
     a second instead of a minute. */
  await pg.evaluate(() => {
    window.__fieldReal = window.__field;
    window.__fieldState = { on: false, cam: { dist: 36, height: 14.2, look: -1.0, pan: 0, zoom: 1 },
                            placed: 0, picked: null };
    window.__field = {
      on: () => window.__fieldState.on,
      set: v => { window.__fieldState.on = !!v; },
      get cam() { return window.__fieldState.cam; },
      place: () => { window.__fieldState.placed++; },
      pick: (x, y) => { window.__fieldState.picked = [x, y]; return null; },
      aim: () => {}
    };
  });

  await pg.evaluate(() => {
    const t = window.TableModel.put({ kind: 'scene', scene: 'combat',
      setup: { width: 8, model: 'none' }, x: 860, y: 287, w: 1180, h: 1426, locked: true });
    window.TableModel.activate(t.id);
  });
  await W(900);
  await pg.evaluate(() => window.Table3D.lockIn(document.getElementById('combat-prop')));
  await W(1000);
  T('locking a scene in is still a thing you can do',
    await pg.evaluate(() => document.body.classList.contains('locked-in')));

  /* ── LOCKED IN, AND STAYING THERE ─────────────────────────
     Before the field is even involved: locking into a fight and then MOVING
     used to throw you out, because pressing anywhere off the sheet unlocked
     and because panning far enough to see the other end of the board failed
     an "is it still in view" test. Both are gone. */
  const lockedAfter = async (fn) => { await fn();
    return pg.evaluate(() => document.body.classList.contains('locked-in')); };

  T('panning the wood while locked in does not throw you out',
    await lockedAfter(async () => {
      await pg.mouse.move(300, 700); await pg.mouse.down();
      await pg.mouse.move(520, 500, { steps: 6 }); await W(120);
      await pg.mouse.up(); await W(200);
    }));
  T('and nor does panning far enough to see the other end of the board',
    await lockedAfter(async () => {
      for (let i = 0; i < 3; i++) {
        await pg.mouse.move(1000, 700); await pg.mouse.down();
        await pg.mouse.move(200, 200, { steps: 8 }); await pg.mouse.up();
        await W(120);
      }
    }));
  T('and zooming in on it does not either', await lockedAfter(async () => {
    await pg.mouse.move(600, 450);
    for (let i = 0; i < 4; i++) { await pg.mouse.wheel(0, -120); await W(60); }
    await W(200);
  }));
  T('but pulling right back out lets go of it, because that is deliberate',
    await pg.evaluate(async () => {
      const vp = document.getElementById('vp');
      for (let i = 0; i < 14; i++) {
        vp.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, clientX: 600,
          clientY: 450, bubbles: true, cancelable: true }));
      }
      await new Promise(r => setTimeout(r, 400));
      return !document.body.classList.contains('locked-in');
    }));

  /* back in, for the field half */
  await pg.evaluate(() => window.Table3D.lockIn(document.getElementById('combat-prop')));
  await W(900);
  await pg.evaluate(() => window.__field.set(true));
  await W(200);

  const pan0 = await pg.evaluate(() => window.__field.cam.pan);
  await pg.mouse.move(700, 500);
  await pg.mouse.down();
  await pg.mouse.move(560, 520, { steps: 4 });
  await W(150);
  T('dragging in the field does NOT boot you out of it',
    await pg.evaluate(() => window.__field.on()));
  T('it walks the camera along the line instead',
    await pg.evaluate(p0 => Math.abs(window.__field.cam.pan - p0) > 1, pan0));
  T('and looks up and down it', await pg.evaluate(() => window.__fieldState.cam.look !== -1.0));
  T('and the table underneath is left exactly where it was',
    await pg.evaluate(() => window.__fieldState.placed > 0));
  await pg.mouse.up();
  await W(150);
  T('letting go leaves you standing there', await pg.evaluate(() => window.__field.on()));

  /* a press that does not travel is a click on what is in front of you */
  await pg.mouse.move(750, 480); await pg.mouse.down(); await pg.mouse.up();
  await W(200);
  T('a press that does not travel still leaves you in the field',
    await pg.evaluate(() => window.__field.on()));
  T('and is a click on whatever you pressed',
    await pg.evaluate(() => !!window.__fieldState.picked));

  await pg.keyboard.press('Escape'); await W(400);
  T('Escape steps out one at a time: the field first, the lock after',
    await pg.evaluate(() => !window.__field.on()
      && document.body.classList.contains('locked-in')));
  await pg.keyboard.press('Escape'); await W(700);
  T('and then out of the lock', await pg.evaluate(() =>
    !document.body.classList.contains('locked-in')));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
