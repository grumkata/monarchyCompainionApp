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
  const go = () => { swap(where, tableId); if (where === 'table') nameHud(name); };
  if (now || !root.Herald) return go();
  return root.Herald.wipe(go, where === 'table'
    ? { title: name || 'The Table', sub: 'the table is set' }
    : { title: 'The Hall', sub: 'the company is mustered' });
}

function swap(where, tableId) {
  at = where;
  doc.body.classList.toggle('at-hall', where === 'hall');
  doc.body.classList.toggle('at-table', where === 'table');

  if (where === 'table') {
    /* boot on first open; after that the table is still standing where you
       left it, which is the whole reason this is a state change and not a
       page load */
    if (root.TableBoot) root.TableBoot.boot(tableId);
    /* the viewport measured itself while it was display:none and got zero,
       so it has to re-fit now that it has a size */
    if (root.Table3D) setTimeout(root.Table3D.fit, 0);
  } else if (root.Hall && root.Hall.resize) {
    setTimeout(root.Hall.resize, 0);
  }
  root.dispatchEvent(new CustomEvent('monarchy:where', { detail: { at: where } }));
}

const openTable = id => show('table', id);
const backToHall = () => show('hall');

/* the way back, on the table's own chrome rather than a browser button */
function mountBack() {
  if (doc.getElementById('to-hall')) return;
  const b = doc.createElement('button');
  b.id = 'to-hall';
  b.className = 'to-hall';
  b.innerHTML = '&#8249;&nbsp; The hall';
  b.title = 'Leave the table standing and go back';
  b.addEventListener('click', backToHall);
  doc.body.appendChild(b);
}

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
   `arms` is the shape 16-menu.js saves:
     { div, a, b, ord, ordT, chg, chgT, chgN, bord, bordT }
   where a/b are the field's tinctures, ordT the ordinary's, chgT the
   charge's — each a TINCT name ('gules', 'or', …) OR a raw '#rrggbb' if
   the player picked their own. `H` is window.Heraldry (H.TINCT, H.isMetal,
   H.col turns any of those into a CSS colour).

   Return a CSS colour for --m-house, or null to keep the default Gules.

   The rule of tincture is the constraint: the livery sits next to Or
   plaques and under Argent/Sable ink, so it has to be a COLOUR — a metal
   livery would vanish beside the gilt, and Sable would vanish into the
   chrome it is drawn on. */
function houseTincture(arms, H) {
  // TODO(grumkata): choose the livery — see STYLE.md "Livery" for the options
  return null;
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
  if (id) show('table', id, true);
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
else start();

root.Shell = { show, openTable, backToHall, livery, get at() { return at; } };

})(window, document);
