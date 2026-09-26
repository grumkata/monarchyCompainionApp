/* ══════════════════════════════════════════════════════════════
   66-workbench.js — EVERYTHING A THING CAN BE, BEFORE IT IS DOWN.

   grumkata: "we need the ability to add things to the table to be more
   custmisable BEFORE Placing them."

   Until now the only choice you could make before letting go of
   something was whatever the mouse wheel cycled — a counter's side, a
   note's colour, a battlefield's width — and everything else was done
   after, if it could be done at all: a tree came in one size and faced
   one way, a note landed blank and had to be double-clicked open, a
   counter's picture was a separate panel that floated beside your hand.

   So every kind has a BENCH. The thing sits on it large, and every
   choice it has is laid out beside it, and the thing changes as you
   choose. When it looks right you take it — into your hand over the
   wood, or straight into the middle of the table.

   THE SAME BENCH EDITS A THING THAT IS ALREADY DOWN (67-inspector.js's
   Edit, or double-clicking a counter's name tag). A bench you can only
   use once is a form you fill in and lose; this one is how the thing
   is changed for as long as it is on the table, and every change is one
   undoable step (TableModel.edit, Tokens.edit, setSetup).

   The controls are Blazon's three (STYLE.md §6⅔): a choice is a row of
   pennons, a number is a tally between two lozenges, and a picture is a
   grid of the pictures themselves. No <select>, no checkbox.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T  = () => root.TableModel;
const F  = () => root.Figures;
const TL = () => root.TokenLook;
const C  = () => root.TableContent;

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let host = null;        /* the element the bench is drawn into */
let cur = null;         /* { offer, v, id, hooks } */

/* ══ WHAT EACH KIND OFFERS ════════════════════════════════════
   A field is { f, type, label, ... }. `f` is the key on the variant — the
   object Toolbox.take() reads when the thing is put down. For a thing that
   is already down, read() makes the same object out of it and write()
   sends each change to the model. */
const SIZES_ART   = [[0.6, 'Small'], [1, 'Medium'], [1.6, 'Large'], [2.4, 'Huge']];
const SIZES_MODEL = [[0.6, 'Small'], [1, 'Normal'], [1.5, 'Large'], [2.2, 'Huge']];
const TURNS4 = [[0, 'Upright'], [90, 'Quarter'], [180, 'Upside down'], [270, 'Three quarters']];
const TURNS8 = [0, 45, 90, 135, 180, 225, 270, 315].map(d => [d, d + '°']);

