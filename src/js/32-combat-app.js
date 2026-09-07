/* ═══════════════════════════════════════════════════════════════
   MONARCHY — LINE OF BATTLE, interaction demo
   Standalone. No Firebase, no persistence, not wired to the app.

   The board is DATA. The DOM is a view of it. Every interaction
   mutates state and re-renders — the same flip as plan task P1-5,
   which is why moving a unit is four lines here instead of a DOM
   surgery problem.
═══════════════════════════════════════════════════════════════ */
const ROLE = window.__ROLE__;          // 'gm' | 'player'
const ME   = 'sa';                     // which character the player controls
/* Rules 8, Turn Order: the GM DECLARES mana-in-the-air, then players act,
   then allies, then enemies. Declaring mana is setup, not a phase anyone
   acts in — it was wrong to list it alongside the three acting phases. */
const PHASES = ['Players','Allies','Enemies'];
/* The token list lives in the rules engine now, with what each one actually
   DOES attached to it — this was a second, dumber copy that knew only which
   colour to paint. One source of truth; the colour is read off the sign. */
const TOKEN_CLASS = { good:'g', neutral:'n', bad:'b' };
const tokClass = n => TOKEN_CLASS[((window.RULES && RULES.TOKENS[n]) || {}).sign] || 'n';
const tokNames = () => Object.keys((window.RULES && RULES.TOKENS) || {});

let S = {
  round: 3, phase: 0, sug: null, intent: null, width: 6, mana: 14, sel: null, drag: null,
  lines: [
    { key:'e-back',  side:'en', label:'Backline',  depth:0, ents:[
      { id:'cr1', kind:'unit', mono:'CR', name:'Crow Archer',   hp:18, max:18, acted:true },
      { id:'cr2', kind:'unit', mono:'CR', name:'Crow Archer',   hp:22, max:22 },
      { id:'bl',  kind:'form', mono:'BL', name:'Bone Levy', alive:8, total:12, hpea:1, dmg:2, skl:'4+', def:'—', lead:'Wavering' },
      { id:'rv1', kind:'unit', mono:'RV', name:'Ravener',       hp:16, max:16 },
      { id:'rv2', kind:'unit', mono:'RV', name:'Ravener',       hp:9,  max:14, cond:[{n:'Bleed',c:2}] } ]},
    { key:'e-supp', side:'en', label:'Support',   depth:1, ents:[
      { id:'py1', kind:'unit', mono:'PY', name:'Pyre-Adept',    hp:14, max:14 },
      { id:'py2', kind:'unit', mono:'PY', name:'Pyre-Adept',    hp:16, max:16, cond:[{n:'Hardened',c:1}] },
      { id:'as1', kind:'unit', mono:'AS', name:'Ash Cantor',    hp:16, max:16, acted:true } ]},
    { key:'e-sec',  side:'en', label:'Secondary', depth:2, ents:[
      { id:'gr1', kind:'unit',  mono:'GR', name:'Grave Serjeant', hp:20, max:20 },
      { id:'hk',  kind:'large', mono:'HK', name:'Hollow Knight',  hp:70, max:70, sz:'Large' },
      { id:'gr2', kind:'unit',  mono:'GR', name:'Grave Serjeant', hp:18, max:18 },
      { id:'gr3', kind:'unit',  mono:'GR', name:'Grave Serjeant', hp:20, max:20 } ]},
    { key:'e-front',side:'en', label:'Frontline', depth:3, front:true, ents:[
      { id:'bw1', kind:'unit', mono:'BW', name:'Barrow Warden', hp:21, max:35, cond:[{n:'Taunt',c:1},{n:'Winded',c:3}] },
      { id:'bw2', kind:'unit', mono:'BW', name:'Barrow Warden', hp:30, max:30, cond:[{n:'Guard',c:1}] } ]},
    { key:'a-front',side:'al', label:'Frontline', depth:3, front:true, ents:[
      { id:'hr1', kind:'unit', mono:'HR', name:'Hedge Rider', hp:30, max:30, cond:[{n:'Dodge',c:2}] },
      { id:'th',  kind:'unit', mono:'TH', name:'Thane Bryn',  hp:34, max:34, pc:true, acted:true },
      { id:'ip',  kind:'form', mono:'IP', name:'Iron Phalanx', alive:10, total:10, hpea:2, dmg:3, skl:'4+', def:'5+', lead:'Stable' },
      { id:'hr2', kind:'unit', mono:'HR', name:'Hedge Rider', hp:30, max:30 },
      { id:'sa',  kind:'unit', mono:'SA', name:'Sir Aldric',  hp:28, max:28, pc:true, cond:[{n:'Guard',c:1}],
        sta:'7/9', str:'2/8', move:2, role:'Winged Lancer',
        /* A PLAYER CHARACTER CARRIES A SHEET. Everything the rules engine needs
           to answer "what does this ability do, right now, for me" lives here —
           attributes, the skill tree, what is in their hands, and what they have
           learned. NPCs do not need one: the GM is their sheet. */
        sheet:{
          attrs:{ fortitude:6, prowess:7, dexterity:6, nimble:5,
                  willpower:4, intelligence:3, presence:5, charisma:4 },
          skills:{ 'Melee Weapons':3, 'Polearms':2, 'Spears':2,
                   'Shields':1, 'Heavy':1, 'Blunt':1, 'Maces':2, 'Resilience':2 },
          size:'medium', armourValue:4, stamina:7, maxStamina:9,
          weapons:['spear','great-mace-decrepit'], equipped:'spear',
          styles:['impervious-spearmanship'],
          /* Favor is banked PER ART. Aldric has sworn to nobody, so he has no
             Favor — the 22 that used to sit here was mine, twice over. */
          arts:[], lores:[], traits:['wardens-sense'],
        } } ]},
    { key:'a-sec',  side:'al', label:'Secondary', depth:2, ents:[
      { id:'mb1', kind:'unit',  mono:'MB', name:'Marsh Blade', hp:26, max:28 },
      { id:'va',  kind:'large', mono:'VA', name:'Vashka', hp:62, max:62, sz:'Large', pc:true },
      { id:'mb2', kind:'unit',  mono:'MB', name:'Marsh Blade', hp:26, max:26, acted:true } ]},
    { key:'a-supp', side:'al', label:'Support',   depth:1, ents:[
      { id:'be1', kind:'unit', mono:'BE', name:'Bell-Cleric',  hp:20, max:20 },
      { id:'mi',  kind:'unit', mono:'MI', name:'Mirri',        hp:18, max:18, pc:true, cond:[{n:'Daze',c:1}] },
      { id:'fs1', kind:'unit', mono:'FS', name:'Field Surgeon',hp:18, max:18 } ]},
    { key:'a-back', side:'al', label:'Backline',  depth:0, ents:[
      { id:'ve',  kind:'unit', mono:'VE', name:'Vessel-Mage', hp:16, max:16 },
      { id:'lo',  kind:'unit', mono:'LO', name:'Lord Marcen', hp:18, max:18, cond:[{n:'Inspiration',c:1}] },
      { id:'ln1', kind:'unit', mono:'LN', name:'Longbowman',  hp:16, max:16 },
      { id:'ln2', kind:'unit', mono:'LN', name:'Longbowman',  hp:16, max:16 } ]},
  ]
};

