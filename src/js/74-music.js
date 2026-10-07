/* ══════════════════════════════════════════════════════════════
   74-music.js — THE GM'S AUDIO AND VIDEO: SEPARATE THINGS, EACH WITH ITS OWN QUEUE OF YOUTUBE LINKS.

   The GM pastes a YouTube link — a video or a playlist — and it plays at every table-mate's machine
   at once. Nothing is streamed between us: the GM publishes a tiny note (the queue, which entry is
   playing, playing or paused, how far in) only when something CHANGES, and each client runs its own
   YouTube player and keeps time from that note. A player who sits down late is handed the current
   note and joins mid-song.

     { ids:[≤100 video ids], idx, state:'play'|'pause', loop:0|1, pos:seconds, at:server-time, n:nonce }

   grumkata: "music and video are 2 separate things, a playlist should not have music then video,
   they are wholly separate ... you should even be able to have multiple videos on the table at once
   and be able to play them all at once." So there are INDEPENDENT CHANNELS, each a player of its own
   with its own queue, its own note, its own controls, and never one thing's entries in another's:

     · MUSIC — one. A HUD at the top of the screen. No picture. Note: tables/{w}/music.
     · VIDEO — as many as the GM puts on the table. Each is a SCREEN (a `video` thing on the wood: its
       frame, and the picture laid over it) with a deck of controls beside it. Note: tables/{w}/video/{id}.

   Each channel can play, pause, skip, loop and be added to, taken from and moved about, on its own.
   Everyone sees what is playing and what is NEXT. ONLY THE GM CONTROLS ANY OF IT; EVERYONE CONTROLS
   THEIR OWN VOLUME (and can stop a channel for themselves). The controls are Monarchy's own
   (77-player.js), never YouTube's. The Toolbox's Audio tab only MAKES things: a link played now or
   added to the queue of the music, or of a screen.

   A VIDEO'S PICTURE IS ON THE TABLE, laid over its frame by the frame's four corners and following it
   (aim()). Each channel's player lives in its own box and is never moved in the page — an iframe that
   is moved starts again, and a prop is rebuilt every time the table changes. The same player takes
   every entry of its queue in turn (loadVideoById, one video at a time; the list is OURS, never
   YouTube's), so editing a queue never reloads what is playing.

   A VIDEO THAT IS TO BE SEEN IS NEVER SHOWN WHILE IT LOADS (see begin(), settle()). AND YOU ARE ALWAYS
   TOLD WHAT IT IS DOING: the status is read from the player's state, not from the picture.

   WHY YOUTUBE ONLY. Spotify's embed needs every listener logged in (and Premium for more than 30
   seconds), so it cannot play the same thing at the same moment for a table of guests. NEEDS PROGRAM
   1.1 or later: a page loaded from file:// sends no Referer, and YouTube refuses an embed without one
   (error 153); electron/main.js adds it, and window.AppShell.api >= 2 says this copy has.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const S = () => root.Session;
const N = () => root.Net;
const T = () => root.TableModel;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hms = s => { s = Math.max(0, Math.floor(+s || 0)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

const VOL_KEY = 'monarchy.musicvol.v2';
const supported = () => !!(root.__musicForce || (root.AppShell && root.AppShell.api >= 2));
const onNet = () => !!(S() && S().live);
/* THE GM, AND ONLY THE GM: the host of a live table, or you at your own table. (An assistant may have the Toolbox's
   key, but the note is the host's to write, so for the music an assistant is a player.) */
const isGM = () => !!(T() && T().mayUseBox && T().mayUseBox()) && (!onNet() || (S() && S().role === 'gm'));
const atTable = () => doc.body.classList.contains('at-table');

/* the volume a new channel starts at, kept on this machine: one for the music, one for videos */
const vols = { music: 60, video: 60 };
try {
  const j = JSON.parse(root.localStorage.getItem(VOL_KEY));
  if (j && typeof j === 'object') ['music', 'video'].forEach(k => { const v = parseInt(j[k], 10); if (v >= 0 && v <= 100) vols[k] = v; });
  else { const v = parseInt(root.localStorage.getItem('monarchy.musicvol.v1'), 10); if (v >= 0 && v <= 100) { vols.music = v; vols.video = v; } }
} catch (e) {}
const saveVols = () => { try { root.localStorage.setItem(VOL_KEY, JSON.stringify(vols)); } catch (x) {} };

/* ══ WHAT A LINK IS ═══════════════════════════════════════════
   A video, a playlist, or both (watch?v=…&list=…); or a bare 11-character id.
   Spotify gets an honest answer, not a silent failure. */
const VID = /^[\w-]{11}$/, LST = /^[\w-]{10,64}$/;
function parseLink(text) {
  const t = String(text || '').trim();
  if (!t) return { error: 'Paste a YouTube link first.' };
  if (/spotify\./i.test(t)) return { error: 'Spotify cannot play in sync for everyone — paste a YouTube video or playlist link.' };
  if (VID.test(t)) return { video: t };
  let u;
  try { u = new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t); } catch (e) { return { error: 'That is not a link I can read.' }; }
  const h = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let video = null, list = null;
  if (h === 'youtu.be') video = u.pathname.slice(1).split('/')[0];
  else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    video = u.searchParams.get('v');
    if (!video) { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/); if (m) video = m[1]; }
    list = u.searchParams.get('list');
  } else return { error: 'That is not a YouTube link.' };
  if (video && !VID.test(video)) video = null;
  if (list && !LST.test(list)) list = null;
  if (!video && !list) return { error: 'I could not find a video or a playlist in that link.' };
  return { video, list };
}

/* ══ WHAT ARRIVES IS CHECKED ══════════════════════════════════
   Only the host can write a note, but a note is still text from another
   machine: ids that are ids, an index inside the list, numbers that are numbers. */
function clean(m) {
  if (!m || typeof m !== 'object' || !Array.isArray(m.ids)) return null;
  const ids = m.ids.filter(x => typeof x === 'string' && VID.test(x)).slice(0, 100);
  if (!ids.length) return null;
  const idx = Math.max(0, Math.min(ids.length - 1, parseInt(m.idx, 10) || 0));
  const pos = Math.max(0, Math.min(86400, +m.pos || 0));
  return { ids, idx, state: m.state === 'play' ? 'play' : 'pause', loop: m.loop ? 1 : 0, pos, at: +m.at || 0, n: String(m.n || '').slice(0, 12) };
}

/* ══ WHAT IS SHARED BETWEEN THE CHANNELS ══════════════════════ */
let apiP = null;
function loadApi() {
  if (root.YT && root.YT.Player) return Promise.resolve(root.YT);
  if (apiP) return apiP;
  apiP = new Promise((res, rej) => {
    const prev = root.onYouTubeIframeAPIReady;
    root.onYouTubeIframeAPIReady = () => { try { if (prev) prev(); } catch (e) {} res(root.YT); };
    const s = doc.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiP = null; rej(new Error('offline')); };
    doc.head.appendChild(s);
  });
  return apiP;
}
/* THE IDS OF A PLAYLIST, read in a player of its own and thrown away, so a playing one is never disturbed. (A YouTube player that
   has held a playlist will not take a single video afterwards, so a playing player is only ever given single videos.) */
function readPlaylist(list) {
  return loadApi().then(YT => new Promise(res => {
    const holder = doc.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:240px;height:240px';
    holder.innerHTML = '<div id="mu-yt-tmp"></div>';
    doc.body.appendChild(holder);
    let done = false, iv = 0, tp = null;
    const fin = ids => { if (done) return; done = true; clearInterval(iv); try { tp && tp.destroy(); } catch (e) {} holder.remove(); res(ids); };
    tp = new YT.Player('mu-yt-tmp', { width: 240, height: 240, playerVars: { autoplay: 0, controls: 0, enablejsapi: 1, playsinline: 1 },
      events: { onReady: () => { try { tp.cuePlaylist({ listType: 'playlist', list, index: 0 }); } catch (e) {} } } });
    iv = setInterval(() => { let ids = null; try { ids = tp.getPlaylist(); } catch (e) {} if (ids && ids.length) fin(ids.filter(x => VID.test(x)).slice(0, 100)); }, 250);
    setTimeout(() => fin(null), 12000);
  })).catch(() => null);
}
/* the names of what is in a queue: YouTube's own oEmbed, a few at a time, kept for every channel */
const titles = {};              /* video id -> its name */
let tFetching = 0;
function fetchTitles(ids, then) {
  if (!root.fetch) return;
  const want = ids.slice(0, 60).filter(id => titles[id] === undefined);
  const next = () => {
    if (tFetching >= 3 || !want.length) return;
    const id = want.shift(); titles[id] = '';
    tFetching++;
    root.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id))
      .then(r => r.json()).then(j => { titles[id] = String(j.title || '').slice(0, 90); }, () => { titles[id] = ''; })
      .then(() => { tFetching--; if (then) then(); next(); });
    next();
  };
  next();
}
/* what YouTube's error numbers mean, in words a GM can act on */
const WHY = {
  2: 'that is not a video YouTube knows',
  5: 'YouTube’s player hit an error',
  100: 'that video is gone or private',
  101: 'its owner does not allow it to be played outside YouTube',
  150: 'its owner does not allow it to be played outside YouTube',
  153: 'this copy of Monarchy is too old to play music — install the new version'
};

