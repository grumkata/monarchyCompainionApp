/* ══════════════════════════════════════════════════════════════
   72-muster.js — THE FIGHT, RUN FROM ONE PLACE.

   grumkata, on the combat board: it "doe not actually make running or
   being in combat easier for the gm or player even though that is the
   purpose of the combat scene".

   It did not, and the reason is where everything was. The round and
   the phase were five-pixel type across the top of a sheet lying in
   perspective on the far side of a table; who had acted was a pair of
   dots under each counter; what a unit had left was a strip at the
   foot of the same sheet that slid off the screen and re-docked itself;
   and the scene's own orders floated over the board in a writ. Running
   a round meant zooming in on the wood to read it.

   The MUSTER is the fight read the other way round — a roll of who is
   in it, in the order they act, at a size you can read, docked at your
   left hand in the same place as the toolbox:

     THE TURN     the round, whose phase it is, and End Turn
     THE ROLL     everyone, grouped Players / Allies / Enemies in the
                  order the rules have them act, the group whose turn it
                  is lit — health, actions left, what is on them
     THE CARD     the one you have chosen, large: take and heal, spend
                  and refresh actions, add and clear conditions, and the
                  lines of the field laid out as a map to move them on
     THE GROUND   paint cover, obstacles, water, hazards onto the slots
     THE ORDERS   the scene's own options (26-scene-setup.js), which
                  used to float over the board

   It is a VIEW of 32-combat-app.js's state, not a second copy of it:
   every button here calls that file's own functions — move, endTurn,
   render — so the sheet on the wood, this and the field cannot disagree.
   A player sees the same roll, and may only touch their own.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* 32-combat-app.js's own bindings, by name — they are global lexical
   declarations there, not window properties */
const has = () => typeof S !== 'undefined' && Array.isArray(S.lines);
const gm = () => (typeof isGM === 'function' ? isGM() : true);
const mine = e => (typeof canControl === 'function' ? canControl(e) : true);
const PH = ['Players', 'Allies', 'Enemies'];

let el = null, open_ = false, brush = null, showCond = false, amt = 5, wanted = false;

/* ══ MOUNT ════════════════════════════════════════════════════ */
function mount() {
  if (el) return;
  el = doc.createElement('aside');
  el.className = 'muster';
  el.id = 'muster';
  el.hidden = true;
  doc.body.appendChild(el);
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  /* the muster's clicks are its own. They re-render it, so by the time one
     bubbled to 32-combat-app.js's document handler its target was no longer
     in the page, looked like a click off the ranks, and let go of the unit
     that had just been chosen. */
  el.addEventListener('click', e => { onClick(e); e.stopPropagation(); });
  el.addEventListener('input', e => {
    if (e.target.id === 'mu-amt') amt = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1));
  });
  el.addEventListener('keydown', e => e.stopPropagation());

  /* PAINTING THE GROUND: while a brush is up, a click on a slot of the
     board is a feature, not a selection */
  doc.addEventListener('click', e => {
    if (!brush || !live()) return;
    const slot = e.target.closest && e.target.closest('#field .free[data-line], #field .ent[data-id]');
    if (!slot) return;
    let line, col;
    if (slot.classList.contains('free')) { line = slot.dataset.line; col = +slot.dataset.col; }
    else {
      const l = typeof lineOf === 'function' && lineOf(slot.dataset.id);
      const cell = slot.closest('[data-col]');
      if (!l || !cell) return;
      line = l.key; col = +cell.dataset.col;
    }
    e.preventDefault(); e.stopPropagation();
    const now = typeof featAt === 'function' && featAt(line, col);
    T().setFeature(live().id, line, col, brush === 'clear' || (now && now.kind === brush) ? null : brush);
  }, true);

  /* a fight coming onto the table opens the muster; going off shuts it —
     and if it only shut because the fight went (an undo), the fight coming
     back (the redo) opens it again. A muster the GM closed stays closed. */
  T().on((st, why) => {
    if (why === 'activate') { const s = live(); if (s) { wanted = true; open(); } return; }
    if (why === 'deactivate' || why === 'bin' || why === 'load') { if (!live()) { close(true); wanted = false; } return; }
    if (why !== 'select' && why !== 'move' && wanted && !open_ && live()) open();
  });
  root.addEventListener('monarchy:where', e => { if (!e.detail || e.detail.at !== 'table') close(true); });
  root.addEventListener('monarchy:session', e => {
    const w = (e.detail || {}).what;
    if (w === 'hosting' || w === 'joined' || w === 'left' || w === 'closed') paint();
  });
  doc.addEventListener('keydown', e => {
    if (e.key === 'Escape' && brush) { brush = null; paint(); e.stopPropagation(); }
  }, true);
}

