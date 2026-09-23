/* ══════════════════════════════════════════════════════════════
   session.test.js — ELEVEN PEOPLE AT ONE TABLE.

   grumkata: "its important the order stays the exact same on everyones
   stream so if bob is next to me on my side bob should always be next to
   me, they should also be evenly spaced".

   That is a claim about what SEVERAL machines agree on, so it cannot be
   tested on one. The browser tests cannot help either: the local transport
   shares its tree through localStorage, and every page in one browser
   profile shares that — so three pages in one browser are not three
   clients, they are one client with three windows, which is exactly the
   confusion the first attempt at this test fell into.

   So each client here gets its OWN global object, with its own copy of
   04-ring.js and 06-session.js, and they are wired to one shared tree
   standing in for the server. That is the real shape of the thing: N
   independent programs, one database, no shared memory.

   What is under test is the session and the ring. The wire itself
   (05-net.js) is checked where it can be: in the browser, one client, in
   join.test.js -- except for the clock, which needs a server that is
   demonstrably out of step with this machine and so is easier to stand up
   here, against a stubbed Firebase, than in a real browser.
══════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ok = [], bad = [];
const T = (n, c) => { (c ? ok : bad).push(n); console.log((c ? '  ok  ' : 'FAIL  ') + n); };
const SRC = f => fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f), 'utf8');

/* ══ ONE SERVER ════════════════════════════════════════════════
   A plain object and a list of watchers. Deliberately not clever: if this
   had a scheduler, a queue or a delay model it would be testing itself. */
function Server() {
  const tree = {};
  const watchers = [];
  const cut = p => String(p).split('/').filter(Boolean);
  const dig = p => { let n = tree; for (const k of cut(p)) { if (n == null) return null; n = n[k]; }
                     return n === undefined ? null : n; };
  const plant = (p, v) => {
    const ks = cut(p); let n = tree;
    for (let i = 0; i < ks.length - 1; i++) { if (typeof n[ks[i]] !== 'object' || !n[ks[i]]) n[ks[i]] = {}; n = n[ks[i]]; }
    if (v === null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = v;
  };
  const touched = p => watchers.forEach(w => {
    if (w.path === p || p.indexOf(w.path + '/') === 0 || w.path.indexOf(p + '/') === 0)
      w.cb(clone(dig(w.path)));
  });
  const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
  return {
    read: p => clone(dig(p)),
    write: (p, v) => { plant(p, v); touched(p); },
    merge: (p, o) => { Object.keys(o).forEach(k => plant(p + '/' + k, o[k])); touched(p); },
    watch: (p, cb) => { const w = { path: p, cb }; watchers.push(w);
                        cb(clone(dig(p)));
                        return () => { const i = watchers.indexOf(w); if (i >= 0) watchers.splice(i, 1); }; },
    dump: () => clone(tree)
  };
}

/* ══ ONE CLIENT ════════════════════════════════════════════════ */
function Client(server, uid, name) {
  const win = {
    localStorage: (() => { const m = {}; return {
      getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); },
      removeItem: k => { delete m[k]; } }; })(),
    setInterval: () => 0, clearInterval: () => {},
    addEventListener: (t, f) => { if (t === 'monarchy:session') win.__onSession = f; },
    removeEventListener: () => {},
    dispatchEvent: e => { (win.__heard = win.__heard || []).push(e.detail); return true; },
    CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }
  };
  win.window = win;
  win.document = { getElementById: () => null, querySelector: () => null,
                   addEventListener: () => {} };
  win.localStorage.setItem('monarchy.me.v1', JSON.stringify({ name }));
  /* the wire, standing in for 05-net.js */
  win.Net = {
    BEAT: 4000, STALE: 15000,
    get uid() { return uid; }, get mode() { return 'test'; },
    start: () => Promise.resolve(uid),
    get: p => Promise.resolve(server.read(p)),
    set: (p, v) => { server.write(p, v === undefined ? null : v); return Promise.resolve(); },
    update: (p, o) => { server.merge(p, o); return Promise.resolve(); },
    push: (p, v) => { const k = '-' + Math.random().toString(36).slice(2, 9);
                      server.write(p + '/' + k, v); return Promise.resolve(k); },
    remove: p => { server.write(p, null); return Promise.resolve(); },
    watch: (p, cb) => server.watch(p, cb),
    vanishOnDisconnect: () => {},
    now: () => Date.now(),
    ageOf: s => (typeof s === 'number' ? Date.now() - s : 0),
    fresh: s => (typeof s === 'number' ? Date.now() - s : 0) < 15000
  };
  /* a table model small enough to be obviously right, with the one hook
     60-board-net.js uses: `on(fn)` for every change, and `state.things`. */
  win.TableModel = (function () {
    const subs = [];
    return {
      state: { id: 't', things: [], active: null, z: 1 },
      on(f) { subs.push(f); return () => {}; },
      changed(why) { subs.forEach(f => { try { f(this.state, why); } catch (e) {} }); },
      put(t) { this.state.things.push(t); this.changed('put'); return t; },
      move(id, x) { const t = this.state.things.find(o => o.id === id);
                    if (t) { t.x = x; this.changed('move'); } },
      drop(id) { const i = this.state.things.findIndex(o => o.id === id);
                 if (i >= 0) { this.state.things.splice(i, 1); this.changed('bin'); } },
      ids() { return this.state.things.map(t => t.id + '@' + t.x).sort().join(' '); }
    };
  })();
  win.setTimeout = (f) => { f(); return 0; };      /* the debounce, taken out */
  win.clearTimeout = () => {};
  const ctx = vm.createContext(win);
  vm.runInContext(SRC('04-ring.js'), ctx);
  vm.runInContext(SRC('06-session.js'), ctx);
  vm.runInContext(SRC('60-board-net.js'), ctx);
  /* the sandbox has no real event target, so the session's announcements
     are handed to the board module by hand */
  const heard = [];
  win.dispatchEvent = e => { heard.push(e.detail);
    win.__onSession && win.__onSession(e); return true; };
  return win;
}

