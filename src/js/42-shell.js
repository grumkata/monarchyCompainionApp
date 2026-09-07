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

function show(where, tableId) {
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

/* ?table=<id> walks straight in, so a table can be opened from a link or a
   shortcut without going through the hall first. */
function start() {
  mountBack();
  const id = (new URLSearchParams(root.location.search)).get('table');
  if (id) show('table', id);
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
else start();

root.Shell = { show, openTable, backToHall, get at() { return at; } };

})(window, document);