const live = () => { const s = T() && T().activeScene(); return s && s.scene === 'combat' ? s : null; };
const isOpen = () => open_;
function open() {
  if (!el || !live()) return;
  if (root.Toolbox && root.Toolbox.isOpen()) root.Toolbox.shut();
  wanted = true;
  open_ = true;
  el.hidden = false;
  const was = doc.body.classList.contains('muster-on');
  doc.body.classList.add('muster-on');
  /* the dock narrows the table's view (14-war.css); tell it, as a resize would */
  if (!was) root.dispatchEvent(new Event('resize'));
  paint();
  if (root.GmRail) root.GmRail.paint();
  if (root.Kit && root.Kit.paint) root.Kit.paint();
}
/* `quiet` is the muster shutting itself because the fight went; anybody
   else closing it — the GM, the toolbox taking the dock — means it */
function close(quiet) {
  if (!el) return;
  if (!quiet) wanted = false;
  open_ = false; brush = null;
  el.hidden = true;
  const was = doc.body.classList.contains('muster-on');
  doc.body.classList.remove('muster-on', 'ft-painting');
  if (was) root.dispatchEvent(new Event('resize'));
  if (!quiet && root.GmRail) root.GmRail.paint();
  if (root.GmRail) root.GmRail.paint();
}
function toggle() { if (open_) { wanted = false; close(); } else { wanted = true; open(); } }

/* ══ WHO ACTS WHEN ════════════════════════════════════════════
   The rules' order: players, then their allies, then the enemy. A player
   character standing on the enemy's side of the Line is still a player. */
function phaseOf(e) {
  if (e.side === 'en') return 2;
  return e.pc ? 0 : 1;
}
function everyone() {
  const out = [];
  if (!has()) return out;
  S.lines.forEach(l => l.ents.forEach(e => out.push({ e, l })));
  return out;
}
const down = e => e.kind === 'form' ? (e.alive | 0) <= 0 : (e.hp | 0) <= 0;
const spent = e => !e.q && !e.f;

