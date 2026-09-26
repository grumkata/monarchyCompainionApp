/* ══════════════════════════════════════════════════════════════
   73-encounters.js — FIGHTS MADE BEFORE THE EVENING.

   grumkata: "preset combat scenes where gm makes a preset board and
   then bring it to the table for combat".

   Every fight used to be built at the table, in front of the players:
   put a scene down, then carry the enemy out of the box one counter at
   a time and drop each on its line. That is ten minutes of the GM
   setting up while everybody waits — and a prepared ambush is prepared
   because it should arrive all at once.

   So a fight can be made AHEAD: in the WAR ROOM (E, or the GM's rail),
   away from the table, with the same ground, the same lines, the same
   counters and the same features a fight on the table has. It is kept
   on this machine, and brought to the table in one move — from here,
   or out of the toolbox's Scenes, where every prepared fight is a tile
   — landing already dressed and already manned. And a fight on the
   table can be saved the other way (the muster's Save as prepared),
   so a good one can be run again another night.

   A prepared fight is DATA, and it is the same data a scene on the
   table is made of:

     { id, name, width, terrain,
       lines:    the scene's own lines, empty         (21-table-content.js)
       units:    [{ line, col, ...a counter's spec }] (43-tokens.js make)
       features: [{ line, col, kind }]
       notes }
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;
const KEY = 'monarchy.encounters.v1';
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const uid = () => 'enc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ══ THE STORE ════════════════════════════════════════════════ */
let cache = null;
function all() {
  if (cache) return cache;
  try { const v = JSON.parse(root.localStorage.getItem(KEY)); cache = Array.isArray(v) ? v : []; }
  catch (e) { cache = []; }
  return cache;
}
function persist() {
  try { root.localStorage.setItem(KEY, JSON.stringify(all())); return true; }
  catch (e) { say('Could not keep that — the store is full'); return false; }
}
const list = () => all().slice().sort((a, b) => (b.changed || 0) - (a.changed || 0));
const get = id => all().find(e => e.id === id) || null;

/* a fight made from nothing: the rules' eight lines, the meadow, eight wide */
function blank(name) {
  return { id: uid(), name: name || 'A new fight', width: 8, terrain: 'meadow',
           lines: C().blankLines().map(l => ({ key: l.key, side: l.side, label: l.label,
                                                depth: l.depth, front: !!l.front })),
           units: [], features: [], notes: '', made: Date.now(), changed: Date.now() };
}
/* cleaned on the way in: a hand-edited or older copy still opens */
function clean(e) {
  const b = blank();
  const out = Object.assign(b, e || {});
  out.width = Math.max(3, Math.min(14, parseInt(out.width, 10) || 8));
  out.terrain = C().terrainOf(out.terrain);
  if (!Array.isArray(out.lines) || !out.lines.length) out.lines = b.lines;
  out.units = (Array.isArray(out.units) ? out.units : []).filter(u => u && out.lines.some(l => l.key === u.line));
  out.features = C().coerceFeatures(out.features, out.lines);
  return out;
}
function save(e) {
  const c = clean(e);
  c.changed = Date.now();
  const i = all().findIndex(x => x.id === c.id);
  if (i >= 0) all()[i] = c; else all().push(c);
  persist();
  if (root.Hand) root.Hand.refresh();
  return c;
}
function remove(id) {
  const i = all().findIndex(x => x.id === id);
  if (i < 0) return false;
  all().splice(i, 1); persist();
  if (root.Hand) root.Hand.refresh();
  return true;
}

/* ══ FROM THE TABLE ═══════════════════════════════════════════
   The fight on the table, written down as a prepared one: its ground,
   its lines, where everybody stands and what they are. */
/* ── WHO GOES INTO A PREPARED FIGHT ────────────────────────────
   A fight saved off the table is going to be run again, another night,
   probably with a different party. So which of the counters standing on
   it belong in the saved copy is a real choice, not a detail:

     · a PLAYER'S CHARACTER (t.source === 'char') is tied to a record,
       and next time the record will have moved on — and it may be a
       different player's character in that seat altogether;
     · a unit that has been HURT would be saved hurt, and the next time
       the fight is brought out it would open with the enemy already
       half dead.

   keepInPreset decides the first; unitOf below writes the spec. */
