/* ══════════════════════════════════════════════════════════════
   60-board-net.js — THE SAME WOOD, FOR EVERYONE AT IT.

   grumkata: "nothing updated on either side so it was as if i didnt join
   the table", and "when i joined the tabel everything looked weird".

   Both of those were one missing thing. Up to now a session shared who was
   in the room, what they said, and which sheets they had brought — and not
   the board. So a player joined, their client opened a LOCAL save under the
   GM's table id, found nothing there, and drew an empty tavern. Everything
   the GM did stayed on the GM's machine. It was not that multiplayer was
   rough; it was that the one thing a table IS had never been on the wire.

   ── WHAT IS SENT, AND WHY NOT THE WHOLE BOARD ────────────────
   One node per thing: `board/things/{id}`. The obvious design is to write
   the whole board on every change, and it is wrong for a reason that shows
   up immediately with more than two people at the table — two players
   dragging two different tokens at the same moment each write a complete
   board, and whoever lands second erases the other's move. Per thing, they
   touch different keys and both survive.

   It is also far less traffic. A thing carrying an uploaded picture is a
   few hundred kilobytes; nudging a token next to it should not re-send it.

   ── AND WHO IS ALLOWED TO MOVE WHAT ──────────────────────────
   Anybody. This is a table, not a server: people reach across it and move
   each other's pieces, and a permission system for that would be solving a
   problem tabletop gaming does not have. The GM's authority is social, and
   the one thing the rules enforce is that you cannot pretend to be somebody
   else.

   ── THE ECHO ─────────────────────────────────────────────────
   Every client both writes and watches the same node, so everything you do
   comes back to you. Applying your own echo is not merely wasteful: it
   would re-enter the model, fire `changed`, and send it again. So the last
   thing written for each id is remembered, and anything identical arriving
   back is dropped on the floor.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const S = () => root.Session;
const M = () => root.TableModel;
const live = () => !!(S() && S().live);

let word = null;          /* the table we are wired to, if any */
let offs = [];
let mine = {};            /* id -> the JSON we last wrote, to know our echo */
let ours = {};            /* ids that were on our own wood before we sat down */
let synced = false;       /* has the table's own board reached us yet? */
let applying = false;     /* a remote change is going in; do not send it back */
let sendT = 0;

const path = () => 'tables/' + word + '/board';
const cut = t => JSON.stringify(t);

/* ══ OUT ═══════════════════════════════════════════════════════
   Debounced, because a drag fires `changed` on every pointer move and a
   table does not need sixty writes a second to know where a token went.
   90ms is under the threshold at which a moved piece feels laggy to the
   person who did not move it, and it collapses a whole drag into a handful
   of writes. */
function push() {
  if (!live() || applying || !synced) return;
  if (sendT) return;
  sendT = root.setTimeout(() => { sendT = 0; sendNow(); }, 90);
}

function sendNow() {
  if (!live() || !M()) return;
  const st = M().state;
  const now = {};
  (st.things || []).forEach(t => { now[t.id] = cut(t); });

  const job = {};
  /* changed and new */
  Object.keys(now).forEach(id => {
    /* NOT WHAT WAS ALREADY ON YOUR OWN WOOD. You open a table of your own,
       put your notes and your prep on it, and then join somebody else's
       game -- and the first piece you touched there used to push the whole
       of your private board to ten other people, because sendNow sends
       everything it has not sent before and a joiner has not sent any of
       it. Skipping the one send at join time covered a single instant and
       nothing after it. What is yours stays yours; what you do at this
       table is the table's. */
    if (ours[id]) return;
    if (mine[id] !== now[id]) { job['things/' + id] = JSON.parse(now[id]); mine[id] = now[id]; }
  });
  /* and gone. A thing that was binned is removed from the board rather
     than written as null-ish: the bin is this client's own drawer. */
  Object.keys(mine).forEach(id => {
    if (!(id in now)) { job['things/' + id] = null; delete mine[id]; }
  });
  /* which scene is being run, and the stacking counter, so a piece put
     down on one machine does not land under everything on another */
  const head = cut({ active: st.active || null, z: st.z || 1 });
  if (head !== mine.__head) { job.head = JSON.parse(head); mine.__head = head; }

  if (!Object.keys(job).length) return;
  root.Net.update(path(), job).catch(e => {
    /* a refused write means the rules are not set; say it once rather than
       once per drag */
    if (!sendNow.moaned) { sendNow.moaned = true; console.error('[board] ' + e); }
  });
}

