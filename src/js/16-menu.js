/* ══════════════════════════════════════════════════════════════
   THE MENU — the flat layer over the hall.

   The 3D does the world; this does the words. Plates track their banner every
   frame, taking a banner down drops that house's cloth over the screen, and
   every commitment is a wax seal.

   NOTHING IS EVER PRE-POPULATED. No sample tables, no sample characters, no
   invented names. Placeholder text instructs, it does not pretend.
══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const H = window.Heraldry;

/* ══ THE STORE ════════════════════════════════════════════════ */
const K = { tables:'monarchy.tables.v3', chars:'monarchy.chars.v2', me:'monarchy.me.v1' };
const S = {
  get(k, d){ try { const v = JSON.parse(localStorage.getItem(K[k])); return v==null?d:v; }
             catch(e){ return d; } },
  put(k, v){ try { localStorage.setItem(K[k], JSON.stringify(v)); }
             catch(e){ toast('The browser refused to save'); } }
};
let tables = S.get('tables', []);
let chars  = S.get('chars',  []);
/* WHO YOU ARE, as against what you have. `style` is what follows your name
   The coat itself is normalised through the engine, so a profile saved
   before furs, lines and hems existed comes back with all of them at their
   defaults rather than as undefined. */
/* WHO YOU ARE. A name, a coat, and a likeness — and nothing else. There
   were a `style` and a `motto` here too; grumkata: "why is ther a motto
   section reomve it", "get rid of the YOUR style thing thats unneccary".
   He is right: neither was ever shown to anybody else at a table, so they
   were two fields you filled in for your own benefit and then never saw. */
let me     = Object.assign({ name:'', pic:'', body:'',
  arms: Object.assign({}, H.DEFAULTS) }, S.get('me', {}));
me.arms = H.norm(me.arms);
const saveT = () => S.put('tables', tables);
const saveC = () => S.put('chars', chars);
const saveM = () => S.put('me', me);

/* ══ SMALL THINGS ═════════════════════════════════════════════ */
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const two = n => (n<10?'0':'') + n;
function when(ts){
  if (!ts) return 'not opened yet';
  const d = Date.now()-ts, day = 864e5;
  if (d < 36e5)  return 'opened ' + Math.max(1,Math.round(d/6e4)) + ' min ago';
  if (d < day)   return 'opened ' + Math.round(d/36e5) + ' hr ago';
  if (d < 7*day) return 'opened ' + Math.round(d/day) + ' days ago';
  return 'opened ' + new Date(ts).toLocaleDateString(undefined,{day:'numeric',month:'short'});
}
let tT; function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show');
  clearTimeout(tT); tT=setTimeout(()=>t.classList.remove('show'), 2400); }

/* ══ THE BANNERS OF THE HOUSE ═════════════════════════════════ */
const BANNERS = [
  /* Gules, three crowns Or, a bordure Or */
  { id:'tables', name:'The Tables', flav:'open one, raise another', hem:'swallow',
    h:2.70, drop:0,
    arms:{ div:'plain', a:'gules', b:'or', ord:'none', ordT:'or',
           chg:'crown', chgT:'or', chgN:3, bord:true, bordT:'or' } },
  /* Azure, a bend Argent, three mullets Or */
  { id:'join', name:'Join a Game', flav:'someone else is already sitting', hem:'dagged',
    h:2.40, drop:.40,
    arms:{ div:'plain', a:'azure', b:'argent', ord:'bend', ordT:'argent',
           chg:'star', chgT:'or', chgN:3, bord:false, bordT:'or' } },
  /* Vert, a lion Or, a bordure Or */
  { id:'chars', name:'Characters', flav:'who you have been', hem:'swallow',
    h:2.92, drop:.12,
    arms:{ div:'plain', a:'vert', b:'or', ord:'none', ordT:'or',
           chg:'lion', chgT:'or', chgN:1, bord:true, bordT:'or' } },
  /* Per bend sable and tenne, a saltire Or */
  { id:'shop', name:'The Workshop', flav:'what the game is made of', hem:'straight',
    h:2.28, drop:.58, dead:true,
    arms:{ div:'perBend', a:'sable', b:'tenne', ord:'saltire', ordT:'or',
           chg:'', chgT:'or', chgN:1, bord:false, bordT:'or' } },
  /* Purpure, a tower Argent, a bordure Or */
  { id:'set', name:'Settings', flav:'the hall, and how it behaves', hem:'dagged',
    h:2.56, drop:.26,
    arms:{ div:'plain', a:'purpure', b:'argent', ord:'none', ordT:'argent',
           chg:'tower', chgT:'argent', chgN:1, bord:true, bordT:'or' } }
];
BANNERS.forEach(b => {
  b.url = H.armsURL(b.arms, { shape:'banner', w:420, h:900, hem:b.hem, edge:8 });
  b.w = 1.16;
});

/* ══ THE PLATES THAT FOLLOW THEM ══════════════════════════════ */
const layer = $('#ui');
BANNERS.forEach((b,i) => {
  const p = document.createElement('button');
  p.className = 'plate' + (b.dead ? ' dead' : '');
  /* the plate counterchanges into its own banner's field (00-hall.css) */
  p.style.setProperty('--house', H.col(b.arms.a));
  p.style.setProperty('--n', i);                 /* hung in order (00-hall.css) */
  p.innerHTML = b.name + (b.dead ? '<span class="tag">not built</span>' : '');
  p.dataset.i = i; layer.appendChild(p); b.el = p;
  const f = document.createElement('div');
  f.className = 'flav'; f.textContent = b.flav; layer.appendChild(f); b.fl = f;
});
function trackPlates(){
  requestAnimationFrame(trackPlates);
  const hot = window.Hall.hot();
  BANNERS.forEach((b,i) => {
    const s = window.Hall.project(i);
    if (!s) return;
    b.el.style.left = s.x + 'px'; b.el.style.top = (s.y + 10) + 'px';
    b.el.classList.toggle('on', hot === i && !b.dead);
    b.fl.style.left = s.x + 'px'; b.fl.style.top = (s.y + 52) + 'px';
    b.fl.classList.toggle('on', hot === i);
  });
}

/* ══ TAKING ONE DOWN ══════════════════════════════════════════ */
const screen = $('#screen'), sbody = $('#screenbody'), backBtn = $('#back');
let at = null;
/* the views you came through. Back pops one; empty means back to the hall. */
let path = [];
let cur = null;                    /* the record open on the table, if any */
function paint(){
  const onSheet = at === 'sheet';
  screen.classList.toggle('paper', onSheet);
  backBtn.innerHTML = '&#8249;&nbsp; ' + (path.length ? 'Back' : 'Back to the hall');
  const bar = $('#scribe'); if (bar) bar.style.display = onSheet ? 'flex' : 'none';
  if (onSheet) paintUndo();
}
function go(v){ path.push(at); at = v; drawView(14); }
/* a fork is not a place: swapping leaves nothing behind to come back to */
function swap(v){ at = v; drawView(14); }
function drawView(dy){ render(true); paint();
  sbody.animate([{opacity:0,transform:'translateY('+dy+'px)'},{opacity:1,transform:'none'}],
    {duration:260, easing:'ease-out', fill:'both'}); }
function backOne(){
  if (!path.length) return hang();
  at = path.pop(); drawView(-10);
}
/* THE CLOTH FALLS WITH A SWALLOWTAIL HEM — the notch cut into the Tables
   banner — rather than a flat edge wiping down. Same five points at both
   ends so the polygon interpolates; at rest the notch is above the screen,
   when down the hem's corners are below it and only the V's tip touches. */
const HEM = '16vh';
const CLOTH_UP   = `polygon(0 0,100% 0,100% 0%,50% calc(0% - ${HEM}),0 0%)`;
const CLOTH_DOWN = `polygon(0 0,100% 0,100% calc(100% + ${HEM}),50% 100%,0 calc(100% + ${HEM}))`;
function fall(){
  screen.animate([{clipPath:CLOTH_UP},{clipPath:CLOTH_DOWN}],
    {duration:620, easing:'cubic-bezier(.16,.84,.24,1)', fill:'forwards'});
}
function take(id){
  const b = BANNERS.find(x => x.id === id);
  if (!b || b.dead) return toast('Not built yet');
  /* a screen is entered at its beginning, not wherever you left it a week
     ago — the one exception being that the flag maker keeps its bench */
  if (id === 'set'){ setTab = 'you'; netPasting = false; }
  if (id === 'join'){ needName = false; }
  at = id; path = []; paint();
  screen.style.setProperty('--field', H.TINCT[b.arms.a]);
  screen.dataset.house = H.TNAME[b.arms.a] || '';     /* up the edge, 00-hall.css */
  $('#device').innerHTML = H.ordinary(b.arms.ord, b.arms.ordT, 200, 400)
                         + H.charge(b.arms.chg, b.arms.chgT, 200, 400, b.arms.chgN);
  render(true);
  window.Hall.lock(true);
  screen.classList.add('on');
  fall();
  sbody.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],
    {duration:400, delay:250, easing:'ease-out', fill:'both'});
  /* once the cloth has finished falling the hall is fully covered — stop drawing it */
  setTimeout(() => { if (at) window.Hall.sleep(true); }, 620);
  backBtn.style.display = 'flex';
}
function hang(){
  if (!at) return;
  at = null; path = []; cur = null; screen.classList.remove('paper');
  window.Hall.sleep(false); window.Hall.lock(false);
  const a = screen.animate([{clipPath:CLOTH_DOWN},{clipPath:CLOTH_UP}],
    {duration:420, easing:'cubic-bezier(.5,0,.85,.4)', fill:'forwards'});
  a.onfinish = () => { screen.classList.remove('on'); screen.style.clipPath = CLOTH_UP; };
  backBtn.style.display = 'none';
}
/* ARRIVING IS NOT THE SAME AS REDRAWING. Every view is rebuilt by setting
   innerHTML, so every element in it is brand new every time — and a CSS
   entrance animation on a brand new element runs. That is what you want the
   first time a screen appears and emphatically not what you want when the
   flag maker repaints because you pressed a tincture: the whole bench would
   fly in again on every click.

   So `fresh` is the difference, and it is a class rather than a timer:
   00-hall.css hangs the entrances off `#screenbody.fresh`, a repaint leaves
   the class off, and the same markup arrives or simply appears. */
