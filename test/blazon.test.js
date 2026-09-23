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
  await pg.goto(site.url + '/monarchy.html'); await wait(1400);

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

  T('and the words under it change with it', await pg.evaluate(() =>
    /vair/i.test(document.querySelector('.blazon').textContent)));

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
