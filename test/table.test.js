/* Unit tests for the table's model and content. No DOM, no jsdom —
   both files are deliberately DOM-free so this runs in plain node. */
const assert = require('assert');
const path = require('path');

/* the browser loads these as plain scripts onto window; in node they
   export, and the model finds the content through require */
global.window = undefined;
const Content = require(path.join(__dirname, '../src/js/21-table-content.js'));
globalThis.TableContent = Content;
const T = require(path.join(__dirname, '../src/js/22-table-model.js'));

let n = 0, bad = 0;
const ok = (name, fn) => {
  n++;
  try { fn(); console.log('  ok  ' + name); }
  catch (e) { bad++; console.log('FAIL  ' + name + '\n      ' + e.message); }
};

/* ── the catalogue ── */
ok('an option is defined once and scenes point at it', () => {
  Object.keys(Content.SCENES).forEach(k => {
    Content.SCENES[k].options.forEach(o =>
      assert.ok(Content.OPTIONS[o], k + ' asks for an option that does not exist: ' + o));
  });
});
ok('fog of war is shared by combat and exploration, not written twice', () => {
  assert.ok(Content.SCENES.combat.options.includes('fog'));
  assert.ok(Content.SCENES.exploration.options.includes('fog'));
  assert.strictEqual(typeof Content.OPTIONS.fog, 'object');
});
ok('the stage has no tokens to hide, so no fog', () => {
  assert.deepStrictEqual(Content.SCENES.stage.options, []);
});
ok('combat depth is fixed at 8 lines and is not a setup field', () => {
  assert.strictEqual(Content.SCENES.combat.fixed.lines, 8);
  assert.ok(!Content.SCENES.combat.setup.some(f => f.key === 'lines'));
});
ok('battlefield width is setup, not a table-wide setting', () => {
  const w = Content.SCENES.combat.setup.find(f => f.key === 'width');
  assert.ok(w && w.def === 8 && w.min < w.max);
});

/* ── the table ── */
const fresh = () => { T.state = { id:'t', version:1, things:[], bin:[], active:null, z:1 }; return T; };

ok('a new table is empty', () => {
  fresh(); assert.ok(T.isEmpty()); assert.strictEqual(T.state.active, null);
});
ok('a made scene carries its setup and its options', () => {
  fresh();
  const s = T.put({ kind:'scene', scene:'combat' });
  assert.strictEqual(s.setup.width, 8);
  assert.strictEqual(s.setup.model, 'none');
  assert.strictEqual(s.options.fog, false);
  assert.strictEqual(s.options.mana, 0);
  assert.strictEqual(s.options.flex, 'move');
});
ok('setup given at making time wins over the default', () => {
  fresh();
  const s = T.put({ kind:'scene', scene:'combat', setup:{ width:12 } });
  assert.strictEqual(s.setup.width, 12);
});
ok('one scene is active at a time', () => {
  fresh();
  const a = T.put({ kind:'scene', scene:'combat' });
  const b = T.put({ kind:'scene', scene:'stage' });
  T.activate(a.id); assert.strictEqual(T.state.active, a.id);
  T.activate(b.id); assert.strictEqual(T.state.active, b.id);
  assert.strictEqual(T.scenes().length, 2, 'both still exist, only one runs');
});
ok('a piece has one home, and moving between homes is the only change', () => {
  fresh();
  const fight = T.put({ kind:'scene', scene:'combat' });
  const tok = T.put({ kind:'token', name:'Hollow Knight' });
  assert.strictEqual(tok.in, null, 'starts on bare wood');
  T.homeTo(tok.id, fight.id);
  assert.strictEqual(tok.in, fight.id);
  assert.deepStrictEqual(T.inside(fight.id).map(t => t.id), [tok.id]);
  T.homeTo(tok.id, null);
  assert.strictEqual(tok.in, null);
  assert.strictEqual(T.all().length, 2, 'nothing was created or destroyed');
});
ok('a scene cannot be put inside a scene', () => {
  fresh();
  const a = T.put({ kind:'scene', scene:'combat' });
  const b = T.put({ kind:'scene', scene:'stage' });
  assert.strictEqual(T.homeTo(b.id, a.id), false);
});
ok('an option only takes if the scene actually has it', () => {
  fresh();
  const st = T.put({ kind:'scene', scene:'stage' });
  assert.strictEqual(T.setOption(st.id, 'fog', true), false, 'the stage has no fog');
  const c = T.put({ kind:'scene', scene:'combat' });
  assert.strictEqual(T.setOption(c.id, 'fog', true), true);
  assert.strictEqual(c.options.fog, true);
});
ok('a number option is clamped, a choice option is checked', () => {
  fresh();
  const c = T.put({ kind:'scene', scene:'combat' });
  T.setOption(c.id, 'mana', -50); assert.strictEqual(c.options.mana, 0);
  T.setOption(c.id, 'mana', 5000); assert.strictEqual(c.options.mana, 999);
  assert.strictEqual(T.setOption(c.id, 'flex', 'nonsense'), false);
  assert.strictEqual(c.options.flex, 'move');
  assert.strictEqual(T.setOption(c.id, 'flex', 'full'), true);
});
ok('width is clamped to something a rank can actually be', () => {
  fresh();
  const c = T.put({ kind:'scene', scene:'combat' });
  T.setSetup(c.id, 'width', 99); assert.strictEqual(c.setup.width, 14);
  T.setSetup(c.id, 'width', 0);  assert.strictEqual(c.setup.width, 3);
});
/* THE BIN IS A DELETE, and that is the whole of it now. grumkata: "from the
   bin there should be no ui, just when you drag it take the most recently
   binned item and deletes it". It used to keep twelve things and open a tray
   you browsed through, which quietly made it a second inventory to manage. */