function render(fresh){
  sbody.classList.toggle('fresh', !!fresh);
  sbody.innerHTML = (VIEW[at] || VIEW.set)();
  if (AFTER[at]) AFTER[at]();
}

/* ══ THE VIEWS ════════════════════════════════════════════════ */
const VIEW = {}, AFTER = {};

/* ══ AUTO-UPDATE, ON THE STARTING SCREEN ══════════════════════
   grumkata: not tucked into Settings — a popup on the hall itself, since
   that's the one screen every session actually passes through, whether
   or not anyone ever opens Settings at all.

   window.AppUpdate only exists when this page is running inside the
   packaged app's own window with electron/preload.js attached — NOT in
   test/serve.js's plain browser, and NOT in the bare Electron window
   tools/shot.js opens for screenshots, since neither sets a preload. So
   this degrades to doing nothing at all when it isn't there, same as
   every other place this app checks for something Electron-only.

   Only 'downloaded' is worth a popup for. 'checking'/'available'/
   'downloading' are background noise nobody asked to watch — the whole
   point of the background-check choice was that a player never has to
   think about updating until there's something to actually act on. */
if (window.AppUpdate){
  const card = document.getElementById('update-card');
  if (card){
    const txt = card.querySelector('.uc-txt');
    const now = card.querySelector('#update-now'), later = card.querySelector('#update-later');
    if (now)   now.addEventListener('click', () => window.AppUpdate.restartNow());
    /* "Later" doesn't need to remember the dismissal past this session —
       autoInstallOnAppQuit means the update installs on the next real
       quit regardless of whether this card is ever seen again. It exists
       purely so someone mid-table isn't nagged while they're busy. */
    if (later) later.addEventListener('click', () => { card.style.display = 'none'; });
    window.AppUpdate.onStatus(s => {
      if (s.state === 'downloaded'){
        if (txt) txt.textContent = 'An update (' + s.latest + ') is ready.';
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }
}

/* ── the tables ── */
VIEW.tables = () => `
  <h2>The Tables</h2>
  <div class="strip"></div>
  <div class="f"><label>Name a new table</label>
    <input id="tname" maxlength="60" placeholder="what this one is called"></div>
  <div class="sealrow">
    <button class="seal" data-do="maketable"><span class="wax"></span><b>M</b></button>
    <span class="cap">Raise it</span>
    <button class="lk" data-do="importtable">Import a table</button>
  </div>
  <div class="roll" id="roll">${rollT()}</div>`;
AFTER.tables = () => { const i = $('#tname'); if (i) i.focus(); };
function rollT(){
  if (!tables.length) return `<div class="empty">No tables yet. Name one above and stamp
    the seal — the first goes on the roll.</div>`;
  return tables.map((t,i) => `<div class="entry" data-id="${t.id}">
    <span class="n">${two(i+1)}</span>
    <span class="t" data-do="open"><b>${esc(t.name)}</b><i>${when(t.opened)}</i></span>
    <span class="acts">
      <button class="sm" data-act="rename">Rename</button>
      <button class="sm" data-act="export">Export</button>
      <button class="sm bad" data-act="del">Delete</button></span></div>`).join('');
}

/* ── characters ── */
VIEW.chars = () => `
  <h2>Characters</h2>
  <div class="strip"></div>
  <div class="row2" style="margin-bottom:34px">
    <button class="lk" data-do="newchar">Create a character</button>
    <button class="lk" data-do="importchar">Import a sheet</button>
  </div>
  <div class="roll" id="rollc">${rollC()}</div>`;
function rollC(){
  if (!chars.length) return `<div class="empty">Nobody yet. Create one and the record
    opens on the table; import one and it lands here as it was written.</div>`;
  return chars.map((c,i) => `<div class="entry" data-id="${c.id}">
    <span class="n">${two(i+1)}</span>
    <span class="t" data-do="opensheet"><b>${esc(c.name) || '<em style="font-family:\'Crimson Text\',serif;font-style:italic;font-weight:400">an unnamed hand</em>'}</b><i>${esc(c.note || (c.who && window.Sheet ? window.Sheet.note(c) : 'a sheet'))}</i></span>
    <span class="acts">
      <button class="sm" data-act="csheet">Open sheet</button>
      <button class="sm" data-act="crename">Rename</button>
      <button class="sm" data-act="cexport">Export</button>
      <button class="sm bad" data-act="cdel">Delete</button></span></div>`).join('');
}

/* ── the two ways into a character ── */
VIEW.newchar = () => `
  <h2>A New Character</h2>
  <div class="strip"></div>
  <div class="doors">
    <button class="door" data-do="blank">
      <span class="no">I</span>
      <b>From a blank sheet</b>
      <i>The record opens empty and you fill it in yourself, line by line.
         Everything the rules ask for is printed on the leaf.</i>
    </button>
    <div class="door shut" aria-disabled="true">
      <span class="shutmark"><span class="wax2"></span>Sealed</span>
      <span class="no">II</span>
      <b>From the character creator</b>
      <i>Walks you through species, culture, backgrounds and the points you
         have to spend, and hands back a finished sheet. Not opened yet.</i>
    </div>
  </div>`;

/* ── the record itself ── */
VIEW.sheet = () => cur ? window.Sheet.render(cur, stationer()) : '<h2>Nothing open</h2>';
AFTER.sheet = () => { grow();
  const i = sbody.querySelector('input[data-p="who.name"]');
  if (i && !i.value) i.focus(); };
/* the book's own ability text runs long; a box that hides half of it is no record */
function grow(el){
  const list = el ? [el] : sbody.querySelectorAll('.leaf textarea');
  list.forEach(t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; });
}

/* your own charge, pressed into the foot of the leaf like a stationer's mark */
function stationer(){
  const a = me.arms || {};
  if (a.chg) return H.charge(a.chg, a.chgT || 'or', 200, 400, 1);
  const o = H.ordinary(a.ord || 'none', a.ordT || 'or', 200, 400);
  /* a coat with neither charge nor ordinary still leaves the shield itself */
  return o || '<path d="' + H.shieldPath(200, 400) + '"/>';
}
function newBlank(){
  cur = window.Sheet.blank();
  cur.note = 'a blank sheet';
  chars.unshift(cur); saveC(); resetUndo();
  /* the doors were a fork, not a place — Back from the sheet goes to the roll */
  (at === 'newchar' ? swap : go)('sheet');
}
function openSheet(id){
  const i = chars.findIndex(c => c.id === id); if (i < 0) return;
  const keep = chars[i].id;
  cur = window.Sheet.fill(chars[i]); cur.id = keep; chars[i] = cur; saveC(); resetUndo();
  go('sheet');
}
/* ── UNDO ──────────────────────────────────────────────────────
   Every change to a record goes through one of two doors: a step
   (act) or a keystroke (setPath). Both take a snapshot of what
   the record looked like BEFORE they ran, so ctrl+Z can put it
   back. A burst of typing is one step, not one per letter.
   Where you are looking — the page, the tree tab, an open slip —
   is not part of a character, so undo never moves you.        */
const VOLATILE = ['page','cat','adding'];
let past = [], future = [], typing = 0;
const freeze = () => { const c = {}; for (const k in cur) if (VOLATILE.indexOf(k) < 0) c[k] = cur[k];
                       return JSON.stringify(c); };
function snap(){
  if (!cur) return;
  const s = freeze();
  if (past.length && past[past.length-1] === s) return;
  past.push(s); if (past.length > 90) past.shift();
  future.length = 0; paintUndo();
}
function thaw(s){
  const held = {}; VOLATILE.forEach(k => held[k] = cur[k]);
  const d = JSON.parse(s);
  Object.keys(cur).forEach(k => { if (VOLATILE.indexOf(k) < 0) delete cur[k]; });
  Object.assign(cur, d, held);
  cur.adding = null;
  const i = chars.findIndex(x => x.id === cur.id); if (i >= 0) chars[i] = cur;
  saveC(); render(); paintUndo();
}
function undo(){ if (!cur || !past.length) return toast('Nothing to undo');
  future.push(freeze()); thaw(past.pop()); toast('Undone'); }
function redo(){ if (!cur || !future.length) return toast('Nothing to redo');
  past.push(freeze()); thaw(future.pop()); toast('Redone'); }
function paintUndo(){
  const u = $('#undob'), rd = $('#redob');
  if (u) u.disabled = !past.length;
  if (rd) rd.disabled = !future.length;
}
function resetUndo(){ past = []; future = []; paintUndo(); }

/* ── SAVING ────────────────────────────────────────────────────
   The debounce is for the indicator, never for the data: anything
   that could end the session flushes first. Every so often the
   hall says out loud that it has been saving, so you are not left
   guessing whether it did.                                     */
let sT, lastSaid = 0;
function flushSheet(){ if (sT){ clearTimeout(sT); sT = 0; } if (cur) saveC(); }
window.addEventListener('beforeunload', flushSheet);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSheet(); });
document.addEventListener('blur', flushSheet, true);
function saidSaved(loud){
  const el = $('#saved'); if (!el) return;
  el.textContent = 'saved'; el.classList.add('flash');
  clearTimeout(saidSaved.t);
  saidSaved.t = setTimeout(() => { el.textContent = 'saves as you write';
    el.classList.remove('flash'); }, 1400);
  if (loud || Date.now() - lastSaid > 90000){ lastSaid = Date.now();
    toast('Saved \u2014 ' + when(cur.updated).toLowerCase()); }
}
function saveNow(){ flushSheet(); saidSaved(true); }
function touch(){
  if (!cur) return;
  cur.who.name = cur.who.name || '';
  cur.name = cur.who.name.trim();
  cur.note = window.Sheet.note(cur);
  cur.updated = Date.now();
  clearTimeout(sT); sT = setTimeout(() => { saveC(); saidSaved(false); }, 260);
}