function keepInPreset(t) {
  // TODO(grumkata): the rule for who is saved into a prepared fight.
  // Right now: everyone except player characters. You may want the players'
  // own positions kept (for a scripted ambush), or only enemies kept (so the
  // allies are always whoever turns up), or formations only.
  return t.source !== 'char';
}
function unitOf(t, line, col) {
  const e = t.ent || {};
  return { line, col, name: t.name, side: e.side, entKind: e.kind || 'unit',
           hpMax: e.max, bodies: e.total, hpea: e.hpea, dmg: e.dmg, skl: e.skl,
           def: e.def, lead: e.lead, look: t.look || 'standee',
           fig: t.fig || '', src: t.src || '', art: t.art || '', info: t.info || '' };
}
function fromScene(s) {
  if (!s || s.kind !== 'scene' || s.scene !== 'combat') return null;
  const e = blank(s.name && s.name !== 'Combat' ? s.name : 'A fight kept ' + new Date().toLocaleDateString());
  e.width = s.setup.width; e.terrain = s.setup.terrain;
  e.lines = (s.lines || C().blankLines()).map(l => ({ key: l.key, side: l.side, label: l.label,
                                                      depth: l.depth, front: !!l.front }));
  e.features = (s.features || []).map(f => Object.assign({}, f));
  (s.lines || []).forEach(l => (l.ents || []).forEach(en => {
    const t = T().get(en.id);
    if (t && keepInPreset(t)) e.units.push(unitOf(t, l.key, en.col == null ? 0 : en.col));
  }));
  return save(e);
}

/* ══ TO THE TABLE ═════════════════════════════════════════════
   The whole fight, in one move: the scene fitted to the wood with its
   ground and width, its lines, its features, and a counter for every
   unit standing where it was put — then it is the fight that is running.
   A fight already running is stood down, not thrown away: it stays on
   the table as it was. */
function toTable(id, opts) {
  opts = opts || {};
  const e = get(id);
  if (!e || !T().mayUseBox()) return null;
  const def = C().SCENES.combat, sz = def.size;
  T().begin();
  let sc;
  try {
    sc = T().put({ kind: 'scene', scene: 'combat',
                   setup: { width: e.width, terrain: e.terrain },
                   name: (opts.name || e.name || 'Combat').slice(0, 40),
                   x: Math.round((T().TW - sz.w) / 2), y: Math.round((T().TH - sz.h) / 2),
                   w: sz.w, h: sz.h, locked: true });
    sc.lines = e.lines.map(l => Object.assign({}, l, { ents: [] }));
    sc.features = C().coerceFeatures(e.features, sc.lines);
    (e.units || []).forEach(u => {
      if (!root.Tokens) return;
      const t = root.Tokens.make({
        source: u.entKind === 'form' ? 'form' : 'npc', name: u.name, side: u.side,
        entKind: u.entKind, hp: u.hpMax, max: u.hpMax, bodies: u.bodies, hpea: u.hpea,
        dmg: u.dmg, skl: u.skl, def: u.def, lead: u.lead, look: u.look, fig: u.fig,
        src: u.src, art: u.art, info: u.info, x: 0, y: 0 });
      t.in = sc.id; t.lineKey = u.line;
      if (t.ent) { t.ent.col = u.col; const l = sc.lines.find(x => x.key === u.line); if (l) t.ent.side = l.side; }
    });
    T().activate(sc.id);
  } finally { T().end(); }
  T().changed('encounter');
  frameFight();
  say(e.name + ' is on the table');
  return sc;
}

function say(t) { if (root.Inspector) root.Inspector.said(t); }

/* THE MUSTER FIRST, THEN THE CAMERA. Opening the muster narrows the table's
   view (14-war.css), so framing the fight before it opened framed it for a
   view that no longer existed — small, and off to one side. */
function frameFight() {
  if (root.Muster) root.Muster.open();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = doc.getElementById('combat-prop');
    if (el && el.style.display !== 'none' && root.Table3D) root.Table3D.frame(el);
  }));
}

/* ══ THE WAR ROOM ═════════════════════════════════════════════
   Where a fight is made before the evening. A roll of the fights you have
   made down the left; the one you are working on laid out as the mat is —
   enemy at the top, allies at the bottom, the Line between — with the
   brush you are painting with above it; and on the right, the counter
   you have chosen, on the same workbench the toolbox builds counters on. */
let room = null, cur = null, brush = { kind: 'unit' }, pick = null, stock = null;

