/* ══════════════════════════════════════════════════════════════
   82-battle-ui.js — WHAT YOU DO TO THE FIGHT.

   The piece is the interface. Point at a figure and type a number; carry it
   where it should stand (85-battle-drag.js does the carrying); pick it and its
   plate opens beside it, where its tokens are and what they do.

   There is nothing on the screen but the table. The turn is a plaque set into the
   board's frame, the board's settings are a brass cog on it, and the GM's monsters,
   kept fights and the party are figures and brass plates on the rail under the board
   (84-battle-rail.js). Touching one of those opens a card beside it; carrying a
   figure from the rail to a line is how it is brought in. (Only in the immersive
   field, where the table is out of sight, is there a small strip: the turn, the
   mana, and the way back.)

   Everything here goes through 80-battle.js, so every change is one undo step
   and reaches the other seats.

   Keys (the app already owns Esc, Ctrl+Z, Delete, B and M at the table; none of
   these stand on those, and Esc only belongs to the fight while there is
   something of the fight to let go of):
     0-9      type a number for the piece you are on
              (over a figure on the rail: how many of it to bring in)
     + / -    make it a heal / a hit       Enter  do it (Shift+Enter: ignore its tokens)
     Esc      let go of what is in hand, then of the number, the open card, the piece
     Space    next turn                    Tab    the next piece that has not acted
     T        add a token by typing its name ("bleed 3")
     D        it has acted     H  hide it from the players     Delete  take it off
     N        every name       F  frame the board (so does a double-click on it)
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const V = root.BattleView;
if (!V) return;
const B = () => root.Battle;
const T = () => root.TableModel;
const R = () => root.RULES;
const TG = () => root.TokenGlyph;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ruleOf = n => { const t = R() && R().TOKENS && R().TOKENS[n]; return (t && t.text) || 'a marker'; };
const kindOf = n => (TG() ? TG().kind(n) : 'n');
const ico = (n, px) => (TG() ? TG().html(n, px) : '');
const isGM = () => B().isGM();
const LEADS = () => (root.Tokens && root.Tokens.LEADS) || ['Unbreakable', 'Stable', 'Wavering', 'Crumbling', 'Broken'];
const KINDS = { unit: 'Unit', large: 'Large', form: 'Formation' };
const BONUS = ['Inspiration', 'Greater Inspiration', 'Weakened'];      /* the tokens that change what a piece DEALS */

const U = {
  pop: null,            /* the card open off a thing on the table: { kind: 'tpl' | 'fights' | 'set' } */
  editId: null,         /* the monster being made or changed */
  draft: null,          /* ...and not yet kept */
  by: null,             /* the piece a hit comes from, when its tokens matter */
  palOpen: false,       /* the token palette, folded until asked for */
  numFocus: false,      /* a player has clicked the number box on purpose */
  nbuf: '',             /* a number typed over a figure on the rail: how many to bring in */
  overMini: null,       /* the figure on the rail the pointer is over */
  armed: null,          /* a delete that wants a second click */
  renaming: null,       /* a kept fight whose name is being typed */
  built: false
};
V.ui = U;

let plate, tip, toastEl, wear, hud, pop, hudKey = '', plateHTML = '', popSig = '', toastT = 0;

/* ══ BUILDING THE PARTS ═══════════════════════════════════════ */
const mk = (cls, parent, tag) => { const d = doc.createElement(tag || 'div'); d.className = cls; (parent || V.overlay()).appendChild(d); return d; };
function build() {
  if (U.built) return; U.built = true;
  tip = mk('bt-tip', doc.body); tip.style.display = 'none';
  toastEl = mk('bt-toast');
  wear = mk('bt-wear'); wear.style.display = 'none';
  plate = mk('bt-plate'); plate.style.display = 'none';
  hud = mk('bt-hud'); hud.style.display = 'none';
  hud.innerHTML =
    '<button class="bt-turn" data-bt-do="turn"></button>' +
    '<label class="bt-mana"><span>Mana</span><input class="bt-mi" type="number" min="0" max="999" data-bt-mana="1"><b class="bt-mv">0</b></label>' +
    '<button class="bt-hb bt-fout" data-bt-do="fieldout">Back to the table</button>';
  pop = mk('bt-pp'); pop.style.display = 'none';
  const ov = V.overlay();
  ov.addEventListener('click', onClick);
  ov.addEventListener('contextmenu', onContext);
  ov.addEventListener('pointermove', onHoverTip);
  ov.addEventListener('input', onInput);
  ov.addEventListener('change', onChange);
  ov.addEventListener('keydown', ev => { if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) ev.stopPropagation(); });
  doc.addEventListener('pointermove', onDocMove);
  doc.addEventListener('pointerover', ev => { const m = ev.target.closest && ev.target.closest('.bt-mini'); if (m !== U.overMini) { U.overMini = m || null; U.nbuf = ''; } }, true);
  root.addEventListener('keydown', onKey, true);
  /* a click on the bare wood (not a pan, not a figure, not a card) lets go of the figure you had, and of the card */
  doc.addEventListener('pointerdown', ev => {
    U.down = { x: ev.clientX, y: ev.clientY, t: ev.target };
    /* A PRESS SAYS YOU HAVE READ IT. The hover kept showing over the thing
       you pressed — and the card that press opened came up under it, its
       own title hidden behind the line that had just told you what it was.
       It stays away from that one until the pointer leaves it. */
    if (tip) { tip.style.display = 'none'; tipQuiet = ev.target.closest && ev.target.closest('[data-tk],[data-tip]'); }
  }, true);
  doc.addEventListener('click', ev => {
    const d = U.down; U.down = null;
    if (!V.isUp() || (!V.sel && !U.pop) || !d) return;
    if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) return;
    const t = ev.target; if (!t || !t.closest) return;
    if (!t.closest('#vp') || t.closest('#bt-ov .bt-hit, #bt-ov .bt-plate, #bt-ov .bt-pp, #bt-ov .bt-hud, .chatdock')) return;
    if (root.Table3D && root.Table3D.peeking) return;
    closePop(); select(null);
  });
  /* a double-click on the board itself brings the camera to it (again, if it is already there) */
  doc.addEventListener('dblclick', ev => {
    if (!V.isUp() || (root.__field && root.__field.on())) return;
    const t = ev.target; if (!t || !t.closest || t.closest('#bt-ov, .chatdock, .tbx, .insp')) return;
    if (!t.closest('#vp')) return;
    const g = V.geo(), at = g && V.boardAt(ev.clientX, ev.clientY); if (!at) return;
    const G = B().G;
    if (Math.abs(at.x) > g.bw / 2 + G.FRAME || Math.abs(at.z) > g.bh / 2 + G.FRAME) return;
    frameBoard();
  });
  root.addEventListener('pointermove', ev => { U.px = ev.clientX; U.py = ev.clientY; U.pin = true; }, true);
  doc.addEventListener('pointerleave', () => { U.pin = false; });
  B().on((why, payload) => { if (why === 'lib') { popRefresh(); return; } if (why === 'pick') { if (V.sel !== payload && V.pcs.has(payload || '')) { V.sel = payload; refresh(); } else if (!payload && V.sel) { V.sel = null; refresh(); } } });
}
const opened = s => {
  build();
  V.sel = null; U.pop = null; U.editId = null; U.draft = null; U.numFocus = false; U.by = null;
  const A = V.A, gm = isGM();
  /* a player sits down with their own piece in hand */
  if (!gm && A) { const mine = B().flat(A).find(p => B().isMine(p.t)); if (mine) V.sel = mine.t.id; }
  lastCover = null; refresh();
};
const closed = () => {
  V.sel = null; U.pop = null; U.editId = null; U.draft = null;
  if (plate) plate.style.display = 'none'; if (hud) hud.style.display = 'none'; if (pop) pop.style.display = 'none';
};
V.ui.opened = opened; V.ui.closed = closed;
V.ui.reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ══ CHOOSING A PIECE ═════════════════════════════════════════ */
function select(id) {
  V.sel = id || null; V.buf = ''; V.mode = 'hit'; U.numFocus = false; U.by = null;
  if (id && U.pop) closePop();
  B().pick(id || null);
  refresh();
}
V.select = select;