ok('the bin deletes, and keeps nothing to browse', () => {
  fresh();
  const a = T.put({ kind:'note', name:'one' });
  const b = T.put({ kind:'note', name:'two' });
  T.bin(a.id); T.bin(b.id);
  assert.strictEqual(T.all().length, 0);
  assert.strictEqual(T.state.bin.length, 1, 'only the last one is held at all');
  assert.strictEqual(T.state.bin[0].name, 'two');
});
ok('and the one step back is the last thing you binned', () => {
  fresh();
  const note = T.put({ kind:'note', name:'the password' });
  T.bin(note.id);
  assert.strictEqual(T.all().length, 0);
  const back = T.undoBin();
  assert.strictEqual(back.name, 'the password');
  assert.strictEqual(T.all().length, 1);
  assert.strictEqual(T.state.bin.length, 0, 'and nothing is left to undo');
  assert.strictEqual(T.undoBin(), null);
});
ok('binning a scene puts what was in it back on the wood', () => {
  fresh();
  const fight = T.put({ kind:'scene', scene:'combat' });
  const tok = T.put({ kind:'token' });
  T.homeTo(tok.id, fight.id); T.activate(fight.id);
  T.bin(fight.id);
  assert.strictEqual(tok.in, null, 'the token is not binned with the scene');
  assert.strictEqual(T.state.active, null, 'and nothing is running');
});
ok('and twenty things binned leave twenty things gone', () => {
  fresh();
  for (let i = 0; i < 20; i++) { const t = T.put({ kind:'note' }); T.bin(t.id); }
  assert.strictEqual(T.all().length, 0);
  assert.strictEqual(T.state.bin.length, 1);
});
/* A PIECE HAS A SIZE, AND YOU CAN CHANGE IT. grumkata: "3d models should be
   scaleable". scaleTo has been in this file since it was written and nothing
   had ever called it — 23-table3d.js's wheel does now. */
ok('a piece can be resized, within reason', () => {
  fresh();
  const m = T.put({ kind:'model', model:'kit:tree' });
  assert.strictEqual(m.scale, 1);
  T.scaleTo(m.id, 2.5); assert.strictEqual(m.scale, 2.5);
  T.scaleTo(m.id, 99);  assert.strictEqual(m.scale, 4, 'clamped at the top');
  T.scaleTo(m.id, 0);   assert.strictEqual(m.scale, 0.25, 'and at the bottom');
});
ok('a locked thing does not move', () => {
  fresh();
  const a = T.put({ kind:'art', locked:true });
  assert.strictEqual(T.move(a.id, 40, 40), false);
  assert.strictEqual(a.x, 0);
});
ok('scale is clamped', () => {
  fresh();
  const a = T.put({ kind:'art' });
  T.scaleTo(a.id, 99); assert.strictEqual(a.scale, 4);
  T.scaleTo(a.id, 0);  assert.strictEqual(a.scale, 0.25);
});
ok('the box is yours in solo play, and the GM\'s in a session', () => {
  globalThis._sessionRole = undefined; assert.strictEqual(T.mayUseBox(), true);
  globalThis._sessionRole = 'player';  assert.strictEqual(T.mayUseBox(), false);
  globalThis._sessionRole = 'assistant'; assert.strictEqual(T.mayUseBox(), true);
  globalThis._sessionRole = 'gm';      assert.strictEqual(T.mayUseBox(), true);
  globalThis._sessionRole = undefined;
});
ok('at a live table a player may touch what they put down, and nothing else', () => {
  globalThis.Session = { live: true, role: 'player', uid: 'u-bob' };
  assert.strictEqual(T.mayUseBox(), false, 'no chest for a player');
  assert.strictEqual(T.mayTouch({ kind: 'note', by: 'u-bob' }), true, 'their own note');
  assert.strictEqual(T.mayTouch({ kind: 'ink', by: 'u-bob' }), true, 'their own drawing');
  assert.strictEqual(T.mayTouch({ kind: 'note', by: 'u-gm' }), false, 'somebody else\'s');
  assert.strictEqual(T.mayTouch({ kind: 'token' }), false, 'the GM\'s pieces');
  globalThis.Session = { live: true, role: 'gm', uid: 'u-gm' };
  assert.strictEqual(T.mayTouch({ kind: 'note', by: 'u-bob' }), true, 'the GM touches anything');
  delete globalThis.Session;
  assert.strictEqual(T.mayTouch({ kind: 'token' }), true, 'alone, it is all yours');
});
ok('taking a note back into your hand does not ask "bin it?"', () => {
  fresh();
  const was = globalThis.Options, asked = [];
  globalThis.Options = { get: k => (k === 'bin' ? 'on' : null) };
  const origConfirm = globalThis.confirm;
  globalThis.confirm = m => { asked.push(m); return false; };
  const n = T.put({ kind: 'note' });
  assert.strictEqual(T.bin(n.id), false, 'an ordinary bin asks, and was told no');
  assert.strictEqual(T.bin(n.id, true), true, 'a quiet one does not ask');
  assert.strictEqual(asked.length, 1);
  assert.ok(T.undo() && T.get(n.id), 'and Ctrl+Z still puts it back');
  globalThis.Options = was; globalThis.confirm = origConfirm;
});
ok('a change tells whoever is listening', () => {
  fresh();
  let heard = 0; const off = T.on(() => heard++);
  T.put({ kind:'note' }); assert.strictEqual(heard, 1);
  off(); T.put({ kind:'note' }); assert.strictEqual(heard, 1, 'and stops when told to');
});

