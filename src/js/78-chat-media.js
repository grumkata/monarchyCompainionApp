/* ══════════════════════════════════════════════════════════════
   78-chat-media.js — GIFS AND PICTURES IN THE CHAT.

   grumkata: "make it so chat works with tenor links and image uploads".

     TENOR      Paste a Tenor link and the GIF is shown under the line. Nothing
                about the line changes on the wire — it is still the words that
                were typed — so every app that has this draws the GIF from the
                link and one that does not simply shows the link. Only Tenor's own
                addresses are recognised; a link to anywhere else is a link, and
                is never loaded (that would hand your address to whoever wrote it).

                  media.tenor.com/…/x.gif   "Copy GIF address": drawn as a picture
                  tenor.com/xyz.gif         the short form: the same
                  tenor.com/view/…-1234…    the page you copy from the address
                                            bar: Tenor's own embed of that GIF
                                            (the page cannot be read from here —
                                            Tenor sends no CORS headers — but the
                                            embed is what its own oEmbed hands out)

     PICTURES   The paperclip, Ctrl+V with a picture on the clipboard, or a picture
                dropped on the chat. It is shrunk HERE, before it is sent, until it
                fits in the chat line it travels in (Session.IMG_MAX), and sent as
                part of that line. A GIF small enough goes as it is, still moving;
                anything bigger goes as a still, and you are told. Click one in the
                dock to see it large.

   Everything that comes from another machine reaches the page through the DOM,
   never as markup: the address is checked against Tenor's, the picture against
   Session.imgOf, and the embed's address is built from the digits alone.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const S = () => root.Session;
const $ = id => doc.getElementById(id);
const DEFAULT = '📷';          /* what a picture with no words of its own says to an app that cannot draw it */

/* ══ TENOR ═════════════════════════════════════════════════════ */
const RX = {
  img:   /^https:\/\/(?:media|media1|c)\.tenor\.com\/[\w\-./]+\.(?:gif|webp|png|jpe?g)$/i,
  video: /^https:\/\/(?:media|media1|c)\.tenor\.com\/[\w\-./]+\.(?:mp4|webm)$/i,
  short: /^https:\/\/tenor\.com\/[A-Za-z0-9]{3,}\.gif$/i,
  view:  /^https:\/\/tenor\.com\/(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?view\/(?:[\w%.~\-]+-)?(\d{6,})$/
};
/* the first Tenor link in a line of words, or null */
function tenorOf(text) {
  const m = /https:\/\/[^\s<>"'`]+/.exec(String(text || ''));
  if (!m) return null;
  /* what a sentence puts after a link is not part of it, and neither is a query */
  const url = m[0].replace(/[.,;:!?)\]]+$/, '').split(/[?#]/)[0];
  if (RX.img.test(url) || RX.short.test(url)) return { kind: 'img', url, raw: m[0] };
  if (RX.video.test(url)) return { kind: 'video', url, raw: m[0] };
  const v = RX.view.exec(url);
  if (v) return { kind: 'embed', id: v[1], raw: m[0] };
  return null;
}
function tenorNode(t) {
  if (t.kind === 'img') {
    const i = doc.createElement('img');
    i.className = 'cm'; i.alt = 'GIF'; i.loading = 'lazy'; i.referrerPolicy = 'no-referrer';
    i.src = t.url;
    i.addEventListener('click', () => enlarge(t.url));
    return i;
  }
  if (t.kind === 'video') {
    const v = doc.createElement('video');
    v.className = 'cm'; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.src = t.url;
    return v;
  }
  /* a sandbox that lets its own page run and nothing else: no popups, no top navigation, no forms */
  const f = doc.createElement('iframe');
  f.className = 'cm cm-embed'; f.title = 'GIF'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  f.src = 'https://tenor.com/embed/' + t.id;
  return f;
}

/* ══ WHAT A LINE GETS ══════════════════════════════════════════
   `line` is the `.cl.said` the caller has already built (the name, and the words in
   `.stxt`); this adds the GIF or the picture under it. A line that is only the link,
   or only a picture, loses its words — they would just be the address. */
function decorate(line, text, img) {
  if (!line) return;
  const pic = img && S() && S().imgOf(img);
  let el = null, bare = false;
  if (pic) {
    el = doc.createElement('img');
    el.className = 'cm cm-pic'; el.alt = 'picture'; el.src = pic;
    el.addEventListener('click', () => enlarge(pic));
    bare = String(text || '').trim() === DEFAULT;
  } else {
    const t = tenorOf(text);
    if (t) { el = tenorNode(t); bare = String(text || '').trim() === t.raw; }
  }
  if (!el) return;
  line.classList.add('media');
  if (bare) { const w = line.querySelector('.stxt'); if (w) w.remove(); }
  line.appendChild(el);
  /* the dock sits at the newest line; a picture that arrives a moment late makes the line taller */
  const keep = () => { const cb = $('chat-body'); if (cb && cb.lastElementChild === line) cb.scrollTop = cb.scrollHeight; };
  el.addEventListener('load', keep);
  el.addEventListener('loadeddata', keep);
}

/* ── SEEING ONE LARGE ─────────────────────────────────────────── */
let light = null;
function enlarge(src) {
  shut();
  light = doc.createElement('div');
  light.id = 'cm-light';
  const i = doc.createElement('img');
  i.alt = ''; i.src = src;
  light.appendChild(i);
  light.addEventListener('click', shut);
  doc.body.appendChild(light);
}
function shut() { if (light) { light.remove(); light = null; } }
/* Escape closes it, and only it: the table's own Escape is not also pressed */
doc.addEventListener('keydown', e => {
  if (!light || e.key !== 'Escape') return;
  e.preventDefault(); e.stopPropagation(); shut();
}, true);

/* ══ SENDING A PICTURE ═════════════════════════════════════════ */
const tell = t => { if (root.Dice && root.Dice.notice) root.Dice.notice(t); };
const GIF_MAX = 140000;                  /* bytes: base64 makes it a third more, and the line holds IMG_MAX characters */

function dataURL(file) {
  return new Promise((ok, no) => {
    const r = new root.FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => no(new Error('That file could not be read.'));
    r.readAsDataURL(file);
  });
}
function loadImage(file) {
  return new Promise((ok, no) => {
    const u = root.URL.createObjectURL(file), im = new root.Image();
    im.onload = () => { root.URL.revokeObjectURL(u); ok(im); };
    im.onerror = () => { root.URL.revokeObjectURL(u); no(new Error('That is not a picture I can read.')); };
    im.src = u;
  });
}
/* Smaller and smaller until it fits: first the quality, then the size. WebP,
   because it is the smallest and it keeps a transparent background. */
function shrink(im) {
  const max = (S() && S().IMG_MAX) || 190000;
  const big = Math.max(im.naturalWidth, im.naturalHeight) || 1;
  for (const side of [800, 640, 480, 360, 240, 160]) {
    const k = Math.min(1, side / big);
    const c = doc.createElement('canvas');
    c.width = Math.max(1, Math.round(im.naturalWidth * k));
    c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.66, 0.5]) {
      const d = c.toDataURL('image/webp', q);
      if (d.length <= max && S().imgOf(d)) return d;
    }
  }
  return null;
}

