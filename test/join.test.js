/* THE JOIN — a character made in the hall is the piece on the board and the
   record you open at the table. One object, three views, no copies.

   This is the test that matters: everything else checks that a part works;
   this checks that the parts are connected, which is what the app was missing. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const path = require('path');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 940 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const file = 'file://' + path.join(__dirname, '../dist/monarchy.html');

  await pg.goto(file); await pg.waitForTimeout(3200);
  /* a character, made the way the hall makes one */
  await pg.evaluate(() => {
    const c = Sheet.fill({}); c.id = 'c-join';
    c.who.name = 'Sir Aldric'; c.who.species = 'Human';
    c.attr.for = 8; c.attr.wil = 6;
    localStorage.setItem('monarchy.chars.v2', JSON.stringify([c]));
  });
  await pg.reload(); await pg.waitForTimeout(3000);

  T('the table can see the hall\'s roster', await pg.evaluate(() =>
    Characters.roster().length === 1 && Characters.nameOf(Characters.roster()[0]) === 'Sir Aldric'));

  T('and his health is the rules\' answer, not a typed number', await pg.evaluate(() =>
    Sheet.derived(Sheet.fill(Characters.get('c-join'))).hp === Characters.combatant(Characters.get('c-join')).hp));

  await pg.evaluate(() => Shell.openTable('join-test')); await pg.waitForTimeout(1800);
  await pg.evaluate(() => Toolbox.open()); await pg.waitForTimeout(600);

  /* The chest offers him as a COUNTER in a slot, not as a row reading his
     name — 46-figures.js draws the piece and the bar names only whatever you
     are pointing at. So the check is: he is in the bar, his slot holds a
     counter lettered from his name, and pointing at it says who he is. */
  /* He is in the PEOPLE tray, drawn as his own counter. The plank holds the
     kinds; the tray holds the actual people, and the bar names only whatever
     you are pointing at. */
  T('the chest offers him by name', await pg.evaluate(async () => {
    document.querySelectorAll('.hb-slot')[1].click();     /* People */
    await new Promise(r => setTimeout(r, 80));
    const n = Toolbox.options('people').findIndex(o => o.name === 'Sir Aldric');
    if (n < 0) return false;
    const slot = document.querySelectorAll('#hb-tray .hb-opt')[n];
    if (!slot) return false;
    const disc = slot.querySelector('.fg-tok b');
    if (!disc || disc.textContent !== 'SA') return false;
    slot.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    return document.getElementById('hb-tip').textContent.trim() === 'Sir Aldric';
  }));

  await pg.evaluate(() => Toolbox.take({ act: 'make', kind: 'scene', scene: 'combat' }, 1200, 780));
  await pg.waitForTimeout(1300);
  await pg.evaluate(() => Toolbox.take({ kind: 'token', char: 'c-join', name: 'Sir Aldric', act: 'place' }, 700, 700));
  await pg.waitForTimeout(600);

  T('taking him out puts HIM on the wood, not a blank counter', await pg.evaluate(() => {
    const t = TableModel.state.things.find(x => x.kind === 'token');
    return t.char === 'c-join' && t.ent.name === 'Sir Aldric'
        && t.ent.mono === 'SA' && t.ent.pc === true;
  }));

  await pg.evaluate(() => {
    const t = TableModel.state.things.find(x => x.kind === 'token');
    Tokens.toLine(t.id, TableModel.activeScene().id, S.lines.find(l => l.side === 'al').key);
    render();
  });
  await pg.waitForTimeout(700);

  T('and dropping him on a line makes him a combatant', await pg.evaluate(() =>
    document.querySelectorAll('#field .ent').length === 1
    && document.querySelector('#field .ent .nm').textContent === 'Sir Aldric'
    && document.querySelectorAll('#field .ent.pc').length === 1));

  await pg.evaluate(() => Papers.open('c-join')); await pg.waitForTimeout(700);
  T('his record opens at the table, on your own end', await pg.evaluate(() =>
    !document.getElementById('tp').hidden && !!document.querySelector('#tp .leaf')));

  /* the one that proves there is no copy */
  const before = await pg.evaluate(() => TableModel.state.things.find(x => x.kind === 'token').ent.max);
  await pg.evaluate(() => {
    const i = document.querySelector('#tp [data-p="attr.for"]');
    i.value = '10'; i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await pg.waitForTimeout(1200);
  const after = await pg.evaluate(() => ({
    tok: TableModel.state.things.find(x => x.kind === 'token').ent.max,
    board: (document.querySelector('#field .ent .hp') || {}).textContent,
    rec: Sheet.derived(Sheet.fill(Characters.get('c-join'))).hp
  }));

  T('raising Fortitude on that record changes the piece on the line',
    before === 8 && after.tok === 10 && after.rec === 10 && /10\/10/.test(after.board));

  T('so the sheet, the token and the roster are one record',
    after.tok === after.rec);

  /* ── A CHARACTER'S PICTURE IS THE CHARACTER'S ──────────────
     grumkata: "art should be able to pull from art inside the program and
     external art — this goes for character and token image". A face set on
     one of Aldric's counters is Aldric's face: it goes on the RECORD, so it
     reaches every other counter of him and the chest's own offer of him. */
  T('a face set on his counter is set on HIM', await pg.evaluate(() => {
    const t = TableModel.state.things.find(x => x.kind === 'token' && x.source === 'char');
    if (!t) return false;
    const a = Library.art.get('sprite:spearman');
    Tokens.edit(t.id, { art: a.id, src: a.src });
    const rec = Characters.get('c-join');
    return !!rec && rec.who.pic === a.src && rec.who.picArt === a.id;
  }));
  T('so the chest offers him wearing it', await pg.evaluate(() => {
    const o = Toolbox.options('people').find(x => x.name === 'Sir Aldric');
    return !!o && /^data:image/.test(o.v.src || '') && o.v.art === 'sprite:spearman';
  }));
  T('and a new counter of him arrives wearing it too', await pg.evaluate(() => {
    const o = Toolbox.options('people').find(x => x.name === 'Sir Aldric');
    Toolbox.take(o, 500, 500, o.v);
    const made = TableModel.state.things.filter(x => x.char === 'c-join').pop();
    return !!made && made.art === 'sprite:spearman';
  }));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
