const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  await pg.goto('file:///tmp/mon/dist/monarchy.html');
  await pg.waitForTimeout(900);
  await pg.evaluate(() => window.Shell.openTable('chest'));
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => window.Table3D.frame(document.getElementById('tb-anchor'), 260));
  await pg.waitForTimeout(5000);
  await pg.screenshot({ path:'/tmp/mon/_b1-chest-shut.png' });
  await pg.click('#tb-anchor', { force:true });
  await pg.waitForTimeout(5000);
  await pg.screenshot({ path:'/tmp/mon/_b2-chest-open.png' });
  await b.close();
})();