function openRoom() {
  if (!T().mayUseBox()) return;
  if (root.Toolbox && root.Toolbox.isOpen()) root.Toolbox.shut();
  if (!room) {
    room = doc.createElement('div');
    room.className = 'war';
    room.id = 'war';
    doc.body.appendChild(room);
    room.addEventListener('pointerdown', e => e.stopPropagation());
    room.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    room.addEventListener('keydown', e => {
      if (e.target.matches && e.target.matches('input,textarea')) e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRoom(); }
    });
    /* its own, and kept from the board's document handlers — see 72-muster.js */
    room.addEventListener('click', e => { onClick(e); e.stopPropagation(); });
    room.addEventListener('input', onInput);
  }
  room.hidden = false;
  doc.body.classList.add('war-on');
  if (!cur) { const l = list(); cur = l.length ? clean(JSON.parse(JSON.stringify(l[0]))) : null; }
  if (!stock) stock = freshUnit('en');
  paint();
}
function closeRoom() {
  if (!room) return;
  if (cur && dirty) commit();
  if (root.Workbench && root.Workbench.current && root.Workbench.current.hooks.bare) root.Workbench.close();
  room.hidden = true;
  doc.body.classList.remove('war-on');
}
let dirty = false;
function commit() { if (!cur) return; cur = save(cur); dirty = false; }
function touch() { dirty = true; clearTimeout(touch.t); touch.t = setTimeout(() => { if (dirty) { commit(); paintList(); } }, 600); }

const freshUnit = side => ({ name: side === 'al' ? 'Soldier' : 'Enemy', side, entKind: 'unit',
                             hpMax: 10, look: 'standee', fig: '', src: '', art: '', info: '' });
const spanOf = u => u.entKind === 'large' || u.entKind === 'form' ? 2 : 1;

function paint() {
  const T0 = C().TERRAINS;
  room.innerHTML =
    `<div class="war-in">
       <aside class="war-roll">
         <header><b>Prepared fights</b><button class="war-x" data-w="close" title="Close  (Esc)">&#10005;</button></header>
         <button class="war-new" data-w="new">+ A new fight</button>
         <div class="war-list" id="war-list"></div>
       </aside>
       ${cur ? `<main class="war-main">
         <div class="war-top">
           <input class="war-name" id="war-name" value="${esc(cur.name)}" maxlength="40" spellcheck="false">
           <span class="war-sz"><span>Width</span>
             <button class="mu-lz" data-w="w-">&minus;</button><b>${cur.width}</b><button class="mu-lz" data-w="w+">+</button></span>
         </div>
         <div class="war-ters">${C().TERRAIN_ORDER.map(k => {
           const t = T0[k];
           return `<button class="wb-ter${k === cur.terrain ? ' on' : ''}" data-w="ter" data-k="${k}"
              style="--g:${t.mat.ground};--e:${t.mat.edge};--s0:${t.field.sky[0]};--s1:${t.field.sky[2]}"
              title="${esc(t.blurb)}"><i></i><b>${esc(t.name)}</b></button>`; }).join('')}</div>
         <div class="war-brushes">
           <span class="mu-k">Paint with</span>
           <button class="war-b${brush.kind === 'unit' ? ' on' : ''}" data-w="brush" data-k="unit">
             ${root.TokenLook ? root.TokenLook.coin(Object.assign({}, stock, { entKind: stock.entKind }), 22) : ''}
             ${esc(stock.name)}</button>
           ${C().FEATURE_ORDER.map(k => `<button class="war-b mu-brush ft-${k}${brush.kind === k ? ' on' : ''}"
              data-w="brush" data-k="${k}" title="${esc(C().FEATURES[k].note)}"><i></i>${esc(C().FEATURES[k].name)}</button>`).join('')}
           <button class="war-b${brush.kind === 'erase' ? ' on' : ''}" data-w="brush" data-k="erase">Erase</button>
         </div>
         <div class="war-board" id="war-board" style="--mat:${T0[cur.terrain].mat.ground};--mat-en:${T0[cur.terrain].mat.en};--mat-al:${T0[cur.terrain].mat.al};--mat-ink:${T0[cur.terrain].mat.ink}">${board()}</div>
         <textarea class="war-notes" id="war-notes" rows="2" placeholder="Notes for yourself — what this fight is for, what the enemy wants">${esc(cur.notes || '')}</textarea>
         <footer class="war-foot">
           <button class="mu-f go" data-w="bring">Bring it to the table</button>
           <button class="mu-f" data-w="dup">Duplicate</button>
           <button class="mu-f bad" data-w="del">Delete</button>
         </footer>
       </main>
       <aside class="war-side" id="war-side"></aside>` :
       `<main class="war-main war-empty"><p>Nothing prepared yet.</p>
         <button class="mu-f go" data-w="new">Make the first one</button></main>`}
     </div>`;
  paintList();
  paintSide();
}