/* the layers the video channels live in: the pictures (over the wood, under the figures and the dice) and the decks (over the figures,
   under the dice) — both exactly the table's view, never taking the pointer except where there is something to press */
let woodEl = null, decksEl = null;
function layers() {
  if (!woodEl) {
    woodEl = doc.createElement('div'); woodEl.id = 'mu-wood';
    decksEl = doc.createElement('div'); decksEl.id = 'mu-decks';
    doc.body.appendChild(woodEl); doc.body.appendChild(decksEl);
  }
  return { wood: woodEl, decks: decksEl };
}
/* the unit square onto the four points (top-left, top-right, bottom-right, bottom-left), as a CSS matrix3d */
function warp(q, W, H) {
  const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-6) return null;
  const g = (dx3 * dy2 - dy3 * dx2) / den, h = (dx1 * dy3 - dy1 * dx3) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  return 'matrix3d(' + [a / W, d / W, 0, g / W, b / H, e / H, 0, h / H, 0, 0, 1, 0, x0, y0, 0, 1].map(n => +n.toFixed(6)).join(',') + ')';
}

/* ══ A CHANNEL ════════════════════════════════════════════════
   One player with its own queue. `kind` is 'music' or 'video'; a video's `id` is the id of its screen on the table. */
function makeChannel(kind, id) {
  const isVideo = kind === 'video';
  const pid = isVideo ? 'mu-vp-' + id : 'mu-yt-p';               /* the id of the YouTube player's own element */
  const write = n => { if (!onNet()) return; const s = S(); if (isVideo) { if (s.setVideo) s.setVideo(id, n); } else if (s.setMusic) s.setMusic(n); };

  let hud = null, box = null, ui = null, uiCtl = null;           /* its DOM: the HUD (music) or the picture and the deck (video) */
  let player = null, ready = false, destroyed = false;
  let waiters = [];               /* what is waiting for the player to be ready */
  let cur = null;                 /* the note this client is playing to */
  let loaded = [];                /* the queue: video ids. The GM's is the truth; a player's is the note's */
  let loop = false;               /* after the last, go back to the first */
  let nowId = '';                 /* the video the player has been given */
  let intent = 'pause';           /* what the GM last asked of it (the player's own state lags) */
  let localOff = false;           /* this player stopped it for themselves */
  let loading = false, asking = false, dog = 0;
  let idx = 0;                    /* which of the queue is playing */
  let prep = null;                /* a video being warmed up where nobody can see or hear it: { t0, start, playingSince, t1, fixes, said } */
  let lastLead = 1.6;             /* how long the last warm-up took: a player starts that far ahead of the GM, to arrive with them */
  let publishOnStart = false;     /* the GM's note is written when their player has really begun */
  let holding = false;            /* the player has been given a video (a new, empty player has not) */
  let everPlayed = false;         /* the video it was given has begun to play at least once */
  let vol = vols[kind], title = '', said = '', pstate = -1;
  let lastLink = '', loadTok = 0, failStreak = 0;
  let held = false;               /* a player paused it for themselves: it stays paused until the GM does something */
  let quietUntil = 0;             /* the player's own stops (the hall, a stop we asked for) are not the GM's hand on the player */
  let seekRef = null;             /* where the GM's player was and when: a jump of the bar is told from time passing */
  let aimed = '', deckRect = null;
  const peekLog = [];             /* the last few things that stopped or failed, with the time */
  const logp = t => { peekLog.push(Math.round(Date.now() / 100) % 100000 + ' ' + t); if (peekLog.length > 12) peekLog.shift(); };
  const quiet = () => { quietUntil = Date.now() + 1500; };
  const nameOf = () => { const t = isVideo && T() && T().get(id); return t ? (t.name || 'Video') : 'Music'; };

  /* ── what it is on the table (a video) ── */
  const frameProp = () => isVideo ? doc.querySelector('#tbl .prop.t3-video[data-id="' + id + '"]') : null;
  const screenEl = () => { const f = frameProp(); return f ? f.querySelector('.vid-screen') : null; };

  /* ══ THE PLAYER ═══════════════════════════════════════════ */
  const settleWaiters = p => { const w = waiters; waiters = []; w.forEach(f => f(p)); };
  /* A NEW, EMPTY PLAYER */
  function fresh() {
    clearTimeout(dog);
    settleWaiters(null);                                      /* whatever waited on the old player will not get it */
    if (player) { try { player.destroy(); } catch (e) {} }
    player = null; ready = false; loaded = []; nowId = ''; idx = 0; pstate = -1; title = '';
    prep = null; publishOnStart = false; holding = false; everPlayed = false;
    mount();
    box.innerHTML = '<div id="' + pid + '"></div>';
  }
  function ensurePlayer() {
    if (player && ready) return Promise.resolve(player);
    /* a player is being made: wait for it, and no longer than YouTube is given */
    if (player) return new Promise(res => { waiters.push(res); setTimeout(() => res(null), 20000); });
    mount();
    if (!doc.getElementById(pid)) box.innerHTML = '<div id="' + pid + '"></div>';
    return loadApi().then(YT => new Promise(res => {
      const mine = new YT.Player(pid, {
        width: 240, height: 240,
        /* no `origin`: this page is file://, and the Referer is the shell's. controls 0: every control is Monarchy's own */
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, rel: 0, playsinline: 1, enablejsapi: 1, cc_load_policy: 0, iv_load_policy: 3, modestbranding: 1, fs: 0 },
        events: {
          onReady: () => { if (player !== mine) return res(null); ready = true; try { mine.setVolume(vol); } catch (e) {} res(mine); settleWaiters(mine); },
          onStateChange: stateChange,
          onError: failed
        }
      });
      player = mine;
      /* A NAVIGATION THAT NEVER STARTS. Measured in the real app (two machines, a video put away and music
         made 2.7 s later): now and then the new player's frame sits at about:blank, its address never even
         requested, until it is asked again — then it loads in a tenth of a second. So it is asked again if
         it has not answered at 5 s and 11 s, rather than left to look like "loading for ever". */
      [5000, 11000].forEach(ms => setTimeout(() => {
        if (destroyed || player !== mine || ready) return;
        const f = doc.getElementById(pid);
        if (f && f.tagName === 'IFRAME' && f.src) { logp('player not ready after ' + ms + ' ms: asked again'); f.src = f.src; }
      }, ms));
      setTimeout(() => res(null), 20000);                     /* YouTube never answered: do not wait for ever */
    })).catch(() => { note('The ' + (isVideo ? 'video' : 'music') + ' could not start — is this machine online?'); return null; });
  }

  /* ══ PUTTING A VIDEO INTO THE PLAYER — THE ONE PLACE ══════
     The list is OURS, not YouTube's: the player is only ever given one video at a time (loadVideoById), and the next one is
     chosen here. That is faster to start (a playlist page loads slower than a video, and draws prev/next arrows over the
     picture) and leaves nothing in the player to go stale.

     A VIDEO THAT IS TO BE SEEN IS NEVER SHOWN WHILE IT LOADS. grumkata: "when i play a video it creates a loading screen while i
     can hear the video in the background ... either load it and wait till loading is finished to play the video or no loading
     screen". YouTube's picture shows a black loading screen and a spinner until it has data, and a buffering ring over a playing
     picture whenever it runs short. So a video is first WARMED UP where nobody can see or hear it (muted, off the screen) and is
     revealed — unmuted — only when it has really been playing and has several seconds buffered ahead (settle() / show()). Until
     then the screen says so in words. Music has no picture to be caught staring at a spinner, so it starts at once.
     `hide` is that warm-up. */
  function begin(p, i, start, hide) {
    idx = i; nowId = loaded[i];
    holding = true; everPlayed = false; seekRef = null;
    prep = hide ? { t0: Date.now(), start: start || 0, playingSince: 0, t1: 0, fixes: 0, said: false } : null;
    try { if (hide) p.mute(); else { p.unMute(); p.setVolume(vol); } } catch (e) {}
    try { p.loadVideoById({ videoId: loaded[i], startSeconds: Math.max(0, start || 0) }); } catch (e) { logp('loadVideoById threw ' + e); }
    paint();
  }
  /* WARMED UP, THEN SHOWN. Checked four times a second while one is warming up. It is shown (unmuted, the picture laid on its
     screen) when it has been PLAYING steadily for a moment with seconds buffered ahead of it: YouTube re-buffers, with a ring
     over the picture, on every seek and every resume from a pause — measured, even with twenty seconds in hand — so nothing is
     sought or paused on the way. Instead the GM's video is shown a little way in (and the table is told that place), and a
     player's is started a little AHEAD of the GM by as long as the last warm-up took, which is measured as it goes. A player
     that still finds itself more than a second out is moved while it is still hidden. */
  function settle() {
    if (!prep || !player || !ready) return;
    let st = -1, t = 0, dur = 0, fr = 0;
    try { st = player.getPlayerState(); t = player.getCurrentTime() || 0; dur = player.getDuration() || 0; fr = player.getVideoLoadedFraction() || 0; } catch (e) {}
    pstate = st;
    if (!prep.said && Date.now() - prep.t0 > 15000) { prep.said = true; paint(); }
    if (st === 1) { if (!prep.playingSince) { prep.playingSince = Date.now(); prep.t1 = t; } }
    else prep.playingSince = 0;                                /* it stopped to buffer: the clock starts again */
    if (!prep.playingSince) return;
    const need = dur ? Math.min(2.5, Math.max(0, dur - t - 0.3)) : 0;
    const buffered = dur ? (fr * dur - t >= need || fr >= 0.999) : true;
    if (t - prep.t1 < 0.6 || !buffered) return;
    if (!isGM() && cur) {
      /* the note may have moved on while this was warming up */
      if (cur.ids[cur.idx] !== nowId) { prep = null; follow(cur); return; }
      if (cur.state === 'play' && Math.abs(target(cur) - t) > 1.2 && prep.fixes < 2) {
        prep.fixes++; prep.playingSince = 0;
        try { player.seekTo(target(cur) + 1.1, true); } catch (e) {}      /* ~1.1 s is what a seek and a steady second take */
        return;
      }
    }
    show();
  }
  function show() {
    const pr = prep, p = player; prep = null;
    if (!pr || !p) return;
    logp('show');
    lastLead = Math.max(0.8, Math.min(6, (Date.now() - pr.t0) / 1000));
    try { p.unMute(); p.setVolume(vol); } catch (e) {}
    if (isGM()) { publish(); return; }
    /* a player whose note says "paused" is stopped where the GM stopped (moved while paused, which does not re-buffer) */
    if (cur && cur.state !== 'play') { try { p.pauseVideo(); setTimeout(() => { try { p.seekTo(cur.pos, true); } catch (e) {} }, 250); } catch (e) {} }
    paint();
  }
  function stateChange(e) {
    const p = player; if (!p) return;
    pstate = e.data;
    if (e.data === 1) {                                        /* playing */
      everPlayed = true; failStreak = 0;
      clearTimeout(dog);                                       /* it has begun: nobody is waiting for it to (watch()), and a pause of ours is not "it did not start" */
      if (asking) asking = false;
      try { const d = p.getVideoData && p.getVideoData(); if (d && d.title && d.title !== title) title = d.title; } catch (x) {}
      /* the GM's note is written when their player has really begun, so everyone's clock starts from the same moment */
      if (publishOnStart && isGM()) { publishOnStart = false; publish(); }
    }
    /* a track ended: the GM's player chooses the next, and the table follows */
    if (e.data === 0 && isGM() && loaded.length && !prep) ended();
    /* THE GM'S OWN PLAYER MOVED WITHOUT BEING ASKED (a touch, a keyboard shortcut): play or pause that nobody here asked for
       (intent is what we asked) is told to the table. Our own stops — leaving for the hall — are ignored for a moment. */
    if (isGM() && holding && everPlayed && !prep && !loading && Date.now() >= quietUntil) {
      const want = e.data === 1 ? 'play' : e.data === 2 ? 'pause' : '';
      if (want && want !== intent) { intent = want; seekRef = null; setTimeout(() => publish(), 200); }
    }
    /* and a PLAYER who pauses it pauses it for themselves, until the GM next does something */
    if (!isGM() && !prep && cur && Date.now() >= quietUntil) {
      if (e.data === 2 && cur.state === 'play' && everPlayed) held = true;
      else if (e.data === 1) held = false;
    }
    paint();
  }
  /* a video that will not embed (101/150), is gone (100/2) or is refused (153): the GM's player skips it; everyone else just
     follows the GM. If every one of them fails, it stops. */
  function failed(e) {
    if (!isGM() || !player) return;
    const code = e && e.data;
    logp('error ' + code + (e && e.target === player ? ' (current player)' : ' (another player)'));
    note('That one would not play — ' + (WHY[code] || 'error ' + code) + '.' + (loaded.length > 1 ? ' Skipped.' : ''));
    clearTimeout(dog);
    prep = null;
    failStreak++;
    if (loaded.length > 1 && failStreak < loaded.length) playAt(idx + 1); else stopAll();
  }
  /* A START THAT NEVER HAPPENS. YouTube sometimes puts a question inside the picture (a sign-in, a consent, an age gate). If nothing
     has begun to play after a while, the GM is told and the status says so, with a Try again. */
  function watch() {
    clearTimeout(dog);
    asking = false;
    dog = setTimeout(() => {
      if (destroyed || !player || !ready || intent !== 'play' || !loaded.length || everPlayed) return;
      let s = -9; try { s = player.getPlayerState(); } catch (x) {}
      if (s === 1) return;
      try { player.playVideo(); } catch (x) {}                /* one more ask: autoplay may have been refused */
      dog = setTimeout(() => {
        if (destroyed) return;
        let s2 = -9; try { s2 = player.getPlayerState(); } catch (x) {}
        if (s2 === 1) return;
        asking = true; paint();
        if (isGM()) note('YouTube has not started it. Try again, or check this machine is online.');
      }, 6000);
    }, 8000);
  }

  /* ── time ── */
  const target = st => st.pos + (st.state === 'play' ? Math.max(0, N() && N().ageOf ? N().ageOf(st.at) / 1000 : 0) : 0);
  /* a different video arrives: load it into the player, warmed up if it is to be seen */
  function startFor(p, st) {
    const hide = isVideo || st.state !== 'play';
    begin(p, st.idx, target(st) + (hide && st.state === 'play' ? lastLead : 0), hide);
    watch();
  }
  /* A NOTE IS FOLLOWED. The queue is re-read every time (the GM added, took out or moved things), which is not a reason to load
     anything again: only a different video IN THE PLAYER is. */
  function follow(st) {
    const same = holding && nowId === st.ids[st.idx];
    loaded = st.ids.slice(); loop = !!st.loop;
    if (same) idx = st.idx;
    names();
    ensurePlayer().then(p => {
      if (destroyed || !p || cur !== st) return;
      if (!same || !holding) { startFor(p, st); return; }
      if (prep) return;                                       /* still warming up: settle() reads the latest note */
      try {
        const want = target(st), have = p.getCurrentTime();
        if (Math.abs(have - want) > (st.state === 'play' ? 2.5 : 1.5)) p.seekTo(want, true);
        if (st.state === 'play') p.playVideo(); else p.pauseVideo();
      } catch (x) {}
    });
  }

  /* ══ A NOTE ARRIVES (everyone) ════════════════════════════ */
  function apply(raw) {
    if (destroyed) return;
    const st = clean(raw);
    logp(st ? 'apply ' + st.ids.length + ' ' + st.ids[0] + ' ' + st.state : 'apply(null)');
    if (!st) { cur = null; stopLocal(); paint(); root.dispatchEvent(new CustomEvent('monarchy:music')); return; }
    /* THE GM'S OWN PLAYER IS THE SOURCE. What the database says back to the host is only its own words, and a late
       echo of an old one must not put the queue or the place back. */
    if (isGM() && holding && player) { paint(); return; }
    const was = cur && cur.ids[cur.idx];
    /* something new from the GM brings it back for a player who had stopped it */
    if (!cur || was !== st.ids[st.idx]) localOff = false;
    /* THE GM DID SOMETHING (a different video, play or pause, a drag of the bar) — or only their clock was re-sent, or the queue
       was edited. A player's own pause is undone by the first and not by the others. */
    const act = !cur || was !== st.ids[st.idx] || cur.state !== st.state || Math.abs(st.pos - target(cur)) > 2.5;
    if (act) held = false;
    cur = st;
    intent = st.state;
    loop = !!st.loop;
    if (!isGM()) loaded = st.ids.slice();
    names();
    paint();
    root.dispatchEvent(new CustomEvent('monarchy:music'));
    if (!supported() || !atTable() || localOff) { quiet(); if (player && ready) try { player.pauseVideo(); } catch (e) {} return; }
    if (held && !act) return;                                 /* only their clock: a player's own pause stands */
    follow(st);
  }
  function stopLocal() {
    quiet();
    if (player) { if (ready) try { player.pauseVideo(); } catch (e) {} fresh(); }
    loaded = []; nowId = ''; title = '';
  }
  function stopAll() {
    logp('stopAll');
    intent = 'pause'; cur = null; loading = false; asking = false; stopLocal();
    write(null);
    paint();
    root.dispatchEvent(new CustomEvent('monarchy:music'));
  }

  /* ══ THE GM'S HANDS ═══════════════════════════════════════ */
  function publish(extra) {
    const p = player; if (!p || !ready || !isGM() || !loaded.length) return;
    let pos = 0; try { pos = Math.round(p.getCurrentTime() * 10) / 10; } catch (e) {}
    const st = Object.assign({ ids: loaded.slice(0, 100), idx, state: intent, loop: loop ? 1 : 0, pos,
                               at: N() && N().now ? N().now() : Date.now(), n: Math.random().toString(36).slice(2, 7) }, extra || {});
    cur = clean(st); localOff = false; loading = false; seekRef = null;
    write(st);
    paint();
  }
  /* the GM's first video of a thing: warmed up if it is to be seen (and published when it is revealed), or at once if it is
     only to be heard (and published when it has begun) */
  function startGM(p, ids, at) {
    loaded = ids; intent = 'play';
    begin(p, at, 0, isVideo);
    publishOnStart = !isVideo;
    watch(); names();
  }
  /* the GM's player moves to another entry of the queue: a next, a previous, a click in the queue, or a track that ended */
  function playAt(i) {
    const p = player; if (!p || !ready || !loaded.length) return;
    const n = loaded.length;
    i = ((i % n) + n) % n;
    intent = 'play';
    if (n === 1) { try { p.seekTo(0, true); p.playVideo(); } catch (e) {} setTimeout(() => publish({ pos: 0 }), 0); return; }
    cur = cur ? Object.assign({}, cur, { idx: i }) : cur;      /* the queue shows it at once */
    begin(p, i, 0, isVideo);
    publishOnStart = !isVideo;
    watch();
  }
  /* the playing one ended: the next begins; after the last, it stops (or goes back to the first, if the GM asked for that) */
  function ended() {
    const n = loaded.length;
    if (n === 1 && loop) return playAt(0);
    if (idx >= n - 1 && !loop) { intent = 'pause'; publish({ state: 'pause' }); return; }
    playAt(idx + 1);
  }
  /* replaces the queue with this link */
  function load(text) {
    if (!isGM()) return;
    const link = parseLink(text);
    if (link.error) { note(link.error); return; }
    if (!supported()) { note('Update the Monarchy app (from the new installer) to play music.'); return; }
    lastLink = String(text || '');
    loading = true; asking = false; said = '';
    const tok = ++loadTok;                                    /* only the LAST thing asked for is loaded */
    fresh();
    paint();
    logp('load() ' + lastLink.slice(-14));
    ensurePlayer().then(p => {
      if (destroyed || tok !== loadTok) return;
      if (!p) { loading = false; paint(); note('YouTube did not answer. Check this machine is online, then try again.'); return; }
      if (!link.list) { startGM(p, [link.video], 0); return; }
      /* A PLAYLIST: its videos are read without playing anything (cued), then a new player is made for them one at a time */
      try { p.cuePlaylist({ listType: 'playlist', list: link.list, index: 0 }); } catch (e) {}
      const t0 = Date.now();
      const wait = setInterval(() => {
        if (destroyed || player !== p || tok !== loadTok) return clearInterval(wait);          /* another thing was loaded meanwhile */
        let ids = null; try { ids = p.getPlaylist(); } catch (e) {}
        if (ids && ids.length) {
          clearInterval(wait);
          const all = ids.filter(x => VID.test(x)).slice(0, 100);
          let at = link.video ? all.indexOf(link.video) : 0; if (at < 0) at = 0;
          fresh();
          ensurePlayer().then(p2 => {
            if (destroyed || tok !== loadTok) return;
            if (!p2) { loading = false; paint(); note('YouTube did not answer. Check this machine is online, then try again.'); return; }
            startGM(p2, all, at);
          });
        } else if (Date.now() - t0 > 10000) {
          clearInterval(wait); loading = false;
          note('That playlist would not load — it may be private, or a mix YouTube will not embed.');
        }
      }, 250);
    });
  }

  /* ══ THE QUEUE ════════════════════════════════════════════ */
  function queueChanged() { publish(); names(); paint(); }
  /* added to the end. With nothing playing, it is simply played. */
  function enqueue(text) {
    if (!isGM()) return;
    const link = parseLink(text);
    if (link.error) { note(link.error); return; }
    if (!supported()) { note('Update the Monarchy app (from the new installer) to play music.'); return; }
    if (!holding || !loaded.length) return load(text);
    const add = ids => {
      if (destroyed) return;
      if (!ids) { note('That playlist would not load — it may be private, or a mix YouTube will not embed.'); return; }
      ids = ids.slice(0, 100 - loaded.length);
      if (!ids.length) { note('The queue holds 100.'); return; }
      ids.forEach(x => loaded.push(x));
      queueChanged();
      note(ids.length === 1 ? 'Added to the queue' : 'Added ' + ids.length + ' to the queue');
    };
    if (link.list) { note('Reading the playlist…'); readPlaylist(link.list).then(add); } else add([link.video]);
  }
  /* taken out. The one playing is replaced by the one after it. */
  function removeAt(i) {
    if (!isGM() || i < 0 || i >= loaded.length) return;
    if (loaded.length === 1) return stopAll();
    loaded.splice(i, 1);
    if (i < idx) { idx--; queueChanged(); return; }
    if (i > idx) { queueChanged(); return; }
    /* the playing one: the one that takes its place begins */
    playAt(idx >= loaded.length ? 0 : idx);
    names(); paint();
  }
  /* one place up (d = -1) or down (d = 1) */
  function moveItem(i, d) {
    const j = i + d;
    if (!isGM() || i < 0 || j < 0 || i >= loaded.length || j >= loaded.length) return;
    [loaded[i], loaded[j]] = [loaded[j], loaded[i]];
    if (idx === i) idx = j; else if (idx === j) idx = i;
    queueChanged();
  }
  const names = () => fetchTitles(isGM() || !cur ? loaded : cur.ids, () => { if (!destroyed) paint(); });
  const titleOf = v => titles[v] || (v === nowId && title) || '';

  function control(what, arg) {
    if (what === 'vol') { setVol(arg); return; }                /* everybody's: their own volume */
    if (!isGM()) return;
    seekRef = null;                                           /* what the GM asks for is not a drag of the bar */
    if (what === 'retry') return load(lastLink);
    if (!player || !ready) return;
    if (what === 'pp') {
      if (prep) return;
      intent = intent === 'play' ? 'pause' : 'play';
      try { intent === 'play' ? player.playVideo() : player.pauseVideo(); } catch (e) {}
    }
    else if (what === 'next') return playAt(idx + 1);
    else if (what === 'prev') return playAt(idx - 1);
    else if (what === 'jump') return playAt(parseInt(arg, 10) || 0);
    else if (what === 'seek') { try { player.seekTo(Math.max(0, +arg || 0), true); } catch (e) {} }
    else if (what === 'loop') loop = !loop;
    else if (what === 'remove') return removeAt(parseInt(arg, 10));
    else if (what === 'up') return moveItem(parseInt(arg, 10), -1);
    else if (what === 'down') return moveItem(parseInt(arg, 10), 1);
    else if (what === 'stop') return stopAll();
    /* a moment for the player to move before its place is read */
    setTimeout(() => { publish(); }, 350);
  }
  /* what the controls ask, GM or not */
  function act(what, arg) {
    if (what === 'off') {                                     /* this machine only: stop it for me / start it again for me */
      if (localOff) { localOff = false; if (cur) apply(cur); }
      else { localOff = true; quiet(); if (player && ready) try { player.pauseVideo(); } catch (x) {} }
      paint(); root.dispatchEvent(new CustomEvent('monarchy:music'));
      return;
    }
    if (what === 'away') { if (isGM() && isVideo) takeScreenAway(id); return; }
    if (what === 'add') { return enqueue(arg && arg.text); }
    control(what, arg);
  }
  /* this channel's volume: its own, on this machine, and what a new one starts at */
  function setVol(v) {
    vol = Math.max(0, Math.min(100, +v || 0));
    vols[kind] = vol; saveVols();
    if (player && ready) try { player.setVolume(vol); } catch (x) {}
    paint();
  }

  /* ══ WHAT IT IS DOING, IN WORDS ═══════════════════════════ */
  function statusText() {
    if (prep || (cur && !localOff && (!holding || !everPlayed))) return prep && prep.said ? 'Still waiting for YouTube…' : 'Getting it ready…';
    if (loading) return 'Finding it…';
    if (!cur) return '';
    if (asking) return 'YouTube has not started it';
    if (localOff) return 'Stopped for you';
    if (pstate === 1) return 'Playing';
    if (pstate === 3) return 'Buffering…';
    if (pstate === 0) return 'Ended';
    if (cur.state === 'pause' || pstate === 2) return 'Paused';
    return 'Starting…';
  }
  const trackName = () => title || (cur ? (isVideo ? 'Video' : 'Playing') : '');

  /* ══ ITS PLACE ON THE PAGE ════════════════════════════════
     Music is a HUD at the top of the screen. A video is two things in two layers: its picture (laid over the frame on the
     table) and its deck (the controls, beside the frame). Neither is ever rebuilt after it is made — only moved, because a
     player that is rebuilt is a song that starts again. */
  function note(t) {
    said = t; paint();
    clearTimeout(note.t); note.t = setTimeout(() => { said = ''; paint(); }, 8000);
    paintPanel();
    if (root.Inspector && root.Inspector.said) root.Inspector.said(t);
  }
  function mount() {
    if (ui) return;
    if (isVideo) {
      const L = layers();
      box = doc.createElement('div'); box.className = 'mu-yt-v mu-vp gone'; box.dataset.id = id; box.innerHTML = '<div id="' + pid + '"></div>';
      L.wood.appendChild(box);
      ui = doc.createElement('div'); ui.className = 'mu-ui deck gone'; ui.dataset.id = id;
      L.decks.appendChild(ui);
      /* the GM presses the picture to play or pause it */
      box.addEventListener('click', () => { if (isGM()) control('pp'); });
    } else {
      hud = doc.createElement('aside'); hud.id = 'mu-yt'; hud.className = 'mu-yt gone music';
      hud.innerHTML = '<div class="mu-yt-v"><div id="' + pid + '"></div></div><div class="mu-ui"></div>';
      doc.body.appendChild(hud);
      box = hud.querySelector('.mu-yt-v'); ui = hud.querySelector('.mu-ui');
    }
    const keep = e => e.stopPropagation();
    ui.addEventListener('pointerdown', keep); ui.addEventListener('wheel', keep, { passive: true });
    ui.addEventListener('keydown', keep);                     /* arrow keys on a slider are not the table's */
    if (root.PlayerUI) uiCtl = root.PlayerUI.make(ui, api);
  }
  /* what it is, for its controls: everything they need, read from here and nowhere else */
  function view() {
    const gm = isGM();
    const mine = gm || !cur;
    const ids = (mine ? loaded : cur.ids).slice();
    let pos = 0, dur = 0;
    if (player && ready && holding && everPlayed) { try { pos = player.getCurrentTime() || 0; dur = player.getDuration() || 0; } catch (e) {} }
    const i = mine ? idx : cur.idx;
    return { kind, id, name: nameOf(), host: gm, ok: supported(), has: ids.length > 0 || loading, ids, idx: i, titles, title: titleOf(ids[i]) || trackName(),
             status: statusText(), prep: !!prep || !holding || !everPlayed, pstate, playing: pstate === 1 && !prep, intent, loop,
             pos, dur, vol, off: localOff, onwood: isVideo && !!ui && !ui.classList.contains('gone') && !!screenEl(), asking, said, loading,
             next: ids.length > 1 ? (i + 1 < ids.length ? i + 1 : loop ? 0 : -1) : -1 };
  }
  function paint() {
    if (destroyed) return;
    const gm = isGM();
    const frame = frameProp();
    if (!ui) {
      /* nothing to show yet: a note, or (for the GM) a screen of their own */
      if (!(cur || (isVideo && frame && gm))) return;
      mount();
    }
    const some = isVideo ? (!!frame && (!!cur || gm || loading)) : (!!cur || (asking && gm));
    const live = some && supported() && atTable();
    const state = (c, on) => { [isVideo ? box : hud, isVideo ? ui : null].forEach(e => e && e.classList.toggle(c, !!on)); };
    state('gone', !live);
    /* THE PICTURE IS SHOWN ONLY OF A VIDEO THAT HAS BEGUN. A new, empty player (a new thing was loaded while another was on the
       screen), or one whose video has not yet started, is a loading screen. */
    state('prep', !!prep || !holding || !everPlayed);
    state('off', localOff);
    state('ask', asking);
    /* the frame says what is in it until there is a picture */
    if (frame) {
      const scr = frame.querySelector('.vid-screen'), vt = frame.querySelector('.vid-title');
      const waiting = loading || prep || !holding || !everPlayed;
      const mineNow = !!cur || loading || !!prep || (holding && !everPlayed);
      if (vt) vt.textContent = localOff ? '' : mineNow ? (waiting ? statusText() : trackName()) : '';
      if (scr) scr.dataset.st = localOff ? 'Stopped for you' : mineNow ? (waiting ? statusText() : '')
        : (gm ? 'Empty. Paste a YouTube link in the Toolbox (Audio), or on its player.' : '');
    }
    if (uiCtl) uiCtl.paint();
    aimSoon();
  }
  /* THE PICTURE IS PINNED TO THE FRAME. The frame lies on the table, tilted and in perspective; the picture is laid over its
     screen by the four corners — where the table has put each of them on the page this frame — as one perspective transform (a
     homography, written as a CSS matrix3d). So it zooms, turns and is dragged with the table, and lies in the same plane as the
     wood. Its own size is the screen's size on the page. The DECK is laid in the page's own pixels, under the frame, else over it,
     else beside it — never over the picture. Called every animation frame while any is shown; answers whether this one is. */
  function aim(v, placed) {
    const scr = isVideo && ui && !ui.classList.contains('gone') ? screenEl() : null;
    if (!scr) {
      if (isVideo && ui && (box.style.transform || ui.style.left)) { box.style.cssText = ''; ui.style.cssText = ''; aimed = ''; }
      deckRect = null;
      return false;
    }
    const q = [0, 1, 2, 3].map(i => { const r = scr.querySelector('.vid-c' + i).getBoundingClientRect(); return [r.left - v.left, r.top - v.top]; });
    const edge = Math.max(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]));
    const W = Math.max(400, Math.round(edge / 80) * 80), H = Math.round(W * 9 / 16);
    const m = warp(q, W, H);
    const showPic = !box.classList.contains('prep') && !box.classList.contains('off');
    const folded = ui.classList.contains('folded');             /* hidden down to its pill */
    const dw = folded ? 270 : Math.max(340, Math.min(460, Math.round(Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1]))));
    const dh = ui.offsetHeight;
    const th = T() && T().get(id);
    const key = [v.left, v.top, v.width, v.height, W, m, showPic, dw, dh, th && th.z, placed.map(r => r.join(',')).join(';')].join('|');
    if (m && key !== aimed) {
      aimed = key;
      const z = String(th ? th.z | 0 : 0);
      if (showPic) { box.style.cssText = 'width:' + W + 'px;height:' + H + 'px;transform:' + m + ';z-index:' + z; } else box.style.cssText = '';
      ui.style.zIndex = z;
      /* the deck goes where it covers neither the picture nor another screen's deck: under the frame, else over it, else beside it,
         and slid along if another is in the way */
      const bz = scr.closest('.prop').querySelector('.vid-bezel').getBoundingClientRect();
      const fx0 = bz.left - v.left, fx1 = bz.right - v.left, fy0 = bz.top - v.top, fy1 = bz.bottom - v.top;
      const cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
      const cx = cl((fx0 + fx1) / 2 - dw / 2, 8, v.width - dw - 8);
      const gap = 12, step = dw + gap;
      const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
      const own = [fx0, fy0, fx1, fy1];
      const side = cl(fy0, 8, v.height - dh - 8);
      const cands = [[cx, fy1 + gap], [cx, fy0 - gap - dh], [fx1 + gap, side], [fx0 - gap - dw, side]];
      [1, -1, 2, -2].forEach(k => { cands.push([cx + k * step, fy1 + gap]); cands.push([cx + k * step, fy0 - gap - dh]); });
      const fits = c => c[0] >= 8 && c[1] >= 8 && c[0] + dw <= v.width - 8 && c[1] + dh <= v.height - 8;
      const rect = c => [c[0], c[1], c[0] + dw, c[1] + dh];
      const free = c => fits(c) && !placed.some(p => hit(rect(c), p));
      let pick = cands.find(free);
      if (!pick) {                                            /* none of those: the clear place nearest the frame, anywhere on the table */
        let bd = 1e9;
        for (let x = 8; x + dw <= v.width - 8; x += 20) for (let y = 8; y + dh <= v.height - 8; y += 20) {
          if (!free([x, y])) continue;
          const d = Math.hypot(x + dw / 2 - (fx0 + fx1) / 2, y + dh / 2 - (fy0 + fy1) / 2);
          if (d < bd) { bd = d; pick = [x, y]; }
        }
      }
      pick = pick || cands.find(c => fits(c) && !hit(rect(c), own)) || [cx, cl(fy1 + gap, 8, v.height - dh - 8)];
      const left = pick[0], top = pick[1];
      deckRect = rect([left, top]);
      ui.style.width = folded ? '' : dw + 'px'; ui.style.left = left.toFixed(1) + 'px'; ui.style.top = top.toFixed(1) + 'px';
    }
    if (deckRect) placed.push(deckRect);
    return true;
  }
  /* where this screen's frame lies on the page (the others' decks keep off it), or null if it is not shown */
  function frame(v) {
    const scr = isVideo && ui && !ui.classList.contains('gone') ? screenEl() : null;
    const bz = scr && scr.closest('.prop').querySelector('.vid-bezel');
    if (!bz) return null;
    const r = bz.getBoundingClientRect();
    return [r.left - v.left, r.top - v.top, r.right - v.left, r.bottom - v.top];
  }
  /* what the 500 ms poll does for this channel: read the player, notice a drag of the bar */
  function poll() {
    if (destroyed) return;
    if (player && ready) {
      try { pstate = player.getPlayerState(); } catch (x) {}
      try { const d = player.getVideoData && player.getVideoData();
            if (d && d.title && d.title !== title) { title = d.title; paint(); paintPanel(); } } catch (x) {}
      if (isGM() && holding && everPlayed && !prep && !loading && cur && atTable()) {
        let t = 0; try { t = player.getCurrentTime() || 0; } catch (x) {}
        const now = Date.now();
        /* only when it did the same thing (playing, or not) at both looks: a pause in between is not a jump */
        if (seekRef && pstate !== 3 && seekRef.playing === (pstate === 1)) {
          const was = seekRef.playing ? seekRef.t + (now - seekRef.at) / 1000 : seekRef.t;
          if (Math.abs(t - was) > 2.2) { seekRef = null; publish(); }
        }
        if (!seekRef || pstate !== 3) seekRef = { t, at: now, playing: pstate === 1 };
      }
    }
    if (uiCtl) uiCtl.tick();
  }
  /* the GM's clock is re-sent now and then, and a player re-checks theirs, so a stall (a buffering pause, an advert) does not leave
     anybody a song behind */
  function beat() {
    if (destroyed || !player || !ready || !cur || !atTable()) return;
    if (isGM()) { if (intent === 'play') publish(); }
    else if (!localOff && cur.state === 'play' && !held) follow(cur);
  }
  /* out to the hall, and back again */
  function where(at) {
    if (destroyed) return;
    if (at !== 'table') { quiet(); if (player && ready) try { player.pauseVideo(); } catch (x) {} paint(); return; }
    /* back at the table: the GM's own player was paused for them on the way out, and is started again — but only one that is really
       paused (asked to play a moment after being asked to load, YouTube answers "error 2") */
    if (isGM() && player && ready && holding) {
      if (intent === 'play' && pstate === 2 && !prep) { try { player.playVideo(); } catch (x) {} }
      paint(); return;
    }
    if (cur && !localOff) apply(cur); else paint();
  }
  /* gone: its player, its picture and its deck are taken away. With `stop`, the GM's note goes too. */
  function destroy(stop) {
    if (destroyed) return;
    clearTimeout(dog);
    if (stop && isGM()) write(null);
    destroyed = true;
    settleWaiters(null);
    if (player) { try { player.destroy(); } catch (e) {} }
    player = null; ready = false;
    if (isVideo) { box && box.remove(); ui && ui.remove(); } else { hud && hud.remove(); }
    box = ui = hud = null; uiCtl = null;
  }

  const api = { kind, id, view, act, apply, load, enqueue, paint, aim, frame, poll, beat, where, destroy, settle,
                reaim: () => { aimed = ''; aimSoon(); },
                get playing() { return !!(cur && cur.state === 'play' && !localOff); },
                get note() { return cur; },
                get dead() { return destroyed; },
                peek: () => ({ loading, asking, intent, loaded: loaded.length, idx, nowId, loop, prep: !!prep, player: !!player, ready, pstate, cur: !!cur, tok: loadTok, said, vol, log: peekLog.slice() }) };
  return api;
}

