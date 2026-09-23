/* ══════════════════════════════════════════════════════════════
   05-net.js — THE WIRE.

   One small tree of data, shared by everyone at a table. Nothing above
   this file knows whether it is talking to Firebase or to the other window
   on this machine, which is the point: 06-session.js is a hard thing to
   get right and it should not also have to be a hard thing to run.

   grumkata: "we will be using firebase for this not peer to peer for
   obvious reasons". Agreed, and the obvious reasons are worth writing
   down, because they are what shapes everything below: a table is eleven
   people who are not on the same network, behind routers that will not
   forward, joining and leaving at different times, and needing the SAME
   history when they arrive late. Peer to peer gives you a mesh that has to
   be rebuilt on every join and has no answer to "what did I miss". A
   server-held tree gives every client the same object and tells them when
   it changes. That is the whole requirement.

   ── TWO TRANSPORTS, ONE SHAPE ────────────────────────────────
   FIREBASE   Realtime Database, over the compat SDK inlined by build.js.
              Chosen over Firestore for this: presence is the hard part of
              a table, and `onDisconnect` — a server-side promise to clean
              up when the socket dies — is a thing RTDB has and Firestore
              does not.

   LOCAL      The same tree in localStorage, with changes shouted over a
              BroadcastChannel. Every window on one machine sees it. It is
              NOT a toy: it is how this gets developed and tested without
              credentials, it is how two people on one machine can share a
              screen, and it means the multiplayer code path is exercised
              by `npm test` rather than only in production.

   Which one is in use depends on whether a Firebase config has been given
   (Settings, or `src/firebase.config.json` at build time). No config is
   not an error. It is local mode.

   ── PRESENCE IS A HEARTBEAT, NOT A PROMISE ───────────────────
   `onDisconnect` is used where it exists, because it is instant. But it is
   not trusted as the only answer: a laptop that sleeps, a process killed
   with -9, a phone that walks out of signal — the socket may take a long
   time to be noticed. So every client also writes `seen` every few seconds
   and anybody stale is treated as gone by everybody else, independently
   and without needing to agree. Both transports get this for free because
   it lives here rather than in either of them.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const CFG_KEY = 'monarchy.firebase.v1';
const LOCAL_KEY = 'monarchy.net.local.v1';
const BEAT = 4000;         /* how often we say we are still here */
const STALE = 15000;       /* how long before somebody is presumed gone */

let mode = 'off';          /* 'off' | 'local' | 'firebase' */
/* WHY IT IS NOT ON THE WIRE, in words a person can act on. A config that is
   present but not working is the commonest state this will ever be in —
   there are two switches to throw in the Firebase console and nobody throws
   both first time — and "tables are local only" with no reason given is the
   app knowing exactly what is wrong and not saying. */
let trouble = null;
let myUid = null;
let app = null, db = null;
let chan = null;           /* BroadcastChannel, local mode */
/* THE SERVER'S CLOCK, MINUS OURS. `seen` is written with the server's own
   stamp so that one machine with a wrong clock cannot post a beat from
   next Tuesday — but it is READ against Date.now(), which is this
   machine's clock, and that half was never corrected. A laptop thirty
   seconds fast therefore finds EVERY other beat at the table older than
   STALE, reaps the lot, and draws an empty room to somebody sitting in a
   full one; a laptop thirty seconds slow never reaps anybody at all.
   Firebase publishes the difference at `.info/serverTimeOffset`; we keep
   it and add it back on. Local mode is one machine and one clock, so it
   stays zero and costs nothing. */
let skew = 0;
const watches = [];        /* { path, cb, off } */

/* ══ THE CONFIG ════════════════════════════════════════════════ */
function readCfg() {
  /* whatever the build baked in (src/firebase.config.json), unless this
     machine has been given its own */
  try {
    const own = root.localStorage.getItem(CFG_KEY);
    if (own) return JSON.parse(own);
  } catch (e) {}
  return (root.__FIREBASE_CONFIG__ && root.__FIREBASE_CONFIG__.apiKey)
    ? root.__FIREBASE_CONFIG__ : null;
}
function setCfg(cfg) {
  try {
    if (cfg) root.localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    else root.localStorage.removeItem(CFG_KEY);
  } catch (e) {}
}
const configured = () => !!readCfg();

