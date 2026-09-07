/* playwright, wherever it is: a normal devDependency here, and an absolute
   path in the container these were written in */
const { chromium } = (() => {
  try { return require('playwright'); }
  catch (e) { return require('/home/claude/.npm-global/lib/node_modules/playwright'); }
})();
const path = require('path');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  const W = ms => pg.waitForTimeout(ms);
  await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'monarchy.html')); await W(1000);
  await pg.evaluate(() => localStorage.setItem('monarchy.chars.v2', JSON.stringify([
    {id:'c1',who:{name:'Aldric Vane'}}])));
  await pg.evaluate(() => window.Shell.openTable('pass-' + Date.now())); await W(1600);

  /* ── 4. does the bin collide with anything ── */
  console.log('BIN vs HUD', JSON.stringify(await pg.evaluate(() => {
    const R = s => { const e=document.querySelector(s); if(!e) return null;
      const r=e.getBoundingClientRect();
      return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]; };
    const hit=(a,b)=> a&&b&&!(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1]);
    const bin=R('#tb-bin-prop'), hud=R('.hud.br'), tray=R('.hb-tray'), row=R('.hb-row');
    return { bin, hud, tray, row, overHud: hit(bin,hud), overRow: hit(bin,row) };
  })));

  /* ── 2. real mouse drag: is the piece under the cursor ── */
  await pg.evaluate(() => window.TableModel.put({ kind:'note', x:1200, y:900,
    w:300, h:210, text:'' }));
  await W(400);
  const probe = async (fx, fy, tx, ty) => {
    const start = await pg.evaluate(() => {
      const el = document.querySelector('.prop.t3-note');
      const r = el.querySelector('.grip').getBoundingClientRect();
      return [Math.round(r.left + r.width/2), Math.round(r.top + 8)];
    });
    await pg.mouse.move(start[0], start[1]);
    await pg.mouse.down();
    await pg.mouse.move(tx, ty, { steps: 6 });
    await W(120);
    const off = await pg.evaluate(([tx,ty,sx,sy]) => {
      const el = document.querySelector('.prop.t3-note');
      const g  = el.querySelector('.grip').getBoundingClientRect();
      /* the point of the grip we took hold of, now, vs where the pointer is */
      return { dx: Math.round(g.left + g.width/2 - tx),
               dy: Math.round(g.top + 8 - ty),
               z: el.dataset.z };
    }, [tx,ty,start[0],start[1]]);
    await pg.mouse.up(); await W(150);
    return off;
  };
  console.log('DRAG centre  ', JSON.stringify(await probe(0,0, 700, 500)));
  console.log('DRAG near    ', JSON.stringify(await probe(0,0, 400, 760)));
  console.log('DRAG far     ', JSON.stringify(await probe(0,0, 950, 300)));

  /* ── 1. art: aspect + anything drawn round it ── */
  await pg.evaluate(() => {
    const o = window.Toolbox.options('art').find(x => x.id === 'art:sprite:lich');
    window.Toolbox.take(o, 900, 700, o.v);
  });
  await W(900);
  console.log('ART', JSON.stringify(await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'art');
    const el = document.querySelector('.prop.t3-art');
    const f = el && el.querySelector('.face');
    const pic = el && el.querySelector('.t3-pic');
    const img = pic && pic.querySelector('img');
    const cs = f && getComputedStyle(f), cp = pic && getComputedStyle(pic);
    return { modelWH:[t.w,t.h], faceStyle:{bg:cs.backgroundImage.slice(0,20), bd:cs.borderTopWidth,
             sh:cs.boxShadow.slice(0,24)},
             picStyle:{pad:cp.paddingTop, bd:cp.borderTopWidth, bg:cp.backgroundImage.slice(0,20)},
             sides:[...el.querySelectorAll('.side')].map(s=>getComputedStyle(s).display),
             imgFit: img && getComputedStyle(img).objectFit,
             imgBox: img && [Math.round(img.getBoundingClientRect().width),
                             Math.round(img.getBoundingClientRect().height)] };
  })));

  /* ── 9. a model: does it paint pixels ── */
  await pg.evaluate(() => {
    const o = window.Toolbox.options('models').find(x => x.name === 'Tree');
    window.Toolbox.take(o, 600, 1200, o.v);
  });
  await W(6000);
  console.log('MODEL', JSON.stringify(await pg.evaluate(() => {
    const t = window.TableModel.state.things.find(x => x.kind === 'model');
    const el = document.querySelector('.prop.t3-model');
    const r = el.getBoundingClientRect();
    const cv = document.getElementById('tgl');
    /* sample the canvas where the anchor is */
    const g = cv.getContext('webgl2') || cv.getContext('webgl');
    return { thing: !!t, rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width)],
             glWaiting: window.TableGL.waiting, hasCanvas: !!cv };
  })));
  await pg.screenshot({ path:path.join(__dirname, '..', '_g1-pass.png') });
  await b.close();
})();