function fieldsFor(o, v, locked) {
  const k = F().keyOf(o);
  if (k === 'token') {
    const form = v.entKind === 'form';
    const leads = (root.Tokens && root.Tokens.LEADS) || ['Stable'];
    return [
      { f: 'name', type: 'text', label: 'Name', locked, max: 28, ph: 'Who is this' },
      { f: 'side', type: 'choice', label: 'Side', choices: [['al', 'Ally'], ['en', 'Enemy']] },
      { f: 'entKind', type: 'choice', label: 'Size', locked,
        choices: [['unit', 'One'], ['large', 'Large'], ['form', 'Formation']] },
      form ? null : { f: 'hpMax', type: 'number', label: 'Health', min: 1, max: 999, locked },
      form ? { f: 'bodies', type: 'number', label: 'Bodies', min: 1, max: 60 } : null,
      form ? { f: 'hpea', type: 'number', label: 'Health each', min: 1, max: 99 } : null,
      form ? { f: 'skl', type: 'text', label: 'Hits on', max: 4, short: 1, ph: '4+' } : null,
      form ? { f: 'dmg', type: 'number', label: 'Damage', min: 0, max: 99 } : null,
      form ? { f: 'def', type: 'text', label: 'Defence', max: 4, short: 1, ph: '5+' } : null,
      form ? { f: 'lead', type: 'choice', label: 'Resolve', choices: leads.map(x => [x, x]) } : null,
      { f: 'look', type: 'choice', label: 'Look', choices: TL() ? TL().LOOKS : [['standee', 'Standee']] },
      { f: 'face', type: 'faces', label: 'Picture' },
      { f: 'info', type: 'area', label: 'Notes', ph: 'Anything you want to remember about them' }
    ].filter(Boolean);
  }
  if (k === 'note') return [
    { f: 'tint', type: 'choice', label: 'Paper',
      choices: [['cream', 'Cream'], ['blue', 'Blue'], ['red', 'Red']] },
    { f: 'title', type: 'text', label: 'Title', max: 40, ph: 'Note' },
    { f: 'text', type: 'area', label: 'Written on it', ph: 'What does it say?' },
    { f: 'rot', type: 'choice', label: 'Lies', choices: [[0, 'Square'], [352, 'Askew'], [8, 'The other way']] }
  ];
  if (k === 'page') return [
    { f: 'rule', type: 'choice', label: 'The page',
      choices: [['set', 'Set text'], ['ruled', 'Ruled'], ['plain', 'Blank']] },
    { f: 'title', type: 'text', label: 'Title', max: 40, ph: 'Page' },
    { f: 'rot', type: 'choice', label: 'Turn', choices: TURNS4 }
  ];
  if (k === 'art') return [
    { f: 'scale', type: 'choice', label: 'Size', choices: SIZES_ART },
    { f: 'rot', type: 'choice', label: 'Turn', choices: TURNS4 }
  ];
  if (k === 'model') return [
    { f: 'scale', type: 'choice', label: 'Size', choices: SIZES_MODEL },
    { f: 'rot', type: 'choice', label: 'Facing', choices: TURNS8 }
  ];
  if (k === 'scene:combat') return [
    { f: 'name', type: 'text', label: 'Name', max: 40, ph: 'Combat' },
    { f: 'terrain', type: 'terrain', label: 'Terrain' },
    { f: 'width', type: 'number', label: 'Battlefield width', min: 3, max: 14,
      hint: 'Slots across. A skirmish is about 5, a pitched battle 12.' }
  ];
  if (k === 'scene:exploration') return [
    { f: 'name', type: 'text', label: 'Name', max: 40, ph: 'Exploration' },
    { f: 'map', type: 'image', label: 'The map' }
  ];
  if (k === 'scene:stage') return [
    { f: 'name', type: 'text', label: 'Name', max: 40, ph: 'Stage' },
    { f: 'backdrop', type: 'image', label: 'Backdrop' },
    { f: 'cast', type: 'text', label: 'Who is in the scene', max: 200, ph: 'names, separated by commas' }
  ];
  return [];
}

/* ══ A THING ALREADY DOWN, AS A VARIANT ═══════════════════════ */
function read(t) {
  if (!t) return null;
  if (t.kind === 'token') {
    const e = t.ent || {};
    return { name: t.name, side: e.side || 'al', entKind: e.kind || 'unit',
             hpMax: e.max, bodies: e.total, hpea: e.hpea, skl: e.skl, dmg: e.dmg,
             def: e.def, lead: e.lead, look: t.look || 'standee',
             src: t.src || '', art: t.art || '', fig: t.fig || '', info: t.info || '' };
  }
  if (t.kind === 'scene') return Object.assign({ name: t.name }, t.setup || {});
  return { tint: t.tint, rule: t.rule, text: t.text || '', title: t.name,
           rot: t.rot || 0, scale: t.scale || 1, model: t.model, art: t.art, src: t.src,
           w: t.w, h: t.h };
}
const offerOf = t => t.kind === 'scene' ? { kind: 'scene', scene: t.scene, name: t.name }
                                        : { kind: t.kind, name: t.name, char: t.char };

/* and one change, sent to the model the way that kind of change is sent */
function write(t, f, val) {
  if (!t) return;
  const M = T();
  if (t.kind === 'token' && root.Tokens) {
    const map = { name: 'name', side: 'side', entKind: 'entKind', hpMax: 'max', bodies: 'bodies',
                  hpea: 'hpea', skl: 'skl', dmg: 'dmg', def: 'def', lead: 'lead',
                  look: 'look', info: 'info' };
    if (f === 'face') root.Tokens.edit(t.id, val);
    else if (map[f]) root.Tokens.edit(t.id, { [map[f]]: val });
    return;
  }
  if (t.kind === 'scene') {
    if (f === 'name') M.rename(t.id, val);
    else M.setSetup(t.id, f, val);
    return;
  }
  if (f === 'title') { M.rename(t.id, val); return; }
  if (f === 'scale') { M.scaleTo(t.id, +val); return; }
  if (f === 'rot') { M.edit(t.id, { rot: +val }); return; }
  M.edit(t.id, { [f]: val });
}