U.hover = (id, on) => {
  if (on) V.hover = id;
  else if (V.hover === id) V.hover = null;
};
U.context = id => { if (V.sel !== id) select(id); };

/* ── pressing a piece: a click picks it, a drag (the GM's) carries it (85-battle-drag.js) ── */
U.press = (id, ev) => { if (V.drag) V.drag.press('piece', { id }, ev); };
U.pieceOf = id => pieceOf(id);
/* how many a drag from the rail brings: what was typed over the figure, or one */
U.takeCount = () => { const n = U.nbuf ? Math.max(1, Math.min(20, parseInt(U.nbuf, 10) || 1)) : 1; U.nbuf = ''; return n; };

/* ══ A WORD, WHEN SOMETHING WAS REFUSED ═══════════════════════ */
function say(msg) {
  if (!toastEl || !msg) return;
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2300);
}
V.toast = say;
/* a token chip or a labelled thing says what it does */
function tokenTip(n, c) {
  const e = B().effectsOf([{ n, c: c || 1 }])[0];
  return '<b>' + esc(n) + (c > 1 ? ' &times;' + c : '') + '</b>' + esc(ruleOf(n)) + (e && e.auto ? '<em>' + esc(e.auto) + '</em>' : '');
}
let tipQuiet = null;      /* the one just pressed: no hover on it until the pointer has left */
function onHoverTip(ev) {
  const c = ev.target.closest && ev.target.closest('[data-tk],[data-tip]');
  if (c !== tipQuiet) tipQuiet = null;
  if (!c || c === tipQuiet) { tip.style.display = 'none'; return; }
  if (c.dataset.tip != null) { const [h, ...r] = c.dataset.tip.split('|'); tip.innerHTML = '<b>' + esc(h) + '</b>' + esc(r.join('|')); }
  else tip.innerHTML = tokenTip(c.dataset.tk, +c.dataset.c || 0);
  tip.style.display = '';
  const w = tip.offsetWidth || 240, h = tip.offsetHeight || 40;
  const left = ev.clientX + 16 + w > root.innerWidth - 8 ? ev.clientX - w - 16 : ev.clientX + 16;
  tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, Math.min(root.innerHeight - h - 8, ev.clientY + 14)) + 'px';
}
function onDocMove(ev) { if (tip && tip.style.display !== 'none' && !(ev.target.closest && ev.target.closest('#bt-ov'))) tip.style.display = 'none'; }

