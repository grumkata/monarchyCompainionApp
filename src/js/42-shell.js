/* ══════════════════════════════════════════════════════════════
   42-shell.js — ONE DOCUMENT, TWO PLACES.

   The hall and the table are one file. Which one you are looking
   at is a class on <body>: `at-hall` or `at-table`. Both
   stylesheets are confined to their own class at build time
   (tools/scope-css.js), because the two were written as separate
   documents and share 27 class names — .plate, .shield, .face,
   .cap and friends — that would otherwise restyle each other.

   Opening a table used to be a navigation. It is now a state
   change, so the hall does not have to be rebuilt to come back to
   and the two 3D scenes are never both live.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let at = 'hall';

/* ══ GOING BETWEEN THEM ════════════════════════════════════════
   Under THE BEND (55-herald.js): a cloth in your livery is drawn across,
   the other half is raised behind it — so the table's first boot, which
   takes a beat, happens where nobody can see it hitch — and the cloth is
   drawn off again with the name of where you now are turning in the
   middle. `now` skips it (a link straight to a table on load). The switch
   itself is still one synchronous function, swap(), exactly as before. */
function tableName(id) {
  try {
    const t = (JSON.parse(root.localStorage.getItem('monarchy.tables.v3')) || [])
      .find(x => x.id === id);
    return t && t.name ? String(t.name) : '';
  } catch (e) { return ''; }
}
/* the HUD's corner says which table this is, not just "The Table" */
function nameHud(name) {
  const hud = doc.querySelector('.hud.tl');
  const txt = hud && [...hud.childNodes].find(n => n.nodeType === 3);
  if (txt) txt.nodeValue = name || 'The Table';
}
function show(where, tableId, now) {
  if (where === at && where === 'hall') return;
  const name = where === 'table' ? tableName(tableId) : '';
  /* swap() hands back a promise when the table has to be raised, and
     Herald.wipe holds its cover until that settles — so the cloth comes off
     a room that is standing, not one that is still going up. */
  const go = () => { const p = swap(where, tableId, true);
                     if (where === 'table') nameHud(name); return p; };
  if (now || !root.Herald) { swap(where, tableId, false);
                             if (where === 'table') nameHud(name);
                             return Promise.resolve(); }
  return root.Herald.wipe(go, where === 'table'
    ? { title: name || 'The Table', sub: 'the table is set' }
    : { title: 'The Hall', sub: 'the company is mustered' });
}

/* `covered` says whether something is drawn over the screen right now. It
   decides HOW the table is raised, not whether: under the cloth the boot is
   run a piece per frame so the cloth can keep moving (28-table-boot.js), and
   with nothing over the screen — walking straight in from ?table=<id> — it
   is run in one go, because there is no animation to protect. */
function swap(where, tableId, covered) {
  at = where;
  doc.body.classList.toggle('at-hall', where === 'hall');
  doc.body.classList.toggle('at-table', where === 'table');
  root.dispatchEvent(new CustomEvent('monarchy:where', { detail: { at: where } }));

  if (where !== 'table') {
    if (root.Hall && root.Hall.resize) setTimeout(root.Hall.resize, 0);
    return Promise.resolve();
  }

  /* boot on first open; after that the table is still standing where you
     left it, which is the whole reason this is a state change and not a
     page load */
  /* the viewport measured itself while it was display:none and got zero,
     so it has to re-fit now that it has a size */
  const fit = () => { if (root.Table3D) root.Table3D.fit(); };
  if (root.TableBoot) root.TableBoot.boot(tableId);
  /* NOT fitted here. Everything in this function runs inside the Bend's
     `mid`, which means the cover's animation is stopped for the whole of it
     — and fitTable() walks every prop on the wood, which was 152ms of that.
     A timeout of 0 still runs while the cover is down (it is held for 300ms
     after this returns) but yields a frame first, so the cloth moves. */
  setTimeout(fit, 0);
  return settled();
}

