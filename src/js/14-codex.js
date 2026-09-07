/* ══════════════════════════════════════════════════════════════
   THREE WAYS TO CHOOSE, AND WHICH ONE TO USE

   The weight of the interaction has to match the weight of the
   information behind it.

   1. Nothing to read  -> the thing is just added, inline, focused.
      (armour, kit, weapons, knacks, ability lines)
   2. A short list of names you already understand -> a small menu
      pinned to the button you pressed. No scrim, no full screen.
      (skills: four to ten names, each self-explanatory)
   3. Paragraphs you must read before choosing -> the codex, a
      two-pane reader with search.
      (backgrounds, styles, lores, arts)

   A full-screen reader to pick one of four words was the mistake.

   THE CROPPER lives here too, because it is the same furniture.
   It keeps alpha: a cut-out figure stays cut out, so it stands
   on the field rather than in a box.
══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $ = s => document.querySelector(s);

/* ══ 2. THE LITTLE MENU ═══════════════════════════════════════ */
let mbox, mOn = null, mItems = [], mAt = 0;
function mshell(){
  if (mbox) return mbox;
  mbox = document.createElement('div');
  mbox.id = 'pickmenu';
  document.body.appendChild(mbox);
  mbox.addEventListener('click', e => {
    const r = e.target.closest('[data-mi]');
    if (r) mtake(mItems[+r.dataset.mi]);
  });
  addEventListener('scroll', () => mshut(), true);
  addEventListener('resize', () => mshut());
  return mbox;
}
function mshut(){ if (mbox) mbox.classList.remove('on'); mOn = null; }
function mtake(it){ const f = mOn; mshut(); if (f && it) f(it); }
function mpaint(q){
  const list = q ? mItems.filter(x => (x.name + ' ' + (x.find||'')).toLowerCase()
                     .indexOf(q.toLowerCase()) >= 0) : mItems;
  mbox.querySelector('.pm-list').innerHTML = list.length
    ? list.map(x => `<button class="pm-row${mItems.indexOf(x)===mAt?' on':''}"
        data-mi="${mItems.indexOf(x)}"><b>${esc(x.name)}</b>${
        x.sub ? `<i>${esc(x.sub)}</i>` : ''}${x.kept?'<em>kept</em>':''}</button>`).join('')
    : `<div class="pm-none">nothing by that name</div>`;
}
/* menu(anchorEl, title, items, cb) — items are {name, sub, find, value, kept} */
function menu(anchor, title, items, cb){
  mshell(); mItems = items || []; mOn = cb; mAt = 0;
  const many = mItems.length > 7;
  mbox.innerHTML = `<div class="pm-head">${esc(title)}
      ${many ? '<input class="pm-find" placeholder="type to narrow" spellcheck="false">' : ''}</div>
    <div class="pm-list"></div>
    <div class="pm-foot"><button class="pm-blank" data-mi="-1">Write your own instead</button></div>`;
  mbox.querySelector('[data-mi="-1"]').addEventListener('click', () => mtake({ blank:true }));
  mpaint('');
  const f = mbox.querySelector('.pm-find');
  if (f) f.addEventListener('input', () => { mAt = 0; mpaint(f.value); });
  mbox.classList.add('on');
  place(anchor);
  if (f) setTimeout(() => f.focus(), 20);
}
function place(anchor){
  const a = anchor.getBoundingClientRect(), b = mbox.getBoundingClientRect();
  let top = a.bottom + 6, left = a.left;
  if (top + b.height > innerHeight - 12) top = Math.max(12, a.top - b.height - 6);
  if (left + b.width > innerWidth - 12) left = Math.max(12, innerWidth - b.width - 12);
  mbox.style.top = top + 'px'; mbox.style.left = left + 'px';
}
document.addEventListener('pointerdown', e => {
  if (mbox && mbox.classList.contains('on') && !e.target.closest('#pickmenu')
      && !e.target.closest('[data-s^="open"]')) mshut();
}, true);