/* == THE TABLE IS A REAL SIZE, AND IT SEATS EIGHT ==============
   Every size in the app is stated in millimetres of a 2.2m table (two
   units to the mm). These hold that: the day somebody puts a raw pixel
   number back on the wood, one of them goes red. */
ok('two units are one millimetre, on a table for eight', () => {
  assert.strictEqual(T.TW, 4400);
  assert.strictEqual(T.TH, 4400);
});
ok('a combat mat is a quarter of the wood, not half of it', () => {
  const mat = Content.SCENES.combat.size;
  assert.ok(mat.w / T.TW < 0.30,
    'a mat takes ' + Math.round(mat.w / T.TW * 100) + '% of the table');
});
ok('a new table has no chairs round it until somebody pulls one up', () => {
  fresh();
  T.load('scale-test');
  assert.strictEqual(T.seats().length, 0,
    'it must SEAT eight, which is not the same as always SHOWING eight');
});
ok('a table that was opened while the eight chairs existed loses them', () => {
  fresh();
  /* what a save written during that window actually looks like */
  const eight = [];
  for (let i = 0; i < 8; i++)
    eight.push({ id: 'seat-' + i, name: 'Empty chair', at: -180 + 45 * i, face: '', banner: '' });
  T.state.seats = eight;
  T.state.units = T.TW;
  /* the sweep load() runs */
  const mine = x => /^seat-[0-7]$/.test(x.id) && x.name === 'Empty chair' && !x.face && !x.banner;
  if (T.state.seats.length === 8 && T.state.seats.every(mine)) T.state.seats = [];
  assert.strictEqual(T.seats().length, 0, 'swept out of the save, not just out of the code');
});
ok('but a chair somebody actually pulled up stays', () => {
  fresh();
  T.load('keep-seats');
  T.addSeat({ name: 'Grum' });
  const id = T.seats()[0].id;
  assert.ok(!/^seat-[0-7]$/.test(id), 'addSeat gives it an id of its own');
  assert.strictEqual(T.seats()[0].name, 'Grum');
});
ok('and when eight do sit down they go all the way round', () => {
  fresh();
  T.load('scale-test-seats');
  for (let i = 0; i < 8; i++) T.addSeat({ name: 'Player ' + i });
  const at = T.seats().map(s => Math.round(s.at)).sort((x, y) => x - y);
  assert.deepStrictEqual(at, [-180, -135, -90, -45, 0, 45, 90, 135],
    'evenly round 360, not bunched onto the far arc');
});
ok('your own place is the near side, and the far one is across the wood', () => {
  fresh();
  T.load('scale-test-2');
  for (let i = 0; i < 8; i++) T.addSeat({ name: 'Player ' + i });
  const mine = T.seats()[0];
  assert.strictEqual(Math.round(mine.at), -180, 'seat 0 is the near side');
  const spot = T.seatSpot(mine, T.R * 0.7);
  assert.ok(spot.y > T.TH / 2, 'in front of you, not across the table');
  assert.strictEqual(Math.abs(Math.round(spot.r)) % 360, 0, 'square to you');
  const across = T.seatSpot(T.seats()[4], T.R * 0.7);
  assert.ok(across.y < T.TH / 2, 'and the far seat is across the wood');
});
ok('a table saved in the old 2600 space is moved into the new one', () => {
  fresh();
  T.state.units = 2600;
  T.state.things = [{ id: 'a', kind: 'note', x: 1300, y: 1300, w: 300, h: 210 }];
  const k = T.TW / T.state.units;
  T.state.things.forEach(t => ['x', 'y', 'w', 'h'].forEach(f => { t[f] = Math.round(t[f] * k); }));
  T.state.units = T.TW;
  assert.strictEqual(T.state.things[0].x, 2200,
    'the middle of the old wood is the middle of the new');
});

console.log('\n' + (n - bad) + ' passed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