/* ══ OPENING IT ═══════════════════════════════════════════════ */
function open(el, target, hooks) {
  host = el;
  hooks = hooks || {};
  if (target.id) {
    const t = T().get(target.id);
    if (!t) return;
    cur = { id: t.id, offer: offerOf(t), v: read(t), hooks };
  } else {
    const o = target.offer;
    /* a caller may hand in its own object to be edited in place */
    const v = target.v || Object.assign({}, o.v || {});
    if (o.kind === 'token') {
      if (v.name == null) v.name = o.name;
      if (v.look == null) v.look = 'standee';
      if (v.entKind == null) v.entKind = 'unit';
      if (v.hpMax == null && !o.char) v.hpMax = v.entKind === 'form' ? 24 : 10;
      if (v.entKind === 'form') fillForm(v);
      /* a character's counter takes its name and its health from the record,
         so the bench shows those, locked, rather than a number that lies */
      if (o.char && root.Characters) {
        const rec = root.Characters.get(o.char);
        if (rec) { const c = root.Characters.combatant(rec); v.hpMax = c.max; v.name = c.name; }
      }
    }
    if (o.kind === 'scene' && o.scene === 'combat') {
      if (v.width == null) v.width = 8;
      if (v.terrain == null) v.terrain = 'meadow';
    }
    if ((o.kind === 'art' || o.kind === 'model') && v.scale == null) v.scale = 1;
    if (v.rot == null) v.rot = 0;
    if (o.kind === 'note' && v.tint == null) v.tint = 'cream';
    if (o.kind === 'page' && v.rule == null) v.rule = 'set';
    cur = { offer: o, v, hooks };
  }
  paint();
}
function fillForm(v) {
  if (v.bodies == null) v.bodies = 10;
  if (v.hpea == null) v.hpea = 1;
  if (v.dmg == null) v.dmg = 2;
  if (v.skl == null) v.skl = '4+';
  if (v.def == null) v.def = '—';
  if (v.lead == null) v.lead = 'Stable';
}

function close() { cur = null; host = null; }
const editing = () => !!(cur && cur.id);
function repaint() { if (cur && host) paintStage(); }

/* ══ DRAWING IT ═══════════════════════════════════════════════ */
function locked() {
  if (!cur) return false;
  if (cur.id) { const t = T().get(cur.id); return !!(t && t.source === 'char'); }
  return !!cur.offer.char;
}

function paint() {
  if (!cur || !host) return;
  const o = cur.offer, v = cur.v;
  const fields = fieldsFor(o, v, locked());
  const edit = !!cur.id;
  const scene = o.kind === 'scene';
  const title = edit ? 'Editing' : (o.name || 'New');
  /* BARE: just the thing and its choices — the war room (73-encounters.js)
     edits a unit that is not on any table and has nowhere to be taken to */
  if (cur.hooks.bare) {
    host.innerHTML = `<div class="wb bare"><div class="wb-stage" id="wb-stage"></div>
      <div class="wb-fields">${fields.map(field).join('')}</div></div>`;
    paintStage(); wire(); return;
  }
  host.innerHTML =
    `<div class="wb${edit ? ' editing' : ''}">
       <div class="wb-top">
         <button class="wb-back" data-wb="back" title="${edit ? 'Done' : 'Back to the box'}  (Esc)"
           >${edit ? 'Done' : '&lsaquo; Back'}</button>
         <b class="wb-title">${esc(title)}</b>
       </div>
       <div class="wb-stage" id="wb-stage"></div>
       <div class="wb-fields">${fields.map(field).join('')}</div>
       <div class="wb-acts">${edit
         ? (o.kind !== 'scene' ? `<button class="wb-act" data-wb="dup">Duplicate</button>` : '') +
           `<button class="wb-act bad" data-wb="bin">Remove</button>`
         : scene
         ? `<button class="wb-act go" data-wb="place">Set it down</button>`
         : `<button class="wb-act go" data-wb="take" title="Into your hand — then click the table">Take it</button>
            <button class="wb-act" data-wb="place" title="Straight onto the middle of the table">Put in the middle</button>`}
       </div>
     </div>`;
  paintStage();
  wire();
}

