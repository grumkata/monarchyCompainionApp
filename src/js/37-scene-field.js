/* ═══════════════════════════════════════════════════════════════
   THE FIELD  —  what you see once you lock in

   The table view is a table: wood, a playmat, moulded counters seen from
   above. That is the right thing when you are looking at the whole board.
   It is the wrong thing when you are playing your character, and it is what
   made every attempt at an ability UI come out looking like a document.

   So locking in does not just flatten the table any more. It drops you into
   the battlefield: a stylized field built out of the Nature MegaKit, the eight
   lines laid out in front of you receding into the distance, and every unit
   standing on it as a figure you see from the side. Bright, saturated, hard
   sun — the same palette the kit is painted in, because the HUD and the world
   have to look like they were made by the same hand.

   This owns its OWN canvas and renderer, under the piece layer. Two reasons:
   the piece layer's camera is welded to the page's CSS perspective so counters
   land exactly on their DOM boxes, and this camera is a game camera that has
   nothing to do with the page; and keeping them apart means the table view is
   untouched and cannot regress while this is being built.

   The DOM is still the board. Layout, columns, drag and drop, the cap, the
   tests — all unchanged. This reads `S.lines` and draws it.
═══════════════════════════════════════════════════════════════ */
(function(){
if (typeof THREE === 'undefined' || typeof KIT === 'undefined'
    || typeof SPRITES === 'undefined') return;

/* NOTHING IN HERE IS BUILT UNTIL YOU LOCK IN. A second WebGL context, a
   thousand-pixel ground texture and thirty trees are not free, and the table
   view — which is most of the time — never shows any of it. Everything below
   lives inside `boot`, which runs once, the first time the field is asked for.
   (This was not premature: eagerly building it slowed page load enough to
   break two interaction tests, which is the cheap version of the complaint a
   player would eventually have made.) */
let F = null;
function boot(){
if (F) return F;

/* ── the field's measurements ──────────────────────────────────
   One unit is one column. Everything else is expressed against that, so the
   field scales with the battlefield width instead of being pinned to numbers
   that happen to look right at six. */
const COL = 2.6;          // column pitch
const ROW = 3.4;          // line pitch, front to back
const FIG = 2.05;         // a medium figure's height, feet to crown

const sRGB = h => new THREE.Color(h).convertSRGBToLinear();

/* the kit's palette, sampled off the previews */
const C = {
  /* Sunlit, shaded and warm greens rather than one flat lime — the kit's own
     previews never show a single green anywhere, which is most of why they
     look like a place and this looked like a golf simulator. */
  grassSun:'#a6cf4e', grass:'#7fae37', grassShade:'#4f7c26', grassWarm:'#c3cf5a',
  dirt:    '#c2a672', dirtDk:'#9d8250',
  skyTop:  '#3f96cf', skyMid:'#84c9ec', skyLow:'#d9edf3',
  ally:    '#3f7fd0', allyDk:'#27508a', allyLt:'#7fb2ee',
  enemy:   '#c8452c', enemyDk:'#7d2314', enemyLt:'#e8846c',
  gold:    '#f2c14e', goldDk:'#c08c1e',
  sun:     '#fff1cf', skyLight:'#bcdcf5', bounce:'#8aa848',
};

const cv = document.createElement('canvas');
cv.id = 'gl2';
Object.assign(cv.style,{position:'fixed',inset:'0',zIndex:880,pointerEvents:'none',display:'none'});
document.body.appendChild(cv);

const renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding = THREE.sRGBEncoding;
/* The two settings that do most of the work. Without tone mapping the colours
   come out raw and plasticky; without shadows nothing is standing ON anything,
   and a figure that is not standing on the ground reads as a mistake however
   nice the art is. */
/* NOT ACES. A filmic curve is built to tame a photographic high-dynamic-range
   image: it crushes the toe and desaturates the shoulder, which is exactly
   what you want for a rendered interior and exactly wrong for flat stylized
   colour. Everything came out muddy olive with grey highlights — the palette
   was fine, the curve was eating it. Linear keeps the paints the colours they
   were mixed as; the lights below are balanced to stay under one so nothing
   clips instead. */
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
/* THE SHADOW MAP IS NOT REDRAWN EVERY FRAME. Nineteen thousand trees and
   tufts do not move — the wind that bends them lives in the vertex shader and
   is not worth a shadow pass — so the map is rendered when the field is built
   and when the board changes, and read from cache the rest of the time. That
   is the difference between this being cheap and being the most expensive
   thing on screen. */
renderer.shadowMap.autoUpdate = false;
const restamp = () => { renderer.shadowMap.needsUpdate = true; };
const scene = new THREE.Scene();
/* aerial perspective: the far treeline has to haze into the sky or the
   horizon reads as a cardboard cut-out standing behind the field */
/* haze from WELL BEYOND the treeline, so the far edge of the world dissolves
   into the sky instead of ending in a dark wall of pines. Pulled back after it
   started bleaching the trees themselves — the camera stands thirty-six units
   off and the pines are ninety-odd away, so a near plane of forty was putting
   two thirds sky colour over the one thing framing the shot. */
scene.fog = new THREE.Fog(sRGB(C.skyLow), 62, 165);

/* ── sky ───────────────────────────────────────────────────────
   Painted, not photographic: three stops and a couple of soft cloud bands,
   which is exactly what the kit's own skybox is. */
(function(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0,0,0,256);
  g.addColorStop(0, C.skyTop); g.addColorStop(.52, C.skyMid); g.addColorStop(1, C.skyLow);
  x.fillStyle = g; x.fillRect(0,0,512,256);
  /* wispy streaks, thin and near the top, the way the kit's own previews are */
  let sd = 4242; const rnd = () => (sd = (sd*1103515245 + 12345) & 0x7fffffff)/0x7fffffff;
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++){
    const cx = rnd()*512, cy = rnd()*rnd()*150, w = 40 + rnd()*190, h = 3 + rnd()*13;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, w);
    const a = .05 + rnd()*.13;
    rg.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.save(); x.translate(cx, cy); x.rotate((rnd()-.5)*0.5); x.scale(1, h/w);
    x.fillStyle = rg; x.beginPath(); x.arc(0,0,w,0,7); x.fill(); x.restore();
  }
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  scene.background = t;
})();

/* ── light: hard sun, warm bounce, sky fill ── */
/* a strong sky fill, because with no filmic toe lifting them the shadowed
   sides go to near-black otherwise — and a figure whose shadow side is black
   is a silhouette, not a figure */
scene.add(new THREE.HemisphereLight(sRGB(C.skyLight), sRGB(C.bounce), 0.86));
const sun = new THREE.DirectionalLight(sRGB(C.sun), 1.12);
sun.position.set(-32, 27, 22);   // raking, so the shadows have length
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
/* a tight orthographic box around the board — a shadow camera that covers the
   whole world wastes its whole resolution on the empty half of it */
/* The first box was 24 across, which did not reach the treeline — every tree
   on the field was standing in its own light with no shadow under it. */
const SD = 46;
Object.assign(sun.shadow.camera, { left:-SD, right:SD, top:SD, bottom:-SD, near:1, far:130 });
sun.shadow.camera.updateProjectionMatrix();
sun.target.position.set(0, 0, 0); scene.add(sun.target);
sun.shadow.bias = -0.0012;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const rim = new THREE.DirectionalLight(sRGB('#ffd08a'), 0.26);
rim.position.set(20, 10, -26); scene.add(rim);

/* ── going through the cloud ───────────────────────────────────
   The camera does not cut from the board to the field; it climbs, and there is
   weather in between. Six painted puffs rush the screen, close over it, and
   blow past — the swap happens while they are covering, so what you see is
   never a cut, only cloud parting on a battlefield.

   Drawn in the DOM rather than in the scene deliberately: it has to cover BOTH
   renderers, and the moment it matters is the moment neither of them is what
   you are looking at. */
let sweepEl = null, sweepTimer = 0, sweepTok = 0;

/* how long the cloud takes to close over the screen. After this it HOLDS,
   for as long as the work behind it takes. */
const IN_MS = 420, OUT_MS = 760;

function buildSweep(){
  sweepEl = document.createElement('div');
  sweepEl.className = 'fsweep';
  sweepEl.appendChild(document.createElement('b'));      // the haze
  const tex = cloudTexture().image.toDataURL();
  /* each puff gets its own offset and a small lag, so the screen fills
     raggedly rather than closing like a shutter — but every lag is short
     enough that all seven are up before the hold begins */
  const seeds = [[-30,18,1.00,0],[26,-12,1.25,55],[-8,-28,0.90,80],
                 [40,26,1.15,35],[-46,-6,1.05,90],[10,34,1.30,65],[0,-4,1.60,15]];
  seeds.forEach(([x, y, sc, lag]) => {
    const d = document.createElement('i');
    d.style.backgroundImage = 'url(' + tex + ')';
    d.style.setProperty('--x', x + 'px');
    d.style.setProperty('--y', y + 'px');
    d.style.setProperty('--s', sc);
    d.style.animationDelay = lag + 'ms';
    sweepEl.appendChild(d);
  });
  document.body.appendChild(sweepEl);
}