/* ══ THE CHANNELS, AND THE TABLE'S SCREENS ════════════════════ */
let music = null;                     /* the music channel */
const screens = {};                   /* a video thing's id -> its channel */
const pending = {};                   /* a video note that has come before its screen has: thing id -> note */
const allChannels = () => (music ? [music] : []).concat(Object.keys(screens).map(k => screens[k]));
const things = () => (T() && T().state ? T().state.things.filter(t => t.kind === 'video') : []);
const thingOf = id => things().find(t => t.id === id) || null;
const musicCh = () => music || (music = makeChannel('music', 'music'));
function screenCh(id) {
  if (screens[id]) return screens[id];
  if (!thingOf(id)) return null;
  return (screens[id] = makeChannel('video', id));
}
/* a new screen on the table: where the GM is looking, all of it on the wood, and clear of the others (the first free place, going out
   from the middle of their view) */
function putScreen() {
  if (!T() || !isGM()) return null;
  const have = things();
  const R = T().R, lim = R - 760;
  const m = root.Table3D && root.Table3D.middle ? root.Table3D.middle() : { x: R, y: R };
  const onWood = (x, y) => { const dx = x - R, dy = y - R, d = Math.hypot(dx, dy); return d > lim ? [R + dx * lim / d, R + dy * lim / d] : [x, y]; };
  const rects = have.map(t => { const k = t.scale || 1; return { x: t.x, y: t.y, w: (t.w || 1200) * k, h: (t.h || 760) * k }; });
  const free = (x, y) => !rects.some(r => x - 600 < r.x + r.w + 60 && x + 600 > r.x - 60 && y - 380 < r.y + r.h + 60 && y + 380 > r.y - 60);
  let spot = null;
  for (const [i, j] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const p = onWood(m.x + i * 1320, m.y + j * 860);
    if (free(p[0], p[1])) { spot = p; break; }
  }
  if (!spot) spot = onWood(m.x + have.length * 220, m.y + have.length * 160);
  const used = have.map(t => /^Screen (\d+)$/.exec(t.name || '')).filter(Boolean).map(x => +x[1]);
  const num = (used.length ? Math.max.apply(null, used) : have.length) + 1;
  return T().put({ kind: 'video', name: 'Screen ' + num, w: 1200, h: 760, x: Math.round(spot[0] - 600), y: Math.round(spot[1] - 380) });
}
/* a screen put away, by its own cross or like any piece: it stops, and nothing else does */
function takeScreenAway(id) { const t = thingOf(id); if (t && T()) T().bin(t.id, true); }
/* the table changed: screens may have come, gone, or been drawn again */
function tableChanged(state, why) {
  const have = {}; things().forEach(t => { have[t.id] = 1; });
  Object.keys(screens).forEach(k => { if (!have[k]) { screens[k].destroy(why === 'bin'); delete screens[k]; } });
  Object.keys(have).forEach(k => {
    /* the GM has a channel for every screen (an empty one has a deck to fill it from); a player, only for one that is playing */
    if (!screens[k] && (isGM() || pending[k])) screenCh(k);
    if (screens[k] && pending[k]) { const n = pending[k]; delete pending[k]; screens[k].apply(n); }
  });
  repaintAll();
}
/* the notes of the videos on the table arrive, all of them together */
function applyVideos(map) {
  map = map && typeof map === 'object' ? map : {};
  Object.keys(map).forEach(k => {
    /* all the screens' notes come together whenever any one of them changes: one that is the same as the last (its nonce) is not heard again */
    const was = screens[k] && screens[k].note;
    if (was && map[k] && was.n === String(map[k].n || '').slice(0, 12) && !isGM()) return;
    if (screens[k]) screens[k].apply(map[k]);
    else if (thingOf(k)) screenCh(k).apply(map[k]);
    else pending[k] = map[k];
  });
  /* a screen nobody is playing on is nothing to a player: its player and deck are freed (a note will make them again) */
  Object.keys(screens).forEach(k => { if (!(k in map) && !isGM()) { screens[k].apply(null); screens[k].destroy(false); delete screens[k]; } });
  Object.keys(pending).forEach(k => { if (!(k in map)) delete pending[k]; });
}
function repaintAll() {
  allChannels().forEach(c => c.paint());
  /* a screen nobody is playing on has nothing to say */
  things().forEach(t => {
    if (screens[t.id]) return;
    const f = doc.querySelector('#tbl .prop.t3-video[data-id="' + t.id + '"]'); if (!f) return;
    const sc = f.querySelector('.vid-screen'), vt = f.querySelector('.vid-title');
    if (vt) vt.textContent = ''; if (sc) sc.dataset.st = '';
  });
  aimSoon();
}
/* every animation frame while any screen is shown */
let raf = 0, lifted = false;
function aimAll() {
  raf = 0;
  if (!woodEl) return;
  const vp = doc.getElementById('vp');
  const v = vp ? vp.getBoundingClientRect() : { left: 0, top: 0, width: root.innerWidth, height: root.innerHeight };
  [woodEl, decksEl].forEach(e => { const s = e.style; s.left = v.left + 'px'; s.top = v.top + 'px'; s.width = v.width + 'px'; s.height = v.height + 'px'; });
  /* while a piece is being carried or the table turned, the pictures let the pointer through: a YouTube frame takes the pointer's
     moves for itself, and a drag that crosses it would stall in the middle of it */
  const busy = !!doc.querySelector('#tbl .prop.lift') || !!(vp && vp.classList.contains('grabbing'));
  if (busy !== lifted) { lifted = busy; woodEl.classList.toggle('lifting', busy); }
  let again = false;
  /* every shown frame is in the way of every deck but its own (its deck knows its own frame) */
  const placed = Object.keys(screens).map(k => screens[k].frame(v)).filter(Boolean);
  const hud = doc.getElementById('mu-yt');                    /* the music's plate at the top is in the way too */
  if (hud && !hud.classList.contains('gone')) { const r = hud.getBoundingClientRect(); if (r.width) placed.push([r.left - v.left, r.top - v.top, r.right - v.left, r.bottom - v.top]); }
  Object.keys(screens).forEach(k => { if (screens[k].aim(v, placed)) again = true; });
  if (again) raf = root.requestAnimationFrame(aimAll);
}
function aimSoon() { if (!raf && woodEl) raf = root.requestAnimationFrame(aimAll); }

