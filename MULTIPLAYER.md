# Multiplayer — eleven people at one table

Ten players and a GM. This is the standing reference for how a table goes on
the wire; `PROJECT.md` §3.20 records why it is shaped this way.

## The two doors, which are not the same door

| | what it is |
|---|---|
| **Open** | a table is a save in this browser. You open it, your things are on the wood, nobody else is involved. Works on a plane. |
| **Host** | a GM says *"this one is happening now"*. It puts the table on the wire under a **word**, opens it to ten players, and makes this client the one whose copy is the real one. |

**Hosting is done from inside the table**, not when opening one — Escape, or
the mark in the top left, then *Host this table*. It is a decision you make
once you are looking at the wood, not a fork in the road before you have seen
it. The same menu is where you stop hosting, leave a game you joined, and go
back to the hall.

A table is **live only while its GM is hosting it**. When the GM leaves,
`meta.live` goes false, every other client stands down of its own accord, and
what everyone is left holding is a save. That is not a limitation bolted on —
it is what hosting means, and it is why there is no such thing as an
abandoned live table.

The word (`TUCRP`) is five characters from an alphabet with no letters that
turn into other letters when spoken across a room: **no B, I, O, S, Z, 0, 1,
2, 5, 8**. It is meant to be said out loud, not pasted.

## What is on the wire

```
/tables/{WORD}/
  meta      { id, name, host, hostName, opened, live }
  seats     { uid: n }            the LEDGER — arrival order, never erased
  who       { uid: {...} }        PRESENCE — removed the instant a socket dies
  chat      { pushId: {...} }
  sheets    { sheetId: {...} }
```

**`seats` and `who` are not the same thing**, and the distinction is the
whole of the seating guarantee. *Being here* and *having a place* have
different lifetimes: presence is removed the moment a connection dies, but if
the place went with it, then every dropped connection would reshuffle the
table. Bob's phone loses signal in a tunnel and when he comes back he is
sitting somewhere else — and so is everyone, relative to him. So the arrival
number is written once into a ledger that is **not** cleaned up, and coming
back reads it.

## The seating, and why everyone agrees

Two requirements that look contradictory:

- **Every client puts itself at the near seat.** You are always at the bottom
  of your own screen, because you are sitting there.
- **The order is the same for everyone.** If Bob is beside you, Bob is beside
  you on every screen at the table.

They resolve because what must agree is not *where* anyone is in degrees, it
is *who is beside whom, and which way round* — a **cyclic** order, and a
cyclic order survives rotation exactly. So there is one global ring, and each
client rotates it until its own place comes first.

```
global:  A B C D          (by arrival number, uid as tiebreak)
A sees:  A B C D          at -180, -90, 0, 90
C sees:  C D A B          at -180, -90, 0, 90
```

Both agree B is clockwise of A. Neither sees the same angles.

Spacing is `-180 + 360·k/n`, so two people face each other, three make an
equilateral triangle, eleven sit at 32.7° apart. **The GM is in the ring like
anybody else** — "evenly spaced" has no exception in it, and a round table
does not have a head.

No angle is ever stored. Storing one would mean a single client deciding
where everyone sits and the rest trusting it, which is a race every time two
people join at once.

`src/js/04-ring.js` is pure — no DOM, no network, no clock — which is why
`test/session.test.js` can check it exhaustively against eleven independent
clients.

## Presence is a heartbeat, not a promise

**A cleared chair is taken back.** `onDisconnect` is a promise the *server*
keeps, and it keeps it whether or not you meant to go — a closed lid, a
tunnel, a sleeping laptop. The heartbeat cannot undo it: a beat writes `seen`
alone, and `seen` alone is not a person. On Firebase the rules refuse it for
carrying no uid, so you stay invisible for the rest of the night; with no
rules it resurrects a nameless node with **no arrival number**, which sorts
last and moves you past everybody on every screen at the table. So each
client watches its own node in `who`, and if it goes, sits down again through
`claim()` — which reads the number back out of the ledger. That is what the
ledger is for, and until it was fixed nothing read it after the first claim.