/* ══ 3. THE CODEX ═════════════════════════════════════════════ */
let box, onTake = null, items = [], at = 0, filtered = [];
function shell(){
  if (box) return box;
  box = document.createElement('div');
  box.id = 'codex';
  box.innerHTML = `<div class="cx-scrim" data-cx="shut"></div>
  <div class="cx-box" role="dialog" aria-modal="true">
    <div class="cx-head">
      <span class="cx-mark">&#10022;</span>
      <h3 id="cx-title"></h3>
      <input id="cx-find" placeholder="search" autocomplete="off" spellcheck="false">
      <button class="cx-x" data-cx="shut" title="Escape">&#10005;</button>
    </div>
    <div class="cx-body">
      <div class="cx-list" id="cx-list"></div>
      <div class="cx-read" id="cx-read"></div>
    </div>
    <div class="cx-foot">
      <span class="cx-hint" id="cx-hint"></span>
      <button class="cx-blank" data-cx="blank">Write your own</button>
      <button class="cx-take" id="cx-take" data-cx="take">Take it</button>
    </div>
  </div>`;
  document.body.appendChild(box);
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-cx]');
    if (t){
      if (t.dataset.cx === 'shut') return shut();
      if (t.dataset.cx === 'blank') return done(null);
      if (t.dataset.cx === 'take') return done(filtered[at] || null);
    }
    const row = e.target.closest('[data-i]');
    if (row){ at = +row.dataset.i;
      if (row.dataset.dbl === '1') return done(filtered[at]);
      row.dataset.dbl = '1'; setTimeout(() => { if (row) delete row.dataset.dbl; }, 400);
      paint(); }
  });
  $('#cx-find').addEventListener('input', () => { at = 0; paint(); });
  return box;
}
function shut(){ if (box) box.classList.remove('on'); onTake = null; }
function done(entry){ const f = onTake; shut(); if (f) f(entry); }
function paint(){
  const q = ($('#cx-find').value || '').trim().toLowerCase();
  filtered = q ? items.filter(x => (x.name + ' ' + (x.sub||'') + ' ' + (x.find||''))
                    .toLowerCase().indexOf(q) >= 0) : items.slice();
  if (at >= filtered.length) at = Math.max(0, filtered.length - 1);
  $('#cx-list').innerHTML = filtered.length
    ? filtered.map((x,i) => `<button class="cx-row${i===at?' on':''}${x.kept?' kept':''}" data-i="${i}">
        <b>${esc(x.name)}</b>${x.sub?`<i>${esc(x.sub)}</i>`:''}
        ${x.kept?'<em>kept</em>':''}</button>`).join('')
    : `<div class="cx-empty">${q ? 'nothing by that name' : 'nothing written down yet'}</div>`;
  const cur = filtered[at];
  $('#cx-read').innerHTML = cur ? cur.read : `<div class="cx-none">
    <span>&#10022;</span><p>Pick one on the left to read it.</p></div>`;
  $('#cx-take').disabled = !cur;
  const row = $('#cx-list .cx-row.on'); if (row) row.scrollIntoView({block:'nearest'});
}
function open(title, hint, entries, cb){
  shell();
  items = entries || []; at = 0; onTake = cb;
  $('#cx-title').textContent = title;
  $('#cx-hint').innerHTML = hint || '';
  $('#cx-find').value = '';
  paint();
  box.classList.add('on');
  setTimeout(() => $('#cx-find').focus(), 30);
}
const isOpen = () => !!(box && box.classList.contains('on'));

document.addEventListener('keydown', e => {
  if (mbox && mbox.classList.contains('on')){
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); return mshut(); }
    const rows = [...mbox.querySelectorAll('.pm-row')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      const cur = rows.findIndex(r => +r.dataset.mi === mAt);
      const nx = Math.max(0, Math.min(rows.length-1, (cur<0?0:cur) + (e.key==='ArrowDown'?1:-1)));
      if (rows[nx]){ mAt = +rows[nx].dataset.mi;
        rows.forEach(r => r.classList.toggle('on', r === rows[nx]));
        rows[nx].scrollIntoView({block:'nearest'}); }
      return;
    }
    if (e.key === 'Enter'){ e.preventDefault(); return mtake(mItems[mAt]); }
    return;
  }
  if (!isOpen()) return;
  if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); return shut(); }
  if (e.key === 'ArrowDown'){ e.preventDefault(); at = Math.min(filtered.length-1, at+1); return paint(); }
  if (e.key === 'ArrowUp'){ e.preventDefault(); at = Math.max(0, at-1); return paint(); }
  if (e.key === 'Enter'){ e.preventDefault(); return done(filtered[at] || null); }
}, true);