/* ══ THE PANEL: THE TOOLBOX'S AUDIO TAB (GM) — IT ONLY MAKES THINGS ═══ */
let panelEl = null, bound = null, said = '';
let lastKind = 'video', lastScreen = 'new', lastText = '';
let padEdit = false, padAdd = false, padFile = null, padNote = '';
function panel(host) {
  panelEl = host || null;
  if (!panelEl) return;
  if (bound !== panelEl) bindPanel(panelEl);
  if (supported()) loadApi().catch(() => {});
  if (root.Pads) root.Pads.warm();
  paintPanel();
}
function padsHTML() {
  const P = root.Pads; if (!P) return '';
  const list = P.list(), u = P.usage();
  const grid = list.length
    ? (padEdit
        ? list.map(p => `<div class="au-prow" data-pid="${p.id}">
             <input class="au-pname" data-pname="${p.id}" value="${esc(p.n)}" maxlength="40" spellcheck="false">
             <input class="au-pvol" data-pvol="${p.id}" type="range" min="5" max="100" value="${p.vol}" title="Volume of this sound">
             <button data-pad-hear="${p.id}" title="Hear it (only here)">&#9654;</button>
             <button data-pad-del="${p.id}" title="Take it off the board">&#10005;</button></div>`).join('')
        : `<div class="au-pgrid">${list.map(p => `<button class="au-pad" data-pad-fire="${p.id}"
             title="your file, ${hms(p.dur)}">${esc(p.n)}</button>`).join('')}</div>`)
    : `<p class="au-hint">Nothing on the board yet. Add your own sounds from your computer — a creaking door, a roar, a tavern brawl — and press them to play them for everyone at the table.</p>`;
  const add = padAdd ? `<div class="au-add">
      <input id="au-padname" placeholder="Name it (optional)" maxlength="40" spellcheck="false">
      <div class="au-row"><button data-pad-choose class="au-ghost">Choose a sound file&hellip;</button><span class="au-picked">${padFile ? esc(padFile.name) : 'mp3, ogg, wav — under ' + Math.round(P.limits.file / 1024) + ' KB'}</span></div>
      <input id="au-padfile" type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.opus" hidden>
      <label class="au-vol"><span>Volume</span><input id="au-padvol" type="range" min="5" max="100" value="100"></label>
      <div class="au-row"><button data-pad-add class="au-go">Add to the board</button><button data-pad-cancel class="au-ghost">Cancel</button></div>
      ${padNote ? `<p class="au-note">${esc(padNote)}</p>` : ''}</div>` : '';
  return `<section class="au-sec au-pads"><h4>Sound board
      <span class="au-hbtns">${list.length ? `<button data-pad-edit class="${padEdit ? 'on' : ''}">${padEdit ? 'Done' : 'Edit'}</button>` : ''}<button data-pad-new>${padAdd ? 'Close' : '+ Add a sound'}</button></span></h4>
    ${grid}
    ${add}
    <p class="au-fine">${u.count} of ${P.limits.pads} sounds${u.bytes ? ' · your files ' + (u.bytes / 1048576).toFixed(1) + ' of ' + Math.round(P.limits.total / 1048576) + ' MB' : ''}. Pressing one plays it here and at every seat.</p>
  </section>`;
}
/* which screen a video goes to unless the GM says: the one they used last, else the one selected on the table, else a new one */
function panelScreen() {
  if (lastScreen !== 'new' && thingOf(lastScreen)) return lastScreen;
  const sel = T() && T().selected && T().selected();
  return sel && sel.kind === 'video' ? sel.id : 'new';
}
function paintPanel() {
  if (!panelEl || panelEl.hidden) return;
  const keep = {};
  ['mu-yt-in', 'au-padname', 'au-padvol'].forEach(i => { const e = doc.getElementById(i); if (e) keep[i] = e.value; });
  const focus = doc.activeElement && panelEl.contains(doc.activeElement) ? doc.activeElement.id : '';
  const top = panelEl.scrollTop;
  const sup = supported();
  const mode = k => `<button data-my="mode" data-v="${k}" class="${lastKind === k ? 'on' : ''}">${k === 'video' ? '&#9654; Video' : '&#9834; Music'}</button>`;
  const ts = things();
  const tgt = panelScreen();
  const where = lastKind === 'video' ? `<label class="au-where"><span>On</span><select id="mu-yt-on">
        <option value="new"${tgt === 'new' ? ' selected' : ''}>a new screen</option>
        ${ts.map(t => `<option value="${esc(t.id)}"${tgt === t.id ? ' selected' : ''}>${esc(t.name || 'Video')}</option>`).join('')}</select></label>` : '';
  /* what is on is told in words; its controls are not here, they are on the players */
  const lines = [];
  const mv = music && music.view();
  if (mv && mv.ids.length) lines.push(`<b>Music</b>: ${esc(mv.title)}${mv.ids.length > 1 ? ' · ' + mv.ids.length + ' in the queue' : ''}`);
  ts.forEach(t => { const c = screens[t.id]; const v = c && c.view(); if (v && v.ids.length) lines.push(`<b>${esc(t.name || 'Video')}</b>: ${esc(v.title)}${v.ids.length > 1 ? ' · ' + v.ids.length + ' in the queue' : ''}`); });
  const on = lines.length ? `<p class="au-fine">Now: ${lines.join(' &nbsp;·&nbsp; ')}. The controls are on each player: the music's at the top of the screen, each video's beside it on the table.</p>` : '';
  panelEl.innerHTML = `<div class="au">
    <section class="au-sec au-play"><h4>Make something play</h4>
      ${sup ? `<input id="mu-yt-in" placeholder="Paste a YouTube link or playlist" spellcheck="false">
        <div class="au-seg au-modes" title="Music has no picture, and there is one music player. A video is a screen on the table, and there can be as many as you like.">${mode('video')}${mode('music')}</div>
        ${where}
        <div class="au-row"><button data-my="load" class="au-go">Play now</button><button data-my="enqueue" class="au-go alt">Add to queue</button></div>
        <p class="au-fine">Music and videos are separate: each has its own queue and plays by itself. <b>Play now</b> starts it (replacing that queue); <b>Add to queue</b> puts it last. A playlist link is a run of entries.</p>`
        : `<p class="au-note">Playing music needs the new Monarchy installer. Update the app, then paste a link here.</p>`}
      ${said ? `<p class="au-note">${esc(said)}</p>` : ''}
      ${on}
    </section>
    ${padsHTML()}
  </div>`;
  Object.keys(keep).forEach(i => { const e = doc.getElementById(i); if (e && keep[i] !== undefined) e.value = keep[i]; });
  panelEl.scrollTop = top;
  if (focus) { const e = doc.getElementById(focus); if (e && e.focus) { try { e.focus(); } catch (x) {} } }
}
/* what the Toolbox's two buttons do (and Music.load / Music.enqueue): `how` is 'now' or 'queue' */
function make(text, kind, how, screenId) {
  if (!isGM()) return;
  const link = parseLink(text);
  if (link.error) { said = link.error; paintPanel(); return; }
  if (!supported()) { said = 'Update the Monarchy app (from the new installer) to play music.'; paintPanel(); return; }
  said = '';
  let ch = null;
  if (kind === 'music') ch = musicCh();
  else {
    let id = screenId && screenId !== 'new' && thingOf(screenId) ? screenId : null;
    if (!id) { const t = putScreen(); id = t && t.id; }
    if (id) { lastScreen = id; ch = screenCh(id); }
  }
  if (!ch) return;
  if (how === 'queue') ch.enqueue(text); else ch.load(text);
  paintPanel();
}
function bindPanel(el) {
  bound = el;
  el.addEventListener('click', e => {
    const t = e.target;
    const my = t.closest('[data-my]');
    if (my) {
      const w = my.dataset.my, inp = doc.getElementById('mu-yt-in'), sel = doc.getElementById('mu-yt-on');
      lastText = inp ? inp.value : lastText;
      if (w === 'mode') { lastKind = my.dataset.v === 'music' ? 'music' : 'video'; return paintPanel(); }
      if (w === 'load') return make(lastText, lastKind, 'now', sel ? sel.value : panelScreen());
      if (w === 'enqueue') return make(lastText, lastKind, 'queue', sel ? sel.value : panelScreen());
      return;
    }
    const P = root.Pads; if (!P) return;
    const f = t.closest('[data-pad-fire]'); if (f) return void P.fire(f.dataset.padFire);
    const h = t.closest('[data-pad-hear]'); if (h) return void P.audition(h.dataset.padHear);
    const d = t.closest('[data-pad-del]'); if (d) { P.remove(d.dataset.padDel); return paintPanel(); }
    if (t.closest('[data-pad-edit]')) { padEdit = !padEdit; return paintPanel(); }
    if (t.closest('[data-pad-new]')) { padAdd = !padAdd; padNote = ''; padFile = null; return paintPanel(); }
    if (t.closest('[data-pad-cancel]')) { padAdd = false; padNote = ''; padFile = null; return paintPanel(); }
    if (t.closest('[data-pad-choose]')) { const fi = doc.getElementById('au-padfile'); if (fi) fi.click(); return; }
    if (t.closest('[data-pad-add]')) {
      const nm = (doc.getElementById('au-padname') || {}).value || '';
      const vv = (doc.getElementById('au-padvol') || {}).value || 100;
      const spec = { n: nm, vol: vv, file: padFile };
      padNote = 'Adding…'; paintPanel();
      P.add(spec).then(r => {
        if (r.error) { padNote = r.error; return paintPanel(); }
        padAdd = false; padNote = ''; padFile = null; paintPanel();
      });
    }
  });
  el.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'au-padfile') { padFile = t.files && t.files[0] || null; padNote = ''; paintPanel(); return; }
    if (t.id === 'mu-yt-on') { lastScreen = t.value; return; }
    if (t.dataset && t.dataset.pname && root.Pads) root.Pads.rename(t.dataset.pname, t.value);
  });
  el.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.pvol && root.Pads) root.Pads.setVol(t.dataset.pvol, t.value);
  });
  el.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.id === 'mu-yt-in') { const sel = doc.getElementById('mu-yt-on'); make(e.target.value, lastKind, 'now', sel ? sel.value : panelScreen()); }
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pname) e.target.blur();
  });
}