/* ══ DRAWING IT ═══════════════════════════════════════════════ */
let pending = false;
function paint() {
  if (!el) return;
  const s = live();
  if (!s || !has()) { if (open_) close(true); return; }
  if (!open_) return;
  /* NOT UNDER SOMEBODY'S FINGERS. At a live table the fight re-renders
     whenever anybody changes anything, and a number half-typed into the
     amount or a tally would be thrown away mid-keystroke. It waits until
     the field is let go of. */
  const a = doc.activeElement;
  if (a && el.contains(a) && a.tagName === 'INPUT') {
    if (!pending) { pending = true; a.addEventListener('blur', () => { pending = false; paint(); }, { once: true }); }
    return;
  }
  const G = gm();
  const ter = C().TERRAINS[C().terrainOf(s.setup && s.setup.terrain)];
  const all = everyone();
  const sel = S.sel && typeof entById === 'function' ? entById(S.sel) : null;
  const myTurn = !G && S.phase === 0 && all.some(x => x.e.pc && mine(x.e));

  el.dataset.terrain = C().terrainOf(s.setup && s.setup.terrain);
  el.innerHTML =
    `<header class="mu-head">
       <div class="mu-title"><b>${esc(s.name || 'Combat')}</b>
         <i>${esc(ter.name)} &middot; ${S.width} wide</i></div>
       <button class="mu-x" data-mu="close" title="Close  (F)">&#10005;</button>
     </header>
     <div class="mu-turn">
       <div class="mu-round">
         <span>Round</span>
         ${G ? `<button class="mu-lz" data-mu="round-" title="Back a round">&minus;</button>` : ''}
         <b>${String(S.round).padStart(2, '0')}</b>
         ${G ? `<button class="mu-lz" data-mu="round+" title="On a round">+</button>` : ''}
       </div>
       <div class="mu-phases">${PH.map((p, i) =>
         `<button class="mu-ph${i === S.phase ? ' now' : i < S.phase ? ' done' : ''}" data-mu="phase"
            data-ph="${i}" ${G ? '' : 'disabled'}>${p}</button>`).join('')}</div>
       ${G ? `<button class="mu-end" data-mu="end" title="End this phase  (Space)">End turn<small>Space</small></button>` : ''}
     </div>
     ${myTurn ? `<div class="mu-yours">Your turn &mdash; the players act</div>` : ''}
     <div class="mu-mana"><span>Mana in the air</span>
       ${G ? `<button class="mu-lz" data-mu="mana-">&minus;</button>` : ''}
       <b>${S.mana | 0}</b>
       ${G ? `<button class="mu-lz" data-mu="mana+">+</button>` : ''}</div>
     ${declared()}
     <div class="mu-roll">${[0, 1, 2].map(p => group(p, all.filter(x => phaseOf(x.e) === p))).join('')}</div>
     ${sel ? card(sel) : `<div class="mu-card none">${all.length
         ? 'Choose someone on the roll or the board to see them here.'
         : (G ? 'Nobody is on the field yet. Drag counters onto its lines, or take them out of the toolbox.'
              : 'Nobody is on the field yet.')}</div>`}
     ${G ? ground() : ''}
     ${G ? `<section class="mu-orders" id="sc-opts"></section>` : ''}
     ${G ? `<footer class="mu-foot">
        <button class="mu-f" data-mu="field" title="Stand in the fight">Into the field</button>
        <button class="mu-f" data-mu="save" title="Keep this fight, to bring back another night">Save as prepared</button>
        <button class="mu-f bad" data-mu="stand" title="Put the fight away; it stays on the table">End the fight</button>
      </footer>` : `<footer class="mu-foot">
        <button class="mu-f" data-mu="field">Into the field</button></footer>`}`;
  if (G && root.SceneSetup && root.SceneSetup.ordersInto) root.SceneSetup.ordersInto(el.querySelector('#sc-opts'), s.id);
  doc.body.classList.toggle('ft-painting', !!brush);
}

/* the phase a group acts in is lit; a group with nobody in it is quiet */
function group(p, list) {
  const now = S.phase === p;
  return `<section class="mu-grp${now ? ' now' : ''}${list.length ? '' : ' empty'}">
    <h4><span>${PH[p]}</span>${now ? '<i>acting</i>' : ''}<em>${list.length}</em></h4>
    ${list.map(({ e, l }) => row(e, l)).join('')}
  </section>`;
}

function row(e, l) {
  const L = root.TokenLook;
  const who = { name: e.name, side: e.side, entKind: e.kind, src: e.pic || '', art: e.art || '', fig: e.fig || '' };
  const form = e.kind === 'form';
  const frac = form ? (e.alive | 0) / Math.max(1, e.total | 0) : (e.hp | 0) / Math.max(1, e.max | 0);
  const band = frac > .6 ? 'ok' : frac > .3 ? 'mid' : 'low';
  const cls = ['mu-row', e.side === 'en' ? 'en' : 'al', e.id === S.sel ? 'sel' : '',
               spent(e) ? 'spent' : '', down(e) ? 'down' : '', mine(e) ? 'mine' : ''].filter(Boolean).join(' ');
  const cond = (e.cond || []).slice(0, 4).map(c =>
    `<i class="${typeof tokClass === 'function' ? tokClass(c.n) : 'n'}">${esc(c.n)}${c.c > 1 ? ' ' + c.c : ''}</i>`).join('');
  return `<button class="${cls}" data-mu="pick" data-id="${esc(e.id)}">
      ${L ? L.coin(who, 34) : ''}
      <span class="mu-who"><b>${esc(e.name)}</b><small>${esc(l.label)}${e.side !== l.side ? ' &middot; behind their lines' : ''}</small></span>
      <span class="mu-hp ${band}"><i style="width:${(Math.max(0, Math.min(1, frac)) * 100).toFixed(0)}%"></i>
        <u>${form ? (e.alive | 0) + '/' + (e.total | 0) : (e.hp | 0) + '/' + (e.max | 0)}</u></span>
      <span class="mu-ap"><i class="${e.q ? 'on' : ''}" title="Quick action"></i><i class="${e.f ? 'on' : ''}" title="Full action"></i></span>
      ${cond ? `<span class="mu-cd">${cond}</span>` : ''}
    </button>`;
}

