/* Which of the app's operations does the database actually allow? Each one
   is tried on its own so the answer is a list, not a single yes/no. */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
  const site = await serve();
  await pg.goto(site.url + '/monarchy.html'); await pg.waitForTimeout(2500);
  const out = await pg.evaluate(async () => {
    const R = [];
    const uid = await window.Net.start();
    R.push(['sign in', window.Net.mode === 'firebase' ? 'ok (' + uid.slice(0,8) + '…)' : 'FELL BACK']);
    if (window.Net.mode !== 'firebase') return R;
    const W = 'PROBE' + Math.random().toString(36).slice(2,6).toUpperCase();
    const go = async (what, fn) => {
      try { await fn(); R.push([what, 'ok']); }
      catch (e) { R.push([what, String((e && (e.code||e.message)) || e)]); }
    };
    await go('read a table',      () => window.Net.get('tables/' + W + '/meta'));
    await go('write meta (host)', () => window.Net.set('tables/' + W + '/meta',
                                   { id:'p', name:'probe', host: uid, live:true, opened: Date.now() }));
    await go('write my seat',     () => window.Net.set('tables/' + W + '/seats/' + uid, 0));
    await go('write my presence', () => window.Net.set('tables/' + W + '/who/' + uid,
                                   { uid, name:'probe', n:0, seen: Date.now() }));
    await go('say something',     () => window.Net.push('tables/' + W + '/chat',
                                   { uid, who:'probe', text:'hello', at: Date.now() }));
    await go('bring a sheet',     () => window.Net.set('tables/' + W + '/sheets/s1',
                                   { id:'s1', by: uid, who:'probe', name:'x', at: Date.now() }));
    await go('write ANOTHER uid', () => window.Net.set('tables/' + W + '/who/somebody-else',
                                   { uid:'somebody-else', name:'impostor' }));
    await go('clean up',          () => window.Net.remove('tables/' + W));
    return R;
  });
  const pad = s => (s + '                    ').slice(0, 20);
  console.log('');
  out.forEach(([k,v]) => console.log('  ' + pad(k) + ' ' + v));
  await b.close(); process.exit(0);
})();
