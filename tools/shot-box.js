const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const step = process.argv[2] || 'kinds';
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await pg.goto('file:///tmp/mon/dist/monarchy.html'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.Shell.openTable('bx-' + Date.now()));
  await pg.waitForTimeout(4500);
  await pg.evaluate(() => window.Toolbox.open());
  await pg.waitForTimeout(1200);
  if (step !== 'kinds') {
    await pg.evaluate(k => {
      const n = { scenes:0, people:1, art:2, models:3, papers:4, notes:5 }[k];
      document.querySelectorAll('.hb-slot')[n].click();
    }, step);
    await pg.waitForTimeout(2600);
  }
  console.log(JSON.stringify(await pg.evaluate(() => {
    const box = document.querySelector('.hb, .hand, #hand, .hb-bar');
    const R = e => { const r = e.getBoundingClientRect();
      return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]; };
    return {
      bars: [...document.querySelectorAll('.hb-bar,.hb,.hb-tray,.hb-plank')]
              .map(e => [e.className, R(e)]),
      tabs: [...document.querySelectorAll('.hb-tab')].map(e => e.textContent.trim()),
      opts: document.querySelectorAll('.hb-opt').length,
      tray: (t => t && R(t))(document.querySelector('.hb-tray')),
      clipped: (() => { const i = document.querySelector('.hb-tray-in');
        return i ? [i.scrollHeight, i.clientHeight] : null; })(),
      held: window.Hand && window.Hand.held ? window.Hand.held.offer.kind : null
    };
  })));
  await pg.screenshot({ path:'/tmp/mon/_j3-box-' + step + '.png' });
  await b.close();
})();
