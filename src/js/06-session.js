/* ══════════════════════════════════════════════════════════════
   06-session.js — A TABLE THAT OTHER PEOPLE ARE AT.

   grumkata: "tables are only active when a gm instantiates one by hosting
   it which is diffrent then opening a table understood".

   Understood, and it is the distinction the whole file is built on:

     OPENING   is what you have always been able to do. A table is a save
               in this browser. You open it, the wood is there, your things
               are on it, and nobody else is involved. It works on a plane.

     HOSTING   is a GM saying "this one is happening now". It puts the
               table on the wire under a WORD, opens it to ten players, and
               makes this client the one whose copy is the real one. A
               hosted table is LIVE; the same table unhosted is just a save.

   So hosting is not a property of a table, it is a thing being done to one,
   and it stops when the GM stops. There is no such thing as a table that is
   live with nobody hosting it — when the GM goes, the session closes and
   everyone else is holding a copy, which is exactly what happens when a
   game night ends.

   ── WHAT IS ON THE WIRE ──────────────────────────────────────
     /tables/{word}/meta     who is hosting, what it is called, when
     /tables/{word}/seats    the LEDGER: uid -> arrival number, never erased
     /tables/{word}/who      PRESENCE: one node per person here right now
     /tables/{word}/chat     what has been said
     /tables/{word}/sheets   character sheets pulled to this table

   `seats` and `who` look like the same thing and are emphatically not.
   BEING HERE and HAVING A PLACE are different facts with different
   lifetimes. `who` is presence: it is removed the moment a socket dies, by
   the server, because a chair with nobody in it should not be drawn. But
   if the PLACE went with it, then every dropped connection would reshuffle
   the table — Bob's phone loses signal in a tunnel, and when he comes back
   he is sitting somewhere else, and so is everyone relative to him. That is
   exactly what grumkata asked not to happen, and a flaky hotel wifi would
   cause it six times an evening.

   So the arrival number is written once into a ledger that is NOT cleaned
   up, and coming back reads it. You keep your place for the life of the
   session whether or not you are currently in it.

   `who` is the interesting one. Each person owns exactly their own node
   and writes nothing else, which is what makes this safe to open up with
   database rules: there is no path by which one player can move, rename or
   evict another. The GM's extra powers are over `meta`, not over people.

   ── AND THE ORDER IS NOT STORED ──────────────────────────────
   There is no seat number on the wire. There is an arrival number `n`, and
   04-ring.js turns the set of them into a seating — the same cycle on every
   machine, rotated so each client is at its own near side. Storing angles
   would mean one client deciding where everyone sits and the rest trusting
   it, which is a race every time two people join at once.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const Net = () => root.Net;
const Ring = () => root.Ring;

let word = null;          /* the table's word, while we are at one */
let role = null;          /* 'gm' | 'player' */
let tableId = null;       /* which local save this is */
let members = [];         /* everyone at it, as last heard */
let meta = null;
let beat = 0;
let sent = null;          /* what the table already knows about us */
let resitting = false;    /* one attempt at a time to take our chair back */
const offs = [];          /* the watches to drop on the way out */

const live = () => !!word;
const uid = () => Net().uid;

/* one event for everything, with `what` saying which part moved. The view
   layers listen once and decide for themselves whether they care. */
function say(what, extra) {
  const detail = Object.assign({ what, word, role, meta,
    members: members.slice(), seats: live() ? seating() : [] }, extra || {});
  root.dispatchEvent(new CustomEvent('monarchy:session', { detail }));
}