/* ── the thing, large ── */
function paintStage() {
  const st = host && host.querySelector('#wb-stage');
  if (!st || !cur) return;
  const o = cur.offer, v = cur.v;
  const k = F().keyOf(o);
  let inner = '';
  if (k === 'token') {
    const who = Object.assign({}, v, { stand: false, plate: '' });
    inner = `<div class="wb-tok">${TL() ? TL().html(who, 170) : F().html(o, who, 170)}
               <span class="wb-plate ${v.side === 'en' ? 'en' : 'al'}"><b>${esc(v.name || o.name || '')}</b>${
                 v.entKind === 'form' ? `<i>${esc(v.bodies || 10)} bodies</i>`
                 : (v.hpMax ? `<i>${esc(v.hpMax)} health</i>` : '')}</span></div>`;
  } else if (k === 'model') {
    const shot = root.TableGL && root.TableGL.thumb
      ? root.TableGL.thumb(v.model, 256, (+v.rot || 0) * Math.PI / 180) : null;
    const s = Math.min(1.25, 0.55 + 0.45 * (+v.scale || 1));
    inner = shot ? `<img class="wb-shot" alt="" src="${esc(shot)}" style="transform:scale(${s.toFixed(3)})">`
                 : F().html(o, v, 180);
  } else if (k === 'note') {
    inner = `<div class="wb-note nt-${esc(v.tint || 'cream')}" style="transform:rotate(${
               (+v.rot > 180 ? +v.rot - 360 : +v.rot) || 0}deg)">
               <b>${esc(v.title || 'Note')}</b><p>${esc(v.text || '')}</p></div>`;
  } else if (k === 'art') {
    const s = Math.min(1.2, 0.5 + 0.35 * (+v.scale || 1));
    inner = `<div class="wb-art" style="transform:rotate(${+v.rot || 0}deg) scale(${s.toFixed(3)})">${
               F().html(o, v, 200)}</div>`;
  } else if (k === 'page') {
    inner = `<div class="wb-page" style="transform:rotate(${+v.rot || 0}deg)">${F().html(o, v, 200)}
               ${v.title ? `<b class="wb-page-t">${esc(v.title)}</b>` : ''}</div>`;
  } else {
    inner = F().html(o, v, 250);
  }
  st.innerHTML = inner;
}

