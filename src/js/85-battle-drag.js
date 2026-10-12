/* ══════════════════════════════════════════════════════════════
   85-battle-drag.js — PICKING A FIGURE UP, AND PUTTING IT DOWN.

   One way of carrying anything, for a figure from the rail and a figure already on
   the board:

     pick it up    the figure leaves where it stood and comes with the pointer, standing
                   upright on its own base, lifted a little, with its shadow on the felt;
                   it leans into the way you move it
     over a line   the line lights; the place it would stand is shown (the same figure,
                   faint) and the others in that line step aside to make room for it, so
                   you see the line as it will be before you let go. A line with no room
                   is red, and the figure will not go in
     let go        it settles into its place; a figure from the rail is a new one, a figure
                   from the board is moved
     elsewhere     off the board, or Esc: a figure from the rail flies home; one from the
                   board slides back to where it was
     on the rail   a figure FROM THE BOARD let go on the rail comes off the board (Ctrl+Z
                   brings it back), the way a figure goes back in its box

   A press that does not travel is a click: it picks a figure on the board, and on the
   rail it opens that figure's card to be changed. Only the GM carries anything. Every
   change is made through 80-battle.js, so it is one undo step and reaches every seat.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const V = root.BattleView;
if (!V) return;
const B = () => root.Battle;
const D = { st: null, fly: [] };
V.drag = D;
const THRESH = 4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const say = m => { if (V.toast) V.toast(m); };
const isGM = () => B().isGM();

/* ══ WHAT IS BEING CARRIED ═══════════════════════════════════ */
/* a rail figure, as the spec the model makes pieces from */
D.specOf = item => {
  if (item.lib) { const t = B().lib.get(item.id); return t ? B().lib.spec(t) : null; }
  if (item.char) { const C = root.Characters, c = C && C.get(item.id); return c ? { char: c.id, name: C.nameOf(c), side: 'al', entKind: 'unit', src: (c.who && c.who.pic) || '', art: (c.who && c.who.picArt) || '' } : null; }
  return null;
};
/* what a ghost needs to look like it */
const descOfSpec = s => ({ kind: s.entKind || 'unit', side: s.side, name: s.name, hp: s.hp, total: s.bodies, lead: s.lead, leadership: s.leadership, hpea: s.hpea, src: s.src, art: s.art, fig: s.fig });
const descOfPiece = p => ({ kind: p.e.kind, side: p.e.side, name: p.t.name || p.e.name, hp: p.e.hp, max: p.e.max, total: p.e.total, alive: p.e.alive, lead: p.e.lead, leadership: p.e.leadership, hpea: p.e.hpea, src: p.t.src || p.e.pic, art: p.t.art || p.e.art, fig: p.t.fig || p.e.fig });
const weightOfSpec = s => (s.entKind && s.entKind !== 'unit' ? 2 : 1);
/* ══ PRESSING ═════════════════════════════════════════════════
   kind: 'piece' {id} · 'spec' {item} (a figure on the rail) */
D.press = (kind, data, ev) => {
  if (ev.button !== 0) return false;
  if (D.st) abort(D.st);                                  /* a release that never came (the pointer left the window) must not jam the next press */
  D.st = { kind, data, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, vx: 0, on: false, can: isGM(), ghost: null, slot: null, pos: null, li: -1, idx: 0, bad: false, onRail: false, cancelled: false, n: 1 };
  if (kind === 'spec' && V.ui) D.st.n = V.ui.takeCount();
  ev.stopPropagation();
  return true;
};

function start(st) {
  st.on = true;
  doc.body.classList.add('bt-dragging');
  V.hover = null;
  st.mark = st.mark || doc.createElement('div'); st.mark.className = 'bt-dmark'; V.overlay().appendChild(st.mark);
  if (st.kind === 'piece') {
    const p = V.ui.pieceOf(st.data.id); if (!p) { abort(st); return; }
    V.select(st.data.id);
    st.pv = V.pieceOf(st.data.id); st.w = B().weightOf(p.e); st.fromLine = p.line;
    st.slot = V.makeGhost(descOfPiece(p), { alpha: .4 }); st.slot.hid = true;
  } else if (st.kind === 'spec') {
    st.spec = D.specOf(st.data.item); if (!st.spec) { abort(st); return; }
    st.w = weightOfSpec(st.spec);
    const home = V.rail && V.rail.posOf(st.data.item);
    st.ghost = V.makeGhost(descOfSpec(st.spec), { alpha: 1, pop: .6, x: home && home.x, z: home && home.z });          /* it lifts off from where it stood on the rail */
    st.ghost.slowUntil = performance.now() + 260;
    st.slot = V.makeGhost(descOfSpec(st.spec), { alpha: .4 }); st.slot.hid = true;
    if (V.rail) V.rail.dim(st.data.item, true);
  }
  if (st.ghost) { st.ghost.hid = true; }
}