/* Run the cloud, and hand `behind` the screen once it is white.
   `behind(release)` does whatever must not be seen, and calls release() when
   there is something worth uncovering to — for the field, that is its FIRST
   RENDERED FRAME, not merely its construction. Uncovering to a canvas that
   has been sized but never drawn is the same black flash the cloud was
   introduced to hide. */
function sweep(dirIn, behind){
  if (!sweepEl) buildSweep();
  const el = sweepEl, tok = ++sweepTok;
  clearTimeout(sweepTimer);
  /* match the world's box, whatever the layout has made it this session */
  const r = (document.getElementById('vp') || document.body).getBoundingClientRect();
  el.style.left = r.left + 'px';  el.style.top    = r.top + 'px';
  el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
  el.style.display = 'block';
  el.className = 'fsweep' + (dirIn ? '' : ' rev');
  void el.offsetWidth;                               // restart from the top
  el.classList.add('in');

  sweepTimer = setTimeout(() => {
    if (tok !== sweepTok) return;
    el.classList.remove('in');
    el.classList.add('hold');                        // static cover, no clock
    void el.offsetWidth;
    /* TWO frames, not one. One rAF only guarantees the style was computed;
       the second guarantees the frame carrying it was actually presented. Only
       then is it safe to stall the thread. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (tok !== sweepTok) return;
      let spent = false;
      const release = () => {
        if (spent || tok !== sweepTok) return;
        spent = true;
        el.classList.remove('hold');
        el.classList.add('out');
        clearTimeout(sweepTimer);
        sweepTimer = setTimeout(() => {
          if (tok !== sweepTok) return;
          el.className = 'fsweep';
          el.style.display = 'none';
        }, OUT_MS + 120);
      };
      if (behind) behind(release); else release();
    }));
  }, IN_MS);
}

/* ── clouds ────────────────────────────────────────────────────
   Painted puffs on billboards, a long way out and high up, drifting across
   and wrapping round. They are the only thing in the scene that moves without
   being asked to, which is most of why a still field starts to feel like
   weather rather than a diagram. */
function cloudTexture(){
  const S = 256, c = document.createElement('canvas');
  c.width = S; c.height = Math.round(S * 0.55);
  const x = c.getContext('2d');
  let sd = 20260827;
  const rnd = () => (sd = (sd*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const puff = (cx, cy, r, a) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,   'rgba(255,255,255,' + a.toFixed(3) + ')');
    g.addColorStop(.45, 'rgba(252,253,255,' + (a*0.82).toFixed(3) + ')');
    g.addColorStop(.78, 'rgba(226,238,250,' + (a*0.34).toFixed(3) + ')');
    g.addColorStop(1,   'rgba(226,238,250,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  };
  const H = c.height;
  for (let i = 0; i < 26; i++){
    const t = i / 25;
    puff(S*0.12 + t*S*0.76 + (rnd()-.5)*24,
         H*0.62 - Math.sin(t*Math.PI)*H*0.26 + (rnd()-.5)*12,
         14 + Math.sin(t*Math.PI)*30 + rnd()*14, .55 + rnd()*.35);
  }
  const t2 = new THREE.CanvasTexture(c);
  t2.encoding = THREE.sRGBEncoding;
  return t2;
}
const clouds = new THREE.Group(); scene.add(clouds);
const CLOUD_SPAN = 340;
function makeClouds(){
  clouds.clear();
  const tex = cloudTexture();
  const mat = new THREE.MeshBasicMaterial({ map:tex, transparent:true,
    opacity:0.85, depthWrite:false, fog:false });
  const geo = new THREE.PlaneGeometry(1, 0.55);
  let sd = 777;
  const rnd = () => (sd = (sd*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 22; i++){
    const m = new THREE.Mesh(geo, mat);
    const w = 46 + rnd()*110;
    m.scale.set(w, w * (0.7 + rnd()*0.5), 1);
    m.position.set((rnd()-0.5) * CLOUD_SPAN,
                   26 + rnd()*44,
                   -70 - rnd()*180);
    m.renderOrder = -10;
    m.userData.drift = 0.35 + rnd()*0.9;
    clouds.add(m);
  }
}
function driftClouds(dt){
  for (const m of clouds.children){
    m.position.x += m.userData.drift * dt;
    if (m.position.x > CLOUD_SPAN/2) m.position.x -= CLOUD_SPAN;
    m.lookAt(camera.position.x, m.position.y, camera.position.z);
  }
}

/* ── the kit ───────────────────────────────────────────────────
   Baked to plain arrays by bake_kit.py, so there is no loader and no fetch —
   the same trade the dice already make. */
const texCache = {};
function kitTex(uri){
  if (texCache[uri]) return texCache[uri];
  const t = new THREE.TextureLoader().load(KIT_TEX[uri]);
  t.encoding = THREE.sRGBEncoding;
  t.flipY = false;                       // glTF UVs, not canvas UVs
  return (texCache[uri] = t);
}
/* Geometry and material per primitive, built once and shared — the scatter
   draws thousands of these and a cloned Group per shrub would be thousands of
   draw calls for a field of grass. */
const propCache = {};
function propParts(name){
  if (propCache[name]) return propCache[name];
  const wind = WIND[name] || 0;
  const src = KIT[name], parts = [];
  for (const pr of src.prims){
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pr.p, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(pr.n, 3));
    if (pr.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(pr.u, 2));
    /* THE BAKED OCCLUSION. Stored as one grey channel and expanded here. This
       is what puts shadow in the crook of a branch and under the lip of a
       rock — without it every surface is lit identically and the whole kit
       reads as moulded plastic, which is exactly how it read. */
    if (pr.ao){
      const c = new Float32Array(pr.ao.length * 3);
      for (let i = 0; i < pr.ao.length; i++){
        c[i*3] = c[i*3+1] = c[i*3+2] = pr.ao[i];
      }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    if (pr.i) geo.setIndex(pr.i);
    geo.computeBoundingSphere();
    /* Foliage is a flat card and its SHAPE is in the texture's alpha. An
       alpha test rather than blending, so a thousand leaves need no depth
       sort, and double-sided because a leaf card has a back. */
    const mat = new THREE.MeshLambertMaterial({
      map: pr.t ? kitTex(pr.t) : null, vertexColors: !!pr.ao,
      transparent: false, alphaTest: pr.cut ? 0.5 : 0,
      side: pr.cut ? THREE.DoubleSide : THREE.FrontSide });
    if (wind) windy(mat, wind);
    parts.push({ geo, mat, cut: !!pr.cut });
  }
  return (propCache[name] = { parts, r: src.r });
}

/* ── the ground ────────────────────────────────────────────────
   Painted in a canvas rather than tiled from a photo: a green field, a churned
   band of dirt where the two armies meet, and the eight lines marked as faint
   bands so the BOARD is still legible inside the scenery. A player has to be
   able to count lines at a glance — that is the whole game. */

/* THE DETAIL TILE. A 2048px texture stretched over a hundred and twenty world
   units is twenty-three pixels per unit — enough for patches and mud, nowhere
   near enough for anything you could call grass. Everything read as painted
   card because the ground had NO high-frequency detail at all, at any
   distance. This is a small seamless tile of blade strokes and speckle,
   repeated sixty times across and multiplied into the base, so the surface has
   texture at the scale a boot would. It wraps by drawing every stroke a second
   time offset by a full tile whenever it crosses an edge. */
function detailTexture(){
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);          // neutral = unchanged
  let sd = 987651;
  const rnd = () => (sd = (sd*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  x.lineCap = 'round';
  const stroke = (px, py, ang, len, w, col) => {
    for (const ox of [0, -S, S]) for (const oy of [0, -S, S]){
      if ((ox && Math.abs(px) > S*0.12 && Math.abs(px - S) > S*0.12) ||
          (oy && Math.abs(py) > S*0.12 && Math.abs(py - S) > S*0.12)) continue;
      x.strokeStyle = col; x.lineWidth = w;
      x.beginPath(); x.moveTo(px+ox, py+oy);
      x.quadraticCurveTo(px+ox + Math.cos(ang)*len*0.5 + (rnd()-.5)*2,
                         py+oy + Math.sin(ang)*len*0.5,
                         px+ox + Math.cos(ang)*len, py+oy + Math.sin(ang)*len);
      x.stroke();
    }
  };
  /* blades: mostly upright, leaning both ways, light and dark in equal
     measure so the tile averages back to neutral and does not tint the map.
     BIG ENOUGH TO SURVIVE A MIPMAP — the first cut had them five pixels long
     repeated fifty-eight times across the field, which put every blade under
     one screen pixel and left the trilinear filter to average the whole thing
     back to flat grey. Detail you cannot resolve is not detail. */
  for (let i = 0; i < 1700; i++){
    const px = rnd()*S, py = rnd()*S;
    /* ANY DIRECTION. Every stroke leaning within eighty degrees of the same
       way turned the whole field into a brushed diagonal smear — grass looked
       at from above has no grain, it splays. */
    const ang = rnd() * Math.PI * 2;
    const up = rnd() > .5;
    stroke(px, py, ang, 14 + rnd()*30, 1.4 + rnd()*2.4,
           up ? 'rgba(200,212,152,'+(.20+rnd()*.32).toFixed(2)+')'
              : 'rgba(56,72,32,'  +(.18+rnd()*.30).toFixed(2)+')');
  }
  /* speckle: seed heads, grit, small stones */
  for (let i = 0; i < 1100; i++){
    const px = rnd()*S, py = rnd()*S, r = 1.4 + rnd()*3.4;
    x.fillStyle = rnd() > .45 ? 'rgba(226,232,182,'+(.13+rnd()*.24).toFixed(2)+')'
                              : 'rgba(46,58,28,'  +(.11+rnd()*.22).toFixed(2)+')';
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(21, 19);        // ~5.7 world units a tile
  t.anisotropy = 8;
  return t;
}

function groundTexture(bw, bd){
  const S = 2048, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  let seed = 12345;
  const rnd = () => (seed = (seed*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  /* a base that already varies front to back, so even bare ground has a
     direction to it */
  const g = x.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, C.grassWarm); g.addColorStop(.45, C.grassSun);
  g.addColorStop(1, C.grass);
  x.fillStyle = g; x.fillRect(0, 0, S, S);

  /* big soft patches, light and dark, laid down in two passes so the field
     reads as ground rather than as noise */
  const blob = (fill, n, rMin, rMax, aMin, aMax) => {
    for (let i = 0; i < n; i++){
      const cx = rnd()*S, cy = rnd()*S, r = rMin + rnd()*(rMax-rMin);
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = aMin + rnd()*(aMax-aMin);
      rg.addColorStop(0, fill.replace('ALPHA', a.toFixed(3)));
      rg.addColorStop(1, fill.replace('ALPHA', '0'));
      x.fillStyle = rg; x.fillRect(cx-r, cy-r, r*2, r*2);
    }
  };
  blob('rgba(79,124,38,ALPHA)',  90, 90, 340, .10, .28);   // shade
  blob('rgba(186,214,92,ALPHA)', 70, 70, 260, .10, .24);   // sun
  blob('rgba(120,150,60,ALPHA)',120, 30, 110, .06, .16);   // texture

  /* THE CHURNED MIDDLE, where the two front lines meet. Built from overlapping
     ellipses rather than a straight gradient band — a battle line is not a
     ruler, and a hard-edged stripe across the field was the single most
     obviously computer-generated thing on it. Kept FAINT: it is a change in
     the ground, not a road. */
  for (let i = 0; i < 60; i++){
    const cx = rnd()*S, cy = S*0.5 + (rnd()-.5)*S*0.13;
    const rx = 60 + rnd()*180, ry = 22 + rnd()*70;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    const a = .08 + rnd()*.16;
    rg.addColorStop(0, 'rgba(194,166,114,' + a.toFixed(3) + ')');
    rg.addColorStop(.6,'rgba(194,166,114,' + (a*.5).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(194,166,114,0)');
    x.save(); x.translate(cx, cy); x.scale(rx/Math.max(rx,ry), ry/Math.max(rx,ry));
    x.fillStyle = rg; x.beginPath(); x.arc(0, 0, Math.max(rx,ry), 0, 7); x.fill(); x.restore();
  }

  /* THE BATTLEFIELD ITSELF. It has to be bare — nothing grows where the units
     stand — and bare clean grass is both boring and a lie. Two armies have
     been standing on this.

     But TRAMPLED GRASS, NOT MUD. The first pass laid two hundred and sixty
     opaque dirt blobs into a four-hundred-pixel square and turned the entire
     middle of the frame into one flat brown stain — which is worse than the
     boring green it replaced, because the units are painted in browns and
     greys and they vanished into it. Wear reads as wear when there is still
     grass to have worn away: broad thin scuffing, hard little boot-churn where
     feet actually land, ruts, and tufts that survived. */
  if (bw){
    const cx = S/2, cz = S/2;
    const px = bw / FIELD_W * S, pz = bd / FIELD_D * S;
    /* how far into the board a point is, 0 at the edge and 1 at the middle —
       wear is heaviest where the lines meet and fades out to the grass */
    const wear = (ex, ez) => {
      const u = Math.abs(ex - cx) / px, v = Math.abs(ez - cz) / pz;
      return Math.max(0, 1 - Math.max(u, v) * 0.82);
    };

    /* broad scuffing: wide, soft, and mostly transparent */
    for (let i = 0; i < 120; i++){
      const ex = cx + (rnd()*2-1)*px*1.06, ez = cz + (rnd()*2-1)*pz*1.06;
      const w = wear(ex, ez); if (w <= 0.02) continue;
      const r = 50 + rnd()*130;
      const rg = x.createRadialGradient(ex, ez, 0, ex, ez, r);
      const a = (.09 + rnd()*.22) * w;
      const col = rnd() > .5 ? '156,128,84' : '134,116,72';
      rg.addColorStop(0,'rgba(' + col + ',' + a.toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = rg; x.beginPath(); x.arc(ex, ez, r, 0, 7); x.fill();
    }
    /* boot churn: small, harder, and only where the ground is really worn */
    for (let i = 0; i < 420; i++){
      const ex = cx + (rnd()*2-1)*px, ez = cz + (rnd()*2-1)*pz;
      const w = wear(ex, ez); if (rnd() > w * 0.9) continue;
      const r = 6 + rnd()*22;
      const rg = x.createRadialGradient(ex, ez, 0, ex, ez, r);
      const a = .22 + rnd()*.42;
      const col = rnd() > .55 ? '120,96,60' : '92,74,48';
      rg.addColorStop(0,'rgba(' + col + ',' + a.toFixed(2) + ')');
      rg.addColorStop(.6,'rgba(' + col + ',' + (a*.5).toFixed(2) + ')');
      rg.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = rg; x.beginPath(); x.arc(ex, ez, r, 0, 7); x.fill();
    }
    /* wheel ruts and drag marks */
    x.lineCap = 'round';
    for (let i = 0; i < 110; i++){
      const ex = cx + (rnd()*2-1)*px, ez = cz + (rnd()*2-1)*pz;
      const w = wear(ex, ez); if (w <= 0.1) continue;
      const len = 40 + rnd()*160, ang = (rnd()-.5)*0.6 + (rnd() > .62 ? Math.PI/2 : 0);
      x.strokeStyle = 'rgba(84,66,42,' + ((.13 + rnd()*.22) * w).toFixed(3) + ')';
      x.lineWidth = 1.5 + rnd()*7;
      x.beginPath(); x.moveTo(ex, ez);
      x.lineTo(ex + Math.cos(ang)*len, ez + Math.sin(ang)*len*0.45); x.stroke();
    }
    /* and the grass that survived it, so the wear has something to be wear ON */
    for (let i = 0; i < 900; i++){
      const ex = cx + (rnd()*2-1)*px, ez = cz + (rnd()*2-1)*pz;
      const w = wear(ex, ez); if (rnd() < w * 0.75) continue;
      const r = 5 + rnd()*20;
      const rg = x.createRadialGradient(ex, ez, 0, ex, ez, r);
      const a = .10 + rnd()*.22;
      const col = rnd() > .5 ? '150,186,78' : '116,154,58';
      rg.addColorStop(0,'rgba(' + col + ',' + a.toFixed(2) + ')');
      rg.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = rg; x.beginPath(); x.arc(ex, ez, r, 0, 7); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}

/* a soft contact shadow, so a figure sits in the grass instead of on top of it */
function blobShadow(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(24,40,14,.50)');
  g.addColorStop(.55,'rgba(24,40,14,.24)');
  g.addColorStop(1, 'rgba(24,40,14,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return t;
}
let SHADOW_TEX = null;

const FIELD_W = 120, FIELD_D = 110;

/* THE GROUND IS NOT A SHEET. A dead-flat plane is the other half of why this
   looked computer-generated: real ground rolls, and the roll is what gives the
   horizon a shape. It stays perfectly flat over the board, because units stand
   in lines and a line on a hill is a bug — the relief fades in outside it. */
const BOARD_R = 26;
function relief(x, z){
  const d = Math.hypot(x * 0.72, z);
  const k = Math.max(0, Math.min(1, (d - BOARD_R) / 26));   // 0 on the board
  const ease = k * k * (3 - 2 * k);
  return ease * (Math.sin(x * 0.055) * 1.5 + Math.cos(z * 0.043) * 1.7
               + Math.sin((x + z) * 0.021) * 2.6);
}

const groundGeo = new THREE.PlaneGeometry(FIELD_W, FIELD_D, 90, 84);
(function(){
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++)
    pos.setZ(i, relief(pos.getX(i), -pos.getY(i)));         // pre-rotation axes
  groundGeo.computeVertexNormals();
})();
const groundMat = new THREE.MeshLambertMaterial({ map:groundTexture(
    (S.width*COL/2 + COL*1.6), (S.lines.length*ROW/2 + ROW*1.1)) });
/* the detail tile multiplied in, and FADED OUT WITH DISTANCE. Left on all the
   way to the horizon it turns into a shimmering moire the moment the camera
   moves, which is worse than having no detail at all — so it is strongest
   underfoot and gone by the treeline, which is also how ground actually
   reads. */
(function(){
  const det = detailTexture();
  groundMat.onBeforeCompile = sh => {
    sh.uniforms.uDetail = { value: det };
    sh.uniforms.uDetRep = { value: det.repeat.clone() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPosD;')
      .replace('#include <begin_vertex>',
               '#include <begin_vertex>\nvWPosD = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>',
               '#include <common>\nuniform sampler2D uDetail;\nuniform vec2 uDetRep;\nvarying vec3 vWPosD;')
      .replace('#include <map_fragment>',
               `#include <map_fragment>
                float dFade = 1.0 - smoothstep(14.0, 62.0, length(vWPosD.xz - cameraPosition.xz));
                vec3 det = texture2D(uDetail, vMapUv * uDetRep).rgb;
                diffuseColor.rgb *= mix(vec3(1.0), det * 2.0, dFade * 0.85);`);
  };
  /* r128 still calls it vUv, not vMapUv */
  const patch = groundMat.onBeforeCompile;
  groundMat.onBeforeCompile = sh => { patch(sh);
    sh.fragmentShader = sh.fragmentShader.replace('vMapUv * uDetRep', 'vUv * uDetRep'); };
})();
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

/* the field sits on a wider apron so the horizon is grass, not a hard edge */
const apron = new THREE.Mesh(
  new THREE.PlaneGeometry(420, 420),
  new THREE.MeshLambertMaterial({ color:sRGB(C.grass) }));
apron.rotation.x = -Math.PI/2; apron.position.y = -1.2;
scene.add(apron);

/* ── the lines, marked on the ground ───────────────────────────
   Faint chalked bands with a worn socket at every column. This is the part
   that keeps it a WARGAME and not a diorama: you can still see the grid. */
const marks = new THREE.Group(); scene.add(marks);
function layMarks(lines, width){
  marks.clear();
  const ringGeo = new THREE.RingGeometry(0.62, 0.78, 28);
  lines.forEach((l, i) => {
    const z = (i - (lines.length-1)/2) * ROW;
    const side = l.side === 'al';
    const bandM = new THREE.MeshBasicMaterial({
      color:sRGB(side ? C.ally : C.enemy), transparent:true, opacity:.055,
      depthWrite:false });
    const band = new THREE.Mesh(new THREE.PlaneGeometry(width*COL + COL*0.7, ROW*0.86), bandM);
    band.rotation.x = -Math.PI/2; band.position.set(0, 0.012, z);
    marks.add(band);
    for (let col = 0; col < width; col++){
      const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color:sRGB(side ? C.allyDk : C.enemyDk), transparent:true, opacity:.10,
        depthWrite:false }));
      r.rotation.x = -Math.PI/2;
      r.position.set((col - (width-1)/2) * COL, 0.02, z);
      marks.add(r);
    }
  });
}

/* ── scenery ───────────────────────────────────────────────────
   The single biggest thing wrong with the first field was DENSITY. The kit's
   own previews are thick with ground cover — grass, clover, ferns, flowers,
   pebbles, mushrooms, all layered — and trees standing in copses. Twenty trees
   sprinkled evenly over bare green is not a sparser version of that; it is a
   different and much worse picture.

   So: thousands of instances, and CLUSTERED. Real ground is patchy. Things
   grow near other things. An even random scatter has a texture of its own and
   the eye reads it instantly as a computer filling space.

   All of it drawn as InstancedMesh — one draw call per prop per material,
   whatever the count.  */
const scenery = new THREE.Group(); scene.add(scenery);

/* Per-instance leaf colour, kept NEAR the texture's own green. The first
   attempt tinted toward orange for autumn and got brown, because tinting is a
   multiply and multiplying a dark green leaf by orange lands in the mud. Small
   shifts around the natural colour are what a treeline actually looks like. */
const WHITE = new THREE.Color(1,1,1);
const LEAF = ['#ffffff','#e8f0c8','#d8e8b0','#fff0c0','#f0e0a8','#ffe8b8','#e0eebb'];

/* ── GRASS, MADE OF TRIANGLES ──────────────────────────────────
   A texture cannot do this. Painted grass is flat by definition: it has no
   silhouette against the sky, it does not catch the sun on one side and shade
   on the other, and — the thing you actually notice — it does not MOVE. Every
   attempt to fix the ground by painting it harder was fixing the wrong layer.

   So the grass is geometry: one tapered blade, five vertices and three
   triangles, instanced thirty thousand times, bent in the vertex shader by the
   same wind that moves the trees. Cheap enough because the blade is three
   triangles and the bend costs one sine; convincing because every one of them
   is a real object with a real edge and a real shadow falling across it.
   (method after antaeus-ar, "making grass with triangles in glsl") */
function bladeGeometry(){
  /* A TUFT, NOT A HAIR. One blade per instance was thirty thousand strokes two
     pixels wide in almost exactly the ground's own green — present in the
     scene, invisible on the screen. Grass reads as grass because blades stand
     in clumps and shade each other; so each instance is three blades at
     different heights and angles, which triples the density on screen for the
     same number of instance matrices.

     SIX of them, not three, and spread wider. A test pass with the blades
     tinted red showed the truth the green ones were hiding: they were the
     right size all along and there were nowhere near enough of them — roughly
     one clump per square metre, which is a lawn that has been dead for a
     while. Blades per instance is the cheap axis: one matrix, six blades. */
  const BLADES = 6;
  const g = new THREE.BufferGeometry();
  const pos = [], nor = [], col = [], idx = [];
  let sd = 4242;
  const rnd = () => (sd = (sd*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  for (let k = 0; k < BLADES; k++){
    const base = idx.length ? pos.length / 3 : 0;
    const ang = (k / BLADES) * Math.PI * 2 + rnd() * 0.9;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const off = k === 0 ? 0 : 0.30 + rnd() * 0.78;         // spread from the crown
    const ox = Math.cos(ang * 2.1) * off, oz = Math.sin(ang * 2.1) * off;
    const tall = 0.72 + rnd() * 0.5;                       // uneven, like a real clump
    const lean = (rnd() - 0.5) * 0.34;
    /* half-widths up the blade, tapering to a point */
    const lv = [[0, 0.50], [0.55, 0.30], [1.0, 0.0]];
    lv.forEach(([y, w]) => {
      const shade = 0.50 + y * 0.68;      // dark at the root, bright at the tip
      const yy = y * tall, bend = lean * y * y;
      const put = (lx) => {
        pos.push(ox + (lx + bend) * ca, yy, oz + (lx + bend) * sa);
        nor.push(Math.sign(lx || 1) * 0.42 * ca, 0.91, Math.sign(lx || 1) * 0.42 * sa);
        col.push(shade, shade, shade);
      };
      if (w > 0){ put(-w); put(w); } else put(0);
    });
    idx.push(base+0, base+2, base+1,  base+1, base+2, base+3,  base+2, base+4, base+3);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

const BLADE_GREENS = ['#8fc23f','#7cae32','#a3d051','#6f9d2c','#b6d968','#88b93a'];

function sowGrass(halfW, halfD, rnd){
  /* WHERE, not just how many. Sown evenly over a thirty-four unit disc, a
     hundred and forty thousand blades come out at a blade a square foot —
     technically grass, visually a bald patch with hairs in it. Almost all of
     them are wasted out where a blade is one pixel.

     So it is sown in three bands. Most of it hugs the edge of the trampled
     ground, which is the strip you actually look at and the one that has to
     say "the army stopped here"; a thinner scatter runs out towards the trees
     so it does not end in a ring; and stubble inside the lines keeps the board
     from reading as a hole cut in the world. */
  const BAND = 20000, OUT = 7000, IN = 5000, N = BAND + OUT + IN;
  const geo = bladeGeometry();
  const mat = windy(new THREE.MeshLambertMaterial({
    vertexColors: true, side: THREE.DoubleSide }), 0.62);
  const im = new THREE.InstancedMesh(geo, mat, N);
  im.receiveShadow = true;            // unit and tree shadows fall across it
  im.castShadow = false;              // a hundred thousand blades in the shadow map is not worth it
  im.frustumCulled = false;

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(),
        E = new THREE.Euler(), Vp = new THREE.Vector3(), Vs = new THREE.Vector3();
  const tint = new THREE.Color();
  let n = 0;

  const sow = (x, z, edge, inside) => {
    /* shorter where the armies have been walking over it, taller out towards
       the trees where nothing has */
    const trod = inside ? 0.20 : Math.min(1, 0.40 + edge / 5.5);
    /* ankle-to-shin, never a hedge. It grew to head height at the near edge
       on the first pass, which turns the frame's foreground into a wall you
       are looking over rather than a field the army is standing in. */
    const h = (0.34 + rnd() * 0.40) * trod;
    const w = (inside ? 0.10 : 0.17) + rnd() * (inside ? 0.06 : 0.15);
    E.set((rnd() - 0.5) * 0.26, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.30);
    Q.setFromEuler(E);
    Vp.set(x, relief(x, z) - 0.02, z);
    Vs.set(w, h, w);
    im.setMatrixAt(n, M.compose(Vp, Q, Vs));
    tint.copy(sRGB(BLADE_GREENS[(rnd() * BLADE_GREENS.length) | 0]))
        .multiplyScalar(0.80 + rnd() * 0.36);
    im.setColorAt(n, tint);
    n++;
  };

  /* the band: a point on the board's edge, pushed outward, biased hard towards
     the edge itself so the mat is thickest where the grass meets the mud */
  for (let i = 0; i < BAND; i++){
    const out = Math.pow(rnd(), 1.9) * 15;
    let x, z;
    if (rnd() < halfW / (halfW + halfD)){          // top or bottom edge
      x = (rnd() * 2 - 1) * (halfW + out);
      z = (rnd() < 0.5 ? -1 : 1) * (halfD + out);
    } else {                                       // left or right edge
      x = (rnd() < 0.5 ? -1 : 1) * (halfW + out);
      z = (rnd() * 2 - 1) * (halfD + out);
    }
    sow(x, z, out, false);
  }
  /* thinning out towards the treeline */
  for (let i = 0; i < OUT; i++){
    const a = rnd() * Math.PI * 2, r = 12 + Math.sqrt(rnd()) * 44;
    const x = Math.cos(a) * r * 1.32, z = Math.sin(a) * r;
    const ox = Math.max(0, Math.abs(x) - halfW), oz = Math.max(0, Math.abs(z) - halfD);
    if (ox === 0 && oz === 0) continue;
    sow(x, z, Math.hypot(ox, oz), false);
  }
  /* stubble on the board itself: a fifth the height, well below the base
     rings, nothing you could lose a figure behind */
  for (let i = 0; i < IN; i++){
    sow((rnd() * 2 - 1) * halfW, (rnd() * 2 - 1) * halfD, 0, true);
  }

  im.count = n;
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

function scatter(width, depth){
  scenery.clear();
  let seed = 987654321;
  const rnd = () => (seed = (seed*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.9;

  /* THE BATTLEFIELD IS BARE. Scenery lives outside it and nowhere else — a
     tuft of grass under a unit is a thing between you and reading the board,
     and the board is the entire point of the view. The margin is generous so
     nothing crowds the outer lines either. */
  const halfW = width*COL/2 + COL*1.6, halfD = depth*ROW/2 + ROW*1.1;
  const onBoard = (x, z) => Math.abs(x) < halfW && Math.abs(z) < halfD;
  /* AND NOTHING BETWEEN YOU AND THE FIGHT. The camera stands off the near
     edge, so anything tall in that corridor is a tree planted in front of the
     screen. Ground cover is fine there; anything with a trunk is not. */
  const inTheWay = (x, z, tall) => tall && z > halfD - 2 && Math.abs(x) < 44;

  /* a plan of where each prop goes, gathered first so every instance of one
     prop can be handed to a single InstancedMesh */
  const plan = {};
  const put = (name, x, z, h, tint) => {
    (plan[name] || (plan[name] = [])).push({ x, z, h,
      rot: rnd()*Math.PI*2, tint: tint || null });
  };

  /* GROUND COVER — everywhere, including under the figures. Grass and clover
     are ankle-high; a battle line standing in grass is what it should look
     like, and bare ground under every unit is what a game board looks like. */
  const cover = (name, n, hMin, hMax, R) => {
    for (let i = 0; i < n; i++){
      const a = rnd()*Math.PI*2, r = Math.sqrt(rnd()) * R;
      const x = Math.cos(a)*r*1.3, z = Math.sin(a)*r;
      if (onBoard(x, z)) continue;
      put(name, x, z, hMin + rnd()*(hMax-hMin));
    }
  };
  /* the MegaKit's grass tufts are now the OCCASIONAL clump among real blades
     rather than the whole ground cover — thousands of painted quads standing
     in for grass was always the wrong shape of solution */
  cover('grassS',  1700, 0.30, 0.66, 62);
  cover('wispyS',  1200, 0.34, 0.76, 60);
  cover('clover',  2200, 0.15, 0.30, 52);
  cover('grass',   1900, 0.52, 1.05, 60);
  cover('wispy',   1500, 0.58, 1.15, 60);
  cover('plant',    900, 0.38, 0.82, 54);
  cover('fern',     620, 0.42, 0.88, 56);
  cover('flower',   760, 0.28, 0.54, 52);
  cover('flower2',  640, 0.32, 0.60, 52);
  cover('pebble',   700, 0.13, 0.34, 54);
  cover('pebble2',  520, 0.12, 0.30, 54);
  cover('mushroom', 260, 0.15, 0.30, 50);

  /* CLUMPS — trees in copses, rocks in outcrops. A cluster centre, then a
     handful of things falling around it. */
  const clump = (names, groups, per, hMin, hMax, rMin, rMax, spread, tinted) => {
    for (let g = 0; g < groups; g++){
      let cx, cz, tries = 0;
      do {
        const a = rnd()*Math.PI*2, r = rMin + rnd()*(rMax-rMin);
        cx = Math.cos(a)*r*1.2; cz = Math.sin(a)*r;
      } while ((onBoard(cx, cz) || inTheWay(cx, cz, hMax > 2.2)) && ++tries < 40);
      if (onBoard(cx, cz) || inTheWay(cx, cz, hMax > 2.2)) continue;
      const n = 1 + Math.floor(rnd()*per);
      for (let i = 0; i < n; i++){
        const x = cx + gauss()*spread, z = cz + gauss()*spread;
        if (onBoard(x, z) || inTheWay(x, z, hMax > 2.2)) continue;
        put(names[Math.floor(rnd()*names.length)], x, z, hMin + rnd()*(hMax-hMin),
            tinted ? LEAF[Math.floor(rnd()*LEAF.length)] : null);
      }
    }
  };
  clump(['tree','tree2'], 58, 6, 4.5, 9.5, halfW+8, 84, 7.0, true);
  clump(['pine'],         34, 5, 5.5,11.0, halfW+12, 90, 7.5, false);
  clump(['bush','bushfl'],150,4, 0.7, 2.0, halfW+2, 66, 3.4, false);
  clump(['rock','rock2'], 70, 5, 0.4, 1.4, halfW+1, 60, 2.6, false);
  clump(['boulder'],      26, 3, 1.3, 3.4, halfW+5, 66, 3.2, false);

  scenery.add(sowGrass(halfW, halfD, rnd));

  /* build one InstancedMesh per prop primitive */
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(),
        Vp = new THREE.Vector3(), Vs = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
  let total = 0;
  for (const name of Object.keys(plan)){
    const list = plan[name], { parts } = propParts(name);
    for (const part of parts){
      const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
      /* ankle-high ground cover does not earn a shadow-map slot, and there are
         thousands of it */
      im.castShadow = CASTS.has(name); im.receiveShadow = true;
      list.forEach((it, i) => {
        Q.setFromAxisAngle(up, it.rot);
        Vp.set(it.x, relief(it.x, it.z) - 0.02, it.z);
        Vs.setScalar(it.h);
        im.setMatrixAt(i, M.compose(Vp, Q, Vs));
        /* instanceColor is per-mesh: once one instance sets a tint every other
           one must set white, or they come out black */
        if (list.some(x => x.tint)) im.setColorAt(i, it.tint ? sRGB(it.tint) : WHITE);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.frustumCulled = false;          // one mesh spans the whole field
      scenery.add(im);
    }
    total += list.length;
  }
  return total;
}

const flat = hex => new THREE.MeshLambertMaterial({ color:sRGB(hex) });

/* ── figures ───────────────────────────────────────────────────
   grumkata's character art, as BILLBOARDS. Not models — cutouts standing on
   the field, turning to face the camera around Y only so they stay upright and
   never foreshorten into a smear when you pan.

   Three details that are the difference between this working and looking wrong:

     · THE QUAD'S ORIGIN IS AT THE FEET, not its middle. Everything below scales
       the sprite, and a sprite scaled about its centre sinks into the ground
       and rises off it as it breathes.
     · `alphaTest` rather than blended transparency. Thirty cutouts with soft
       alpha need a per-frame depth sort to layer correctly; an alpha cutout
       needs none, and the art has hard edges anyway.
     · The two armies MIRROR, so they face each other instead of both looking
       the same way down the field.

   They sway, and they breathe — a squash and stretch that holds volume, so it
   reads as a chest rising rather than a balloon. Phase comes off the entity's
   own id, so a rank of Grave Serjeants is not a chorus line.  */
/* ── wind ──────────────────────────────────────────────────────
   Everything that grows bends. It is done in the VERTEX SHADER rather than by
   moving objects on the CPU, because there are fifteen thousand of them and
   they are drawn in a handful of instanced batches — moving them from
   JavaScript would mean rebuilding those batches every frame.

   The displacement is weighted by height SQUARED, so the base of a tuft stays
   planted in the ground and only the tips travel, and the phase comes from the
   instance's own world position, so a gust reads as a wave crossing the field
   rather than every blade twitching in unison. */
const uTime = { value: 0 };
function windy(mat, strength){
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.uniforms.uWind = { value: strength };
    sh.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + sh.vertexShader;
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iOrigin = instanceMatrix[3].xyz;
      #else
        vec3 iOrigin = vec3(0.0);
      #endif
      float wH = max(transformed.y, 0.0);
      float wPh = iOrigin.x * 0.55 + iOrigin.z * 0.42;
      float wS = sin(uTime * 1.35 + wPh) + 0.45 * sin(uTime * 2.7 + wPh * 1.9);
      transformed.x += wS * uWind * wH * wH;
      transformed.z += wS * 0.42 * uWind * wH * wH;
    `);
  };
  mat.customProgramCacheKey = () => 'wind' + strength;
  return mat;
}
/* how hard each thing bends, and whether it is worth a shadow map slot */
const WIND = { grass:0.16, grassS:0.16, wispy:0.19, wispyS:0.19, clover:0.10,
               fern:0.11, plant:0.13, flower:0.14, flower2:0.14,
               bush:0.045, bushfl:0.045, tree:0.030, tree2:0.030, pine:0.022 };
const CASTS = new Set(['tree','tree2','pine','bushfl','bush','boulder']);

const spriteCache = {};
function spriteMat(name){
  if (spriteCache[name]) return spriteCache[name];
  const t = new THREE.TextureLoader().load(SPRITES[name].src);
  t.encoding = THREE.sRGBEncoding;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  /* Unlit on purpose — the art carries its own shading, and lighting a
     billboard makes it flicker as the quad turns to follow the camera. A warm
     multiply is enough to sit it in the same sun as everything else. */
  return (spriteCache[name] = new THREE.MeshBasicMaterial({
    map:t, transparent:true, alphaTest:0.35, side:THREE.DoubleSide,
    color:sRGB('#fffaf0'), fog:true }));
}
/* one unit quad, origin at the bottom edge */
const QUAD = (() => {
  const g = new THREE.PlaneGeometry(1, 1);
  g.translate(0, 0.5, 0);
  return g;
})();

/* Who looks like what. Content decides — an entity may name its own `sprite`,
   and this is only the fallback so a board full of placeholders still reads. */
const SPRITE_FOR = {
  'Bone Levy':'skeleton', 'Ravener':'skeleton',
  'Pyre-Adept':'lich', 'Ash Cantor':'lich', 'Hollow Knight':'lich',
  'Longbowman':'archer', 'Crow Archer':'archer',
  'Thane Bryn':'axeman', 'Vashka':'axeman',
};
const spriteOf = e => e.sprite || SPRITE_FOR[e.name] || 'spearman';

const GEO = {
  /* a thin ring on the ground, not a poker chip. The fat coloured discs were
     doing more damage to this than anything else on screen: five saturated
     dinner plates per line, all exactly alike, sitting on flat green. */
  ring:   new THREE.RingGeometry(0.46, 0.56, 26),
  plinth: new THREE.RingGeometry(0.56, 0.72, 30),
  shadow: new THREE.PlaneGeometry(1.6, 1.6),
};

const span = e => e.kind === 'unit' ? 1 : e.kind === 'large' ? 2 : (e.wide ? 3 : 2);
function figure(e){
  const g = new THREE.Group();
  const en = e.side === 'en';
  const dark = en ? C.enemyDk : C.allyDk;
  const big = e.kind === 'large', form = e.kind === 'form';
  const s = big ? 1.45 : 1;
  const art = SPRITES[spriteOf(e)];
  if (!SHADOW_TEX) SHADOW_TEX = blobShadow();

  /* the ground contact, soft-edged. A hard circle under a soft-edged figure is
     a sticker, not a shadow. */
  /* the ring and the contact shadow belong to the STAND, not to the men, so
     they are sized in world units and divided back out of the group scale */
  const stand = new THREE.Group();  g.add(stand);
  const sh = new THREE.Mesh(GEO.shadow, new THREE.MeshBasicMaterial({
    map:SHADOW_TEX, transparent:true, depthWrite:false }));
  sh.rotation.x = -Math.PI/2; sh.position.y = 0.02;
  sh.scale.set(s * (form ? span(e) * 1.5 : 1), s * (form ? 1.9 : 1), 1);
  stand.add(sh);

  /* Allegiance is not in the art, so a thin ring carries it — read at a
     glance, and gone the moment you stop looking for it. */
  const ring = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({
    color:sRGB(dark), transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false }));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.035;
  ring.scale.set(s * (form ? span(e) * 1.35 : 1), s * (form ? 1.5 : 1), 1);
  stand.add(ring);
  if (e.pc){
    const pl = new THREE.Mesh(GEO.plinth, new THREE.MeshBasicMaterial({
      color:sRGB(C.gold), transparent:true, opacity:.85, side:THREE.DoubleSide, depthWrite:false }));
    pl.rotation.x = -Math.PI/2; pl.position.y = 0.045; pl.scale.setScalar(s);
    stand.add(pl);
  }

  /* A FORMATION IS AS MANY FIGURES AS IT HAS UNITS. Ten men in the Iron
     Phalanx is ten men, packed into the footprint its slots give it — three
     stand-ins was me not listening, and it also threw away the one thing a
     formation is FOR: you can see how many of them are left. */
  let men = [[0, 0]], G = FIG * (big ? 1.34 : 1);
  if (form){
    const n = Math.max(1, e.alive != null ? e.alive : (e.total || 1));
    const Wf = span(e) * COL * 0.90, Df = ROW * 0.74;
    let cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * Wf / Df))));
    const rows = Math.ceil(n / cols);
    const dx = Wf / cols, dz = Df / rows;
    /* a grunt is never taller than a hero, and never wider than his own file */
    G = Math.min(FIG * 0.86, dx * 0.98 / art.w);
    men = [];
    for (let i = 0; i < n; i++){
      const c = i % cols, r = Math.floor(i / cols);
      men.push([ (c - (cols-1)/2) * dx / G, (r - (rows-1)/2) * dz / G ]);
    }
  }

  const bill = [];
  const mat = spriteMat(spriteOf(e));
  let hh = 0; for (let j = 0; j < e.id.length; j++) hh = (hh * 31 + e.id.charCodeAt(j)) & 255;
  men.forEach(([ox, oz], i) => {
    const m = new THREE.Mesh(QUAD, mat);
    /* a few percent of size variance, so a block of men stops reading as one
       model pasted ten times */
    const vary = 0.94 + (((hh + i * 61) % 100) / 100) * 0.12;
    m.scale.set(art.w * vary, vary, 1);
    m.position.set(ox * (form ? 1 : s), 0, oz * (form ? 1 : s));
    m.renderOrder = -oz;                      // the back rank draws behind
    if (en) m.scale.x *= -1;                  // the two armies look at each other
    m.castShadow = true;
    /* the shadow has to be cut out by the same alpha the sprite is, or every
       figure throws a rectangle */
    m.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, map: mat.map, alphaTest: 0.4 });
    m.userData = { phase: i * 1.37, w: art.w * vary, h: vary };
    bill.push(m);
    g.add(m);
  });
  g.userData.bill = bill;
  g.scale.setScalar(G);
  stand.scale.setScalar(1 / G);   // the stand is measured in world units
  return g;
}

const AIM_GOLD = sRGB('#ffe066'), SEL_GOLD = sRGB(C.gold);
/* ── the selection ring ── */
const ringGeo = new THREE.RingGeometry(0.86, 1.06, 32);
function selRing(hex, op){
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color:sRGB(hex), transparent:true, opacity:op, side:THREE.DoubleSide }));
  m.rotation.x = -Math.PI/2; m.position.y = 0.06;
  return m;
}

/* ── the army on the field ─────────────────────────────────────
   Rebuilt from S.lines whenever the board changes. Figures are cheap and the
   board is small; rebuilding is simpler than diffing and cannot drift. */
const army = new THREE.Group(); scene.add(army);
const pegs = [];            // {id, group, ring, phase, ent}
let builtSig = '';

function boardSig(){
  return S.lines.map(l => l.key + ':' + l.ents.map(e =>
    e.id + (e.col||0) + (e.hp||e.alive||0) + (e.acted?'x':'')).join(',')).join('|')
    + '#' + S.sel + '#' + S.width;
}

function buildArmy(){
  army.clear(); pegs.length = 0;
  const width = S.width, n = S.lines.length;
  S.lines.forEach((l, i) => {
    const z = (i - (n-1)/2) * ROW;
    for (const e of l.ents){
      const span = e.kind === 'unit' ? 1 : e.kind === 'large' ? 2 : (e.wide ? 3 : 2);
      const col = (e.col == null ? 0 : e.col) + (span - 1) / 2;
      const g = figure(e);
      g.position.set((col - (width-1)/2) * COL, 0, z);   // the board is flat by construction
      const ring = selRing(C.gold, 0);
      ring.visible = false;
      g.add(ring);
      army.add(g);
      let h = 0; for (let k=0;k<e.id.length;k++) h = (h*31 + e.id.charCodeAt(k)) & 1023;
      pegs.push({ id:e.id, group:g, ring, phase:h/1023*6.283, ent:e });
    }
  });
}

/* ── the camera ────────────────────────────────────────────────
   A game camera: behind and above your own back line, looking down the field
   at the enemy. Low enough that you see your soldiers from the SIDE, which is
   the entire point of dropping into this view. */
/* a longer lens: 38 degrees is a phone camera and it was splaying the near
   rank out toward the corners */
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
/* Framed so the WHOLE board is on screen at zoom 1 — eight lines is 27 units
   of depth and the near rank was falling off the bottom edge, which is the one
   thing a battle line view cannot do. */
/* LOWER AND CLOSER than a diagram wants to be. The whole point of this view
   is seeing the units as units from the side, and at nineteen units up the
   figures were forty pixels tall and you were mostly looking at ground. This
   is a shallower angle: ranks overlap each other a little, which is exactly
   what a line of troops looks like from the field. */
const CAM = { dist: 36, height: 14.2, look: -1.0, pan: 0, zoom: 1 };
function placeCamera(k){
  /* `k` is the arrival push: the field starts a fifth further out and settles
     in as it fades up, which is what makes it read as arriving somewhere
     rather than as a slide changing */
  const z = CAM.zoom * (k == null ? 1 : k);
  const d = CAM.dist / z, h = CAM.height / Math.pow(z, 0.55);
  camera.position.set(CAM.pan, h, d);
  camera.lookAt(CAM.pan * 0.55, 1.1, CAM.look);
}

function size(){
  const W = innerWidth, H = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(W, H, false);
  cv.style.width = W+'px'; cv.style.height = H+'px';
  camera.aspect = W/H; camera.updateProjectionMatrix();
}
addEventListener('resize', size);
size();

/* ── names ─────────────────────────────────────────────────────
   Text is never drawn in WebGL here for the same reason it is not drawn in the
   piece layer: it has live values in it. Every figure gets a DOM label,
   projected to its head each frame. Legible without selecting anything, which
   has been the rule since the first day. */
let nameLayer = null;
function labels(){
  if (nameLayer) return nameLayer;
  nameLayer = document.createElement('div');
  nameLayer.className = 'fnames';
  document.body.appendChild(nameLayer);
  return nameLayer;
}
const V = new THREE.Vector3();
/* THE LABELS DE-OVERLAP, and this is not cosmetic. Every entity's name has to
   be readable WITHOUT selecting it — that is a rule of this app — and six
   units in a rank stand at the same depth, so their labels land on the same
   screen row and pile into an unreadable wall. So: place them nearest-first
   (depth order is the only honest tiebreak), and lift each one above whatever
   is already there, dropping the number and finally the whole label if there
   is genuinely nowhere left. A leader line runs back down to the head, so a
   label that has been lifted three rows still points at its owner. */
const LBL_H = 13, LBL_STEP = 14, LBL_LIFTS = 6;
function drawLabels(){
  const layer = labels();
  while (layer.children.length > pegs.length) layer.lastChild.remove();
  while (layer.children.length < pegs.length){
    const d = document.createElement('div');
    d.className = 'fname';
    d.innerHTML = '<b></b><i></i>';
    layer.appendChild(d);
  }
  const W = innerWidth, H = innerHeight;

  /* project everything first, then place in depth order */
  const want = [];
  pegs.forEach((p, i) => {
    const el = layer.children[i], e = p.ent;
    V.set(0, e.kind === 'large' ? 2.5 : 2.1, 0).applyMatrix4(p.group.matrixWorld).project(camera);
    const x = (V.x * 0.5 + 0.5) * W, y = (-V.y * 0.5 + 0.5) * H;
    if (!(V.z < 1 && x > -80 && x < W + 80 && y > -40 && y < H + 40)){
      el.style.display = 'none'; return;
    }
    want.push({ el, e, x, y, z: V.z });
  });
  want.sort((m, n) => m.z - n.z);                       // nearest gets its spot

  const taken = [];
  const hits = (x0, x1, y0) => taken.some(t =>
    x1 > t.x0 - 3 && x0 < t.x1 + 3 && y0 > t.y0 - LBL_H && y0 < t.y1 + LBL_H);

  for (const w of want){
    const e = w.e, sel = e.id === S.sel, legal = aimSet && aimSet.has(e.id);
    const hp = e.kind === 'form' ? e.alive + '/' + e.total : (e.hp|0) + '/' + (e.max|0);
    const full = e.name.length * 5.1 + hp.length * 5.4 + 20;
    const bare = e.name.length * 5.1 + 12;

    /* the selected piece and anything currently a legal target always get a
       place; they are what you are looking at */
    let wide = full, crowd = false, lift = 0, ok = false;
    for (let pass = 0; pass < 2 && !ok; pass++){
      wide = pass ? bare : full; crowd = !!pass;
      for (lift = 0; lift < LBL_LIFTS; lift++){
        const y0 = w.y - lift * LBL_STEP;
        if (!hits(w.x - wide/2, w.x + wide/2, y0)){ ok = true; break; }
      }
    }
    if (!ok && !(sel || legal)){ w.el.style.display = 'none'; continue; }
    if (!ok){ lift = 0; crowd = true; wide = bare; }     // the important ones barge in

    const y0 = w.y - lift * LBL_STEP;
    taken.push({ x0: w.x - wide/2, x1: w.x + wide/2, y0: y0 - LBL_H, y1: y0 });

    const el = w.el;
    el.style.display = 'block';
    el.style.setProperty('--lead', (lift * LBL_STEP) + 'px');
    el.style.transform = 'translate(' + Math.round(w.x) + 'px,' + Math.round(y0)
                       + 'px) translate(-50%,-100%)';
    el.style.zIndex = String(1000 - Math.round(w.z * 900));
    el.className = 'fname ' + (e.side === 'en' ? 'en' : 'al')
      + (sel ? ' sel' : '') + (e.acted ? ' done' : '') + (crowd ? ' crowd' : '')
      + (aimSet ? (legal ? ' legal' : ' dim') : '');
    if (el.firstChild.textContent !== e.name) el.firstChild.textContent = e.name;
    if (el.lastChild.textContent !== hp) el.lastChild.textContent = hp;
  }
}


/* ── picking ───────────────────────────────────────────────────
   The figures ARE the board here, so hit testing is a raycast rather than a
   DOM lookup. Everything else — what a click MEANS — is still app.js's. */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(cx, cy){
  ptr.set((cx/innerWidth)*2 - 1, -(cy/innerHeight)*2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(army.children, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && o.parent !== army) o = o.parent;
  const p = pegs.find(x => x.group === o);
  return p ? p.id : null;
}

/* ── the loop ──────────────────────────────────────────────────
   Only while the field is up. The table view has its own layer and its own
   loop and neither knows about the other. */
/* ── aiming ────────────────────────────────────────────────────
   The HUD hands over the set of pieces a chosen ability may legally land on;
   the field lights those and stands the rest down. Which target is legal is
   the engine's answer, not this layer's — all it does is paint it. */
let aimSet = null;
function setAim(ids){ aimSet = ids ? new Set(ids) : null; }

let on = false, t0 = 0, lastTs = 0, alive = false, fade = 0, scatterSig = '';
/* Rendering the field costs a real frame. While the cloud is closing over it,
   that frame is being taken from the one thing that has to stay smooth — so
   the field stops drawing the instant a transition is asked for, not when the
   cloud finally has the screen. Nobody can tell a frozen field from a live one
   through a cloud; everybody can tell a stuttering cloud from a smooth one. */
let paused = false;
/* `on` is what the app asked for, and it flips the instant it is asked. The
   renderer only follows once the cloud has the screen — otherwise the field
   would come and go in plain sight and the cloud would arrive to cover
   nothing. `drawnPing` is how the loop tells the cloud it may clear. */
let drawnPing = null;

/* ── coming and going ──────────────────────────────────────────
   Snapping between the flat board and the field was jarring for a plain
   reason: they are two different cameras looking at two different things, and
   a hard cut between two cameras always reads as a glitch.

   So it CROSS-FADES, and the field pushes in slightly as it arrives — the
   board stays visible underneath until the field is solid enough to cover it,
   and on the way out it reappears through the fade. The table is only actually
   hidden once nothing of it can be seen, which also means the piece layer
   keeps drawing for exactly as long as it is worth drawing. */
function setOn(v){
  if (v === on) return;
  on = v;

  /* THE CLOUD GOES FIRST AND THE SWAP HAPPENS INSIDE IT. Not for polish — for
     honesty about what the machine is doing. Everything in here is expensive
     enough to stall a frame, and a stalled frame during a cut is exactly what
     a cut looks like. Behind full cover there is nothing to cross-fade and
     nothing to get wrong: it is a hard cut, and a hard cut you cannot see is
     the cleanest transition there is. */
  paused = true;
  sweep(v, release => {
    if (on !== v){ release(); return; }
    document.body.classList.toggle('field-on', v);
    /* THE HUD FOLLOWS THE FIELD, and now it follows it LATE — the class it
       gates on flips behind the cloud rather than the moment the field is
       asked for, so nothing repaints it unless we say so. Left out, the combat
       bar stayed on screen over the flat board after leaving. */
    if (window.__hudRender) window.__hudRender();

    if (!v){
      alive = false; fade = 0;
      cv.style.display = 'none';
      if (nameLayer) nameLayer.style.display = 'none';
      document.body.classList.remove('field-solid');
      release();
      return;
    }

    fade = 0; t0 = 0; lastTs = 0;
    cv.style.display = 'block';
    cv.style.opacity = '1';
    builtSig = '';
    /* THE FIELD IS A PLACE AND IT DOES NOT MOVE. Scattering nineteen thousand
       instances was being redone on every single transition, for a landscape
       that is identical every time. Built once, kept. */
    const layout = S.width + 'x' + S.lines.length;
    if (layout !== scatterSig){ scatterSig = layout;
      scatter(S.width, S.lines.length); layMarks(S.lines, S.width); }
    if (!clouds.children.length) makeClouds();
    placeCamera();
    restamp();
    if (nameLayer){ nameLayer.style.display = 'block'; nameLayer.style.opacity = '0'; }

    /* clear the cloud on the first frame that actually has the field in it */
    drawnPing = release;
    paused = false;
    if (!alive){ alive = true; requestAnimationFrame(frame); }
    /* and clear it anyway if that frame never comes, rather than leaving
       someone staring at a white screen because of a lost context */
    setTimeout(() => { if (drawnPing === release){ drawnPing = null; release(); } }, 8000);
  });
}

function frame(ts){
  if (!alive) return;
  requestAnimationFrame(frame);
  if (paused){ lastTs = 0; return; }
  if (!t0) t0 = ts;
  const t = (ts - t0) / 1000;
  /* TIME-BASED, not per-frame. A fade measured in frames takes a quarter of a
     second on a fast machine and four seconds on a slow one, which is the
     wrong way round: the slower the machine, the longer you stare at a
     half-faded screen. */
  const dt = Math.min(0.25, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;

  /* NOT a cross-fade any more — the cut happened behind the cloud. This is
     the settle: the camera easing the last of the way in and the names
     arriving, over the moment the cloud is blowing past. */
  /* against the CLOCK, not accumulated per-frame deltas. A frame-accumulated
     settle is clamped by the same dt guard that stops a stalled tab from
     jumping, so on a slow machine it stretches to several seconds — the wrong
     way round, since the slow machine is the one you want it over with on. */
  fade = Math.min(1, t / 0.85);
  if (nameLayer) nameLayer.style.opacity = Math.max(0, (fade - 0.25) / 0.75).toFixed(3);
  document.body.classList.toggle('field-solid', fade > 0.45);

  const sig = boardSig();
  if (sig !== builtSig){ builtSig = sig; buildArmy(); restamp(); }

  uTime.value = t;
  driftClouds(dt);
  const camAng = Math.atan2(camera.position.x, camera.position.z);
  for (const p of pegs){
    for (const m of (p.group.userData.bill || [])){
      const w = t * 0.9 + p.phase + m.userData.phase;
      m.rotation.y = camAng;
      m.rotation.z = Math.sin(w) * 0.028;                  // sway
      const br = Math.sin(w * 1.6) * 0.028;                // breathe, volume held
      const sx = m.userData.w * (1 - br), sy = m.userData.h * (1 + br);
      m.scale.set(m.scale.x < 0 ? -sx : sx, sy, 1);
    }
    const sel = p.id === S.sel;
    const legal = aimSet && aimSet.has(p.id);
    p.ring.visible = sel || !!legal;
    if (legal){
      p.ring.material.color.copy(AIM_GOLD);
      p.ring.material.opacity = 0.55 + 0.35*Math.sin(t*4.2 + p.phase);
      p.group.position.y = Math.abs(Math.sin(t*2.6 + p.phase)) * 0.10;
    } else {
      p.group.position.y = 0;
      if (sel){ p.ring.material.color.copy(SEL_GOLD);
                p.ring.material.opacity = 0.55 + 0.25*Math.sin(t*3.1); }
    }
  }
  placeCamera(0.88 + 0.12 * fade);
  renderer.render(scene, camera);
  drawLabels();
  /* the field is now genuinely on screen; the cloud may clear */
  if (drawnPing){ const go = drawnPing; drawnPing = null; go(); }
}

/* a window into the built scene, for the screenshot harnesses — they cannot
   read pixels back out of a WebGL canvas, so counting what is actually in
   there is the only way to tell "it did not render" from "it was never
   built" */
window.__peek = () => {
  const out = [];
  scene.traverse(o => { if (o.isInstancedMesh)
    out.push({ n: o.count, tri: o.geometry.index ? o.geometry.index.count/3 : 0,
               vis: o.visible, mat: o.material.type,
               y: +(o.instanceMatrix.array[13] || 0).toFixed(2) }); });
  return { inst: out.length, grass: out.filter(o => o.tri === 18),
           total: out.reduce((a, o) => a + o.n, 0) };
};
return (F = { on: () => on, set: setOn, pick, aim: setAim, cam: CAM, place: placeCamera,
  /* the two things that move on their own, exposed so a test can watch them
     without trying to read pixels back out of a WebGL canvas */
  clock: () => ({ wind: uTime.value, cloud: clouds.children.length
                    ? clouds.children[0].position.x : 0, fade }) });
}

/* the handle the rest of the app holds. Asking whether the field is up, or
   putting it away, must never be the thing that builds it. */
window.__field = {
  on:    () => !!F && F.on(),
  set:   v => { if (!v && !F) return; boot().set(v); },
  pick:  (x, y) => (F ? F.pick(x, y) : null),
  aim:   ids => { if (F) F.aim(ids); },
  place: () => { if (F) F.place(); },
  clock: () => (F ? F.clock() : null),
  get cam(){ return boot().cam; },
};
})();
