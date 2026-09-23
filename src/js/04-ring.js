/* ══════════════════════════════════════════════════════════════
   04-ring.js — WHO SITS WHERE, AND WHY EVERYONE AGREES.

   grumkata: "its important the order stays the exact same on everyones
   stream so if bob is next to me on my side bob should always be next to
   me, they should also be evenly spaced so if only 2 people then they are
   facing each other 3 people equilateral triangle ect ect ect".

   Those two sentences are in tension and the resolution is the whole of
   this file, so it is worth saying plainly:

     EVERY CLIENT PUTS ITSELF AT THE NEAR SEAT. You are always at the
     bottom of your own screen, because you are sitting there. That is not
     a rendering convenience, it is what a table is.

     SO NOBODY SEES THE SAME ANGLES. If I am at the bottom and you are at
     the bottom, we are looking at the same table turned differently.

     AND YET THE ORDER IS THE SAME FOR EVERYONE. What must agree is not
     where anyone is in degrees, it is who is beside whom, and which way
     round. That is a CYCLIC order, and a cyclic order survives rotation
     exactly — which is the one mathematical fact this rests on.

   So there is a single global ring, the same list on every machine, and
   each client rotates it until its own place comes first. A rotation of a
   cycle is the same cycle. Bob stays next to me on every screen at the
   table, and clockwise means the same thing to all of us.

   ── HOW THE GLOBAL ORDER IS DECIDED ──────────────────────────
   By arrival, and never revised. Each member carries an `n` handed out
   when they joined, monotonically increasing; the order is `n` ascending,
   with the uid as a tiebreak so that two people who joined in the same
   millisecond still sort the same way on every machine.

   NOBODY IS EVER RENUMBERED. When somebody leaves they are dropped from
   the ring and the rest close up, keeping their relative order — which is
   the most that can be promised, since the person who was between two
   others is gone. Renumbering the survivors would reshuffle who is beside
   whom for everybody at the table, which is the one thing grumkata asked
   not to happen.

   ── AND THE GM IS JUST SOMEBODY AT THE TABLE ─────────────────
   Eleven places, ten players and a GM, all in one ring and all evenly
   spaced. The GM is not opposite, not at the head and not outside the
   circle: "evenly spaced so if only 2 people then they are facing each
   other" does not have an exception in it, and a round table does not
   have a head.

   Nothing here touches the network, the DOM or the clock. It is given a
   list and returns a list, which is why it can be tested exhaustively.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

/* ten players and one GM. The cap belongs here rather than in the session
   because it is a fact about the table, not about the transport. */
const MAX = 11;

/* ── THE GLOBAL ORDER ─────────────────────────────────────────
   The same array on every machine at the table, given the same members.
   `n` is arrival; uid breaks a tie; nothing else is consulted, because
   anything else (a name, a role, a clock) could differ between clients. */
function order(members) {
  return (members || [])
    .filter(m => m && m.uid)
    .slice()
    .sort((a, b) => {
      const an = a.n == null ? Infinity : a.n, bn = b.n == null ? Infinity : b.n;
      if (an !== bn) return an - bn;
      return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
    });
}

/* the angle of the k-th place of n, in the table's own degrees.
   -180 is the near side (22-table-model.js), so place 0 is always the
   seat the camera is sitting in. Two people: -180 and 0, facing each
   other. Three: -180, -60, 60, an equilateral triangle. And so on. */
function angleAt(k, n) {
  if (!n) return -180;
  return -180 + 360 * (k / n);
}

/* ── THE TABLE AS ONE PERSON SEES IT ──────────────────────────
   The global order, rotated until `meUid` is first, then spread evenly.
   Everyone runs this with their own uid and gets their own rotation of
   the same cycle.

   `mine` is set on exactly one member, and `k` is how far round from you
   somebody is — 0 is you, 1 is the next one clockwise, and it means the
   same thing on everybody's screen. */
function seating(members, meUid) {
  const ring = order(members);
  const n = ring.length;
  if (!n) return [];
  let at = ring.findIndex(m => m.uid === meUid);
  /* somebody watching a table they are not sitting at (a spectator, or a
     render before this client has taken its own place) is not a reason to
     refuse to draw it: leave the ring as it stands. */
  if (at < 0) at = 0;
  const out = [];
  for (let k = 0; k < n; k++) {
    const m = ring[(at + k) % n];
    out.push(Object.assign({}, m, {
      k: k,
      at: angleAt(k, n),
      mine: m.uid === meUid
    }));
  }
  return out;
}

/* ── ARRIVING ─────────────────────────────────────────────────
   The number a newcomer takes. One past the highest in the room, so the
   order they arrive in is the order they sit in, and so no number is ever
   reused while anybody who remembers it is still at the table. */
function nextN(members) {
  let top = -1;
  (members || []).forEach(m => { if (m && typeof m.n === 'number' && m.n > top) top = m.n; });
  return top + 1;
}

function full(members) {
  return order(members).length >= MAX;
}

/* who is beside whom, as a plain statement, for the tests and for anyone
   debugging a table that looks wrong. Returns uids in global cyclic
   order — the thing that must be identical on every machine. */
function cycle(members) {
  return order(members).map(m => m.uid);
}

root.Ring = { MAX, order, seating, angleAt, nextN, full, cycle };

})(window);