**And the clock that is consulted is the server's.** `seen` is written with
the server's stamp, but it has to be *read* against something, and reading it
against `Date.now()` meant a machine running half a minute fast found every
beat at the table stale, reaped the lot, and drew an empty room to somebody
sitting in a full one. `.info/serverTimeOffset` is watched and added back on.

`onDisconnect` is used because it is instant, and it is **not trusted alone**.
A slept laptop, a `kill -9`, a phone walking out of signal — the socket may
take a long time to be noticed. So every client also writes `seen` every four
seconds and anybody stale by fifteen is treated as gone by everybody else,
independently, with no agreement needed. Both transports get this for free
because it lives in `05-net.js` rather than in either of them.

## Two transports, one shape

- **Firebase Realtime Database.** Chosen over Firestore because presence is
  the hard part of a table and `onDisconnect` is a thing RTDB has.
- **Local.** The same tree in `localStorage`, shouted over a
  `BroadcastChannel`. Every window on one machine sees it. Not a toy — it is
  how this is developed and tested without credentials, and it means the
  multiplayer path is exercised by `npm test`.

No config is not an error. It is local mode, and the Join screen says so.

## The project

`monarchy-companion`, baked in at `src/firebase.config.json` and put on the
page by `build.js` as `window.__FIREBASE_CONFIG__`.

**A Firebase web config is not a secret and cannot be made one.** This ships
as an `.exe`; whatever it needs to reach the database is in the binary on
every player's machine, and no build-time cleverness changes that. Google
publish these in their own documentation. The API key identifies the
project — it does not grant access to anything.

**What protects the data is the rules below, and nothing else.** The
repository is public, so the database URL is public. If the rules are left in
test mode, anyone who reads them can wipe the database.

Settings → Multiplayer overrides the baked-in config on one machine, for
testing against a second project. It accepts the `const firebaseConfig = { … }`
form the console prints, unquoted keys and all, and parses it rather than
`eval`ing it.

### The two console switches

Neither is optional, and the app names whichever one is missing on the Join
screen rather than just going quiet:

1. **Authentication → Sign-in method → Anonymous → Enable.** Without it every
   client gets `auth/admin-restricted-operation` and falls back to
   this-machine-only.
2. **Realtime Database → Rules** → the rules below.

### The rules, which matter

They are in **`firebase.rules.json`** at the root of this repository — one
file, so there is one copy of them and it is the one that gets pasted.

**Firebase console → Realtime Database → Rules → paste the whole file →
Publish.** A brand-new database is locked: everything, including reads, is
refused until this is done, which is what `PERMISSION_DENIED` means.

To check it took, run `node test/rules-check.js`. It tries each operation the
app performs against the live database **one at a time**, so the answer comes
back as a list of what is allowed and what is refused rather than a single
yes/no — which is the difference between "multiplayer is broken" and "the
host can write but a player cannot claim a seat". It is not part of
`npm test`, because it needs a real database on the other end.

What they say:

- **Read** is open to anyone signed in **who knows the word**. You cannot
  list tables — there is no read on `tables` itself — so the word is the
  capability, which is the right level for a game table and the wrong level
  for anything private. Do not put anything in a character sheet you would
  mind a stranger reading if they guessed five characters.
- **Each client writes only its own node.** `who/$uid` and `seats/$uid` are
  writable by that uid and nobody else, and `who` carries a `.validate` so a
  node cannot even claim to be somebody else.
- **Only the GM can touch `meta`**, which is what makes hosting a thing one
  person is doing rather than a free-for-all.
- **Chat is append-only.** A line cannot be edited or deleted, by anyone,
  including whoever wrote it — and it cannot be posted under another uid.
- **A sheet's bringer is set once.** The `.validate` requires `by` to be
  unchanged on every later write, so a GM adjusting a player's hit points
  cannot take that character away from them.
- **The host may write anywhere under their own table.** That is what lets
  them clear it up on the way out (below).

### And the table is taken down behind you

Nothing else would do it. A session otherwise leaves eleven likenesses, a
night of chat and every sheet anybody brought sitting in the database for
ever, and a likeness is a few hundred kilobytes. When the GM stops hosting,
`who`, `chat`, `sheets`, `seats` and `board` all go; `meta` stays, because it
is small and it is what stops a stale word reading as an open game.

