/* THROWAWAY SPIKE 4 — PLAYABLE design on the real table. Real engine calls (RULES.damageMods / tickTokens / TOKENS).
   Hover, select, type a number, tokens, drag to move, tray minis, the bell with visible ticks, undo.
   Injected into the running app; touches nothing in the repo. window.__sp4opts = { view:'gm'|'player', s:70 } */
(() => {
  const D = window.Table3D; if (!D) return 'no Table3D';
  for (const k of ['__spike2', '__sp3', '__sp4']) if (window[k] && window[k].stop) window[k].stop();
  const OPT = Object.assign({ view: 'gm', s: 70, per: 4, horiz: true, slots: 5 }, window.__sp4opts || {}); const GM = OPT.view === 'gm';
  const R_ = window.RULES; const TCON = window.TableContent; const TC = (TCON && TCON.TERRAINS && TCON.TERRAINS[OPT.terrain || 'meadow']) || null; const TOK = (R_ && R_.TOKENS) || {};
  const W = innerWidth, H = innerHeight;
  const L = c => new THREE.Color(c).convertSRGBToLinear();
  const old = document.getElementById('combat-prop'); if (old) old.style.display = 'none';
  const ease = { out: t => 1 - Math.pow(1 - t, 3), back: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }, io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };
  const tws = []; const tween = (ms, fn, e = 'out', done) => tws.push({ t0: performance.now(), ms, fn, e: ease[e] || ease.out, done });

  /* ---------- three ---------- */
  const cv = document.createElement('canvas'); cv.id = 'sp4cv';
  Object.assign(cv.style, { position: 'fixed', left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 901, pointerEvents: 'none' });
  document.body.appendChild(cv);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H, false); renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(L('#ffe9c8'), L('#33303c'), 1.0));
  const key = new THREE.DirectionalLight(L('#fff0d6'), 1.25); key.position.set(-500, 900, 800); scene.add(key);
  const fill = new THREE.DirectionalLight(L('#9ab4e0'), 0.4); fill.position.set(700, 300, 400); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(30, W / H, 10, 40000);
  const root = new THREE.Group(); root.matrixAutoUpdate = false; scene.add(root);
  const M = (c, r = .8, m = 0, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: L(c), roughness: r, metalness: m }, extra || {}));
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const toTex = (c, rep, aniso = 8) => { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const woodCanvas = (base) => { const c = mkCanvas(256, 256), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 100; i++) { x.strokeStyle = `rgba(${Math.random() < .5 ? '30,16,4' : '255,210,150'},${Math.random() * .11})`; x.lineWidth = 1 + Math.random() * 2.4; x.beginPath(); const y = Math.random() * 256; x.moveTo(0, y); x.bezierCurveTo(80, y + (Math.random() - .5) * 8, 170, y + (Math.random() - .5) * 8, 256, y + (Math.random() - .5) * 6); x.stroke(); } return c; };
  const feltCanvas = (w, h, base, label, lblCol, edge, vert, tint) => { const c = mkCanvas(w, h), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 90; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .1})`; x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }
    const g = vert ? x.createRadialGradient(w / 2, h / 2, w * .25, w / 2, h / 2, w * 1.1) : x.createRadialGradient(w / 2, h / 2, h * .2, w / 2, h / 2, w * .6); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); x.fillStyle = g; x.fillRect(0, 0, w, h); if (tint) { x.fillStyle = tint; x.fillRect(0, 0, w, h); } x.strokeStyle = 'rgba(232,195,95,.34)'; x.lineWidth = Math.max(2, Math.round(Math.min(w, h) * .008)); x.strokeRect(Math.round(Math.min(w, h) * .03), Math.round(Math.min(w, h) * .03), w - 2 * Math.round(Math.min(w, h) * .03), h - 2 * Math.round(Math.min(w, h) * .03));
    if (edge && !vert) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, w, 3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, h - 3, w, 3); } if (edge && vert) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, 3, h); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(w - 3, 0, 3, h); }
    if (label && vert) { const [a, b] = label.split(' '); x.font = `700 ${Math.round(w * .108)}px Cinzel, Georgia, serif`; x.letterSpacing = Math.round(w * .01) + 'px'; x.textBaseline = 'middle'; x.fillStyle = lblCol; x.fillText(a, w * .09, w * .15); x.fillText(b, w * .09, w * .275); } else if (label) { const [a, b] = label.split(' '); x.font = `600 ${Math.round(h * .105)}px Cinzel, Georgia, serif`; x.letterSpacing = Math.round(h * .03) + 'px'; x.textBaseline = 'middle'; x.fillStyle = lblCol; x.fillText(a, h * .12, h * .38); x.fillText(b, h * .12, h * .56); }
    return c; };
  const blobTex = (() => { const c = mkCanvas(64, 64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

  /* ---------- the board ---------- */
  const SLOTS = OPT.slots || 5, SPX = 2.2, SLOTEXT = SLOTS * SPX + 1.5, HZ = !!OPT.horiz;
  const PER = Math.max(1, Math.min(4, OPT.per || 4)); const LN = ['Backline', 'Support', 'Secondary', 'Frontline']; const pick = PER === 4 ? [0, 1, 2, 3] : PER === 3 ? [0, 2, 3] : PER === 2 ? [0, 3] : [3]; const RH = 2.15;
  const ROWS = [].concat(pick.map(i => ['en', RH, 'Enemy ' + LN[i]]), pick.slice().reverse().map(i => ['al', RH, 'Ally ' + LN[i]]));
  const ROWNAME = ROWS.map(r => r[2].split(' ')[1]);
  const RW = { es: Math.max(0, PER - 2), ef: PER - 1, af: PER, as: Math.min(2 * PER - 1, PER + 1) };
  let total = 0; ROWS.forEach(r => total += r[1]); const LINEEXT = total + .6; const BW = HZ ? LINEEXT : SLOTEXT, depth = HZ ? SLOTEXT : LINEEXT; const STX = -3.4, TRX = 4.2;
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(BW + 5, depth + 5), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: .85 })); bs.rotation.x = -Math.PI / 2; bs.position.set(.4, -.49, .6); root.add(bs);
  root.add(mesh(new THREE.BoxGeometry(BW + 1.6, .55, depth + 1.3), M('#9a6a3a', .7, 0, { map: toTex(woodCanvas('#7a5230'), [3, 1]) }), 0, -.27, 0));
  root.add(mesh(new THREE.BoxGeometry(BW + 1.6, .1, depth + 1.3), M('#5a3c1e', .65, 0, { map: toTex(woodCanvas('#5a3c1e'), [3, 1]) }), 0, .03, 0));
  root.add(mesh(new THREE.BoxGeometry(BW + .5, .09, depth + .5), M('#120d08', 1), 0, .1, 0));
  let cum = 0; const rowZ = [], strips = [];
  ROWS.forEach(([side, h, name], i) => { const lc = HZ ? total / 2 - (cum + h / 2) : -total / 2 + cum + h / 2; rowZ.push(lc);
    const mixHex = (a, b, t) => { const pa = [1, 3, 5].map(k => parseInt(a.slice(k, k + 2), 16)), pb = [1, 3, 5].map(k => parseInt(b.slice(k, k + 2), 16)); return '#' + pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, '0')).join(''); }; const sideBase = side === 'en' ? (i % 2 ? '#5b3a2e' : '#66402f') : (i % 2 ? '#2f4a63' : '#365270'); const base = TC ? mixHex(sideBase, TC.mat.ground, .2) : sideBase; const tint = null; const lcol = side === 'en' ? 'rgba(240,176,160,.5)' : 'rgba(170,200,245,.52)';
    let c, g; if (HZ) { const wpx = 320, hpx = Math.round(wpx * (depth - .3) / (h - .1)); c = feltCanvas(wpx, hpx, base, name.toUpperCase(), lcol, true, true, tint); g = new THREE.PlaneGeometry(h - .1, depth - .3); } else { const wpx = 1280, hpx = Math.round(wpx * (h - .1) / (BW - .3)); c = feltCanvas(wpx, hpx, base, name.toUpperCase(), lcol, true, false, tint); g = new THREE.PlaneGeometry(BW - .3, h - .1); }
    const m = new THREE.MeshStandardMaterial({ map: toTex(c, null, 8), roughness: .98, metalness: 0, emissive: new THREE.Color(0x000000) });
    const pl = new THREE.Mesh(g, m); pl.rotation.x = -Math.PI / 2; if (HZ) pl.position.set(lc, .165, 0); else pl.position.set(0, .165, lc); root.add(pl); strips.push(pl); cum += h; });
  const lineB = HZ ? total / 2 - ROWS.slice(0, PER).reduce((a, r) => a + r[1], 0) : -total / 2 + ROWS.slice(0, PER).reduce((a, r) => a + r[1], 0);
  if (HZ) root.add(mesh(new THREE.BoxGeometry(.15, .13, depth + .1), M('#e8c35f', .28, .5), lineB, .22, 0)); else root.add(mesh(new THREE.BoxGeometry(BW + .1, .13, .15), M('#e8c35f', .28, .5), 0, .22, lineB));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(mesh(new THREE.CylinderGeometry(.24, .24, .22, 18), M('#e8c35f', .28, .5), sx * (BW / 2 + .55), .12, sz * (depth / 2 + .25)));

  /* ---------- bell, stone, tray ---------- */
  const nearZ = depth / 2 + 2.0;
  const bell = new THREE.Group(); bell.position.set(0, 0, nearZ); root.add(bell);
  bell.add(mesh(new THREE.CylinderGeometry(1.05, 1.2, .24, 40), M('#4a3118', .65), 0, .12, 0));
  const bellMat = M('#f0c458', .32, .35, { emissive: L('#4a3208'), emissiveIntensity: .7 });
  const bellBody = mesh(lathe([[0, 0], [.98, 0], [.93, .22], [.72, .72], [.56, 1.22], [.33, 1.68], [0, 1.78]]), bellMat, 0, .24, 0); bell.add(bellBody);
  bell.add(mesh(new THREE.SphereGeometry(.2, 20, 14), M('#d6a636', .3, .4), 0, 2.02, 0));
  const halo = mesh(new THREE.TorusGeometry(1.55, .09, 10, 64), new THREE.MeshBasicMaterial({ color: L('#ffd860'), transparent: true, opacity: 0 }), 0, .2, 0); halo.rotation.x = Math.PI / 2; bell.add(halo);
  const clothC = (() => { const c = mkCanvas(768, 512), x = c.getContext('2d'); x.fillStyle = '#2b2a33'; x.fillRect(0, 0, 768, 512); for (let i = 0; i < 9000; i++) { x.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + Math.random() * .08 + ')'; x.fillRect(Math.random() * 768, Math.random() * 512, 2, 2); }
    x.strokeStyle = 'rgba(232,195,95,.55)'; x.lineWidth = 6; x.strokeRect(24, 24, 720, 464); x.fillStyle = 'rgba(232,195,95,.85)'; x.font = '700 40px Cinzel, Georgia, serif'; x.textAlign = 'center'; x.fillText('THE FIGHT HAS NOT BEGUN', 384, 240); x.font = 'italic 28px Crimson Text, Georgia, serif'; x.fillStyle = 'rgba(240,230,205,.8)'; x.fillText('ring the bell to lift the cloth', 384, 300); return c; })();
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(BW + 1.3, depth + 1.1, 40, 28), new THREE.MeshStandardMaterial({ map: toTex(clothC, null, 8), roughness: .96, transparent: true, opacity: GM ? .5 : .97, side: THREE.DoubleSide })); cloth.rotation.x = -Math.PI / 2; cloth.position.y = .5;
  { const pa = cloth.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const px = pa.getX(i), py = pa.getY(i); const ex = Math.abs(px) / ((BW + 1.3) / 2), ey = Math.abs(py) / ((depth + 1.1) / 2); const e2 = Math.max(ex, ey); pa.setZ(i, .1 * Math.sin(px * .9 + 1.3) * Math.cos(py * .7) + (e2 > .9 ? -.55 * (e2 - .9) / .1 : 0)); } cloth.geometry.computeVertexNormals(); }
  cloth.visible = !!OPT.cover; root.add(cloth);
  const lamps = [-.6, 0, .6].map(dx => { const m = new THREE.MeshBasicMaterial({ color: L('#5a4a2a') }); bell.add(mesh(new THREE.SphereGeometry(.14, 16, 12), m, dx, .32, 1.1)); return m; });
  const stone = new THREE.Group(); stone.position.set(STX, 0, nearZ); root.add(stone);
  stone.add(mesh(new THREE.CylinderGeometry(.95, 1.05, .22, 36), M('#3a2b1e', .65), 0, .11, 0));
  const stoneMat = new THREE.MeshStandardMaterial({ color: L('#8fd8ff'), emissive: L('#2fa0e0'), emissiveIntensity: .9, roughness: .15, metalness: .1, transparent: true, opacity: .93 });
  stone.add(mesh(new THREE.SphereGeometry(.82, 32, 24), stoneMat, 0, 1.05, 0));
  const tray = new THREE.Group(); tray.position.set(TRX, 0, nearZ); root.add(tray);
  tray.add(mesh(new THREE.BoxGeometry(5.2, .32, 2.1), M('#5a3c1e', .7, 0, { map: toTex(woodCanvas('#5a3c1e'), [2, 1]) }), 0, .16, 0));
  [[5.2, .28, .15, 0, .4, .97], [5.2, .28, .15, 0, .4, -.97], [.15, .28, 2.1, 2.52, .4, 0], [.15, .28, 2.1, -2.52, .4, 0]].forEach(a => tray.add(mesh(new THREE.BoxGeometry(a[0], a[1], a[2]), M('#3f2a14', .8), a[3], a[4], a[5])));
  tray.visible = GM;

  /* ---------- pictures with a light sticker edge ---------- */
  const texCache = {};
  function outlined(fig, cb) { if (texCache[fig]) return cb(texCache[fig]); const im = new Image(); im.onload = () => {
      const r = 5, w = im.width + r * 2, h = im.height + r * 2; const sil = mkCanvas(w, h); const sx = sil.getContext('2d'); sx.drawImage(im, r, r); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#f4e9c8'; sx.fillRect(0, 0, w, h);
      const out = mkCanvas(w, h); const ox = out.getContext('2d'); for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; ox.drawImage(sil, Math.cos(ang) * r * .85, Math.sin(ang) * r * .85); }
      ox.drawImage(sil, 0, 0); ox.drawImage(im, r, r); const t = toTex(out, null, 8); texCache[fig] = { t, a: w / h }; cb(texCache[fig]); };
    im.src = SPRITES[fig].src; }

  /* ---------- state ---------- */
  let uid = 0; const mkU = (row, side, fig, name, hp, max, cond, o) => Object.assign({ id: 'u' + (++uid), row, side, fig, name, hp, max, cond: cond || [], done: false, flash: 0, jx: 0, tipped: 0, vis: 1 }, o || {});
  const units = [
    mkU(RW.es, 'en', 'archer', 'Crow Archer', 18, 18), mkU(RW.es, 'en', 'lich', 'Pyre-Adept', 9, 14, [{ n: 'Bleed', c: 2 }]), mkU(RW.es, 'en', 'archer', 'Ash Cantor', 16, 16),
    mkU(RW.ef, 'en', 'skeleton', 'Barrow Warden', 21, 35, [{ n: 'Taunt', c: 1 }, { n: 'Winded', c: 3 }]), mkU(RW.ef, 'en', 'skeleton', 'Grave Serjeant 1', 20, 20),
    mkU(RW.ef, 'en', 'skeleton', 'Grave Serjeant 2', 12, 20, [{ n: 'Bleed', c: 2 }, { n: 'Hardened', c: 1 }]), mkU(RW.ef, 'en', 'lich', 'Hollow Knight', 62, 70, [], { big: 1 }),
    mkU(RW.af, 'al', 'axeman', 'Thane Bryn', 34, 34, [{ n: 'Guard', c: 1 }], { done: true, pc: 1, dex: 3 }), mkU(RW.af, 'al', 'spearman', 'Sir Aldric', 28, 28, [{ n: 'Dodge', c: 2 }], { own: 1, pc: 1, dex: 7 }), mkU(RW.af, 'al', 'spearman', 'Hedge Rider', 30, 30, [], { pc: 1, dex: 9 }),
    mkU(RW.as, 'al', 'spearman', 'Marsh Blade', 26, 28), mkU(RW.as, 'al', 'archer', 'Mirri', 18, 18, [{ n: 'Daze', c: 1 }]), mkU(RW.as, 'al', 'axeman', 'Vashka', 62, 62, [], { big: 1 })];
  const KEEP = window.__sp4keep; window.__sp4keep = null;
  if (KEEP) { units.length = 0; KEEP.units.forEach(k => { const fd = k.side === 'en' ? KEEP.per - 1 - k.row : k.row - KEEP.per; const row = k.side === 'en' ? Math.max(0, Math.min(PER - 1, PER - 1 - fd)) : Math.max(PER, Math.min(2 * PER - 1, PER + fd)); units.push(mkU(row, k.side, k.fig, k.name, k.hp, k.max, k.cond, { big: k.big, done: k.done, own: k.own, pc: k.pc, dex: k.dex })); }); }
  const st = { round: KEEP ? KEEP.round : 2, phase: KEEP ? KEEP.phase : 1, mana: KEEP ? KEEP.mana : 14, setup: !!OPT.setup, cover: !!OPT.cover, sel: KEEP ? null : (GM ? units[5].id : units.find(u => u.own).id), hover: null, prev: null, buf: '', mode: 'hit', names: false };
  const hist = []; const snap = () => JSON.stringify({ round: st.round, phase: st.phase, mana: st.mana, units: units.map(u => ({ id: u.id, row: u.row, side: u.side, hp: u.hp, cond: u.cond, done: u.done, vis: u.vis })) });
  const push = () => { hist.push(snap()); if (hist.length > 60) hist.shift(); };
  const undo = () => { const s = hist.pop(); if (!s) return; const o = JSON.parse(s); st.round = o.round; st.phase = o.phase; st.mana = o.mana;
    o.units.forEach(q => { const u = units.find(x => x.id === q.id); if (u) { const pp = byId(u.id); pp.vis01 = 1; Object.assign(u, { row: q.row, side: q.side, hp: q.hp, cond: q.cond, done: q.done, vis: q.vis }); const p = byId(u.id); p.g.visible = !!u.vis; show(p, !!u.vis); } });
    units.filter(u => !o.units.find(q => q.id === u.id)).forEach(u => { u.vis = 0; const p = byId(u.id); p.g.visible = false; show(p, false); });
    pieces.forEach(p => paintPlate(p)); relayout(false); paintCard(); toast('Undone'); };
  const tokKind = n => { const d = TOK[n]; return d ? (d.sign === 'good' ? 'g' : d.sign === 'bad' ? 'b' : 'n') : 'n'; };
  const tokRule = n => { const d = TOK[n]; return d && d.text ? d.text : 'a marker'; };
  const addTok = (u, n, d) => { const t = u.cond.find(x => x.n === n); if (t) { t.c += d; if (t.c <= 0) u.cond.splice(u.cond.indexOf(t), 1); } else if (d > 0) u.cond.push({ n, c: d }); };
  const pv = (u, amt, heal) => { if (heal) return { eff: amt, why: [], spend: [] }; const m = R_ ? R_.damageMods(null, Object.assign({}, u, { cond: u.cond })) : { dealt: 1, taken: 1, spend: [], why: [] }; return { eff: Math.max(0, Math.round(amt * m.dealt * m.taken)), why: m.why, spend: m.spend }; };

  /* ---------- DOM overlay in a shadow root so the app's CSS cannot leak in ---------- */
  const ov = document.createElement('div'); ov.id = 'sp4ov'; Object.assign(ov.style, { position: 'fixed', left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 902, pointerEvents: 'none', overflow: 'hidden' });
  document.body.appendChild(ov); const R = ov.attachShadow({ mode: 'open' });
  const css = document.createElement('style'); css.textContent = `
   :host{font-family:'Crimson Text',Georgia,serif;color:#f0e7d0;user-select:none}
   *{box-sizing:border-box}
   .pc{position:absolute;pointer-events:none;transform:translate(-50%,0)}
   .cap{position:relative;height:15px;background:#000d;border:1.5px solid #000;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px #000c}
   .cap i{position:absolute;left:0;top:0;height:100%}.cap .gh{background:#efe7cc;opacity:.6;transition:width .5s ease-out .15s}.cap .fl{transition:width .1s}
   .cap b{position:relative;display:block;text-align:center;font:700 13px/12px 'Barlow Condensed','Arial Narrow',sans-serif;color:#fff;-webkit-text-stroke:2.6px #000;paint-order:stroke fill}
   .nmf{z-index:5;position:absolute;transform:translate(-50%,-100%);white-space:nowrap;font:700 13px/14px 'Crimson Text',Georgia,serif;color:#fff6e0;-webkit-text-stroke:3.2px #000;paint-order:stroke fill;pointer-events:none}
   .dn{position:absolute;right:-9px;top:-4px;width:15px;height:15px;border-radius:50%;background:#e8c35f;color:#1a1206;font:700 11px/15px Arial;text-align:center;border:1px solid #000}
   .nu{position:absolute;left:-9px;top:-4px;width:15px;height:15px;border-radius:50%;background:#1d170f;color:#f0e7d0;font:700 11px/13px Arial;text-align:center;border:1.5px solid #f4e9c8}
   .ch{position:absolute;transform-origin:left center;display:flex;flex-direction:column;gap:3px;pointer-events:none}
   .ch u{display:flex;align-items:center;justify-content:center;position:relative;width:22px;height:22px;font:700 10px/1 Arial;color:#fff;text-decoration:none;border:1.5px solid #fffa;box-shadow:0 1px 3px #000b;pointer-events:auto;cursor:help}
   u.g{background:#2f7a3b;border-radius:50%}u.b{background:#a02c26;clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);border:0}u.n{background:#b78a1c;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);border:0}
   .ch u s{position:absolute;right:-6px;bottom:-5px;background:#0d0a08;border:1px solid #fff9;border-radius:6px;min-width:12px;height:12px;font:700 9px/11px Arial;text-decoration:none;text-align:center;color:#fff}
   .gl{display:inline-block}.gl svg{width:100%;height:100%;display:block;filter:drop-shadow(0 1px 1px #000a)}
   .tkc{position:relative;display:block;width:25px;height:25px;pointer-events:auto;cursor:help}.tkc .gl{width:25px!important;height:25px!important}
   .tkc s{position:absolute;right:-5px;bottom:-5px;background:#0d0a08;border:1px solid #fff9;border-radius:6px;min-width:12px;height:12px;font:700 9px/11px Arial;text-decoration:none;text-align:center;color:#fff}
   .more{display:block;font:700 10px/12px Arial;font-style:normal;color:#fff;-webkit-text-stroke:2.5px #000;paint-order:stroke fill;text-align:center}
   .tr{display:flex;align-items:center;gap:7px;cursor:help}.tr .gl{flex:none}.ti{margin-bottom:5px}.ti .rl{display:block;margin:1px 0 0 31px;font-size:12px}.tr .tn{flex:1;font:700 12px 'Barlow Condensed',sans-serif;letter-spacing:.05em;text-transform:uppercase;min-width:74px}
   .stp{display:inline-flex;align-items:center;gap:3px;margin-left:auto}.stp b{min-width:14px;text-align:center;font:700 13px 'Barlow Condensed'}.stp u{width:19px;height:19px;border-radius:50%;background:#2a2118;border:1px solid #5a4a2a;text-decoration:none;text-align:center;font:700 13px/17px Arial;cursor:pointer}.stp u:hover{border-color:#d1a52c}
   .pal{padding:2px 13px 6px}.pg{display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin-bottom:4px}.pgl{width:100%;font:700 8px Cinzel,serif;letter-spacing:.14em;color:#6f6450;text-transform:uppercase}
   .pi{cursor:pointer;border-radius:50%;transition:transform .08s}.pi:hover{transform:scale(1.22)}
   .ed{display:flex;align-items:center;gap:7px;padding:4px 13px}.ed label{width:50px;font:700 9px Cinzel,serif;letter-spacing:.14em;color:#6f6450;text-transform:uppercase}
   .ed input{background:#0d0a07;border:1px solid #d1a52c;border-radius:3px;color:#fff;font:600 15px 'Crimson Text',serif;padding:5px 8px;flex:1;min-width:0;outline:none}.ed input:focus{box-shadow:0 0 0 2px #d1a52c55}
   .pics{display:flex;gap:6px}.pic{width:44px;height:52px;border-radius:4px;border:2px solid #3a2f20;background:#2a2118 center 8%/auto 125% no-repeat;cursor:pointer}.pic.on{border-color:#e8c35f;box-shadow:0 0 0 2px #e8c35f55}.pic:hover{border-color:#d1a52c}
   .tab{position:absolute;transform:translate(-50%,-50%);font:600 11px Cinzel,Georgia,serif;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;-webkit-text-stroke:3px #000;paint-order:stroke fill;cursor:pointer;pointer-events:auto;padding:3px 5px;color:#b9a77f}.tab.on{color:#f6d77a;border-bottom:2px solid #e8c35f}.tab:hover{color:#fff}
   .mlab{z-index:4;font-size:10px!important;color:#f6e7b8}
   .stud{position:absolute;width:26px;height:26px;transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;cursor:pointer}.stud:hover{box-shadow:0 0 0 3px #f6d77a99}
   .addl{position:absolute;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:#2a2118e6;border:2px solid #e8c35f;color:#f6d77a;font:700 22px/26px Arial;text-align:center;cursor:pointer;pointer-events:auto}.addl:hover{background:#e8c35f;color:#1a1206}
   .sv{min-width:26px;text-align:center;font:700 20px 'Barlow Condensed'}
   .fhud{display:none;position:absolute;left:50%;bottom:16px;transform:translateX(-50%);gap:16px;align-items:center;pointer-events:none}
   :host(.infield) .fhud{display:flex}
   :host(.infield) .pc,:host(.infield) .nmf,:host(.infield) .ch,:host(.infield) .hit,:host(.infield) .tab,:host(.infield) .stud,:host(.infield) .addl,:host(.infield) .big,:host(.infield) .tag,:host(.infield) .mlab,:host(.infield) .wear,:host(.infield) .pop{display:none!important}
   .fstone,.fbell{pointer-events:auto;cursor:pointer;width:66px;height:66px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #0008;box-shadow:0 4px 14px #000b}
   .fstone{background:radial-gradient(circle at 35% 30%,#d6f4ff,#58b8ef 55%,#1e6fa8);color:#06273f}
   .fbell{width:78px;height:78px;background:radial-gradient(circle at 35% 30%,#ffe9a8,#e0b43e 55%,#8f6a12);color:#2a1c04}
   .fstone b,.fbell b{font:700 26px/24px 'Barlow Condensed',sans-serif}.fstone span,.fbell span{font:700 8px Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;margin-top:2px}
   .fout{pointer-events:auto;background:#1e1812e8}
   .hit{position:absolute;pointer-events:auto;cursor:pointer}
   .big{position:absolute;transform:translate(-50%,-50%);font:700 28px 'Barlow Condensed',sans-serif;color:#fff;-webkit-text-stroke:4px #000;paint-order:stroke fill;pointer-events:none}
   .tag{position:absolute;transform:translate(-50%,-50%);font:600 11px 'Cinzel',Georgia,serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;-webkit-text-stroke:3px #000;paint-order:stroke fill;pointer-events:none}
   .click{position:absolute;pointer-events:auto;cursor:pointer;border-radius:50%}
   .pop{z-index:6;position:absolute;transform:translate(-50%,-50%);font:700 26px 'Barlow Condensed',sans-serif;-webkit-text-stroke:4px #000;paint-order:stroke fill;pointer-events:none;white-space:nowrap}
   .wear{z-index:6;position:absolute;transform:translate(-50%,-100%);text-align:center;pointer-events:none;white-space:nowrap}
   .wear b{display:block;font:700 40px/38px 'Barlow Condensed',sans-serif;-webkit-text-stroke:5px #000;paint-order:stroke fill}
   .wear em{display:block;font:italic 700 14px 'Crimson Text',serif;color:#ffe9a0;-webkit-text-stroke:3.5px #000;paint-order:stroke fill}
   .q{position:absolute;display:flex;gap:4px;pointer-events:auto;transform:translate(-50%,0);background:#0d0a07d8;border:1px solid #8f6f1b;border-radius:14px;padding:3px 6px}
   .q u{width:24px;height:24px;display:flex;align-items:center;justify-content:center;font:700 9px Arial;color:#fff;text-decoration:none;border:1.5px solid #fff9;cursor:pointer}
   .card{position:absolute;width:392px;background:linear-gradient(#1d170f,#130f0a);border:1px solid #8f6f1b;border-radius:4px;box-shadow:0 8px 28px #000c;color:#efe6d2;pointer-events:auto}
   .card.pvw{border-style:dashed;opacity:.94}
   .card .hd{display:flex;gap:12px;padding:11px 13px 5px}
   .coin{width:50px;height:50px;border-radius:50%;border:3px solid #b4382e;background:#2a2118 center 6%/150% no-repeat;flex:none;box-shadow:0 2px 6px #000a}
   .card .n{font:700 16px 'Cinzel',serif;letter-spacing:.03em}
   .card .s{font:600 9px 'Cinzel',serif;letter-spacing:.14em;color:#a8997a;text-transform:uppercase}
   .hpn{font:700 32px/1 'Barlow Condensed',sans-serif}.hpn small{font-size:17px;color:#a8997a}
   .hbar{position:relative;height:7px;background:#0a0806;border:1px solid #000;border-radius:4px;overflow:hidden;flex:1;margin-bottom:6px}.hbar i{position:absolute;left:0;top:0;height:100%}
   .act{display:flex;gap:7px;align-items:center;padding:2px 13px 4px}
   .f{width:62px;height:34px;border:1px solid #d1a52c;background:#0d0a07;border-radius:3px;font:700 24px/34px 'Barlow Condensed';text-align:center;color:#fff}.f.on{box-shadow:0 0 0 2px #d1a52c55}
   .b{font:600 10px 'Cinzel',serif;letter-spacing:.1em;text-transform:uppercase;padding:8px 11px;border-radius:3px;border:1px solid #3a2f20;background:#1e1812;cursor:pointer}
   .b:hover{border-color:#d1a52c}.b.or{background:linear-gradient(#e0b23a,#b98a1e);color:#1a1206;border-color:#e8c25a}
   .pvl{padding:0 13px 7px;font:italic 13px/1.2 'Crimson Text',serif;color:#e9d9a8;min-height:16px}.pvl em{font-style:normal;color:#fff;font-weight:700}
   .lbl{font:700 9px 'Cinzel',serif;letter-spacing:.16em;color:#6f6450;text-transform:uppercase;padding:2px 13px}
   .tk{display:block;gap:3px 9px;align-items:center;padding:4px 13px}
   .pill{font:700 11px 'Barlow Condensed',sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:2px 9px;color:#fff;display:inline-flex;cursor:pointer}
   .pill.g{background:#2f7a3b;border-radius:11px}.pill.b{background:#a02c26;border-radius:3px}.pill.n{background:#b78a1c;border-radius:3px}
   .rl{font:italic 12px/1.15 'Crimson Text',serif;color:#a8997a}
   .fav{display:flex;gap:5px;padding:4px 13px;align-items:center;flex-wrap:wrap}.fav u{width:26px;height:26px;display:flex;align-items:center;justify-content:center;font:700 9px Arial;color:#fff;text-decoration:none;border:1.5px solid #fff8;cursor:pointer}
   .row{display:flex;gap:6px;padding:5px 13px 11px;align-items:center}
   .vit{display:flex;gap:11px;font:700 12px 'Barlow Condensed',sans-serif;color:#a8997a;letter-spacing:.06em;padding:0 13px 6px}.vit u{text-decoration:none;color:#efe6d2}
   .tip{position:absolute;background:#0d0a07f2;border:1px solid #8f6f1b;border-radius:3px;padding:6px 9px;font:italic 13px/1.2 'Crimson Text',serif;color:#efe6d2;pointer-events:none;max-width:260px;box-shadow:0 4px 14px #000a;z-index:5}
   .tip b{font:700 11px 'Cinzel',serif;font-style:normal;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:2px}
   .toast{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:#0d0a07e8;border:1px solid #8f6f1b;border-radius:14px;padding:5px 16px;font:italic 14px 'Crimson Text',serif;color:#efe6d2;pointer-events:none;opacity:0;transition:opacity .2s;white-space:nowrap}
  `; R.appendChild(css);
  const el = (cls, html, parent) => { const e = document.createElement('div'); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || R).appendChild(e); return e; };
  const TG = window.__TG; const kindOf = n => (TG && TG.kind(n)) || tokKind(n); const abbr = n => n.slice(0, 2);
  const ico = (n, px) => (TG && TG.has(n)) ? `<i class="gl" style="width:${px}px;height:${px}px">${TG.svg(n)}</i>` : `<u class="${kindOf(n)}" style="width:${px}px;height:${px}px">${abbr(n)}</u>`;
  const chipHTML = (n, c) => `<i class="tkc" data-tk="${n}">${ico(n, 25)}${c > 1 ? "<s>" + c + "</s>" : ""}</i>`;
  const cardEl = el('card', ''); const tip = el('tip', ''); tip.style.display = 'none'; const toastEl = el('toast', ''); let toastT = 0;
  const wear = el('wear', ''); wear.style.display = 'none'; const qrow = el('q', ''); qrow.style.display = 'none';
  const toast = m => { toastEl.textContent = m; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => toastEl.style.opacity = 0, 2000); };
  const FAV = ['Bleed', 'Stun', 'Daze', 'Taunt', 'Guard', 'Hardened'];
  qrow.innerHTML = FAV.map(n => `<u class="${kindOf(n)}" data-add="${n}" title="${n}">${abbr(n)}</u>`).join('');

  /* ---------- pieces ---------- */
  const pieces = []; const byId = id => pieces.find(p => p.u.id === id);
  let AX = 2200, AY = 2200, S = OPT.s;
  function makePiece(u) {
    const g = new THREE.Group(); root.add(g); const sc = u.big ? 1.18 : 1; const Rr = .66 * sc, hh = 2.05 * sc;
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6 * sc, 2.6 * sc), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .01; g.add(sh);
    g.add(mesh(new THREE.CylinderGeometry(Rr, Rr * 1.07, .17, 48), M('#3a2b1e', .55), 0, .085, 0));
    const ring = mesh(new THREE.TorusGeometry(Rr * .98, .07, 8, 64), M(u.side === 'en' ? '#d04a38' : '#4a82da', .35, .3), 0, .18, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
    const sel = mesh(new THREE.TorusGeometry(Rr * 1.38, .085, 8, 64), new THREE.MeshBasicMaterial({ color: L('#f7d35a') }), 0, .12, 0); sel.rotation.x = Math.PI / 2; sel.visible = false; g.add(sel); const act = mesh(new THREE.TorusGeometry(Rr * 1.2, .04, 6, 56), new THREE.MeshBasicMaterial({ color: L('#ffe58a'), transparent: true, opacity: .95 }), 0, .2, 0); act.rotation.x = Math.PI / 2; act.visible = false; g.add(act);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .3, side: THREE.DoubleSide }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); g.add(pl);
    outlined(u.fig, o => { mat.map = o.t; mat.needsUpdate = true; pl.scale.set(hh * o.a, hh, 1); pl.position.set(0, .15 + hh / 2, 0); pbase.w = hh * o.a; });
    const e = el('pc', `<div class="cap"><i class="gh"></i><i class="fl"></i><b></b></div>`); const num = el('nu', '', e); const dn = el('dn', '&#10003;', e);
    const nm = el('nmf', ''); const ch = el('ch', ''); const hit = el('hit', '');
    const pbase = { w: 1 }; const p = { pbase, ph: Math.random() * 6.28, u, g, pl, mat, ring, sel, act, Rr, hh, sc, e, nm, ch, hit, num, dn, hv: 0, lift2: 0, x: null, tx: null, dx: null, dz: null, flash: 0, drop: 0, vis01: 1, cap: e.querySelector('.cap'), fl: e.querySelector('.fl'), gh: e.querySelector('.gh'), cb: e.querySelector('b') };
    pieces.push(p);
    hit.addEventListener('mouseenter', () => { st.hover = u.id; hoverFx(); clearTimeout(prevT); prevT = setTimeout(() => { if (st.hover === u.id && st.sel !== u.id && st.buf === '') { st.prev = u.id; paintCard(); } }, 130); });
    hit.addEventListener('mouseleave', () => { if (st.hover === u.id) st.hover = null; hoverFx(); clearTimeout(prevT); if (st.prev === u.id) { st.prev = null; paintCard(); } });
    hit.addEventListener('pointerdown', e2 => { if (e2.button !== 0) return; drag = { p, x0: e2.clientX, y0: e2.clientY, on: false }; });
    outlined(u.fig, () => { }); paintPlate(p); return p; }
  let prevT = 0, drag = null;
  units.forEach(makePiece);
  function show(p, on) { [p.e, p.nm, p.ch, p.hit].forEach(x => x.style.display = on ? '' : 'none'); }
  function relayout(snapNow) { const per = {}; pieces.forEach(p => { if (p.u.vis) (per[p.u.row] = per[p.u.row] || []).push(p); });
    Object.values(per).forEach(arr => { arr.sort((a, b) => (a.tx == null ? 0 : a.tx) - (b.tx == null ? 0 : b.tx)); arr.forEach((p, i) => { const sq = arr.length > 1 ? Math.min(SPX, (SLOTEXT - 1.8) / (arr.length - 1)) : SPX; const x = -((arr.length - 1) * sq) / 2 + i * sq; if (snapNow || p.x == null) p.x = x; else { const x0 = p.x; tween(280, t => { p.x = x0 + (x - x0) * t; }, 'back'); } p.tx = x; }); }); }
  relayout(true);

  /* ---------- tray minis ---------- */
  const LIB = { mon: [{ id: 'm1', fig: 'skeleton', name: 'Grave Serjeant', hp: 20, side: 'en', cond: [] }, { id: 'm2', fig: 'archer', name: 'Crow Archer', hp: 18, side: 'en', cond: [] }, { id: 'm3', fig: 'lich', name: 'Pyre-Adept', hp: 14, side: 'en', cond: [{ n: 'Bleed', c: 1 }] }, { id: 'm4', fig: 'skeleton', name: 'Barrow Warden', hp: 35, side: 'en', big: 1, cond: [{ n: 'Taunt', c: 1 }] }],
    peo: [{ id: 'p1', fig: 'spearman', name: 'Brother Hale', hp: 26, side: 'al', cond: [] }, { id: 'p2', fig: 'archer', name: 'Tamsin', hp: 22, side: 'al', cond: [] }, { id: 'p3', fig: 'axeman', name: 'Old Garrick', hp: 30, side: 'al', cond: [] }],
    fig: [{ id: 'f1', name: 'Crypt Ambush', units: [['skeleton', 'Grave Serjeant', 20, 'en', 'f'], ['skeleton', 'Grave Serjeant', 20, 'en', 'f'], ['archer', 'Crow Archer', 18, 'en', 's'], ['lich', 'Pyre-Adept', 14, 'en', 's']] }, { id: 'f2', name: 'Bandit Road', units: [['axeman', 'Roadman', 22, 'en', 'f'], ['axeman', 'Roadman', 22, 'en', 'f'], ['archer', 'Snipe', 12, 'en', 's']] }] };
  if (KEEP && KEEP.LIB) { LIB.mon = KEEP.LIB.mon; LIB.peo = KEEP.LIB.peo; LIB.fig = KEEP.LIB.fig; }
  st.tab = KEEP ? KEEP.tab : 'mon'; st.edit = null; const minis = [];
  const FIGS = ['spearman', 'archer', 'axeman', 'skeleton', 'lich'];
  function buildTray() { minis.forEach(m => { tray.remove(m.g); m.hit.remove(); m.lab.remove(); }); minis.length = 0;
    const list = LIB[st.tab]; const withPlus = st.tab !== 'peo'; const n = list.length + (withPlus ? 1 : 0); const sp = Math.min(.95, 4.4 / Math.max(n, 1));
    const items = list.map(t => ({ t })).concat(withPlus ? [{ plus: 1 }] : []);
    items.forEach((it, i) => { const x = -(n - 1) * sp / 2 + i * sp; const g = new THREE.Group(); g.position.set(x, .32, 0); tray.add(g); const t = it.t;
      const side = it.plus ? 'x' : (st.tab === 'fig' ? 'en' : t.side);
      g.add(mesh(new THREE.CylinderGeometry(.4, .43, .1, 28), M('#3a2b1e', .6), 0, .05, 0)); const rg = mesh(new THREE.TorusGeometry(.4, .045, 8, 36), M(side === 'en' ? '#d04a38' : side === 'al' ? '#4a82da' : '#e8c35f', .4), 0, .11, 0); rg.rotation.x = Math.PI / 2; g.add(rg);
      let pl;
      if (it.plus) { pl = new THREE.Group(); pl.position.y = .55; pl.add(mesh(new THREE.BoxGeometry(.7, .16, .16), M('#e8c35f', .3, .5), 0, 0, 0)); pl.add(mesh(new THREE.BoxGeometry(.16, .7, .16), M('#e8c35f', .3, .5), 0, 0, 0)); g.add(pl); }
      else if (st.tab === 'fig') { pl = new THREE.Group(); pl.add(mesh(new THREE.CylinderGeometry(.04, .04, 1.2, 8), M('#c9b38a', .5), 0, .6, 0)); pl.add(mesh(new THREE.BoxGeometry(.55, .4, .03), M('#a02c26', .8), .3, 1.0, 0)); pl.add(mesh(new THREE.BoxGeometry(.55, .06, .04), M('#e8c35f', .3, .5), .3, 1.2, 0)); pl.position.y = .1; g.add(pl); }
      else { const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .3, side: THREE.DoubleSide }); pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); const bg = t.big ? 1.2 : 1; outlined(t.fig, o => { mat.map = o.t; mat.needsUpdate = true; pl.scale.set(1.15 * o.a * bg, 1.15 * bg, 1); pl.position.set(0, .1 + .575 * bg, 0); }); g.add(pl); }
      const hit = el('hit', ''); hit.dataset.mini = i; const lab = el('tag mlab', it.plus ? (st.tab === 'fig' ? 'Save this fight' : 'New monster') : t.name); lab.style.display = 'none';
      const mobj = { x, g, pl, hit, lab, t, plus: !!it.plus, hv: 0 }; minis.push(mobj); if (!GM) hit.style.display = 'none';
      hit.addEventListener('mouseenter', () => { lab.style.display = ''; tween(120, k => { mobj.hv = .22 * k; }); }); hit.addEventListener('mouseleave', () => { lab.style.display = 'none'; tween(120, k => { mobj.hv = .22 * (1 - k); }); });
    }); }
  buildTray();
  const rowOf = (side, ln) => side === 'en' ? (ln === 's' ? RW.es : RW.ef) : (ln === 's' ? RW.as : RW.af);
  function addUnit(spec, delay) { const u = mkU(spec.row, spec.side, spec.fig, spec.name, spec.hp, spec.hp, JSON.parse(JSON.stringify(spec.cond || [])), spec.big ? { big: 1 } : {}); units.push(u); setTimeout(() => { const p = makePiece(u); p.vis01 = 0; p.drop = 1.8; p.x = null; relayout(false); tween(400, t => { p.drop = 1.8 * (1 - t); p.vis01 = Math.min(1, t * 2.2); }, 'out'); tween(320, t => { p.pop = 1 + (1 - t) * .3; }, 'back'); }, delay || 0); return u; }
  const nextName = base => { const n = units.filter(u => u.vis && (u.name === base || u.name.startsWith(base + ' '))).length; if (n === 1) { const f = units.find(u => u.vis && u.name === base); if (f) { f.name = base + ' 1'; const pp = byId(f.id); if (pp) paintPlate(pp); } } return n ? base + ' ' + (n + 1) : base; };
  function deploy(t) { push(); const nm = nextName(t.name); const u = addUnit({ row: t.side === 'en' ? RW.ef : RW.af, side: t.side, fig: t.fig, name: nm, hp: t.hp, cond: t.cond, big: t.big }, 0); toast(nm + ' joins the ' + (t.side === 'en' ? 'enemy' : 'allied') + ' frontline'); st.sel = u.id; setTimeout(refreshSel, 30); }
  function deployFight(f) { push(); f.units.forEach(([fig, name, hp, side, ln], i) => { const nm = nextName(name); addUnit({ row: rowOf(side, ln), side, fig, name: nm, hp }, i * 130); }); toast(f.name + ': ' + f.units.length + ' on the board'); }
  function saveFight() { const v = units.filter(u => u.vis); const f = { id: 'f' + Date.now(), name: 'Fight ' + (LIB.fig.length + 1), units: v.map(u => [u.fig, u.name.replace(/ \d+$/, ''), u.max, u.side, (u.row === RW.es || u.row === RW.as) ? 's' : 'f']) }; LIB.fig.push(f); buildTray(); toast('Saved as "' + f.name + '" on the Fights tray'); }
  function newMonster() { const t = { id: 'm' + Date.now(), fig: 'skeleton', name: 'New monster', hp: 10, side: 'en', cond: [] }; LIB.mon.push(t); st.edit = t; st.sel = null; refreshSel(); st.edit = t; paintCard(); buildTray(); toast('New monster is on the tray. Fill it in on the card.'); }

  /* ---------- the card ---------- */
  const tgtU = () => units.find(x => x.id === (st.prev || st.sel));
  const palHTML = (attr) => '<div class="pg" style="gap:3px">' + ['g', 'n', 'b'].map(k => Object.keys(TOK).filter(n => kindOf(n) === k).map(n => '<span class="pi" ' + attr + '="' + n + '" data-tk="' + n + '">' + ico(n, 26) + '</span>').join('') + '<span style="width:8px"></span>').join('') + '</div>';
  function cardHTML(u, ro) { const hid = !GM && u.side === 'en' && (OPT.enemyHp || 'numbers') !== 'numbers'; const fr = u.hp / u.max, col = fr > .6 ? '#6fbf4a' : fr > .3 ? '#d9a232' : '#c8452c'; const amt = parseInt(st.buf, 10); const can = (GM || u.own) && !ro;
    let pvl = ''; if (can && !isNaN(amt)) { const r = pv(u, amt, st.mode === 'heal'); pvl = st.mode === 'heal' ? `Heal ${amt} &rarr; health ${u.hp} &rarr; <em>${Math.min(u.max, u.hp + amt)}</em>` : `${amt}${r.why.length ? ' &rarr; ' + r.why.join(', ') + ' &rarr; <em>' + r.eff + '</em>' : ''} &nbsp;&middot;&nbsp; health ${u.hp} &rarr; <em>${Math.max(0, u.hp - r.eff)}</em>`; }
    const canTok = (GM || u.own) && !ro; const toks = u.cond.map(t => `<div class="ti"><span class="tr" data-tk="${t.n}">${ico(t.n, 24)}<b class="tn">${t.n}</b>${canTok ? `<span class="stp"><u data-dec="${t.n}">&minus;</u><b>${t.c}</b><u data-inc="${t.n}">+</u></span>` : `<span class="stp"><b>${t.c}</b></span>`}</span><span class="rl">${tokRule(t.n)}</span></div>`).join('') || '<span class="rl">No tokens.</span>';
    const pal = canTok ? palHTML('data-add') : ''; const palOld = canTok ? [['g', 'Good'], ['n', 'Neutral'], ['b', 'Bad']].map(([k, nmk]) => `<div class="pg"><span class="pgl">${nmk}</span>${Object.keys(TOK).filter(n => kindOf(n) === k).map(n => `<span class="pi" data-add="${n}" data-tk="${n}">${ico(n, 27)}</span>`).join('')}</div>`).join('') : '';
    return `<div class="hd"><div class="coin" style="border-color:${u.side === 'en' ? '#b4382e' : '#3d6fc4'};background-image:url(${SPRITES[u.fig].src})"></div><div style="flex:1"><div class="n">${u.name}</div><div class="s">${u.own ? 'Your character' : u.side === 'en' ? 'Enemy' : 'Ally'} &middot; ${ROWNAME[u.row]}${ro ? ' &middot; preview, click to pin' : ''}</div>
      <div style="display:flex;align-items:flex-end;gap:10px"><div class="hpn">${hid ? '?' : u.hp + '<small> / ' + u.max + '</small>'}</div><div class="hbar"><i style="width:${fr * 100}%;background:${col}"></i></div></div></div></div>
      ${u.own ? `<div class="vit"><span>STAMINA <u>7/9</u></span><span>STRESS <u>2/8</u></span><span>WARD <u>0</u></span><span>EXH <u>1</u></span><span>MOVE <u>3</u></span></div>` : ''}
      ${can ? `<div class="act"><span class="f ${st.buf || st.numFocus ? 'on' : ''}" data-do="numbox">${st.buf || '&nbsp;'}</span><span class="b or" data-do="hit">Hit</span><span class="b" data-do="heal">Heal</span></div><div class="pvl">${pvl || (st.buf ? '' : (GM ? 'type a number, Enter' : 'click the box, type, Enter'))}</div>` : ''}
      <div class="lbl">${u.own ? 'Tokens on you' : 'Tokens'}</div><div class="tk">${toks}</div>
      ${canTok && (!GM || fieldOn()) && !st.palOpen ? `<div class="row" style="padding-top:2px"><span class="b" data-do="pal">+ Add a token</span></div>` : ''}${canTok && ((GM && !fieldOn()) || st.palOpen) ? `<div class="lbl">Add a token <span style="letter-spacing:.04em;text-transform:none;font-weight:400;color:#6f6450">&mdash; hover to read, click to add</span></div><div class="pal">${pal}</div>` : ''}
      ${!ro ? `<div class="row"><span class="b" data-do="done">${u.done ? '&#10003; Done' : 'Done'}</span>${GM ? '<span class="b" data-do="rm">Remove</span>' : ''}</div>` : '<div style="height:10px"></div>'}`; }
  function editorHTML(t) { const sp = SPRITES; return `<div class="hd"><div class="n">${st.tab === 'mon' ? 'Monster' : 'Character'} &mdash; saves as you type</div></div>
      <div class="ed"><label>Name</label><input data-f="name" value="${t.name.replace(/"/g, '&quot;')}" maxlength="28"></div>
      <div class="ed"><label>Picture</label><div class="pics">${FIGS.map(f => `<span class="pic ${t.fig === f ? 'on' : ''}" data-pic="${f}" style="background-image:url(${sp[f].src})"></span>`).join('')}</div></div>
      <div class="ed"><label>Side</label><span class="b ${t.side === 'en' ? 'or' : ''}" data-side="en">Enemy</span><span class="b ${t.side === 'al' ? 'or' : ''}" data-side="al">Ally</span><span style="width:14px"></span><label style="width:auto">Size</label><span class="b ${!t.big ? 'or' : ''}" data-size="0">Unit</span><span class="b ${t.big ? 'or' : ''}" data-size="1">Large</span></div>
      <div class="ed"><label>Health</label><input data-f="hp" type="number" min="1" max="999" value="${t.hp}" style="width:70px;flex:none"></div>
      <div class="lbl">Starts with</div><div class="tk">${t.cond.map(c => `<div class="ti"><span class="tr" data-tk="${c.n}">${ico(c.n, 24)}<b class="tn">${c.n}</b><span class="stp"><u data-edec="${c.n}">&minus;</u><b>${c.c}</b><u data-einc="${c.n}">+</u></span></span><span class="rl">${tokRule(c.n)}</span></div>`).join('') || '<span class="rl" style="grid-column:1/3">Nothing yet. Pick below.</span>'}</div>
      <div class="pal">${palHTML('data-eadd')}</div>
      <div class="row"><span class="b or" data-do="edone">Done</span><span class="b" data-do="edel">Delete from tray</span></div>`; }
  function setupHTML() { const terr = (TCON && TCON.TERRAIN_ORDER) || []; const step = (lab, key, val) => '<div class="ed"><label style="width:96px">' + lab + '</label><span class="b" data-set="' + key + '-">&minus;</span><b class="sv">' + val + '</b><span class="b" data-set="' + key + '+">+</span></div>';
    const tog = (lab, key, opts, cur) => '<div class="ed" style="flex-wrap:wrap"><label style="width:96px">' + lab + '</label>' + opts.map(([v, nm]) => '<span class="b ' + (cur === v ? 'or' : '') + '" data-set="' + key + ':' + v + '">' + nm + '</span>').join('') + '</div>';
    return '<div class="hd"><div class="n">The board</div><div class="s" style="margin-left:auto;align-self:center">saved with the table</div></div>' + step('Lines per side', 'per', PER) + step('Width (slots)', 'slots', SLOTS)
      + '<div class="ed" style="flex-wrap:wrap"><label style="width:96px">Terrain</label>' + terr.map(id => '<span class="b ' + ((OPT.terrain || 'meadow') === id ? 'or' : '') + '" data-set="ter:' + id + '">' + TCON.TERRAINS[id].name + '</span>').join('') + '</div>'
      + tog('Auto ticks', 'tick', [[true, 'On'], [false, 'Off']], OPT.autoTicks !== false) + tog('Players see enemy health', 'ehp', [['numbers', 'Numbers'], ['bar', 'A bar'], ['hidden', 'Nothing']], OPT.enemyHp || 'numbers')
      + '<div class="ed"><label style="width:96px">Cloth</label><span class="b ' + (st.cover ? 'or' : '') + '" data-set="cover">' + (st.cover ? 'Covered: ring the bell to begin' : 'Cover the board') + '</span></div><div class="row"><span class="b or" data-do="setupdone">Done</span></div>'; }
  function rebuild(patch) { const per = PER; window.__sp4keep = { per, round: st.round, phase: st.phase, mana: st.mana, tab: st.tab, LIB, units: units.filter(u => u.vis).map(u => ({ fig: u.fig, name: u.name, hp: u.hp, max: u.max, cond: u.cond, side: u.side, row: u.row, big: u.big, done: u.done, own: u.own, pc: u.pc, dex: u.dex })) }; window.__sp4opts = Object.assign({}, OPT, patch); const src = window.__sp4src; window.__sp4.stop(); (0, eval)(src); }
  function setSet(v) { const m = v.match(/^([a-z]+)([-+:])(.*)$/); if (v === 'cover') { st.cover = !st.cover; OPT.cover = st.cover; cloth.visible = st.cover; cloth.position.y = .5; cloth.material.opacity = GM ? .5 : .97; toast(st.cover ? 'Covered. Ring the bell to begin.' : 'Uncovered'); paintCard(); return; } if (!m) return; const [, k, op, rest] = m;
    if (k === 'per') return rebuild({ per: Math.max(1, Math.min(4, PER + (op === '+' ? 1 : -1))), setup: true }); if (k === 'slots') return rebuild({ slots: Math.max(3, Math.min(7, SLOTS + (op === '+' ? 1 : -1))), setup: true }); if (k === 'ter') return rebuild({ terrain: rest, setup: true });
    if (k === 'tick') { OPT.autoTicks = rest === 'true'; toast('Auto ticks ' + (OPT.autoTicks ? 'on' : 'off')); } if (k === 'ehp') { OPT.enemyHp = rest; pieces.forEach(paintPlate); toast('Players see enemy health as: ' + rest); } paintCard(); }
  const studs = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const e = el('stud', ''); e.title = 'Board setup'; e.dataset.setup = '1'; if (!GM) e.style.display = 'none'; studs.push({ e, x: sx * (BW / 2 + .55), z: sz * (depth / 2 + .25) }); }
  const addL = [['en', -1], ['al', 1]].map(([sd, sg]) => { const e = el('addl', '+'); e.dataset.addline = sd; e.title = 'Add a line'; if (!GM || PER >= 4) e.style.display = 'none'; return { e, sg, sd }; });
  function paintCard() { if (st.setup && GM) { cardEl.className = 'card'; cardEl.style.display = ''; cardEl.innerHTML = setupHTML(); return; } if (st.edit && GM) { cardEl.style.display = ''; cardEl.className = 'card'; if (!(cardEl.querySelector('input:focus') || (R.activeElement && cardEl.contains(R.activeElement)))) cardEl.innerHTML = editorHTML(st.edit); return; } const u = tgtU(); if (!u || !u.vis) { cardEl.style.display = 'none'; return; } const ro = !!st.prev && st.prev !== st.sel; cardEl.style.display = ''; cardEl.className = 'card' + (ro ? ' pvw' : ''); cardEl.innerHTML = cardHTML(u, ro); }

  /* ---------- feedback ---------- */
  const toTable = (x, y, zz) => [AX + S * x, AY + S * zz, S * y];
  const scr = (x, y, zz) => { const t = toTable(x, y, zz); return D.toScreen(t[0], t[1], t[2]); };
  function scrOf(p) { const b = p.g.position; const foot = scr(b.x, b.y, b.z), head = scr(b.x, b.y + p.hh + .2, b.z), l = scr(b.x - p.Rr, b.y, b.z), r = scr(b.x + p.Rr, b.y, b.z); if (!foot || !head) return null; return { x: foot.x, y: foot.y, top: head.y, bw: r.x - l.x }; }
  function pop(p, text, color) { if (fieldOn()) return; const o = scrOf(p); if (!o) return; const e = el('pop', text); e.style.color = color; e.style.left = (o.x + o.bw * .1) + 'px'; e.style.top = (o.top + 10) + 'px'; e.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-75%) scale(1.35)', opacity: 1, offset: .16 }, { transform: 'translate(-50%,-210%) scale(1)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => e.remove(); }
  let shake = 0;
  function doHit(u, amt, heal, ignore) { const p = byId(u.id); push();
    if (heal) { u.hp = Math.min(u.max, u.hp + amt); pop(p, '+' + amt, '#8ce07a'); tween(280, t => { p.lift2 = Math.sin(t * Math.PI) * .3; }); toast(`${u.name} heals ${amt}`); }
    else { const r = pv(u, amt, false); const eff = ignore ? amt : r.eff; if (!ignore) (r.spend || []).forEach(s => addTok(u, s.token, -1)); u.hp = Math.max(0, u.hp - eff);
      pop(p, '−' + eff, '#ff6a55'); tween(120, t => { p.flash = (1 - t); }); const jd = u.side === 'en' ? 1 : -1; tween(190, t => { p.jx = Math.sin(t * Math.PI) * .26 * jd; }); if (eff >= u.max * .25) tween(200, t => { shake = (1 - t) * 3.5; });
      toast(`${u.name} takes ${eff}${r.why.length && !ignore ? ' — ' + r.why.join(', ') + ' (from ' + amt + ')' : ''}`); if (u.hp === 0) { tween(420, t => { p.tipped = ease.back(t); }); toast(`${u.name} is down`); } }
    paintPlate(p); paintCard(); }
  let ticking = false; const OFFTICKS = () => OPT.autoTicks === false;
  function beginFight() { push(); st.cover = false; OPT.cover = false; const m = cloth.material; tween(1000, t => { cloth.position.y = .5 + t * 3.2; m.opacity = (GM ? .5 : .97) * (1 - t); }, 'io', () => { cloth.visible = false; });
    let given = 0; units.forEach(u => { if (u.vis && u.pc && u.dex != null) { const d = R_.startingDodge({ attrs: { dexterity: u.dex } }); if (d) { addTok(u, 'Dodge', d); given += d; paintPlate(byId(u.id)); } } }); st.round = 1; st.phase = 0; paintCard(); toast('The cloth lifts. Round 1. ' + (given ? given + ' Dodge handed out by Dexterity.' : '')); }
  function bellClick(force) { if (!GM || ticking) return; if (st.cover) { tween(320, t => { bell.position.y = Math.sin(t * Math.PI) * .22; }); beginFight(); return; } push(); tween(320, t => { bell.position.y = Math.sin(t * Math.PI) * .22; });
    if (st.phase < 2 && !force) { st.phase++; toast(['Players act', 'Allies act', 'Enemies act'][st.phase]); return; }
    st.phase = 0; st.round++; ticking = true; const seq = []; units.forEach(u => { if (!u.vis || OFFTICKS()) return; const out = R_.tickTokens(u); if (out.changes.length) seq.push({ u, out }); });
    let delay = 120; seq.forEach(({ u, out }) => { setTimeout(() => { const p = byId(u.id); out.changes.forEach(c => { if (c.op === 'hp') { u.hp = Math.max(0, u.hp + c.delta); pop(p, String(c.delta), '#ff9a55'); tween(160, t => { p.flash = (1 - t) * .8; }); } else if (c.op === 'token') addTok(u, c.token, c.delta); }); paintPlate(p); if (tgtU() === u) paintCard(); }, delay); delay += 170; });
    setTimeout(() => { units.forEach(u => { u.done = false; paintPlate(byId(u.id)); }); ticking = false; toast(`Round ${st.round}` + (seq.length ? ` — ${seq.length} piece${seq.length > 1 ? 's' : ''} ticked` : '')); paintCard(); }, delay + 80); }
  function paintPlate(p) { const u = p.u; const fr = u.hp / u.max, col = fr > .6 ? '#5fb83e' : fr > .3 ? '#d9a232' : '#c8452c'; p.fl.style.cssText = `width:${fr * 100}%;background:${col}`; p.gh.style.width = (fr * 100) + '%'; p.cb.textContent = u.hp; { const he = !GM && u.side === 'en'; const mode = OPT.enemyHp || 'numbers'; p.cb.style.display = he && mode !== 'numbers' ? 'none' : ''; p.cap.style.display = he && mode === 'hidden' ? 'none' : ''; }
    const dig = (u.name.match(/(\d+)$/) || [])[1]; p.num.style.display = dig ? '' : 'none'; p.num.textContent = dig || ''; p.dn.style.display = u.done ? '' : 'none'; p.nm.textContent = u.name;
    p.ch.innerHTML = u.cond.slice(0, 3).map(t => chipHTML(t.n, t.c)).join('') + (u.cond.length > 3 ? `<i class="more">+${u.cond.length - 3}</i>` : ''); }

  /* ---------- input ---------- */
  const typing = () => { const a = R.activeElement || document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };
  const target = () => units.find(u => u.id === st.sel) || units.find(u => u.id === st.hover);
  const canEdit = u => u && (GM || u.own);
  const keydown = e => { if (typing()) { if (e.key === 'Escape' || e.key === 'Enter') { const ai = R.activeElement || document.activeElement; if (ai && ai.blur) ai.blur(); if (e.key === 'Escape' && st.edit) { st.edit = null; paintCard(); } } return; } if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { undo(); e.preventDefault(); return; } if (e.ctrlKey || e.metaKey || e.altKey) return;
    const u = target();
    if (/^[0-9]$/.test(e.key) && canEdit(u) && (GM || st.numFocus)) { st.buf = (st.buf + e.key).slice(0, 3); st.prev = null; paintCard(); e.preventDefault(); return; }
    if (e.key === '+' && canEdit(u)) { st.mode = 'heal'; paintCard(); return; } if (e.key === '-' && canEdit(u)) { st.mode = 'hit'; paintCard(); return; }
    if (e.key === 'Backspace' && st.buf) { st.buf = st.buf.slice(0, -1); paintCard(); return; }
    if (e.key === 'Enter' && st.buf && canEdit(u)) { const n = parseInt(st.buf, 10), mode = st.mode; st.buf = ''; st.numFocus = false; st.mode = 'hit'; doHit(u, n, mode === 'heal', e.shiftKey); e.preventDefault(); return; }
    if (e.key === 'Escape') { if (st.buf) { st.buf = ''; st.mode = 'hit'; paintCard(); } else if (st.sel || st.edit || st.setup) { st.sel = null; st.edit = null; st.setup = false; OPT.setup = false; refreshSel(); } else return; e.stopPropagation(); e.preventDefault(); return; }
    if (e.key === ' ' && GM) { bellClick(e.shiftKey); e.preventDefault(); return; }
    if ((e.key === 'd' || e.key === 'D') && canEdit(u)) { push(); u.done = !u.done; paintPlate(byId(u.id)); paintCard(); return; }
    if ((e.key === 'n' || e.key === 'N')) { st.names = !st.names; toast(st.names ? 'Names on' : 'Names on hover'); return; }
    if (e.key === 'Delete' && u && GM) removeU(u); };
  function removeU(u) { push(); const p = byId(u.id); tween(260, t => { p.vis01 = 1 - t; }, 'out', () => { u.vis = 0; p.g.visible = false; show(p, false); relayout(); }); if (st.sel === u.id) { st.sel = null; refreshSel(); } toast(u.name + ' removed'); }
  let cardPos = { x: 700, y: 120 };
  function refreshSel() { pieces.forEach(p => { p.sel.visible = st.sel === p.u.id; }); if (st.sel) st.edit = null; paintCard(); const u = tgtU(); if (u && st.sel) { const o = scrOf(byId(u.id)); if (o) cardEl.animate([{ transform: `translate(${(o.x - cardPos.x) * .5}px,${(o.y - cardPos.y) * .5}px) scale(.8)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.9,.3,1.12)' }); } }
  R.addEventListener('click', e => { const t = e.target.closest('.fclick,[data-set],[data-setup],[data-addline],[data-do],[data-add],[data-inc],[data-dec],[data-mini],[data-tab],[data-pic],[data-side],[data-size],[data-eadd],[data-einc],[data-edec],.click'); if (!t) return;
    if (t.dataset.set) { setSet(t.dataset.set); return; }
    if (t.dataset.setup) { st.setup = !st.setup; OPT.setup = st.setup; if (st.setup) { st.sel = null; st.edit = null; pieces.forEach(p => { p.sel.visible = false; }); } paintCard(); return; }
    if (t.dataset.addline) { if (PER < 4) rebuild({ per: PER + 1 }); return; }
    if (t.dataset.do === 'setupdone') { st.setup = false; OPT.setup = false; paintCard(); return; }
    if (t.dataset.tab) { st.tab = t.dataset.tab; buildTray(); return; }
    if (t.dataset.mini != null) { if (GM) { const m = minis[+t.dataset.mini]; if (m.plus) { if (st.tab === 'fig') saveFight(); else newMonster(); } else if (st.tab === 'fig') deployFight(m.t); else deploy(m.t); } return; }
    if (st.edit && GM) { const E = st.edit; const g = t.dataset; if (g.pic) E.fig = g.pic; else if (g.side) E.side = g.side; else if (g.size != null) E.big = g.size === '1' ? 1 : 0; else if (g.eadd) { const c = E.cond.find(x => x.n === g.eadd); if (c) c.c++; else E.cond.push({ n: g.eadd, c: 1 }); } else if (g.einc || g.edec) { const n = g.einc || g.edec; const c = E.cond.find(x => x.n === n); if (c) { c.c += g.einc ? 1 : -1; if (c.c <= 0) E.cond.splice(E.cond.indexOf(c), 1); } } else if (g.do === 'edone') { st.edit = null; } else if (g.do === 'edel') { const L2 = LIB[st.tab]; L2.splice(L2.indexOf(E), 1); st.edit = null; } buildTray(); paintCard(); return; }
    if (t.dataset.do === 'fieldout') { leaveField(); return; }
    if (t.classList.contains('click') || t.classList.contains('fclick')) { if (t.dataset.k === 'bell') bellClick(e.shiftKey || e.detail === 2); else if (t.dataset.k === 'stone' && GM) { push(); st.mana++; toast('Mana ' + st.mana); } return; }
    const u = units.find(x => x.id === st.sel); if (!u) return;
    if (t.dataset.inc || t.dataset.dec) { push(); addTok(u, t.dataset.inc || t.dataset.dec, t.dataset.inc ? 1 : -1); paintPlate(byId(u.id)); paintCard(); return; }
    if (t.dataset.add) { push(); addTok(u, t.dataset.add, 1); const p = byId(u.id); paintPlate(p); const chip = p.ch.querySelector(`[data-tk="${t.dataset.add}"]`); if (chip) chip.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.4)', offset: .6 }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' }); paintCard(); return; }
    const d = t.dataset.do; if (d === 'numbox') { st.numFocus = true; paintCard(); return; } if (d === 'hit' || d === 'heal') { const n = parseInt(st.buf, 10); if (!isNaN(n)) { st.buf = ''; st.mode = 'hit'; doHit(u, n, d === 'heal', false); } else { st.mode = d; paintCard(); } } else if (d === 'done') { push(); u.done = !u.done; paintPlate(byId(u.id)); paintCard(); } else if (d === 'rm') removeU(u); else if (d === 'pal') { st.palOpen = true; paintCard(); } });
  R.addEventListener('keydown', e => { const t = e.target; if (t && t.tagName === 'INPUT') e.stopPropagation(); });
  R.addEventListener('input', e => { const f = e.target && e.target.dataset && e.target.dataset.f; if (!f || !st.edit) return; if (f === 'name') st.edit.name = e.target.value || 'Unnamed'; if (f === 'hp') st.edit.hp = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)); buildTray(); });
  R.addEventListener('contextmenu', e => { const mh = e.target.closest('[data-mini]'); if (mh && GM) { e.preventDefault(); const m = minis[+mh.dataset.mini]; if (m && !m.plus && st.tab !== 'fig') { st.edit = m.t; st.sel = null; pieces.forEach(p => { p.sel.visible = false; }); cardEl.innerHTML = editorHTML(st.edit); cardEl.style.display = ''; } return; } const c = e.target.closest('[data-tk]'); if (c) { e.preventDefault(); const p = pieces.find(q => q.ch.contains(c)); if (p && (GM || p.u.own)) { push(); addTok(p.u, c.dataset.tk, -1); paintPlate(p); paintCard(); } return; } const b = e.target.closest('.click'); if (b && b.dataset.k === 'stone' && GM) { e.preventDefault(); push(); st.mana = Math.max(0, st.mana - 1); toast('Mana ' + st.mana); } });
  R.addEventListener('mousemove', e => { const c = e.target.closest('[data-tk]'); if (!c) { tip.style.display = 'none'; return; } const n = c.dataset.tk; tip.innerHTML = `<b>${n}</b>${tokRule(n)}`; tip.style.display = ''; { const vpEl2 = document.getElementById('vp'); const lim = (vpEl2 ? vpEl2.getBoundingClientRect().right : W) - 8; const w2 = tip.offsetWidth || 240; tip.style.left = Math.max(8, Math.min(lim - w2, e.clientX + 14)) + 'px'; } tip.style.top = (e.clientY + 14) + 'px'; });
  const docMove = e => { if (!e.composedPath().includes(ov)) tip.style.display = 'none'; }; document.addEventListener('mousemove', docMove);
  function hoverFx() { pieces.forEach(p => { const want = st.hover === p.u.id ? .24 : 0; if (p.hvT !== want) { p.hvT = want; const from = p.hv; tween(140, t => { p.hv = from + (want - from) * t; }); } }); }
  const rowAt = (bx, bz) => { const c = HZ ? bx : bz; for (let i = 0; i < ROWS.length; i++) if (Math.abs(c - rowZ[i]) <= ROWS[i][1] / 2) return i; return -1; };
  const pmove = e => { if (!drag) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0; if (!drag.on && Math.hypot(dx, dy) > 7 && GM) { drag.on = true; push(); tween(160, t => { drag.p.lift2 = t * .8; }); } if (!drag.on) return;
    const q = D.screenToTable(e.clientX, e.clientY); if (!q) return; drag.p.dx = (q.x - AX) / S; drag.p.dz = (q.y - AY) / S; const r = rowAt(drag.p.dx, drag.p.dz); strips.forEach((s, i) => { s.material.emissive.setHex(r === i && true ? 0x2a2a0e : 0); }); drag.row = r; };
  const pup = () => { if (!drag) return; const p = drag.p; if (!drag.on) { st.sel = p.u.id; st.prev = null; st.buf = ''; st.mode = 'hit'; refreshSel(); } else { const r = drag.row; strips.forEach(s => s.material.emissive.setHex(0)); p.dx = null; p.dz = null; tween(160, t => { p.lift2 = .8 * (1 - t); }); if (r >= 0 && r !== p.u.row) { p.u.row = r; p.u.side = ROWS[r][0]; relayout(false); toast(`${p.u.name} moves to the ${ROWS[r][0] === 'en' ? 'enemy' : 'allied'} ${ROWNAME[r].toLowerCase()}`); } else relayout(false); } drag = null; };
  const onMove = e => pmove(e), onUp = () => pup();
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('keydown', keydown, true);
  const bellHit = el('click', ''); bellHit.dataset.k = 'bell'; const stoneHit = el('click', ''); stoneHit.dataset.k = 'stone';
  const keysHint = el('tag', 'type a number to hit  ·  Space: next group  ·  double-click the bell: end the round  ·  D: done  ·  Ctrl+Z: undo'); keysHint.style.cssText += ';font-size:10px;letter-spacing:.05em;text-transform:none;font-style:italic;color:#d8c898;font-weight:400;position:fixed'; if (!GM) keysHint.style.display = 'none';
  const bellHint = el('tag', 'double-click: end the round'); bellHint.style.cssText += ';font-size:9px;letter-spacing:.06em;color:#cdbb8e;font-style:italic;text-transform:none'; if (!GM) bellHint.style.display = 'none';
  const tags = { round: el('big', '02'), bell: el('tag', ''), mana: el('big', '14'), manaT: el('tag', 'Mana'), tray: null }; tags.bell.style.color = '#f1d27a'; tags.manaT.style.color = '#a9c4f2'; const tabEls = [['mon', 'Monsters'], ['peo', 'People'], ['fig', 'Fights']].map(([k, nmk]) => { const e = el('tab', nmk); e.dataset.tab = k; if (!GM) e.style.display = 'none'; return e; });

  /* ---------- per-frame ---------- */
  const Mfl = new THREE.Matrix4(), Mtb = new THREE.Matrix4(), Mst = new THREE.Matrix4();
  let raf = 0, alive = true; const fpsWin = [];
  function frame() { if (!alive) return; raf = requestAnimationFrame(frame); const now = performance.now();
    for (let i = tws.length - 1; i >= 0; i--) { const w = tws[i]; const k = Math.min(1, (now - w.t0) / w.ms); w.fn(w.e(k)); if (k >= 1) { tws.splice(i, 1); if (w.done) w.done(); } }
    const F = fieldOn(); if (F !== lastF) { lastF = F; paintCard(); } ov.classList.toggle('infield', F); cv.style.visibility = F ? 'hidden' : '';
    if (F) { syncS(); const OS2 = oldS(); if (OS2 && OS2.sel !== lastSSel) { lastSSel = OS2.sel; const u = units.find(x => 'sp' + x.id === OS2.sel); st.sel = u ? u.id : null; st.prev = null; refreshSel(); }
      const vpEl3 = document.getElementById('vp'); const lim3 = vpEl3 ? vpEl3.getBoundingClientRect().right : W; cardPos = { x: Math.max(8, lim3 - 392 - 16), y: 74 }; cardEl.style.left = cardPos.x + 'px'; cardEl.style.top = cardPos.y + 'px';
      const hb = fhud.querySelectorAll('b'); hb[0].textContent = st.mana; hb[1].textContent = String(st.round).padStart(2, '0'); fhud.querySelector('.fbell span').textContent = GM ? (st.phase === 2 ? 'End round' : 'Next: ' + ['Allies', 'Enemies'][st.phase]) : ['Players act', 'Allies act', 'Enemies act'][st.phase]; if (!GM) fhud.querySelectorAll('.fstone,.fbell').forEach(x => { x.style.pointerEvents = 'none'; });
      renderer.clear(); fpsWin.push(now); while (fpsWin.length && now - fpsWin[0] > 1000) fpsWin.shift(); return; }
    const c = D.camera(); if (!c) return; const P = c.persp; const sh = shake * (Math.random() - .5);
    cam.fov = 2 * Math.atan(H / (2 * P)) * 180 / Math.PI; cam.aspect = W / H; cam.near = Math.max(4, P * .05); cam.far = P + 30000; cam.position.set(0, 0, P); cam.setViewOffset(W, H, W / 2 - (c.left + c.cx) + sh, H / 2 - (c.top + c.cy) + sh, W, H); cam.updateProjectionMatrix();
    Mfl.set(1, 0, 0, -c.cx, 0, -1, 0, c.cy, 0, 0, 1, 0, 0, 0, 0, 1); Mtb.fromArray(c.m); Mst.set(S, 0, 0, AX, 0, 0, S, AY, 0, S, 0, 0, 0, 0, 0, 1); root.matrix.copy(Mfl).multiply(Mtb).multiply(Mst); root.matrixWorldNeedsUpdate = true;
    const lean = Math.min(.95, (D.tiltDeg * Math.PI / 180) * .9);
    pieces.forEach(p => { const u = p.u; const hc = st.cover && !GM; if (p._hc !== hc) { p._hc = hc; if (u.vis) { p.g.visible = !hc; show(p, !hc); } } if (!u.vis || hc) return; const sl = p.x == null ? 0 : p.x, lc = rowZ[u.row] + .05; const x = p.dx != null ? p.dx : (HZ ? lc : sl), zz = p.dz != null ? p.dz : (HZ ? sl : lc); p.pl.scale.x = Math.abs(p.pl.scale.x) * (HZ && u.side === (OPT.flipSide || 'al') ? -1 : 1);
      p.g.position.set(x + (u.jx || 0), .24 + p.hv + p.lift2 + (p.drop || 0), zz); p.g.scale.setScalar(p.pop || 1); p.act.visible = !st.cover && !u.done && u.hp > 0 && (u.side === 'en' ? 2 : (u.pc ? 0 : 1)) === st.phase; if (p.act.visible) { const sc2 = 1 + .06 * Math.sin(now / 300); p.act.scale.set(sc2, sc2, sc2); } p.ring.material.color.set(L(u.side === 'en' ? '#d04a38' : '#4a82da')); p.pl.rotation.x = -lean; p.pl.rotation.z = u.hp === 0 ? 1.45 * (u.tipped || 0) : 0; { const br = u.hp > 0 && !(st.cover && !GM) ? 1 + .016 * Math.sin(now / 640 + p.ph) : 1; p.pl.scale.y = p.hh * br; p.pl.position.y = .15 + p.pl.scale.y / 2 + (st.sel === u.id ? .07 * (1 + Math.sin(now / 260)) / 2 : 0); }
      const dim = u.done ? .55 : 1, f = 1 + p.flash * 1.6; p.mat.color.setRGB(dim * f, dim * f, dim * f); p.mat.opacity = p.vis01 * (u.hp === 0 ? .6 : 1); });
    minis.forEach((m, i) => { m.pl.rotation.x = -lean; m.g.position.y = .32 + (m.hv || 0); });
    const grpU = units.filter(u => u.vis && (u.side === 'en' ? 2 : (u.pc ? 0 : 1)) === st.phase); const glow = !st.cover && grpU.length > 0 && grpU.every(u => u.done); bellMat.emissiveIntensity = glow ? 1.4 + .8 * Math.sin(now / 240) : .7; bellMat.emissive.set(L(glow ? '#b0820f' : '#4a3208')); halo.material.opacity = glow ? .55 + .35 * Math.sin(now / 240) : 0; halo.scale.setScalar(glow ? 1 + .05 * Math.sin(now / 240) : 1);
    stoneMat.emissiveIntensity = .75 + .25 * Math.sin(now / 520); lamps.forEach((m, i) => m.color.set(L(i === st.phase ? '#ffd24a' : '#5a4a2a')));
    renderer.render(scene, cam);
    const midBW = (scr(1, 0, 0) || { x: 0 }).x - (scr(0, 0, 0) || { x: 0 }).x;
    const tgt = target(); let wearDone = false;
    pieces.forEach(p => { const u = p.u; if (!u.vis || (st.cover && !GM)) return; const o = scrOf(p); if (!o) return; const bw = o.bw; const sz = Math.max(.7, Math.min(1.35, bw / 66));
      p.e.style.width = Math.max(40, Math.min(70, bw * 1.0)) * (u.big ? 1.15 : 1) + 'px'; p.e.style.left = o.x + 'px'; p.e.style.top = (o.y + bw * .06) + 'px'; p.e.style.opacity = p.vis01 * ((u.hp >= u.max && u.cond.length === 0) ? .72 : 1);
      p.ch.style.left = (o.x + bw * .62) + 'px'; p.ch.style.top = ((o.y + o.top) / 2 - 28) + 'px'; p.ch.style.transform = `scale(${Math.max(.75, Math.min(1.25, bw / 62))})`;
      const showName = (st.names || st.hover === u.id || st.sel === u.id) && !(st.buf !== '' && tgt && tgt.id === u.id); p.nm.style.display = showName ? '' : 'none'; p.nm.style.left = o.x + 'px'; p.nm.style.top = (o.top - 2) + 'px'; p.nm.style.fontSize = (12 * sz) + 'px';
      p.hit.style.left = (o.x - bw * .48) + 'px'; p.hit.style.top = (o.top + (o.y - o.top) * .12) + 'px'; p.hit.style.width = (bw * .96) + 'px'; p.hit.style.height = ((o.y - o.top) * .88 + bw * .3) + 'px'; p.hit.style.borderRadius = '40%'; p.hit.style.zIndex = Math.round(o.y);
      if (tgt && tgt.id === u.id) { const typed = st.buf !== ''; if (typed) { const amt = parseInt(st.buf, 10); const r = pv(u, amt, st.mode === 'heal'); wear.style.display = ''; wear.style.left = o.x + 'px'; wear.style.top = (o.top - 12) + 'px'; wear.innerHTML = `<b style="color:${st.mode === 'heal' ? '#8ce07a' : '#ff7a62'}">${st.mode === 'heal' ? '+' : '−'}${amt}</b>${st.mode !== 'heal' && r.why.length ? `<em>${r.why.join(', ')} → ${r.eff}</em>` : ''}`; wearDone = true; }
      } });
    if (!wearDone) wear.style.display = 'none'; if (!(GM && st.sel && units.find(u => u.id === st.sel && u.vis))) qrow.style.display = 'none';
    studs.forEach(sd => { const q = scr(sd.x, .2, sd.z); if (q) { sd.e.style.left = q.x + 'px'; sd.e.style.top = q.y + 'px'; } });
    addL.forEach(a => { const q = HZ ? scr(a.sg * -(BW / 2 + 1.3), .3, 0) : scr(0, .3, a.sg * (depth / 2 + 1.3)); if (q) { a.e.style.left = q.x + 'px'; a.e.style.top = q.y + 'px'; } });
    const bp = scr(0, 2.8, nearZ); if (bp) { tags.round.style.left = bp.x + 'px'; tags.round.style.top = bp.y + 'px'; tags.round.style.fontSize = Math.max(14, Math.min(36, midBW * .52)) + 'px'; tags.round.textContent = String(st.round).padStart(2, '0'); }
    const b0 = scr(0, .9, nearZ); if (b0) { bellHit.style.left = (b0.x - midBW * 1.25) + 'px'; bellHit.style.top = (b0.y - midBW * 1.8) + 'px'; bellHit.style.width = (midBW * 2.5) + 'px'; bellHit.style.height = (midBW * 2.7) + 'px'; }
    { const bh = scr(0, 0, nearZ + 2.45); if (bh) { bellHint.style.left = bh.x + 'px'; bellHint.style.top = bh.y + 'px'; bellHint.style.fontSize = Math.max(8, Math.min(10, midBW * .17)) + 'px'; bellHint.style.display = (GM && !st.cover) ? '' : 'none'; } }
    const bt = scr(0, 0, nearZ + 1.8); if (bt) { tags.bell.style.left = bt.x + 'px'; tags.bell.style.top = bt.y + 'px'; tags.bell.style.fontSize = Math.max(10, Math.min(13, midBW * .26)) + 'px'; tags.bell.textContent = GM ? (st.phase === 2 ? 'End round' : 'Next: ' + ['Allies', 'Enemies'][st.phase]) : ['Players act', 'Allies act', 'Enemies act'][st.phase]; }
    const sp = scr(STX, 1.05, nearZ); if (sp) { tags.mana.style.left = sp.x + 'px'; tags.mana.style.top = sp.y + 'px'; tags.mana.style.fontSize = Math.max(14, Math.min(34, midBW * .5)) + 'px'; tags.mana.textContent = st.mana; stoneHit.style.left = (sp.x - midBW * .95) + 'px'; stoneHit.style.top = (sp.y - midBW * .95) + 'px'; stoneHit.style.width = stoneHit.style.height = (midBW * 1.9) + 'px'; }
    const stg = scr(STX, 0, nearZ + 1.55); if (stg) { tags.manaT.style.left = stg.x + 'px'; tags.manaT.style.top = stg.y + 'px'; tags.manaT.style.fontSize = Math.max(10, Math.min(13, midBW * .26)) + 'px'; }
    tabEls.forEach((e, i) => { const tt = scr(TRX + (i - 1) * 1.75, 0, nearZ + 1.55); if (tt) { e.style.left = tt.x + 'px'; e.style.top = tt.y + 'px'; e.style.fontSize = Math.max(10, Math.min(12, midBW * .24)) + 'px'; e.classList.toggle('on', st.tab === e.dataset.tab); } });
    minis.forEach((m, i) => { const q = scr(TRX + m.x, .6, nearZ), q2 = scr(TRX + m.x, 0, nearZ + .72); if (q && q2) { m.hit.style.left = (q.x - midBW * .5) + 'px'; m.hit.style.top = (q.y - midBW * 1.1) + 'px'; m.hit.style.width = midBW + 'px'; m.hit.style.height = (midBW * 1.35) + 'px'; m.lab.style.left = q2.x + 'px'; m.lab.style.top = q2.y + 'px'; m.lab.style.fontSize = Math.max(10, Math.min(12, midBW * .24)) + 'px'; } });
    const vpEl = document.getElementById('vp'); const limit = vpEl ? vpEl.getBoundingClientRect().right : W - 300; const tr = scr(BW / 2 + 1.1, 0, -depth / 2 - .2);
    if (tr) { cardPos = { x: Math.max(120, Math.min(limit - 392 - 12, tr.x + 16)), y: Math.max(12, Math.min(H - 360, tr.y + 6)) }; cardEl.style.left = cardPos.x + 'px'; cardEl.style.top = cardPos.y + 'px'; }
    { const vpK = document.getElementById('vp'); const rK = vpK ? vpK.getBoundingClientRect() : { left: 0, width: W }; keysHint.style.left = (rK.left + rK.width / 2) + 'px'; keysHint.style.top = (H - 16) + 'px'; keysHint.style.display = (GM && !st.cover && !fieldOn()) ? '' : 'none'; }
    fpsWin.push(now); while (fpsWin.length && now - fpsWin[0] > 1000) fpsWin.shift(); }
const fieldOn = () => !!(window.__field && window.__field.on());
  const OLD_KEYS = ['e-back', 'e-supp', 'e-sec', 'e-front', 'a-front', 'a-sec', 'a-supp', 'a-back'];
  const oldIndex = u => u.side === 'en' ? (4 - PER) + u.row : 4 + (u.row - PER);
  let sSig = '', lastSSel = null, lastF = false;
  const oldS = () => (0, eval)('typeof S !== "undefined" ? S : null');
  function syncS() { const OS = oldS(); if (!OS) return; const sig = units.filter(u => u.vis).map(u => u.id + u.row + u.hp + (u.done ? 'x' : '') + JSON.stringify(u.cond)).join('|'); if (sig === sSig) return; sSig = sig;
    OS.lines.forEach(l => { l.ents = []; }); OS.width = SLOTS;
    units.filter(u => u.vis).forEach((u, i) => { const l = OS.lines[oldIndex(u)]; if (!l) return; l.ents.push({ kind: u.big ? 'large' : 'unit', mono: u.name.slice(0, 2).toUpperCase(), name: u.name, hp: u.hp, max: u.max, side: u.side, pc: !!u.pc, cond: u.cond.map(c => ({ n: c.n, c: c.c })), q: true, f: true, look: 'standee', fig: u.fig, id: 'sp' + u.id, pic: '', art: '', col: i % 8, acted: !!u.done }); }); }
  function enterField() { syncS(); const c = window.__field.cam; c.zoom = 1; c.pan = 0; c.look = -1.0; window.__field.set(true); }
  function leaveField() { if (fieldOn()) window.__field.set(false); }
  const fhud = el('fhud', '<div class="fstone fclick" data-k="stone"><b>14</b><span>Mana</span></div><div class="fbell fclick" data-k="bell"><b>02</b><span>Next: Allies</span></div><div class="fout b" data-do="fieldout">Back to the table</div>');
  function fitS() { const vpEl = document.getElementById('vp'); const vr = vpEl ? vpEl.getBoundingClientRect() : { left: 0, top: 0, right: W, bottom: H };
    const x0 = vr.left + 84, x1 = Math.min(vr.right, W) - 392 - 30, y0 = vr.top + 16, y1 = vr.bottom - 54; const xr = Math.max(BW / 2 + 1.1, TRX + 2.8);
    for (let it = 0; it < 4; it++) { const pts = [[-(BW / 2 + 1.1), -(depth / 2 + .8)], [xr, -(depth / 2 + .8)], [-(BW / 2 + 1.1), nearZ + 2.7], [xr, nearZ + 2.7]]; let sc = pts.map(p => scr(p[0], 0, p[1])); if (sc.some(q => !q)) return;
      let xs = sc.map(q => q.x), ys = sc.map(q => q.y); const f = Math.min((x1 - x0) / (Math.max(...xs) - Math.min(...xs)), (y1 - y0) / (Math.max(...ys) - Math.min(...ys))); S = Math.max(30, Math.min(260, S * f));
      sc = pts.map(p => scr(p[0], 0, p[1])); xs = sc.map(q => q.x); ys = sc.map(q => q.y); const a = D.screenToTable((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2), b = D.screenToTable((x0 + x1) / 2, (y0 + y1) / 2); if (a && b) { AX += b.x - a.x; AY += b.y - a.y; } } }
  setTimeout(fitS, 250); setTimeout(fitS, 900); window.addEventListener('resize', fitS);
  frame(); refreshSel();
  window.__sp4 = { enterField, leaveField, fieldOn, st, OPT, rebuild, TRX, fitS, stop() { alive = false; window.removeEventListener('resize', fitS); cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', keydown, true); document.removeEventListener('mousemove', docMove); cv.remove(); ov.remove(); if (old) old.style.display = ''; }, fps: () => fpsWin.length, st, units, pieces, minis, AX, AY, S, BW, depth, nearZ, undo, bellClick, scrOf, scr };
  return 'spike4 ok';
})();
