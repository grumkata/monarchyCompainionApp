const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  pg.on('console', m => { if (m.type()==='error') console.log('CONSOLE ' + m.text()); });
  await pg.goto('file:///tmp/mon/dist/monarchy.html');
  await pg.waitForTimeout(1200);
  /* a couple of people in the roster, so the bar has bodies in it */
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    {id:'c1', who:{name:'Aldric Vane'}, updated:1},
    {id:'c2', who:{name:'Mira Solthorn'}, updated:2},
    {id:'c3', who:{name:'Brother Kell'}, updated:3}])));
  await pg.evaluate(() => window.Shell.openTable('shot-' + Date.now()));
  await pg.waitForTimeout(1600);
  await pg.screenshot({ path:'/tmp/mon/_a1-table.png' });

  await pg.click('#tb-anchor', { force:true });
  await pg.waitForTimeout(900);
  await pg.screenshot({ path:'/tmp/mon/_a2-bar.png' });

  console.log(await pg.evaluate(() => ({
    up: window.Hand.isUp(),
    slots: document.querySelectorAll('.hb-slot').length,
    bar: !!document.querySelector('.hb.up'),
    barRect: (r => r && {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)})(document.querySelector('.hb') && document.querySelector('.hb').getBoundingClientRect()),
    binVis: (() => { const e=document.getElementById('tb-bin-prop'); const r=e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)}; })()
  })));

  /* take the battlefield out */
  await pg.evaluate(() => document.querySelectorAll('.hb-slot')[0].click());
  await pg.waitForTimeout(500);
  await pg.mouse.move(700, 470);
  await pg.waitForTimeout(400);
  await pg.screenshot({ path:'/tmp/mon/_a3-hold-board.png' });

  /* widen it in the hand */
  await pg.mouse.wheel(0, 120);
  await pg.waitForTimeout(400);
  await pg.screenshot({ path:'/tmp/mon/_a4-wider.png' });

  await b.close();
})();
