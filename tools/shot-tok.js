const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await pg.goto('file:///tmp/mon/dist/monarchy.html'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.Shell.openTable('tk-' + Date.now()));
  await pg.waitForTimeout(6000);
  /* three counters straight into the model: an ally unit, an enemy unit,
     an enemy formation */
  await pg.evaluate(() => {
    const T = window.TableModel;
    const mk = (name, side, kind, x, y) =>
      window.Tokens.make({ name, side, entKind: kind, source: 'npc', x, y });
    mk('Aldric', 'al', 'unit', 900, 1000);
    mk('Rooks',  'en', 'unit', 1350, 1000);
    mk('Banner', 'en', 'form', 1700, 1500);
  }).catch(e => console.log('MKERR ' + e.message));
  await pg.waitForTimeout(5000);
  console.log(JSON.stringify(await pg.evaluate(() => ({
    stands: document.querySelectorAll('.fg-stand').length,
    bits: typeof BITS !== 'undefined' && Object.keys(BITS).length,
    rects: [...document.querySelectorAll('.fg-stand')].map(e => {
      const r = e.getBoundingClientRect();
      return [e.dataset.stand, Math.round(r.x), Math.round(r.y),
              Math.round(r.width), Math.round(r.height)]; })
  }))));
  await pg.screenshot({ path:'/tmp/mon/_j2-tok.png' });
  await b.close();
})();