/* ── the word a table sits under ──────────────────────────────
   Short, sayable down a phone, and unambiguous when it is: no letters that
   turn into other letters out loud or on a whiteboard. */
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY349';
function makeWord(n) {
  let s = '';
  for (let i = 0; i < (n || 5); i++)
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
const tidy = w => String(w || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

/* ── what this client tells the table about itself ────────────
   Read fresh each time rather than captured, so changing your arms or your
   likeness in the hall reaches the table you are sitting at. */
function mine() {
  let me = {};
  try { me = JSON.parse(root.localStorage.getItem('monarchy.me.v1')) || {}; } catch (e) {}
  return {
    name: String(me.name || '').trim() || 'Someone',
    arms: me.arms || null,
    /* the full-length likeness that stands at your place (16-menu.js).
       It is a data URI and it is the only big thing any of this writes, so
       it is written once on arrival and then only if it changes. */
    body: me.body || '',
    pic: me.pic || ''
  };
}

/* ══ HOSTING ═══════════════════════════════════════════════════ */
function host(id, opts) {
  opts = opts || {};
  if (live()) return Promise.reject(new Error('already at a table'));
  return Net().start().then(() => {
    const w = tidy(opts.word) || makeWord(5);
    tableId = id; role = 'gm';
    const m = {
      id: id,
      name: String(opts.name || 'The Table'),
      host: uid(),
      hostName: mine().name,
      opened: Net().now(),
      /* an explicit flag rather than "meta exists": a table that has been
         hosted before leaves its meta behind, and a stale node must not
         read as an open game. */
      live: true
    };
    return Net().set('tables/' + w + '/meta', m)
      .then(() => { word = w; return claim(); })
      .then(() => { listen(); say('hosting'); return w; })
      .catch(e => { unwind(); throw e; });
  });
}

/* ══ JOINING ═══════════════════════════════════════════════════ */
function join(w) {
  if (live()) return Promise.reject(new Error('already at a table'));
  const want = tidy(w);
  if (!want) return Promise.reject(new Error('no word'));
  return Net().start()
    .then(() => Net().get('tables/' + want + '/meta'))
    .then(m => {
      if (!m || !m.live) throw new Error('no table is sitting under that word');
      return Net().get('tables/' + want + '/who').then(who => {
        const here = asList(who).filter(p => p.uid === uid() || Net().fresh(p.seen));
        /* THE CAP IS ON PEOPLE, NOT ON PLACES. Eleven in the room; the
           ledger may hold more names than that over an evening, and
           somebody who left should not keep a chair warm against the
           limit. Your own uid never counts against you — rejoining is
           not arriving. */
        const already = here.some(p => p.uid === uid());
        if (!already && Ring().full(here)) throw new Error('that table is full');
        word = want;
        /* the host rejoining their own table is still its GM */
        role = (m.host === uid()) ? 'gm' : 'player';
        tableId = m.id; meta = m;
        return claim();
      });
    })
    .then(() => { listen(); say('joined'); return word; })
    .catch(e => { unwind(); throw e; });
}

/* -- A JOIN THAT FAILS HALFWAY --------------------------------
   `word` has to be set before the seat is claimed, because claim() needs
   to know which table it is claiming at. So a claim that failed -- a
   dropped packet, a refused write, a socket that died between the two --
   left this client LIVE at a table it had never actually sat down at: no
   watches, no heartbeat, an empty ring drawn on the wood, and every retry
   refused for being "already at a table". There is no half-way: either we
   are at a table or we are in the hall. */
function unwind() {
  stopBeat();
  offs.splice(0).forEach(off => { try { off(); } catch (e) {} });
  word = null; role = null; tableId = null; members = []; meta = null;
  sent = null; resitting = false;
}

/* ── the place that is yours for the evening ──────────────────
   Read the ledger; take the number already written against this uid, or
   the next one if there is none. Written back before anybody sits, so two
   people arriving together cannot both read "the next one is 3" — and if
   they do race, they end up with the same number and 04-ring.js breaks the
   tie by uid, identically on every machine. A collision is untidy, not
   wrong; the order still agrees everywhere, which is the requirement. */
function claim() {
  const led = 'tables/' + word + '/seats';
  return Net().get(led).then(book => {
    book = book || {};
    let n = book[uid()];
    if (typeof n !== 'number') {
      n = -1;
      Object.keys(book).forEach(k => { if (typeof book[k] === 'number' && book[k] > n) n = book[k]; });
      n += 1;
    }
    return Net().set(led + '/' + uid(), n).then(() => sit(n));
  });
}

/* ── taking a place ───────────────────────────────────────────
   `n` is the arrival number from the ledger above. Written as one object
   so a client never exists at the table half-formed. */
function sit(n) {
  const at = 'tables/' + word + '/who/' + uid();
  return Net().get(at).then(was => {
    const me = mine();
    const node = Object.assign({}, me, {
      uid: uid(),
      role: role,
      n: (typeof n === 'number') ? n : ((was && was.n) || 0),
      joined: (was && was.joined) || Net().now(),
      seen: Net().now()
    });
    return Net().set(at, node).then(() => {
      /* what the table now knows about us, so refresh() can send the one
         thing that changed rather than our likeness all over again */
      sent = me;
      /* the server's own promise to clear this seat if we vanish */
      Net().vanishOnDisconnect(at);
      startBeat();
    });
  });
}

/* ── still here ───────────────────────────────────────────────
   onDisconnect covers a socket that closes. It does not cover a laptop
   lid, a killed process or a tunnel, so everybody also says so on a timer
   and everybody else reaps what has gone quiet. No agreement needed: each
   client reaches the same conclusion from the same timestamps. */
function startBeat() {
  stopBeat();
  beat = root.setInterval(() => {
    if (!live()) return stopBeat();
    /* A BEAT CAN BE REFUSED, and the refusal is the interesting case. The
       rules require `who/$uid` to carry our own uid; a beat is a partial
       write of `seen` alone, so if our node is GONE the merged result has
       no uid in it and the database says no. That is not a transient error
       to swallow -- it is the table telling us we are not in it. (It was
       swallowed, in the worst way: no catch at all, so it surfaced as an
       unhandled rejection every four seconds and nothing else.) */
    Net().update('tables/' + word + '/who/' + uid(), { seen: Net().now() })
      .catch(() => resit());
  }, Net().BEAT);
}
function stopBeat() { if (beat) { root.clearInterval(beat); beat = 0; } }

/* -- TAKING OUR OWN CHAIR BACK --------------------------------
   Guarded, because the thing that triggers it is a node being absent and
   a failed attempt leaves it absent: without the flag a refused write
   would spin. One attempt at a time, and the heartbeat is the retry. */
function resit() {
  if (!live() || resitting) return Promise.resolve();
  resitting = true;
  const done = () => { resitting = false; };
  return claim().then(done, done);
}

/* ══ LISTENING ═════════════════════════════════════════════════ */
function listen() {
  /* -- OUR OWN CHAIR, WATCHED -----------------------------------
     onDisconnect is a promise the SERVER keeps, and it keeps it whether or
     not we meant to go. A closed lid, a tunnel, a sleeping laptop: the
     socket dies, the server clears our presence, and then the machine
     wakes up and carries on beating into a node that is no longer there.

     The heartbeat cannot put it back. It writes `seen` alone -- which on
     Firebase is refused for having no uid, leaving us invisible to the
     whole table for the rest of the night, and in local mode resurrects a
     node with no name, no likeness and NO ARRIVAL NUMBER. That last one is
     the bad one: `n` missing sorts to the end of the ring, so one person's
     tunnel moves them past everybody on every screen at the table -- the
     exact reshuffle the ledger exists to prevent.

     So we watch our own chair, and if it goes we sit down again -- through
     claim(), which reads our number back out of the ledger. That is what
     the ledger is FOR, and until now nothing read it after the first
     claim. */
  offs.push(Net().watch('tables/' + word + '/who/' + uid(), node => {
    if (!live() || resitting) return;
    if (node && node.uid === uid()) return;      /* still in our seat */
    if (meta && meta.live === false) return;     /* the table is closing */
    resit();
  }));
  offs.push(Net().watch('tables/' + word + '/who', who => {
    members = asList(who).filter(p => p.uid === uid() || Net().fresh(p.seen));
    say('who');
  }));
  offs.push(Net().watch('tables/' + word + '/meta', m => {
    meta = m;
    /* the GM has closed it, or their client is gone: the table is a save
       again and everybody is told rather than left talking to nothing */
    if (!m || !m.live) { if (live() && role !== 'gm') { leave('closed'); } }
    else say('meta');
  }));
  offs.push(Net().watch('tables/' + word + '/chat', c => {
    say('chat', { chat: asList(c, 'key') });
  }));
  offs.push(Net().watch('tables/' + word + '/sheets', s => {
    say('sheets', { sheets: asList(s, 'key') });
  }));
}

/* a Firebase node is an object of objects; everything here wants a list */
function asList(node, keyAs) {
  if (!node || typeof node !== 'object') return [];
  return Object.keys(node).map(k => {
    const v = node[k];
    if (v == null || typeof v !== 'object') return null;
    return Object.assign({}, v, keyAs ? { key: k } : { uid: v.uid || k });
  }).filter(Boolean);
}

/* ══ LEAVING ═══════════════════════════════════════════════════ */
function leave(why) {
  if (!live()) return Promise.resolve();
  const w = word, was = role;
  stopBeat();
  offs.splice(0).forEach(off => { try { off(); } catch (e) {} });
  const jobs = [Net().remove('tables/' + w + '/who/' + uid())];
  /* THE TABLE IS ONLY LIVE WHILE ITS GM IS. Not a rule imposed on anyone —
     it is what "hosting" means. Everyone else's client sees meta.live go
     false and stands down of its own accord. */
  if (was === 'gm') {
    jobs.push(Net().update('tables/' + w + '/meta', { live: false }));
    /* AND THE GM TAKES THE TABLE DOWN BEHIND THEM. Nothing else ever would:
       a session leaves eleven likenesses, a night of chat and every sheet
       anybody brought sitting in the database for ever, and a likeness is a
       few hundred kilobytes. The meta stays — it is small, and it is what
       stops a stale word reading as an open game — but everything that has
       weight goes. The rules let the host write anywhere under their own
       table, which is exactly what this is for. */
    jobs.push(Net().remove('tables/' + w + '/who'));
    jobs.push(Net().remove('tables/' + w + '/chat'));
    jobs.push(Net().remove('tables/' + w + '/sheets'));
    jobs.push(Net().remove('tables/' + w + '/seats'));
    /* AND THE WOOD ITSELF, which is the heaviest thing on the wire by a
       long way: one thing carrying an uploaded picture is a few hundred
       kilobytes and a night's play is a boardful of them. It was the one
       node this list forgot, because the board went on the wire
       (60-board-net.js) some time after this cleanup was written and
       nothing here was told -- so every table ever hosted stayed in the
       database entire, for ever. */
    jobs.push(Net().remove('tables/' + w + '/board'));
  }
  word = null; role = null; members = []; meta = null;
  sent = null; resitting = false;
  /* who we WERE, since role is already gone by now: a player who leaves
     goes home, a GM who stops hosting is still at their own table */
  say(why || 'left', { was: was, left: w });
  return Promise.all(jobs).catch(() => {});
}

/* ── you, changed ─────────────────────────────────────────────
   Your name, your arms and your likeness live in the hall and can be
   edited while you are sitting at a table. This pushes the new version of
   them into your own node, and nobody else's — which is the only node this
   client ever writes to. */
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
function refresh() {
  if (!live()) return Promise.resolve();
  const me = mine();
  /* ONLY WHAT ACTUALLY CHANGED. This is bound to the `input` event on the
     name field (16-menu.js:755), so it runs once per KEYSTROKE -- and
     mine() carries `body`, a full-length likeness as a data URI. Sending
     the whole of yourself each time meant typing a twelve-letter name
     pushed your portrait twelve times, and ten other clients downloaded it
     twelve times. mine()'s own note says the likeness is written "once on
     arrival and then only if it changes"; this is the part that makes that
     sentence true. */
  const job = {};
  Object.keys(me).forEach(k => { if (!sent || !same(sent[k], me[k])) job[k] = me[k]; });
  if (!Object.keys(job).length) return Promise.resolve();
  sent = me;
  job.seen = Net().now();
  return Net().update('tables/' + word + '/who/' + uid(), job);
}

/* ══ WHAT IS SAID ════════════════════════════════════════════ */
function talk(text, kind, extra) {
  const t = String(text == null ? '' : text).trim();
  if (!live() || !t) return Promise.resolve(null);
  const line = {
    uid: uid(), who: mine().name, role: role,
    /* a roll line is markup, and one with a dozen dice in it runs well past
       600 characters -- cut there, it arrived with its closing tags gone */
    text: t.slice(0, kind === 'roll' ? 3800 : 600), kind: kind || 'say', at: Net().now()
  };
  /* a roll can carry the dice it threw, as numbers (39-dice.js) */
  const dice = extra && diceOf(extra.dice);
  if (dice) line.dice = dice;
  return Net().push('tables/' + word + '/chat', line);
}
/* only what a die is: a kind the tray has and a face it can show. Anything
   else on the wire is dropped here AND on arrival (57-chat-net.js). */
const DIE_KINDS = { 4: 1, 6: 1, 8: 1, 10: 1, 12: 1, 20: 1, coin: 1 };
function diceOf(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const out = [];
  for (const d of list.slice(0, 60)) {
    if (!d || !DIE_KINDS[d.kind]) continue;
    if (d.kind === 'coin') {
      if (d.result === 'Heads' || d.result === 'Tails') out.push({ kind: 'coin', result: d.result });
      continue;
    }
    const r = parseInt(d.result, 10);
    if (r >= 1 && r <= d.kind) out.push({ kind: d.kind, result: r });
  }
  return out.length ? out : null;
}

/* ══ THE SHEETS SOMEBODY PULLED ONTO THE WOOD ══════════════════
   grumkata: "people should be able to connect ANNY number of charcter
   sheets to a table by pulling it there". Any number, and by anyone: a GM
   running four NPCs and a player with two characters are the same case, so
   there is no cap and no per-person allowance. What there IS is ownership —
   the sheet records who brought it, and only they can take it away. */
function bring(sheet) {
  if (!live() || !sheet || !sheet.id) return Promise.resolve(null);
  const at = 'tables/' + word + '/sheets/' + sheet.id;
  /* WHO BROUGHT IT IS SET ONCE AND NEVER AGAIN. A GM adjusting a player's
     hit points goes through this same call — and writing `by: uid()` every
     time would quietly hand them ownership of that player's character, so
     the player could no longer take it home. The bringer is read back off
     the table and kept. (The database rules say the same thing, so a client
     that forgets is refused rather than obeyed.) */
  return Net().get(at).then(was => Net().set(at, {
    id: sheet.id,
    by: (was && was.by) || uid(),
    who: (was && was.who) || mine().name,
    name: (sheet.who && sheet.who.name) || sheet.name || 'Unnamed',
    at: (was && was.at) || Net().now(),
    touched: Net().now(),
    data: sheet
  })).then(() => sheet.id);
}
function takeBack(sheetId) {
  if (!live() || !sheetId) return Promise.resolve();
  return Net().get('tables/' + word + '/sheets/' + sheetId).then(s => {
    if (!s) return;
    if (s.by !== uid() && role !== 'gm') return;   /* not yours to remove */
    return Net().remove('tables/' + word + '/sheets/' + sheetId);
  });
}

/* ══ WHO IS WHERE, FOR THE VIEW ════════════════════════════════
   The one call the table makes. Every client runs it with its own uid and
   gets its own rotation of the same cycle (04-ring.js). */
function seating() { return Ring().seating(members, uid()); }

root.Session = { host, join, leave, talk, bring, takeBack, seating, refresh,
                 makeWord, tidy, diceOf,
                 get live() { return live(); },
                 get word() { return word; },
                 get role() { return role; },
                 get tableId() { return tableId; },
                 get members() { return members.slice(); },
                 get meta() { return meta; },
                 get uid() { return uid(); } };

})(window, document);