/* ══ THE PLATE ════════════════════════════════════════════════ */
function pieceOf(id) { const A = V.A; if (!A || !id) return null; return B().flat(A).find(p => p.t.id === id) || null; }
const nameOfLine = (A, key) => { const l = A.g.lines.find(x => x.key === key); return l ? (l.side === 'en' ? 'Enemy ' : 'Ally ') + l.label : ''; };
function lookOf(p, px) {
  const L = root.TokenLook; if (!L) return '';
  return L.standee({ name: p.e.name, side: p.e.side, entKind: p.e.kind, src: p.t.src || p.e.pic || '', art: p.t.art || p.e.art || '', fig: p.t.fig || p.e.fig || '' }, px || 54);
}
function palette(attr) {
  const names = Object.keys((R() && R().TOKENS) || {});
  const grp = k => names.filter(n => kindOf(n) === k).map(n => '<span class="bt-pi" ' + attr + '="' + esc(n) + '" data-tk="' + esc(n) + '" data-c="1">' + ico(n, 26) + '</span>').join('');
  return '<div class="bt-pal">' + grp('g') + '<span class="bt-gap"></span>' + grp('n') + '<span class="bt-gap"></span>' + grp('b') + '</div>';
}
function tokenRows(p, can) {
  const eff = B().effectsOf(p.e.cond || []);
  const rows = eff.map(c => '<div class="bt-ti" data-tk="' + esc(c.n) + '" data-c="' + c.c + '"><span class="bt-tg">' + ico(c.n, 26) + '</span>' +
    '<span class="bt-tt"><b>' + esc(c.n) + '</b><i>' + esc(c.auto || c.text) + '</i></span>' +
    (can ? '<span class="bt-stp"><u data-dec="' + esc(c.n) + '">&minus;</u><b>' + c.c + '</b><u data-inc="' + esc(c.n) + '">+</u></span>' : '<span class="bt-stp"><b>' + c.c + '</b></span>') + '</div>').join('');
  return rows;
}
/* who a hit might come from, when that matters: a piece with Inspiration or Weakened on it */
function strikers(p) {
  const A = V.A; if (!A) return [];
  return B().flat(A).filter(q => q.t.id !== p.t.id && (q.e.cond || []).some(c => BONUS.indexOf(c.n) >= 0 && c.c > 0));
}
function plateBody(p) {
  const A = V.A, e = p.e, t = p.t, gm = isGM(), mine = B().isMine(t);
  const can = mine, form = e.kind === 'form';
  const hp = form ? (e.alive | 0) : (e.hp | 0), max = form ? (e.total | 0) : (e.max | 0);
  const fr = max ? hp / max : 0, col = fr > .6 ? '#6fbf4a' : fr > .3 ? '#d9a232' : '#c8452c';
  const amt = parseInt(V.buf, 10);
  let pvl = '';
  if (can && !isNaN(amt)) {
    if (V.mode === 'heal') pvl = form ? 'Rally ' + amt + ' &rarr; <em>' + Math.min(max, hp + amt) + '</em> standing' : 'Heal ' + amt + ' &rarr; health ' + hp + ' &rarr; <em>' + Math.min(max, hp + amt) + '</em>';
    else {
      const by = U.by && pieceOf(U.by);
      const pr = B().preview(Object.assign({ id: t.id }, e), amt, { attacker: by ? Object.assign({ id: by.t.id }, by.e) : null });
      pvl = form ? amt + (pr.why.length ? ' &rarr; ' + pr.why.join(', ') + ' &rarr; <em>' + pr.eff + '</em>' : '') + ' &middot; ' + (pr.atRisk ? pr.atRisk + ' at risk' : 'none at risk')
        : amt + (pr.why.length ? ' &rarr; ' + pr.why.join(', ') + ' &rarr; <em>' + pr.eff + '</em>' : '') +
          (pr.ward ? ' &middot; Ward takes ' + pr.ward : '') + ' &nbsp;&middot;&nbsp; health ' + hp + ' &rarr; <em>' + pr.hp + '</em>';
    }
  }
  const stat = (k, label) => {
    const v = e[k];
    if (can) return '<label class="bt-st"><span>' + label + '</span><input class="bt-num" type="number" min="0" data-vital="' + k + '" value="' + (v == null ? '' : v | 0) + '" placeholder="&mdash;"></label>';
    return '<span class="bt-st"><span>' + label + '</span><b>' + (v == null ? '&mdash;' : (v | 0)) + '</b></span>';
  };
  const lead = e.lead || 'Stable', rank = { Unbreakable: 5, Stable: 4, Wavering: 3, Crumbling: 2, Broken: 1 }[lead] || 4;
  let stats = '';
  if (form) {
    stats = '<div class="bt-stats">' +
      (gm ? '<label class="bt-st"><span>Standing</span><input class="bt-num" type="number" min="0" max="' + max + '" data-vital="alive" value="' + hp + '"></label>' : '') +
      ['hpea:HP each', 'dmg:Damage', 'skl:Hit', 'def:Defence'].map(s => { const [k, l] = s.split(':'); return '<span class="bt-st"><span>' + l + '</span><b>' + esc(e[k] == null ? '—' : e[k]) + '</b></span>'; }).join('') + '</div>' +
      '<div class="bt-stats bt-mrow">' +
      (gm ? '<label class="bt-st"><span>Morale</span><input class="bt-num bt-m' + rank + '" type="number" min="0" max="100" data-bt-morale="1" value="' + (e.leadership == null ? '' : e.leadership | 0) + '"></label>' +
            '<label class="bt-st"><span>Holding</span><select class="bt-sel bt-m' + rank + '" data-bt-lead="1">' + LEADS().map(l => '<option' + (l === lead ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>' +
            '<span class="bt-b" data-bt-do="testmorale" title="Roll a d100 under its morale">Test</span>'
          : '<span class="bt-st"><span>Morale</span><b>' + (e.leadership == null ? '—' : e.leadership | 0) + '</b></span><span class="bt-st"><span>Holding</span><b>' + esc(lead) + '</b></span>') + '</div>';
  } else {
    stats = '<div class="bt-stats">' + stat('sta', 'Stamina') + stat('str', 'Stress') + stat('ward', 'Ward') + stat('av', 'Armour') + stat('move', 'Move') + '</div>';
  }
  const hpBlock = '<div class="bt-hpn">' + hp + '<small> / ' + max + '</small></div><div class="bt-hbar"><i style="width:' + (fr * 100) + '%;background:' + col + '"></i></div>';
  const src = can ? strikers(p) : [];
  const who = src.length ? '<div class="bt-by"><label>Struck by</label><select class="bt-sel" data-bt-by="1"><option value="">nobody in particular</option>' +
    src.map(q => '<option value="' + q.t.id + '"' + (U.by === q.t.id ? ' selected' : '') + '>' + esc(q.t.name || q.e.name) + '</option>').join('') + '</select></div>' : '';
  const palOpen = can && U.palOpen;
  const a = B().actsOf(e), spent = a.quick && a.full;
  /* the turn: what it has used, each of the two actions on its own, and both at once */
  const turnRow = '<div class="bt-turnrow">' +
    '<span class="bt-ab' + (a.full ? ' used' : '') + (can ? '' : ' ro') + '"' + (can ? ' data-bt-do="actfull"' : '') + ' title="Full action"><i class="f"></i>Full</span>' +
    '<span class="bt-ab' + (a.quick ? ' used' : '') + (can ? '' : ' ro') + '"' + (can ? ' data-bt-do="actquick"' : '') + ' title="Quick action"><i class="q"></i>Quick</span>' +
    (can ? '<span class="bt-b' + (spent ? ' bt-or' : '') + '" data-bt-do="done">' + (spent ? '&#10003; Done' : 'Done') + '</span>' : (spent ? '<span class="bt-k">Has acted</span>' : '')) + '</div>';
  return '<div class="bt-hd"><div class="bt-coin">' + lookOf(p) + '</div><div class="bt-id"><div class="bt-n">' + esc(t.name || e.name) + '</div>' +
      '<div class="bt-s"><em class="bt-k bt-k-' + e.kind + '">' + KINDS[e.kind] + '</em>' + (e.pc ? 'Player' + (e.side === 'en' ? ' (enemy)' : '') : e.side === 'en' ? 'Enemy' : 'Ally') + ' &middot; ' + esc(nameOfLine(A, p.line)) + (e.hidden ? ' &middot; hidden' : '') + '</div>' +
      '<div class="bt-hprow">' + hpBlock + '</div></div></div>' +
    (can ? '<div class="bt-act"><span class="bt-f' + (V.buf || U.numFocus ? ' on' : '') + '" data-bt-do="numbox">' + (V.buf || '&nbsp;') + '</span>' +
      '<span class="bt-b bt-or" data-bt-do="hit">' + (form ? 'Lose' : 'Hit') + '</span><span class="bt-b" data-bt-do="heal">' + (form ? 'Rally' : 'Heal') + '</span>' +
      (gm && form ? '<span class="bt-b" data-bt-do="fattack">Attack</span>' : '') + '</div>' +
      (pvl ? '<div class="bt-pvl">' + pvl + '</div>' : '') + who : '') +
    turnRow +
    stats +
    '<div class="bt-tk">' + tokenRows(p, can) + '</div>' +
    (can ? '<div class="bt-tadd"><input class="bt-txt bt-tq" data-tq="1" placeholder="Add a token" autocomplete="off" spellcheck="false"><span class="bt-b" data-bt-do="pal" title="All the tokens">' + (palOpen ? '&#9652;' : '&#9662;') + '</span></div><div class="bt-tqres"></div>' : '') +
    (palOpen ? palette('data-add') : '') +
    ((gm || (t.char && root.Papers && mine)) ? '<div class="bt-row">' +
      (gm ? '<span class="bt-b" data-bt-do="hide">' + (e.hidden ? 'Show' : 'Hide') + '</span><span class="bt-b" data-bt-do="side" title="Whose side it is on. It stays where it stands.">' + (e.side === 'en' ? 'Make ally' : 'Make enemy') + '</span><span class="bt-b" data-bt-do="keepnpc" title="Keep this one in the library">Keep</span>' : '') +
      (t.char && root.Papers && mine ? '<span class="bt-b" data-bt-do="record">Record</span>' : '') +
      (gm ? '<span class="bt-b bt-bad" data-bt-do="rm">Remove</span>' : '') + '</div>' : '<div style="height:8px"></div>');
}

let lastCover = null;
function refresh() {
  if (!plate) return;
  refreshHud(); popRefresh();
  const p = pieceOf(V.sel);
  if (!p) { plate.style.display = 'none'; plate.dataset.pid = ''; return; }
  const html = plateBody(p);
  plate.style.display = '';
  /* never rebuild under somebody's fingers: a box being typed in keeps its caret, and the plate catches up when they leave it */
  const ae = doc.activeElement;
  if (ae && plate.contains(ae) && /^(INPUT|SELECT)$/.test(ae.tagName) && plate.dataset.pid === p.t.id) { plate.dataset.stale = '1'; return; }
  plate.dataset.stale = '';
  if (html === plateHTML && plate.dataset.pid === p.t.id) return;
  const keep = plate.dataset.pid === p.t.id ? plate.scrollTop : 0;
  plate.dataset.pid = p.t.id; plateHTML = html;
  plate.innerHTML = html;
  if (keep) plate.scrollTop = keep;
}
V.refreshCard = refresh;

/* ══ THE STRIP IN THE FIELD ═══════════════════════════════════
   At the table there is none: the turn is the plaque on the board, the mana a dish.
   Standing in the field the table is out of sight, so these three come with you. */
function refreshHud() {
  if (!hud) return;
  const A = V.A; if (!A) return;
  const gm = isGM(), f = A.fight, mana = A.options.mana;
  hud.classList.toggle('bt-gmhud', gm);
  const turn = hud.querySelector('.bt-turn');
  const key = [gm, f.cover, f.round].join('|');
  if (key !== hudKey) {
    hudKey = key;
    turn.innerHTML = f.cover ? '<span>' + (gm ? 'Begin' : 'Not begun') + '</span>' : '<span>Turn</span><b>' + f.round + '</b>';
    if (gm) turn.insertAdjacentHTML('beforeend', '<i>&#9656;</i>');
    turn.disabled = !gm;
    turn.title = gm ? (f.cover ? 'Lift the cloth (Space)' : 'Next turn (Space)') : '';
  }
  const mi = hud.querySelector('.bt-mi');
  if (doc.activeElement !== mi && mi.value !== String(mana)) mi.value = mana;
  hud.querySelector('.bt-mv').textContent = mana;
}

/* ══ THE CARDS THAT OPEN OFF THE THINGS ON THE TABLE ═══════════
   Touch a monster on the rail, the brass banner or the cog and a card opens beside it:
   the monster to change, the fights that are kept, the board's settings. One at a time;
   it is the GM's; it goes when anything else is picked, on Esc, or on a click on the wood. */
function closePop() {
  if (!U.pop && !U.editId) return;
  U.pop = null; U.editId = null; U.draft = null; U.armed = null; U.renaming = null; U.epal = false; popSig = '';
  if (pop) pop.style.display = 'none';
}
function openPop(kind, id) {
  if (!isGM() || !V.isUp() || V.inField || !pop) return;
  const same = U.pop && U.pop.kind === kind && (!(kind === 'tpl' || kind === 'char') || U.editId === id);
  if (same) { closePop(); return; }
  closePop();
  U.pop = { kind };
  if (kind === 'char') U.editId = id;
  if (kind === 'tpl') {
    if (id) { U.editId = id; U.draft = null; }
    else { const tpl = B().lib.blank(); U.draft = tpl; U.editId = tpl.id; }
  }
  if (V.sel) { V.sel = null; V.buf = ''; B().pick(null); }
  refresh();
  if (kind === 'tpl' && !id) setTimeout(() => { const i = pop.querySelector('[data-tf="name"]'); if (i) { i.focus(); i.select(); } }, 0);
}
function settingsHTML() {
  const s = V.scene(), g = V.geo(), A = V.A; if (!s || !g || !A) return '';
  return '<label><span>Units per line</span><input class="bt-num" type="number" min="' + B().WIDTH_MIN + '" max="' + B().WIDTH_MAX + '" value="' + g.width + '" data-bt-w="1"></label>' +
    '<label class="bt-chk"><input type="checkbox" data-bt-cover="1"' + (A.fight.cover ? ' checked' : '') + '><span>Keep the board covered until I begin</span></label>' +
    '<div class="bt-row"><span class="bt-b' + (U.armed === 'clear' ? ' bt-bad' : '') + '" data-bt-do="clear">' + (U.armed === 'clear' ? 'Click again to clear' : 'Clear the board') + '</span></div>';
}
/* a character on the bench: who they are and what they come in with, all of which is their record's */
function charHTML() {
  const C = root.Characters, c = C && C.get(U.editId); if (!c) return '';
  const nm = C.nameOf(c), n = C.combatant(c), L = root.TokenLook;
  const look = L ? L.standee({ name: nm, side: 'al', entKind: 'unit', src: n.pic, art: n.picArt }, 74) : '';
  const num = (l, v) => '<span class="bt-st"><span>' + l + '</span><b>' + (v == null ? '&mdash;' : (v | 0)) + '</b></span>';
  return '<div class="bt-prev"><span class="bt-eg">' + look + '</span><span class="bt-en"><b>' + esc(nm) + '</b><i><em class="bt-k bt-k-unit">Unit</em><em class="bt-sd bt-sd-al">Player</em></i></span></div>' +
    '<div class="bt-stats">' + num('Health', n.max) + num('Stamina', n.sta) + num('Stress', n.str) + num('Armour', n.av) + num('Move', n.move) + '</div>' +
    '<div class="bt-none">Their numbers are their record\'s: change them there. Carry them to a line, any line; once there, their plate changes what happens in the fight.</div>' +
    '<div class="bt-row">' + (root.Papers ? '<span class="bt-b bt-or" data-bt-do="crecord">Open their record</span>' : '') + '<span class="bt-b" data-bt-do="edone">Done</span></div>';
}
function popRefresh(force) {
  if (!pop) return;
  const P = U.pop;
  if (!P || !isGM() || !V.isUp() || V.inField) { pop.style.display = 'none'; return; }
  pop.style.display = '';
  const ae = doc.activeElement;
  if (!force && ae && pop.contains(ae) && /^(INPUT|SELECT)$/.test(ae.tagName)) return;
  if (P.kind === 'tpl' && !editTpl()) { closePop(); return; }
  if (P.kind === 'char' && !(root.Characters && root.Characters.get(U.editId))) { closePop(); return; }
  const s = V.scene(), g = V.geo(), A = V.A;
  const sig = [P.kind, U.editId, U.armed, U.renaming, U.draft ? 'd' : '',
    P.kind === 'fights' && root.Encounters ? root.Encounters.list().map(e => e.id + e.changed + e.name).join(',') : '',
    P.kind === 'set' && g && A && s ? [g.width, A.fight.cover].join(',') : ''].join('|');
  if (!force && sig === popSig) return; popSig = sig;
  const keep = pop.scrollTop;
  pop.innerHTML = P.kind === 'tpl' ? '<div class="bt-pph">' + (U.draft ? 'A new monster' : 'This monster') + '</div>' + editorHTML()
    : P.kind === 'char' ? '<div class="bt-pph">A player\'s character</div>' + charHTML()
    : P.kind === 'fights' ? '<div class="bt-pph">Kept fights</div>' + fightList()
    : '<div class="bt-pph">The board</div>' + settingsHTML();
  pop.scrollTop = keep;
}
/* beside the thing it came off: above it when that is low on the screen, below it when high */
function popPlace(vr) {
  if (!pop || pop.style.display === 'none' || !U.pop) return;
  const P = U.pop, R = V.rail;
  let el = null;
  if (R && R.built) el = P.kind === 'set' ? R.cogHit : P.kind === 'fights' ? R.flag.h : ((R.hitOf && R.hitOf(P.kind === 'char' ? { id: U.editId, char: true } : { id: U.editId, lib: true })) || R.plus.h);
  let r = el && el.style.display !== 'none' ? el.getBoundingClientRect() : null;
  if (!r || !r.width) r = P.last || { left: vr.left + vr.width / 2 - 20, right: vr.left + vr.width / 2 + 20, top: vr.bottom - 70, bottom: vr.bottom - 30 };
  P.last = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  const pw = pop.offsetWidth, ph = pop.offsetHeight, cx = (r.left + r.right) / 2;
  const x = clamp(cx - pw / 2, vr.left + 8, vr.right - pw - 8);
  const below = (r.top + r.bottom) / 2 < vr.top + vr.height * .4;
  const y = clamp(below ? r.bottom + 10 : r.top - ph - 10, vr.top + 8, vr.bottom - ph - 8);
  pop.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
}

/* ══ WHAT CLICKS DO ═══════════════════════════════════════════ */
function onClick(ev) {
  { const b = ev.target.closest && ev.target.closest('button'); if (b) setTimeout(() => b.blur(), 0); }     /* so Space is the turn, not another press of this */
  const t = ev.target.closest && ev.target.closest('[data-tqadd],[data-bt-do],[data-add],[data-inc],[data-dec],[data-pic],[data-tf-set],[data-eadd],[data-einc],[data-edec],[data-bt-fight]');
  if (!t) return;
  const d = t.dataset;
  if (d.tqadd) { tqAdd(d.tqadd, +d.n || 1); return; }
  if (d.tfSet || d.pic || d.eadd || d.einc || d.edec) { editing(d); return; }
  if (d.btFight) { fightAction(d.btFight, d.btAct); return; }
  const act = d.btDo;
  if (act === 'turn') { turn(); return; }
  if (act === 'fieldout') { if (root.Table3D && root.Table3D.leaveField) root.Table3D.leaveField(true); else if (root.__field) root.__field.set(false); return; }
  if (act === 'clear') {
    if (U.armed !== 'clear') { U.armed = 'clear'; setTimeout(() => { if (U.armed === 'clear') { U.armed = null; popRefresh(true); } }, 3000); popRefresh(true); return; }
    U.armed = null; const r = B().clear(); if (!r.ok) say(r.why); closePop(); select(null); return;
  }
  if (act === 'epal') { U.epal = !U.epal; popRefresh(true); return; }
  if (act === 'crecord') { const c = U.editId; closePop(); refresh(); if (c && root.Papers) { root.Papers.lay(c); root.Papers.read(); } return; }
  if (act === 'edone') { closePop(); refresh(); return; }
  if (act === 'edel') { B().lib.remove(U.editId); closePop(); refresh(); return; }
  if (act === 'epic') {
    const t0 = editTpl(); if (!t0 || !root.Pictures || !root.Library) return;
    root.Pictures.ask(pic => {
      if (!pic) return;
      const kept = root.Library.art.add({ name: pic.name, src: pic.src, w: pic.w, h: pic.h });
      const t = editTpl(); if (!t || !kept) return;
      t.art = kept.id; t.fig = ''; t.src = ''; keepTpl(t); popRefresh(true);
    });
    return;
  }
  if (act === 'keepfight') {
    const inp = pop.querySelector('[data-bt-fname]'), name = inp ? inp.value.trim() : '';
    const got = root.Encounters && root.Encounters.fromScene(V.scene(), name || null);
    if (got) { say('"' + got.name + '" is kept'); popRefresh(true); } else say('Nothing to keep');
    return;
  }
  const p = pieceOf(V.sel); if (!p) return;
  const id = p.t.id;
  if (d.inc || d.dec) { const r = B().token(id, d.inc || d.dec, d.inc ? 1 : -1); if (!r.ok) say(r.why); return; }
  if (d.add) { const r = B().token(id, d.add, 1); if (!r.ok) say(r.why); else flashChip(id, d.add); return; }
  if (act === 'numbox') { U.numFocus = true; refresh(); return; }
  if (act === 'hit' || act === 'heal') { const n = parseInt(V.buf, 10); V.mode = act; if (!isNaN(n)) commit(false); else refresh(); return; }
  if (act === 'pal') { U.palOpen = !U.palOpen; refresh(); return; }
  if (act === 'done') { B().setDone(id); return; }
  if (act === 'side') { const r = B().setSide(id, p.e.side === 'en' ? 'al' : 'en'); if (!r.ok) say(r.why); return; }
  if (act === 'hide') { B().setHidden(id); return; }
  if (act === 'rm') { const r = B().remove(id); if (r.ok) select(null); return; }
  if (act === 'actfull' || act === 'actquick') { const r = B().setAct(id, act === 'actfull' ? 'full' : 'quick'); if (!r.ok) say(r.why); return; }
  if (act === 'testmorale') {
    const r = B().testMorale(id); if (!r.ok) { say(r.why); return; }
    V.pop(id, r.pass ? 'Holds' : (r.routed ? 'Routs' : r.state), r.pass ? '#8ce07a' : '#ff9a6a', 60);
    say(r.name + ': rolled ' + r.roll + ' against ' + r.vs + (r.pass ? ' — holds' : ' — ' + (r.routed ? 'routs' : r.state.toLowerCase())) + (r.notes && r.notes.length ? ' (' + r.notes.join(', ') + ')' : ''));
    return;
  }
  if (act === 'keepnpc') { const k = B().lib.fromPiece(id); if (k) { say(k.name + ' is kept in the library'); popRefresh(true); } return; }
  if (act === 'record') { const th = T().get(id); if (th && th.char && root.Papers) { root.Papers.lay(th.char); root.Papers.read(); } return; }
  if (act === 'fattack') {
    const r = B().formationAttack(id);
    if (!r.ok) { say(r.why); return; }
    say(r.name + ': ' + r.text);
  }
}
function flashChip(id, name) {
  const pv = V.pieceOf(id); if (!pv) return;
  setTimeout(() => { const c = pv.dom.ch.querySelector('[data-tk="' + name + '"]'); if (c) c.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.4)', offset: .6 }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' }); }, 40);
}
function onContext(ev) {
  const chip = ev.target.closest && ev.target.closest('.bt-ch [data-tk]');
  if (chip) {
    ev.preventDefault(); ev.stopPropagation();
    const id = chip.closest('.bt-ch').dataset.pid, r = B().token(id, chip.dataset.tk, -1);
    if (!r.ok) say(r.why);
  }
}
/* ── the turn ── */
function turn() {
  const r = B().nextTurn();
  if (!r.ok) { say(r.why); return; }
  if (r.began) return;
  (r.ticks || []).forEach((tk, i) => { const n = tk.form ? tk.dead : tk.damage; if (n) V.pop(tk.id, '−' + n, '#ff9a55', 120 + i * 150); });
  (r.lost || []).forEach((l, i) => V.pop(l.id, 'Stunned', '#ffd24a', 200 + i * 150));
}
/* ── a token by name: "ble" shows Bleed, "bleed 3" adds three ── */
function tqFill(el) {
  const res = plate.querySelector('.bt-tqres'); if (!res) return;
  const m = /^(.*?)(?:\s+(\d+))?$/.exec(el.value.trim().toLowerCase());
  const q = m[1].trim(), n = m[2] ? Math.max(1, Math.min(9, +m[2])) : 1;
  el.dataset.n = n;
  if (!q) { res.innerHTML = ''; return; }
  const names = Object.keys((R() && R().TOKENS) || {}).filter(k => k.toLowerCase().indexOf(q) >= 0)
    .sort((a, b) => (a.toLowerCase().indexOf(q) === 0 ? 0 : 1) - (b.toLowerCase().indexOf(q) === 0 ? 0 : 1)).slice(0, 6);
  res.innerHTML = names.map((k, i) => '<div class="bt-tqi' + (i ? '' : ' on') + '" data-tqadd="' + esc(k) + '" data-n="' + n + '">' + ico(k, 22) + '<b>' + esc(k) + (n > 1 ? ' &times;' + n : '') + '</b><span>' + esc(ruleOf(k)) + '</span></div>').join('')
    || '<div class="bt-none">No token by that name.</div>';
}
function tqAdd(name, n) {
  const id = V.sel; if (!id) return;
  const r = B().token(id, name, n || 1);
  if (!r.ok) say(r.why); else flashChip(id, name);
  const a = doc.activeElement; if (a && a.blur) a.blur();
  refresh();
}
function onInput(ev) {
  const el = ev.target;
  if (el.dataset.tq != null) { tqFill(el); return; }
  if (el.dataset.vital) { const p = pieceOf(V.sel); if (p) B().setVital(p.t.id, el.dataset.vital, el.value); return; }
  if (el.dataset.tf) {
    const t = editTpl(); if (!t) return;
    const k = el.dataset.tf, num = ['hp', 'sta', 'av', 'move', 'bodies', 'hpea', 'dmg', 'leadership'];
    t[k] = num.indexOf(k) >= 0 ? (el.value === '' ? undefined : parseInt(el.value, 10)) : el.value;
    keepTpl(t); libPreview();
  }
}
function onChange(ev) {
  const el = ev.target, d = el.dataset;
  if (d.btMana) { const r = B().setMana(el.value); if (!r.ok) say(r.why); return; }
  if (d.btLead) { const p = pieceOf(V.sel); if (p) B().setLead(p.t.id, el.value); return; }
  if (d.btBy) { U.by = el.value || null; refresh(); return; }
  if (d.btW) { B().setWidth(el.value); return; }
  if (d.btMorale) { const q = pieceOf(V.sel); if (q) B().setMorale(q.t.id, el.value); return; }
  if (d.btCover) { B().setCover(el.checked); return; }
  if (d.tf === 'lead') { const t = editTpl(); if (t) { t.lead = el.value; keepTpl(t); libPreview(); } return; }
  if (d.btFname != null) { return; }
  if (d.btRename) { if (root.Encounters) root.Encounters.rename(d.btRename, el.value); U.renaming = null; popRefresh(true); }
}