/* ══ THE COVER COMES OFF A TABLE THAT HAS ALREADY DRAWN ══════════
   grumkata: the transition "is laggy and basically skipped".

   Skipped is the exact word for what was happening, and it is worth being
   precise about why, because it is not the same fault as slow. The Bend's
   uncover is 560ms of animation frames. The table's first REAL frames —
   the ones that upload its textures and rasterise sixty thousand triangles
   for the first time — were landing in the middle of that, because the
   table only starts drawing when `at-table` goes on, 380ms earlier. So the
   uncover would start, freeze solid for two or three hundred milliseconds
   while the room drew itself, and then jump to finished, because its
   remaining frames had all come due at once while the thread was blocked.
   An animation that freezes and then arrives is not a slow animation. It
   is a cut.

   So the cover does not come off until the table underneath it has actually
   drawn, and drawn quietly: three frames, with no textures still in flight.
   Herald.wipe holds for as long as this takes (it waits on the promise that
   comes back), which means the expensive frames happen BEHIND the cloth and
   the uncover gets a clear main thread to animate in.

   The cap is the honest part. A table that never settles — a texture that
   404s, a machine that cannot keep up — must not leave anyone behind a
   curtain, so after a second and a half the cover comes off regardless and
   whatever is still arriving arrives in the open. */
function settled() {
  const GL = root.TableGL;
  if (!GL || typeof GL.frames !== 'number') return Promise.resolve();
  const from = GL.frames, t0 = Date.now();
  return new Promise(res => {
    const look = () => {
      const drew = GL.frames - from >= 2;
      const quiet = !GL.waiting;
      /* 900ms, not 1500. Holding the cover buys a clean uncover, but every
         millisecond of it is also latency between asking for a table and
         getting one — and "laggy" is what somebody says about latency just
         as readily as about dropped frames. Two frames is enough to have
         paid the first-draw cost; the rest can arrive in the open. */
      if ((drew && quiet) || Date.now() - t0 > 900) return res();
      root.requestAnimationFrame(look);
    };
    root.requestAnimationFrame(look);
  });
}

/* ══ RAISING THE ROOM EARLY ════════════════════════════════════
   The tavern is the same tavern whichever table you open, so there is no
   reason to build it in the beat where somebody is waiting for it
   (28-table-boot.js warm). This asks for it once the hall has stopped
   arriving — the banners deal themselves in over about a second, and
   dropping 320ms of room-building into the middle of that would trade one
   hitch for another.

   requestIdleCallback rather than a timer where it exists: it means "when
   the main thread has nothing better to do", which is exactly the condition.
   The timeout is the promise that it happens anyway on a busy machine. */
let warmed = false;
function warmTable() {
  if (warmed || at !== 'hall' || !root.TableBoot || !root.TableBoot.warm) return;
  /* NEVER WHILE SOMETHING IS MOVING. requestIdleCallback was the first
     attempt and it is the wrong tool here: its `timeout` does not mean
     "when idle, or give up" — it means "fire ANYWAY after this long", busy
     or not. On a machine that is never idle that is a guaranteed 300ms
     block dropped at an arbitrary moment, and the arbitrary moment it
     landed on was often the transition it was meant to protect.

     So it waits for a genuinely quiet frame instead: two frames in a row
     that each came in under budget, with no cover on screen. If the hall
     never gives us one, the room simply goes up when you ask for it, which
     is what happened before any of this existed. */
  warmed = true;
  /* COUNTED IN TIME, NOT IN FRAMES. The first version of the fallback below
     waited 240 frames before settling for whatever gap was going — which on
     a machine drawing one frame every 200ms is forty-eight seconds, so the
     machines slow enough to need the room built early were the only ones
     that never got it. Wall time does not care how fast the frames are. */
  const began = Date.now();
  let calm = 0, last = 0;
  const look = now => {
    if (at !== 'hall') return;                     /* too late, and that is fine */
    const gap = last ? now - last : 999;
    last = now;
    /* BUSY MEANS SOMETHING IS ON SCREEN THAT MUST NOT BE INTERRUPTED — a
       cloth mid-wipe, a screen raised over the hall, or the pointer resting
       on a banner, which is a second away from being a click. Never those. */
    const busy = doc.querySelector('#herald.wiping') ||
                 doc.querySelector('#screen.on') ||
                 (root.Hall && root.Hall.hot && root.Hall.hot() >= 0);
    /* 60ms is not "idle", it is "keeping up at all" — and that is the right
       bar. A strict one (two frames under 24ms) was tried and on a slow
       machine it is never met, so the machines that most need the room built
       early were the only ones that never got it. */
    calm = (!busy && gap < 60) ? calm + 1 : 0;
    const waited = Date.now() - began;
    /* and after four seconds of never being quiet, take the gap that is on
       offer: the cost is bounded and paid once, and not paying it means
       paying it on the first table instead. */
    if (calm >= 2 || (waited > 4000 && !busy)) { root.TableBoot.warm(); return; }
    if (waited > 20000) return;                    /* give up; it will boot on click */
    root.requestAnimationFrame(look);
  };
  root.requestAnimationFrame(look);
}