/* ── THE CODEX ─────────────────────────────────────────────────
   Every choice on the sheet opens the same modal: a list, the
   whole entry beside it, a search box, and Enter to take it.
   Nothing is picked blind and nothing is picked from a row of
   chips that pushes the page around.                          */
const C = () => window.SheetCodex;
function openCodex(k, arg, btn){
  const a = (arg || '').split(':');
  const take = (verb, ctxArg) => entry => {
    snap();
    const out = window.Sheet.act(cur, verb, entry ? (entry.value != null ? entry.value : entry) : (ctxArg||''));
    if (out){ if (out !== 'view'){ touch(); saveC(); } render(); }
    else past.pop(), paintUndo();
  };
  const hint = '<b>&#8593;&#8595;</b> to read &#183; <b>Enter</b> to take &#183; <b>Esc</b> to leave';
  switch (k){
    /* a handful of names you already understand: a small menu at the button */
    case 'openp':
      return small(btn, 'Primary skills', C().skillNames(a[0], 'p',
        { have:(cur.skills[a[0]]||[]).map(x => x.n) }), take('pickp:'+a[0]));
    case 'opens': {
      const p = findSk(a[0], [a[1]]); if (!p) return true;
      return small(btn, 'Under ' + (p.n || 'this skill'), C().skillNames(a[0], 's',
        { prim:(p.n||'').trim(), have:(p.kids||[]).map(x=>x.n) }),
        take('picks:'+a[0]+':'+a[1])); }
    case 'opent': {
      const p = findSk(a[0], [a[1]]), sx = findSk(a[0], [a[1], a[2]]);
      if (!p || !sx) return true;
      return small(btn, 'Under ' + (sx.n || 'this skill'), C().skillNames(a[0], 't',
        { prim:(p.n||'').trim(), sec:(sx.n||'').trim(), have:(sx.kids||[]).map(x=>x.n) }),
        take('pickt:'+a[0]+':'+a[1]+':'+a[2])); }

    /* things you keep and reuse: a small menu too, since the row itself is short */
    case 'openwep':   return small(btn, 'Weapons written down',
        C().shortList('weapons'), take('pickwep'));
    case 'openarm':   return small(btn, 'Armour written down',
        C().shortList('armour'), take('pickarm'));
    case 'openitem':  return small(btn, 'Kit written down',
        C().shortList('items'), take('pickitem'));
    case 'opentrait': return small(btn, 'Traits written down',
        C().shortList('traits'), take('picktrait'));

    /* paragraphs you have to read: the codex earns its scrim */
    case 'openbg':
      window.Codex.open('Backgrounds', hint, C().bgEntries(), take('pickbg')); return true;
    case 'opensla':
      window.Codex.open('Styles, Lores and Arts', hint, C().slaEntries(), take('picksla')); return true;
  }
  return false;
}
/* the little menu, pinned to the button that opened it */
function small(btn, title, list, cb){
  if (!btn) return false;
  if (!list.length){ cb(null); return true; }   /* nothing to choose from: just add one */
  window.Codex.menu(btn, title, list, it => cb(it && it.blank ? null : it));
  return true;
}
/* a row you just asked for should be ready to type in */
/* :last-of-type counts tags, not classes, so it lands on the wrong card.
   Take the last match and reach inside it. */
const NEW_FIELD = { additem:['.kit','.kit-name'], addwep:['.weapon-card','input[type=text]'],
  addarm:['.armor-card','.armor-name-input'], addtrait:['.bg-card.trait','.bg-name'],
  addknack:['.knack-row','input[type=text]'] };
function focusLast(k){
  const pair = NEW_FIELD[k]; if (!pair) return;
  const all = sbody.querySelectorAll(pair[0]);
  const card = all[all.length-1]; if (!card) return;
  const el = card.querySelector(pair[1]);
  if (el){ el.focus({preventScroll:true}); el.scrollIntoView({block:'center', behavior:'smooth'}); }
}
function findSk(cat, ids){
  let n = null, list = (cur.skills[cat] || []);
  ids.forEach(id => { n = list.find(x => x.id === id); list = n ? (n.kids || []) : []; });
  return n;
}

/* ── PICTURES ──────────────────────────────────────────────────
   A face and a body, shrunk enough to live in the browser's own
   store: the face is for the table, the body stands on it.    */
let picSlot = 'face';

/* ── join ── */
/* ══ JOINING SOMEBODY ELSE'S TABLE ════════════════════════
   A word, said out loud across a room or down a phone. Not a link, not an
   invite, not an account: the GM says "TUCRP" and ten people type it. The
   alphabet it is drawn from (06-session.js) has no letters that turn into
   other letters when spoken, which is the whole reason it is five
   characters rather than a UUID.

   WHAT YOU ARRIVE AS is what the hall already knows: your name, your arms
   and your likeness. There is nothing to fill in here that is not already
   part of you, so the only field is the word. */
let joining = false, joinSaid = '', needName = false;
VIEW.join = () => `
  <h2>Join a Game</h2>
  <div class="strip"></div>
  ${liveStrip()}
  ${(!me.name || needName) ? `<div class="f"><label>The name you answer to</label>
    <input id="jname" maxlength="40" value="${esc(me.name)}"
      placeholder="type your name"></div>` : ''}
  <div class="f"><label>The table's word</label>
    <input id="word" maxlength="8" spellcheck="false" autocomplete="off" class="wordin"
      placeholder="· · · · ·" value="${esc(joinSaid)}"></div>
  <div class="sealrow">
    <button class="seal${joining ? ' busy' : ''}" data-do="join"><span class="wax"></span><b>M</b></button>
    <span class="cap">Walk in${joining ? '<em>knocking…</em>' : ''}</span>
  </div>
  <div class="me-row" style="margin-top:34px">
    <div class="me-arms">${me.pic
      ? `<img class="ownpic" src="${esc(me.pic)}" alt="">`
      : H.armsSVG(me.arms, { shape:'shield', w:96, h:116, edge:4 })}</div>
    <div class="me-body">${me.body
      ? `<img src="${esc(me.body)}" alt="you, at the table">`
      : '<div class="me-nobody">no<br>likeness</div>'}</div>
    <div class="me-fields">
      <div class="opt-say"><b>${esc(me.name || 'unnamed')}</b></div>
    </div>
  </div>`;
AFTER.join = () => {
  const nm = $('#jname');
  if (nm) nm.addEventListener('input', () => {
    me.name = nm.value; saveM(); paintArms(); });
  const i = $('#word');
  if (!i) return;
  i.focus();
  /* the word is upper case and has no punctuation in it; saying so as you
     type is kinder than refusing afterwards */
  i.addEventListener('input', () => {
    const at = i.selectionStart;
    i.value = window.Session.tidy(i.value);
    joinSaid = i.value;
    try { i.setSelectionRange(at, at); } catch (e) {}
  });
  i.addEventListener('keydown', e => { if (e.key === 'Enter') sendWord(); });
};

/* what the app can and cannot do about the wire, said once and plainly */
function liveStrip() {
  const N = window.Net;
  if (!N) return '';
  if (!N.configured())
    return `<div class="note" style="margin-bottom:22px">No Firebase project has been given to
      this copy, so tables can only be shared with other windows on THIS machine. Settings →
      Multiplayer takes a config and makes it real.</div>`;
  /* configured, but the wire is not up: say which of the two console
     switches is the one that has not been thrown */
  const t = N.trouble;
  if (N.mode === 'local' && t && t.say)
    return `<div class="note bad" style="margin-bottom:22px">${esc(t.say)}</div>`;
  return '';
}

/* ══ SETTINGS ═══════════════════════════════════════
   Five blocks, in the order you would actually want them: who you are,
   how the app looks, where you sit, what it is holding for you, and what
   it is. Every switch draws itself from 07-options.js's own description of
   it — the title, the words under it and the names of its states all come
   from there — so a new setting is one entry in that file and nothing here.

   NO DROPDOWNS AND NO CHECKBOXES, the same rule the orders panel at the
   table follows: a choice is a row of pennons with every option in sight.
   A setting you have to open something to read is a setting nobody reads. */
const KB = n => n < 1024 ? n + ' bytes'
  : n < 1048576 ? (n/1024).toFixed(1) + ' KB' : (n/1048576).toFixed(1) + ' MB';

function optRow(k){
  const d = window.Options.DEFS[k], v = window.Options.get(k);
  return `<div class="opt">
    <div class="opt-say"><b>${d.t}</b></div>
    <div class="chips">${d.of.map(o =>
      `<button class="num${v===o?' on':''}" data-opt="${k}" data-v="${o}">${d.say[o]}</button>`
    ).join('')}</div>
  </div>`;
}
/* the switches, grouped the way 07-options.js declares them, so the screen
   is laid out by the file that owns them rather than by a second list here
   that can drift out of step with it */
function optBlock(g){
  return `<div class="setblk"><h3>${g.name}</h3>${g.keys.map(optRow).join('')}</div>`;
}

/* ══ THE KEYS ════════════════════════════════════════════════════
   This list used to be printed across the top of the table, in a strip that
   was on screen for the whole of every session — a manual taped to the
   monitor. It was right to take it down and wrong to throw it away: the
   shortcuts still exist and somebody has to be able to find out what they
   are. A reference somebody opens once is a different thing from a caption
   nobody can dismiss. */