/* ══ THE KEYS ═════════════════════════════════════════════════ */
function typing() {
  const a = doc.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
}
function target() { const id = V.sel || V.hover; return pieceOf(id); }
function commit(ignore) {
  const p = V.sel ? pieceOf(V.sel) : pieceOf(V.hover);
  const n = parseInt(V.buf, 10); if (!p || isNaN(n)) return;
  const mode = V.mode, from = U.by; V.buf = ''; V.mode = 'hit'; U.numFocus = false; U.by = null;
  const r = mode === 'heal' ? B().heal(p.t.id, n) : B().hit(p.t.id, n, { ignore, from });
  if (!r.ok) { say(r.why); refresh(); return; }
  refresh();
}
function onKey(ev) {
  if (!V.isUp()) return;
  if (typing()) {
    const a = doc.activeElement;
    if ((ev.key === 'Enter' || ev.key === 'Escape') && a.closest && a.closest('#bt-ov')) {
      if (a.dataset && a.dataset.tq != null) {
        const first = ev.key === 'Enter' && plate.querySelector('.bt-tqi.on');
        ev.preventDefault(); ev.stopPropagation();
        if (first) tqAdd(first.dataset.tqadd, +first.dataset.n || 1); else { a.value = ''; a.blur(); refresh(); }
        return;
      }
      if (a.dataset && a.dataset.btFname != null && ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); const b = pop.querySelector('[data-bt-do="keepfight"]'); if (b) b.click(); return; }
      if (a.classList && a.classList.contains('bt-manain')) a.dataset.cancel = ev.key === 'Escape' ? '1' : '';
      a.blur(); if (ev.key === 'Escape') { if (a.closest('.bt-pp')) { closePop(); refresh(); } ev.stopPropagation(); ev.preventDefault(); }
    }
    return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const gm = isGM(), p = target(), canEdit = !!p && B().isMine(p.t) && (gm || U.numFocus);
  const stop = () => { ev.preventDefault(); ev.stopPropagation(); };
  if (/^[0-9]$/.test(ev.key) && gm && U.overMini) { U.nbuf = (U.nbuf + ev.key).slice(0, 2); stop(); return; }
  if (ev.key === 'Backspace' && U.nbuf) { U.nbuf = U.nbuf.slice(0, -1); stop(); return; }
  if (/^[0-9]$/.test(ev.key) && canEdit) { V.buf = (V.buf + ev.key).slice(0, 3); stop(); refresh(); return; }
  if ((ev.key === '+' || ev.key === '=') && canEdit) { V.mode = 'heal'; stop(); refresh(); return; }
  if ((ev.key === '-' || ev.key === '_') && canEdit) { V.mode = 'hit'; stop(); refresh(); return; }
  if (ev.key === 'Backspace' && V.buf) { V.buf = V.buf.slice(0, -1); stop(); refresh(); return; }
  if (ev.key === 'Enter' && V.buf && canEdit) { stop(); commit(ev.shiftKey); return; }
  if (ev.key === 'Escape') {
    if (V.buf || U.numFocus) { V.buf = ''; V.mode = 'hit'; U.numFocus = false; stop(); refresh(); return; }
    if (U.pop) { closePop(); stop(); refresh(); return; }
    if (V.sel) { select(null); stop(); return; }
    return;                                                 /* nothing of the fight to let go of: the table's key */
  }
  if (ev.key === ' ' && gm && !(doc.activeElement && /BUTTON|A/.test(doc.activeElement.tagName))) { stop(); turn(); return; }
  /* these belong to the GM: a player's D, N and F are the kit's (draw, notes, the fight) */
  if ((ev.key === 'd' || ev.key === 'D') && p && gm) { stop(); B().setDone(p.t.id); return; }
  if ((ev.key === 'h' || ev.key === 'H') && p && gm) { stop(); B().setHidden(p.t.id); return; }
  /* Tab walks the pieces that have not acted yet (Shift+Tab: back) */
  if (ev.key === 'Tab' && gm && V.A && !V.A.fight.cover) {
    const list = B().flat(V.A).filter(q => !q.e.done && !q.e.hidden && !((q.e.hp | 0) <= 0 && q.e.kind !== 'form'));
    if (list.length) {
      stop();
      const at = list.findIndex(q => q.t.id === V.sel);
      select(list[(at + (ev.shiftKey ? list.length - 1 : 1) + (at < 0 && ev.shiftKey ? 1 : 0)) % list.length].t.id);
      return;
    }
  }
  if ((ev.key === 't' || ev.key === 'T') && p && gm) {
    stop(); if (V.sel !== p.t.id) select(p.t.id);
    const i = plate.querySelector('[data-tq]'); if (i) i.focus();
    return;
  }
  if ((ev.key === 'n' || ev.key === 'N') && gm) { V.names = !V.names; stop(); return; }
  if ((ev.key === 'f' || ev.key === 'F') && gm) { stop(); frameBoard(); return; }
  if (ev.key === 'Delete' && p && gm) { stop(); const r = B().remove(p.t.id); if (r.ok) select(null); return; }
}
V.toggleFrame = () => frameBoard();
V.openSetup = () => { if (U.built) openPop('set'); };
function frameBoard() {
  const p = doc.getElementById('combat-prop'), d = root.Table3D;
  if (!p || !d) return;
  if (d.locked === p) { if (root.__field && root.__field.on()) d.leaveField(true); else d.refit(); } else V.frameSoon();
}