/* the pointer is somewhere: what is under it, and what would happen */
function aim(st) {
  const pos = V.boardAt(st.x, st.y); if (!pos) return;
  st.pos = pos;
  const g = V.geo(), A = V.A, G = B().G;
  if (!g || !A) return;
  st.onRail = !!(V.rail && !(V.hosted && V.hosted()) && V.rail.overRail(pos));          /* standing in the field there is no rail to put it back on */
  const li = B().lineAtX(g, pos.x);
  st.li = (!st.onRail && li >= 0 && Math.abs(pos.z) <= g.bh / 2 + 70) ? li : -1;
  let text = '';
  if (st.li >= 0) {
    const key = g.lines[st.li].key;
    const free = B().roomIn(A, st.li) + (st.kind === 'piece' && st.fromLine === key ? st.w : 0);
    st.bad = free < st.w;                                          /* the only thing that stops a figure standing in a line: no room */
    st.why = st.bad ? 'That line is full' : null;
    st.idx = B().indexAtZ(A.rows[st.li], pos.z, st.kind === 'piece' ? st.data.id : null);
    const slot = B().slotLayout(A, st.li, st.idx, st.w, st.kind === 'piece' ? st.data.id : null);
    st.place = slot;
    V.setPreview(st.bad ? null : slot);
    if (st.slot) { const snap = st.slot.hid || st.lastLi !== st.li; st.slot.hid = false; st.slot.tx = slot.x; st.slot.tz = slot.z; if (snap) { st.slot.x = slot.x; st.slot.z = slot.z; } st.slot.alpha = st.bad ? .22 : .42; st.slot.ringMat.color.set(st.bad ? '#ff2a20' : '#f6d77a'); }
    text = st.why || '';
  } else {
    st.bad = false; st.place = null; V.setPreview(null);
    if (st.slot) st.slot.hid = true;
    if (st.onRail && st.kind === 'piece') text = 'Take it off the board';
  }
  if (st.n > 1 && !text) text = '\u00d7' + st.n;
  st.lastLi = st.li;
  V.laneMeshes().forEach((m, i) => m.material.emissive.setHex(i === st.li ? (st.bad ? 0x5a1410 : 0x2e2a10) : 0x000000));
  if (V.rail) V.rail.hot(st.onRail && st.kind === 'piece');
  st.mark.textContent = text; st.mark.style.display = text ? '' : 'none';
  st.mark.classList.toggle('bt-bad', st.bad || (st.onRail && st.kind === 'piece'));
  st.mark.style.transform = 'translate(' + Math.round(st.x + 18) + 'px,' + Math.round(st.y - 30) + 'px)';
  /* the figure in hand comes with the pointer, and faces the middle from whichever half it is over (its ring is still whose it is) */
  const carried = st.kind === 'piece' ? st.pv : st.ghost, ls = st.li >= 0 ? g.lines[st.li].side : null;
  if (carried) { carried.dragX = pos.x; carried.dragZ = pos.z; carried.hid = false; V.carrySide(carried, ls); }
  if (st.slot) V.carrySide(st.slot, ls);
}

function cleanup(st) {
  doc.body.classList.remove('bt-dragging');
  if (st.pv) V.carrySide(st.pv, null);
  V.laneMeshes().forEach(m => m.material.emissive.setHex(0x000000));
  V.setPreview(null);
  if (V.rail) { V.rail.hot(false); if (st.data && st.data.item) V.rail.dim(st.data.item, false); }
  if (st.mark) st.mark.remove();
  if (st.slot) { V.dropGhost(st.slot); st.slot = null; }
}
function abort(st) { cleanup(st); if (st.ghost) V.dropGhost(st.ghost); D.st = null; }

/* ══ MOVING ═══════════════════════════════════════════════════ */
function move(ev) {
  const st = D.st; if (!st) return;
  st.vx = ev.clientX - st.x; st.x = ev.clientX; st.y = ev.clientY;
  if (!st.on) {
    if (!st.can || Math.hypot(ev.clientX - st.x0, ev.clientY - st.y0) < THRESH) return;
    start(st);
    if (!D.st) return;
  }
  aim(st);
}