/* ── one field ── */
function field(fd) {
  const v = cur.v, val = v[fd.f];
  const lock = fd.locked ? ' locked' : '';
  let control = '';
  if (fd.type === 'text') {
    control = `<input class="wb-in${fd.short ? ' short' : ''}" data-f="${fd.f}" value="${esc(val == null ? '' : val)}"
                maxlength="${fd.max || 60}" placeholder="${esc(fd.ph || '')}" ${fd.locked ? 'readonly' : ''}
                spellcheck="false">`;
  } else if (fd.type === 'area') {
    control = `<textarea class="wb-area" data-f="${fd.f}" rows="3"
                placeholder="${esc(fd.ph || '')}">${esc(val || '')}</textarea>`;
  } else if (fd.type === 'number') {
    control = `<span class="wb-tally">
        <button type="button" class="wb-step" data-f="${fd.f}" data-step="-1" ${fd.locked ? 'disabled' : ''}>&minus;</button>
        <input class="wb-num" type="number" data-f="${fd.f}" value="${esc(val == null ? '' : val)}"
               min="${fd.min}" max="${fd.max}" ${fd.locked ? 'readonly' : ''}>
        <button type="button" class="wb-step" data-f="${fd.f}" data-step="1" ${fd.locked ? 'disabled' : ''}>+</button>
      </span>`;
  } else if (fd.type === 'choice') {
    control = `<span class="wb-pens">${fd.choices.map(c =>
      `<button type="button" class="wb-pen${String(c[0]) === String(val) ? ' on' : ''}"
         data-f="${fd.f}" data-val="${esc(c[0])}" ${fd.locked ? 'disabled' : ''}>${esc(c[1])}</button>`).join('')}</span>`;
  } else if (fd.type === 'terrain') {
    const Cn = C();
    control = `<span class="wb-terrains">${Cn.TERRAIN_ORDER.map(id => {
      const t = Cn.TERRAINS[id];
      return `<button type="button" class="wb-ter${id === val ? ' on' : ''}" data-f="${fd.f}" data-val="${id}"
                 style="--g:${t.mat.ground};--e:${t.mat.edge};--s0:${t.field.sky[0]};--s1:${t.field.sky[2]}"
                 title="${esc(t.blurb)}"><i></i><b>${esc(t.name)}</b></button>`;
    }).join('')}</span>`;
  } else if (fd.type === 'faces') {
    control = facesHTML();
  } else if (fd.type === 'image') {
    const has = val && String(val).length > 10;
    control = `<span class="wb-img">
        <span class="wb-img-th"${has ? ` style="background-image:url('${esc(val)}')"` : ''}></span>
        <button type="button" class="wb-act" data-img="${fd.f}">${has ? 'Change the picture' : 'Choose a picture&hellip;'}</button>
        ${has ? `<button type="button" class="wb-act bad" data-noimg="${fd.f}">&times;</button>` : ''}
      </span>`;
  }
  return `<div class="wb-field t-${fd.type}${lock}">
      <span class="wb-lbl">${esc(fd.label)}${fd.locked ? ' <i>from their record</i>' : ''}</span>
      ${control}
      ${fd.hint ? `<span class="wb-hint">${esc(fd.hint)}</span>` : ''}
    </div>`;
}

/* ── THE PICTURE A COUNTER WEARS ──────────────────────────────
   The painted figures first — they are what the field stands on the
   battlefield, so a counter wearing one is the same person in both
   places — then a character's own portrait, then every picture anybody
   has brought in, then one more off your computer. */
let faceList = [];
function facesHTML() {
  const v = cur.v;
  faceList = [];
  (TL() ? TL().figures() : []).forEach(f => faceList.push({ kind: 'fig', id: f.id, name: f.name, src: f.src }));
  const rec = cur.offer.char && root.Characters && root.Characters.get(cur.offer.char);
  const own = rec && rec.who && rec.who.pic;
  if (own) faceList.push({ kind: 'pic', name: 'Their portrait', src: own, art: rec.who.picArt || '' });
  if (root.Library) root.Library.art.all().forEach(a => {
    if (/^sprite:/.test(a.id) || !a.src) return;
    faceList.push({ kind: 'art', id: a.id, name: a.name, src: a.src });
  });
  const figNow = TL() ? TL().pic(v).fig : null;
  const isOn = f => f.kind === 'fig' ? (!v.src && !v.art && (v.fig || figNow) === f.id)
                  : f.kind === 'pic' ? (!!v.src && v.src === f.src)
                  : (v.art === f.id);
  return `<span class="wb-faces">${faceList.map((f, i) =>
      `<button type="button" class="wb-face${f.kind === 'fig' ? ' fig' : ' port'}${isOn(f) ? ' on' : ''}"
         data-face="${i}" title="${esc(f.name)}"><i style="background-image:url('${esc(f.src)}')"></i></button>`).join('')}
      <button type="button" class="wb-face own" data-face="own" title="A picture from your computer"><b>+</b></button>
    </span>`;
}
function faceValue(f) {
  if (f.kind === 'fig') return { fig: f.id, src: '', art: '' };
  if (f.kind === 'pic') return { src: f.src, art: f.art || '', fig: '' };
  return { art: f.id, src: f.src, fig: '' };
}

/* ══ CHANGING IT ══════════════════════════════════════════════ */
function set(f, val, repaintAll) {
  if (!cur) return;
  const t = cur.id ? T().get(cur.id) : null;
  if (cur.id && !t) { back(); return; }
  if (f === 'face') Object.assign(cur.v, val);
  else cur.v[f] = val;
  if (f === 'entKind' && val === 'form' && !cur.id) fillForm(cur.v);
  if (t) {
    if (!T().mayTouch || T().mayTouch(t)) write(t, f, val);
    cur.v = read(T().get(cur.id)) || cur.v;
  }
  if (cur.hooks.changed) cur.hooks.changed(cur.v);
  if (repaintAll) paint(); else paintStage();
}