/* every entity carries its own allegiance, set once from where it started */
S.lines.forEach(l => l.ents.forEach(e => { if (!e.side) e.side = l.side;
  if (e.move===undefined) e.move = e.kind==='form' ? 1 : 2;
  if (e.q===undefined) { e.q = !e.acted; e.f = !e.acted; } }));

/* ── rules helpers ── */
const slotsOf = e => e.kind==='unit' ? 1 : e.kind==='large' ? 2 : (e.wide ? 3 : 2);
const usedIn  = l => l.ents.reduce((n,e)=>n+slotsOf(e),0);
const lineOf  = id => S.lines.find(l => l.ents.some(e=>e.id===id));
const entById = id => { for(const l of S.lines){ const e=l.ents.find(x=>x.id===id); if(e) return e; } return null; };
/* players may only command their own character; the GM commands everything */
const canControl = e => ROLE==='gm' || e.id===ME;
/* Rules 8, Movement: 1 line costs a QUICK action; spending your FULL action
   moves up to your move speed in lines. Move speed comes from passive Agility
   (Dexterity): 1-3 -> 1, 4-6 -> 2, 7-8 -> 3, 9-10 -> 4.
   Lines form one mirrored track, so distance is just the index gap. */
const idxOf = l => S.lines.indexOf(l);
const distTo = (e,l) => Math.abs(idxOf(lineOf(e.id)) - idxOf(l));
function costOf(e,l){
  const d = distTo(e,l);
  if (d===0) return null;
  if (d===1 && e.q) return 'quick';
  if (d<=(e.move||0) && e.f) return 'full';
  return null;
}
/* The GM is the arbiter, not the app: no range check, no action cost. Players
   get reach shown as GUIDANCE, and their move is a suggestion the GM resolves.
   The battlefield's WIDTH is the one hard limit, for both roles — a line holds
   what it holds, and letting a rank grow past it also quietly changed the size
   of every piece in it, because the columns share a fixed width. */
const canDrop = (e,l) => canControl(e) && lineOf(e.id)!==l
  && usedIn(l)+slotsOf(e) <= S.width;
const inReach = (e,l) => costOf(e,l)!==null;

/* ── columns ──────────────────────────────────────────────────
   A unit sits in a SLOT, not at a position in a list. Gaps are legal — a rank
   with a hole in the middle is a real formation, not an error — so the only
   thing placement forbids is two units wanting the same ground. */
let mark = null, dropped = 0;    // a one-shot animation class, and see the drop handler
const colOf   = e => (e.col == null ? 0 : e.col);
const endOf   = e => colOf(e) + slotsOf(e);
/* Always the battlefield width. A rank never grows: `minmax(0,1fr)` columns
   share a fixed rank, so one extra column would shrink every piece in that line
   and nothing else on the sheet — the board would stop being one board. */
const colsOf  = () => S.width;
/* whatever is already standing on [col, col+span) */
function occupants(l, e, col, span){
  span = span || slotsOf(e);
  return l.ents.filter(o => o !== e && col < endOf(o) && col + span > colOf(o));
}
const clashAt = (l, e, col, span) => occupants(l, e, col, span).length > 0;
/* One piece of the same width can be swapped with rather than refused — which
   is the only way to reorder a line that has no gaps left in it. */
function swapTarget(l, e, col, span){
  const hit = occupants(l, e, col, span);
  return hit.length === 1 && slotsOf(hit[0]) === slotsOf(e) ? hit[0] : null;
}
/* the leftmost run of `span` free columns, preferring `want` if it is clear */
function firstFree(l, span, want, ignore){
  const fits = c => c >= 0 && !l.ents.some(o =>
    o !== ignore && c < endOf(o) && c + span > colOf(o));
  if (want != null && fits(want)) return want;
  const cols = Math.max(S.width, colsOf(l, span));
  for (let c = 0; c + span <= cols; c++) if (fits(c)) return c;
  return cols;                                   // past the edge: the line grows
}
/* SHOVING. Nudging a wide piece along a rank is the one placement that cannot
   work by looking for a hole: a large unit or a formation is two columns, and
   two ADJACENT clear columns almost never exist right where you are aiming, so
   every attempt to reorder one got refused or thrown to the far end of the line.
   On a table you would just push the models along, so that is what this does —
   set the piece down and shove whatever it lands on out of the way, cascading,
   as long as the rank still fits. Anything outside the shove's path keeps its
   column, gaps included; this is not a re-pack.

   Which WAY each displaced piece goes is decided per piece, not per shove: it
   moves away from the incoming piece, in the direction it already lies. One
   rule, and it produces all three things you would expect —

     put it down between two units      -> they split, one each way
     put it down mostly on the left one -> both shuffle right
     put it down mostly on the right one-> both shuffle left

   dir forces a single direction instead (0 = decide per piece), which is the
   fallback when a split will not fit inside the rank. */
function shove(l, e, col, span, dir, cols){
  const pos = new Map();
  l.ents.forEach(o => { if (o !== e) pos.set(o, colOf(o)); });
  const mid = col + span/2;
  /* sides are read from the ORIGINAL layout — a piece must not change which way
     it is going because something else was pushed past it first */
  const side = new Map([...pos.keys()].map(o =>
    [o, dir || ((pos.get(o) + slotsOf(o)/2) < mid ? -1 : 1)]));
  const on = d => [...pos.keys()].filter(o => side.get(o) === d);

  let edge = col + span;                                   // rightward sweep
  on(1).sort((a,b) => pos.get(a) - pos.get(b)).forEach(o => {
    const c = pos.get(o), w = slotsOf(o);
    if (c + w <= col) return;               // already wholly clear to the left
    if (c < edge){ pos.set(o, edge); edge += w; } else edge = c + w;
  });
  edge = col;                                              // leftward sweep
  on(-1).sort((a,b) => pos.get(b) - pos.get(a)).forEach(o => {
    const c = pos.get(o), w = slotsOf(o);
    if (c >= col + span) return;            // already wholly clear to the right
    if (c + w > edge){ pos.set(o, edge - w); edge -= w; } else edge = c;
  });
  for (const [o, c] of pos) if (c < 0 || c + slotsOf(o) > cols) return null;
  return pos;
}