/* ── A MOVE OR AN ABILITY A PLAYER HAS DECLARED ─────────────── */
function declared() {
  if (!S.sug || typeof entById !== 'function') return '';
  const e = entById(S.sug.id), to = S.lines.find(l => l.key === S.sug.to);
  if (!e || !to) return '';
  return `<div class="mu-decl"><span>Declared</span>
    <p><b>${esc(e.name)}</b> means to move to <b>${to.side === 'en' ? 'Enemy' : 'Ally'} ${esc(to.label)}</b>
      <em>${esc(S.sug.note || '')}</em></p>
    ${gm() ? `<button class="mu-f go" data-mu="allow">Allow</button><button class="mu-f" data-mu="dismiss">Dismiss</button>`
           : `<button class="mu-f" data-mu="dismiss">Withdraw</button>`}</div>`;
}

/* ── THE CARD ──────────────────────────────────────────────────── */
function card(e) {
  const L = root.TokenLook;
  const l = typeof lineOf === 'function' ? lineOf(e.id) : null;
  const may = mine(e);
  const form = e.kind === 'form';
  const who = { name: e.name, side: e.side, entKind: e.kind, src: e.pic || '', art: e.art || '', fig: e.fig || '' };
  const kind = form ? 'Formation' : e.kind === 'large' ? 'Large' : e.pc ? 'Player' : 'Unit';
  const ft = typeof featOf === 'function' ? featOf(e) : null;
  const FT = ft && C().FEATURES[ft.kind];
  const frac = form ? (e.alive | 0) / Math.max(1, e.total | 0) : (e.hp | 0) / Math.max(1, e.max | 0);
  const band = frac > .6 ? 'ok' : frac > .3 ? 'mid' : 'low';
  const toks = typeof tokNames === 'function' ? tokNames() : [];
  const thing = T().get(e.id);
  return `<div class="mu-card ${e.side === 'en' ? 'en' : 'al'}">
    <div class="mu-cid">
      ${L ? L.coin(who, 64) : ''}
      <div><b class="mu-cn">${esc(e.name)}</b>
        <i>${e.side === 'en' ? 'Enemy' : 'Ally'} &middot; ${kind}${l ? ' &middot; ' + esc(l.label) : ''}</i>
        ${FT ? `<i class="mu-on ft-${ft.kind}">In ${esc(FT.name.toLowerCase())} &mdash; ${esc(FT.note)}</i>` : ''}</div>
    </div>
    <div class="mu-life">
      <span class="mu-bar ${band}"><i style="width:${(Math.max(0, Math.min(1, frac)) * 100).toFixed(0)}%"></i>
        <u>${form ? (e.alive | 0) + ' of ' + (e.total | 0) + ' standing' : (e.hp | 0) + ' / ' + (e.max | 0)}</u></span>
      ${may ? `<div class="mu-hurt">
        <button class="mu-f bad" data-mu="hurt">${form ? 'Lose' : 'Take'}</button>
        <span class="mu-tally"><button class="mu-lz" data-mu="amt-">&minus;</button>
          <input id="mu-amt" type="number" min="1" max="999" value="${amt}">
          <button class="mu-lz" data-mu="amt+">+</button></span>
        <button class="mu-f go" data-mu="heal">${form ? 'Rally' : 'Heal'}</button>
      </div>` : ''}
    </div>
    <div class="mu-acts">
      <span class="mu-k">Actions</span>
      <button class="mu-act${e.q ? '' : ' used'}" data-mu="q" ${may ? '' : 'disabled'}>Quick${e.q ? '' : ' &mdash; spent'}</button>
      <button class="mu-act${e.f ? '' : ' used'}" data-mu="f" ${may ? '' : 'disabled'}>Full${e.f ? '' : ' &mdash; spent'}</button>
    </div>
    <div class="mu-conds">
      <span class="mu-k">Conditions</span>
      <div class="mu-chips">${(e.cond || []).map((c, i) =>
        `<span class="mu-chip ${typeof tokClass === 'function' ? tokClass(c.n) : 'n'}">${esc(c.n)}<b>${c.c}</b>${may
          ? `<button data-mu="c-" data-i="${i}">&minus;</button><button data-mu="c+" data-i="${i}">+</button>` : ''}</span>`).join('')
        || '<em>None</em>'}
        ${may && toks.length ? `<button class="mu-add${showCond ? ' on' : ''}" data-mu="addc">+ Condition</button>` : ''}</div>
      ${may && showCond ? `<div class="mu-pick">${toks.map(n =>
        `<button class="mu-chip ${typeof tokClass === 'function' ? tokClass(n) : 'n'}" data-mu="give" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    </div>
    ${may ? `<div class="mu-move"><span class="mu-k">Move to${gm() ? '' : ' &mdash; the GM allows it'}</span>${map(e, l)}</div>` : ''}
    <div class="mu-more">
      ${gm() && thing ? `<button class="mu-f" data-mu="edit">Edit counter</button>` : ''}
      ${thing && thing.char && root.Papers ? `<button class="mu-f" data-mu="record">Their record</button>` : ''}
      ${gm() && thing ? `<button class="mu-f" data-mu="off">Off the field</button>` : ''}
    </div>
  </div>`;
}

/* THE FIELD AS A MAP. Every line, enemy at the top and allies at the
   bottom the way the board is laid out, with how full it is — press one
   and the unit goes there, to the free slot nearest the middle. */
function map(e, here) {
  const span = typeof slotsOf === 'function' ? slotsOf(e) : 1;
  return `<div class="mu-map">${S.lines.map((l, i) => {
      const used = typeof usedIn === 'function' ? usedIn(l) : l.ents.length;
      const full = l !== here && used + span > S.width;
      const mid = i > 0 && S.lines[i - 1].side !== l.side ? ' mid' : '';
      return `<button class="mu-ln ${l.side === 'en' ? 'en' : 'al'}${l === here ? ' here' : ''}${full ? ' full' : ''}${mid}"
          data-mu="go" data-line="${esc(l.key)}" ${l === here || full ? 'disabled' : ''}>
          <b>${esc(l.label)}</b><i>${used}/${S.width}</i></button>`;
    }).join('')}</div>`;
}

/* ── THE GROUND ────────────────────────────────────────────────── */
function ground() {
  const F = C().FEATURES;
  return `<section class="mu-ground">
    <span class="mu-k">The ground${brush ? ' &mdash; click slots on the board' : ''}</span>
    <div class="mu-brushes">${C().FEATURE_ORDER.map(k =>
      `<button class="mu-brush ft-${k}${brush === k ? ' on' : ''}" data-mu="brush" data-k="${k}"
          title="${esc(F[k].name + ' — ' + F[k].note)}"><i></i>${esc(F[k].name)}</button>`).join('')}
      <button class="mu-brush clear${brush === 'clear' ? ' on' : ''}" data-mu="brush" data-k="clear"
          title="Clear a slot">Clear</button></div>
  </section>`;
}

/* ══ WHAT THE BUTTONS DO ══════════════════════════════════════
   Each one ends in the combat app's own render(), which saves the scene,
   tells the other tables (40-combat-scene.js) and repaints this. */
function redraw() { if (typeof render === 'function') render(); else paint(); }

function onClick(ev) {
  const b = ev.target.closest('[data-mu]'); if (!b) return;
  const what = b.dataset.mu;
  const s = live();
  const e = S.sel && typeof entById === 'function' ? entById(S.sel) : null;
  if (what === 'close') { wanted = false; close(); return; }
  if (what === 'pick') { S.sel = S.sel === b.dataset.id ? null : b.dataset.id; showCond = false; redraw(); return; }
  if (what === 'end' && typeof endTurn === 'function') { endTurn(); return; }
  if (what === 'phase' && gm()) { S.phase = +b.dataset.ph; redraw(); return; }
  if (what === 'round+' && gm()) { S.round++; redraw(); return; }
  if (what === 'round-' && gm()) { S.round = Math.max(1, S.round - 1); redraw(); return; }
  if ((what === 'mana+' || what === 'mana-') && gm() && s) {
    T().setOption(s.id, 'mana', Math.max(0, (S.mana | 0) + (what === 'mana+' ? 1 : -1)));
    return;
  }
  if (what === 'allow' && typeof resolveSug === 'function') { resolveSug(true); return; }
  if (what === 'dismiss' && typeof resolveSug === 'function') { resolveSug(false); return; }
  if (what === 'brush') { brush = brush === b.dataset.k ? null : b.dataset.k; paint(); return; }
  if (what === 'field') { intoField(); return; }
  if (what === 'save' && s && root.Encounters) {
    const got = root.Encounters.fromScene(s);
    if (got && root.Inspector) root.Inspector.said('Saved to your prepared fights');
    return;
  }
  if (what === 'stand' && s) { T().deactivate(); close(); return; }

  if (!e || !mine(e)) return;
  if (what === 'amt+') { amt = Math.min(999, amt + 1); paint(); return; }
  if (what === 'amt-') { amt = Math.max(1, amt - 1); paint(); return; }
  if (what === 'hurt' || what === 'heal') {
    const n = amt;
    if (e.kind === 'form') e.alive = what === 'hurt' ? Math.max(0, (e.alive | 0) - n) : Math.min(e.total | 0, (e.alive | 0) + n);
    else e.hp = what === 'hurt' ? Math.max(0, (e.hp | 0) - n) : Math.min(e.max | 0, (e.hp | 0) + n);
    say(e.name + (what === 'hurt' ? ' takes ' : ' heals ') + n);
    redraw(); return;
  }
  if (what === 'q') { e.q = !e.q; redraw(); return; }
  if (what === 'f') { e.f = !e.f; redraw(); return; }
  if (what === 'addc') { showCond = !showCond; paint(); return; }
  if (what === 'give') {
    e.cond = e.cond || [];
    const t = e.cond.find(x => x.n === b.dataset.n);
    if (t) t.c++; else e.cond.push({ n: b.dataset.n, c: 1 });
    showCond = false; redraw(); return;
  }
  if (what === 'c+' || what === 'c-') {
    const c = (e.cond || [])[+b.dataset.i]; if (!c) return;
    c.c += what === 'c+' ? 1 : -1;
    if (c.c <= 0) e.cond.splice(+b.dataset.i, 1);
    redraw(); return;
  }
  /* aimed at the middle of the line; the board's own resolveDrop slides it
     to the nearest clear ground, the same as a drop that lands roughly */
  if (what === 'go' && typeof move === 'function') { move(e.id, b.dataset.line, S.width / 2); return; }
  if (what === 'edit' && root.Hand) { root.Hand.editThing(e.id); return; }
  if (what === 'record') {
    const t = T().get(e.id);
    if (t && t.char && root.Papers) { root.Papers.lay(t.char); root.Papers.read(); }
    return;
  }
  if (what === 'off' && root.Tokens) {
    const at = root.Table3D ? root.Table3D.middle() : { x: 1200, y: 780 };
    root.Tokens.toWood(e.id, at.x - 42, at.y - 58);
    S.sel = null; redraw();
  }
}

function say(t) { if (typeof toast === 'function') toast(t); }

/* into the immersive field: lock onto the board, then stand in it */
function intoField() {
  const p = doc.getElementById('combat-prop');
  if (!p || !root.Table3D || !root.__field) return;
  if (root.Table3D.locked !== p) root.Table3D.lockIn(p);
  setTimeout(() => { if (!root.__field.on()) root.__field.set(true); }, 450);
}

root.Muster = { mount, open, close, toggle, isOpen, paint };

})(window, document);
