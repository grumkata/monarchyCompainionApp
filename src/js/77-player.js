/* ══════════════════════════════════════════════════════════════
   77-player.js — MONARCHY'S OWN CONTROLS FOR WHAT THE GM PLAYS.

   grumkata: "the youtube ui is ass, lets use the monarchy ui ... we need a better more dynamic
   and interesting ui, a ui fit for a videogame/vtt ... you should be able to know what videos
   or music is next as well as add or remove from the queue ... video on the table, music on the
   screen, reason being all players need to see the video, not all players need to see music
   24/7. Only the GM should control the video and music, but the player should be able to control
   the volume ... music and video are 2 separate things ... multiple videos on the table at once."

   One plate, drawn by this code for EACH channel that 74-music.js runs (that file owns the YouTube
   players and the queues; this only shows them and asks for things):

     · the HUD, at the top of the screen, for the one music player — a player can fold it to a small
       pill, and a player's starts folded;
     · a DECK beside each video screen on the table — a video is for everyone, so its deck is open.

   It shows what is playing (its picture, name, how far in), what is NEXT, and the whole QUEUE with a
   way to add to it, take from it, move things in it and play one now. The GM has the buttons; a
   player sees the same and has only their volume (and a button to stop it for themselves). Nothing
   here holds state of its own about what is playing: it asks the channel for its view and tells it
   what is asked.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hms = s => { s = Math.max(0, Math.floor(+s || 0)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

const KEY = 'monarchy.musicui.v1';
/* the HUD is folded or not, and so is each screen's deck: each person's choice, kept on this machine */
let folded = null, decks = {};
try { const j = JSON.parse(root.localStorage.getItem(KEY)); if (j && typeof j.folded === 'boolean') folded = j.folded; if (j && j.decks && typeof j.decks === 'object') decks = j.decks; } catch (e) {}
const saveFold = () => { try { root.localStorage.setItem(KEY, JSON.stringify({ folded, decks })); } catch (e) {} };