const KEYS = [
  ['The table', [
    ['Drag the wood', 'pan'], ['Wheel, or Up / Down', 'zoom'],
    ['Wheel out, fully', 'sit down at the table'],
    ['Drag a piece', 'move it'], ['Shift + drag', 'off the grid'],
    ['Alt + wheel', 'resize a piece'], ['Arrows', 'nudge'], ['Shift + arrows', 'nudge finely'],
    ['Del', 'bin what is selected'], ['Ctrl + Z / Ctrl + Y', 'undo, redo']
  ]],
  ['Getting about', [
    ['Esc', 'the menu — or back out of whatever is open'],
    ['B', 'the chest'], ['/', 'find, in the chest'], ['Space', 'end the turn, in a fight']
  ]],
  ['A record', [
    ['Click a sheet on the wood', 'pick it up to read'],
    ['Esc', 'put it back down'], ['Ctrl + S', 'save now (it saves as you write anyway)']
  ]]
];
function keyBlock(){
  return `<div class="setblk"><h3>Keys</h3>${KEYS.map(([g, rows]) => `
    <div class="keys"><b>${g}</b>${rows.map(([k, w]) =>
      `<div class="keyrow"><kbd>${esc(k)}</kbd><span>${esc(w)}</span></div>`).join('')}</div>
  `).join('')}</div>`;
}

/* ══ WHAT THIS IS MADE OF ════════════════════════════════════
   Not manners. Four of the six asset packs in this app are CC BY, which
   means attribution is a CONDITION of using them, and until now only one of
   the six was credited — in the flag maker, where nobody looking for a
   licence would think to look. */
const MADE_OF = [
  ['Charges', 'game-icons.net', 'CC BY 3.0'],
  ['The tavern', 'soiTavern', ''],
  ['Wood and furniture', 'WoodStuff — loafbrr', 'CC0'],
  ['Pieces', 'KayKit — Kay Lousberg', ''],
  ['Trees and ground', 'Nature MegaKit', ''],
  ['The village shell', 'Medieval Village MegaKit', ''],
  ['The 3D', 'three.js r128', 'MIT']
];

let forgetArmed = false;
let netPasting = false;
/* ══ SETTINGS ══════════════════════════════════════════════
   A LIST OF PLACES, AND ONE OF THEM. Not seven blocks in a column: that is
   a document, and it is what a settings screen becomes if nobody stops it
   — you end up scrolling past the keyboard shortcuts to reach the credits,
   and past the credits to reach the thing you came for.

   The panes are declared once, below, and the screen is built from that
   list. Adding one is a line in SET and a function; it cannot be added to
   the nav and forgotten in the body, because they are the same list. */
let setTab = 'you';
const SET = [
  ['you',   'You'],
  ['look',  'Display'],
  ['table', 'The table'],
  ['keys',  'Keys'],
  ['net',   'Multiplayer'],
  ['data',  'What is kept'],
  ['about', 'About']
];

function paneYou(){
  return `<div class="me-row">
      <div class="me-arms">${me.pic
        ? `<img class="ownpic" src="${esc(me.pic)}" alt="the picture you uploaded">`
        : H.armsSVG(me.arms, { shape:'shield', w:120, h:144, edge:5 })}</div>
      <div class="me-body">
        ${me.body ? `<img src="${esc(me.body)}" alt="you, at the table">`
                  : '<div class="me-nobody">no<br>likeness</div>'}
        <button class="lk sm" data-do="uploadbody">${me.body ? 'Change' : 'Add one'}</button>
        ${me.body ? '<button class="lk sm bad" data-do="dropbody">Drop</button>' : ''}
      </div>
      <div class="me-fields">
        <div class="f"><label>The name you answer to</label>
          <input id="sname" maxlength="40" value="${esc(me.name)}"
            placeholder="type your name"></div>
        <div class="row2"><button class="lk" data-do="arms">Change your arms</button></div>
      </div>
    </div>
    ${readyMade()}`;
}

/* ── SOMEBODY TO BE, WITHOUT GOING AND FINDING A FILE ─────
   grumkata: "it is not easier to change your avatar so that wanst done".

   It was not. The only door to a likeness was `uploadbody`, which opens a
   file picker -- so having a figure at your seat meant owning a picture of
   one, cropping it, and knowing where you put it. Everybody who did not
   have one to hand sat behind an empty chair.

   The app already ships painted figures, and a seat's standee is fed the
   same thing either way: `me.body` is a data URI and buildSeat() puts it on
   a card. So the library's own figures are offered here, one click each,
   beside the upload that was already there. Nothing new is stored and
   nothing new is drawn -- this is a door onto a picture the app was already
   carrying.

   Read fresh each render rather than captured, because Library.art grows
   when you add your own, and anything you have added is a likeness you can
   pick too. */
function readyMade(){
  const L = window.Library;
  if (!L || !L.art || !L.art.all) return '';
  /* the tall ones: a likeness is a standing figure, and a map or a device
     laid flat makes a very strange person */
  const figs = (L.art.all() || []).filter(a => a && a.src && a.tall);
  if (!figs.length) return '';
  return `<div class="me-ready">
    <label>or be one of these</label>
    <div class="me-figs">${figs.map(a => `<button
      class="me-fig${me.body === a.src ? ' on' : ''}"
      data-do="pickbody" data-v="${esc(a.id)}" title="${esc(a.name || '')}">
      <img src="${esc(a.src)}" alt="${esc(a.name || '')}"></button>`).join('')}</div>
  </div>`;
}

function paneLook(){
  const full = !!document.fullscreenElement;
  const g = window.Options.groups().find(x => x.name === 'Display');
  return `<div class="opt"><div class="opt-say"><b>Full screen</b></div>
      <div class="chips">
        <button class="num${full?'':' on'}" data-do="windowed">Windowed</button>
        <button class="num${full?' on':''}" data-do="fullscreen">Full screen</button>
      </div></div>
    ${g ? g.keys.map(optRow).join('') : ''}`;
}

function paneTable(){
  const g = window.Options.groups().find(x => x.name === 'The table');
  return g ? g.keys.map(optRow).join('') : '';
}

function paneKeys(){ return keyBlock(); }

function paneNet(){
  return `<div class="opt">
      <div class="opt-say"><b>${netSays()}</b></div>
      <div class="chips">
        <button class="num" data-do="netcfg">${window.Net && window.Net.configured()
          ? 'Replace the config' : 'Paste a config'}</button>
        ${window.Net && window.Net.configured()
          ? '<button class="num bad" data-do="netclear">Forget it</button>' : ''}
      </div>
    </div>
    ${netPasting ? `<div class="f" style="margin-top:8px">
      <label>The firebaseConfig object</label>
      <textarea id="netcfg" rows="8" spellcheck="false"></textarea></div>
      <div class="chips"><button class="num" data-do="netsave">Use it</button>
        <button class="num" data-do="netcancel">Never mind</button></div>` : ''}`;
}

function paneData(){
  const w = window.Options.weigh();
  return `<div class="opt">
      <div class="opt-say"><b>${tables.length} table${tables.length===1?'':'s'},
        ${chars.length} character${chars.length===1?'':'s'}</b>
        <em>${w.keys} thing${w.keys===1?'':'s'} in this browser's own store,
        about ${KB(w.bytes)}</em></div>
      <div class="chips">
        <button class="num" data-do="dumpall">Take a copy</button>
        <button class="num${forgetArmed?' bad on':' bad'}" data-do="forgetall">${
          forgetArmed ? 'Press again to forget it all' : 'Forget everything'}</button>
      </div>
    </div>`;
}

function paneAbout(){
  return `<div class="opt">
      <div class="opt-say"><b>Monarchy${appVersion ? ' ' + esc(appVersion) : ''}</b>
        <em>${window.AppUpdate ? 'running as an app' : 'running in a browser'}</em></div>
      ${window.AppUpdate ? `<div class="chips">
        <button class="num" data-do="checkupdate">Check for updates</button></div>` : ''}
    </div>
    <div class="made">${MADE_OF.map(([what, who, lic]) =>
      `<div class="maderow"><b>${esc(what)}</b><span>${esc(who)}</span>
       <i>${esc(lic)}</i></div>`).join('')}</div>`;
}

const PANE = { you: paneYou, look: paneLook, table: paneTable, keys: paneKeys,
               net: paneNet, data: paneData, about: paneAbout };

VIEW.set = () => `
  <h2>Settings</h2>
  <div class="strip"></div>
  <div class="setwrap">
    <nav class="setnav">${SET.map(([k, n]) =>
      `<button class="setnav-i${setTab===k?' on':''}" data-set="${k}">${n}</button>`).join('')}</nav>
    <section class="setpane">${(PANE[setTab] || paneYou)()}</section>
  </div>`;

/* the three written fields save as you type, the way the record does —
   there is no seal on this screen because there is nothing to commit */
AFTER.set = () => {
  const live = (id, key) => { const i = $(id); if (!i) return;
    i.addEventListener('input', () => { me[key] = i.value; saveM(); paintArms();
      /* a table you are sitting at should see you change */
      if (window.Session && window.Session.live) window.Session.refresh(); }); };
  live('#sname', 'name');
};

/* the app's own version, pushed by electron/updater.js rather than asked
   for — undefined in a browser, which is the honest answer there */
let appVersion = '';
if (window.AppUpdate && window.AppUpdate.onStatus)
  window.AppUpdate.onStatus(st => {
    if (st && st.version && st.version !== appVersion) {
      appVersion = st.version;
      if (at === 'set') render();
    }
  });

function netSays(){
  const N = window.Net;
  if (!N) return 'Not available';
  if (!N.configured()) return 'Tables are shared with other windows on this machine';
  const t = N.trouble;
  if (N.mode === 'local' && t && t.say) return t.say;
  return 'This copy can host a table for other machines';
}

/* the tincture's name, run up the right edge of the cloth (00-hall.css).
   A colour you typed in yourself has no name, and the full label for one
   ("A colour of your own") is four words up the side of the screen. */
const houseWord = A => H.named(A.a) ? H.tname(A.a) : 'Your own';

/* THE CLOTH BEHIND THE MAKER HAS TO BE DARK, WHATEVER THE COAT IS.
   It used to be the field's own tincture straight out of the record, with
   one hand-written exception for Sable. That held only while a field could
   only be one of ten known colours. It can now be a metal, a fur, or any
   colour the player typed in — and Argent, Or, Ermine or a picked pastel as
   a full-screen background is a cream page with cream text on it, which is
   what a field of Ermine actually did.

   So the cloth is the LIVERY (which is a colour by construction — never a
   metal, never Sable) with a ceiling put on how light it is allowed to be.
   Same coat, same feel, and the words on it stay readable. */