/* WHERE A DROP ACTUALLY LANDS. You aim roughly; the line takes you in. A piece
   slides to the nearest clear ground rather than being refused — on a table you
   do not miss a slot by an inch, you put the model down and it ends up
   somewhere sensible. Refusal is for a line with genuinely no room.

   Swapping is ordered differently depending on where the piece came from, and
   the reason is what the two gestures MEAN:
     · within its own line you are dressing the rank — you aimed at that unit,
       so trading places is the intent, and sliding to the nearest gap would
       just put the piece back where it started (its own slot is the gap).
     · from another line you are making a move. Landing on somebody should not
       quietly deport them, so a sloppy aim slides to clear ground instead, and
       a trade only happens when the destination has no room at all. */
function resolveDrop(l, e, want, span){
  span = span || slotsOf(e);
  const same = lineOf(e.id) === l;
  const cols = S.width;
  const lim  = cols - span;                          // last legal start column
  const at   = Math.max(0, Math.min(lim, want == null ? 0 : want));
  const swap = () => { const t = swapTarget(l, e, at, span);
                       return t ? { col: at, mode: 'swap', tgt: t } : null; };
  const fit  = () => { for (let d = 1; d <= lim + span; d++){
                         const a = at - d, b = at + d;
                         if (a >= 0   && !clashAt(l, e, a, span)) return { col: a, mode: 'fit' };
                         if (b <= lim && !clashAt(l, e, b, span)) return { col: b, mode: 'fit' };
                       } return null; };
  /* displaced pieces fill the ground the dragged one is leaving; if they cannot
     all fit that way, try pushing them ahead of it instead */
  const push = () => { /* split first; a single direction only if that will not fit */
                       const m = shove(l, e, at, span,  0, cols)
                              || shove(l, e, at, span,  1, cols)
                              || shove(l, e, at, span, -1, cols);
                       return m ? { col: at, mode: 'push', pos: m } : null; };
  if (!clashAt(l, e, at, span)) return { col: at, mode: 'free' };
  return (same ? (swap() || push() || fit())
               : (fit()  || push() || swap())) || { col: at, mode: 'none' };
}

/* Lays a line out centred, which is how every line starts and how a line with
   no gaps in it reads. Called once at load so the board opens looking packed. */
function packLine(l){
  let c = Math.max(0, (S.width - usedIn(l)) >> 1);
  l.ents.forEach(e => { e.col = c; c += slotsOf(e); });
}

/* ── render ── */
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* stacks are shown as NAME xN — a count, not a baked-in string */
function condHTML(c){ return '<div class="cd">'+(c||[]).map(t=>
  `<i class="${tokClass(t.n)}">${esc(t.n)}${t.c>1?`<b>${t.c}</b>`:''}</i>`).join('')+'</div>'; }

function entHTML(e){
  /* A unit that charges into enemy lines is still on its own side. Colour
     from e.side (who it belongs to), never from the line it happens to occupy. */
  const cls = ['ent', e.kind==='large'?'lg':e.kind==='form'?'fm':'',
    (e.side==='en'?'en-e':'al-e'),
    e.id===S.sel?'sel':'', e.id===S.drag?'dragging':'', e.pc?'pc':'',
    (mark && mark.id===e.id && performance.now() < mark.until) ? mark.cls : '',
    (!e.q && !e.f)?'spent':'',
    canControl(e)?'can':'locked'].filter(Boolean).join(' ');
  const d = canControl(e) ? 'draggable="true"' : '';
  /* the cell carries its own column and width, so working out where a drop
     lands never has to be inferred from measured pixel widths */
  const g = `data-col="${colOf(e)}" data-span="${slotsOf(e)}"`;
  if (e.kind==='form'){
    const pct = Math.round(e.alive/e.total*100);
    const lk = {Stable:'',Wavering:'wv',Crumbling:'cr',Broken:'bk',Unbreakable:''}[e.lead];
    return `<div class="${cls}" data-id="${e.id}" ${g} ${d}><div class="plate">
      <div class="plaque fmcap">${esc(e.name)}</div>
      <div class="must"><span class="mchan"><i style="width:${pct}%"></i></span>
        <span class="mct">${e.alive}<em>/${e.total}</em></span></div>
      <div class="rows"><div class="rcol">
        <div class="srow"><u>Hit</u><span class="ld"></span><s>${e.skl}</s></div>
        <div class="srow"><u>Dmg</u><span class="ld"></span><s>${e.dmg}</s></div></div>
        <div class="rcol"><div class="srow"><u>HP ea</u><span class="ld"></span><s>${e.hpea}</s></div>
        <div class="srow${e.def==='—'?' dim':''}"><u>Def</u><span class="ld"></span><s>${e.def}</s></div>
      </div></div><div class="fmld ${lk}">${e.lead}</div>
      <span class="pz f"></span><span class="pz b"></span><span class="pz l"></span><span class="pz r"></span>
    </div></div>`;
  }
  const art = e.kind==='large'
    ? `<div class="shield"><i></i><b></b><span class="mono">${e.mono}</span></div>`
    : `<div class="tok"><span class="mono">${e.mono}</span></div>`;
  const hurt = e.hp < e.max ? ' hurt' : '';
  const pips = `<span class="ap"><i class="${e.q?'on':''}"></i><i class="${e.f?'on':''}"></i></span>`;
  const inner = `<div class="art">${art}${pips}</div><div class="ped"></div>
    <div class="nm">${esc(e.name)}</div>${e.sz?`<div class="sz">${e.sz}</div>`:''}
    <div class="hp${hurt}">${e.hp}/${e.max}</div>${condHTML(e.cond)}`;
  return e.kind==='large'
    ? `<div class="${cls}" data-id="${e.id}" ${g} ${d}>${inner}</div>`
    : `<div class="slot" ${g}><div class="${cls}" data-id="${e.id}" ${d}>${inner}</div></div>`;
}

