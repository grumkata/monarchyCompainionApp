/* ══════════════════════════════════════════════════════════════
   57-chat-net.js — THE DOCK, WHEN THERE ARE OTHER PEOPLE IN IT.

   39-dice.js owns the chat dock and the shape of every line in it, and it
   sends its own lines to the table (it has to — see the note below). This
   file does the other half: everything that ARRIVES.

     RECEIVING  every line the table has, in the server's order, rendered
                once each, in the same markup the dock already uses.
     FILTERING  a roll arrives as markup from a machine nobody here
                controls, so it is cut down to the handful of tags and
                classes a roll is made of before it goes near innerHTML.
     NOTICING   somebody sitting down or getting up, which at a real table
                you would see.

   Your own words take the long way round — out to the table and back —
   rather than being drawn locally and pushed as well. Two sources of truth
   for one conversation means recognising your own echo, which means
   matching on text, which fails the moment you say the same thing twice.
═════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const S = () => root.Session;
const live = () => !!(S() && S().live);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let shown = {};          /* keys already on screen */
let lastWord = null;
let primed = false;      /* has this table's history already arrived? */

function body() { return doc.getElementById('chat-body'); }

/* ── SENDING IS NOT DONE HERE ─────────────────────────────
   It was, by wrapping `window.Dice.talk` and `window.Dice.roll` from out
   here — and it never ran once. The chat box calls the LOCAL `talk` inside
   39-dice.js; `window.Dice = { talk }` exports a copy of the reference, so
   reassigning that property leaves every internal call site pointing at the
   original. grumkata: "chat didnt work at all". It did not, and this is
   why. An exported function is not a hook.

   So 39-dice.js routes its own lines now, at the source, and this file only
   does the half it can honestly do from outside: rendering what comes back.
*/

/* ── WHAT COMES BACK ──────────────────────────────────────────
   Rendered in the server's order, once each. `kind` decides the shape, and
   it is the same markup 39-dice.js writes, because it is the same dock. */
function draw(list) {
  const cb = body();
  if (!cb) return;
  /* THE FIRST ANSWER IS THE EVENING SO FAR. Joining hands you every line
     already said, and every roll in it would otherwise be thrown again,
     all at once, the moment you sat down. */
  const history = !primed;
  primed = true;
  (list || [])
    .slice()
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .forEach(m => {
      if (!m || !m.key || shown[m.key]) return;
      shown[m.key] = 1;
      const d = doc.createElement('div');
      if (m.kind === 'roll') {
        d.className = 'cl roll';
        /* trusted because it was built by this app's own renderer on
           another client... which is exactly the assumption a chat line
           must NOT make. See scrub(). */
        d.innerHTML = scrub(m.text);
        if (!history) throwFor(m);
      } else if (m.kind === 'emote') {
        d.className = 'cl said emote';
        d.innerHTML = '<span class="stxt"><b>' + esc(m.who) + '</b> '
                    + esc(String(m.text).replace(/^\/me\s+/i, '')) + '</span>';
      } else {
        d.className = 'cl said' + (m.role === 'gm' ? ' gm' : '');
        d.innerHTML = '<b>' + esc(m.who) + '</b><span class="stxt">'
                    + esc(m.text) + '</span>';
      }
      cb.appendChild(d);
    });
  cb.scrollTop = cb.scrollHeight;
}

/* ── SOMEBODY ELSE'S DICE, ON THIS WOOD ───────────────────────
   A roll that was thrown carries its dice as numbers (39-dice.js). Every
   other table stages the same throw landing on the same faces, so the d20
   everyone watches come up 17 is a 17 in the chat line under it too. Your
   own throw is already on your wood — you threw it — so it is not thrown
   twice. Same Settings switch as your own: dice off the wood means off. */
function throwFor(m) {
  const S = root.Session;
  if (!m.dice || !S || m.uid === S.uid) return;
  if (!root.GLDice || !doc.body.classList.contains('at-table')) return;
  if (root.Dice && root.Dice.onWood && !root.Dice.onWood()) return;
  /* a line that took a long road here is news, not a throw to watch */
  if (root.Net && root.Net.ageOf && root.Net.ageOf(m.at) > 20000) return;
  const dice = S.diceOf ? S.diceOf(m.dice) : null;
  if (dice) root.GLDice.spawn(dice);
}

/* ── AND WHY A ROLL LINE IS SCRUBBED ──────────────────────────
   Every other kind of line is escaped, because it is text somebody typed.
   A roll is markup, and it arrives from another machine — so it is markup
   somebody could have typed. A player who edits their own client, or
   anybody who can write to the database, could put a <script> or an
   onerror= in a "roll" and it would run in ten other people's apps.

   So it is not trusted, it is filtered: only the handful of tags and the
   handful of class names that 39-dice.js's own roll line is made of
   survive. Anything else — any attribute, any other element — is dropped.
   The worst a hostile client can now do is make a roll look wrong. */
const TAGS = { B: 1, I: 1, U: 1, SPAN: 1 };
const CLASSES = /^(rspec|rdice|rtot|cn|hi|lo)$/;
function scrub(html) {
  const bin = doc.createElement('div');
  bin.innerHTML = String(html || '');
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) return;                       /* text is fine */
      if (n.nodeType !== 1 || !TAGS[n.tagName]) { n.remove(); return; }
      const keep = (n.getAttribute('class') || '')
        .split(/\s+/).filter(c => CLASSES.test(c)).join(' ');
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
      if (keep) n.setAttribute('class', keep);
      walk(n);
    });
  };
  walk(bin);
  return bin.innerHTML;
}

/* ── THE TABLE SAYING SOMETHING OF ITS OWN ────────────────────
   Arrivals and departures belong in the dock: at a real table you notice
   somebody sitting down. Written by each client about what it has just
   seen change, not sent over the wire, so nobody can forge one. */
let seenWho = null;
function noticeWho(members) {
  const now = {};
  (members || []).forEach(m => { now[m.uid] = m.name || 'Someone'; });
  if (seenWho) {
    Object.keys(now).forEach(u => { if (!(u in seenWho)) note(now[u] + ' sits down'); });
    Object.keys(seenWho).forEach(u => { if (!(u in now)) note(seenWho[u] + ' gets up'); });
  }
  seenWho = now;
}
function note(text) {
  const cb = body(); if (!cb) return;
  const d = doc.createElement('div');
  d.className = 'cl note';
  d.innerHTML = '<span class="stxt">' + esc(text) + '</span>';
  cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}

root.addEventListener('monarchy:session', e => {
  const d = e.detail || {};
  /* a different table is a different conversation */
  if (d.word !== lastWord) { lastWord = d.word; shown = {}; seenWho = null; primed = false; }
  if (d.what === 'chat') draw(d.chat);
  if (d.what === 'who' || d.what === 'joined' || d.what === 'hosting') noticeWho(d.members);
  if (d.what === 'left' || d.what === 'closed') {
    seenWho = null;
    note(d.what === 'closed' ? 'The GM has closed the table' : 'You have left the table');
  }
});
root.ChatNet = { scrub, draw };

})(window, document);
