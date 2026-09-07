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
    z: 1             /* next stacking order */
  };
}

/* ══ THE STORE ════════════════════════════════════════════════ */
const T = {
  state: blankTable('table'),
  _subs: [],

  /* ── listening ── */
  on(fn) { this._subs.push(fn); return () => this.off(fn); },
  off(fn) { const i = this._subs.indexOf(fn); if (i >= 0) this._subs.splice(i, 1); },
  changed(why) { this.save(); this._subs.forEach(f => { try { f(this.state, why); } catch (e) {} }); },

  /* ── persistence ── */
  load(id) {
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
    this._subs.forEach(f => { try { f(this.state, 'load'); } catch (e) {} });
    return this.state;
  },
  save() {
    try {
      root.localStorage &&
        root.localStorage.setItem(KEY(this.state.id), JSON.stringify(this.state));
    } catch (e) {}
  },

  /* ── reading ── */
  get(id) { return id ? this.state.things.find(t => t.id === id) || null : null; },
  all() { return this.state.things.slice(); },
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
    this.changed('put');
    return t;
  },

  /* ── moving it about ── */
  move(id, x, y) {
    const t = this.get(id); if (!t || t.locked) return false;
    t.x = Math.round(x); t.y = Math.round(y);
    this.changed('move'); return true;
  },
  scaleTo(id, k) {
    const t = this.get(id); if (!t || t.locked) return false;
    /* `+k || 1` would turn a scale of 0 into 1, because 0 is falsy —
       the clamp has to see the real number */
    const v = Number(k);
    t.scale = Math.max(0.25, Math.min(4, Number.isFinite(v) ? v : 1));
    this.changed('scale'); return true;
  },
  raise(id) {
    const t = this.get(id); if (!t) return false;
    t.z = this.state.z++; this.changed('raise'); return true;
  },
  rename(id, name) {
    const t = this.get(id); if (!t) return false;
    t.name = String(name || ''); this.changed('rename'); return true;
  },

  /* ── a piece has one home ────────────────────────────────────
     Moving between homes is the ONLY way a token changes what it
     is: on bare wood it is standing there, in a combat scene it
     is a combatant, in an exploration scene it is an explorer.  */
  homeTo(id, sceneId) {
    const t = this.get(id); if (!t || t.kind === 'scene') return false;
    if (sceneId && !this.get(sceneId)) return false;
    t.in = sceneId || null;
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
    this.state.things.forEach(x => { if (x.in === t.id) x.in = null; });
    if (this.state.active === t.id) this.state.active = null;
    this.state.bin = [t];                     /* one, and only for undo */
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
if (typeof module !== 'undefined' && module.exports) module.exports = T;

})(typeof window !== 'undefined' ? window : globalThis);