/* ══════════════════════════════════════════════════════════════
   THE CROPPER

   A figure for the field is almost always a cut-out with a
   transparent background, so:
     · the output is PNG and alpha survives
     · the backing is NOTHING unless you ask for one
     · empty margins are trimmed off on load, so a render with
       three inches of nothing round it snaps to the figure
     · the preview stands it on a line of the table, which is
       where it is actually going to be seen
══════════════════════════════════════════════════════════════ */
let cbox, cImg, cState, cDone;
const SHAPES = {
  face: { w:400, h:400, out:512, round:true, ar:1,
          say:'Place the head in the ring. This is the picture beside your name everywhere else.' },
  body: { w:340, h:452, out:1024, round:false, ar:0.75,
          say:'This is what stands on the field. A cut-out stays cut out — leave the backing off and the board shows through.' }
};
function cshell(){
  if (cbox) return cbox;
  cbox = document.createElement('div');
  cbox.id = 'cropper';
  cbox.innerHTML = `<div class="cx-scrim" data-cr="shut"></div>
  <div class="cx-box crop">
    <div class="cx-head"><span class="cx-mark">&#10022;</span><h3 id="cr-title"></h3>
      <span class="cr-note" id="cr-alpha"></span>
      <button class="cx-x" data-cr="shut">&#10005;</button></div>
    <div class="cr-body">
      <div class="cr-stagewrap">
        <div class="cr-stage" id="cr-stage"><canvas id="cr-canvas"></canvas>
          <div class="cr-mask" id="cr-mask"></div>
          <div class="cr-grab" id="cr-grab"></div></div>
        <div class="cr-zoomrow"><span class="cr-lab">Zoom</span>
          <input type="range" id="cr-zoom" min="20" max="400" value="100"></div>
      </div>
      <div class="cr-side">
        <p class="cr-say" id="cr-say"></p>
        <div class="cr-row">
          <button class="cr-b" data-cr="fit">Fit whole</button>
          <button class="cr-b" data-cr="fill">Fill frame</button>
          <button class="cr-b" data-cr="trim">Snap to figure</button>
        </div>
        <div class="cr-row"><button class="cr-b" data-cr="left">Turn L</button>
          <button class="cr-b" data-cr="right">Turn R</button>
          <button class="cr-b" data-cr="flip">Mirror</button></div>
        <div class="cr-shapes" id="cr-shapes"></div>
        <span class="cr-lab">Backing</span>
        <div class="cr-row cr-bgs" id="cr-bgs"></div>
        <div class="cr-prevwrap"><span class="cr-lab" id="cr-prevlab"></span>
          <div class="cr-prev" id="cr-prev"></div></div>
      </div>
    </div>
    <div class="cx-foot"><span class="cx-hint">drag to place &#183; scroll to zoom</span>
      <button class="cx-blank" data-cr="shut">Cancel</button>
      <button class="cx-take" data-cr="use">Use it</button></div>
  </div>`;
  document.body.appendChild(cbox);
  cbox.addEventListener('click', e => {
    const t = e.target.closest('[data-cr]'); if (!t) return;
    const k = t.dataset.cr;
    if (k === 'shut') return cshut();
    if (k === 'use') return cuse();
    if (k === 'fit'){ cState.z = cState.fit; stand(); return sync(); }
    if (k === 'fill'){ cState.z = cState.fill; cState.x = cState.y = 0; return sync(); }
    if (k === 'trim'){ cState.trimmed = !cState.trimmed; measure();
      cState.z = cState.fit; stand(); return sync(); }
    if (k === 'left'){ cState.r = (cState.r + 270) % 360; cState.x = cState.y = 0; measure(); return sync(); }
    if (k === 'right'){ cState.r = (cState.r + 90) % 360; cState.x = cState.y = 0; measure(); return sync(); }
    if (k === 'flip'){ cState.flip = !cState.flip; return sync(); }
    if (k === 'bg'){ cState.bg = t.dataset.v; return sync(); }
    if (k === 'ar'){ cState.ar = +t.dataset.v; fitStage(); measure();
      cState.z = cState.fit; stand(); return sync(); }
  });
  const grab = cbox.querySelector('#cr-grab');
  let drag = null;
  grab.addEventListener('pointerdown', e => { drag = {x:e.clientX, y:e.clientY,
    ox:cState.x, oy:cState.y}; grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', e => { if (!drag) return;
    cState.x = drag.ox + (e.clientX - drag.x); cState.y = drag.oy + (e.clientY - drag.y); sync(); });
  grab.addEventListener('pointerup', () => { drag = null; });
  grab.addEventListener('pointercancel', () => { drag = null; });
  grab.addEventListener('wheel', e => { e.preventDefault();
    cState.z = Math.max(cState.fit*0.2, Math.min(cState.fit*6,
      cState.z * (e.deltaY > 0 ? 0.9 : 1.11))); sync(); }, {passive:false});
  cbox.querySelector('#cr-zoom').addEventListener('input', function(){
    cState.z = cState.fit * (+this.value / 100); sync(true); });
  return cbox;
}
function cshut(){ if (cbox) cbox.classList.remove('on'); cDone = null; }