function cloth(A){
  const c = H.liveryOf(A) || (A && A.a === 'sable' ? '#3a3126' : H.TINCT.gules);
  const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return c;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, bl = n & 255;
  const L = (0.2126*r + 0.7152*g + 0.0722*bl) / 255;
  if (L <= 0.30) return c;
  const k = 0.30 / L, h = v => ('0' + Math.round(Math.min(255, v*k)).toString(16)).slice(-2);
  return '#' + h(r) + h(g) + h(bl);
}

/* ══ THE FLAG MAKER ═════════════════════════════════════
   grumkata: "for custom banners it should be wayyy more customisable".

   The coat has roughly forty times the number of possible forms it had —
   furs, a line of partition on the field AND on the ordinary, up to six
   charges ranged five ways, a compony bordure, six cuts of hem, an explicit
   livery — and one scrolling column of every one of those at once is worse
   than the small version was. So the maker is a WORKBENCH: a row of pennons
   across the top, one bench at a time, and the thing you are making sitting
   beside it the whole while.

   Everything is still shown as the thing itself, drawn in the tinctures you
   have already picked — a word is not a picture, and "per saltire nebuly"
   means nothing at all until you see it. Every swatch redraws when any
   choice changes. That is the point, and it is cheap.

   Under the preview the coat is written out as a blazon. The written form
   is the real heraldry and the drawing is one reading of it, so saying it
   back to you in words is the app proving it understood what you built. */
let draft = null;
let mkTab = 'field';
let chgQ = '';

const SW = 46;
/* a swatch takes a DRAWING FUNCTION rather than a string, because a fur has
   to register itself on the drawing's own context before the defs for it
   can be written — and the defs go at the front of the same <svg> */
function swatch(fn){
  const c = H.ctx(SW);
  const inner = typeof fn === 'function' ? fn(c) : fn;
  return `<svg viewBox="0 0 ${SW} ${SW}">${H.defs(c)}${inner}</svg>`;
}

function pickRow(title, key, opts, draw, extra){
  return `<div class="mk"><h3>${title}</h3><div class="swgrid">
    ${Object.keys(opts).map(k => `<button class="sw${draft[key]===k?' on':''}"
      data-arm="${key}" data-v="${k}" title="${opts[k]}">${draw(k)}</button>`).join('')}
  </div>${extra||''}</div>`;
}
/* a row of tinctures: the ten named ones, the six furs, and a colour of
   your own. A fur is drawn as a fur — there is no colour that says ermine.

   ── AND WHICH OF THEM WILL LOOK WRONG ─────────────────
   grumkata: "most banners made with the creator look ass for some reason".

   The reason is a thousand years old and the app already knew it: the rule
   of tincture, never colour on colour and never metal on metal. Sable on
   gules is mud; argent on or is a smudge. It is the single thing that
   separates arms that read across a field from arms that do not.

   But it was only said AFTERWARDS, as a line of advice under the finished
   shield — by which point you have already picked the thing, looked at it,
   decided heraldry is not for you and moved on. So it is said HERE instead,
   where the choice is: anything that would clash with what it is being laid
   over is dimmed, in the row, before you click it.

   Dimmed, not removed. The rule has exceptions old enough to have names,
   and `base` is null wherever the question does not arise — a field with
   nothing over it, a divided field under an ordinary — so a row with no
   opinion shows none. */
function tinctRow(title, key, base){
  const v = draft[key], own = !H.named(v);
  const mine = own && /^#[0-9a-fA-F]{6}$/.test(String(v)) ? v : '#8a8a8a';
  /* furs are exempt, and always were; a colour of your own is not something
     the app has any business having an opinion about */
  const clash = k => !!base && H.named(k) && H.named(base)
    && !H.isFur(k) && !H.isFur(base) && H.isMetal(k) === H.isMetal(base);
  const chip = (k, inner) => `<button class="chip t${v===k?' on':''}${clash(k)?' clash':''}"
    data-arm="${key}" data-v="${k}" title="${H.tname(k)}${clash(k)
      ? ' \u2014 against the rule of tincture, on ' + H.tname(base) : ''}">${inner}</button>`;
  return `<div class="mk"><h3>${title}</h3>
    <div class="chips">
      ${Object.keys(H.TINCT).map(k =>
        chip(k, `<span style="background:${H.TINCT[k]}"></span>`)).join('')}
    </div>
    <div class="chips" style="margin-top:6px">
      ${Object.keys(H.FURS).map(k => chip(k, `<span class="fur">${
        swatch(c => `<rect width="${SW}" height="${SW}" fill="${H.paint(k, c)}"/>`)
      }</span>`)).join('')}
      <label class="chip t own${own?' on':''}" title="A colour of your own">
        <span style="background:${own?mine:'#8a8a8a'}"></span>
        <input type="color" data-own="${key}" value="${mine}">
      </label>
    </div></div>`;
}
/* a line of partition only means something on a cut. Saying so is better
   than hiding the row, which reads as the app having lost it. */
/* A CHOICE THAT CANNOT APPLY IS NOT SHOWN AT ALL. It used to be shown with
   a paragraph explaining why it was unavailable, which is a manual printed
   in the middle of a tool. If a chequy field has no cut to dress, the row
   for dressing it has no business being on screen. */
function lineRow(title, key, lineable, draw){
  if (!lineable) return '';
  return pickRow(title, key, H.LINES, draw);
}

/* ── the benches ── */
function paneField(){
  return pickRow('The field', 'div', H.DIVISIONS,
      k => swatch(c => H.field(k, draft.a, draft.b, SW, SW, draft.line, c)))
    + lineRow('The line it is cut by', 'line', H.LINEABLE[draft.div],
      k => swatch(c => H.field(draft.div, draft.a, draft.b, SW, SW, k, c)))
    /* the field itself is laid over nothing, so it has no wrong answer.
       The second tincture is only on show once the field is cut. */
    + tinctRow('First tincture', 'a')
    + tinctRow('Second tincture', 'b', draft.div !== 'plain' ? draft.a : null);
}
function paneOrd(){
  return pickRow('The ordinary', 'ord', H.ORDINARIES,
      k => swatch(c => `<rect width="${SW}" height="${SW}" fill="rgba(0,0,0,.32)"/>`
                  + H.ordinary(k, draft.ordT, SW, SW, draft.ordLine, c)))
    + lineRow('Its edges', 'ordLine', H.ORD_LINEABLE[draft.ord],
      k => swatch(c => `<rect width="${SW}" height="${SW}" fill="rgba(0,0,0,.32)"/>`
                  + H.ordinary(draft.ord, draft.ordT, SW, SW, k, c)),
      draft.ord === 'none'
        ? 'Lay an ordinary over the field first and its edges can be cut any way you like.'
        : `A ${H.ORDINARIES[draft.ord].replace(/^An? /,'').toLowerCase()} has no pair of
           long straight edges to dress. A fess, a pale, a bend, a chief or a chevron does.`)
    /* an ordinary lies straight on the field, so it answers to it — but
       only a PLAIN field, which is the same condition tinctureWarning uses */
    + tinctRow("The ordinary's tincture", 'ordT',
               draft.div === 'plain' ? draft.a : null);
}
function paneCharge(){
  const L = H.chargeList();
  const q = chgQ.trim().toLowerCase();
  const keys = Object.keys(L).filter(k =>
    !q || (L[k].n || k).toLowerCase().indexOf(q) >= 0);
  const N = n => `<button class="num${(draft.chgN||1)===n?' on':''}"
    data-arm="chgN" data-v="${n}">${['','One','Two','Three','Four','Five','Six'][n]}</button>`;
  return `<div class="mk">
    <h3>The charge <span class="mk-find"><input id="chgq" value="${esc(chgQ)}"
      placeholder="find a charge" spellcheck="false"></span></h3>
    <div class="swgrid tall">
      <button class="sw${!draft.chg?' on':''}" data-arm="chg" data-v="" title="None">
        ${swatch(`<path d="M13,13 L33,33 M33,13 L13,33" stroke="rgba(255,246,226,.38)"
          stroke-width="3" fill="none"/>`)}</button>
      ${keys.map(k => `<button class="sw${draft.chg===k?' on':''}"
        data-arm="chg" data-v="${k}" title="${L[k].n}">
        ${swatch(c => H.chargeAt(k, draft.chgT, SW, SW, SW/2, SW/2, SW*0.86, c))}</button>`).join('')}
    </div>
    ${keys.length ? '' : '<div class="note">Nothing by that name.</div>'}
  </div>
  <div class="mk"><h3>How many</h3>
    <div class="chips">${N(1)}${N(2)}${N(3)}${N(4)}${N(5)}${N(6)}</div></div>
  ${draft.chgN > 1 ? pickRow('How they are ranged', 'chgA', H.ARRANGE,
      k => swatch(c => `<rect width="${SW}" height="${SW}" fill="rgba(0,0,0,.32)"/>`
           + H.charge(draft.chg || 'lion', draft.chgT, SW, SW, draft.chgN, k, c))) : ''}
  ${tinctRow("The charge's tincture", 'chgT',
      draft.div === 'plain' && draft.ord === 'none' ? draft.a : null)}`;
}
function paneBord(){
  return `<div class="mk"><h3>A bordure</h3><div class="chips">
      ${Object.keys(H.BORDURES).map(k => `<button class="num${draft.bord===k?' on':''}"
        data-arm="bord" data-v="${k}">${H.BORDURES[k]}</button>`).join('')}
    </div>
    </div>
    ${draft.bord ? tinctRow("The bordure's tincture", 'bordT',
        draft.div === 'plain' ? draft.a : null) : ''}`;
}
/* the cut of the foot of your banner, drawn as the banner it makes — and
   the one colour the whole app then wears for you */
