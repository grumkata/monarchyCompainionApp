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
let me     = Object.assign({ name:'', pic:'', arms:{
  div:'plain', a:'sable', b:'argent', ord:'none', ordT:'or', chg:'', chgT:'or',
  chgN:1, bord:false, bordT:'or' }},
  S.get('me', {}));
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
function drawView(dy){ render(); paint();
  sbody.animate([{opacity:0,transform:'translateY('+dy+'px)'},{opacity:1,transform:'none'}],
    {duration:260, easing:'ease-out', fill:'both'}); }
function backOne(){
  if (!path.length) return hang();
  at = path.pop(); drawView(-10);
}
function take(id){
  const b = BANNERS.find(x => x.id === id);
  if (!b || b.dead) return toast('Not built yet');
  at = id; path = []; paint();
  screen.style.setProperty('--field', H.TINCT[b.arms.a]);
  $('#device').innerHTML = H.ordinary(b.arms.ord, b.arms.ordT, 200, 400)
                         + H.charge(b.arms.chg, b.arms.chgT, 200, 400, b.arms.chgN);
  render();
  window.Hall.lock(true);
  screen.classList.add('on');
  screen.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],
    {duration:540, easing:'cubic-bezier(.16,.84,.24,1)', fill:'forwards'});
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
  const a = screen.animate([{clipPath:'inset(0 0 0% 0)'},{clipPath:'inset(0 0 100% 0)'}],
    {duration:380, easing:'cubic-bezier(.5,0,.85,.4)', fill:'forwards'});
  a.onfinish = () => { screen.classList.remove('on'); screen.style.clipPath='inset(0 0 100% 0)'; };
  backBtn.style.display = 'none';
}
function render(){ sbody.innerHTML = (VIEW[at] || VIEW.set)(); if (AFTER[at]) AFTER[at](); }

/* ══ THE VIEWS ════════════════════════════════════════════════ */
const VIEW = {}, AFTER = {};

/* ── the tables ── */
VIEW.tables = () => `
  <h2>The Tables</h2>
  <div class="lede">Opening one takes you in alone — the hall goes quiet, and going
    live is something you do once you are inside.</div>
  <div class="strip"></div>
  <div class="f"><label>Name a new table</label>
    <input id="tname" maxlength="60" placeholder="what this one is called"></div>
  <div class="sealrow">
    <button class="seal" data-do="maketable"><span class="wax"></span><b>M</b></button>
    <span class="cap">Raise it<em>it is made when the wax lands</em></span>
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
  <div class="lede">Who you have been, and who you will be. Click one to take its
    record down off the shelf.</div>
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
  <div class="lede">Two ways in. One of them is open.</div>
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
  </div>
  <div class="lede" style="margin-top:30px;font-size:16px;opacity:.6">Either way the record
    is yours to keep and yours to edit — nothing is locked once it is written.</div>`;

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
VIEW.join = () => `
  <h2>Join a Game</h2>
  <div class="lede">You need the word the table is sitting under. Your arms go with you —
    that is what the table sees when you walk in.</div>
  <div class="strip"></div>
  <div class="f"><label>The table's word</label>
    <input id="word" maxlength="16" spellcheck="false"
      style="font-family:'Barlow Condensed',sans-serif;font-size:30px;letter-spacing:.3em;
             text-transform:uppercase"></div>
  <div class="f"><label>The name you answer to</label>
    <input id="jname" maxlength="40" value="${esc(me.name)}" placeholder="type your name"></div>
  <div class="sealrow">
    <button class="seal" data-do="join"><span class="wax"></span><b>M</b></button>
    <span class="cap">Send word<em>the sync layer is not built — the word is remembered</em></span>
  </div>`;

/* ── settings ── */
VIEW.set = () => `
  <h2>Settings</h2>
  <div class="lede">Your arms and your name are set from the hall itself — they are the
    first thing you see and the first thing anyone else does.</div>
  <div class="strip"></div>
  <div class="f"><label>The name you answer to</label>
    <input id="sname" maxlength="40" value="${esc(me.name)}" placeholder="type your name"></div>
  <div class="row2"><button class="lk" data-do="arms">Change your arms</button></div>
  <div class="empty" style="margin-top:34px">${tables.length} table${tables.length===1?'':'s'}
    and ${chars.length} character${chars.length===1?'':'s'} kept in this browser.</div>`;