function lineHTML(l){
  const used = usedIn(l);
  /* destinations light up for BOTH drag and click-to-move, so the
     keyboard/click path has the same affordance as dragging */
  const active = (S.drag || S.sel) ? entById(S.drag || S.sel) : null;
  let state = '';
  if (active && canControl(active) && lineOf(active.id)!==l){
    if (!canDrop(active,l)) state = ' full';
    else state = inReach(active,l) ? ' valid' : ' reach';   // reach = allowed, but past move speed
  }
  if (S.sug && S.sug.to===l.key) state += ' sugline';
  /* One bar per line on this side, not a hard-coded four: lines can be added
     and removed now (41-lines-edit.js), and a fixed four either ran out of
     bars or drew empty ones. */
  const deep = S.lines.filter(x => x.side === l.side).length;
  const bars = Array.from({length: deep}, (_,i)=>`<i class="${i===l.depth?'on':''}"></i>`).join('');
  const ghost = (S.sug && S.sug.to===l.key)
    ? `<div class="slot"><div class="ent ghost ${entById(S.sug.id).side==='en'?'en-e':'al-e'}">
        <div class="art"><div class="tok"><span class="mono">${entById(S.sug.id).mono}</span></div></div>
        <div class="nm">${esc(entById(S.sug.id).name)}</div></div></div>` : '';
  /* A line is COLUMNS, not a packed list. Every unit holds an actual slot, so
     you can leave a hole in the middle of a rank if that is how the fight looks
     — only overlapping is forbidden. The GM has no limits either, so the rank
     grows past the battlefield width rather than wrapping. */
  const cols = colsOf(l, ghost ? 1 : 0);
  const at = {}; l.ents.forEach(e => at[colOf(e)] = e);
  const gcol = ghost ? firstFree(l, 1, S.sug.col) : -1;
  let cells = '';
  for (let i = 0; i < cols; i++){
    const e = at[i];
    if (e){ cells += entHTML(e); i += slotsOf(e) - 1; continue; }
    if (i === gcol){ cells += ghost; continue; }
    cells += `<div class="free" data-line="${l.key}" data-col="${i}"></div>`;
  }
  const over = used > S.width ? ' over' : '';
  return `<div class="line${l.front?' front':''}${state}${l.ents.length?'':' empty'}" data-line="${l.key}">
    <div class="tab"><span class="depth">${bars}</span><span>${esc(l.label)}</span></div>
    <div class="rank" style="--w:${cols}">${cells}</div>
    <div class="cap${over}"><b>${used}<em>/${S.width}</em></b><span>slots</span></div></div>`;
}

/* No log panel — chat already sits beside the table. The only thing that
   earns space here is the declaration the GM has to rule on. */
function sugHTML(){
  if (!S.sug) return '';
  const e = entById(S.sug.id), to = S.lines.find(l=>l.key===S.sug.to);
  const where = `${to.side==='en'?'Enemy':'Ally'} ${to.label}`;
  return `<div class="sugbar">
    <span class="plaque">${ROLE==='gm'?'Declared':'Your intent'}</span>
    <span class="sugtxt"><b>${esc(e.name)}</b> intends to move to <b>${where}</b>
      <em>${esc(S.sug.note)}</em></span>
    ${ROLE==='gm'
      ? `<span class="sugacts"><button class="act" id="sug-yes">Allow</button>
           <button class="act" id="sug-no">Dismiss</button></span>`
      : `<span class="sugacts"><button class="act" id="sug-no">Withdraw</button></span>`}
  </div>`;
}

function render(){
  const en = S.lines.filter(l=>l.side==='en'), al = S.lines.filter(l=>l.side==='al');
  document.getElementById('field').innerHTML =
    `<div class="boards">
     <div class="half en"><div class="plaque">Enemy</div>
       <div class="board frame diaper" style="--w:${S.width}">${en.map(lineHTML).join('')}</div></div>
     <div class="mid"><span>The Line</span></div>
     <div class="half al"><div class="plaque">Ally</div>
       <div class="board frame diaper" style="--w:${S.width}">${al.map(lineHTML).join('')}</div></div>
     </div>`;
  /* the declaration bar carries both kinds of proposal: a move a player wants
     to make, and an ability they want to use. Both are things the GM answers. */
  document.getElementById('sugbar').innerHTML = sugHTML() +
    (window.__intentHTML ? window.__intentHTML() : '');
  if (window.__abilityPanel) window.__abilityPanel();
  setTimeout(placeSelbar, 0);
  document.getElementById('round').textContent = String(S.round).padStart(2,'0');
  document.getElementById('mana').textContent = S.mana;
  [...document.querySelectorAll('.ph')].forEach((el,i)=>{
    el.className = 'ph' + (i===S.phase?' now' : i<S.phase?' done':''); });
  renderSel();
}

function renderSel(){
  const bar = document.getElementById('selbar'), e = S.sel ? entById(S.sel) : null;
  if (!e){
    bar.className='selbar none';
    bar.innerHTML = `<div class="pt"><span class="mono">—</span></div>
      <div class="sid"><div class="n">Nothing selected</div><div class="s">&nbsp;</div></div>
      <div class="hint">Click a unit to select it${ROLE==='gm'?'' : ' — you can only move Sir Aldric'}. Drag it, or pick a highlighted line, to move.</div>
      <div class="role">View <b>${ROLE==='gm'?'Game Master':'Player'}</b></div>`;
    return;
  }
  bar.className='selbar';
  const l = lineOf(e.id), side = e.side==='en'?'Enemy':'Ally';
  const behind = e.side!==l.side ? ' &middot; behind enemy lines' : '';
  const kind = e.kind==='form' ? 'Formation' : e.kind==='large' ? 'Large unit' : (e.pc?'Player':'Unit');
  const stats = e.kind==='form'
    ? [['Bodies',`${e.alive}/${e.total}`],['HP ea',e.hpea],['Hit',e.skl],['Dmg',e.dmg],['Def',e.def]]
    : [['Health',`${e.hp}/${e.max}`],['Stamina',e.sta||'—'],['Stress',e.str||'—'],['Ward','—'],['Move',e.move||'—']];
  const editable = ROLE==='gm' || canControl(e);
  const toks = ((e.cond||[]).map((t,i)=>
      `<span class="tk ${tokClass(t.n)}">${esc(t.n)} <span class="n">${t.c}</span>`+
      (editable?`<button class="tkbtn" data-tk="${i}" data-d="-1">&minus;</button>`+
                `<button class="tkbtn" data-tk="${i}" data-d="1">+</button>`:'')+`</span>`).join('')
    || '<span class="tk">None</span>')
    + (editable ? `<span class="tkadd"><select id="tk-add"><option value="">+ add token…</option>`+
        tokNames().map(n=>`<option>${n}</option>`).join('')+`</select></span>` : '');
  bar.innerHTML = `<div class="pt"><span class="mono">${e.mono}</span></div>
    <div class="sid"><div class="n">${esc(e.name)}</div><div class="s">${side} &middot; ${kind} &middot; ${esc(l.label)}${behind}</div></div>
    <div class="sst">${stats.map(([k,v])=>`<div class="st"><span class="l">${k}</span><span class="v${v==='—'?' d':''}">${v}</span></div>`).join('')}</div>
    <div class="stk"><span class="l">Tokens</span><div class="row">${toks}</div></div>
    <div class="acts">
      <button class="act ${e.q?'':'on'}" id="act-q" ${canControl(e)?'':'disabled'}>Quick ${e.q?'':'&#10007;'}</button>
      <button class="act ${e.f?'':'on'}" id="act-f" ${canControl(e)?'':'disabled'}>Full ${e.f?'':'&#10007;'}</button>
      <button class="act" id="act-hurt" ${canControl(e)||ROLE==='gm'?'':'disabled'}>Take 5</button>
      <button class="act" id="act-heal" ${canControl(e)||ROLE==='gm'?'':'disabled'}>Heal 5</button>
    </div>
    <div class="role">View <b>${ROLE==='gm'?'Game Master':'Player'}</b></div>`;
}