/* ══ LETTING GO ═══════════════════════════════════════════════ */
function bringIn(spec, drop, n) {
  const g = V.geo(), o = { n: n || 1 };
  if (drop) { o.line = drop.line; o.index = drop.index; }           /* where it stands is the line's; whose it is stays its own */
  const r = B().deploy(spec, o);
  if (!r.ok) { say(r.why); return r; }
  if (r.left) say(r.left + ' would not fit: that half of the board is full');
  return r;
}
V.bringIn = bringIn;

function up(ev) {
  const st = D.st; if (!st) return;
  D.st = null;
  if (!st.on) { clickOf(st); return; }
  const key = st.li >= 0 ? V.geo().lines[st.li].key : null;
  const carried = st.kind === 'piece' ? st.pv : st.ghost;
  const lift = carried ? (carried.carry || 0) : 0, at = st.pos;
  if (st.cancelled) { giveBack(st); return; }
  if (st.kind === 'piece') {
    const id = st.data.id;
    cleanup(st);
    if (carried) { carried.dragX = null; carried.dragZ = null; }
    if (st.onRail) {
      const r = B().remove(id);
      if (!r.ok) say(r.why); else V.select(null);
    } else if (key && !st.bad) {
      const r = B().move(id, key, st.idx);
      if (!r.ok) say(r.why);
    } else if (st.bad) say(st.why);
    return;
  }
  /* a figure from the rail */
  if (key && !st.bad) {
    const spec = st.spec, drop = { line: key, index: st.idx };
    V.landing = at ? { x: at.x, z: at.z, y: lift, t: performance.now() } : null;
    cleanup(st);
    if (st.ghost) { V.dropGhost(st.ghost); st.ghost = null; }
    bringIn(spec, drop, st.n);
    return;
  }
  giveBack(st, st.bad ? st.why : null);
}

/* a figure that was not put anywhere flies back to where it came from */
function giveBack(st, why) {
  cleanup(st);
  if (st.kind === 'piece') { if (st.pv) { st.pv.dragX = null; st.pv.dragZ = null; } if (why) say(why); return; }
  const gh = st.ghost; if (!gh) return;
  const home = st.kind === 'spec' && V.rail ? V.rail.posOf(st.data.item) : null;
  gh.dragX = null; gh.dragZ = null; gh.popTo = .55;
  if (home) { gh.tx = home.x; gh.tz = home.z; }
  D.fly.push({ gh, t0: performance.now() });
  if (why) say(why);
}

/* a press that did not travel */
function clickOf(st) {
  if (st.kind === 'piece') { V.select(st.data.id); return; }
  if (st.kind === 'spec' && V.ui && V.ui.railClick) V.ui.railClick(st.data.item, st.data.el);
}

/* ══ EVERY FRAME ══════════════════════════════════════════════ */
D.frame = (now, dt) => {
  const st = D.st;
  if (st && st.on) {
    /* it leans into the way it is moved */
    const carried = st.kind === 'piece' ? st.pv : st.ghost;
    if (carried) carried.sway = clamp((carried.sway || 0) + (-st.vx) * .0045, -.3, .3);
    st.vx *= .6;
  }
  for (let i = D.fly.length - 1; i >= 0; i--) {
    const f = D.fly[i];
    if (now - f.t0 > 340) { V.dropGhost(f.gh); D.fly.splice(i, 1); }
  }
};

/* ══ CANCELLING ═══════════════════════════════════════════════ */
root.addEventListener('pointermove', move);
root.addEventListener('pointerup', up);
root.addEventListener('blur', () => { const st = D.st; if (st && st.on) { D.st = null; cleanup(st); if (st.kind === 'piece') { if (st.pv) { st.pv.dragX = null; st.pv.dragZ = null; } } else if (st.ghost) V.dropGhost(st.ghost); } });
root.addEventListener('pointercancel', () => { const st = D.st; if (!st) return; D.st = null; if (st.on) { cleanup(st); if (st.kind === 'piece') { if (st.pv) { st.pv.dragX = null; st.pv.dragZ = null; } } else if (st.ghost) V.dropGhost(st.ghost); } });
function cancelNow() {
  const st = D.st; if (!st || !st.on) return false;
  D.st = null;
  if (st.kind === 'piece') { cleanup(st); if (st.pv) { st.pv.dragX = null; st.pv.dragZ = null; } }
  else giveBack(st);
  return true;
}
root.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape' || !cancelNow()) return;
  ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
}, true);
root.addEventListener('contextmenu', ev => { if (cancelNow()) { ev.preventDefault(); ev.stopPropagation(); } }, true);
})(window, document);
