const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await pg.goto('file:///tmp/mon/dist/monarchy.html'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.Shell.openTable('tbl-' + Date.now()));
  await pg.waitForTimeout(9000);
  await pg.screenshot({ path:'/tmp/mon/_j1-table.png' });
  console.log(JSON.stringify(await pg.evaluate(() => {
    const r = e => { const q = document.querySelector(e); if(!q) return null;
      const b = q.getBoundingClientRect();
      return [Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)]; };
    return { slab:r('#tbl .slab'), tm:[r('#tm-l'), r('#tm-r')],
             canvas: !!document.getElementById('tglu'),
             wood: typeof WOOD !== 'undefined' && !!WOOD.Table_Round_A,
             chest:r('#tb-anchor'), bin:r('#tb-bin-prop'),
             k: +window.Table3D.k.toFixed(3) };
  })));
  await b.close();
})();
