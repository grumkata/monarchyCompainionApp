/* THE HERALD — Blazon's motion is decoration, but the things it hangs off
   are not: going to a table must still land, a turn must still be cried, and
   the dice log must still be watched. 55-herald.js reaches all of those by
   watching the DOM, which is exactly the kind of wiring that goes quiet
   without anyone noticing — the End Turn cry did, once, because two
   observers ran in the wrong order. */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 940 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const site = await serve();
  const wait = ms => pg.waitForTimeout(ms);
  await pg.goto(site.url + '/monarchy.html'); await wait(2400);

  T('the herald is up, with its layer in the page', await pg.evaluate(() =>
    !!window.Herald && !!document.getElementById('herald')));

  /* ══ THE BEND ══════════════════════════════════════════════ */
  await pg.evaluate(() => localStorage.setItem('monarchy.tables.v3',
    JSON.stringify([{ id: 'hd-1', name: 'The Ashen Road', created: 1, opened: 0 }])));
  await pg.evaluate(() => { window.Shell.openTable('hd-1'); });
  await wait(60);
  T('going to a table draws the cloth first, and the hall is still behind it',
    await pg.evaluate(() => window.Herald.busy
      && document.body.classList.contains('at-hall')
      && document.getElementById('herald').classList.contains('wiping')));
  await wait(560);
  T('under the cloth, the table is raised and its name is on the card',
    await pg.evaluate(() => document.body.classList.contains('at-table')
      && document.querySelector('#herald .hr-card b').textContent === 'The Ashen Road'));
  T('and the corner of the table says which table it is', await pg.evaluate(() =>
    /The Ashen Road/.test(document.querySelector('.hud.tl').textContent)));
  /* the hold only starts once the table has finished booting — that is what
     the cloth is for — and a software GL boots slowly, so wait on the
     herald rather than on a number */
  T('the cloth comes off and lets go of the pointer', await pg.evaluate(() =>
    new Promise(r => {
      const t0 = Date.now();
      const tick = () => {
        const done = !window.Herald.busy
          && !document.getElementById('herald').classList.contains('wiping');
        if (done || Date.now() - t0 > 8000) return r(done);
        setTimeout(tick, 50);
      };
      tick();
    })));

  /* ══ THE CRY, ON A TURN ════════════════════════════════════ */
  await pg.evaluate(() => Toolbox.take({ act: 'make', kind: 'scene', scene: 'combat' }, 1200, 780));
  await wait(900);
  const band = () => pg.evaluate(() => {
    const t = document.querySelector('#herald .hr-band .hr-title');
    return t ? t.textContent : '';
  });
  T('putting a fight down is not a turn — nothing is cried', (await band()) === '');
  await pg.evaluate(() => document.getElementById('endturn').click());
  await wait(200);
  T('End Turn cries whose turn it now is', /Allies Act/i.test(await band()));
  await wait(1900);
  await pg.evaluate(() => { document.getElementById('endturn').click();
                            document.getElementById('endturn').click(); });
  await wait(200);
  const first = await band();
  T('and turning the round cries the round', /Enemies Act|Round 02/i.test(first));
  await wait(1700);
  T('one cry waits for another rather than talking over it', /Round 02/i.test(await band()));
  await wait(1800);

  /* ══ THE CRY, ON THE DICE ══════════════════════════════════ */
  await pg.evaluate(() => {
    const d = document.createElement('div');
    d.className = 'cl roll';
    d.innerHTML = '<b>GM</b><span class="rdice"><i class="hi">20</i></span><span class="rtot">20</span>';
    document.getElementById('chat-body').appendChild(d);
  });
  await wait(200);
  T('a natural twenty in the log is cried as Fortune', /Fortune/i.test(await band()));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
