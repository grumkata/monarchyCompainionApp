/* ══════════════════════════════════════════════════════════════
   75-audio.js — THE GM'S SOUNDS PLAY HERE, AND NOTHING ELSE DOES.

   Monarchy used to make sound of its own: a room's ambience that changed with where
   you were, and effects for dice, pieces, doors, blows, chat, joining and leaving.
   grumkata: "at this point remove the sound effects and ambience, they suck". They are
   gone — the engine, the files (about 18 MB), the sliders, the credit. The app is now
   silent unless the GM makes it speak:

     · the GM's MUSIC and VIDEO, in YouTube's own player (74-music.js), with its own volume
     · the GM's SOUND BOARD (76-soundboard.js): the GM's own files, played from here

   What is left of an engine is only this: decoding a file the GM chose, and playing it
   once, brought to a common peak (a file recorded quietly and one recorded hot would
   otherwise sit twenty decibels apart on one board). The only setting is
   Settings → Sound → on/off, for anyone who does not want to hear the GM's sound board.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const O = () => root.Options;
const soundOn = () => !O() || O().get('sound') !== 'off';

/* ── A LOG, FOR THE TESTS ─────────────────────────────────── */
const trace = [];
const note = (what, v) => { if (root.__soundTrace) trace.push([what, v]); };

let ctx = null;
function ac() {
  if (ctx) return ctx;
  const AC = root.AudioContext || root.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}

/* a file's data (a data URL) to something that can be played; null if it cannot be read as a sound */
function decodeData(url) {
  if (!ac() || !root.fetch) return Promise.resolve(null);
  return root.fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => buf, () => null);
}

/* played once, at a level that is the same whatever the file was recorded at; `mul` is the pad's own volume, 0 to 1 */
function playBuf(buf, mul) {
  if (!buf || !soundOn() || !ac()) return false;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!buf.peakLevel) {
    let p = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i += 3) { const a = Math.abs(d[i]); if (a > p) p = a; } }
    buf.peakLevel = p || 1;
  }
  const s = ctx.createBufferSource(); s.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = Math.min(6, 0.6 / buf.peakLevel) * (mul == null ? 1 : Math.max(0, Math.min(1, mul)));
  s.connect(g); g.connect(ctx.destination);
  s.start();
  note('fx', 'pad');
  return true;
}

/* a browser may refuse to start sound before the first touch; the first touch wakes it */
function unlock() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
function mount() {
  doc.addEventListener('pointerdown', unlock, true);
  doc.addEventListener('keydown', unlock, true);
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.Sound = { decodeData, playBuf, unlock, get trace() { return trace; } };

})(window, document);