const BACKS = [['','none'],['#161009','ink'],['#2f2117','oak'],['#4a3524','tan'],
               ['#1e2b23','moss'],['#eee4cc','vellum']];
const ARS = [[0.75,'3 : 4'],[0.66,'2 : 3'],[0.5,'1 : 2'],[1,'square']];

/* find what the picture actually contains, so a render surrounded by nothing
   does not arrive as a stamp in the middle of an empty frame */
function trimBox(img){
  const n = document.createElement('canvas');
  const k = Math.min(1, 400 / Math.max(img.width, img.height));
  n.width = Math.max(1, Math.round(img.width*k)); n.height = Math.max(1, Math.round(img.height*k));
  const cx = n.getContext('2d', {willReadFrequently:true});
  cx.drawImage(img, 0, 0, n.width, n.height);
  let d; try { d = cx.getImageData(0,0,n.width,n.height).data; }
  catch(e){ return { x:0, y:0, w:img.width, h:img.height, any:false }; }
  let x0 = n.width, y0 = n.height, x1 = -1, y1 = -1, clear = 0;
  for (let y = 0; y < n.height; y++) for (let x = 0; x < n.width; x++){
    const a = d[(y*n.width + x)*4 + 3];
    if (a < 16){ clear++; continue; }
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { x:0, y:0, w:img.width, h:img.height, any:false };
  const s = 1/k;
  return { x:x0*s, y:y0*s, w:(x1-x0+1)*s, h:(y1-y0+1)*s,
           any: clear > n.width*n.height*0.02 };
}
function fitStage(){
  const S = SHAPES[cState.kind];
  const H = S.h, W = Math.round(H * (cState.ar || S.ar));
  cState.sw = W; cState.sh = H;
  const st = cbox.querySelector('#cr-stage');
  st.style.width = W + 'px'; st.style.height = H + 'px';
}
/* put the figure's feet on the ground line rather than in the middle of the box */
function stand(){
  if (cState.kind !== 'body') { cState.x = cState.y = 0; return; }
  const src = cState.trimmed ? cState.box : { w:cImg.width, h:cImg.height };
  const swap = cState.r % 180 !== 0;
  const h = (swap ? src.w : src.h) * cState.z;
  cState.x = 0;
  cState.y = Math.round(cState.sh * 0.92 - cState.sh/2 - h/2);
}
function measure(){
  const swap = cState.r % 180 !== 0;
  const src = cState.trimmed ? cState.box : { w:cImg.width, h:cImg.height };
  const iw = swap ? src.h : src.w, ih = swap ? src.w : src.h;
  cState.fit  = Math.min(cState.sw/iw, cState.sh/ih) * 0.96;
  cState.fill = Math.max(cState.sw/iw, cState.sh/ih);
}
function drawInto(ctx, W, H, scale){
  ctx.clearRect(0,0,W,H);
  if (cState.bg){ ctx.fillStyle = cState.bg; ctx.fillRect(0,0,W,H); }
  const b = cState.trimmed ? cState.box : { x:0, y:0, w:cImg.width, h:cImg.height };
  ctx.save();
  ctx.translate(W/2 + cState.x*scale, H/2 + cState.y*scale);
  ctx.rotate(cState.r * Math.PI/180);
  ctx.scale(cState.z*scale * (cState.flip ? -1 : 1), cState.z*scale);
  ctx.drawImage(cImg, b.x, b.y, b.w, b.h, -b.w/2, -b.h/2, b.w, b.h);
  ctx.restore();
}
function sync(fromSlider){
  const c = cbox.querySelector('#cr-canvas'), ctx = c.getContext('2d');
  c.width = cState.sw; c.height = cState.sh;
  drawInto(ctx, cState.sw, cState.sh, 1);
  if (!fromSlider) cbox.querySelector('#cr-zoom').value =
    Math.round(Math.max(20, Math.min(400, (cState.z / cState.fit) * 100)));
  cbox.querySelectorAll('.cr-bg').forEach(b =>
    b.classList.toggle('on', (b.dataset.v||'') === (cState.bg||'')));
  cbox.querySelectorAll('[data-cr="ar"]').forEach(b =>
    b.classList.toggle('on', +b.dataset.v === cState.ar));
  const t = cbox.querySelector('[data-cr="trim"]');
  if (t) t.classList.toggle('on', !!cState.trimmed);
  const url = c.toDataURL('image/png');
  cbox.querySelector('#cr-prev').innerHTML = cState.kind === 'face'
    ? `<div class="cr-pv face" style="background-image:url('${url}')"></div>`
    : `<div class="cr-field"><div class="cr-standee" style="background-image:url('${url}')"></div>
       <div class="cr-shadow"></div><div class="cr-line"></div></div>`;
}
function cropOpen(kind, file, cb){
  cshell(); cDone = cb;
  const S = SHAPES[kind];
  cbox.querySelector('#cr-title').textContent = kind === 'face' ? 'The Face' : 'The Figure';
  cbox.querySelector('#cr-say').textContent = S.say;
  cbox.querySelector('#cr-mask').className = 'cr-mask ' + kind;
  cbox.querySelector('#cr-prevlab').textContent =
    kind === 'face' ? 'As it will be seen' : 'As it will stand';
  cbox.querySelector('#cr-shapes').innerHTML = kind === 'body'
    ? `<span class="cr-lab">Frame</span><div class="cr-row">${ARS.map(([v,n]) =>
        `<button class="cr-b sm" data-cr="ar" data-v="${v}">${n}</button>`).join('')}</div>` : '';
  cbox.querySelector('#cr-bgs').innerHTML = BACKS.map(([v,n]) =>
    `<button class="cr-bg${v?'':' none'}" data-cr="bg" data-v="${v}" title="${n}"
       style="${v?`background:${v}`:''}"></button>`).join('');
  const fr = new FileReader();
  fr.onload = () => {
    cImg = new Image();
    cImg.onload = () => {
      const box = trimBox(cImg);
      cState = { kind, x:0, y:0, r:0, z:1, flip:false, bg:'', box,
                 trimmed: box.any, ar: S.ar };
      cbox.querySelector('#cr-alpha').textContent = box.any
        ? 'cut-out picture — the backing is off, so it stays cut out' : '';
      fitStage(); measure();
      cState.z = kind === 'face' && !box.any ? cState.fill : cState.fit;
      stand(); sync();
      cbox.classList.add('on');
    };
    cImg.onerror = () => cb(null, 'that file is not a picture');
    cImg.src = fr.result;
  };
  fr.onerror = () => cb(null, 'could not read that file');
  fr.readAsDataURL(file);
}
function cuse(){
  const S = SHAPES[cState.kind];
  const scale = S.out / Math.max(cState.sw, cState.sh);
  const W = Math.round(cState.sw * scale), H = Math.round(cState.sh * scale);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  drawInto(c.getContext('2d'), W, H, scale);
  /* PNG, always: a JPEG would fill the transparent part with black */
  const url = c.toDataURL('image/png');
  const f = cDone; cshut(); if (f) f(url);
}
document.addEventListener('keydown', e => {
  if (cbox && cbox.classList.contains('on') && e.key === 'Escape'){
    e.preventDefault(); e.stopPropagation(); cshut(); }
}, true);

window.Codex = { open, shut, isOpen, menu, menuShut: mshut, crop: cropOpen };
})();
