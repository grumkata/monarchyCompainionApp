/* ══════════════════════════════════════════════════════════════
   49-pictures.js — GETTING A PICTURE IN, AND KNOWING HOW BIG IT IS.

   Small on purpose, and shared, because three places need exactly
   this: taking Art out of the box, giving a token its face, and
   setting a scene's map or backdrop.

   Two things it does that reading the file straight would not:

   · IT MEASURES. grumkata: "artwork not autofitting to the image".
     A picture put on the table has to arrive at its own proportions,
     which means knowing them before it lands, which means decoding
     it rather than trusting the file.

   · IT COMES DOWN IN SIZE. A phone photograph is four thousand
     pixels across and eight megabytes of base64, and every table it
     is on keeps a copy in localStorage — which is five megabytes
     TOTAL. Capped at 1600 on the long edge, which is more than a
     table ever shows, and encoded as JPEG unless the picture has
     transparency to keep.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const CAP = 1600;
/* AND A CAP IN BYTES. The pixel cap alone let anything already under
   1600 on its long edge through completely untouched — a 1500x1500 PNG
   screenshot went in at twelve megabytes and localStorage is five for
   the whole origin, so one picture could stop a table saving for ever.
   Re-encode anything over this, and keep stepping down until it fits. */
const BYTE_CAP = 900 * 1024;

/* does this file need its transparency kept? */
const keepsAlpha = f => /png|gif|webp|svg/i.test(f.type || f.name || '');

function load(file, done) {
  if (!file) { done(null); return; }
  const fr = new FileReader();
  fr.onerror = () => done(null);
  fr.onload = () => shrink(fr.result, keepsAlpha(file), file.name, done);
  fr.readAsDataURL(file);
}

/* decode, cap the long edge, hand back the picture AND its shape */
function shrink(src, alpha, name, done) {
  const im = new Image();
  im.onerror = () => done(null);
  im.onload = () => {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (!w || !h) { done(null); return; }
    const k = Math.min(1, CAP / Math.max(w, h));
    if (k >= 1 && src.length <= BYTE_CAP) {
      done({ src: src, w: w, h: h, name: name || 'Picture' }); return;
    }
    /* shrink by pixels first, then by quality, then by pixels again until
       it is small enough to live in a five-megabyte store beside others */
    let cw = Math.round(w * Math.min(1, k)), ch = Math.round(h * Math.min(1, k));
    let out = src, q = 0.88;
    for (let pass = 0; pass < 6; pass++) {
      const cv = doc.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const g = cv.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(im, 0, 0, cw, ch);
      try { out = cv.toDataURL(alpha && pass === 0 ? 'image/png' : 'image/jpeg', q); }
      catch (e) { out = src; break; }
      if (out.length <= BYTE_CAP) break;
      if (q > 0.6) q -= 0.14;
      else { cw = Math.round(cw * 0.75); ch = Math.round(ch * 0.75); }
    }
    done({ src: out, w: cw, h: ch, name: name || 'Picture' });
  };
  im.src = src;
}

/* how big a picture already in hand really is */
function measure(src, done) {
  if (!src) { done(null); return; }
  const im = new Image();
  im.onerror = () => done(null);
  im.onload = () => done({ w: im.naturalWidth || im.width, h: im.naturalHeight || im.height });
  im.src = src;
}

/* ── the file dialog, one input for the whole app ──
   `cancel` is fired by browsers that have it; the ones that do not simply
   never resolve, which is why nothing is ever left half-held on this path. */
let input = null;
function ask(done) {
  if (!input) {
    input = doc.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.style.display = 'none';
    doc.body.appendChild(input);
  }
  input.oncancel = () => done(null);
  input.onchange = () => {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) { done(null); return; }
    load(f, done);
  };
  input.click();
}

/* ── FIT A PICTURE INTO A BOX, KEEPING ITS SHAPE ──
   The one line that answers "artwork not autofitting to the image". `box` is
   the largest either side may be; a wide picture comes back wide. */
function fit(w, h, box) {
  if (!w || !h) return { w: box, h: Math.round(box * 0.72) };
  const k = box / Math.max(w, h);
  return { w: Math.max(60, Math.round(w * k)), h: Math.max(60, Math.round(h * k)) };
}

root.Pictures = { load, shrink, measure, ask, fit, CAP };

})(window, document);
