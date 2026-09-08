/* ══════════════════════════════════════════════════════════════
   21-table-model.js — WHAT IS ON THE TABLE.

   No DOM in this file. It holds the state, it is the only thing
   that writes it, and it tells whoever is listening that it
   changed. That is what makes it testable in plain node and what
   keeps the view from becoming a second source of truth.

   The rules it enforces, all of them stated by grumkata:

   · A new table is EMPTY. The box and the bin are furniture,
     not contents — they are not things and never in `things`.
   · ONE SCENE IS ACTIVE AT A TIME. Others may sit on the table
     dormant; activating one stands the last one down.
   · A PIECE HAS ONE HOME. A token is the character's body in the
     world — one object, one place. `in` names its home: null for
     bare wood, or a scene's id.
   · THE BIN IS A BIN, NOT A DELETE. It keeps what you put in it
     and you can reach back in.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const Content = root.TableContent ||
  (typeof require !== 'undefined' ? require('./21-table-content.js') : null);

const KEY = id => 'monarchy.table.' + id + '.v1';
const BIN_KEEPS = 12;

let uidn = 0;
const uid = p => p + Date.now().toString(36) + (++uidn).toString(36) +
                 Math.random().toString(36).slice(2, 5);

function blankTable(id) {
  return {
    id: id || 'table',
    version: 1,
    things: [],      /* everything on the wood */
    bin: [],         /* what was taken off it, newest first */
    active: null,    /* the one scene being run */
    sel: null,       /* the one thing you are pointing at, if any */
    /* ── WHO IS SITTING HERE ──────────────────────────────────
       A seat is a place at the table, not a character and not a
       connected player: it is the chair, the face above it and the
       banner behind it, and it belongs to THIS table, so it saves and
       loads and undoes with everything else on the wood.

       `at` is an angle round the rim in degrees, 0 being the far side
       and going clockwise, so the seats are described the way you would
       describe them out loud rather than in table coordinates. */
    seats: [],
    z: 1             /* next stacking order */
  };
}