AFTER.set = () => { const i = $('#sname');
  if (i) i.addEventListener('input', () => { me.name = i.value; saveM(); paintArms(); }); };

/* ══ THE FLAG MAKER ═══════════════════════════════════════════ */
let draft = null;

/* Everything you choose here is shown as the thing itself, drawn in the
   tinctures you have already picked — a word is not a picture, and "per
   saltire" means nothing until you see it. */
const SW = 46;
const swatch = inner => `<svg viewBox="0 0 ${SW} ${SW}">${inner}</svg>`;

function pickRow(title, key, opts, draw, extra){
  return `<div class="mk"><h3>${title}</h3><div class="swgrid">
    ${Object.keys(opts).map(k => `<button class="sw${draft[key]===k?' on':''}"
      data-arm="${key}" data-v="${k}" title="${opts[k]}">${draw(k)}</button>`).join('')}
  </div>${extra||''}</div>`;
}
/* a row of tinctures, ending in a colour of your own */
function tinctRow(title, key){
  const own = !H.named(draft[key]);
  return `<div class="mk"><h3>${title}</h3><div class="chips">
    ${Object.keys(H.TINCT).map(k => `<button class="chip t${draft[key]===k?' on':''}"
      data-arm="${key}" data-v="${k}" title="${H.TNAME[k]}">
      <span style="background:${H.TINCT[k]}"></span></button>`).join('')}
    <label class="chip t own${own?' on':''}" title="A colour of your own">
      <span style="background:${own?draft[key]:'#8a8a8a'}"></span>
      <input type="color" data-own="${key}" value="${own?draft[key]:'#8a8a8a'}">
    </label>
  </div></div>`;
}
function chargeRow(){
  const L = H.chargeList();
  const N = n => `<button class="num${(draft.chgN||1)===n?' on':''}"
    data-arm="chgN" data-v="${n}">${['','One','Two','Three'][n]}</button>`;
  return `<div class="mk"><h3>The charge</h3>
    <div class="swgrid tall">
      <button class="sw${!draft.chg?' on':''}" data-arm="chg" data-v="" title="None">
        ${swatch(`<path d="M13,13 L33,33 M33,13 L13,33" stroke="rgba(255,246,226,.38)"
          stroke-width="3" fill="none"/>`)}</button>
      ${Object.keys(L).map(k => `<button class="sw${draft.chg===k?' on':''}"
        data-arm="chg" data-v="${k}" title="${L[k].n}">
        ${swatch(H.chargeAt(k, draft.chgT, SW, SW, SW/2, SW/2, SW*0.86))}</button>`).join('')}
    </div>
    <div class="chips" style="margin-top:9px">${N(1)}${N(2)}${N(3)}</div></div>`;
}

VIEW.arms = () => `
  <h2>Your Arms</h2>
  <div class="lede">Blazon them yourself, or bring a picture. Whatever you choose rides
    into every table you join.</div>
  <div class="strip"></div>
  <div class="row2" style="margin-bottom:28px">
    <button class="lk" data-do="randomarms">Roll for it</button>
    <button class="lk" data-do="uploadarms">${me.pic ? 'Use a different picture' : 'Upload a picture instead'}</button>
    ${me.pic ? '<button class="lk bad" data-do="droppic">Drop the picture</button>' : ''}
  </div>
  <div class="maker">
    <div>
      ${pickRow('The field', 'div', H.DIVISIONS,
        k => swatch(H.field(k, draft.a, draft.b, SW, SW)))}
      ${tinctRow('First tincture', 'a')}
      ${tinctRow('Second tincture', 'b')}
      ${pickRow('The ordinary', 'ord', H.ORDINARIES,
        k => swatch(`<rect width="${SW}" height="${SW}" fill="rgba(0,0,0,.32)"/>`
                    + H.ordinary(k, draft.ordT, SW, SW)))}
      ${tinctRow("The ordinary's tincture", 'ordT')}
      ${chargeRow()}
      ${tinctRow("The charge's tincture", 'chgT')}
      <div class="mk"><h3>A bordure</h3><div class="chips">
        <button class="num${draft.bord?'':' on'}" data-arm="bord" data-v="">None</button>
        <button class="num${draft.bord?' on':''}" data-arm="bord" data-v="1">A bordure</button>
      </div></div>
      ${draft.bord ? tinctRow("The bordure's tincture", 'bordT') : ''}
      <div class="credit">Charges from game-icons.net, CC BY 3.0</div>
    </div>
    <div class="prev">
      <div class="card${me.pic?' pic':''}">
        <div id="prevArms">${me.pic
          ? `<img class="ownpic" src="${esc(me.pic)}" alt="the picture you uploaded">`
          : H.armsSVG(draft, {shape:'shield', w:200, h:240, edge:6})}</div>
        <div class="warn" id="warn">${me.pic
          ? 'Your own picture is in use. The blazon below is kept but not shown &#8212; drop the picture to go back to it.'
          : H.tinctureWarning(draft)}</div>
      </div>
      <div class="f" style="margin-top:22px"><label>The name you answer to</label>
        <input id="aname" maxlength="40" value="${esc(me.name)}" placeholder="type your name"></div>
      <div class="sealrow" style="margin-bottom:0">
        <button class="seal" data-do="takearms"><span class="wax"></span><b>M</b></button>
        <span class="cap">Take these arms</span>
      </div>
    </div>
  </div>`;