/* ══ OPENING IT ═══════════════════════════════════════════════ */
const open = () => { if (root.Toolbox) root.Toolbox.open('audio'); };
const isOpen = () => !!(panelEl && !panelEl.hidden && root.Toolbox && root.Toolbox.isOpen());
function toggle() {
  if (!isGM()) return;
  if (isOpen()) root.Toolbox.shut(); else open();
}

/* ══ WIRING ═══════════════════════════════════════════════════ */
function wire() {
  root.addEventListener('monarchy:session', e => {
    const d = e.detail || {};
    if (d.what === 'music') return musicCh().apply(d.music);
    if (d.what === 'videos') return applyVideos(d.videos);
    /* the table went away from under us: no music, no video */
    if (d.what === 'left' || d.what === 'closed') {
      if (music) music.apply(null);
      Object.keys(screens).forEach(k => { screens[k].apply(null); screens[k].destroy(false); delete screens[k]; });
      Object.keys(pending).forEach(k => delete pending[k]);
      paintPanel(); return;
    }
    /* sitting down at a table whose music and videos are already playing */
    if (d.what === 'hosting' || d.what === 'joined') {
      if (S() && S().music) musicCh().apply(S().music);
      if (S() && S().videos) applyVideos(S().videos);
    }
  });
  root.addEventListener('monarchy:where', e => { const at = e.detail && e.detail.at; allChannels().forEach(c => c.where(at)); });
  /* a video warming up is looked at four times a second, so it is shown the moment it is ready */
  setInterval(() => allChannels().forEach(c => c.settle()), 250);
  /* what the players say, read twice a second: the status, the name, the place */
  setInterval(() => allChannels().forEach(c => c.poll()), 500);
  /* and the GM's clock is re-sent now and then, and a player re-checks theirs */
  setInterval(() => allChannels().forEach(c => c.beat()), 15000);
  if (root.Pads) root.Pads.onChange(() => paintPanel());
  /* screens are drawn again whenever the table is, and the pictures are laid over them again */
  if (T()) T().on(tableChanged);
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire);
else wire();