/* ── actions ── */
function log(msg){ toast(msg); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg;
  t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),1600); }

/* WHERE along the rank is the pointer, in columns? The grid's columns are equal,
   but the rank is 3D-transformed, so measure a real cell rather than the rank's
   bounding box — a tilted rect's box is a trapezoid and its edges lie about
   where it is.

   The answer is FRACTIONAL — 2.5 means the middle of column 2 — because a
   two-wide piece has no centre column to sit on. Rounding here and centring
   later pins the pointer to the piece's left edge instead of its middle, which
   is the whole difference between placing a formation and guessing at it. */
function dropCol(lineEl, clientX){
  const rank = lineEl.querySelector('.rank');
  const cols = +getComputedStyle(rank).getPropertyValue('--w') || S.width;
  let best = 0.5, bd = Infinity;
  [...rank.children].forEach(c => {
    if (c.classList.contains('dropzone')) return;
    const col = +c.dataset.col || 0, span = +c.dataset.span || 1;
    const r = c.getBoundingClientRect();
    if (r.width < 1) return;
    /* MEASURE WHERE THE CELL LIVES, NOT WHERE IT IS CURRENTLY DRAWN. The
       preview slides cells aside with `translate`, and a bounding rect includes
       that — so hit-testing the drawn boxes made the column under the pointer
       move as the rank parted, which moved the preview, which moved the boxes.
       The exact thing the column model exists to prevent, reintroduced through
       one call. Undo the slide: it is a pure x offset in the rank's own units,
       and rect.width / offsetWidth is the scale to put it in screen pixels.
       Read the COMPUTED translate, not the inline one — the inline value is
       where the cell is going, and the slide is a transition, so mid-slide the
       two disagree by up to a whole column. */
    const slid = (parseFloat(getComputedStyle(c).translate) || 0) * (r.width / (c.offsetWidth || 1));
    const left = r.left - slid, right = r.right - slid;
    if (clientX >= left && clientX <= right){
      best = col + span * (clientX - left) / (right - left);
      bd = -1;
    } else if (bd >= 0){
      const d = clientX < left ? left - clientX : clientX - right;
      if (d < bd){ bd = d; best = clientX < left ? col : col + span; }
    }
  });
  return Math.max(0, Math.min(cols, best));
}
/* The first column a piece would OCCUPY. `at` is a fractional position along the
   rank, so the piece is hung around it — a one-slot piece lands on the column
   under the pointer, a two-slot piece straddles it, a three-slot piece centres
   on it. Whatever the width, the pointer is in the middle of the thing you are
   holding, which is where you are looking. */
function targetCol(l, e, at){
  const span = slotsOf(e);
  const cols = Math.max(S.width, colsOf(l, span));
  return Math.max(0, Math.min(cols - span, Math.round(at - span/2)));
}

function move(id, key, col){
  const e = entById(id), from = lineOf(id), to = S.lines.find(l=>l.key===key);
  if (!to) return;
  if (!canControl(e)) { refuse(id, 'You cannot command that'); return; }
  const want = col == null ? null : targetCol(to, e, col);

  /* Same line = dressing the line, not movement. Nobody advances, nothing is
     spent, and the GM has nothing to rule on — so even a player just does it. */
  if (from === to){
    if (want == null) return;
    const r = resolveDrop(to, e, want);
    if (r.mode === 'none'){ refuse(e.id, 'No room there'); return; }
    if (r.col === colOf(e) && r.mode === 'free') return;
    if (r.mode === 'swap'){ const mine = colOf(e); e.col = colOf(r.tgt); r.tgt.col = mine; }
    else { if (r.pos) r.pos.forEach((c, o) => { o.col = c; }); e.col = r.col; }
    to.ents.sort((a,b) => colOf(a) - colOf(b));
    render(); landed(e.id); return;
  }

  if (ROLE==='player'){
    /* Nothing actually moves. A player DECLARES where they mean to go and the
       GM resolves it at the table. Resources are untouched until then. */
    const d = distTo(e,to), cost = costOf(e,to);
    const r = want == null ? null : resolveDrop(to, e, want);
    if (r && r.mode === 'none'){ refuse(e.id, 'No room there'); return; }
    S.sug = { id:e.id, to:to.key, d, col: r ? r.col : null,
      note: cost ? `${cost} action` : (d>(e.move||0) ? `${d} lines — past move speed ${e.move}` : 'no action left') };
    toast('Suggested — waiting on the GM');
    render(); return;
  }

  if (usedIn(to)+slotsOf(e) > S.width){ refuse(e.id, 'That line is full'); return; }
  const r = want == null
    ? { col: firstFree(to, slotsOf(e), null, e), mode: 'free' }
    : resolveDrop(to, e, want);
  if (r.mode === 'none'){ refuse(e.id, 'No room there'); return; }
  const swap = r.mode === 'swap' ? r.tgt : null;
  const mine = colOf(e);
  from.ents.splice(from.ents.indexOf(e),1);
  if (swap){
    /* a straight exchange: they trade both line and slot */
    to.ents.splice(to.ents.indexOf(swap),1);
    e.col = colOf(swap); swap.col = mine;
    to.ents.push(e); from.ents.push(swap);
    from.ents.sort((a,b) => colOf(a) - colOf(b));
  } else {
    if (r.pos) r.pos.forEach((c, o) => { o.col = c; });
    e.col = r.col;
    to.ents.push(e);
  }
  to.ents.sort((a,b) => colOf(a) - colOf(b));
  render(); landed(e.id);
}
function resolveSug(accept){
  if (!S.sug) return;
  if (accept){ const e=entById(S.sug.id), from=lineOf(e.id), to=S.lines.find(l=>l.key===S.sug.to);
    from.ents.splice(from.ents.indexOf(e),1);
    e.col = firstFree(to, slotsOf(e), S.sug.col, e);
    to.ents.push(e); to.ents.sort((a,b)=>colOf(a)-colOf(b)); }
  S.sug=null; render();
}