function num(fd, raw) {
  const x = parseInt(raw, 10);
  if (!Number.isFinite(x)) return null;
  return Math.max(fd.min, Math.min(fd.max, x));
}

function wire() {
  const el = host;
  const fields = fieldsFor(cur.offer, cur.v, locked());
  const fd = f => fields.find(x => x.f === f) || {};
  /* keys typed on the bench are the bench's, never the table's */
  el.querySelectorAll('input, textarea').forEach(i => i.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); i.blur(); }
  }));
  el.querySelectorAll('.wb-in, .wb-area').forEach(i => {
    if (i.readOnly) return;
    i.addEventListener('input', () => set(i.dataset.f, i.value));
  });
  el.querySelectorAll('.wb-num').forEach(i => {
    if (i.readOnly) return;
    i.addEventListener('change', () => {
      const n = num(fd(i.dataset.f), i.value);
      if (n != null) { i.value = n; set(i.dataset.f, n); }
    });
  });
  el.querySelectorAll('.wb-step').forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.f, d = fd(f);
    const inp = el.querySelector(`.wb-num[data-f="${f}"]`);
    const n = num(d, (parseInt(inp.value, 10) || 0) + (+b.dataset.step));
    if (n != null) { inp.value = n; set(f, n); }
  }));
  el.querySelectorAll('.wb-pen, .wb-ter').forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.f, d = fd(f);
    let val = b.dataset.val;
    /* a choice whose values are numbers hands back a number */
    if (d.choices && typeof d.choices[0][0] === 'number') val = +val;
    /* changing what a counter IS changes which fields it has */
    const whole = f === 'entKind';
    set(f, val, whole);
    if (!whole) el.querySelectorAll(`.wb-pen[data-f="${f}"], .wb-ter[data-f="${f}"]`).forEach(x =>
      x.classList.toggle('on', x.dataset.val === b.dataset.val));
  }));
  el.querySelectorAll('.wb-face').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.face === 'own') {
      if (!root.Pictures) return;
      root.Pictures.ask(pic => {
        if (!pic) return;
        const kept = root.Library.art.add({ name: pic.name, src: pic.src, w: pic.w, h: pic.h });
        set('face', { art: kept.id, src: pic.src, fig: '' }, true);
      });
      return;
    }
    const f = faceList[+b.dataset.face]; if (!f) return;
    set('face', faceValue(f));
    el.querySelectorAll('.wb-face').forEach(x => x.classList.toggle('on', x === b));
  }));
  el.querySelectorAll('[data-img]').forEach(b => b.addEventListener('click', () => {
    if (!root.Pictures) return;
    root.Pictures.ask(pic => { if (pic && pic.src) set(b.dataset.img, pic.src, true); });
  }));
  el.querySelectorAll('[data-noimg]').forEach(b =>
    b.addEventListener('click', () => set(b.dataset.noimg, '', true)));

  el.querySelectorAll('[data-wb]').forEach(b => b.addEventListener('click', () => act(b.dataset.wb)));
}

function act(what) {
  if (!cur) return;
  const hooks = cur.hooks, o = cur.offer, v = cur.v;
  if (what === 'back') { back(); return; }
  if (what === 'take' && hooks.take) { hooks.take(o, v); return; }
  if (what === 'place' && hooks.place) {
    hooks.place(o, v);
    if (o.kind === 'scene') back();
    return;
  }
  if (what === 'dup' && cur.id) {
    const c = T().duplicate(cur.id);
    if (c) { T().select(c.id); if (root.Inspector) root.Inspector.said('Duplicated'); }
    return;
  }
  if (what === 'bin' && cur.id) {
    const id = cur.id;
    back();
    T().bin(id);
    if (root.Inspector) root.Inspector.said('Removed — Ctrl+Z brings it back');
  }
}
function back() {
  const h = cur && cur.hooks;
  close();
  if (h && h.back) h.back();
}

root.Workbench = { open, close, repaint, editing, fieldsFor, read,
                   get current() { return cur; } };

})(window, document);