/* ══ WHAT THE CARDS ARE MADE OF ═══════════════════════════════
   The monster to change (reached from its figure on the rail, or the brass plus for a new
   one), a character (the same, for a player), the kept fights (the banner) and the board's
   settings (the cog). There is nothing that brings everybody in at once: every figure is carried. */
const FIGS = ['spearman', 'archer', 'axeman', 'skeleton', 'lich'];
const editTpl = () => (U.draft && U.draft.id === U.editId) ? U.draft : B().lib.get(U.editId);
const keepTpl = t => { const k = B().lib.save(t); if (U.draft && U.draft.id === t.id) U.draft = null; return k; };
const tplLook = (t, px) => {
  const L = root.TokenLook; if (!L) return '';
  return L.standee({ name: t.name, side: t.side, entKind: t.entKind, src: t.src, art: t.art, fig: t.fig }, px || 60);
};
const badge = t => '<em class="bt-k bt-k-' + t.entKind + '">' + KINDS[t.entKind] + (t.entKind === 'form' ? ' &middot; ' + (t.bodies || '?') : '') + '</em>';
const sideTag = side => '<em class="bt-sd bt-sd-' + side + '">' + (side === 'en' ? 'Enemy' : 'Ally') + '</em>';

function numIn(k, label, v, w) { return '<label class="bt-st"><span>' + label + '</span><input class="bt-num" type="number" min="0" data-tf="' + k + '" value="' + (v == null ? '' : v) + '" style="width:' + (w || 56) + 'px"></label>'; }
function editorHTML() {
  const t = editTpl(); if (!t) return '';
  const S = (typeof SPRITES !== 'undefined') ? SPRITES : {};
  const form = t.entKind === 'form';
  const own = (() => { const a = t.art && root.Library && root.Library.art.get(t.art); return a && a.src ? '<span class="bt-pic on" title="your picture" style="background-image:url(' + a.src + ');background-size:cover"></span>' : ''; })();
  return '<div class="bt-prev">' + '<span class="bt-eg">' + tplLook(t, 74) + '</span><span class="bt-en"><b data-prev-name>' + esc(t.name) + '</b><i data-prev-sub>' + badge(t) + sideTag(t.side) + '</i></span></div>' +
    '<div class="bt-ed"><label>Name</label><input class="bt-txt" data-tf="name" maxlength="32" value="' + esc(t.name) + '" spellcheck="false"></div>' +
    '<div class="bt-ed bt-wrap"><label>Kind</label>' + [['unit', 'Unit'], ['large', 'Large'], ['form', 'Formation']].map(([k, nm]) => '<span class="bt-b' + (t.entKind === k ? ' bt-or' : '') + '" data-tf-set="entKind:' + k + '">' + nm + '</span>').join('') + '</div>' +
    '<div class="bt-ed bt-wrap"><label>Side</label><span class="bt-b' + (t.side === 'en' ? ' bt-or' : '') + '" data-tf-set="side:en">Enemy</span><span class="bt-b' + (t.side === 'al' ? ' bt-or' : '') + '" data-tf-set="side:al">Ally</span></div>' +
    '<div class="bt-ed"><label>Picture</label><div class="bt-pics">' + own + FIGS.filter(f => S[f]).map(f => '<span class="bt-pic' + (!t.art && (t.fig || (root.TokenLook ? root.TokenLook.defaultFig(t.side, t.entKind) : '')) === f ? ' on' : '') + '" data-pic="' + f + '" style="background-image:url(' + S[f].src + ')"></span>').join('') + '<span class="bt-b" data-bt-do="epic">Your own&hellip;</span></div></div>' +
    (form ? '<div class="bt-stats">' + numIn('bodies', 'Bodies', t.bodies) + numIn('hpea', 'HP each', t.hpea) + numIn('dmg', 'Damage', t.dmg) +
        '<label class="bt-st"><span>Hit</span><input class="bt-num" data-tf="skl" value="' + esc(t.skl) + '" style="width:44px" maxlength="4"></label>' +
        '<label class="bt-st"><span>Defence</span><input class="bt-num" data-tf="def" value="' + esc(t.def) + '" style="width:44px" maxlength="4"></label>' +
        numIn('leadership', 'Morale', t.leadership, 56) +
        '<label class="bt-st"><span>Holding</span><select class="bt-sel" data-tf="lead">' + LEADS().map(l => '<option' + (l === (t.lead || 'Stable') ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label></div>'
      : '<div class="bt-stats">' + numIn('hp', 'Health', t.hp, 64) + numIn('sta', 'Stamina', t.sta) + numIn('av', 'Armour', t.av) + numIn('move', 'Move', t.move) + '</div>') +
    '<div class="bt-lbl">Starts with</div><div class="bt-tk">' + ((t.cond || []).map(c => '<div class="bt-ti" data-tk="' + esc(c.n) + '" data-c="' + c.c + '"><span class="bt-tg">' + ico(c.n, 26) + '</span><span class="bt-tt"><b>' + esc(c.n) + '</b><i>' + esc((B().effectsOf([c])[0] || {}).auto || ruleOf(c.n)) + '</i></span><span class="bt-stp"><u data-edec="' + esc(c.n) + '">&minus;</u><b>' + c.c + '</b><u data-einc="' + esc(c.n) + '">+</u></span></div>').join('') || '<div class="bt-none">Nothing. Pick below.</div>') + '</div>' +
    '<div class="bt-row"><span class="bt-b" data-bt-do="epal">' + (U.epal ? 'Hide the tokens' : 'Add a starting token') + '</span></div>' + (U.epal ? palette('data-eadd') : '') +
    '<div class="bt-none">Its figure is on the rail: carry it to a line.</div><div class="bt-row"><span class="bt-b bt-or" data-bt-do="edone">Done</span><span class="bt-b bt-bad" data-bt-do="edel">Delete</span></div>';
}
function libPreview() {
  const t = editTpl(); if (!t) return;
  const nm = pop.querySelector('[data-prev-name]'), sub = pop.querySelector('[data-prev-sub]'), eg = pop.querySelector('.bt-prev .bt-eg');
  if (nm) nm.textContent = t.name;
  if (sub) sub.innerHTML = badge(t) + sideTag(t.side);
  if (eg) eg.innerHTML = tplLook(t, 74);
}
function fightList() {
  const E = root.Encounters; if (!E) return '';
  const rows = E.list().map(f => {
    const n = (f.units || []).length, en = (f.units || []).filter(u => u.side === 'en').length;
    return '<div class="bt-fgt" data-bt-f="' + esc(f.id) + '">' +
      (U.renaming === f.id ? '<input class="bt-txt" data-bt-rename="' + esc(f.id) + '" value="' + esc(f.name) + '" maxlength="40">' :
        '<span class="bt-fn"><b>' + esc(f.name) + '</b><i>' + n + ' piece' + (n === 1 ? '' : 's') + (n ? ' &middot; ' + en + ' foe' + (en === 1 ? '' : 's') : '') + '</i></span>') +
      '<span class="bt-fb"><span class="bt-b bt-or" data-bt-fight="' + esc(f.id) + '" data-bt-act="add">Put on the board</span>' +
      '<span class="bt-b" data-bt-fight="' + esc(f.id) + '" data-bt-act="rename">Rename</span>' +
      '<span class="bt-b' + (U.armed === 'f' + f.id ? ' bt-bad' : '') + '" data-bt-fight="' + esc(f.id) + '" data-bt-act="del">' + (U.armed === 'f' + f.id ? 'Sure?' : 'Delete') + '</span></span></div>';
  }).join('');
  return '<div class="bt-lbar"><input class="bt-txt" data-bt-fname="1" placeholder="Name this board" maxlength="40"><span class="bt-b bt-or" data-bt-do="keepfight">Keep this board</span></div>' +
    (rows || '<div class="bt-none">No kept fights.</div>');
}
/* ── things done to the library's entries ── */
function editing(d) {
  const t = editTpl(); if (!t) return;
  if (d.pic) { t.fig = d.pic; t.art = ''; t.src = ''; }
  else if (d.tfSet) {
    const [k, val] = d.tfSet.split(':');
    if (k === 'side') { t.side = val; t.fig = t.art ? t.fig : ''; }
    else t[k] = val;
  }
  else if (d.eadd || d.einc || d.edec) {
    const n = d.eadd || d.einc || d.edec, c = (t.cond || []).find(x => x.n === n);
    t.cond = (t.cond || []).map(x => ({ n: x.n, c: x.c }));
    const c2 = t.cond.find(x => x.n === n);
    if (d.eadd || d.einc) { if (c2) c2.c++; else t.cond.push({ n, c: 1 }); } else if (c2) { c2.c--; t.cond = t.cond.filter(x => x.c > 0); }
  }
  keepTpl(t); popRefresh(true);
}
function fightAction(id, act) {
  const E = root.Encounters; if (!E) return;
  const f = E.get(id); if (!f) return;
  if (act === 'add') {
    const r = B().deployFight(f.units || []);
    if (r.ok) say(f.name + ': ' + r.n + ' on the board' + (r.left ? ', ' + r.left + ' would not fit' : '')); else say(r.why);
    return;
  }
  if (act === 'rename') { U.renaming = id; popRefresh(true); setTimeout(() => { const i = pop.querySelector('[data-bt-rename]'); if (i) { i.focus(); i.select(); } }, 0); return; }
  if (act === 'del') {
    const k = 'f' + id;
    if (U.armed !== k) { U.armed = k; popRefresh(true); setTimeout(() => { if (U.armed === k) { U.armed = null; popRefresh(true); } }, 3000); return; }
    U.armed = null; E.remove(id); popRefresh(true);
  }
}
/* the mana: click the dish and type the number; Enter keeps it, Esc leaves it as it was */
U.editMana = () => {
  if (!isGM() || !V.rail || V.rail.input || !V.A) return;
  const inp = doc.createElement('input'); inp.type = 'number'; inp.min = 0; inp.max = 999; inp.className = 'bt-manain'; inp.value = V.A.options.mana;
  V.overlay().appendChild(inp); V.rail.input = inp;
  const finish = () => {
    if (V.rail.input !== inp) return;
    V.rail.input = null;
    const keep = inp.dataset.cancel !== '1', v = inp.value;
    inp.remove();
    if (keep) { const r = B().setMana(v); if (!r.ok) say(r.why); }
  };
  inp.addEventListener('blur', finish);
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); inp.blur(); } ev.stopPropagation(); });
  inp.focus(); inp.select();
};
/* ── the things on the rail ── */
U.railAct = what => { if (isGM()) openPop(what === 'fights' ? 'fights' : 'tpl', null); };
U.cogClick = () => { if (isGM()) openPop('set'); };
U.railClick = item => {                       /* a press on a figure that did not travel: change it */
  if (!isGM()) return;
  openPop(item.char ? 'char' : 'tpl', item.id);
};
U.turn = () => { if (isGM()) turn(); };