function paneFlag(){
  const flag = (k, w, h) => H.armsSVG(draft, { shape:'banner', w, h, hem:k, edge:2 });
  const lv = H.liveryOf(draft) || 'var(--m-gules)';
  const pick = (k, label, swatchCol, on) => `<button class="chip liv${on?' on':''}"
    data-arm="livery" data-v="${k}" title="${label}">
    <span style="background:${swatchCol}"></span></button>`;
  const auto = H.liveryOf(Object.assign({}, draft, { livery:'' }));
  return `<div class="mk"><h3>The cut of the hem</h3><div class="swgrid flags">
      ${Object.keys(H.HEMS).map(k => `<button class="sw${(draft.hem||'swallow')===k?' on':''}"
        data-arm="hem" data-v="${k}" title="${H.HEMS[k]}">
        <span class="flagwrap">${flag(k, 34, 58)}</span></button>`).join('')}
    </div></div>
  <div class="mk"><h3>Your livery</h3>
    <div class="chips">
      ${pick('', 'Taken from your arms', auto || 'var(--m-gules)', !draft.livery)}
      ${Object.keys(H.TINCT).filter(t => !H.isMetal(t) && t !== 'sable').map(t =>
        pick(t, H.TNAME[t], H.TINCT[t], draft.livery === t)).join('')}
      <label class="chip t own${draft.livery && !H.named(draft.livery) ? ' on' : ''}"
        title="A colour of your own">
        <span style="background:${draft.livery && !H.named(draft.livery) ? draft.livery : '#8a8a8a'}"></span>
        <input type="color" data-own="livery"
          value="${/^#[0-9a-fA-F]{6}$/.test(String(draft.livery)) ? draft.livery : '#8a8a8a'}">
      </label>
    </div>
    </div>`;
}
const PANES = { field:paneField, ord:paneOrd, chg:paneCharge, bord:paneBord, flag:paneFlag };
const TABS = [['field','Field'], ['ord','Ordinary'], ['chg','Charge'],
              ['bord','Border'], ['flag','Banner']];
/* how many of this bench's choices are not the plain default — a tally on
   the pennon, so you can see where you have been */
function tabTally(k){
  const D = H.DEFAULTS, n = ({
    field: ['div','a','b','line'], ord: ['ord','ordT','ordLine'],
    chg: ['chg','chgT','chgN','chgA'], bord: ['bord','bordT'], flag: ['hem','livery']
  })[k].filter(f => draft[f] !== D[f]).length;
  return n ? `<i>${n}</i>` : '';
}

VIEW.arms = () => `
  <h2>Your Arms</h2>
  <div class="strip"></div>
  <div class="row2" style="margin-bottom:22px">
    <button class="lk" data-do="randomarms">Roll for it</button>
    <button class="lk" data-do="uploadarms">${me.pic ? 'Use a different picture' : 'Upload a picture instead'}</button>
    ${me.pic ? '<button class="lk bad" data-do="droppic">Drop the picture</button>' : ''}
  </div>
  <div class="maker">
    <div class="bench">
      <div class="mk-tabs">${TABS.map(([k,n]) => `<button class="mk-tab${mkTab===k?' on':''}"
        data-tab="${k}">${n}${tabTally(k)}</button>`).join('')}</div>
      <div class="mk-pane">${(PANES[mkTab] || paneField)()}</div>
    </div>
    <div class="prev">
      <div class="card${me.pic?' pic':''}">
        <div id="prevArms" class="prev-pair">${me.pic
          ? `<img class="ownpic" src="${esc(me.pic)}" alt="the picture you uploaded">`
          : H.armsSVG(draft, {shape:'shield', w:200, h:240, edge:6})
            + `<span class="prev-flag">${H.armsSVG(draft, {shape:'banner', w:84, h:176, edge:3})}</span>`}</div>
        <!-- NO WRITTEN BLAZON, AND NO ADVICE LINE. grumkata: "the text
             saying per fes sable and argent... is still there". Both lines
             lived here: the blazon spelling the coat out in herald's
             language, and under it a sentence of tincture advice.

             Neither earns its place. You are looking at the shield; being
             told in Norman French what you can see is a caption on a
             photograph. And the advice is now in the swatches themselves
             (tinctRow) where the choice actually happens, which is both
             earlier and quieter than a sentence appearing after the fact.

             H.blazonText and H.tinctureWarning are both still exported and
             still tested -- this is the view dropping them, not the model
             losing them. -->
      </div>
      <div class="f" style="margin-top:20px"><label>The name you answer to</label>
        <input id="aname" maxlength="40" value="${esc(me.name)}" placeholder="type your name"></div>
      <div class="sealrow" style="margin-bottom:0">
        <button class="seal" data-do="takearms"><span class="wax"></span><b>M</b></button>
        <span class="cap">Take these arms</span>
      </div>
    </div>
  </div>`;
/* the name saves as you write, so nothing is lost by pressing
   a pennon mid-word and being redrawn */
AFTER.arms = () => {
  const live = (id, key) => { const i = $(id); if (!i) return;
    i.addEventListener('input', () => { me[key] = i.value; saveM(); paintArms(); }); };
  live('#aname', 'name');
  const q = $('#chgq');
  if (q) q.addEventListener('input', () => { chgQ = q.value; repaintMaker('#chgq'); });
};

/* Every swatch on the bench is drawn in the tinctures currently chosen, so
   changing one colour redraws all of them. `keep` is the field that was
   being typed in, put back afterwards with its caret where it was. */
function repaintMaker(keep){
  const tabbed = repaintMaker.tab !== mkTab;
  repaintMaker.tab = mkTab;
  screen.style.setProperty('--field', cloth(draft));
  screen.dataset.house = houseWord(draft);
  const held = keep && $(keep);
  const val = held ? held.value : null, pos = held ? held.selectionStart : 0;
  const grid = document.querySelector('.swgrid.tall');
  const top = grid ? grid.scrollTop : 0;
  render();
  const now = keep && $(keep);
  if (now && val != null){ now.value = val; now.focus();
    try { now.setSelectionRange(pos, pos); } catch (e) {} }
  const g2 = document.querySelector('.swgrid.tall');
  if (g2) g2.scrollTop = top;
  /* stepping to another bench is a small arrival of its own: the pane
     wipes, the rest of the screen does not move */
  const pane = document.querySelector('.mk-pane');
  if (tabbed && pane) pane.classList.add('turned');
}

/* ══ YOUR ARMS, IN THE HALL ══════════════════════════════
   THE SAME OUTLINE FOR ALL THREE STATES. No arms, an uploaded picture, and
   real heraldry used to be three different shields: the flat, straight-sided
   pentagon below was hand-copied as a CSS clip-path (once here, once in
   00-hall.css's .blank rule) while real arms went through H.armsSVG's
   properly curved heater shieldPath — so the corner's silhouette visibly
   changed shape the moment you set arms, and the placeholder read as a
   cut-down, lesser version of the real thing rather than an empty version
   of the SAME shield. One shape now, driven from the one place that
   defines it (H.shieldPath), used inline for the two CSS-clipped states —
   00-hall.css's .blank no longer carries its own clip-path at all.

   Whether a coat has been BLAZONED is the engine's question, not this
   file's: H.blazoned knows what an untouched record looks like. */
function paintArms(){
  const s = $('#myshield'), n = $('#myname');
  const clip = "path('" + H.shieldPath(92, 110).replace(/\s+/g, ' ') + "')";
  s.innerHTML = me.pic
    ? `<img src="${esc(me.pic)}" alt="" style="clip-path:${clip};
        object-fit:cover;height:110px">`
    : H.blazoned(me.arms)
      ? H.armsSVG(me.arms, { shape:'shield', w:184, h:220, edge:7 })
      : `<div class="blank" style="clip-path:${clip}">no arms<br>yet</div>`;
  n.textContent = me.name || 'unnamed';
  n.classList.toggle('unset', !me.name);
}