/* ══ THE STORE ════════════════════════════════════════════════ */
const T = {
  state: blankTable('table'),
  _subs: [],

  /* ── HISTORY ──────────────────────────────────────────────────
     Every change to the table went straight into the state and could
     never be taken back: the only undo in the whole app was the last
     thing you binned. So an accidental nudge, an accidental resize —
     and the wheel resizes whatever it is over — was permanent, which
     is most of why the table felt like something to be careful around
     rather than something to play with.

     Entries are PATCHES, not copies of the table: a picture on the
     wood is megabytes of base64 and snapshotting the whole state on
     every drag would cost more than the feature is worth.
        { k:'set',  id, before:{...}, after:{...} }
        { k:'put',  id }                       undo removes it
        { k:'bin',  thing, at }                undo puts it back
     A drag is one entry, not sixty, because 23-table3d.js opens a
     group around the gesture and closes it on pointerup.           */
  _past: [], _future: [], _group: null, _depth: 0, _quiet: false,
  HIST_MAX: 120,

  _push(e) {
    if (this._quiet) return;
    if (this._group) { this._group.push(e); return; }
    /* A RUN OF SMALL STEPS IS ONE ACTION. Sizing a piece with the wheel
       sends an event per notch; without this, undoing a resize would take
       as many presses as the resize took notches. Same id, same fields,
       inside a second — fold it into the entry already there. */
    const last = this._past[this._past.length - 1];
    if (last && last.length === 1 && e.k === 'set' && last[0].k === 'set' &&
        last[0].id === e.id && this._joinT && Date.now() - this._joinT < 900 &&
        Object.keys(last[0].after).join() === Object.keys(e.after).join()) {
      Object.assign(last[0].after, e.after);   /* keep the oldest `before` */
      this._joinT = Date.now();
      this._future.length = 0;
      return;
    }
    this._joinT = Date.now();
    this._past.push([e]);
    if (this._past.length > this.HIST_MAX) this._past.shift();
    this._future.length = 0;
  },
  /* everything between begin() and end() undoes as one action */
  begin() { if (this._depth++ === 0) this._group = []; },
  end() {
    if (--this._depth > 0) return;
    const g = this._group; this._group = null;
    if (g && g.length) {
      this._past.push(g);
      if (this._past.length > this.HIST_MAX) this._past.shift();
      this._future.length = 0;
    }
  },
  /* a `set` records only the fields that actually moved */
  _set(t, fields) {
    const before = {}, after = {};
    let moved = false;
    for (const k in fields) {
      if (t[k] === fields[k]) continue;
      before[k] = t[k]; after[k] = fields[k]; t[k] = fields[k]; moved = true;
    }
    if (moved) this._push({ k:'set', id:t.id, before, after });
    return moved;
  },
  _apply(e, dir) {
    const side = dir === 'undo' ? 'before' : 'after';
    if (e.k === 'set') {
      const t = this.get(e.id); if (!t) return;
      Object.assign(t, e[side]);
    } else if (e.k === 'put') {
      if (dir === 'undo') {
        const i = this.state.things.findIndex(x => x.id === e.id);
        if (i >= 0) e.thing = this.state.things.splice(i, 1)[0];
        if (this.state.active === e.id) this.state.active = null;
        if (this.state.sel === e.id) this.state.sel = null;
      } else if (e.thing) {
        this.state.things.push(e.thing);
      }
    } else if (e.k === 'bin') {
      if (dir === 'undo') {
        this.state.things.splice(Math.min(e.at, this.state.things.length), 0, e.thing);
        (e.freed || []).forEach(id => { const x = this.get(id); if (x) x.in = e.thing.id; });
        if (e.wasActive) this.state.active = e.thing.id;
        /* AND TAKE IT OUT OF THE BIN. The bin keeps the last thing removed so
           `undoBin` can reach it; leaving it there after the history has
           already put the piece back means it can be restored a second time
           and end up on the table twice. */
        this.state.bin = (this.state.bin || []).filter(t => t.id !== e.thing.id);
      } else {
        const i = this.state.things.findIndex(x => x.id === e.thing.id);
        if (i >= 0) this.state.things.splice(i, 1);
        (e.freed || []).forEach(id => { const x = this.get(id); if (x) x.in = null; });
        if (this.state.active === e.thing.id) this.state.active = null;
        this.state.bin = [e.thing];
      }
    }
  },
  canUndo() { return this._past.length > 0; },
  canRedo() { return this._future.length > 0; },
  undo() {
    const g = this._past.pop(); if (!g) return false;
    this._quiet = true;
    for (let i = g.length - 1; i >= 0; i--) this._apply(g[i], 'undo');
    this._quiet = false;
    this._future.push(g);
    this.changed('undo'); return true;
  },
  redo() {
    const g = this._future.pop(); if (!g) return false;
    this._quiet = true;
    g.forEach(e => this._apply(e, 'redo'));
    this._quiet = false;
    this._past.push(g);
    this.changed('redo'); return true;
  },

  /* ── WHICH ONE YOU MEAN ───────────────────────────────────────
     The table had no selection at all, so there was no way to name a
     piece — which is why every single operation had to become its own
     mouse gesture, and why the gestures then collided. With a
     selection, Delete deletes, the arrows nudge, and anything added
     later has something to act on.                                */
  select(id) {
    const t = id ? this.get(id) : null;
    const next = t ? t.id : null;
    if (this.state.sel === next) return false;
    this.state.sel = next;
    this._subs.forEach(f => { try { f(this.state, 'select'); } catch (e) {} });
    return true;
  },
  selected() { return this.get(this.state.sel); },

  /* ── listening ── */
  on(fn) { this._subs.push(fn); return () => this.off(fn); },
  off(fn) { const i = this._subs.indexOf(fn); if (i >= 0) this._subs.splice(i, 1); },
  /* ── TELLING EVERYONE, AND WRITING IT DOWN ────────────────────
     `changed` used to call save() first and synchronously, so every
     single change — every drop, every scale notch, every rename —
     stringified the WHOLE table before anything was drawn. A table
     with pictures on it is megabytes of base64, and that cost was
     paid in the middle of the gesture, every time.

     The listeners run immediately, because that is what draws. The
     write is coalesced onto the next idle moment: a burst of changes
     costs one save instead of thirty, and nothing is lost because the
     state being written is the live object either way.            */
  changed(why) {
    this._subs.forEach(f => { try { f(this.state, why); } catch (e) {} });
    this.saveSoon();
  },
  _saveT: 0,
  saveSoon() {
    if (this._saveT) return;
    const run = () => { this._saveT = 0; this.save(); };
    this._saveT = (typeof root.requestIdleCallback === 'function')
      ? root.requestIdleCallback(run, { timeout: 400 })
      : setTimeout(run, 120);
  },
  /* write it down NOW: leaving the table, closing the window, or anything
     else that means there may not be an idle moment left */
  flush() {
    if (!this._saveT) { this.save(); return; }
    if (typeof root.cancelIdleCallback === 'function') { try { root.cancelIdleCallback(this._saveT); } catch (e) {} }
    clearTimeout(this._saveT);
    this._saveT = 0;
    this.save();
  },

  /* ── persistence ── */
  load(id) {
    /* the table being left has to be written down before it is replaced */
    if (this.state && this.state.things.length) this.flush();
    this.state = blankTable(id);
    try {
      const raw = root.localStorage && root.localStorage.getItem(KEY(this.state.id));
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.things)) {
          this.state = Object.assign(blankTable(id), d);
          if (!Array.isArray(this.state.bin)) this.state.bin = [];
          /* an active id that no longer names anything is not active */
          if (!this.get(this.state.active)) this.state.active = null;
          /* a table saved before setup was coerced holds strings; fix it
             on the way in rather than making every reader defensive */
          this.state.things.forEach(t => {
            if (t.kind === 'scene') t.setup = Content.coerceSetup(t.scene, t.setup);
          });
        }
      }
    } catch (e) {}
    /* a fresh table is a fresh history — you cannot undo into the last one */
    this._past.length = 0; this._future.length = 0;
    this._group = null; this._depth = 0; this._quiet = false;
    this.state.sel = null;
    this._packZ();
    this._subs.forEach(f => { try { f(this.state, 'load'); } catch (e) {} });
    return this.state;
  },
  /* ── SAVING, AND SAYING SO WHEN IT FAILS ──────────────────────
     This was `catch (e) {}` — completely empty. localStorage is five
     megabytes for the whole origin and a single large picture can
     exceed it on its own, so the table would quietly stop saving and
     the next reload came back empty with nothing ever having said a
     word. A save that fails now says so, once, loudly enough to act
     on and not so often that it becomes noise.                     */
  saveFailed: false,
  save() {
    try {
      if (!root.localStorage) return;
      root.localStorage.setItem(KEY(this.state.id), JSON.stringify(this.state));
      this.saveFailed = false;
    } catch (e) {
      const full = e && (e.name === 'QuotaExceededError' ||
                         e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
      if (!this.saveFailed) {
        this.saveFailed = true;
        const msg = full
          ? 'THIS TABLE IS NO LONGER SAVING — the browser store is full. ' +
            'Bin a picture or two, or export the table, before you reload.'
          : 'This table is no longer saving: ' + (e && e.message || 'unknown error');
        try { console.error('[monarchy] ' + msg, e); } catch (_) {}
        try { root.dispatchEvent(new CustomEvent('monarchy:savefail',
              { detail: { full: !!full, message: msg } })); } catch (_) {}
      }
    }
  },

  /* ── reading ── */
  get(id) { return id ? this.state.things.find(t => t.id === id) || null : null; },
  all() { return this.state.things.slice(); },

  /* ── SEATS ────────────────────────────────────────────────────
     Deliberately not `things`. A thing is on the wood: it can be
     dragged, binned, put in a scene, stacked. A seat is where somebody
     sits — it has no z, it cannot be picked up, and the bin would make
     no sense of it. Same table, same save, its own list. */
  seats() { return (this.state.seats || []).slice(); },
  seat(id) { return (this.state.seats || []).find(s => s.id === id) || null; },

  /* Evenly spaced unless you say otherwise, because the first thing
     anybody does is add four seats and expect them to be arranged. */
  addSeat(spec) {
    spec = spec || {};
    const list = this.state.seats || (this.state.seats = []);
    const s = { id: 'seat-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                name: spec.name || 'Empty chair',
                at: spec.at == null ? 0 : spec.at,
                face: spec.face || '', banner: spec.banner || '' };
    list.push(s);
    if (spec.at == null) this.spaceSeats();
    this.changed('seats');
    return s;
  },
  setSeat(id, fields) {
    const s = this.seat(id);
    if (!s) return null;
    Object.assign(s, fields);
    this.changed('seats');
    return s;
  },
  dropSeat(id) {
    const list = this.state.seats || [];
    const i = list.findIndex(s => s.id === id);
    if (i < 0) return false;
    list.splice(i, 1);
    this.spaceSeats();
    this.changed('seats');
    return true;
  },
  /* One place is special: the near side of the table is YOURS, because
     that is where the camera sits when you lean back. So the seats are
     dealt round from the far side and the gap is left at 180. */
  spaceSeats() {
    const list = this.state.seats || [];
    const n = list.length;
    if (!n) return;
    /* 220, not 300. Three hundred degrees put the outer two chairs at
       plus and minus 150 — which is beside and slightly behind your own
       shoulder, so you saw them edge-on and the table looked surrounded
       rather than sat at. Everyone goes on the far arc; the near third
       of the table is yours. */
    const span = 220;
    for (let i = 0; i < n; i++)
      list[i].at = n === 1 ? 0 : -span / 2 + span * (i / (n - 1));
  },
  scenes() { return this.state.things.filter(t => t.kind === 'scene'); },
  activeScene() { return this.get(this.state.active); },
  /* everything whose home is this scene */
  inside(sceneId) { return this.state.things.filter(t => t.in === sceneId); },
  isEmpty() { return this.state.things.length === 0; },

  /* ── putting something on the table ── */
  put(spec) {
    const t = Object.assign({
      id: uid(spec.kind ? spec.kind[0] : 't'),
      kind: 'note',
      name: '',
      x: 0, y: 0,          /* where on the wood */
      w: 260, h: 180,
      scale: 1,
      rot: 0,
      z: this.state.z++,
      in: null,            /* its one home: null = bare wood */
      locked: false
    }, spec);

    if (t.kind === 'scene') {
      /* coerced here, at the one door into the model, so no caller can
         put a string where the rules expect a number */
      t.setup = Content.coerceSetup(t.scene, spec.setup);
      t.options = Object.assign(Content.defaultOptions(t.scene), spec.options || {});
      t.name = t.name || (Content.SCENES[t.scene] || {}).name || 'Scene';
    }
    this.state.things.push(t);
    this._push({ k: 'put', id: t.id });
    this.changed('put');
    return t;
  },

  /* ── moving it about ── */
  /* ── SNAP ─────────────────────────────────────────────────────
     Placement was free-float in a 2600-unit perspective space, so two
     things put side by side were never level and could not be made
     level. GRID is small enough to be invisible at the fit zoom and
     big enough that things line up. Hold Shift to place off-grid. */
  GRID: 20,
  snap(v) { const g = this.GRID; return g > 1 ? Math.round(v / g) * g : Math.round(v); },

  move(id, x, y, opts) {
    const t = this.get(id); if (!t || t.locked) return false;
    const free = opts && opts.free;
    const nx = free ? Math.round(x) : this.snap(x);
    const ny = free ? Math.round(y) : this.snap(y);
    if (!this._set(t, { x: nx, y: ny })) return true;
    this.changed('move'); return true;
  },
  /* the arrow keys: one grid step, or one unit with Shift down */
  nudge(id, dx, dy, fine) {
    const t = this.get(id); if (!t || t.locked) return false;
    const k = fine ? 1 : this.GRID;
    if (!this._set(t, { x: Math.round(t.x + dx * k), y: Math.round(t.y + dy * k) })) return true;
    this.changed('move'); return true;
  },
  scaleTo(id, k) {
    const t = this.get(id); if (!t || t.locked) return false;
    /* `+k || 1` would turn a scale of 0 into 1, because 0 is falsy —
       the clamp has to see the real number */
    const v = Number(k);
    const want = Math.max(0.25, Math.min(4, Number.isFinite(v) ? v : 1));
    if (!this._set(t, { scale: want })) return true;
    this.changed('scale'); return true;
  },
  /* ── DEPTH, BOTH WAYS ─────────────────────────────────────────
     `raise` was the whole of z-order and `state.z` only ever counted
     up, so a thing could be put in front of another and never behind
     it. A stacking mistake could only be answered by raising
     something else, which made the next mistake.                   */
  raise(id) {
    const t = this.get(id); if (!t) return false;
    if (!this._set(t, { z: this.state.z++ })) return true;
    this.changed('raise'); return true;
  },
  lower(id) {
    const t = this.get(id); if (!t) return false;
    const under = this.state.things.reduce((m, x) => Math.min(m, x.z || 0), t.z || 0);
    if (!this._set(t, { z: under - 1 })) return true;
    this.changed('raise'); return true;
  },
  toFront(id) { return this.raise(id); },
  toBack(id)  { return this.lower(id); },
  /* z climbed for ever across sessions; pack it down on load so the
     numbers stay small and comparisons stay honest */
  _packZ() {
    const ts = this.state.things.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
    ts.forEach((t, i) => { t.z = i + 1; });
    this.state.z = ts.length + 1;
  },
  rename(id, name) {
    const t = this.get(id); if (!t) return false;
    if (!this._set(t, { name: String(name || '') })) return true;
    this.changed('rename'); return true;
  },

  /* ── a piece has one home ────────────────────────────────────
     Moving between homes is the ONLY way a token changes what it
     is: on bare wood it is standing there, in a combat scene it
     is a combatant, in an exploration scene it is an explorer.  */
  homeTo(id, sceneId) {
    const t = this.get(id); if (!t || t.kind === 'scene') return false;
    if (sceneId && !this.get(sceneId)) return false;
    if (!this._set(t, { in: sceneId || null })) return true;
    this.changed('home'); return true;
  },

  /* ── one scene runs at a time ── */
  activate(id) {
    const t = this.get(id);
    if (!t || t.kind !== 'scene') return false;
    this.state.active = t.id;
    this.changed('activate'); return true;
  },
  deactivate() {
    if (!this.state.active) return false;
    this.state.active = null;
    this.changed('deactivate'); return true;
  },

  /* ── options belong to the thing they are options OF ── */
  setOption(id, key, value) {
    const t = this.get(id);
    if (!t || t.kind !== 'scene') return false;
    const kind = Content.SCENES[t.scene];
    if (!kind || kind.options.indexOf(key) < 0) return false;  /* not one this scene has */
    const def = Content.OPTIONS[key];
    let v = value;
    if (def.type === 'bool') v = !!v;
    if (def.type === 'number') {
      v = Math.max(def.min == null ? -Infinity : def.min,
          Math.min(def.max == null ? Infinity : def.max, parseInt(v, 10) || 0));
    }
    if (def.type === 'choice' && !def.choices.some(c => c[0] === v)) return false;
    t.options[key] = v;
    this.changed('option'); return true;
  },
  setSetup(id, key, value) {
    const t = this.get(id);
    if (!t || t.kind !== 'scene') return false;
    const kind = Content.SCENES[t.scene];
    const field = kind && kind.setup.find(f => f.key === key);
    if (!field) return false;
    t.setup[key] = Content.coerceField(field, value);
    this.changed('setup'); return true;
  },

  /* ── THE BIN IS A BIN, NOT A DRAWER ──────────────────────────
     grumkata: "from the bin there should be no ui, just when you drag it
     take the most recently binned item and deletes it".

     It used to KEEP twenty things and open a tray you browsed through,
     which quietly made the bin a second container of stuff to manage — the
     opposite of what a bin is for. It deletes now. What goes in is off the
     table and out of what gets saved.

     Exactly one thing is held back, and NOTHING shows it: the last one, so
     Ctrl+Z can put it back. Losing a whole combat scene because you let go
     two inches wide of where you meant to should not end an evening. A
     keystroke is not a user interface.                                    */
  bin(id) {
    const i = this.state.things.findIndex(t => t.id === id);
    if (i < 0) return false;
    const t = this.state.things.splice(i, 1)[0];
    /* whatever lived in a binned scene comes back out onto the wood */
    const freed = [];
    this.state.things.forEach(x => { if (x.in === t.id) { freed.push(x.id); x.in = null; } });
    const wasActive = this.state.active === t.id;
    if (wasActive) this.state.active = null;
    if (this.state.sel === t.id) this.state.sel = null;
    this.state.bin = [t];                     /* one, and only for undo */
    this._push({ k: 'bin', thing: t, at: i, freed: freed, wasActive: wasActive });
    this.changed('bin'); return true;
  },
  /* the one step back. Returns what came back, or null. */
  undoBin() {
    if (!this.state.bin.length) return null;
    const t = this.state.bin.pop();
    t.z = this.state.z++;
    this.state.things.push(t);
    this.changed('unbin'); return t;
  },
  unbin(id) {
    const i = this.state.bin.findIndex(t => t.id === id);
    if (i < 0) return false;
    const t = this.state.bin.splice(i, 1)[0];
    t.z = this.state.z++;
    this.state.things.push(t);
    this.changed('unbin'); return true;
  },
  emptyBin() { this.state.bin = []; this.changed('emptybin'); return true; },

  /* ── who may use the box ─────────────────────────────────────
     Solo play has no session and no roles, so you are the GM of
     your own table. In a session, the GM and anyone handed the
     assistant's key.                                            */
  mayUseBox() {
    /* 09-session-sync.js declares `let _sessionRole` at the top level of a
       classic script. That is a SCRIPT-scoped binding, not a property of
       window — `root._sessionRole` reads undefined no matter who is at the
       table, so the gate silently never closed. Read the binding by name,
       the way 15-app-shell.js does; `typeof` keeps this file loadable in
       plain node, where the name does not exist at all. */
    const r = (typeof _sessionRole !== 'undefined' && _sessionRole)
      ? _sessionRole
      : root._sessionRole;
    if (!r) return true;              /* solo play: your own table, your box */
    return r === 'gm' || r === 'assistant';
  }
};

root.TableModel = T;

/* Saving is coalesced onto an idle moment, so anything that means there may
   not be another one has to write it down first. */
if (root.addEventListener) {
  root.addEventListener('beforeunload', () => T.flush());
  root.addEventListener('pagehide', () => T.flush());
  doc_visibility();
  function doc_visibility() {
    try {
      root.document.addEventListener('visibilitychange', () => {
        if (root.document.visibilityState === 'hidden') T.flush();
      });
    } catch (e) {}
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = T;

})(typeof window !== 'undefined' ? window : globalThis);