`board` was missing from that list for as long as there was a board — it went
on the wire after this cleanup was written and nothing here was told — so
every table ever hosted stayed in the database entire, which is the single
heaviest thing this app could have left lying about.

## A roll is markup, and markup from a stranger

Chat text is escaped. A **roll** is not text — it is the rendered line, sent
whole, because re-deriving it on each client would mean a second renderer to
keep in step with the first. That makes it markup from a machine this one
does not control.

So it is filtered (`ChatNet.scrub`): only the tags and class names
`39-dice.js`'s own roll line is built from survive. Every attribute is
dropped. The worst a hostile client can manage is a roll that looks wrong.
`test/session.test.js` throws seven attacks at it.

**The dice are sent as their results.** The numbers are decided once, by
whoever rolled — eleven clients each rolling would be eleven answers to one
roll. A thrown roll's line carries `dice: [{ kind, result }]`, and every
other table stages the same throw landing on those faces (`57-chat-net.js`
`throwFor`), because the tumble never decided anything: the numbers come
first and the throw is choreographed to land on them. Both ends filter the
list to real dice (`Session.diceOf`). Rolls already in the chat when you sit
down are not thrown again, your own throw is not thrown twice, and Settings →
Throw dice on the wood turns other people's off along with yours.

## Who may do what

The chest and the bin are the GM's: a player at a live table does not see
either. A player cannot move, size, stack, bin, rename, turn over or write
on anything on the wood, or command a unit in a running fight — except what
they put there themselves: a note from their pocket, a line they drew
(`TableModel.playerMayTouch`: `t.by` is their uid). It is enforced by the
client; the database rules do not police the board.

Everyone has the kit (`64-kit.js`, PROJECT.md 3.23): their own characters,
their own notes, a pen, and pointing.

| | where it lives on the wire |
|---|---|
| a brought sheet | `sheets/{id}`, as before; the Join screen brings the ones you picked |
| a drawn line | `board/things/{id}`, kind `ink` — an ordinary thing |
| a note put on the table | `board/things/{id}`, kind `note`, with `by` and its `sketch` |
| a note in your pocket | nowhere — this machine only |
| "players may draw" | `meta.draw`, written only by the host (`Session.allow`) |
| a point | `who/{uid}/ping` — your own presence node, so no new rule |

## The guest table

A player does not open the GM's save id. They walk into `guest-<WORD>`, a
table of their own that the board is mirrored into, started empty on every
arrival and emptied again when they leave — the GM's board is not theirs to
keep. `60-board-net.js` names the local table it belongs in and never applies
or sends while a different one is loaded, because the board used to arrive
before the player had walked into the table: it landed in their last table,
and then loading the right one read as binning every piece, which sent a null
for each and deleted the GM's board for everybody.

Leaving as a player walks you back to the hall; so does the GM closing the
table.

## Sheets

> *"people should be able to connect ANNY number of charcter sheets to a
> table by pulling it there"*

Any number, from anyone — a GM running four NPCs and a player with two
characters are the same case, so there is no cap and no per-person allowance.
**Pulling one there is placing it**: take a character out of the chest and put
it on the wood, and its sheet comes with it. No share button, no second
gesture.

They appear *everywhere*, not in a panel. `58-sheets-net.js` widens one
function — `Characters.roster()` — so the chest, the counters, the papers and
the token maker all gained shared sheets without a line changing in any of
them. A shared sheet carries `__shared` and `__by`, which matters in exactly
two places: writes go to the **table** rather than into your own roster, and
the client that brought a sheet folds changes back into its local copy, so an
evening's damage is still there tomorrow.

Only the one who brought a sheet — or the GM — can take it away.

## What is not built yet

Honest gaps, in the order they would hurt:

- **No kick, no lock, no transfer of host.** A GM cannot eject anybody or
  hand the table to someone else.
- **The board has no size limit on the wire.** `chat` caps a line at 4000
  characters; `board` caps nothing, and a thing can carry an uploaded
  picture. Anyone who knows the word can write as much of it as they like.
- **Sheets are whole-record writes.** Two people editing the same sheet in
  the same second, last write wins. Fine for hit points, not for prose.