/* ══ CLICKS ═══════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const plate = e.target.closest('.plate[data-i]');
  const banner = plate && BANNERS[+plate.dataset.i];
  if (banner) return take(banner.id);
  if (e.target.closest('#arms')){ draft = H.norm(me.arms); mkTab = 'field'; chgQ = ''; at = 'arms';
    repaintMaker.tab = 'field';
    screen.style.setProperty('--field', cloth(draft));
    screen.dataset.house = houseWord(draft);
    $('#device').innerHTML = '';
    render(true); window.Hall.lock(true); screen.classList.add('on');
    fall();
    setTimeout(() => { if (at) window.Hall.sleep(true); }, 620);
    backBtn.style.display='flex'; return; }
  if (e.target.closest('#back')) return backOne();

  /* the record's own steps. A click on a field it owns is typing, not a step. */
  if (at === 'sheet' && cur){
    const step = e.target.closest('[data-s]');
    const onField = e.target.dataset && e.target.dataset.p != null;
    if (step && !onField){
      const k = step.dataset.s, arg = step.dataset.a || '';
      if (k === 'pic'){ picSlot = arg; return $('#pickI').click(); }
      if (k.slice(0,4) === 'open' && openCodex(k, arg, step)) return;
      /* a step that only moves the eye is not a change, so it is not undoable */
      const looking = /^(page|cat|open|close)/.test(k);
      if (!looking) snap();
      const out = window.Sheet.act(cur, k, arg);
      if (out === 'kept'){ toast('Kept — it will be offered next time'); past.pop(); paintUndo(); return; }
      if (out === 'noname'){ toast('Give it a name first'); past.pop(); paintUndo(); return; }
      if (out){ if (out !== 'view'){ touch(); saveC(); } render();
                if (out === 'new') focusLast(k); }
      else if (!looking){ past.pop(); paintUndo(); }
      return;
    }
  }

  /* which bench of the maker you are standing at */
  const tab = e.target.closest('[data-tab]');
  if (tab){ mkTab = tab.dataset.tab; return repaintMaker(); }

  /* a switch on the settings screen. 07-options.js refuses anything that is
     not one of that option's own states, so the value is not checked here. */
  /* which place in Settings you are looking at */
  const place = e.target.closest('[data-set]');
  if (place){ setTab = place.dataset.set; netPasting = false; return render(); }

  const opt = e.target.closest('[data-opt]');
  if (opt){ window.Options.set(opt.dataset.opt, opt.dataset.v); return render(); }

  const arm = e.target.closest('[data-arm]');
  if (arm){
    const k = arm.dataset.arm, v = arm.dataset.v;
    /* a count is a number; everything else is a name, and an empty name is
       a real answer — no bordure, no charge, livery taken from the coat */
    draft[k] = k === 'chgN' ? +v : v;
    /* changing the field or the ordinary can take its line of partition away
       with it, and a line left set on something that cannot show it is a
       setting you can neither see nor clear */
    draft = H.norm(draft);
    return repaintMaker();
  }

  const b = e.target.closest('button, [data-do]');
  if (!b) return;
  if (b.classList.contains('seal')){
    b.classList.remove('stamped'); void b.offsetWidth; b.classList.add('stamped');
  }
  const row = b.closest('[data-id]');
  switch (b.dataset.do){
    case 'maketable':  return makeTable();
    case 'importtable':return $('#pickT').click();
    case 'newchar':    return go('newchar');
    case 'blank':      return newBlank();
    case 'importchar': return $('#pickC').click();
    case 'open':       return openTable(row.dataset.id);
    case 'opensheet':  return openSheet(row.dataset.id);
    case 'join':       return sendWord();
    case 'arms':       draft = H.norm(me.arms); mkTab='field'; chgQ=''; at='arms';
                       repaintMaker.tab = 'field'; return render(true);
    case 'uploadarms': return $('#pickP').click();
    case 'uploadbody': return $('#pickB').click();
    case 'pickbody': {
      /* BY ID, NOT BY THE PICTURE ITSELF. The figures that ship with the
         app are relative paths into assets/tex and would sit in an
         attribute quite happily -- but anything you add yourself through
         Library.art.add is a data URI of a few hundred kilobytes, and that
         would go into the markup on every render of this screen. Looking it
         up keeps both cases the same size. */
      const a = window.Library && window.Library.art.get(b.dataset.v);
      if (!a || !a.src) return;
      me.body = a.src; saveM(); render();
      if (window.Session && window.Session.live) window.Session.refresh();
      return toast('That is you, at the table');
    }
    case 'dropbody':   me.body=''; saveM(); render();
                       if (window.Session && window.Session.live) window.Session.refresh();
                       return toast('Likeness dropped');
    case 'droppic':    me.pic=''; saveM(); paintArms(); render(); return toast('Picture dropped');
    case 'randomarms': return rollArms();
    case 'takearms':   return takeArms();
    case 'fullscreen': return (document.documentElement.requestFullscreen
                       ? document.documentElement.requestFullscreen()
                           .then(() => render()).catch(() => toast('Full screen was refused'))
                       : toast('Not available here'));
    case 'windowed':   return (document.exitFullscreen
                       ? document.exitFullscreen().then(() => render()).catch(() => {})
                       : 0);
    case 'checkupdate': window.AppUpdate.checkNow(); return toast('Looking…');
    case 'netcfg':     netPasting = true; render();
                       setTimeout(() => { const t = $('#netcfg'); if (t) t.focus(); }, 30);
                       return;
    case 'netcancel':  netPasting = false; return render();
    case 'netsave':    return saveNetCfg();
    case 'netclear':   window.Net.setCfg(null); netPasting = false; render();
                       return toast('Forgotten — restart to take effect');
    case 'dumpall':    download('monarchy-everything', window.Options.dump());
                       return toast('A copy of everything is in your downloads');
    /* TWO PRESSES, and the second one says what it is about to do. This is
       the only door in the app that destroys something that cannot be got
       back, so it does not get a one-click confirm dialog people dismiss
       without reading — the button itself becomes the warning. */
    case 'forgetall':
      if (!forgetArmed){ forgetArmed = true; render();
        setTimeout(() => { if (forgetArmed){ forgetArmed = false;
          if (at === 'set') render(); } }, 6000);
        return; }
      forgetArmed = false;
      window.Options.forget();
      tables = []; chars = []; me = Object.assign({ name:'', pic:'', body:'',
        arms: Object.assign({}, H.DEFAULTS) });
      paintArms(); if (window.Shell && window.Shell.livery) window.Shell.livery();
      render();
      return toast('Forgotten — this browser holds nothing of yours');
  }
  if (b.dataset.act && row) rowAct(b.dataset.act, row, b);
});
document.addEventListener('input', e => {
  const d = e.target.dataset || {};
  if (d.own){ draft[d.own] = e.target.value; return repaintMaker(); }
  /* the leaf never redraws while you write — only the numbers that moved do,
     so the caret stays exactly where you put it */
  if (d.p != null && at === 'sheet' && cur){
    if (!typing) snap();                         /* the state before this burst */
    clearTimeout(typing); typing = setTimeout(() => { typing = 0; }, 800);
    window.Sheet.setPath(cur, d.p, e.target.value);
    if (e.target.tagName === 'TEXTAREA') grow(e.target);
    window.Sheet.repaintNumbers(cur, sbody);
    /* changing what kind of thing an ability slot is grows or drops its Favor row */
    if (/^sla\.[^.]+\.type$/.test(d.p)){ saveC(); render(); return; }
    touch();
  }
});
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && at === 'sheet' && cur){
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey){ e.preventDefault(); typing = 0; return undo(); }
    if ((k === 'z' && e.shiftKey) || k === 'y'){ e.preventDefault(); typing = 0; return redo(); }
    if (k === 's'){ e.preventDefault(); return saveNow(); }
  }
  if (e.key === 'Escape'){
    if (document.querySelector('.entry input')) return;
    const a = document.activeElement;
    if (a && a.closest && a.closest('.leaf')){ a.blur(); return; }
    backOne();
  }
  if (e.key === 'Enter' && document.activeElement.id === 'tname') makeTable();
});

/* ══ TABLES, FOR REAL ═════════════════════════════════════════ */
function makeTable(){
  const v = ($('#tname').value || '').trim();
  if (!v) return toast('Give it a name first');
  tables.unshift({ id:uid('t'), name:v, created:Date.now(), opened:0 });
  saveT();
  setTimeout(() => { $('#roll').innerHTML = rollT(); $('#tname').value=''; }, 220);
  toast('Raised ' + v);
}
function openTable(id){
  const t = tables.find(x => x.id === id); if (!t) return;
  t.opened = Date.now(); saveT();
  /* One document. Opening a table is a state change, not a navigation —
     42-shell.js swaps which half of the app is on screen and boots the
     table the first time. The hall is left standing behind it. */
  if (window.Shell) return window.Shell.openTable(t.id);
  location.href = 'table.html?table=' + encodeURIComponent(t.id);   /* fallback */
}
function rowAct(act, row, btn){
  if (act === 'csheet') return openSheet(row.dataset.id);
  const id = row.dataset.id;
  const isC = act[0] === 'c';
  const list = isC ? chars : tables, put = isC ? saveC : saveT;
  const redraw = () => { const el = $(isC ? '#rollc' : '#roll');
                         if (el) el.innerHTML = isC ? rollC() : rollT(); };
  const i = list.findIndex(x => x.id === id); if (i < 0) return;
  if (act === 'rename' || act === 'crename') return rename(row, list[i], put, redraw);
  if (act === 'export' || act === 'cexport') return exportOne(list[i], isC);
  if (act === 'del' || act === 'cdel'){
    if (!btn.dataset.sure){ btn.dataset.sure='1'; btn.textContent='Sure?';
      return setTimeout(()=>{ if(btn.isConnected){ delete btn.dataset.sure;
        btn.textContent='Delete'; } }, 3000); }
    const gone = list[i].name; list.splice(i,1); put(); redraw(); toast('Deleted ' + gone);
  }
}
function rename(row, item, put, redraw){
  const cell = row.querySelector('.t b');
  cell.outerHTML = '<input value="' + esc(item.name) + '" maxlength="60">';
  const inp = row.querySelector('.t input'); inp.focus(); inp.select();
  const done = keep => { const v = inp.value.trim();
    if (keep && v){ item.name = v;
      if (item.who) item.who.name = v;              /* the sheet is the name's home */
      if (item.who && window.Sheet) item.note = window.Sheet.note(item);
      put(); } redraw(); };
  inp.addEventListener('keydown', ev => { if (ev.key==='Enter') done(true);
                                          if (ev.key==='Escape') done(false); });
  inp.addEventListener('blur', () => done(true));
}

/* ── files in and out ── */
function download(name, obj){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 900);
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
function exportOne(item, isC){
  download(slug(item.name) + (isC ? '.moncha.json' : '.montable.json'),
    isC ? { format:'monarchy.character', version:1, character:item }
        : { format:'monarchy.table', version:3, table:item });
  toast('Exported ' + item.name);
}
/* ── AN OLD .monarch CHARACTER ────────────────────────────────
   The file picker offers .monarch and the importer rejected every
   single one, because a v3/v4 character keeps its name at `id.name`
   and the check below wanted one at the top level. Every character
   made in the previous app was stranded, and the message blamed the
   file. This turns the old shape into the current one.

   Only the fields that map cleanly are carried across; anything the
   old format kept that the new one has no home for is dropped rather
   than guessed at, and the note says so on the record.            */