const openTable = id => show('table', id);
const backToHall = () => show('hall');

/* THE WAY BACK IS IN THE MENU NOW (59-table-menu.js). There was a pennon
   pinned to the top-left corner of the table that did one thing, and
   grumkata is right that it was the wrong shape: leaving is a decision
   about this table, and decisions about this table belong together in one
   place you can find rather than one button per decision scattered round
   the edges. `backToHall` is still the verb; the menu is what calls it. */
function mountBack() { /* nothing to mount */ }

/* ══ YOUR LIVERY ═══════════════════════════════════════════════
   Blazon's chrome (20-shell.css) wears exactly one accent, --m-house:
   the band down the chat's hem, the edge of every toast, the colour a
   primary button counterchanges into. It is YOURS — taken from your own
   arms — so each player's app is quietly dressed in their own house
   colours, the way a retainer wore their lord's livery.

   Set on <html> inline, so it outranks the :root default and every token
   built from it (--m-sweep-house) recomputes. Nothing here is scoped:
   the livery is the same in the hall and at the table. */
const ME_KEY = 'monarchy.me.v1';
function readArms() {
  try { return (JSON.parse(root.localStorage.getItem(ME_KEY)) || {}).arms || null; }
  catch (e) { return null; }
}

/* WHICH TINCTURE OF A COAT OF ARMS DOES THE CHROME WEAR?

   The rule is the constraint: the livery sits next to Or plaques and under
   Argent/Sable ink, so it has to be a COLOUR — a metal livery would vanish
   beside the gilt, and Sable would vanish into the chrome it is drawn on.

   The answer lives with the arms rather than here (Heraldry.liveryOf), for
   the same reason the drawing does: the coat knows which of its tinctures
   is the one you march under, and it can now be told outright — the maker
   has a livery slot, and picking one there is the first thing liveryOf
   looks at. Failing that it works outward from the most personal choice:
   the charge, then the ordinary, then the bordure, then the field. */
function houseTincture(arms, H) {
  return (H && H.liveryOf) ? H.liveryOf(arms) : null;
}

/* Ink for text laid ON the livery: Argent unless the colour is so light
   (a picked-your-own pastel) that Argent would not read, then Sable. */
function inkFor(css) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(css).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.3 ? 'var(--m-sable)' : null;
}

function livery() {
  const H = root.Heraldry, s = doc.documentElement.style;
  const arms = readArms();
  const c = (H && arms) ? houseTincture(arms, H) : null;
  if (c) s.setProperty('--m-house', c); else s.removeProperty('--m-house');
  const ink = c && inkFor(c);
  if (ink) s.setProperty('--m-house-ink', ink); else s.removeProperty('--m-house-ink');
}

/* ?table=<id> walks straight in, so a table can be opened from a link or a
   shortcut without going through the hall first. */
function start() {
  livery();
  mountBack();
  const id = (new URLSearchParams(root.location.search)).get('table');
  if (id) return show('table', id, true);
  /* nobody has asked for a table, so there is time to build the room one
     will stand in. 1.4s is after the hall has finished arriving. */
  setTimeout(warmTable, 1400);
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
else start();

/* ══ WHICH PLACE IS YOURS ══════════════════════════════════════
   The table is a shared object — the same wood, the same things, the same
   eight places, for everyone at it. What is local to THIS client is only
   which of those places it is sitting in, so that lives here and in
   localStorage rather than in the table's own save. Seat 0 is the near
   side, which is where this client's camera sits. */
const SEAT_KEY = 'monarchy.seat.v1';
function seat(n) {
  if (n != null) {
    try { root.localStorage.setItem(SEAT_KEY, String(n | 0)); } catch (e) {}
    root.dispatchEvent(new CustomEvent('monarchy:seat', { detail: { seat: n | 0 } }));
    return n | 0;
  }
  try { return parseInt(root.localStorage.getItem(SEAT_KEY), 10) || 0; }
  catch (e) { return 0; }
}

/* the tavern hangs your arms behind your seat (27-table-gl.js) */
root.Shell = { show, openTable, backToHall, livery, arms: readArms, seat,
               get at() { return at; } };

})(window, document);