/* ══ STARTING ══════════════════════════════════════════════════ */
function start() {
  if (mode !== 'off') return Promise.resolve(myUid);
  const cfg = readCfg();
  if (cfg && typeof root.firebase !== 'undefined') return startFirebase(cfg);
  return startLocal();
}

function startFirebase(cfg) {
  try {
    app = root.firebase.apps && root.firebase.apps.length
      ? root.firebase.app() : root.firebase.initializeApp(cfg);
    db = root.firebase.database();
  } catch (e) { console.error('[net] firebase refused to start', e); return startLocal(); }
  /* SIGNED IN BEFORE ANYTHING IS WRITTEN. Anonymous is enough — a table is
     joined with its word, not with an account — but it must happen first,
     because every rule that protects the tree is written against a uid and
     a client with no identity cannot satisfy any of them. */
  return root.firebase.auth().signInAnonymously()
    .then(res => {
      myUid = (res && res.user && res.user.uid) || null;
      if (!myUid) throw new Error('no uid');
      mode = 'firebase';
      watchSkew();
      return myUid;
    })
    .catch(e => {
      const code = (e && e.code) || '';
      trouble = /admin-restricted|operation-not-allowed/.test(code)
        ? { why: 'anon-off',
            say: 'This copy has a Firebase project, but that project has not been told to '
               + 'allow anonymous sign-in — so nobody can take a seat. Firebase console → '
               + 'Authentication → Sign-in method → Anonymous → Enable.' }
        : /api-key|invalid/.test(code)
        ? { why: 'bad-key',
            say: 'The Firebase config this copy carries was refused by Google. Check it against '
               + 'the one in your project settings.' }
        : { why: 'unknown',
            say: 'This copy could not reach its Firebase project: ' + (code || e) };
      console.error('[net] anonymous sign-in failed — ' + trouble.say, e);
      return startLocal();
    });
}

function startLocal() {
  mode = 'local';
  /* a config that was never given is not trouble, it is a choice */
  if (!trouble && configured()) trouble = { why: 'unknown', say: '' };
  myUid = localUid();
  try {
    chan = new root.BroadcastChannel('monarchy.net');
    chan.onmessage = e => {
      const m = e.data;
      if (m && m.path) fire(m.path);
    };
  } catch (e) { chan = null; }
  /* another window in this browser writing localStorage reaches us here
     even without BroadcastChannel */
  root.addEventListener('storage', e => {
    if (e.key === LOCAL_KEY) watches.forEach(w => fire(w.path));
  });
  return Promise.resolve(myUid);
}
/* one id per browser profile, kept, so rejoining a table resumes a place
   rather than taking a new one */
function localUid() {
  const K = 'monarchy.net.uid.v1';
  try {
    let u = root.localStorage.getItem(K);
    if (!u) { u = 'u' + Math.random().toString(36).slice(2, 10); root.localStorage.setItem(K, u); }
    return u;
  } catch (e) { return 'u' + Math.random().toString(36).slice(2, 10); }
}

function stop() {
  watches.slice().forEach(w => w.off && w.off());
  watches.length = 0;
  if (chan) { try { chan.close(); } catch (e) {} chan = null; }
  mode = 'off'; myUid = null; db = null; skew = 0;
}

/* kept current rather than read once: a machine that corrects its clock
   mid-session (or wakes from sleep having drifted) would otherwise carry
   the old difference for the rest of the evening */
function watchSkew() {
  try {
    db.ref('.info/serverTimeOffset').on('value', s => {
      const v = s.val();
      if (typeof v === 'number') skew = v;
    });
  } catch (e) {}
}