function paintList() {
  const el = room && room.querySelector('#war-list'); if (!el) return;
  const T0 = C().TERRAINS;
  el.innerHTML = list().map(e => `<button class="war-item${cur && e.id === cur.id ? ' on' : ''}" data-w="open" data-id="${e.id}">
      <i style="background:linear-gradient(180deg,${T0[C().terrainOf(e.terrain)].field.sky[0]},${T0[C().terrainOf(e.terrain)].mat.ground} 60%)"></i>
      <b>${esc(e.name)}</b>
      <small>${esc(T0[C().terrainOf(e.terrain)].name)} &middot; ${(e.units || []).length} on the field</small></button>`).join('')
    || '<p class="war-none">None yet.</p>';
}

/* the mat, as a grid: a row per line, a cell per slot, the Line between
   the halves. A cell shows its unit or its ground. */
function board() {
  const w = cur.width;
  const at = {};
  cur.units.forEach((u, i) => { for (let c = u.col; c < u.col + spanOf(u); c++) at[u.line + ':' + c] = { u, i, head: c === u.col }; });
  const ft = {}; cur.features.forEach(f => { ft[f.line + ':' + f.col] = f; });
  let prev = null;
  return cur.lines.map(l => {
    const mid = prev && prev !== l.side ? '<div class="war-mid"><span>The Line</span></div>' : '';
    prev = l.side;
    let cells = '';
    for (let c = 0; c < w; c++) {
      const k = l.key + ':' + c, o = at[k], f = ft[k];
      if (o && !o.head) continue;
      if (o) {
        const u = o.u;
        cells += `<button class="war-c unit ${u.side === 'al' ? 'al' : 'en'}${pick === o.i ? ' on' : ''}" data-w="cell"
          data-line="${l.key}" data-col="${c}" style="grid-column:span ${spanOf(u)}" title="${esc(u.name)}">
          ${root.TokenLook ? root.TokenLook.coin(Object.assign({}, u, { side: u.side }), 34) : ''}
          <b>${esc(u.name)}</b>${f ? `<i class="onft ft-${f.kind}"></i>` : ''}</button>`;
      } else {
        cells += `<button class="war-c${f ? ' ft ft-' + f.kind : ''}" data-w="cell" data-line="${l.key}" data-col="${c}"
          ${f ? `title="${esc(C().FEATURES[f.kind].name)}"` : ''}>${f ? '<i></i>' : ''}</button>`;
      }
    }
    return mid + `<div class="war-row ${l.side === 'al' ? 'al' : 'en'}"><span class="war-lbl">${esc(l.label)}</span>
      <div class="war-cells" style="grid-template-columns:repeat(${w},1fr)">${cells}</div></div>`;
  }).join('');
}

/* the right-hand side: the counter you are painting with, or the one you
   picked, on the workbench */
function paintSide() {
  const side = room && room.querySelector('#war-side'); if (!side || !root.Workbench) return;
  const picked = pick != null ? cur.units[pick] : null;
  const target = picked || stock;
  side.innerHTML = `<header><b>${picked ? 'On the field' : 'Your brush'}</b>
      <small>${picked ? 'Changes this one only' : 'What a click on an empty slot puts down'}</small></header>
      <div class="war-bench" id="war-bench"></div>
      ${picked ? `<div class="war-sideacts">
        <button class="mu-f" data-w="asbrush">Paint more like this</button>
        <button class="mu-f bad" data-w="unpick">Remove it</button></div>` : ''}`;
  root.Workbench.open(side.querySelector('#war-bench'),
    { offer: { kind: 'token', name: target.name }, v: target },
    { bare: true, changed: v => { if (picked) { touch(); repaintBoard(); } else { repaintBrushes(); } } });
}
function repaintBoard() { const b = room.querySelector('#war-board'); if (b) b.innerHTML = board(); }
function repaintBrushes() {
  const b = room.querySelector('.war-b[data-k="unit"]');
  if (b && root.TokenLook) b.innerHTML = root.TokenLook.coin(stock, 22) + ' ' + esc(stock.name);
}

