const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  const W = ms => pg.waitForTimeout(ms);
  await pg.goto('file:///tmp/mon/dist/monarchy.html'); await W(1000);
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    {id:'c1',who:{name:'Aldric Vane'}},{id:'c2',who:{name:'Mira Solthorn'}},
    {id:'c3',who:{name:'Brother Kell'}}])));
  await pg.evaluate(() => window.Shell.openTable('two-' + Date.now()));
  await W(1600);
  await pg.click('#tb-anchor', { force:true }); await W(700);
  await pg.screenshot({ path:'/tmp/mon/_f1-kinds.png' });

  const kind = async n => { await pg.evaluate(i =>
    document.querySelectorAll('.hb-slot')[i].click(), n); await W(700); };

  await kind(1); await pg.screenshot({ path:'/tmp/mon/_f2-people.png' });
  await kind(3); await W(2500); await pg.screenshot({ path:'/tmp/mon/_f3-models.png' });
  await kind(2); await pg.screenshot({ path:'/tmp/mon/_f4-art.png' });

  /* an actual picture on the table */
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('art').find(o => o.id === 'art:sprite:archer')));
  await W(300); await pg.mouse.move(680, 430); await W(400);
  await pg.mouse.down(); await pg.mouse.up(); await W(800);
  await pg.keyboard.press('Escape'); await W(200);

  /* and a tree */
  await kind(3); await W(600);
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('models').find(o => o.name === 'Tree')));
  await W(300); await pg.mouse.move(430, 560); await W(300);
  await pg.mouse.down(); await pg.mouse.up(); await W(500);
  await pg.evaluate(() => window.Hand.take(
    window.Toolbox.options('models').find(o => o.name === 'Boulder')));
  await W(300); await pg.mouse.move(880, 620); await W(300);
  await pg.mouse.down(); await pg.mouse.up(); await W(500);
  await pg.keyboard.press('Escape'); await W(200);

  /* someone invented on the spot */
  await kind(1); await W(500);
  await pg.evaluate(() => {
    const o = window.Toolbox.options('people');
    window.Hand.take(o[o.length - 2]);            /* Someone else */
  });
  await W(600);
  await pg.evaluate(() => {
    const b = document.querySelector('.tk-make .tk-f-name');
    b.value = 'Hollow Knight'; b.dispatchEvent(new Event('input', {bubbles:true}));
    const f = document.querySelectorAll('.tk-make .tk-face')[1];
    if (f) f.click();
  });
  await W(500);
  await pg.mouse.move(600, 640); await W(400);
  await pg.screenshot({ path:'/tmp/mon/_f5-maker.png' });
  await pg.mouse.down(); await pg.mouse.up(); await W(500);
  await pg.keyboard.press('Escape'); await W(200);
  await pg.evaluate(() => window.Toolbox.shut()); await W(400);
  await W(5000);
  await pg.screenshot({ path:'/tmp/mon/_f6-table.png' });

  console.log(JSON.stringify(await pg.evaluate(() =>
    window.TableModel.state.things.map(t => ({ k:t.kind, n:t.name, w:t.w, h:t.h,
      m:t.model, src: t.src ? t.src.slice(0,18) : '', s:t.source })))));
  await b.close();
})();