/* Every swatch on the sheet is drawn in the tinctures currently chosen, so
   changing one colour redraws all of them. That is the point, and it is cheap. */
function repaintMaker(){
  screen.style.setProperty('--field', H.col(draft.a));
  const nm = ($('#aname') || {}).value;
  const grid = document.querySelector('.swgrid.tall');
  const top = grid ? grid.scrollTop : 0;
  render();
  if (nm != null && $('#aname')) $('#aname').value = nm;
  const g2 = document.querySelector('.swgrid.tall');
  if (g2) g2.scrollTop = top;
}

/* ══ YOUR ARMS, IN THE HALL ═══════════════════════════════════ */
function paintArms(){
  const s = $('#myshield'), n = $('#myname');
  s.innerHTML = me.pic
    ? `<img src="${esc(me.pic)}" alt="" style="clip-path:polygon(0 0,100% 0,100% 58%,50% 100%,0 58%);
        object-fit:cover;height:110px">`
    : (me.arms && (me.arms.ord !== 'none' || me.arms.chg || me.arms.bord
       || me.arms.div !== 'plain' || me.arms.a !== 'sable'))
      ? H.armsSVG(me.arms, { shape:'shield', w:184, h:220, edge:7 })
      : `<div class="blank">no arms<br>yet</div>`;
  n.textContent = me.name || 'unnamed';
  n.classList.toggle('unset', !me.name);
}

/* ══ CLICKS ═══════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const plate = e.target.closest('.plate[data-i]');
  const banner = plate && BANNERS[+plate.dataset.i];
  if (banner) return take(banner.id);
  if (e.target.closest('#arms')){ draft = Object.assign({}, me.arms); at = 'arms';
    screen.style.setProperty('--field', H.TINCT[me.arms.a] || '#2a2118');
    if (me.arms.a === 'sable') screen.style.setProperty('--field', '#3a3126');
    $('#device').innerHTML = '';
    render(); window.Hall.lock(true); screen.classList.add('on');
    screen.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)'}],
      {duration:540, easing:'cubic-bezier(.16,.84,.24,1)', fill:'forwards'});
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

  const arm = e.target.closest('[data-arm]');
  if (arm){
    const k = arm.dataset.arm, v = arm.dataset.v;
    /* a count is a number and a bordure is a yes or a no; everything else is a name */
    draft[k] = k === 'chgN' ? +v : k === 'bord' ? !!v : v;
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
    case 'arms':       draft = Object.assign({}, me.arms); at='arms'; return render();
    case 'uploadarms': return $('#pickP').click();
    case 'droppic':    me.pic=''; saveM(); paintArms(); render(); return toast('Picture dropped');
    case 'randomarms': return rollArms();
    case 'takearms':   return takeArms();
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
  me.arms = Object.assign({}, draft);
  const n = ($('#aname') || {}).value;
  if (n != null) me.name = n.trim();
  saveM(); paintArms();
  setTimeout(() => { hang(); toast(me.pic ? 'Kept — your picture is still what shows'
                                          : 'Arms taken'); }, 260);
}
function sendWord(){
  const w = ($('#word').value || '').trim();
  const n = ($('#jname').value || '').trim();
  if (!w) return toast('You need the word the table sits under');
  if (n !== me.name){ me.name = n; saveM(); paintArms(); }
  toast('Sync is not built — the word is remembered');
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
  take, hang, state:() => ({ at, tables:tables.length, chars:chars.length,
                             named:!!me.name, arms:me.arms }) };
})();