/* ══ PAINTING THE FIELD ═══════════════════════════════════════ */
function fits(line, col, span, ignore) {
  if (col < 0 || col + span > cur.width) return false;
  for (let c = col; c < col + span; c++) {
    if (cur.units.some((u, i) => i !== ignore && u.line === line && c >= u.col && c < u.col + spanOf(u))) return false;
    const f = cur.features.find(x => x.line === line && x.col === c);
    if (f && C().FEATURES[f.kind].blocks) return false;
  }
  return true;
}
function cell(line, col) {
  const l = cur.lines.find(x => x.key === line); if (!l) return;
  const hit = cur.units.findIndex(u => u.line === line && col >= u.col && col < u.col + spanOf(u));
  if (brush.kind === 'erase') {
    if (hit >= 0) { cur.units.splice(hit, 1); if (pick === hit) pick = null; }
    else cur.features = cur.features.filter(f => !(f.line === line && f.col === col));
    touch(); repaintBoard(); paintSide(); return;
  }
  if (brush.kind !== 'unit') {
    const now = cur.features.find(f => f.line === line && f.col === col);
    cur.features = cur.features.filter(f => !(f.line === line && f.col === col));
    if (!now || now.kind !== brush.kind) {
      if (!(C().FEATURES[brush.kind].blocks && hit >= 0)) cur.features.push({ line, col, kind: brush.kind });
    }
    touch(); repaintBoard(); return;
  }
  if (hit >= 0) { pick = pick === hit ? null : hit; repaintBoard(); paintSide(); return; }
  /* nobody stands in an obstacle — the click is refused, not moved along */
  const here = cur.features.find(f => f.line === line && f.col === col);
  if (here && C().FEATURES[here.kind].blocks) { say('Nobody can stand there'); return; }
  /* a new one, like the brush, on the side of the line it is put on */
  const u = Object.assign(JSON.parse(JSON.stringify(stock)), { line, col, side: l.side });
  let at = col;
  if (!fits(line, at, spanOf(u))) at = col - 1;
  if (!fits(line, at, spanOf(u))) { say('No room there'); return; }
  u.col = at;
  cur.units.push(u);
  pick = null;
  touch(); repaintBoard(); paintSide();
}

function onClick(ev) {
  const b = ev.target.closest('[data-w]'); if (!b) return;
  const w = b.dataset.w;
  if (w === 'close') { closeRoom(); return; }
  if (w === 'new') { if (cur && dirty) commit(); cur = blank(); pick = null; commit(); paint(); return; }
  if (w === 'open') { if (cur && dirty) commit(); const e = get(b.dataset.id); cur = e ? clean(JSON.parse(JSON.stringify(e))) : null; pick = null; paint(); return; }
  if (!cur) return;
  if (w === 'ter') { cur.terrain = b.dataset.k; touch(); paint(); return; }
  if (w === 'w+' || w === 'w-') {
    const nw = Math.max(3, Math.min(14, cur.width + (w === 'w+' ? 1 : -1)));
    if (nw < cur.width && cur.units.some(u => u.col + spanOf(u) > nw)) { say('Somebody is standing in the last column'); return; }
    cur.width = nw;
    cur.features = cur.features.filter(f => f.col < nw);
    touch(); paint(); return;
  }
  if (w === 'brush') { brush = { kind: b.dataset.k }; pick = null; paint(); return; }
  if (w === 'cell') { cell(b.dataset.line, +b.dataset.col); return; }
  if (w === 'asbrush' && pick != null) {
    const u = cur.units[pick];
    stock = JSON.parse(JSON.stringify(u)); delete stock.line; delete stock.col;
    brush = { kind: 'unit' }; pick = null; paint(); return;
  }
  if (w === 'unpick' && pick != null) { cur.units.splice(pick, 1); pick = null; touch(); paint(); return; }
  if (w === 'bring') { commit(); const id = cur.id; closeRoom(); toTable(id); return; }
  if (w === 'dup') { commit(); const c = JSON.parse(JSON.stringify(cur)); c.id = uid(); c.name = (c.name + ' (again)').slice(0, 40); cur = save(c); paint(); return; }
  if (w === 'del') {
    if (!root.confirm('Delete ' + cur.name + '?')) return;
    remove(cur.id); dirty = false;
    const l = list(); cur = l.length ? clean(JSON.parse(JSON.stringify(l[0]))) : null; pick = null; paint(); return;
  }
}
function onInput(ev) {
  if (!cur) return;
  if (ev.target.id === 'war-name') { cur.name = ev.target.value; touch(); }
  if (ev.target.id === 'war-notes') { cur.notes = ev.target.value; touch(); }
}

root.Encounters = { list, get, save, remove, blank, fromScene, toTable, keepInPreset,
                    room: openRoom, close: closeRoom, KEY };

})(window, document);
