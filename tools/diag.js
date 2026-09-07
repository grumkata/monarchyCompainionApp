const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const pg = await b.newPage({ viewport:{width:1500,height:950} });
  pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await pg.goto('file:///tmp/mon/dist/monarchy.html');
  await pg.waitForTimeout(1000);
  await pg.evaluate(() => window.Shell.openTable('diag'));
  await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(() => ({
    chestPrims: {
      base: CHEST.base.map(p => ({ t: p.t, c: p.c, n: p.p.length/3 })),
      lid:  CHEST.lid.map(p => ({ t: p.t, c: p.c, n: p.p.length/3 })),
      hinge: CHEST.hinge.map(p => ({ t: p.t, c: p.c }))
    },
    texKeys: Object.keys(CHEST_TEX).map(k => k + ':' + CHEST_TEX[k].slice(0,30) + ' len=' + CHEST_TEX[k].length),
    bin: typeof BIN3D === 'undefined' ? 'none' : {
      prims: BIN3D.prims.map(p => ({t:p.t, c:p.c})),
      tex: typeof BIN3D_TEX === 'undefined' ? 'none' : Object.keys(BIN3D_TEX)
    }
  }))));

  // real size of the combat sheet
  await pg.evaluate(() => { const t = window.TableModel.put({kind:'scene',scene:'combat',setup:{width:8,model:'none'},x:100,y:100,w:1180,h:1426,locked:true}); window.TableModel.activate(t.id); });
  await pg.waitForTimeout(900);
  console.log(JSON.stringify(await pg.evaluate(() => {
    const el = document.getElementById('combat-prop');
    const f = el.querySelector('.face');
    return { display: el.style.display, w: f.offsetWidth, h: f.offsetHeight,
             tw: window.Table3D.TW, th: window.Table3D.TH, k: window.Table3D.k };
  })));
  await b.close();
})();
