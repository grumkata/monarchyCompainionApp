const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const S = n => '/tmp/mon/_f' + n + '.png';
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await pg.goto('file:///tmp/mon/dist/monarchy.html'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.Shell.openTable('fl-' + Date.now()));
  await pg.waitForTimeout(5000);

  /* 1 — holding a combat scene: is what hovers the sheet itself? */
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('scenes').find(o => o.name === 'Combat')));
  await pg.waitForTimeout(400);
  await pg.mouse.move(600, 420); await pg.waitForTimeout(4000);
  await pg.screenshot({ path: S(1) });
  console.log('held ' + JSON.stringify(await pg.evaluate(() => {
    const h = document.querySelector('.hand-hold');
    return { sheet: !!h.querySelector('.pv .cwin'), lines: h.querySelectorAll('.pv .line').length,
             rack: document.querySelectorAll('.hb-var').length };
  })));

  /* 2 — put it down, then a counter from the maker */
  await pg.mouse.down(); await pg.mouse.up(); await pg.waitForTimeout(3000);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(600);
  await pg.screenshot({ path: S(2) });

  /* 3 — the counter maker */
  await pg.evaluate(() => { window.Toolbox.open();
    document.querySelectorAll('.hb-slot')[1].click(); });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const c = document.querySelector('#hb-tray .hb-opt.custom'); if (c) c.click(); });
  await pg.waitForTimeout(2500);
  await pg.mouse.move(560, 520); await pg.waitForTimeout(3500);
  await pg.screenshot({ path: S(3) });
  console.log('maker ' + JSON.stringify(await pg.evaluate(() => ({
    maker: !!document.querySelector('.tk-maker, .tkm, [class*="tk-"]'),
    cls: [...document.querySelectorAll('body > div')].map(e => e.className).filter(Boolean)
  }))));
  await b.close();
})();