/* ══ THE LOCAL TREE ════════════════════════════════════════════ */
function tree() {
  try { return JSON.parse(root.localStorage.getItem(LOCAL_KEY)) || {}; }
  catch (e) { return {}; }
}
function writeTree(t) {
  try { root.localStorage.setItem(LOCAL_KEY, JSON.stringify(t)); } catch (e) {}
}
const parts = p => String(p).split('/').filter(Boolean);
function dig(t, p) {
  let n = t;
  for (const k of parts(p)) { if (n == null || typeof n !== 'object') return null; n = n[k]; }
  return n === undefined ? null : n;
}
function plant(t, p, v) {
  const ks = parts(p);
  if (!ks.length) return v;
  let n = t;
  for (let i = 0; i < ks.length - 1; i++) {
    if (typeof n[ks[i]] !== 'object' || n[ks[i]] === null) n[ks[i]] = {};
    n = n[ks[i]];
  }
  if (v === null) delete n[ks[ks.length - 1]];
  else n[ks[ks.length - 1]] = v;
  return t;
}
/* tell this window's own watchers, and every other window */
function fire(path) {
  watches.forEach(w => {
    if (w.path === path || path.indexOf(w.path + '/') === 0 || w.path.indexOf(path + '/') === 0)
      { try { w.cb(dig(tree(), w.path)); } catch (e) { console.error(e); } }
  });
}
function shout(path) {
  if (chan) { try { chan.postMessage({ path }); } catch (e) {} }
}

/* ══ THE SAME SIX VERBS, WHICHEVER TRANSPORT ═══════════════════ */
function watch(path, cb) {
  if (mode === 'firebase') {
    const ref = db.ref(path);
    const h = ref.on('value', s => { try { cb(s.val()); } catch (e) { console.error(e); } });
    const w = { path, cb, off: () => ref.off('value', h) };
    watches.push(w);
    return () => { ref.off('value', h); const i = watches.indexOf(w); if (i >= 0) watches.splice(i, 1); };
  }
  const w = { path, cb, off: null };
  watches.push(w);
  /* answer once immediately, the way a database read does */
  try { cb(dig(tree(), path)); } catch (e) { console.error(e); }
  return () => { const i = watches.indexOf(w); if (i >= 0) watches.splice(i, 1); };
}

function get(path) {
  if (mode === 'firebase') return db.ref(path).once('value').then(s => s.val());
  return Promise.resolve(dig(tree(), path));
}
function set(path, value) {
  if (mode === 'firebase') return db.ref(path).set(value);
  writeTree(plant(tree(), path, value === undefined ? null : value));
  fire(path); shout(path);
  return Promise.resolve();
}
function update(path, obj) {
  if (mode === 'firebase') return db.ref(path).update(obj);
  const t = tree();
  Object.keys(obj || {}).forEach(k => plant(t, path + '/' + k, obj[k]));
  writeTree(t); fire(path); shout(path);
  return Promise.resolve();
}
function push(path, value) {
  if (mode === 'firebase') {
    const ref = db.ref(path).push();
    return ref.set(value).then(() => ref.key);
  }
  /* time-ordered and unique, which is all a push key has to be */
  const key = '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return set(path + '/' + key, value).then(() => key);
}
const remove = path => set(path, null);

/* a promise the SERVER keeps: when this client's socket dies, clear this.
   Local mode has no server, so it keeps the promise itself on the way out
   — which covers a closed window and not a killed process, hence the
   heartbeat that backs it up. */
function vanishOnDisconnect(path) {
  if (mode === 'firebase') { try { db.ref(path).onDisconnect().remove(); } catch (e) {} return; }
  const go = () => { try { writeTree(plant(tree(), path, null)); shout(path); } catch (e) {} };
  root.addEventListener('pagehide', go);
  root.addEventListener('beforeunload', go);
}

/* the server's clock where there is one, ours where there is not. Used for
   `seen`, so that one machine with a wrong clock cannot declare everybody
   else stale. */
function now() {
  if (mode === 'firebase' && root.firebase && root.firebase.database)
    return root.firebase.database.ServerValue.TIMESTAMP;
  return Date.now();
}
/* and the reader's side of that: a stamp may come back as a number or, for
   a beat this client has only just written, as the sentinel object */
function ageOf(stamp) {
  return (typeof stamp === 'number') ? (Date.now() + skew) - stamp : 0;
}
const fresh = stamp => ageOf(stamp) < STALE;

root.Net = { start, stop, watch, get, set, update, push, remove,
             vanishOnDisconnect, now, ageOf, fresh,
             configured, readCfg, setCfg,
             get trouble() { return trouble; },
             get skew() { return skew; },
             BEAT, STALE,
             get mode() { return mode; },
             get uid() { return myUid; } };

})(window, document);