(async () => {
  /* ══ HOSTING IS NOT OPENING ═════════════════════════════════ */
  {
    const S = Server();
    const gm = Client(S, 'u-gm', 'Grum');
    const bob = Client(S, 'u-bob', 'Bob');

    let refused = null;
    await bob.Session.join('NOPE').catch(e => { refused = e.message; });
    T('a table nobody is hosting cannot be joined', /no table/.test(refused || ''));

    const word = await gm.Session.host('t1', { name: 'Thursday' });
    T('a GM hosting one gets a word to say out loud',
      typeof word === 'string' && word.length === 5 && /^[A-Z0-9]+$/.test(word));
    T('and is the GM of it', gm.Session.role === 'gm' && gm.Session.live);

    await bob.Session.join(word);
    T('and then it can be joined', bob.Session.live && bob.Session.role === 'player');
    T('the joiner is told which local table it is', bob.Session.tableId === 't1');

    await gm.Session.leave();
    T('the GM leaving closes the table rather than leaving it adrift',
      S.read('tables/' + word + '/meta').live === false);
    let after = null;
    const cal = Client(S, 'u-cal', 'Cal');
    await cal.Session.join(word).catch(e => { after = e.message; });
    T('and nobody can join it afterwards', /no table/.test(after || ''));
  }

  /* ══ THE RING, WITH REAL CLIENTS ════════════════════════════ */
  {
    const S = Server();
    const names = ['Grum', 'Bob', 'Cal', 'Dee', 'Eve', 'Fay', 'Gil', 'Hal', 'Ivy', 'Jon', 'Kit'];
    const cs = [];
    const gm = Client(S, 'u-0', names[0]);
    const word = await gm.Session.host('t2', { name: 'Full house' });
    cs.push(gm);
    for (let i = 1; i < 11; i++) {
      const c = Client(S, 'u-' + i, names[i]);
      await c.Session.join(word);
      cs.push(c);
    }
    T('eleven fit: ten players and a GM', cs.every(c => c.Session.live)
      && cs[0].Session.members.length === 11);

    const twelfth = Client(S, 'u-11', 'Lem');
    let over = null;
    await twelfth.Session.join(word).catch(e => { over = e.message; });
    T('and a twelfth is turned away', /full/.test(over || ''));

    /* the claim, tested against every pair of viewers */
    const cycleOf = c => c.Ring.cycle(c.Session.members).join(' ');
    const first = cycleOf(cs[0]);
    T('every client computes the same global order  (' + first.split(' ').length + ' deep)',
      cs.every(c => cycleOf(c) === first));

    const nbrs = c => {
      const s = c.Session.seating(), n = s.length, m = {};
      s.forEach((x, i) => { m[x.uid] = s[(i + 1) % n].uid + '|' + s[(i - 1 + n) % n].uid; });
      return m;
    };
    const base = nbrs(cs[0]);
    T('and every client agrees who is beside whom, in the same direction',
      cs.every(c => { const m = nbrs(c);
        return Object.keys(base).every(k => m[k] === base[k]); }));

    T('while each of them is at their OWN near seat',
      cs.every(c => { const s = c.Session.seating()[0];
        return s.mine && s.at === -180 && s.uid === c.Session.uid; }));

    T('and the eleven places are evenly spaced', (() => {
      const at = cs[0].Session.seating().map(s => s.at);
      const gaps = at.map((a, i) => ((at[(i + 1) % at.length] - a) + 360) % 360);
      return gaps.every(g => Math.abs(g - 360 / 11) < 1e-9);
    })());

    /* two people is facing, three is a triangle — the cases he named */
    T('two people face each other; three make a triangle', (() => {
      const two = cs[0].Ring.seating([{ uid: 'a', n: 0 }, { uid: 'b', n: 1 }], 'a').map(s => s.at);
      const three = cs[0].Ring.seating(
        [{ uid: 'a', n: 0 }, { uid: 'b', n: 1 }, { uid: 'c', n: 2 }], 'a').map(s => s.at);
      return two.join() === '-180,0' && three.join() === '-180,-60,60';
    })());

    /* ── somebody drops out ── */
    const gone = cs[5].Session.uid;
    const wasNext = {};
    cs.forEach(c => { const s = c.Session.seating();
      s.forEach((x, i) => { if (x.uid !== gone && s[(i + 1) % s.length].uid !== gone)
        wasNext[c.Session.uid + '>' + x.uid] = s[(i + 1) % s.length].uid; }); });
    await cs[5].Session.leave();
    T('when one of them goes, the rest keep their order',
      cs.filter(c => c.Session.live).every(c => {
        const s = c.Session.seating();
        return s.every((x, i) => {
          const key = c.Session.uid + '>' + x.uid;
          return !(key in wasNext) || wasNext[key] === s[(i + 1) % s.length].uid;
        });
      }));
    T('and they close up evenly, ten now', (() => {
      const at = cs[0].Session.seating().map(s => s.at);
      if (at.length !== 10) return false;
      const gaps = at.map((a, i) => ((at[(i + 1) % at.length] - a) + 360) % 360);
      return gaps.every(g => Math.abs(g - 36) < 1e-9);
    })());

    /* ── and coming back gets your place back, not a new one ── */
    const backIn = Client(S, gone, 'Fay');
    await backIn.Session.join(word);
    T('somebody who rejoins takes their own place back',
      backIn.Session.members.find(m => m.uid === gone).n === 5
      && cs[0].Session.members.length === 11);

    /* THE SCENARIO THIS IS ALL FOR: a phone goes through a tunnel. The
       place must survive it, or a bad connection reshuffles everybody's
       table several times an evening. */
    T('and after a drop and a reconnect, every neighbour is unchanged',
      (() => {
        const now = nbrs(cs[0]);
        return Object.keys(base).every(k => now[k] === base[k]);
      })());
  }

  /* ══ CHAT AND SHEETS ════════════════════════════════════════ */
  {
    const S = Server();
    const gm = Client(S, 'u-gm', 'Grum');
    const bob = Client(S, 'u-bob', 'Bob');
    const word = await gm.Session.host('t3', {});
    await bob.Session.join(word);

    await bob.Session.talk('is it my turn');
    const said = Object.values(S.read('tables/' + word + '/chat') || {});
    T('what one says, the table hears, signed by the one who said it',
      said.length === 1 && said[0].text === 'is it my turn' && said[0].who === 'Bob'
      && said[0].uid === 'u-bob');

    /* any number of sheets, from anyone */
    await bob.Session.bring({ id: 's1', who: { name: 'Aldric Vane' } });
    await bob.Session.bring({ id: 's2', who: { name: 'Second Character' } });
    await gm.Session.bring({ id: 's3', who: { name: 'An NPC' } });
    const sheets = S.read('tables/' + word + '/sheets') || {};
    T('anyone can pull any number of character sheets onto the wood',
      Object.keys(sheets).length === 3 && sheets.s1.by === 'u-bob' && sheets.s3.by === 'u-gm');

    await gm.Session.takeBack('s1');
    T('the GM can take one back off the table',
      !(S.read('tables/' + word + '/sheets') || {}).s1);
    await bob.Session.takeBack('s3');
    T('but a player cannot take away somebody else\'s',
      !!(S.read('tables/' + word + '/sheets') || {}).s3);
    await gm.Session.takeBack('s3');
    T('and the one who brought it can', !(S.read('tables/' + word + '/sheets') || {}).s3);

    /* A GM ADJUSTING A PLAYER'S HIT POINTS GOES THROUGH THE SAME CALL, and
       the first version wrote `by: me` every time — which quietly handed
       the GM ownership of that player's character, so the player could no
       longer take it back off the table or home. The bringer is set once. */
    await gm.Session.bring({ id: 's2', who: { name: 'Second Character' }, hp: 3 });
    T('a GM editing a player sheet does not take it from them', (() => {
      const n = (S.read('tables/' + word + '/sheets') || {}).s2;
      return n && n.by === 'u-bob' && n.who === 'Bob' && n.data.hp === 3;
    })());
    await bob.Session.takeBack('s2');
    T('so the player can still take their own character home',
      !(S.read('tables/' + word + '/sheets') || {}).s2);

    /* and nothing is left behind afterwards but the meta, which is what
       stops a stale word reading as an open game */
    await bob.Session.bring({ id: 's9', who: { name: 'Someone' } });
    await gm.Session.talk('goodnight');
    /* AND THE BOARD, which this test did not used to put down and so did
       not used to miss. The board went on the wire after the cleanup was
       written; both this list and leave()'s forgot it, and a passing test
       said the table had been tidied away while the heaviest node in it
       sat there for ever. */
    gm.TableModel.put({ id: 'p1', kind: 'token', name: 'a token', x: 10 });
    await gm.Session.leave();
    T('when the GM stops, the weight of the evening goes with them', (() => {
      const t = S.read('tables/' + word) || {};
      return !t.who && !t.chat && !t.sheets && !t.seats && !t.board
        && t.meta && t.meta.live === false;
    })());
  }

  /* ══ A ROLL IS MARKUP FROM ANOTHER MACHINE ══════════════════
     Every other chat line is escaped, because it is text somebody typed. A
     roll is the rendered line itself — which makes it markup somebody could
     have typed, from a client this one does not control and cannot verify.
     Anyone able to write to the table's chat could put a script tag or an
     onerror in a "roll" and have it run in ten other people's apps.

     So it is filtered down to the handful of tags and class names that
     39-dice.js's own roll line is built from. The worst a hostile client
     should manage is a roll that looks wrong. */
  {
    const { JSDOM } = require('jsdom');
    /* outside-only gives us window.eval with a real document behind it,
       without letting any page script run */
    const dom = new JSDOM('<body></body>', { runScripts: 'outside-only' });
    const w = dom.window;
    /* jsdom's own `window` is a getter, so the module is run IN that window
       rather than in a context pretending to be one */
    w.eval(fs.readFileSync(
      path.join(__dirname, '..', 'src', 'js', '57-chat-net.js'), 'utf8'));
    const scrub = w.ChatNet.scrub;

    const attacks = [
      ['a script tag', '<script>steal()</script>'],
      ['an image with onerror', '<img src=x onerror="steal()">'],
      ['a handler on an allowed tag', '<b onclick="steal()">7</b>'],
      ['a javascript: link', '<a href="javascript:steal()">roll</a>'],
      ['an iframe', '<iframe src="//elsewhere"></iframe>'],
      ['a style that covers the screen',
       '<span class="rtot" style="position:fixed;inset:0;z-index:99999">9</span>'],
      ['an svg with a handler', '<svg onload="steal()"><circle/></svg>']
    ];
    const bang = /<(script|img|iframe|svg|a)\b/i;
    const handler = /\bon[a-z]+\s*=/i;
    const styled = /style\s*=/i;
    const jsurl = /javascript:/i;
    const survived = attacks.filter(function (pair) {
      const out = scrub(pair[1]);
      return bang.test(out) || handler.test(out) || styled.test(out) || jsurl.test(out);
    });
    T('nothing dangerous survives a roll line from another machine  ('
      + attacks.length + ' tried)', survived.length === 0);
    survived.forEach(function (pair) {
      console.log('        through: ' + pair[0] + '  ' + scrub(pair[1]));
    });

    T('and a real roll line comes through with its shape intact', (function () {
      const real = '<b>Grum</b><span class="rspec">d20+3</span>'
                 + '<span class="rdice"><i class="hi">20</i><u>+3</u></span>'
                 + '<span class="rtot">23</span>';
      const out = scrub(real);
      return out.indexOf('class="rspec"') >= 0 && out.indexOf('class="rtot"') >= 0
        && out.indexOf('class="hi"') >= 0 && out.indexOf('<u>+3</u>') >= 0
        && out.indexOf('Grum') >= 0;
    })());
  }


  /* ══ THE SAME WOOD ═══════════════════════════════════════════
     grumkata: "nothing updated on either side so it was as if i didnt join
     the table". The board had never been on the wire at all — people, chat
     and sheets were, and the one thing a table IS was not. */
  {
    const S = Server();
    const gm = Client(S, 'u-gm', 'Grum');
    const bob = Client(S, 'u-bob', 'Bob');
    const cal = Client(S, 'u-cal', 'Cal');

    gm.TableModel.put({ id: 'a', kind: 'token', name: 'Aldric', x: 100 });
    const word = await gm.Session.host('tb', {});
    await bob.Session.join(word);

    T('a joiner arrives to the board that is already on the table',
      bob.TableModel.ids() === 'a@100');

    gm.TableModel.put({ id: 'b', kind: 'token', name: 'A goblin', x: 400 });
    T('and what the GM puts down appears in front of them',
      bob.TableModel.ids() === 'a@100 b@400');

    bob.TableModel.move('b', 650);
    T('a player can move a piece and the GM sees it',
      gm.TableModel.ids() === 'a@100 b@650');

    await cal.Session.join(word);
    T('somebody arriving late gets the board as it stands now',
      cal.TableModel.ids() === 'a@100 b@650');

    /* THE CASE WHOLE-BOARD WRITES GET WRONG. Two people moving two
       different pieces in the same moment: with one node per thing they
       touch different keys and both survive, which a whole-board write
       cannot promise — whoever landed second would erase the other. */
    gm.TableModel.move('a', 111);
    cal.TableModel.move('b', 999);
    T('two people moving two pieces at once do not erase each other',
      gm.TableModel.ids() === 'a@111 b@999'
      && bob.TableModel.ids() === 'a@111 b@999'
      && cal.TableModel.ids() === 'a@111 b@999');

    gm.TableModel.drop('a');
    T('and binning one takes it off every table',
      bob.TableModel.ids() === 'b@999' && cal.TableModel.ids() === 'b@999');

    /* a client that has never synced must not have its own board wiped by
       an empty node — which is what would happen if "not on the wire" were
       read as "deleted" */
    const dee = Client(S, 'u-dee', 'Dee');
    dee.TableModel.put({ id: 'z', kind: 'note', name: 'my own note', x: 5 });
    await dee.Session.join(word);
    T('and a joiner keeps what was already on their own wood',
      dee.TableModel.ids().indexOf('z@5') >= 0);
  }


  /* the harness answers every read and write from an already-resolved
     promise, so one turn of the event loop drains a whole chain of them */
  const settle = () => new Promise(r => setImmediate(r));

  /* == A SOCKET THAT DIES, AND A CHAIR THAT DOES NOT ===========
     The commonest thing that happens on a game night is somebody shutting
     a laptop. onDisconnect is a promise the SERVER keeps, so their
     presence goes; the heartbeat then writes `seen` into a node that is no
     longer there, and `seen` alone is not a person. On Firebase the rules
     refuse it for having no uid and they stay invisible all evening; here,
     with no rules, it resurrects a nameless node with no arrival number —
     which sorts last and moves them past everybody on every screen.

     The ledger knew their number the whole time. Nothing read it. */
  {
    const S = Server();
    const gm  = Client(S, 'u-gm',  'Grum');
    const bob = Client(S, 'u-bob', 'Bob');
    const cal = Client(S, 'u-cal', 'Cal');
    const word = await gm.Session.host('tb', {});
    await bob.Session.join(word);
    await cal.Session.join(word);
    const before = gm.Session.seating().map(m => m.uid).join(' ');

    S.write('tables/' + word + '/who/u-bob', null);   /* the lid closes */
    await settle();

    const back = S.read('tables/' + word + '/who/u-bob') || {};
    T('a presence cleared by a dead socket is taken up again',
      back.uid === 'u-bob' && back.name === 'Bob' && back.role === 'player');
    T('and the place it takes back is the one the ledger remembers',
      back.n === 1);
    T('so one person going through a tunnel reseats nobody',
      gm.Session.seating().map(m => m.uid).join(' ') === before);
  }

  /* == YOUR OWN WOOD IS NOT THE TABLE'S =======================
     You open a table of your own, put your prep on it, then join somebody
     else's game. sendNow() sends everything it has not sent before, and a
     joiner has not sent any of it — so the first token they nudged used to
     publish the lot. Skipping the one send at join time covered a single
     instant and nothing after it. */
  {
    const S = Server();
    const gm  = Client(S, 'u-gm',  'Grum');
    const dee = Client(S, 'u-dee', 'Dee');
    gm.TableModel.put({ id: 'a', kind: 'token', name: 'Aldric', x: 100 });
    const word = await gm.Session.host('tb', {});

    dee.TableModel.put({ id: 'z', kind: 'note', name: 'my own prep', x: 5 });
    await dee.Session.join(word);
    dee.TableModel.move('a', 222);

    const wire = Object.keys(S.read('tables/' + word + '/board/things') || {}).sort().join(' ');
    T('what a joiner had on their own wood is not published to the table',
      wire === 'a');
    T('but the move they actually made at it reaches everybody',
      gm.TableModel.ids() === 'a@222');
    T('and they keep their own things in front of them',
      dee.TableModel.ids().indexOf('z@5') >= 0);
  }

  /* == EITHER YOU ARE AT A TABLE OR YOU ARE IN THE HALL =======
     `word` is set before the seat is claimed, because claim() needs to
     know where it is claiming. A claim that failed left the client live at
     a table it had never sat down at: no watches, no heartbeat, an empty
     ring, and every retry refused for being "already at a table". */
  {
    const S = Server();
    const gm  = Client(S, 'u-gm',  'Grum');
    const bob = Client(S, 'u-bob', 'Bob');
    const word = await gm.Session.host('tb', {});

    const realSet = bob.Net.set;
    bob.Net.set = (p, v) => p.indexOf('/seats/') >= 0
      ? Promise.reject(new Error('PERMISSION_DENIED')) : realSet(p, v);
    let failed = null;
    await bob.Session.join(word).catch(e => { failed = e.message; });
    T('a join that fails halfway does not strand you at the table',
      /PERMISSION_DENIED/.test(failed || '') && !bob.Session.live && !bob.Session.word);

    bob.Net.set = realSet;
    let again = null;
    await bob.Session.join(word).catch(e => { again = e.message; });
    T('and the next try is not refused for being "already at a table"',
      !again && bob.Session.live && !!S.read('tables/' + word + '/who/u-bob'));
  }

  /* == CHANGING YOUR NAME IS NOT SENDING YOUR PORTRAIT =========
     refresh() is bound to the `input` event on the name field, so it runs
     once per keystroke — and it used to send the whole of mine(), which
     carries a full-length likeness as a data URI. */
  {
    const S = Server();
    const gm  = Client(S, 'u-gm',  'Grum');
    const bob = Client(S, 'u-bob', 'Bob');
    const LIKENESS = 'data:image/png;base64,' + 'A'.repeat(20000);
    bob.localStorage.setItem('monarchy.me.v1',
      JSON.stringify({ name: 'Bob', body: LIKENESS }));
    const word = await gm.Session.host('tb', {});
    await bob.Session.join(word);

    const wrote = [];
    const realUpdate = bob.Net.update;
    bob.Net.update = (p, o) => { wrote.push(o); return realUpdate(p, o); };

    await bob.Session.refresh();
    T('telling the table nothing has changed about you sends nothing',
      wrote.length === 0);

    bob.localStorage.setItem('monarchy.me.v1',
      JSON.stringify({ name: 'Bob the Bold', body: LIKENESS }));
    await bob.Session.refresh();
    T('and changing your name does not carry your likeness along with it',
      wrote.length === 1 && wrote[0].name === 'Bob the Bold' && !('body' in wrote[0]));
    T('though the table does learn the new name',
      (S.read('tables/' + word + '/who/u-bob') || {}).name === 'Bob the Bold');
  }

  /* == THE READER'S CLOCK, WHICH IS NOT THE SERVER'S ===========
     `seen` is written with the SERVER's stamp, so that one machine with a
     wrong clock cannot post a beat from next Tuesday. But it was read back
     against Date.now() -- this machine's clock -- and that half was never
     corrected. A laptop running forty seconds fast therefore finds every
     other beat at the table older than STALE, reaps the lot, and draws an
     empty room to somebody who is sitting in a full one.

     This drives the real 05-net.js against a Firebase that is stubbed down
     to the two things the case needs: a sign-in, and a server willing to
     say how far out we are. */
  {
    const OFFSET = -40000;        /* our clock is 40s AHEAD of the server's */
    let offCb = null;
    const win = {
      localStorage: (() => { const m = {}; return {
        getItem: k => (k in m ? m[k] : null),
        setItem: (k, v) => { m[k] = String(v); },
        removeItem: k => { delete m[k]; } }; })(),
      addEventListener: () => {},
      __FIREBASE_CONFIG__: { apiKey: 'test-key' }
    };
    win.window = win;
    win.document = { addEventListener: () => {} };
    const db = { ref: p => ({
      on: (ev, cb) => { if (p === '.info/serverTimeOffset') offCb = cb; return cb; },
      off: () => {}, once: () => Promise.resolve({ val: () => null }),
      set: () => Promise.resolve(), update: () => Promise.resolve(),
      onDisconnect: () => ({ remove: () => {} })
    }) };
    const database = () => db;
    database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };
    win.firebase = {
      apps: [], initializeApp: () => ({}), app: () => ({}), database: database,
      auth: () => ({ signInAnonymously: () => Promise.resolve({ user: { uid: 'u-fb' } }) })
    };
    const ctx = vm.createContext(win);
    vm.runInContext(SRC('05-net.js'), ctx);
    const N = win.Net;

    await N.start();
    T('the wire signs in and knows it is on firebase',
      N.mode === 'firebase' && N.uid === 'u-fb');
    T('and until the server says otherwise it assumes no difference',
      N.skew === 0);

    /* asked as its own question, so that a wire which stopped asking fails
       here and readably rather than throwing on a null callback below */
    T('and it asks the server how far out we are',
      typeof offCb === 'function');
    if (offCb) offCb({ val: () => OFFSET });   /* the server: you are 40s fast */
    T('it takes the server\'s own account of the difference', N.skew === OFFSET);

    /* a beat the SERVER stamped one second ago */
    const justNow = (Date.now() + OFFSET) - 1000;
    T('a beat one second old reads as one second old, not forty-one',
      Math.abs(N.ageOf(justNow) - 1000) < 200 && N.fresh(justNow));

    /* and somebody who really has gone quiet is still reaped */
    const longGone = (Date.now() + OFFSET) - (N.STALE + 5000);
    T('while somebody who has genuinely gone quiet is still let go',
      !N.fresh(longGone));
  }

  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  process.exit(bad.length ? 1 : 0);
})();