let lastSent = 0;
async function sendFile(file) {
  if (!file || !/^image\//.test(file.type || '')) { tell('That is not a picture.'); return false; }
  if (Date.now() - lastSent < 2500) { tell('One picture at a time — give it a moment.'); return false; }
  let url = null, still = false;
  try {
    if (file.type === 'image/gif' && file.size <= GIF_MAX) {
      const d = await dataURL(file);
      if (S().imgOf(d)) url = d;
    }
    if (!url) {
      still = file.type === 'image/gif';
      url = shrink(await loadImage(file));
    }
  } catch (e) { tell(e.message || 'That picture could not be sent.'); return false; }
  if (!url) { tell('That picture is too big to send, even shrunk. Try a smaller one.'); return false; }
  if (still) tell('That GIF is too big to send moving, so it went as a still. Paste a Tenor link for a moving one.');
  lastSent = Date.now();

  /* any words already typed go with it */
  const inp = $('chat-in');
  const cap = inp && !/^\//.test(inp.value.trim()) ? inp.value.trim().slice(0, 300) : '';
  const text = cap || DEFAULT;
  if (S() && S().live) {
    /* the database refuses a line it has no rule for: until the rules in firebase.rules.json
       have been published, this is what a picture meets, and it must not just vanish */
    const sent = S().talk(text, 'say', { img: url });
    if (sent && sent.catch) sent.catch(() => tell('The table would not take that picture. If the database rules have not been published since this update, it refuses pictures.'));
  } else {
    /* alone at the table: onto your own screen only, the way every other line is */
    const cb = $('chat-body');
    if (cb) {
      const d = doc.createElement('div'), who = doc.createElement('b'), w = doc.createElement('span');
      d.className = 'cl said';
      who.textContent = root.Dice && root.Dice.speaker ? root.Dice.speaker() : 'You';
      w.className = 'stxt'; w.textContent = text;
      d.append(who, w);
      decorate(d, text, url);
      cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
    }
  }
  if (cap && inp) inp.value = '';
  return true;
}

/* ══ THE WAYS IN: THE PAPERCLIP, PASTE, AND A DROP ═════════════ */
const imageOf = list => [...(list || [])].find(f => /^image\//.test(f.type || ''));
function wire() {
  const btn = $('chat-img'), file = $('chat-file'), inp = $('chat-in'), dock = doc.querySelector('.chatdock');
  if (!btn || !file || !inp || !dock) return;
  btn.addEventListener('click', () => file.click());
  file.addEventListener('change', () => { const f = imageOf(file.files); file.value = ''; if (f) sendFile(f); });
  inp.addEventListener('paste', e => {
    const f = imageOf(e.clipboardData && e.clipboardData.files);
    if (f) { e.preventDefault(); sendFile(f); }
  });
  const carrying = e => !!(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'));
  dock.addEventListener('dragover', e => { if (carrying(e)) { e.preventDefault(); dock.classList.add('dropping'); } });
  dock.addEventListener('dragleave', e => { if (!dock.contains(e.relatedTarget)) dock.classList.remove('dropping'); });
  dock.addEventListener('drop', e => {
    dock.classList.remove('dropping');
    if (!carrying(e)) return;
    e.preventDefault();
    const f = imageOf(e.dataTransfer.files);
    if (f) sendFile(f); else tell('That is not a picture.');
  });
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire); else wire();

root.ChatMedia = { decorate, tenorOf, sendFile, shrink, DEFAULT };

})(window, document);
