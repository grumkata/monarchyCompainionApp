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
ok('a change tells whoever is listening', () => {
  fresh();
  let heard = 0; const off = T.on(() => heard++);
  T.put({ kind:'note' }); assert.strictEqual(heard, 1);
  off(); T.put({ kind:'note' }); assert.strictEqual(heard, 1, 'and stops when told to');
});

console.log('\n' + (n - bad) + ' passed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