/* small solid icons, one drawing each */
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const I = {
  play:  svg('M8 5v14l11-7z'),
  pause: svg('M7 5h4v14H7zM13 5h4v14h-4z'),
  prev:  svg('M6 5h2v14H6zM20 5v14L9 12z'),
  next:  svg('M16 5h2v14h-2zM4 5l11 7L4 19z'),
  stop:  svg('M6 6h12v12H6z'),
  loop:  svg('M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z'),
  vol:   svg('M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z'),
  mute:  svg('M3 9v6h4l5 5V4L7 9zM14 9.4 15.4 8 18 10.6 20.6 8 22 9.4 19.4 12 22 14.6 20.6 16 18 13.4 15.4 16 14 14.6 16.6 12z'),
  x:     svg('M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z'),
  up:    svg('M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z'),
  down:  svg('M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z'),
  list:  svg('M3 6h13v2H3zm0 5h13v2H3zm0 5h8v2H3zM18 6v8.2a3 3 0 1 0 2 2.8V8h3V6z'),
  plus:  svg('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z')
};
const eq = '<span class="pu-eq"><i></i><i></i><i></i><i></i></span>';
function thumb(id) { return id ? 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg' : ''; }

/* THE PLATE FOR ONE CHANNEL: `ch` is what 74-music.js gives (view(), act(), reaim()) */
function make(el, ch) {
  let sig = '', seeking = false, queueOpen = false;
  const q = s => el.querySelector(s);
  /* a text node is only written when it changes: this runs a few times a second */
  const put = (sel, txt) => { const e = q(sel); if (e && e.textContent !== txt) e.textContent = txt; return e; };
  const nameOf = (v, i) => v.titles[v.ids[i]] || (i === v.idx && v.title) || ('Track ' + (i + 1));
  const isMusic = ch.kind === 'music';

  el.innerHTML = `
    <div class="pu-pill" data-mu="unfold" title="Open the player">${eq}<b class="pu-pt"></b><span class="pu-chev">${I.down}</span></div>
    <div class="pu-main">
      <header class="pu-head">
        <span class="pu-label">Now playing</span>
        <span class="pu-badge"></span>
        <span class="pu-tools">
          <button data-mu="off" class="pu-off" title="">${I.vol}</button>
          <button data-mu="fold" class="pu-fold" title="Fold it away">${I.up}</button>
          <button data-mu="away" class="pu-away" title="Take this screen off the table (what is on it stops)">${I.x}</button>
        </span>
      </header>
      <div class="pu-body">
        <div class="pu-art">${eq}</div>
        <div class="pu-meta">
          <b class="pu-title"></b>
          <span class="pu-status"></span>
          <span class="pu-next"><em>Next</em><span class="pu-nt"></span></span>
        </div>
      </div>
      <p class="pu-said" hidden></p>
      <div class="pu-rail"><span class="pu-t0">0:00</span><input class="pu-seek" type="range" min="0" max="1000" value="0" disabled title="Where it is"><span class="pu-t1">0:00</span></div>
      <div class="pu-ctl">
        <span class="pu-gm">
          <button data-mu="prev" title="Previous">${I.prev}</button>
          <span class="pu-sealw"><button data-mu="pp" class="pu-seal" title="Play / pause">${I.play}</button></span>
          <button data-mu="next" title="Next">${I.next}</button>
          <button data-mu="loop" class="pu-loop" title="Go back to the first when the last ends">${I.loop}</button>
          <button data-mu="stop" title="Stop it for everyone">${I.stop}</button>
        </span>
        <label class="pu-vol" title="Your volume, on this machine only"><span class="pu-vi">${I.vol}</span><input class="pu-vr" type="range" data-mvol min="0" max="100" value="60"></label>
        <button data-mu="queue" class="pu-qbtn" title="What is coming up">${I.list}<b class="pu-qn">1</b></button>
      </div>
      <div class="pu-queue">
        <ol class="pu-list"></ol>
        <div class="pu-add">
          <input class="pu-addin" placeholder="${isMusic ? 'Paste a YouTube link to add a song' : 'Paste a YouTube link to add a video'}" spellcheck="false">
          <button data-mu="addgo" class="pu-addgo" title="Put it last in the queue">${I.plus}</button>
        </div>
      </div>
    </div>`;

  /* EVERYTHING THAT CHANGES WHEN SOMETHING HAPPENS */
  function paint() {
    const v = ch.view();
    const empty = !v.ids.length && !v.loading;
    el.classList.toggle('host', v.host);
    el.classList.toggle('empty', empty);
    /* the music HUD is folded for a player until they open it; a screen's deck is open until someone hides it */
    const fold = isMusic ? (folded === null ? !v.host : folded) : !!decks[v.id];
    el.classList.toggle('folded', fold);
    el.classList.toggle('playing', v.playing);
    el.classList.toggle('off', v.off);
    el.classList.toggle('qopen', queueOpen || empty);
    el.classList.toggle('looping', v.loop);
    el.classList.toggle('busy', v.prep && v.has);
    el.dataset.kind = v.kind;

    const title = v.title || (v.loading ? 'Finding it…' : empty ? 'Nothing on this screen' : '');
    put('.pu-title', title); put('.pu-pt', (isMusic ? '' : v.name + ' · ') + (title || '…'));
    const badge = put('.pu-badge', v.kind === 'video' ? '▶ ' + v.name : '♪ Music'); if (badge) badge.dataset.k = v.kind;
    put('.pu-status', empty ? (v.host ? 'Paste a link below to play something on it' : '') : v.status);
    /* what is next */
    const nx = v.next;
    el.classList.toggle('hasnext', nx >= 0);
    el.classList.toggle('lastone', v.ids.length > 1 && nx < 0);
    put('.pu-nt', nx >= 0 ? nameOf(v, nx) : '');
    /* the picture of what is playing */
    const art = q('.pu-art'), id = v.ids[v.idx] || '';
    if (art && art.dataset.id !== id) {
      art.dataset.id = id;
      const old = art.querySelector('img'); if (old) old.remove();
      if (id) { const im = doc.createElement('img'); im.alt = ''; im.src = thumb(id); im.onerror = () => { im.style.visibility = 'hidden'; }; art.insertBefore(im, art.firstChild); }
    }
    /* the controls */
    const pp = q('.pu-seal'); const want = v.intent === 'play' ? 'pause' : 'play';
    if (pp && pp.dataset.i !== want) { pp.dataset.i = want; pp.innerHTML = I[want]; }
    const off = q('.pu-off');
    if (off) { const k = v.off ? 'mute' : 'vol'; if (off.dataset.i !== k) { off.dataset.i = k; off.innerHTML = I[k]; off.title = v.off ? 'Hear it again' : 'Stop it for me'; } }
    const vr = q('.pu-vr'); if (vr) { if (doc.activeElement !== vr && +vr.value !== v.vol) vr.value = String(v.vol); vr.style.setProperty('--p', vr.value + '%'); }
    const vi = q('.pu-vi'); if (vi) { const k = v.vol === 0 ? 'mute' : 'vol'; if (vi.dataset.i !== k) { vi.dataset.i = k; vi.innerHTML = I[k]; } }
    put('.pu-qn', String(v.ids.length));
    /* a word from the player (a link that would not load, a track skipped) */
    const sd = q('.pu-said'); if (sd) { sd.hidden = !v.said; if (sd.textContent !== v.said) sd.textContent = v.said; }
    /* the queue is only drawn again when it is different */
    const s = [v.host, v.idx, v.ids.join(), v.ids.map(x => v.titles[x] || '').join('|'), queueOpen, empty].join('/');
    if (s !== sig) { sig = s; list(v); ch.reaim(); }
    tick();
  }
  function list(v) {
    const ol = q('.pu-list'); if (!ol) return;
    const top = ol.scrollTop;
    ol.innerHTML = v.ids.map((id, i) => {
      const tag = i === v.idx ? 'Playing' : i === v.next ? 'Up next' : '';
      return `<li class="pu-row${i === v.idx ? ' now' : ''}${i === v.next ? ' up' : ''}">
        <span class="pu-rmain" data-mu="jump" data-i="${i}" title="${v.host ? 'Play this one now' : ''}">
          <span class="pu-th"><img alt="" src="${thumb(id)}" onerror="this.style.visibility='hidden'"></span>
          <span class="pu-rt"><b>${esc(nameOf(v, i))}</b><em>${tag ? esc(tag) : (i + 1) + ' of ' + v.ids.length}</em></span>
        </span>
        <span class="pu-rtools">
          <button data-mu="up" data-i="${i}" title="Earlier"${i === 0 ? ' disabled' : ''}>${I.up}</button>
          <button data-mu="down" data-i="${i}" title="Later"${i === v.ids.length - 1 ? ' disabled' : ''}>${I.down}</button>
          <button data-mu="remove" data-i="${i}" title="Take it out of the queue">${I.x}</button>
        </span></li>`;
    }).join('');
    ol.scrollTop = top;
  }
  /* WHAT MOVES: the place in the song, and the words about it. Twice a second, and never rebuilding anything under a hand. */
  function tick() {
    const v = ch.view();
    put('.pu-status', v.ids.length || v.loading ? v.status : (v.host ? 'Paste a link below to play something on it' : ''));
    el.classList.toggle('playing', v.playing);
    const sk = q('.pu-seek'); if (!sk) return;
    /* only the GM chooses the place; for everyone else it is a bar that shows where it is */
    sk.disabled = !v.dur || !v.host;
    const pct = v.dur ? Math.max(0, Math.min(100, v.pos / v.dur * 100)) : 0;
    if (!seeking) { sk.value = v.dur ? String(Math.round(v.pos / v.dur * 1000)) : '0'; sk.style.setProperty('--p', pct.toFixed(1) + '%'); put('.pu-t0', hms(v.pos)); }
    put('.pu-t1', v.dur ? hms(v.dur) : (v.pstate === 1 ? 'live' : ''));
  }
  function addNow() {
    const inp = q('.pu-addin'); if (!inp || !inp.value.trim()) return;
    ch.act('add', { text: inp.value });
    inp.value = '';
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-mu]'); if (!b || b.disabled) return;
    const w = b.dataset.mu;
    if (w === 'queue') { queueOpen = !queueOpen; paint(); return; }
    if (w === 'fold' || w === 'unfold') {
      if (isMusic) folded = w === 'fold'; else if (w === 'fold') decks[ch.view().id] = true; else delete decks[ch.view().id];
      saveFold(); ch.reaim(); root.PlayerUI.repaintHud(); return;
    }
    if (w === 'addgo') { addNow(); return; }
    ch.act(w, b.dataset.i);
  });
  /* the place in the song: the label follows the hand while it is held, and the table is told when it is let go. The volume is
     this channel's own, on this machine. */
  el.addEventListener('input', e => {
    if (e.target.classList.contains('pu-vr')) { e.target.style.setProperty('--p', e.target.value + '%'); ch.act('vol', e.target.value); return; }
    if (!e.target.classList.contains('pu-seek')) return;
    seeking = true;
    const v = ch.view(); const a = q('.pu-t0'); if (a) a.textContent = hms((+e.target.value / 1000) * v.dur);
    e.target.style.setProperty('--p', (+e.target.value / 10) + '%');
  });
  el.addEventListener('change', e => {
    if (!e.target.classList.contains('pu-seek')) return;
    const v = ch.view(); seeking = false;
    if (v.dur) ch.act('seek', (+e.target.value / 1000) * v.dur);
  });
  el.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.classList.contains('pu-addin')) addNow();
  });

  const me = { paint, tick, el };
  instances.push(me);
  paint();
  return me;
}
const instances = [];

/* folding the HUD repaints them all; one that has gone from the page is forgotten */
root.PlayerUI = { make, repaintHud: () => { for (let k = instances.length - 1; k >= 0; k--) { if (!instances[k].el.isConnected) instances.splice(k, 1); } instances.forEach(i => i.paint()); } };

})(window, document);