function endTurn(){
  S.phase = (S.phase+1) % PHASES.length;
  if (S.phase===0){ S.round++; S.lines.forEach(l=>l.ents.forEach(e=>{e.q=true;e.f=true;}));
    toast('Round '+S.round+' — GM declares mana, all units refreshed'); }
  else toast(PHASES[S.phase]+' act');
  render();
}

/* ── wiring ── */
document.addEventListener('click', ev => {
  /* IN THE FIELD, THE FIELD OWNS CLICKS. Selecting happens on pointerdown out
     there (you point at a figure, not at a DOM box), and this handler was
     firing on the release and clearing it again — so a unit stayed selected
     for exactly as long as the button was held down. */
  if (document.body.classList.contains('field-on')) return;
  if (performance.now() - dropped < 300) return;      // the tail of a drag, not a click
  const jump = ev.target.closest('[data-jump]');
  if (jump){ S.sel = jump.dataset.jump; render(); return; }
  const ent = ev.target.closest('.ent');
  if (ent){ S.sel = (S.sel===ent.dataset.id) ? null : ent.dataset.id; render(); return; }
  /* CLICKING DOES NOT MOVE. A click used to double as "send the selected unit
     here", which meant selecting a unit turned every lit slot on the board into
     a live trigger you could set off by clicking to look at something. Moving a
     piece is picking it up and putting it down; nothing else should do it. */
  /* Chrome that belongs to the player, not to the table: the selection bar in
     either of its homes, the top bar, and the ability panel with its
     declaration, and the field's own HUD. Clicking your own sheet must never
     let go of the unit whose sheet you are reading. */
  if (ev.target.closest('#selbar,.topbar,.seldock,.abar,.ibar')) return;
  /* a click inside a rank is inert now that it does not move anything — losing
     the selection (and the reach shown with it) because you clicked near the
     line you were reading would be its own small annoyance. Click the piece
     again, or anywhere off the ranks, to let go of it. */
  if (ev.target.closest('.line')) return;
  if (S.sel){ S.sel=null; render(); }
});
document.addEventListener('keydown', ev => {
  /* Space ends the turn — but not while someone is typing in chat. */
  const t = ev.target, tag = t && t.tagName;
  if (tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT' || (t && t.isContentEditable)) return;
  if (ev.key==='Escape' && S.sel){ S.sel=null; render(); }
  if (ev.key===' '){ ev.preventDefault(); endTurn(); }
});
/* ══ PICKING A PIECE UP ══════════════════════════════════════
   Same mechanics as before — this is all presentation. The browser's own drag
   image is a flat snapshot of the element, and the element is transparent
   (gl.js paints it), so dragging looked like nothing happened. Suppress that
   image, leave an empty socket behind, and hand the piece to the 3D layer to
   carry at the cursor. */
const BLANK = new Image();
BLANK.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

document.addEventListener('dragstart', ev => {
  const jump = ev.target.closest('[data-jump]');
  if (jump){ S.sel = jump.dataset.jump; render(); return; }
  const ent = ev.target.closest('.ent'); if (!ent) return;
  const e = entById(ent.dataset.id);
  if (!canControl(e)){ ev.preventDefault(); return; }
  S.drag = e.id; S.sel = e.id;
  ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain', e.id);
  try { ev.dataTransfer.setDragImage(BLANK, 0, 0); } catch(_){}
  window.__carry = {id:e.id, x:ev.clientX, y:ev.clientY, t:0};
  dragSeen = performance.now();        // start the watchdog's clock, or it fires at once
  setTimeout(() => { render(); if (e.kind === 'form') takeInHand(e); }, 0);
});

/* ── the selection bar follows you ────────────────────────────
   The bar lives at the foot of the combat sheet, which is right — it belongs to
   the sheet, not to the screen. But the sheet is a thing on a table you can pan,
   zoom and lock into, and the foot of it is very often off the bottom of the
   view. Reading a unit then meant giving up the view you were reading it in.

   So when its own place is out of sight, the bar DOCKS: it is MOVED (not copied)
   into a fixed layer at the bottom of the screen, and moved back when the sheet's
   own foot comes into view again. Moving rather than cloning matters — the bar is
   full of ids the click handlers match on, and a copy would give the page two of
   each. render() writes into it by id, so it keeps working from either home. */
let dock = null, docked = false;
function dockEl(){
  if (dock) return dock;
  dock = document.createElement('div');
  dock.className = 'seldock';
  document.body.appendChild(dock);
  return dock;
}
function placeSelbar(){
  const bar = document.getElementById('selbar');
  if (!bar) return;
  if (!S.sel){ if (docked) undock(bar); return; }
  /* measure where the bar's SHEET position is, which is the question being
     asked — so measure it there, not where it currently happens to be drawn */
  const home = document.getElementById('selbar-home');
  const ref = docked ? home : bar;
  if (!ref) return;
  const r = ref.getBoundingClientRect();
  const H = innerHeight, W = innerWidth;
  /* Hysteresis: dock the moment it goes off, but do not come back until it is
     properly back on. Without a margin the two tests sit on the same pixel and
     the bar flickers between its two homes on any drift. (The first version of
     this oscillated for a worse reason — taking the bar out collapsed the empty
     home, which moved the home up into view, which undocked, which put the bar
     back off screen. #selbar-home reserves the height now, which also keeps the
     sheet the same size whether the bar is home or not.) */
  const gone = r.bottom > H - 4  || r.top < 4  || r.right < 60 || r.left > W - 60 || r.width < 40;
  const back = r.bottom < H - 26 && r.top > 26 && r.right > 90 && r.left < W - 90 && r.width > 60;
  if (!docked && gone){ dockEl().appendChild(bar); dock.classList.add('on'); docked = true;
                        document.body.classList.add('seldocked'); }
  else if (docked && back) undock(bar);
}
function undock(bar){
  const home = document.getElementById('selbar-home');
  if (home) home.appendChild(bar);
  if (dock) dock.classList.remove('on');
  document.body.classList.remove('seldocked');
  docked = false;
}
window.__onView = placeSelbar;

/* ── carrying a formation ──────────────────────────────────
   A counter is WebGL: gl.js lifts it and rides the cursor inside the canvas,
   where depth sorting puts it over everything. A formation is a DOM tile, and
   the canvas is `position:fixed; z-index:900` over the whole page — so no
   amount of transforming the tile in place can get it above a counter. Carried
   under the pieces it is passing is worse than not carrying it at all.

   So the held tile is drawn in a HAND: one fixed overlay above the canvas,
   holding a copy of the plate, tilted and scaled to match the table. It is a
   snapshot — a formation's numbers do not change while you are holding it — and
   because it is positioned in screen space it cannot drift, cannot need the
   page's perspective inverted, and is above everything by construction.

   The one thing it gives up is the perspective gradient: a tile near the front
   edge of the table is about 4% larger than one at the back, and the held copy
   is not. That is the right trade. It is in your hand, not on the board. */
let hand = null;
function handEl(){
  if (hand) return hand;
  hand = document.createElement('div');
  hand.className = 'hand';
  hand.innerHTML = '<div class="handin"></div>';
  document.body.appendChild(hand);
  return hand;
}
function takeInHand(e){
  const src = document.querySelector(`.ent[data-id="${e.id}"] .plate`);
  if (!src) return;
  const h = handEl(), inner = h.firstChild;
  inner.className = 'handin ' + (e.side === 'en' ? 'en-e' : 'al-e') + ' ent fm';
  inner.style.width = src.offsetWidth + 'px';
  inner.innerHTML = `<div class="plate">${src.innerHTML}</div>`;
  h.classList.add('on');
  moveHand();
}
function moveHand(){
  const c = window.__carry; if (!c || !hand || !hand.classList.contains('on')) return;
  c.t = Math.min(1, (c.t || 0) + 0.16);
  const e = 1 - Math.pow(1 - c.t, 3);
  /* read the table's live scale off a plate still ON it, so the held copy
     matches the board's size through zoom, pan and lock-in */
  const ref = document.querySelector('.cwin .ent.fm:not(.dragging) .plate');
  const k = ref && ref.offsetWidth ? ref.getBoundingClientRect().width / ref.offsetWidth : 1;
  const deg = (window.__tilt ? window.__tilt() : 0) * 180/Math.PI;
  hand.style.left = c.x + 'px';
  hand.style.top  = c.y + 'px';
  hand.firstChild.style.transform =
    `translate(-50%,-50%) scale(${(k*(1+0.08*e)).toFixed(3)}) rotateX(${deg.toFixed(2)}deg) `+
    `translateZ(${(46*e).toFixed(1)}px)`;
}
function emptyHand(){ if (hand) hand.classList.remove('on'); }

/* ── the slot preview ──
   An outline over the exact columns the piece would occupy, drawn from the
   grid's own untransformed geometry. Nothing reflows while it moves, so the
   target cannot shift out from under the pointer while you aim at it — which is
   what happens if you open a real gap instead. Red means something is already
   standing there. */
let zone = null, shown = [];
/* THE RANK REHEARSES THE DROP. An outline alone leaves you working out what will
   happen to everybody else, which is exactly the hard part when a wide piece is
   going between two units. So the pieces that are about to be shoved actually
   move aside while you hover, and you aim at a gap you can see.

   They move with `translate`, not `transform`, for two reasons: it composes with
   the pick-up and landing animations instead of fighting them for the one
   property, and — the important one — it changes NO layout. The grid underneath
   is untouched, so the column under the pointer is still a pure function of
   where the pointer is. A preview that reflowed the row would move the target
   out from under you as you aimed at it. */
function clearPreview(){
  shown.forEach(c => { c.style.translate = ''; });
  shown = [];
  document.querySelectorAll('.line.previewing').forEach(l => l.classList.remove('previewing'));
}
function showZone(lineEl, e, col){
  const rank = lineEl.querySelector('.rank');
  const l = S.lines.find(x => x.key === lineEl.dataset.line);
  const cols = colsOf(), span = slotsOf(e);
  const gap = parseFloat(getComputedStyle(rank).columnGap) || 0;
  const cw = (rank.clientWidth - gap*(cols-1)) / cols;
  /* the preview shows the RESOLVED column, not the one under the pointer —
     the piece is going to slide to clear ground, so say so before it does */
  const r = resolveDrop(l, e, col, span);
  clearPreview();
  const slide = (o, to) => {
    if (to === colOf(o)) return;
    const cell = rank.querySelector(`[data-col="${colOf(o)}"][data-span]`);
    if (!cell) return;
    cell.style.translate = ((to - colOf(o)) * (cw + gap)).toFixed(1) + 'px';
    shown.push(cell);
  };
  if (r.pos) r.pos.forEach((c, o) => slide(o, c));
  if (r.mode === 'swap' && r.tgt) slide(r.tgt, colOf(e));
  if (shown.length) lineEl.classList.add('previewing');

  if (!zone){ zone = document.createElement('div'); zone.className = 'dropzone'; }
  if (zone.parentElement !== rank) rank.appendChild(zone);
  zone.style.left  = Math.round(r.col*(cw+gap)) + 'px';
  zone.style.width = Math.round(span*cw + (span-1)*gap) + 'px';
  zone.classList.toggle('swap', r.mode === 'swap');
  zone.classList.toggle('bad',  r.mode === 'none');
}
/* the same pad, drawn red over a line that has no room for this piece at all */
function badZone(lineEl, e){
  const rank = lineEl.querySelector('.rank');
  clearPreview();
  const cols = colsOf(), span = slotsOf(e);
  const gap = parseFloat(getComputedStyle(rank).columnGap) || 0;
  const cw = (rank.clientWidth - gap*(cols-1)) / cols;
  if (!zone){ zone = document.createElement('div'); zone.className = 'dropzone'; }
  if (zone.parentElement !== rank) rank.appendChild(zone);
  zone.style.left = '0px';
  zone.style.width = Math.round(cols*cw + (cols-1)*gap) + 'px';
  zone.classList.remove('swap'); zone.classList.add('bad');
}
function hideZone(){
  clearPreview();
  if (zone && zone.parentElement) zone.parentElement.removeChild(zone);
}

/* ── small feedback ────────────────────────────────────────────
   The pieces are painted by gl.js from their DOM rects every frame, so a CSS
   animation on the DOM element animates the WebGL piece for free — the counter
   really does drop into its slot. The one thing the canvas needs is to be told
   to keep drawing: it renders on a dirty flag, and a CSS animation fires no
   events and mutates nothing. `__animUntil` is that signal. */
function keepDrawing(ms){ window.__animUntil = performance.now() + ms; }
/* The mark lives in STATE, not on the element — the same lesson as `.dragging`.
   render() rebuilds the field from S and throws the old nodes away, and a drop
   is followed by a stray click that re-renders, so a class added to the element
   after the move was gone before it could play a single frame. */
/* Driven per FRAME in JS rather than by a CSS animation, for a reason specific
   to this board: the piece is painted by gl.js from its DOM rect, so the rect
   has to be right on the same frames the canvas draws. A CSS animation runs on
   the compositor's own timeline, which is not guaranteed to be sampled in step
   with the render loop — and in a headless browser does not advance at all, so
   it could not be tested either. Only the mark is state, so a re-render
   mid-animation keeps the class; the motion is arithmetic. */
const EASE = u => 1 - Math.pow(1 - u, 3);
const MOTION = {
  landing: u => { const k = 1 - EASE(u);
    return `translateY(${(-13*k).toFixed(2)}px) scale(${(1 + 0.12*k).toFixed(4)})`; },
  nope:    u => `translateX(${(7 * Math.sin(u*Math.PI*4) * (1-u)).toFixed(2)}px)`,
};
function flash(id, cls, ms){
  mark = { id, cls, until: performance.now() + ms };
  render();
  const t0 = performance.now(), move = MOTION[cls];
  (function tick(){
    const u = Math.min(1, (performance.now() - t0) / ms);
    const el = document.querySelector(`.cwin .ent[data-id="${id}"]`);
    if (el) el.style.transform = u < 1 ? move(u) : '';
    keepDrawing(90);
    if (u < 1) return requestAnimationFrame(tick);
    if (mark && mark.id === id && mark.cls === cls){ mark = null; render(); }
  })();
}
function refuse(id, msg){ toast(msg); flash(id, 'nope', 380); }
function landed(id){ flash(id, 'landing', 360); }
function endDrag(){
  if (!S.drag && !window.__carry) return;
  S.drag=null; window.__carry=null; emptyHand(); hideZone(); render();
}
/* dragend is specified to always fire, and usually does — but a drop rejected
   outside every target can swallow it, and then the piece hangs in the air for
   good. Belt and braces: end on anything that means the gesture is over, plus a
   watchdog for a drag that simply stops reporting. */
document.addEventListener('dragend', endDrag);
addEventListener('mouseup', endDrag);
addEventListener('pointerup', endDrag);
addEventListener('blur', endDrag);
/* The browser stops sending mousemove the instant a drag begins and does not
   resume until it is over — so a mousemove while a drag is "live" means the
   drag is not live any more. This is the fast path: the piece drops the moment
   you move after letting go. */
addEventListener('mousemove', () => { if (S.drag) endDrag(); });
addEventListener('pointermove', () => { if (S.drag) endDrag(); });
/* A LAST resort, deliberately slow. dragover is not reliably periodic — in some
   environments it only fires when the pointer actually moves — so a short
   timeout here kills perfectly live drags whenever someone pauses to aim. The
   mousemove path above is what ends a drag promptly; this only catches a drag
   that died with the pointer parked. */
let dragSeen = 0;
setInterval(() => { if (S.drag && performance.now()-dragSeen > 2500) endDrag(); }, 400);

document.addEventListener('dragover', ev => {
  if (!S.drag) return;
  dragSeen = performance.now();
  if (window.__carry){ window.__carry.x = ev.clientX; window.__carry.y = ev.clientY; moveHand(); }
  const line = ev.target.closest('.line');
  if (!line){ hideZone(); return; }
  const e = entById(S.drag), l = S.lines.find(x=>x.key===line.dataset.line);
  /* the unit's OWN line accepts it too — that is how you shuffle the order */
  if (!(canDrop(e,l) || (canControl(e) && lineOf(e.id)===l))){
    /* A line that cannot take the piece never fires `drop`, so there is no
       moment left to refuse in — say it here instead, while the pointer is
       still over it, rather than letting the drag quietly do nothing. */
    badZone(line, e); return;
  }
  ev.preventDefault(); ev.dataTransfer.dropEffect='move';
  showZone(line, e, targetCol(l, e, dropCol(line, ev.clientX)));
});
/* A drop is followed by a click, and the click handler treats a click on a line
   as "move the selected unit here" — so every successful drag was quietly being
   re-run as a click-move a moment later. Harmless most of the time, which is why
   it went unnoticed; it showed up as the landing animation being torn down after
   two frames by the extra render. */
document.addEventListener('drop', ev => {
  const line = ev.target.closest('.line'); if (!line || !S.drag) return;
  ev.preventDefault();
  dropped = performance.now();
  const col = dropCol(line, ev.clientX);
  const id = S.drag;
  /* clear the drag BEFORE moving: move() re-renders, and the rendered markup
     reads its classes from state — leave S.drag set and the piece comes back
     still looking picked up */
  S.drag = null; window.__carry = null; emptyHand(); hideZone();
  move(id, line.dataset.line, col);
});
document.addEventListener('click', ev => {
  const e = S.sel && entById(S.sel); if (!e) return;
  if (ev.target.id==='sug-yes'){ resolveSug(true); return; }
  if (ev.target.id==='sug-no'){ resolveSug(false); return; }
  if (ev.target.id==='act-q'){ e.q=!e.q; log(`${e.name} ${e.q?'regained':'spent'} a quick action`); render(); }
  if (ev.target.id==='act-f'){ e.f=!e.f; log(`${e.name} ${e.f?'regained':'spent'} a full action`); render(); }
  if (ev.target.id==='act-hurt'){ if(e.kind==='form'){ e.alive=Math.max(0,e.alive-1); } else { e.hp=Math.max(0,e.hp-5); } render(); }
  const tb = ev.target.closest('.tkbtn');
  if (tb){ const i=+tb.dataset.tk, d=+tb.dataset.d;
    e.cond[i].c += d;
    if (e.cond[i].c<=0) e.cond.splice(i,1);
    render(); return; }
  if (ev.target.id==='act-heal'){ if(e.kind==='form'){ e.alive=Math.min(e.total,e.alive+1); } else { e.hp=Math.min(e.max,e.hp+5); } render(); }
});
document.addEventListener('change', ev => {
  if (ev.target.id!=='tk-add' || !S.sel) return;
  const name = ev.target.value; if (!name) return;
  const e = entById(S.sel); e.cond = e.cond || [];
  const has = e.cond.find(t=>t.n===name);
  if (has) has.c++; else e.cond.push({n:name,c:1});
  log(name+' applied to '+e.name); render();
});
const _et=document.getElementById('endturn'); if(_et) _et.addEventListener('click', endTurn);
const _th=document.getElementById('theme'); if(_th) _th.addEventListener('click', () => document.body.classList.toggle('dark'));
/* every line opens packed and centred; after that, slots are wherever you put them */
S.lines.forEach(packLine);
render();