/* ══ ONE PASS PER FRAME ═══════════════════════════════════════ */
U.synced = A => {
  if (!plate) return;
  /* the cloth follows the scene's own word, here and at every other seat */
  if (lastCover == null) { V.clothU = A.fight.cover ? 1 : 0; }
  else if (lastCover !== A.fight.cover) V.clothTo(A.fight.cover ? 1 : 0, 1000);
  lastCover = A.fight.cover;
  if (V.sel && !pieceOf(V.sel)) V.sel = null;
  if (!isGM() && U.pop) closePop();
  refresh();
};
U.field = on => {
  if (!plate) return;
  V.inField = on;
  V.overlay().classList.toggle('bt-infield', on);
  if (on) {
    closePop(); tip.style.display = 'none';
    const p = B().picks();
    if (p !== V.sel && (!p || V.pcs.has(p))) { V.sel = p || null; refresh(); }
    chrome();
  }
};
V.ui.field = U.field;

/* WHO IS UNDER THE POINTER, asked rather than waited for. A figure that is hidden and
   shown again, or moved, or put back by Ctrl+Z, is under a pointer that has not moved,
   and the browser does not say so. So a few times a second the answer is looked up. */
let probeT = 0;
function probe(now) {
  if (!U.pin || (V.drag && V.drag.st && V.drag.st.on) || now - probeT < 90) return; probeT = now;
  const el = doc.elementFromPoint(U.px, U.py);
  /* a hover that said what a thing does goes when the thing does (a hidden figure, a closed card) */
  if (tip && tip.style.display !== 'none' && !(el && el.closest && el.closest('[data-tk],[data-tip]'))) tip.style.display = 'none';
  const h = el && el.closest && el.closest('.bt-hit[data-bt-id]');
  const id = h ? h.dataset.btId : null;
  if (id === (V.hover || null)) return;
  if (V.hover) U.hover(V.hover, false);
  if (id) U.hover(id, true);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function chrome() {
  const vp = doc.getElementById('vp'), vr = vp ? vp.getBoundingClientRect() : { left: 0, right: root.innerWidth, top: 0, bottom: root.innerHeight, width: root.innerWidth, height: root.innerHeight };
  /* no strip, in the field either: the turn is the banner at the far end of the Line and the mana the
     orb over the allies' side (37-scene-field.js), and the way back is the wheel, Esc or its own button */
  if (hud.style.display !== 'none') hud.style.display = 'none';
  /* the plate: beside the piece it is about, through whichever camera is looking */
  if (plate.style.display !== 'none') {
    const id = V.sel, pw = plate.offsetWidth, ph = plate.offsetHeight;
    let x = vr.right - pw - 14, y = vr.top + 14, ok = true;
    if (!V.inField || (V.hosted && V.hosted())) {
      const o = V.pieceScreen(id, true);
      if (o) {
        x = o.x + o.bw * .75 + 10; y = o.tf - 14;
        if (x + pw > vr.right - 10) x = o.x - o.bw * .75 - 10 - pw;
        x = clamp(x, vr.left + 8, vr.right - pw - 8);
        y = clamp(y, vr.top + 8, vr.bottom - ph - 8);
      } else ok = false;
    }
    if (ok) plate.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }
  popPlace(vr);
}
U.frame = now => {
  if (!plate) return;
  const A = V.A, g = V.geo(); if (!A || !g) return;
  probe(now);
  chrome();
  /* the number being typed, worn by the piece it is for */
  const tp2 = target(), typed = V.buf !== '' && tp2;
  if (typed && (!V.inField || (V.hosted && V.hosted())) && V.pieceScreen(tp2.t.id)) {
    const o = V.pieceScreen(tp2.t.id), amt = parseInt(V.buf, 10);
    const by = U.by && pieceOf(U.by);
    const pr = V.mode === 'heal' ? null : B().preview(Object.assign({ id: tp2.t.id }, tp2.e), amt, { attacker: by ? Object.assign({ id: by.t.id }, by.e) : null });
    wear.style.display = '';
    wear.style.transform = 'translate(' + o.x + 'px,' + (o.tf - 12) + 'px) translate(-50%,-100%)';
    const key = V.mode + amt + (pr ? pr.eff + pr.why.join() : '');
    if (wear.dataset.k !== key) {
      wear.dataset.k = key;
      wear.innerHTML = '<b style="color:' + (V.mode === 'heal' ? '#8ce07a' : '#ff7a62') + '">' + (V.mode === 'heal' ? '+' : '−') + amt + '</b>' +
        (pr && pr.why.length ? '<em>' + esc(pr.why.join(', ')) + ' &rarr; ' + pr.eff + '</em>' : '');
    }
  } else if (U.nbuf && U.overMini && U.overMini.isConnected) {
    const r = U.overMini.getBoundingClientRect(), n = parseInt(U.nbuf, 10) || 1;
    wear.style.display = ''; wear.dataset.k = 'n' + n;
    wear.style.transform = 'translate(' + Math.round(r.left + r.width / 2) + 'px,' + Math.round(r.top - 4) + 'px) translate(-50%,-100%)';
    wear.innerHTML = '<b style="color:#f6d77a">&times;' + n + '</b>';
  } else wear.style.display = 'none';
  /* the chips on the pieces know whose they are */
  V.pcs.forEach(pv => { if (pv.dom.ch.dataset.pid !== pv.id) pv.dom.ch.dataset.pid = pv.id; });
};

})(window, document);
