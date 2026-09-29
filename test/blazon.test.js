/* ══════════════════════════════════════════════════════════════
   blazon.test.js — THE COAT, THE BANNER, AND THE SETTINGS SCREEN.

   grumkata: "rework the banner/profile system also add basic settings in
   the settings system. for custom banners it should be wayyy more
   customisable."

   "More customisable" is the kind of claim that is easy to make and easy to
   fake: add eight names to a list, wire six of them, and the other two
   quietly draw the same thing as the default. Nobody notices, because
   nobody compares a nebuly per pale with an engrailed one side by side.

   So most of what is below is the same shape of check, over and over:
   EVERY option in a list must produce a DIFFERENT drawing from every other
   option in that list. A line of partition that is not wired falls through
   to straight and comes out identical to 'straight'; a hem that is not
   wired comes out identical to 'straight'; an arrangement that is not
   wired comes out identical to 'proper'. Comparing the paths catches all
   three, and it catches them at the size they are actually drawn.

   The rest holds the three promises the rework makes:
     a coat saved before any of this existed draws exactly as it did
     the livery is always a COLOUR, whatever coat it is taken from
     nothing on the settings screen is a dropdown or a checkbox
══════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const { serve } = require('./serve.js');
const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1500, height: 950 } });
  pg.on('pageerror', e => { bad.push('pageerror'); console.log('FAIL  pageerror ' + e.message); });
  const site = await serve();
  const wait = ms => pg.waitForTimeout(ms);
  await pg.goto(site.url + '/monarchy.html');
  /* started = the loading screen has gone (it now rehearses a table first) */
  await pg.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30000 });
  await wait(300);

  /* ══ THE ENGINE ════════════════════════════════════════════ */

  T('every line of partition cuts differently from every other',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const seen = {};
      for (const k of Object.keys(H.LINES)) {
        /* the field's own markup, with only the line changed */
        const d = H.field('perFess', 'gules', 'or', 200, 400, k);
        if (seen[d]) return false;
        seen[d] = k;
      }
      return Object.keys(seen).length === Object.keys(H.LINES).length;
    }));

  T('and an ordinary is cut by the same tool, to the same effect',
    await pg.evaluate(() => {
      const H = window.Heraldry, seen = {};
      for (const k of Object.keys(H.LINES)) {
        const d = H.ordinary('fess', 'or', 200, 400, k);
        if (seen[d]) return false;
        seen[d] = 1;
      }
      return true;
    }));

  T('every fur draws as a pattern, and two in one coat never share an id',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      for (const f of Object.keys(H.FURS)) {
        const c = H.ctx(200);
        const fill = H.paint(f, c);
        if (fill.indexOf('url(#f-' + f + '-') !== 0) return false;
        if (H.defs(c).indexOf('<pattern') < 0) return false;
      }
      /* ermine on ermines in one drawing: two grounds, two spot colours,
         and the ids must not collide or the second wears the first */
      const svg = H.armsSVG({ div: 'perPale', a: 'ermine', b: 'vair',
        ord: 'fess', ordT: 'potent' }, { w: 200, h: 400 });
      const ids = (svg.match(/<pattern id="(f-[^"]+)"/g) || []);
      return ids.length === 3 && new Set(ids).size === 3;
    }));

  T('the same fur in two separate drawings gets two separate ids',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const a = H.armsSVG({ div: 'plain', a: 'ermine' }, { w: 200, h: 400 });
      const c = H.armsSVG({ div: 'plain', a: 'ermine' }, { w: 46, h: 46 });
      const id = s => (s.match(/<pattern id="(f-ermine-[^"]+)"/) || [])[1];
      return !!id(a) && !!id(c) && id(a) !== id(c);
    }));

  T('every cut of hem gives the banner a different outline',
    await pg.evaluate(() => {
      const H = window.Heraldry, seen = {};
      for (const k of Object.keys(H.HEMS)) {
        const d = H.hem(k, 200, 400);
        if (seen[d]) return false;
        seen[d] = 1;
      }
      return Object.keys(seen).length === Object.keys(H.HEMS).length;
    }));

  T('every arrangement ranges five charges somewhere else',
    await pg.evaluate(() => {
      const H = window.Heraldry, seen = {};
      for (const k of Object.keys(H.ARRANGE)) {
        const p = H.spots(5, k, 200, 400);
        if (p.length !== 5) return false;
        const key = p.map(q => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ');
        if (seen[key]) return false;
        seen[key] = 1;
      }
      return true;
    }));

  /* ── and the coat you already had is the coat you still have ── */
  T('a coat saved before any of this draws exactly as it drew',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      /* the record shape as it was: no line, no ordLine, no chgA, no hem,
         no livery, and a bordure that was a yes rather than a kind */
      const old = { div: 'perBend', a: 'gules', b: 'or', ord: 'saltire', ordT: 'argent',
                    chg: 'lion', chgT: 'or', chgN: 3, bord: true, bordT: 'or' };
      const now = H.norm(old);
      const same = H.armsSVG(old, { w: 200, h: 400, weave: false })
                     .replace(/-h[0-9a-z]+/g, '-x');
      const explicit = H.armsSVG(Object.assign({}, old, { line: 'straight',
        ordLine: 'straight', chgA: 'proper', bord: 'plain', hem: 'swallow' }),
        { w: 200, h: 400, weave: false }).replace(/-h[0-9a-z]+/g, '-x');
      return now.line === 'straight' && now.chgA === 'proper' && now.bord === 'plain'
        && now.hem === 'swallow' && same === explicit;
    }));

  T('a line left on a field that cannot show it is cleared, not kept in the dark',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      /* checky has no single cut across it. Keeping 'wavy' on the record
         would be a setting you can neither see nor turn off. */
      return H.norm({ div: 'checky', line: 'wavy' }).line === 'straight'
          && H.norm({ div: 'perPale', line: 'wavy' }).line === 'wavy'
          && H.norm({ ord: 'pile', ordLine: 'nebuly' }).ordLine === 'straight'
          && H.norm({ ord: 'fess', ordLine: 'nebuly' }).ordLine === 'nebuly';
    }));

  /* ── the livery: the one colour the whole app wears ── */
  T('the livery is never a metal and never Sable, whatever the coat',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const forbidden = [H.TINCT.or, H.TINCT.argent, H.TINCT.sable];
      const all = Object.keys(H.TINCT).concat(Object.keys(H.FURS));
      for (const t of all) for (const u of all) {
        const c = H.liveryOf({ div: 'plain', a: t, b: u, chg: 'lion', chgT: t,
                               ord: 'fess', ordT: u });
        if (c && forbidden.indexOf(c) >= 0) return false;
      }
      /* a coat of nothing but metal and Sable has no livery to give, and
         says so rather than handing back something unreadable */
      return H.liveryOf({ div: 'plain', a: 'sable', b: 'argent' }) === null;
    }));

  T('and a livery you picked yourself outranks the one taken from the coat',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const A = { div: 'plain', a: 'gules', chg: 'lion', chgT: 'vert' };
      return H.liveryOf(A) === H.TINCT.vert
          && H.liveryOf(Object.assign({}, A, { livery: 'purpure' })) === H.TINCT.purpure
          && H.liveryOf(Object.assign({}, A, { livery: '#123456' })) === '#123456';
    }));

  T('the coat says itself in words, and names every option that is on',
    await pg.evaluate(() => {
      const t = window.Heraldry.blazonText({ div: 'perPale', a: 'ermine', b: 'gules',
        line: 'engrailed', ord: 'fess', ordT: 'or', ordLine: 'wavy',
        chg: 'lion', chgT: 'argent', chgN: 3, chgA: 'inPale',
        bord: 'compony', bordT: 'azure' });
      return /per pale/i.test(t) && /engrailed/i.test(t) && /ermine/i.test(t)
        && /fess wavy/i.test(t) && /three lions/i.test(t) && /in pale/i.test(t)
        && /bordure compony/i.test(t);
    }));

  /* ══ THE HERALDIC DRAWINGS ═════════════════════════════════
     A banner is also drawn as an IMAGE — the hall and the table turn it into
     a texture — and an image is strict XML: one stray namespace in one
     drawing (an Inkscape perspective, an undeclared xlink) and that banner
     is blank. So every drawing is loaded as a banner image, not just drawn. */
  T('every heraldic drawing loads as a banner image',
    await pg.evaluate(async () => {
      const H = window.Heraldry;
      for (const k of Object.keys(H.chargeList())) {
        const url = H.armsURL({ a: 'azure', syms: [{ c: k, t: 'or' }] }, { w: 200, h: 400 });
        const ok = await new Promise(r => { const i = new Image();
          i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = url; });
        if (!ok) return false;
      }
      return true;
    }));

  T('a pair at the sides faces each other unless told otherwise',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const s = H.armsSVG({ a: 'gules', syms: [{ c: 'lion', t: 'or', at: 'left' },
                                              { c: 'lion', t: 'or', at: 'right' }] });
      /* the lion is drawn facing left: the one at the left is turned about */
      return (s.match(/scale\(-1,1\)/g) || []).length === 1;
    }));

  /* grumkata: "i wanted more stacked ordinaries" */
  T('a coat carries several ordinaries, and an old coat keeps its one',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const old = H.norm({ a: 'azure', ord: 'bend', ordT: 'argent' });
      const many = H.norm({ a: 'argent', ords: [{ o: 'chief', t: 'azure' }, { o: 'bend', t: 'gules' },
                                                 { o: 'canton', t: 'or' }] });
      return old.ords.length === 1 && old.ords[0].o === 'bend'
          /* and the first is still "the" ordinary, for a copy that reads coats the old way */
          && many.ords.length === 3 && many.ord === 'chief'
          && /a chief Azure, a bend Gules, a canton Or/.test(H.blazonText(many));
    }));

  /* "symbols getting cutoff": every symbol, on every cut of banner and on the
     shield, lies inside the outline — measured, not assumed */
  T('no symbol crosses the edge of its banner or shield',
    await pg.evaluate(() => {
      const H = window.Heraldry, probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      probe.setAttribute('width', 200); probe.setAttribute('height', 400);
      probe.style.cssText = 'position:absolute;left:-9999px'; document.body.appendChild(probe);
      const coats = [];
      for (const hem of Object.keys(H.HEMS)) for (const c of ['lion', 'wolf', 'eagle', 'horse'])
        coats.push([{ a: 'azure', hem, syms: [{ c, t: 'or' }], bord: 'plain', bordT: 'or' }, { w: 200, h: 400 }]);
      for (const c of ['lion', 'stag', 'griffin']) coats.push([{ a: 'azure', syms: [{ c, t: 'or' }] }, { shape: 'shield', w: 200, h: 240 }]);
      let ok = true;
      for (const [A, o] of coats){
        probe.innerHTML = H.armsSVG(A, Object.assign({ style: 'flat' }, o)).replace(/^<svg[^>]*>|<\/svg>$/g, '');
        const out = probe.querySelector('path[fill="none"][stroke="#0d0906"]');
        const P = out.getAttribute('d');
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); shape.setAttribute('d', P); probe.appendChild(shape);
        for (const s of probe.querySelectorAll('svg[viewBox]')){
          const b = s.getBBox ? { x: +s.getAttribute('x'), y: +s.getAttribute('y'), w: +s.getAttribute('width'), h: +s.getAttribute('height') } : null;
          if (!b) continue;
          const pts = [[b.x + b.w/2, b.y + b.h*.04], [b.x + b.w/2, b.y + b.h*.96], [b.x + b.w*.04, b.y + b.h/2], [b.x + b.w*.96, b.y + b.h/2]];
          if (!pts.every(p => shape.isPointInFill(new DOMPoint(p[0], p[1])))) ok = false;
        }
      }
      probe.remove();
      return ok;
    }));

  /* "ugly and stretched": an ordinary keeps its angle whatever it is drawn on —
     a bend on the tall hall banner slopes as it does on the shield */
  T('a bend slopes the same on a tall banner as on a shield',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const slope = (W, Hh, shape) => { const Z = H.zoneOf(W, Hh, shape, 'swallow');
        return Z.h / Z.w; };
      /* the arms' zone is never stretched past its own proportion */
      return slope(420, 900, 'banner') <= 1.43 && slope(84, 176, 'banner') <= 1.43
          && Math.abs(slope(420, 900, 'banner') - slope(84, 176, 'banner')) < 0.05;
    }));

  /* "stacked… like I should be able to do multiple up arrows" */
  T('an ordinary can be two or three of itself, and says so',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const one = H.ordinary('chevron', 'gules', 100, 120, 'straight', null, 1);
      const three = H.ordinary('chevron', 'gules', 100, 120, 'straight', null, 3);
      return (one.match(/<path/g) || []).length === 1 && (three.match(/<path/g) || []).length === 3
          && /three chevronels Gules/.test(H.blazonText({ a: 'or', ords: [{ o: 'chevron', t: 'gules', n: 3 }] }))
          /* and the old "two bars" is a fess, twice */
          && H.norm({ a: 'or', ord: 'fessDouble', ordT: 'gules' }).ords[0].n === 2;
    }));

  /* "two things facing each other THEY ARE TINY": a pair fills the width of
     what it is on, each nearly half of it, on the shield and on a banner —
     and a centre-and-one-side pair is laid out as a pair, not a row of three */
  T('a facing pair fills the width, however it was added',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      const widths = (A, W, Hh, shape) => {
        const clip = shape === 'shield' ? H.shieldPath(W, Hh, 3) : 'M0,0 L' + W + ',0 ' + H.hem('swallow', W, Hh) + ' Z';
        return H.layoutSymbols(H.norm(A), W, Hh, shape, clip).map(p => {
          const vb = H.chargeDef(p.S.c).v.split(/\s+/).map(Number);
          return vb[2] * p.size / Math.max(vb[2], vb[3]) / W; }); };
      const pair = { a: 'azure', hem: 'swallow', syms: [{ c: 'lion', t: 'or', at: 'left' }, { c: 'unicorn', t: 'argent', at: 'right' }] };
      const added = { a: 'azure', hem: 'swallow', syms: [{ c: 'lion', t: 'or', at: 'center' }, { c: 'unicorn', t: 'argent', at: 'left' }] };
      return [widths(pair, 200, 240, 'shield'), widths(pair, 420, 900, 'banner'), widths(added, 420, 900, 'banner')]
        .every(ws => ws.length === 2 && ws.every(w => w > 0.38));
    }));

  /* grumkata: rolls should "actually look nice" — at the least, never a
     colour on a colour or a metal on a metal */
  T('a thousand rolls, and not one breaks the rule of tincture',
    await pg.evaluate(() => {
      const H = window.Heraldry;
      for (let i = 0; i < 1000; i++) if (H.tinctureWarning(H.roll())) return false;
      return true;
    }));

  /* ══ THE MAKER ═════════════════════════════════════════════ */
  await pg.evaluate(() => document.getElementById('arms').click());
  await wait(700);

  T('the maker is a bench at a time, with every bench in reach',
    await pg.evaluate(() => {
      const tabs = document.querySelectorAll('.mk-tab');
      return tabs.length === 5 && document.querySelectorAll('.mk-tab.on').length === 1
        && document.querySelectorAll('.mk-pane').length === 1;
    }));

  T('and pressing a pennon changes which bench you are at', await pg.evaluate(async () => {
    const was = document.querySelector('.mk-pane').innerHTML;
    document.querySelector('[data-tab="flag"]').click();
    await new Promise(r => setTimeout(r, 200));
    return document.querySelector('[data-tab="flag"]').classList.contains('on')
      && document.querySelector('.mk-pane').innerHTML !== was
      && document.querySelectorAll('[data-arm="hem"]').length === 6;
  }));

  T('a fur picked on the bench really is a pattern in the preview',
    await pg.evaluate(async () => {
      document.querySelector('[data-tab="field"]').click();
      await new Promise(r => setTimeout(r, 180));
      document.querySelector('[data-arm="a"][data-v="vair"]').click();
      await new Promise(r => setTimeout(r, 220));
      /* the preview holds TWO drawings of the same coat — the shield and
         the banner beside it — so there are two vair patterns on screen,
         and the whole point of the context is that each svg reaches its
         OWN one rather than whichever the document happens to hold first */
      const svgs = [...document.querySelectorAll('#prevArms svg')];
      if (svgs.length !== 2) return false;
      const ids = [];
      for (const svg of svgs) {
        const rect = svg.querySelector('rect[fill^="url(#f-vair-"]');
        if (!rect) return false;
        const id = rect.getAttribute('fill').slice(5, -1);
        if (!svg.querySelector('pattern[id="' + id + '"]')) return false;
        ids.push(id);
      }
      return ids[0] !== ids[1];
    }));

  /* THE WORDS ARE NOT PRINTED UNDER THE SHIELD ANY MORE. grumkata: "the
     text saying per fes sable and argent... is still there and has not been
     removed yet" -- being told in herald's language what you are already
     looking at is a caption on a photograph.

     The blazon itself is not gone: it is still the model's own account of a
     coat and still has to track one, which is what this now asks. It goes
     to Heraldry rather than to the DOM because that is where the claim
     lives now. */
  T('and the words for it still follow the coat', await pg.evaluate(() =>
    /vair/i.test(Heraldry.blazonText({ div:'plain', a:'vair', b:'argent' }))));

  /* THIS USED TO CHECK THE OPPOSITE. A choice that could not apply was
     replaced by a paragraph explaining why — and grumkata: "remove all the
     extrenous explanation text its unproffesional". He is right: a row for
     dressing a cut, on a field that has no cut, has no business being on
     screen at all, with or without an apology attached. */
  T('a choice that cannot apply is not on screen at all',
    await pg.evaluate(async () => {
      document.querySelector('[data-arm="div"][data-v="checky"]').click();
      await new Promise(r => setTimeout(r, 220));
      const gone = document.querySelectorAll('[data-arm="line"]').length === 0;
      const quiet = document.querySelectorAll('.mk-pane .note').length === 0;
      document.querySelector('[data-arm="div"][data-v="perPale"]').click();
      await new Promise(r => setTimeout(r, 220));
      return gone && quiet && document.querySelectorAll('[data-arm="line"]').length > 1;
    }));

  T('the find well narrows the charges and keeps your caret',
    await pg.evaluate(async () => {
      document.querySelector('[data-tab="chg"]').click();
      await new Promise(r => setTimeout(r, 200));
      /* the Symbols bench shows its drawings once there is a symbol to choose for */
      if (!document.getElementById('chgq')) document.querySelector('[data-do="symadd"]').click();
      await new Promise(r => setTimeout(r, 200));
      const all = document.querySelectorAll('.mk-pane .swgrid.tall .sw').length;
      const q = document.getElementById('chgq');
      q.value = 'tower'; q.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      const few = document.querySelectorAll('.mk-pane .swgrid.tall .sw').length;
      const held = document.activeElement && document.activeElement.id === 'chgq';
      const q2 = document.getElementById('chgq');
      q2.value = ''; q2.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      return all > 20 && few > 0 && few < all && held;
    }));

  T('what you take is what was saved, hem and livery and all',
    await pg.evaluate(async () => {
      const press = s => document.querySelector(s).click();
      press('[data-tab="flag"]'); await new Promise(r => setTimeout(r, 200));
      press('[data-arm="hem"][data-v="gonfalon"]'); await new Promise(r => setTimeout(r, 200));
      press('[data-arm="livery"][data-v="murrey"]'); await new Promise(r => setTimeout(r, 200));
      const n = document.getElementById('aname');
      n.value = 'Aldric'; n.dispatchEvent(new Event('input', { bubbles: true }));
      press('[data-do="takearms"]');
      await new Promise(r => setTimeout(r, 700));
      const me = JSON.parse(localStorage.getItem('monarchy.me.v1'));
      return me.arms.hem === 'gonfalon' && me.arms.livery === 'murrey'
        && me.arms.a === 'vair' && me.name === 'Aldric';
    }));

  T('and the chrome is wearing it', await pg.evaluate(() =>
    document.documentElement.style.getPropertyValue('--m-house')
      === window.Heraldry.TINCT.murrey));

  T('your name shows in the corner of the hall',
    await pg.evaluate(() => {
      const n = document.getElementById('myname');
      return !!n && n.textContent === 'Aldric' && !n.classList.contains('unset');
    }));

  /* ══ SETTINGS ══════════════════════════════════════════════ */
  await pg.evaluate(() => window.Menu.take('set'));
  await wait(700);

  T('nothing on the settings screen is a dropdown or a checkbox',
    await pg.evaluate(() => {
      const p = document.getElementById('screenbody');
      return !p.querySelector('select') && !p.querySelector('input[type=checkbox]')
          && !p.querySelector('input[type=radio]');
    }));

  /* \u2550\u2550 ONE PLACE AT A TIME \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
     grumkata: "dont cram everything on one screen ffs". So Settings is a
     list of places and one pane, and these have to walk to the pane they
     are about \u2014 which is the better test anyway, because everything on
     that screen now depends on the walking working. */
  const goTo = async place => {
    await pg.evaluate(p => document.querySelector('[data-set="' + p + '"]').click(), place);
    await wait(260);
  };

  T('Settings is a list of places, showing one of them',
    await pg.evaluate(() => document.querySelectorAll('.setnav-i').length >= 6
      && document.querySelectorAll('.setpane').length === 1));

  T('every switch the store describes is on its own page, with all its states',
    await (async () => {
      const groups = await pg.evaluate(() => window.Options.groups().map(g => g.name));
      const where = { 'Display': 'look', 'The table': 'table' };
      for (const g of groups) {
        if (!where[g]) return false;
        await goTo(where[g]);
        const ok = await pg.evaluate(name => {
          const D = window.Options.DEFS;
          return Object.keys(D).filter(k => (D[k].g || '') === name).every(k => {
            const pens = document.querySelectorAll('[data-opt="' + k + '"]');
            return pens.length === D[k].of.length
              && document.querySelectorAll('[data-opt="' + k + '"].on').length === 1;
          });
        }, g);
        if (!ok) return false;
      }
      return true;
    })());

  await goTo('look');
  T('the film grade switch reaches the document, not just the store',
    await pg.evaluate(async () => {
      document.querySelector('[data-opt="grade"][data-v="off"]').click();
      await new Promise(r => setTimeout(r, 200));
      const off = window.Options.get('grade') === 'off'
        && document.body.classList.contains('nograde');
      document.querySelector('[data-opt="grade"][data-v="on"]').click();
      await new Promise(r => setTimeout(r, 200));
      return off && !document.body.classList.contains('nograde');
    }));

  await goTo('table');
  T('and a table switch reaches the table it is about',
    await pg.evaluate(async () => {
      document.querySelector('[data-opt="snap"][data-v="off"]').click();
      await new Promise(r => setTimeout(r, 180));
      const loose = window.TableModel.GRID === 0;
      document.querySelector('[data-opt="snap"][data-v="on"]').click();
      await new Promise(r => setTimeout(r, 180));
      return loose && window.TableModel.GRID === 20;
    }));
  await goTo('look');

  T('turning the stylising off turns it off in the shaders too',
    await pg.evaluate(async () => {
      document.querySelector('[data-opt="cel"][data-v="off"]').click();
      await new Promise(r => setTimeout(r, 200));
      return window.Options.celAmt() === 0;
    }));

  await goTo('data');
  T('forgetting everything takes two presses, and the first destroys nothing',
    await pg.evaluate(async () => {
      document.querySelector('[data-do="forgetall"]').click();
      await new Promise(r => setTimeout(r, 250));
      const armed = /press again/i.test(document.querySelector('[data-do="forgetall"]').textContent);
      const kept = !!localStorage.getItem('monarchy.me.v1');
      return armed && kept;
    }));

  T('a copy of everything is everything, and nothing that is not ours',
    await pg.evaluate(() => {
      localStorage.setItem('somebody.elses.key', 'not ours');
      const d = window.Options.dump();
      return d['monarchy.me.v1'] && d['monarchy.opts.v1']
        && !('somebody.elses.key' in d);
    }));

  /* ── and all of it is still there next time ── */
  await pg.reload(); await wait(1600);
  T('every setting comes back, and so does the coat',
    await pg.evaluate(() => {
      const me = JSON.parse(localStorage.getItem('monarchy.me.v1'));
      return window.Options.get('cel') === 'off'
        && me.arms.hem === 'gonfalon'
        && document.documentElement.style.getPropertyValue('--m-house')
             === window.Heraldry.TINCT.murrey
        && !!document.querySelector('#myshield svg');
    }));

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