function fromMonarch(old){
  if (!old || typeof old !== 'object' || !old.id || typeof old.id !== 'object') return null;
  const S = window.Sheet; if (!S) return null;
  const rec = S.blank();
  const id = old.id || {};
  rec.name = id.name || '';
  rec.note = 'imported from .monarch';
  Object.assign(rec.who, {
    name: id.name || '', species: id.species || '', culture: id.culture || '',
    rank: id.rank || '', size: id.size || '', player: id.player || ''
  });
  const A = old.attrs || {};
  ['for','pro','dex','nim','wil','int','pre','cha'].forEach(k => {
    const v = parseInt(A[k], 10); if (Number.isFinite(v)) rec.attr[k] = v;
  });
  /* the old skill tree was score+name with `secondaries` and `tertiaries`;
     the current one is {n,v,kids} all the way down */
  const node = (x, kidsKey) => ({
    id: uid('s'), n: x.name || '', v: parseInt(x.score, 10) || 0,
    kids: (x[kidsKey] || []).map(y => node(y, 'tertiaries'))
  });
  ['body','mind','social'].forEach(c => {
    rec.skills[c] = ((old.skills || {})[c] || []).map(p => node(p, 'secondaries'));
  });
  rec.weapons = (old.weapons || []).map(w => ({
    id: uid('w'), name: w.name || '', dmg: w.dmg || '', type: w.type || '',
    quality: w.quality || '', range: w.range || '', note: w.notes || '' }));
  rec.armour.list = (old.armors || []).map(a => ({
    id: uid('a'), name: a.name || '', av: parseFloat(a.av) || 1,
    quality: a.quality || '', note: a.notes || '' }));
  const worn = (old.armors || []).findIndex(a => a.equipped);
  if (worn >= 0 && rec.armour.list[worn]) rec.armour.equipped = rec.armour.list[worn].id;
  rec.bgs = (old.backgrounds || []).map(b => ({
    id: uid('b'), name: b.name || '', inst: b.inst || '', text: b.notes || '' }));
  rec.knacks = (old.knacks || []).map(k => ({
    id: uid('k'), name: k.name || '', level: parseInt(k.level, 10) || 0 }));
  rec.sla = (old.abilSlots || []).map(sl => ({
    id: uid('sl'), name: sl.slotName || '', type: sl.type || '',
    passive: sl.passive || '', favor: parseInt(sl.favor, 10) || 0, text: '',
    entries: (sl.entries || []).map(e => ({
      name: e.name || '', cost: e.cost || '', cd: e.cd || '', effect: e.effect || '' })) }));
  rec.notes = [old.generalNotes, old.otherGear && ('Gear: ' + old.otherGear),
               old.passiveTraits && ('Traits: ' + old.passiveTraits)]
              .filter(Boolean).join('\n\n');
  return rec;
}

function readFile(f, isC){
  const r = new FileReader();
  r.onerror = () => toast('Could not read that file');
  r.onload = () => {
    let d; try { d = JSON.parse(r.result); } catch(e){ return toast('That file will not read'); }

    /* an old export announces itself; take it at its word */
    if (isC && d && d.format === 'monarchy-character-sheet') {
      const rec = fromMonarch(d.character);
      if (!rec) return toast('That .monarch file will not read');
      rec.id = uid('c'); chars.unshift(rec); saveC();
      const el0 = $('#rollc'); if (el0) el0.innerHTML = rollC();
      return toast('Brought in ' + (rec.name || 'a sheet') + ' from .monarch');
    }

    const one = isC ? (d.character || d) : (d.table || d);
    const many = isC ? d.characters : d.tables;
    const list = Array.isArray(many) ? many : (one && one.name ? [one] : null);
    if (!list) return toast(isC
      ? 'That is not a character sheet — a .monarch file needs its "format" line'
      : 'That is not a table');
    let n = 0;
    list.forEach(raw => {
      if (!raw || !raw.name) return;
      const rec = Object.assign({}, raw, { id:uid(isC?'c':'t') });
      if (isC){ rec.note = rec.note || 'imported sheet'; chars.unshift(rec); }
      else    { rec.opened = rec.opened || 0; tables.unshift(rec); }
      n++;
    });
    (isC ? saveC : saveT)();
    const el = $(isC ? '#rollc' : '#roll'); if (el) el.innerHTML = isC ? rollC() : rollT();
    toast(n ? 'Brought in ' + n + (n>1 ? (isC?' sheets':' tables') : (isC?' sheet':' table'))
            : 'Nothing in that file');
  };
  r.readAsText(f);
}
$('#pickT').addEventListener('change', function(){ if (this.files[0]) readFile(this.files[0], false);
  this.value=''; });
$('#pickC').addEventListener('change', function(){ if (this.files[0]) readFile(this.files[0], true);
  this.value=''; });
/* A LIKENESS IS BIGGER THAN A COAT OF ARMS AND TRAVELS FURTHER. The arms
   are drawn from a record of about two hundred bytes; this is a photograph,
   and it is written to the table's own node where ten other people read it.
   So it is shrunk on the way in rather than on the way out: 520px on the
   long edge is more than a standee across a virtual room can show, and it
   keeps a profile under the quarter-megabyte that a database node is
   comfortable with. */
function shrink(file, edge, done){
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, edge / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.width * k));
      c.height = Math.max(1, Math.round(im.height * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      /* PNG, not JPEG: a standee wants its transparent ground kept, and a
         cut-out on white is the difference between a person standing at the
         table and a photograph propped against it. */
      done(c.toDataURL('image/png'));
    };
    im.onerror = () => done(null);
    im.src = r.result;
  };
  r.onerror = () => done(null);
  r.readAsDataURL(file);
}
$('#pickB').addEventListener('change', function(){
  const f = this.files && this.files[0]; this.value = '';
  if (!f) return;
  if (f.size > 12e6) return toast('That picture is too big — under 12 MB');
  shrink(f, 520, url => {
    if (!url) return toast('Sorry — that picture could not be read');
    me.body = url; saveM(); render();
    /* the table you are sitting at should see you change */
    if (window.Session && window.Session.live) window.Session.refresh();
    toast('That is you, at the table');
  });
});
$('#pickP').addEventListener('change', function(){
  const f = this.files && this.files[0]; this.value = '';
  if (!f) return;
  if (f.size > 3e6) return toast('That picture is too big — under 3 MB');
  const r = new FileReader();
  r.onload = () => { me.pic = r.result; saveM(); paintArms(); render();
    toast('Your picture is up — it is what shows now'); };
  r.readAsDataURL(f);
});

/* ── the flag maker's own doings ── */
/* Heraldry.roll draws its tinctures WITHOUT REPLACEMENT, so a rolled coat
   never uses the same colour twice, and it alternates metal against colour so
   nothing sits on its own kind. */
function rollArms(){ draft = H.roll(); repaintMaker(); }
function takeArms(){
  me.arms = H.norm(draft);
  const n = ($('#aname') || {}).value;
  if (n != null) me.name = n.trim();
  saveM(); paintArms();
  /* the chrome wears your livery (42-shell.js), so new arms re-dye it */
  if (window.Shell && window.Shell.livery) window.Shell.livery();
  setTimeout(() => { hang(); toast(me.pic ? 'Kept — your picture is still what shows'
                                          : 'Arms taken'); }, 260);
}
/* THE CONSOLE HANDS YOU JAVASCRIPT, NOT JSON. `const firebaseConfig = {
   apiKey: "...", ... };` is what is on the screen and it is what people
   will paste, so it is what this accepts — refusing it over a missing pair
   of quotes would be the app being right and useless at the same time. */
function saveNetCfg(){
  const t = $('#netcfg'); if (!t) return;
  let raw = String(t.value || '').trim();
  if (!raw) return toast('Nothing pasted');
  raw = raw.replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, '').trim();
  let cfg = null;
  try { cfg = JSON.parse(raw); }
  catch (e) {
    /* the unquoted-key form, turned into JSON rather than eval'd: a config
       is a thing somebody pastes from the internet and it is not going to
       be run as code in this app */
    try {
      cfg = JSON.parse(raw
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, '$1'));
    } catch (e2) { cfg = null; }
  }
  if (!cfg || !cfg.apiKey || !cfg.databaseURL)
    return toast('That needs at least an apiKey and a databaseURL');
  window.Net.setCfg(cfg);
  netPasting = false; render();
  toast('Kept — restart the app to use it');
}

function sendWord(){
  if (joining) return;
  const w = window.Session.tidy(($('#word') || {}).value || '');
  if (!w) return toast('You need the word the table sits under');
  /* NO NAME IS NOT AN ERROR, IT IS A MISSING ANSWER. Sending somebody to
     another screen to fetch one and then find their way back is the app
     refusing to ask a question it is perfectly able to ask here. */
  if (!me.name) { const n = (($('#jname') || {}).value || '').trim();
    if (!n) { needName = true; render();
              setTimeout(() => { const i = $('#jname'); if (i) i.focus(); }, 30);
              return toast('What shall we call you?'); }
    me.name = n; saveM(); paintArms(); }
  joining = true; joinSaid = w; render();
  window.Session.join(w).then(word => {
    joining = false;
    toast('You are at ' + word);
    /* the table you have joined is the one you walk into — a guest table
       the GM's board is mirrored into (60-board-net.js), not the GM's own
       save id, which on this machine is nobody's table */
    window.Shell.openTable((window.BoardNet && window.BoardNet.tableId) || ('guest-' + word));
  }).catch(e => {
    joining = false; render();
    toast(e && e.message ? e.message : 'That did not work');
  });
}


$('#pickI').addEventListener('change', function(){
  const f = this.files && this.files[0]; this.value = '';
  if (!f || !cur) return;
  if (f.size > 20e6) return toast('That picture is too big — under 20 MB');
  window.Codex.crop(picSlot, f, (url, err) => {
    if (!url) return err ? toast('Sorry — ' + err) : 0;
    snap(); cur.who[picSlot] = url; touch(); saveC(); render();
    toast(picSlot === 'body' ? 'The figure is set' : 'The face is set');
  });
});
$('#saveb').addEventListener('click', saveNow);
$('#undob').addEventListener('click', () => { typing = 0; undo(); });
$('#redob').addEventListener('click', () => { typing = 0; redo(); });

/* ══ UP ═══════════════════════════════════════════════════════ */
window.Hall.init($('#hall'), BANNERS, def => take(def.id));
paintArms();
trackPlates();

window.Menu = { at:() => at, tables:() => tables, chars:() => chars, me:() => me,
  take, hang, toast, state:() => ({ at, tables:tables.length, chars:chars.length,
                             named:!!me.name, arms:me.arms }) };
})();