/* ══ IN ════════════════════════════════════════════════════════ */
function take(board) {
  if (!M()) return;
  /* EVEN AN EMPTY ANSWER IS AN ANSWER. Until the table has told us what is
     on it we send nothing at all, so that a joiner's own save is never
     pasted over the GM's board. A table with nothing on it says exactly
     that -- and saying it is what lets us start contributing. */
  synced = true;
  if (!board) return;
  const st = M().state;
  const things = board.things || {};
  let touched = false;

  applying = true;
  try {
    /* everything the table says is there */
    Object.keys(things).forEach(id => {
      const t = things[id];
      if (!t || typeof t !== 'object') return;
      const js = cut(t);
      if (ours[id]) delete ours[id];             /* the table has it too */
      if (mine[id] === js) return;               /* our own echo */
      mine[id] = js;
      const at = (st.things || []).findIndex(x => x.id === id);
      if (at >= 0) Object.assign(st.things[at], t);
      else st.things.push(t);
      touched = true;
    });
    /* and nothing it does not. Only things we have seen ON the wire are
       removed — a client that has never synced must not have its own board
       wiped by an empty node. */
    if (board.head) {
      for (let i = (st.things || []).length - 1; i >= 0; i--) {
        const id = st.things[i].id;
        if (!(id in things) && (id in mine)) { st.things.splice(i, 1); delete mine[id]; touched = true; }
      }
      const h = board.head;
      if (h.active !== undefined && h.active !== st.active) { st.active = h.active; touched = true; }
      if (typeof h.z === 'number' && h.z > (st.z || 1)) st.z = h.z;
      mine.__head = cut({ active: st.active || null, z: st.z || 1 });
    }
  } finally { applying = false; }

  if (touched) {
    /* redraw without going back out: `changed` is what push() listens to,
       and applying is already false by here, so it is told explicitly */
    applying = true;
    try { M().changed('net'); } finally { applying = false; }
  }
}

/* ══ WIRING ════════════════════════════════════════════════════ */
function join(w) {
  leave();
  word = w;
  mine = {};
  ours = {};
  sendNow.moaned = false;
  /* The GM's board IS the table's board -- it goes up whole the moment the
     table is hosted, and there is nothing of theirs to hold back.

     A player is arriving at somebody else's table. Two different things
     have to be true for them: they send nothing until the table's own
     board has reached them (`synced`), and whatever was already on their
     own wood is never sent at all (`ours`). The first stops a joiner
     overwriting the GM; the second stops an evening of their own private
     prep being published to the room the first time they nudge a token.
     Both are set BEFORE the watch goes on, because in local mode a watch
     answers immediately and take() would otherwise run against the wrong
     flags. */
  if (S().role === 'gm') {
    synced = true;
  } else {
    synced = false;
    (((M() && M().state.things) || [])).forEach(t => { if (t && t.id) ours[t.id] = 1; });
  }
  offs.push(root.Net.watch(path(), take));
  if (S().role === 'gm') sendNow();
}
function leave() {
  offs.splice(0).forEach(f => { try { f(); } catch (e) {} });
  if (sendT) { root.clearTimeout(sendT); sendT = 0; }
  word = null; mine = {}; ours = {}; synced = false;
}

root.addEventListener('monarchy:session', e => {
  const d = e.detail || {};
  if (d.what === 'hosting' || d.what === 'joined') join(d.word);
  if (d.what === 'left' || d.what === 'closed') leave();
});

/* every change to the wood, from anywhere: a drag, a bin, an undo, the
   toolbox putting something down. One choke point (22-table-model.js), so
   nothing can change the board without this hearing about it. */
if (M()) M().on(() => push());

root.BoardNet = { push: sendNow, get wired() { return !!word; } };

})(window, document);