/* the channel a caller means: the music (nothing, or 'music') or a screen (its id) */
const chOf = which => !which || which === 'music' ? music : screens[which] || null;
const EMPTY = { kind: 'music', id: 'music', name: 'Music', host: false, ok: false, has: false, ids: [], idx: 0, titles, title: '', status: '', prep: true, pstate: -1, playing: false, intent: 'pause', loop: false, pos: 0, dur: 0, vol: vols.music, off: false, onwood: false, asking: false, said: '', loading: false, next: -1 };
root.Music = {
  open, toggle, isOpen, panel, parseLink, available: supported, clean,
  /* play something now, or add it to a queue: `kind` music, or video (on the screen `screenId`, else a new one) */
  load: (text, kind, screenId) => make(text, kind === 'music' ? 'music' : 'video', 'now', screenId),
  enqueue: (text, kind, screenId) => make(text, kind === 'music' ? 'music' : 'video', 'queue', screenId),
  putScreen, framed: repaintAll,
  get playing() { return allChannels().some(c => c.playing); },
  get opened() { return isOpen(); },
  get state() { return music ? music.note : null; },
  /* what a channel's controls show and ask: `which` is nothing (the music) or a screen's id */
  view: which => { const c = chOf(which); return c ? c.view() : EMPTY; },
  act: (what, arg, which) => { const c = chOf(which); if (c) c.act(what, arg); },
  channels: () => ({ music, screens: Object.assign({}, screens) }),
  reaim: () => { allChannels().forEach(c => c.reaim && c.reaim()); },
  /* read-only, for the tests and for finding out what happened */
  _peek: which => { const c = chOf(which); return c ? c.peek() : null; }
};

})(window, document);
