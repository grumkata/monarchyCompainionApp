/* Does the wheel over a piece resize that piece, and the wheel over bare
   wood still zoom the table?  grumkata: "3d models should be scaleable". */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await pg.goto('file:///tmp/mon/dist/monarchy.html'); await pg.waitForTimeout(1000);
  await pg.evaluate(() => window.Shell.openTable('sc-' + Date.now()));
  await pg.waitForTimeout(4000);
  await pg.evaluate(() => {
    const o = window.Toolbox.options('models').find(x => x.name === 'Tree');
    window.Toolbox.take(o, 1300, 1200, o.v);
  });
  await pg.waitForTimeout(1500);

  const at = () => pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'model');
    const el = document.querySelector('.prop.t3-model .face');
    const r = el.getBoundingClientRect();
    return { scale: t.scale, w: Math.round(r.width), h: Math.round(r.height),
             cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2),
             k: +window.Table3D.k.toFixed(3) };
  });
  const a = await at();
  /* the wheel, dispatched over the piece itself */
  await pg.evaluate(p => {
    for (let i = 0; i < 4; i++) document.getElementById('vp').dispatchEvent(
      new WheelEvent('wheel', { deltaY: -120, clientX: p.cx, clientY: p.cy,
                                bubbles: true, cancelable: true }));
  }, a);
  await pg.waitForTimeout(600);
  const c = await at();
  /* and over bare wood, well clear of anything */
  await pg.evaluate(() => {
    document.getElementById('vp').dispatchEvent(
      new WheelEvent('wheel', { deltaY: -120, clientX: 560, clientY: 240,
                                bubbles: true, cancelable: true }));
  });
  await pg.waitForTimeout(500);
  const d = await at();
  console.log(JSON.stringify({ before: a, overPiece: c, overWood: d,
    grew: c.scale > a.scale && c.w > a.w,
    tableUntouched: Math.abs(c.k - a.k) < 0.001,
    woodZoomed: d.k > c.k }));
  await b.close();
})();
