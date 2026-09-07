/* ══════════════════════════════════════════════════════════════
   THE CHARACTER RECORD

   The companion app's own sheet — its markup, its class names,
   its formulas — driven by a record instead of by the DOM, so
   it can be saved, undone, exported and reopened.
   src/index.html, src/css/01-04, src/js/03,05,06.

   The pre-built backgrounds, styles and lores are PREBUILT_DATA
   from src/js/02-data-prebuilt.js, copied verbatim. Nothing in
   that file has been edited, reworded or added to.

   Health  = ceil(Fortitude x Armour Value + Resilience)
   Stamina = ceil((Fortitude + Willpower) / 2) + 4
   Stress  = Willpower x 2
══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const SD = window.SKILL_DATA;
const PB = window.PREBUILT_DATA || { backgrounds:[], sla:[] };
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,5);

const ATTRS = [
  ['Physicality','BODY',[['for','Fortitude','P','Passive'],['pro','Prowess','A','Active']]],
  ['Agility','BODY',    [['dex','Dexterity','P','Passive'],['nim','Nimble','A','Active']]],
  ['Mind','',           [['wil','Willpower','P','Passive'],['int','Intelligence','A','Active']]],
  ['Social','',         [['pre','Presence','P','Passive'],['cha','Charisma','A','Active']]]
];
const CATS = [['body','Body','&#9876;'],['mind','Mind','&#10022;'],['social','Social','&#128081;']];
const TYPES = [['style','Style'],['lore','Lore'],['art','Art']];
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII'];
const COST = ['(free)','(2 pts)','(4 pts)','(6 pts)','(8 pts)'];
const COINS = [['g','Gold'],['s','Silver'],['c','Copper']];

/* ══ WHAT YOU CAN PICK FROM ═══════════════════════════════════
   The book's own entries, plus anything you have kept yourself.
   Kept ones live under monarchy.presets.v1 and never touch the
   file above.                                                   */
const PKEY = 'monarchy.presets.v1';
function mine(){ try { return JSON.parse(localStorage.getItem(PKEY)) ||
  { backgrounds:[], sla:[], traits:[] }; } catch(e){ return { backgrounds:[], sla:[], traits:[] }; } }
function keep(kind, rec){
  const m = mine(); m[kind] = m[kind] || [];
  m[kind] = m[kind].filter(x => x.name !== rec.name).concat([rec]);
  try { localStorage.setItem(PKEY, JSON.stringify(m)); } catch(e){}
}
function dropKept(kind, name){
  const m = mine(); m[kind] = (m[kind]||[]).filter(x => x.name !== name);
  try { localStorage.setItem(PKEY, JSON.stringify(m)); } catch(e){}
}
/* The only weapons the rules have actually named. Their numbers are
   grumkata's, quoted in claude/abilities-and-equipment.md. Nothing here is
   invented: an entry I made up once (a spear) was removed and stays removed.
   Everything else is yours to write and Keep. */
const BOOK_WEAPONS = [
  { id:'w_decrepit_great_mace', name:'Decrepit Great Mace', range:'2',
    dmg:'d8 + Prowess', type:'blunt', quality:'Decrepit',
    note:'great weapon, two-handed. A great weapon adds your full Prowess.' },
  { id:'w_decrepit_longsword', name:'Decrepit Longsword', range:'2',
    dmg:'d10 + Prowess', type:'piercing/slashing', quality:'Decrepit',
    note:'Quality is a place in a tree, not a modifier — a Longsword is its own entry.' }
];
const BOOKS = { backgrounds:(PB.backgrounds||[]), sla:(PB.sla||[]),
                traits:[], weapons:BOOK_WEAPONS, armour:[], items:[] };
const pool = kind => (BOOKS[kind]||[]).map(x => Object.assign({_book:true}, x))
  .concat((mine()[kind]||[]).map(x => Object.assign({_book:false}, x)));

/* ══ THE RECORD ═══════════════════════════════════════════════ */
function blank(){
  return { id:uid('c'), name:'', note:'', created:Date.now(), updated:Date.now(),
    format:'monarchy.character', version:3, page:'p1', cat:'body',
    /* `pic` is the character's PICTURE — what their counter wears on the
       table and what the chest shows when it offers them. `face` and `body`
       beside it are descriptions in words and always were; the two are not
       the same field and neither replaces the other. */
    who:{ name:'', species:'', culture:'', rank:'', size:'', sizePreset:'', player:'',
          face:'', body:'', pic:'', picArt:'' },
    attr:{ for:5, pro:5, dex:3, nim:3, wil:5, int:5, pre:5, cha:5 },
    armour:{ equipped:null, list:[] },
    purse:{ g:0, s:0, c:0, names:{ g:'Gold', s:'Silver', c:'Copper' } },
    knacks:[], traits:[],
    skills:{ body:[], mind:[], social:[] },
    bgs:[], weapons:[], items:[], notes:'', sla:[] };
}
function fill(r){
  const b = blank(); if (!r || typeof r !== 'object') return b;
  const o = Object.assign(b, r);
  o.who = Object.assign(b.who, r.who||{});
  o.attr = Object.assign(b.attr, r.attr||{});
  o.armour = Object.assign({equipped:null,list:[]}, r.armour||{});
  o.purse = Object.assign({g:0,s:0,c:0}, r.purse||{});
  o.purse.names = Object.assign({g:'Gold',s:'Silver',c:'Copper'}, r.purse && r.purse.names);
  delete o.purse.log; delete o.purse.said; delete o.purse.open; delete o.rate;
  o.skills = Object.assign({body:[],mind:[],social:[]}, r.skills||{});
  ['knacks','bgs','weapons','sla','items','traits'].forEach(k => { if(!Array.isArray(o[k])) o[k]=[]; });
  if (!Array.isArray(o.armour.list)) o.armour.list = [];
  /* a version 2 sheet kept traits and gear as loose prose; each becomes one entry
     rather than being thrown away or guessed at */
  if (typeof r.traits === 'string' && r.traits.trim())
    o.traits = [{ id:uid('t'), name:'', text:r.traits, src:'' }];
  if (typeof r.gear === 'string' && r.gear.trim())
    o.items = (o.items||[]).concat([{ id:uid('i'), name:'', qty:1, note:r.gear }]);
  delete o.gear;
  if (!o.who.name && r.name) o.who.name = r.name;
  o.name = o.who.name || r.name || '';
  o.version = 3; o.page = 'p1'; o.adding = null;
  return o;
}

/* ══ THE ARITHMETIC ═══════════════════════════════════════════ */
function av(r){
  const a = r.armour.list.find(x => x.id === r.armour.equipped);
  return a ? Math.max(1, parseFloat(a.av) || 1) : 1;
}
function resilience(r){
  const p = (r.skills.body||[]).find(x => (x.n||'').trim().toLowerCase() === 'resilience');
  return p ? (parseInt(p.v)||0) : 0;
}
function derived(r){
  const F = +r.attr.for||0, W = +r.attr.wil||0;
  return { hp: Math.ceil(F * av(r) + resilience(r)),
           st: Math.ceil((F + W) / 2) + 4,
           str: W * 2, av: av(r), res: resilience(r) };
}
const tot = chain => chain.reduce((s,n) => s + (parseInt(n.v)||0), 0);

/* ── PROFICIENCIES ────────────────────────────────────────────
   "Buying a proficiency grants +1 to the proficiency skill itself
   and +1 to every parent skill above it", and two different
   backgrounds granting the same one each contribute their own.
   monarchy_banners_rules.md, section 6.
   A proficiency reads "Survival > Wilderness > Hunting", so it is
   a path, and a skill earns a point from it when the path runs
   through that skill.                                          */
const SPLIT = /\s*(?:\u2192|->|>)\s*/;
function profPaths(r){
  const out = [];
  (r.bgs||[]).forEach(b => (b.profs||[]).forEach(g => {
    if (g.chosen == null || g.chosen < 0) return;
    const t = (g.options||[])[g.chosen]; if (!t) return;
    out.push(String(t).split(SPLIT).map(x => x.trim().toLowerCase()).filter(Boolean));
  }));
  return out;
}
/* how many points this exact place in the tree is granted */
function profAt(paths, chain){
  const want = chain.map(n => (n.n||'').trim().toLowerCase());
  if (!want.length || !want[want.length-1]) return 0;
  let n = 0;
  paths.forEach(p => {
    if (p.length < want.length) return;
    for (let i = 0; i < want.length; i++) if (p[i] !== want[i]) return;
    n++;
  });
  return n;
}
/* what you actually roll: every own value plus every granted point above it */
function rollTotal(paths, chain){
  let n = 0;
  for (let i = 0; i < chain.length; i++){
    n += parseInt(chain[i].v) || 0;
    n += profAt(paths, chain.slice(0, i+1));
  }
  return n;
}

/* ══ SMALL PIECES ═════════════════════════════════════════════ */
const sec = (t, note) => `<div class="sec"><span class="so">&#10022;</span> ${t}` +
  (note ? ` <span class="secnote">${note}</span>` : '') + `</div>`;
const lbl = t => `<span class="lbl">${t}</span>`;
const fld = (t, path, val, ph, extra) =>
  `<div>${lbl(t)}<input type="text" data-p="${path}" value="${esc(val)}"
     placeholder="${ph||'&#8212;'}"${extra||''}></div>`;
const rm = (act, arg, light) =>
  `<button class="${light?'rm-light':'rm'}" data-s="${act}" data-a="${esc(arg)}"
     title="strike it out">&#10005;</button>`;
const addb = (act, t, arg, cls) =>
  `<button class="${cls||'add-btn'}" data-s="${act}"${arg!=null?` data-a="${esc(arg)}"`:''}>+ ${t}</button>`;
const moves = (act, arg, first, last) =>
  `<span class="mv"><button class="mvb" data-s="${act}" data-a="${esc(arg+':-1')}"
     ${first?'disabled':''} title="move up">&#9650;</button><button class="mvb"
     data-s="${act}" data-a="${esc(arg+':1')}" ${last?'disabled':''} title="move down">&#9660;</button></span>`;
/* Adding a thing you have nothing to read about should cost one click and
   put the caret in the field. The caret beside it is for the times you do
   want to choose from what is written down. */
const addSplit = (addAct, openAct, label, arg, n, cls) => `<div class="addrow">
  <button class="${cls||'add-btn'}" data-s="${addAct}"${arg!=null?` data-a="${esc(arg)}"`:''}>+ ${label}</button>
  <button class="add-caret${n?'':' bare'}" data-s="${openAct}"${arg!=null?` data-a="${esc(arg)}"`:''}
    title="${n ? 'choose from '+n+' written down' : 'nothing written down yet'}">&#9662;${
    n ? `<span class="add-n">${n}</span>` : ''}</button></div>`;
const keepb = (act, id) =>
  `<button class="keepb" data-s="${act}" data-a="${id}" title="offer this one in the codex from now on">Keep</button>`;

/* ══ THE PLATE ════════════════════════════════════════════════
   Who they are and what they have left, in one band at the head
   of the record — the same three pools the table shows beside
   your hand, so the sheet and the board agree on sight.        */
function plate(r){
  const d = derived(r);
  const line = [r.who.rank, r.who.species && ('a ' + r.who.species),
                r.who.culture && ('of ' + r.who.culture)].filter(Boolean).join(' · ');
  return `<div class="rec-plate">
    <button class="pl-face${r.who.face?' has':''}" data-s="pic" data-a="face"
        title="${r.who.face?'change the face':'set a face'}">
      ${r.who.face ? `<img src="${esc(r.who.face)}" alt="">`
                   : `<span class="pl-none">&#10022;<i>face</i></span>`}
      <span class="pl-ring"></span></button>
    <div class="pl-who">
      <div class="pl-name">${esc(r.who.name) || '<em>an unnamed hand</em>'}</div>
      <div class="pl-line">${esc(line) || '<em>not yet said who they are</em>'}</div>
      <div class="pl-worn"><span class="pl-shield">&#128737;</span>
        <b id="w-name">${esc(wornName(r))}</b>
        <span class="pl-av">AV <b id="w-av">${d.av}</b></span></div>
    </div>
    <div class="pl-pools">
      ${[['Health','d-hp',d.hp,'FOR &#215; AV + Res'],
         ['Stamina','d-st',d.st,'(FOR+WIL)&#247;2+4'],
         ['Stress','d-str',d.str,'WIL &#215; 2']].map(([n,id,v,f]) => `<div class="pool">
        <div class="pool-disc"><span id="${id}">${v}</span></div>
        <div class="pool-name">${n}</div><div class="pool-f">${f}</div></div>`).join('')}
    </div>
  </div>`;
}

/* ══ PAGE ONE ═════════════════════════════════════════════════ */
function pageOne(r){
  const paths = profPaths(r);
  return `<div class="sheet active"><div class="sheet-inner">
  <div class="splash" style="top:-30px;right:-30px;width:200px;height:200px;"></div>
  <div class="sheet-header"><div class="game-title">Monarchy</div>
    <div class="sheet-sublabel">Character Record</div></div>

  ${plate(r)}

  ${sec('Identity')}
  <div class="g3" style="margin-bottom:8px;">
    ${fld('Name','who.name',r.who.name,'&#8212;',' tabindex="1"')}
    ${fld('Species','who.species',r.who.species,'&#8212;',' tabindex="2"')}
    ${fld('Culture','who.culture',r.who.culture,'&#8212;',' tabindex="3"')}
  </div>
  <div class="g3" style="margin-bottom:16px;">
    ${fld('Rank / Title','who.rank',r.who.rank,'&#8212;',' tabindex="4"')}
    <div>${lbl('Size / Height')}
      <div style="display:flex;gap:8px;align-items:center;">
        <select data-p="who.sizePreset" style="flex:0 0 auto;padding:1px 3px;">
          ${['','small','medium','large'].map(v =>
            `<option value="${v}"${r.who.sizePreset===v?' selected':''}>${v?v[0].toUpperCase()+v.slice(1):'Custom'}</option>`).join('')}
        </select>
        <input type="text" data-p="who.size" value="${esc(r.who.size)}" placeholder="5'10&quot;, 180cm" style="flex:1;" tabindex="5">
      </div></div>
    ${fld('Player','who.player',r.who.player,'&#8212;',' tabindex="6"')}
  </div>

  <div class="row">
   <div class="col-sm">
    ${sec('Attributes','you roll d6 equal to the active one')}
    ${ATTRS.map(([grp,body,pair]) => `<div class="attr-group">
      <div class="attr-group-title"><span>${grp}</span>${body?`<span style="opacity:.45;font-size:6px;letter-spacing:.1em;">${body}</span>`:''}</div>
      ${pair.map(([k,nm,ap,word]) => `<div class="attr-row${ap==='A'?' act':''}">
        <div class="attr-ap">${ap}</div><div class="attr-name">${nm}</div>
        <div class="attr-box"><input type="number" min="1" max="15" data-p="attr.${k}" value="${+r.attr[k]||0}"></div>
        <div class="attr-badge">${word}</div></div>`).join('')}
      </div>`).join('')}

    ${sec('Knacks','5 points at creation &#183; small and specific')}
    <div id="knacks-list">${r.knacks.map((k,i) => `<div class="knack-row">
      ${moves('mvknack',k.id,i===0,i===r.knacks.length-1)}
      <input type="text" data-p="knacks.${k.id}.name" value="${esc(k.name)}" placeholder="Knack name">
      <input type="number" min="0" max="20" data-p="knacks.${k.id}.level" value="${+k.level||0}">
      ${rm('delknack',k.id)}</div>`).join('')}</div>
    ${r.knacks.length ? `<div class="tally">spent <b>${r.knacks.reduce((a,k)=>a+(parseInt(k.level)||0),0)}</b> of 5</div>` : ''}
    ${addb('addknack','Knack')}

    ${sec('Passive Traits','always on &#183; from a race, a tag, or a narrative reward')}
    ${r.traits.map((t,i) => `<div class="bg-card trait">
      <div class="bg-head">
        ${moves('mvtrait',t.id,i===0,i===r.traits.length-1)}
        <input type="text" class="bg-name" placeholder="Trait name&#8230;"
          data-p="traits.${t.id}.name" value="${esc(t.name)}">
        <input type="text" class="bg-inst" placeholder="Where it came from"
          data-p="traits.${t.id}.src" value="${esc(t.src||'')}">
        ${keepb('keeptrait',t.id)}
        ${rm('deltrait',t.id,true)}</div>
      <div class="bg-body"><div class="bg-notes">
        <textarea data-p="traits.${t.id}.text"
          placeholder="A small bonus, a situational perk, or a trait action&#8230;">${esc(t.text)}</textarea>
      </div></div></div>`).join('')}
    ${addSplit('addtrait','opentrait','Add Trait', null, (mine().traits||[]).length)}
   </div>

   <div class="col" style="position:relative;">
    <div class="colrule"></div>
    ${sec('Skill Trees','you roll primary + secondary + tertiary')}
    ${paths.length ? `<div class="subhint">Points in <b class="pf">gold</b> come from your
      backgrounds &#8212; a proficiency raises its own skill and every skill above it.</div>` : ''}
    <div class="sct-tabs">${CATS.map(([k,n]) =>
      `<button class="sct-btn${r.cat===k?' active':''}" data-s="cat" data-a="${k}">${n}</button>`).join('')}</div>
    ${CATS.map(([k]) => `<div class="skill-panel${r.cat===k?' active':''}">
      <div class="skill-panel-inner">${r.cat===k ? tree(r,k,paths) : ''}</div></div>`).join('')}

    ${sec('The Figure','how they stand on the field')}
    <div class="figwrap">
      <button class="fig${r.who.body?' has':''}" data-s="pic" data-a="body">
        ${r.who.body ? `<img src="${esc(r.who.body)}" alt="">`
                     : `<span class="fig-none">&#10022;<i>set a figure</i></span>`}
      </button>
      <div class="fig-say">
        <p>This is the picture the table stands on the field in combat. The face
           above is what everything else shows &#8212; the roll of characters, the
           order of battle, the chat.</p>
        ${r.who.body ? `<button class="add-btn" data-s="dropic" data-a="body">Take the figure off</button>` : ''}
        ${r.who.face ? `<button class="add-btn" data-s="dropic" data-a="face">Take the face off</button>` : ''}
      </div>
    </div>
   </div>
  </div>
  </div><div class="page-foot">Page I of II</div></div>`;
}

/* ── the trees ── */
function tree(r, cat, paths){
  const list = r.skills[cat] || [];
  const meta = CATS.filter(c => c[0]===cat)[0];
  return list.map((p,i) => primary(r, cat, p, i, list.length, paths)).join('')
    + addb('openp','Add Primary Skill', cat, 'add-primary-btn')
    + (list.length ? '' : `<div class="skill-empty"><div class="skill-empty-icon">${meta[2]}</div>
        <div class="skill-empty-text">No ${meta[1]} Skills</div>
        <div class="skill-empty-hint">Click above to open the codex of ${meta[1].toLowerCase()} skills.</div></div>`);
}
const pf = n => n ? `<span class="pf" title="${n} from a background proficiency">+${n}</span>` : '';
function primary(r, cat, p, i, n, paths){
  const kids = p.kids || [];
  const b = profAt(paths, [p]);
  return `<div class="skill-primary">
    <div class="skill-prim-head">
      ${moves('mvsk', cat+':'+p.id, i===0, i===n-1)}
      <div class="skill-prim-score"><input type="number" min="0" max="20"
        data-p="sk.${cat}.${p.id}.v" value="${+p.v||0}"></div>${pf(b)}
      <input type="text" style="flex:1;min-width:0;" placeholder="Primary skill name&#8230;"
        data-p="sk.${cat}.${p.id}.n" value="${esc(p.n)}">
      <span class="rolls" data-chain="${cat}:${p.id}" title="what you roll with">${rollTotal(paths,[p])}</span>
      ${addb('opens','Secondary', cat+':'+p.id, 'skill-btn-light')}
      ${rm('delsk', cat+':'+p.id, true)}</div>
    <div class="skill-children">
      ${kids.map((s,j) => secondary(r, cat, p, s, j, kids.length, paths)).join('')}</div>
  </div>`;
}
function secondary(r, cat, p, s, j, n, paths){
  const kids = s.kids || [];
  const b = profAt(paths, [p,s]);
  return `<div class="skill-secondary">
    <div class="skill-sec-head">
      <div class="arrow">&#8627;</div>
      ${moves('mvsk', cat+':'+p.id+':'+s.id, j===0, j===n-1)}
      <div class="skill-sec-score"><input type="number" min="0" max="20"
        data-p="sk.${cat}.${p.id}.${s.id}.v" value="${+s.v||0}"></div>${pf(b)}
      <input type="text" class="secname" placeholder="Secondary skill name&#8230;"
        data-p="sk.${cat}.${p.id}.${s.id}.n" value="${esc(s.n)}">
      <span class="rolls" data-chain="${cat}:${p.id}:${s.id}" title="what you roll with">${rollTotal(paths,[p,s])}</span>
      ${addb('opent','Tertiary', cat+':'+p.id+':'+s.id, 'skill-btn-dark')}
      ${rm('delsk', cat+':'+p.id+':'+s.id)}</div>
    <div class="skill-ter-list">
      ${kids.map((t,k) => `<div class="skill-ter-row">
        <div class="arrow">&#9492;</div>
        ${moves('mvsk', cat+':'+p.id+':'+s.id+':'+t.id, k===0, k===kids.length-1)}
        <div class="skill-ter-score"><input type="number" min="0" max="20"
          data-p="sk.${cat}.${p.id}.${s.id}.${t.id}.v" value="${+t.v||0}"></div>${pf(profAt(paths,[p,s,t]))}
        <input type="text" class="tername" placeholder="Tertiary skill name&#8230;"
          data-p="sk.${cat}.${p.id}.${s.id}.${t.id}.n" value="${esc(t.n)}">
        <span class="rolls" data-chain="${cat}:${p.id}:${s.id}:${t.id}"
          title="what you roll with">${rollTotal(paths,[p,s,t])}</span>
        ${rm('delsk', cat+':'+p.id+':'+s.id+':'+t.id)}</div>`).join('')}</div>
  </div>`;
}

/* ══ PAGE TWO ═════════════════════════════════════════════════ */
function pageTwo(r){
  return `<div class="sheet active"><div class="sheet-inner">
  <div class="splash" style="top:-20px;right:-20px;width:180px;height:180px;"></div>
  <div class="sheet-header"><div class="game-title">Monarchy</div>
    <div class="sheet-sublabel">Kit &amp; Craft</div></div>
  <div class="row two">
   <div class="col" style="position:relative;">
    <div class="colrule right"></div>
    ${sec('Backgrounds','two proficiencies each &#183; they raise the whole branch')}
    ${r.bgs.map((b,i) => bgCard(r,b,i)).join('')}
    ${addb('openbg','Add Background')}

    <div class="div"><hr><span>&#10022;</span><hr></div>

    ${sec('Weapons','your own line is 0 &#183; range counts forward')}
    ${r.weapons.map((w,i) => `<div class="weapon-card">
      <div class="weapon-card-top">
        ${moves('mvwep',w.id,i===0,i===r.weapons.length-1)}
        <div>${lbl('Name')}<input type="text" style="font-size:13px;font-weight:600;"
          placeholder="Weapon name&#8230;" data-p="weapons.${w.id}.name" value="${esc(w.name)}"></div>
        <div>${lbl('Damage')}<input type="text" placeholder="d8 + Prowess"
          data-p="weapons.${w.id}.dmg" value="${esc(w.dmg)}"></div>
        <div>${lbl('Type')}<input type="text" placeholder="Blunt"
          data-p="weapons.${w.id}.type" value="${esc(w.type)}"></div>
        <div class="narrow">${lbl('Range')}<input type="text" class="weapon-range-input"
          placeholder="2" data-p="weapons.${w.id}.range" value="${esc(w.range)}"></div>
      </div>
      <div class="cardtools">${keepb('keepwep',w.id)}${rm('delwep',w.id)}</div>
      <div class="weapon-card-notes">${lbl('Tags, special effects &amp; notes')}
        <textarea data-p="weapons.${w.id}.note"
          placeholder="great weapon, two-handed, reload&#8230;">${esc(w.note)}</textarea></div>
      </div>`).join('')}
    ${addSplit('addwep','openwep','Add Weapon', null,
        BOOK_WEAPONS.length + ((mine().weapons||[]).length))}

    ${sec('Armour','one is worn &#183; unarmoured is AV 1')}
    <div class="equipped-armour-bar">
      <div class="equipped-armour-icon">&#128737;</div>
      <div class="equipped-armour-middle">
        <span class="equipped-armour-lbl">Currently Equipped</span>
        <span class="equipped-armour-name" id="w-name">${esc(wornName(r))}</span></div>
      <div class="equipped-av-badge"><span class="equipped-av-badge-lbl">AV</span>
        <span class="equipped-av-badge-val" id="w-av">${derived(r).av}</span></div>
    </div>
    <div class="unarmoured-option${r.armour.equipped===null?' selected':''}" data-s="wear" data-a="">
      <input type="radio" name="equipped-armor" tabindex="-1" ${r.armour.equipped===null?'checked':''}>
      <span class="unarmoured-option-label">Unarmoured</span>
      <span class="unarmoured-option-av">AV 1</span></div>
    ${r.armour.list.map((a,i) => `<div class="armor-card${r.armour.equipped===a.id?' equipped':''}">
      <div class="armor-card-top">
        <input type="radio" class="armor-equip-radio" name="equipped-armor" tabindex="-1"
          data-s="wear" data-a="${a.id}" ${r.armour.equipped===a.id?'checked':''}>
        ${moves('mvarm',a.id,i===0,i===r.armour.list.length-1)}
        <div>${lbl('Name')}<input type="text" class="armor-name-input" style="font-size:13px;font-weight:600;"
          placeholder="Armour name&#8230;" data-p="armour.${a.id}.name" value="${esc(a.name)}"></div>
        <div class="narrow">${lbl('AV')}<input type="number" class="armor-av-input" min="1" step="0.5"
          placeholder="3" data-p="armour.${a.id}.av" value="${+a.av||1}"></div>
        <div>${lbl('Quality')}<input type="text" placeholder="Standard"
          data-p="armour.${a.id}.quality" value="${esc(a.quality||'')}"></div>
      </div>
      <div class="cardtools">${keepb('keeparm',a.id)}${rm('delarm',a.id)}</div>
      <div class="armor-card-notes">${lbl('Passives, encumbrance &amp; notes')}
        <textarea data-p="armour.${a.id}.note"
          placeholder="+2 encumbrance, penalties, passives&#8230;">${esc(a.note||'')}</textarea></div>
      </div>`).join('')}
    ${addSplit('addarm','openarm','Add Armour', null, (mine().armour||[]).length)}

    ${purse(r)}

    ${sec('Kit','everything else they carry')}
    ${r.items.map((it,i) => `<div class="kit${(it.note||'').trim()?' told':''}">
      <div class="kit-top">
        ${moves('mvitem',it.id,i===0,i===r.items.length-1)}
        <input type="number" class="kit-qty" min="0" data-p="items.${it.id}.qty" value="${+it.qty||1}">
        <input type="text" class="kit-name" placeholder="What it is&#8230;"
          data-p="items.${it.id}.name" value="${esc(it.name)}">
        <input type="text" class="kit-where" placeholder="where it is"
          data-p="items.${it.id}.where" value="${esc(it.where||'')}">
        ${keepb('keepitem',it.id)}
        ${rm('delitem',it.id)}</div>
      <div class="kit-more"><textarea data-p="items.${it.id}.note" rows="1"
        placeholder="what it does">${esc(it.note||'')}</textarea></div>
      </div>`).join('')}
    ${addSplit('additem','openitem','Add to the Kit', null, mine().items ? mine().items.length : 0)}

    ${sec('General Notes')}
    <div class="traits-single"><textarea data-p="notes"
      placeholder="Alliances, debts, bounties, drives, ongoing threads&#8230;">${esc(r.notes)}</textarea></div>
   </div>

   <div class="col" style="position:relative">
    ${sec('Styles &#183; Lores &#183; Arts','shared cost ladder')}
    <div class="subhint">Styles spend <b>stamina</b>, yours and refreshed by rest.
      Lores draw on the <b>mana in the air</b>, which is nobody's. Arts want
      <b>favor</b> banked, and only ultimates spend it.</div>
    ${r.sla.map((s,i) => slaCard(r,s,i)).join('')}
    ${addb('opensla','Add Style / Lore / Art Slot', null, 'add-slot-btn')}
   </div>
  </div>
  </div><div class="page-foot">Page II of II</div></div>`;
}

/* ── THE PURSE ────────────────────────────────────────────────
   Four goes at this and every one was worse, because every one
   added something. The last had a till: type an amount into
   three fields, write a note, press Pay, and it would break a
   gold into silver for you.

   Nobody does that at a table. You have fourteen gold, you spend
   two, you type twelve. And the change-making was solving an
   exchange rate the rules do not define — "Purchase equipment
   (separate currency/system, not yet detailed here)" — so it was
   an elaborate answer to a question nobody had asked.

   So this is a FIELD, not a feature. Three numbers you type in.
   The craft goes into the coins, not into behaviour. The names
   are yours to change, because the book does not name them.
─────────────────────────────────────────────────────────────── */
function purse(r){
  const nm = r.purse.names || {};
  return `${sec('The Purse')}
  <div class="coinbar"><div class="cb-row">
    <div class="cb-tab">Purse</div>
    ${COINS.map(([k,dflt]) => `<div class="cb-coin ${k}">
      <span class="cb-boss"><b>${(nm[k] || dflt).trim()[0] || dflt[0]}</b></span>
      <span class="cb-cell">
        <input type="text" class="cb-name" data-p="purse.names.${k}"
          value="${esc(nm[k] || dflt)}" spellcheck="false" title="what your table calls it">
        <input type="number" class="cb-num" min="0" data-p="purse.${k}" value="${+r.purse[k]||0}">
      </span></div>`).join('')}
  </div></div>`;
}

function bgCard(r, b, i){
  const chosen = (b.profs||[]).filter(g => g.chosen != null && g.chosen >= 0).length;
  const want = (b.profs||[]).length;
  return `<div class="bg-card">
    <div class="bg-head">
      ${moves('mvbg',b.id,i===0,i===r.bgs.length-1)}
      <input type="text" class="bg-name" placeholder="Background name&#8230;"
        data-p="bgs.${b.id}.name" value="${esc(b.name)}">
      <input type="text" class="bg-inst" placeholder="Instance"
        data-p="bgs.${b.id}.inst" value="${esc(b.inst||'')}">
      <span class="bg-pts">${lbl('BG pts')}<input type="number" min="0"
        data-p="bgs.${b.id}.pts" value="${+b.pts||0}"></span>
      ${keepb('keepbg',b.id)}
      ${rm('delbg',b.id,true)}</div>
    <div class="bg-body">
      ${b.desc ? `<div class="bg-desc">${esc(b.desc).replace(/\r?\n/g,'<br>')}</div>` : ''}
      ${want ? `<div class="bg-tally${chosen===want?' done':''}">${chosen} of ${want}
        ${want===1?'proficiency':'proficiencies'} chosen</div>` : ''}
      ${(b.profs||[]).map((g,gi) => {
        const done = g.chosen != null && g.chosen >= 0;
        /* answered groups fold away: an option you did not take is noise once
           you have taken one, and a background has ten of them */
        const shut = done && !g.show;
        return `<div class="bg-pgroup${done?' done':''}${shut?' shut':''}">
        <button class="bg-pgroup-head" data-s="profshow" data-a="${b.id}:${gi}">
          <span class="bg-pgroup-lbl">${esc(g.label || 'Proficiency')}</span>
          <span class="bg-pgroup-chosen${done?'':' none'}">${
            done ? esc(g.options[g.chosen]) : '&#8212; choose one &#8212;'}</span>
          <span class="bg-pgroup-arrow">${shut ? '&#9662;' : '&#9652;'}</span></button>
        ${shut ? '' : `<div class="bg-pgroup-body">${(g.options||[]).map((o,oi) =>
          `<button class="bg-pgroup-option${g.chosen===oi?' selected':''}"
             data-s="prof" data-a="${b.id}:${gi}:${oi}"><span class="bg-opt-dot"></span>${esc(o)}</button>`).join('')}
        </div>`}</div>`; }).join('')}
      <div class="bg-notes">${lbl('Trait it granted, and any notes')}
        <textarea data-p="bgs.${b.id}.text"
          placeholder="A background may grant a trait: a small bonus of any kind&#8230;">${esc(b.text)}</textarea>
      </div></div></div>`;
}

function slaCard(r, s, i){
  return `<div class="abil-slot ${s.type}">
    <div class="abil-head">
      ${moves('mvsla',s.id,i===0,i===r.sla.length-1)}
      <span class="abil-slot-lbl">Slot ${ROMAN[i]||i+1}</span>
      <input type="text" placeholder="Name this Style / Lore / Art&#8230;"
        data-p="sla.${s.id}.name" value="${esc(s.name)}">
      <select class="abil-type-sel" data-p="sla.${s.id}.type">
        ${TYPES.map(([k,n]) => `<option value="${k}"${s.type===k?' selected':''}>${n}</option>`).join('')}
      </select>
      <span class="abil-cost-lbl">${COST[i]||'(extra slot)'}</span>
      ${keepb('keepsla',s.id)}
      <button class="abil-rm-slot" data-s="delsla" data-a="${s.id}" title="remove this slot">&#10005;</button></div>
    <div class="abil-body">
      ${s.desc ? `<div class="bg-desc">${esc(s.desc).replace(/\r?\n/g,'<br>')}</div>` : ''}
      ${s.type==='art' ? `<div class="favor-row" style="display:flex">
        <div class="favor-lbl">Favor</div>
        <div class="favor-box"><input type="number" min="0" placeholder="0"
          data-p="sla.${s.id}.favor" value="${s.favor==null?'':+s.favor}"></div>
        <div class="favor-note">Banked per Art. Ultimates spend it; thresholds only need it held.</div>
      </div>` : ''}
      <div class="abil-passive"><div class="abil-passive-lbl">Passive effects</div>
        <textarea data-p="sla.${s.id}.passive"
          placeholder="Always-on effects, auras, resistances&#8230;">${esc(s.passive||'')}</textarea></div>
      <div class="abil-col-hdr"><span>Ability</span><span>Cost</span><span>Cooldown</span></div>
      ${(s.entries||[]).map((e,j) => `<div class="abil-entry">
        <div class="abil-entry-top">
          ${moves('mvent',s.id+':'+j,j===0,j===s.entries.length-1)}
          <input type="text" placeholder="Ability name&#8230;"
            data-p="ent.${s.id}.${j}.name" value="${esc(e.name)}">
          <input type="text" class="entcost" placeholder="0"
            data-p="ent.${s.id}.${j}.cost" value="${esc(e.cost)}">
          <input type="text" class="entcd" placeholder="&#8212;"
            data-p="ent.${s.id}.${j}.cd" value="${esc(e.cd)}">
          ${rm('delent', s.id+':'+j)}</div>
        <textarea class="abil-entry-desc" data-p="ent.${s.id}.${j}.effect"
          placeholder="What it does&#8230;">${esc(e.effect)}</textarea></div>`).join('')}
      ${addb('addent','Add Ability', s.id)}
      <div class="abil-passive" style="margin-top:8px"><div class="abil-passive-lbl">Notes</div>
        <textarea data-p="sla.${s.id}.text"
          placeholder="Thresholds, cooldowns, anything else&#8230;">${esc(s.text||'')}</textarea></div>
    </div></div>`;
}
const wornName = r => {
  const a = r.armour.list.find(x => x.id === r.armour.equipped);
  return a ? (a.name || 'Unnamed Armour') : 'Unarmoured';
};

/* ══ THE LEAF ═════════════════════════════════════════════════ */
function render(r){
  return `<div class="deck">
  <div class="tabs">
    <button class="tab-btn${r.page==='p1'?' active':''}" data-s="page" data-a="p1">&#9884; I &#183; Character &amp; Skills</button>
    <button class="tab-btn${r.page==='p2'?' active':''}" data-s="page" data-a="p2">&#127890; II &#183; Kit &amp; Craft</button>
  </div>
  <div class="leafwrap"><div class="leaf">
    ${r.page === 'p2' ? pageTwo(r) : pageOne(r)}
  </div></div>
</div>`;
}

/* ══ WIRING ═══════════════════════════════════════════════════ */
function setPath(r, path, v){
  const seg = path.split('.');
  if (seg[0] === 'sk'){                    /* sk.cat.pid[.sid[.tid]].(v|n) */
    const cat = seg[1], key = seg[seg.length-1], ids = seg.slice(2, -1);
    let n = null, list = r.skills[cat] || [];
    ids.forEach(id => { n = list.find(x => x.id === id); list = n ? (n.kids||[]) : []; });
    if (n) n[key] = key === 'v' ? Math.max(0, parseInt(v)||0) : v;
    return;
  }
  if (seg[0] === 'ent'){                   /* ent.slotId.index.field */
    const s = r.sla.find(x => x.id === seg[1]); if (!s) return;
    const e = (s.entries||[])[+seg[2]]; if (!e) return;
    e[seg[3]] = v; return;
  }
  if (seg[0] === 'armour' && seg.length === 3){
    const a = r.armour.list.find(x => x.id === seg[1]); if (!a) return;
    a[seg[2]] = seg[2] === 'av' ? Math.max(1, parseFloat(v)||1) : v; return;
  }
  if (seg.length === 3 && Array.isArray(r[seg[0]])){
    const it = r[seg[0]].find(x => x.id === seg[1]); if (!it) return;
    it[seg[2]] = ['pts','level','favor','qty'].indexOf(seg[2])>=0 ? (parseInt(v)||0) : v; return;
  }
  if (seg[0] === 'purse' && seg[1] === 'names' && seg.length === 3){
    r.purse.names[seg[2]] = v; return;
  }
  if (seg.length === 2){
    r[seg[0]][seg[1]] = (seg[0]==='attr' || seg[0]==='purse') ? Math.max(0, parseInt(v)||0) : v;
    return;
  }
  r[seg[0]] = v;
}
function repaintNumbers(r, root){
  const d = derived(r);
  const put = (id,v) => { const e = root.querySelector('#'+id); if (!e) return;
    if (e.tagName === 'INPUT') e.value = v; else e.textContent = v; };
  put('d-hp',d.hp); put('d-st',d.st); put('d-str',d.str); put('d-av',d.av); put('d-res',d.res);
  put('w-av',d.av); put('w-name',wornName(r));
  /* the struck letter follows whatever the table calls that coin */
  COINS.forEach(([k,dflt]) => {
    const b = root.querySelector('.cb-coin.' + k + ' .cb-boss b');
    if (b) b.textContent = ((r.purse.names||{})[k] || dflt).trim()[0] || dflt[0];
  });
  root.querySelectorAll('.rolls[data-chain]').forEach(el => {
    const c = el.dataset.chain.split(':');
    let list = r.skills[c[0]] || [], n = null, sum = 0;
    c.slice(1).forEach(id => { n = list.find(x => x.id === id);
      if (n){ sum += parseInt(n.v)||0; list = n.kids || []; } else list = []; });
    el.textContent = sum;
  });
}
const node = (r, cat, ids) => {
  let n = null, list = r.skills[cat] || [];
  ids.forEach(id => { n = list.find(x => x.id === id); list = n ? (n.kids = n.kids || []) : []; });
  return n;
};
/* the list something lives in, and where in it */
function siblings(r, cat, ids){
  const last = ids[ids.length-1], up = ids.slice(0,-1);
  const parent = up.length ? node(r, cat, up) : null;
  const list = parent ? (parent.kids = parent.kids || []) : (r.skills[cat] = r.skills[cat] || []);
  return { list, i: list.findIndex(x => x.id === last) };
}
function shift(list, i, by){
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return false;
  const [x] = list.splice(i,1); list.splice(j,0,x); return true;
}
const byId = (list, id) => list.findIndex(x => x.id === id);

/* clone what the book says, so editing your copy never edits the book */
const clone = o => JSON.parse(JSON.stringify(o));
function fromBook(kind, name){
  const p = pool(kind).find(x => x.name === name);
  return p ? clone(p) : null;
}

function act(r, what, arg){
  const w = what.split(':'), c = w.slice(1);
  /* arg is a string of context for a step, or a whole entry taken out of the codex */
  const a = (typeof arg === 'string' ? arg : '').split(':');
  switch (w[0]){
    case 'page':      r.page = arg; r.adding = null; return 'view';
    case 'cat':       r.cat = arg;  r.adding = null; return 'view';

    case 'pickp':     (r.skills[c[0]] = r.skills[c[0]]||[]).push({id:uid('p'),n:arg,v:0,kids:[]});
                      return true;
    case 'picks':   { const p = node(r,c[0],[c[1]]); if(p) (p.kids=p.kids||[]).push({id:uid('s'),n:arg,v:0,kids:[]});
                      return true; }
    case 'pickt':   { const s = node(r,c[0],[c[1],c[2]]); if(s) (s.kids=s.kids||[]).push({id:uid('t'),n:arg,v:0});
                      return true; }
    case 'delsk':   { const cat = a[0], ids = a.slice(1);
                      const { list, i } = siblings(r, cat, ids); if (i>=0) list.splice(i,1);
                      return true; }
    case 'mvsk':    { const cat = a[0], by = +a[a.length-1], ids = a.slice(1,-1);
                      const { list, i } = siblings(r, cat, ids); return shift(list, i, by); }

    case 'pickbg':  { const b = (arg && typeof arg === 'object') ? clone(arg)
                                : (arg ? fromBook('backgrounds', arg) : null);
                      r.bgs.push(b ? { id:uid('b'), name:b.name, inst:'', pts:0, text:b.notes||'',
                          desc:b.desc||'', profs:(b.profGroups||[]).map(g => ({
                            label:g.label, chosen:(g.chosenIdx==null?-1:g.chosenIdx), options:(g.options||[]).slice() })) }
                        : { id:uid('b'), name:'', inst:'', pts:0, text:'', desc:'', profs:[] });
                      return true; }
    case 'delbg':     r.bgs = r.bgs.filter(x => x.id !== arg); return true;
    case 'mvbg':      return shift(r.bgs, byId(r.bgs,a[0]), +a[1]);
    case 'prof':    { const b = r.bgs.find(x => x.id === a[0]); if(!b) return false;
                      const g = (b.profs||[])[+a[1]]; if(!g) return false;
                      const same = g.chosen === +a[2];
                      g.chosen = same ? -1 : +a[2];
                      g.show = same;          /* answered folds away, unanswered stays open */
                      return true; }
    case 'keepbg':  { const b = r.bgs.find(x => x.id === arg); if(!b || !b.name) return 'noname';
                      keep('backgrounds', { id:'kept_'+b.id, name:b.name, desc:b.desc||'', notes:b.text||'',
                        profGroups:(b.profs||[]).map(g => ({label:g.label, chosenIdx:-1, options:(g.options||[]).slice()})) });
                      return 'kept'; }

    case 'picksla': { const s = (arg && typeof arg === 'object') ? clone(arg)
                                : (arg ? fromBook('sla', arg) : null);
                      r.sla.push(s ? { id:uid('s'), type:s.type||'style', name:s.name, desc:s.desc||'',
                          passive:s.passive||'', text:'', favor:0,
                          entries:(s.entries||[]).map(e => ({name:e.name,cost:e.cost,cd:e.cd,effect:e.effect})) }
                        : { id:uid('s'), type:'style', name:'', desc:'', passive:'', text:'', favor:0, entries:[] });
                      return true; }
    case 'delsla':    r.sla = r.sla.filter(x => x.id !== arg); return true;
    case 'mvsla':     return shift(r.sla, byId(r.sla,a[0]), +a[1]);
    case 'keepsla': { const s = r.sla.find(x => x.id === arg); if(!s || !s.name) return 'noname';
                      keep('sla', { id:'kept_'+s.id, name:s.name, type:s.type, desc:s.desc||'',
                        passive:s.passive||'', entries:(s.entries||[]).map(e => ({name:e.name,cost:e.cost,cd:e.cd,effect:e.effect})) });
                      return 'kept'; }
    case 'addent':  { const s = r.sla.find(x => x.id === arg); if(!s) return false;
                      (s.entries = s.entries||[]).push({name:'',cost:'',cd:'',effect:''}); return true; }
    case 'delent':  { const s = r.sla.find(x => x.id === a[0]); if(!s) return false;
                      s.entries.splice(+a[1],1); return true; }
    case 'mvent':   { const s = r.sla.find(x => x.id === a[0]); if(!s) return false;
                      return shift(s.entries, +a[1], +a[2]); }

    case 'picktrait': { const t = (arg && typeof arg === 'object') ? arg : null;
                      r.traits.push(t ? { id:uid('t'), name:t.name, text:t.text||t.desc||'', src:t.src||'' }
                                      : { id:uid('t'), name:'', text:'', src:'' });
                      return true; }
    case 'deltrait':  r.traits = r.traits.filter(x => x.id !== arg); return true;
    case 'mvtrait':   return shift(r.traits, byId(r.traits,a[0]), +a[1]);
    case 'keeptrait':{ const t = r.traits.find(x => x.id === arg); if(!t || !t.name) return 'noname';
                      keep('traits', { id:'kept_'+t.id, name:t.name, text:t.text||'', src:t.src||'' });
                      return 'kept'; }

    case 'addknack':  r.knacks.push({id:uid('k'),name:'',level:0}); return true;
    case 'delknack':  r.knacks = r.knacks.filter(x => x.id !== arg); return true;
    case 'mvknack':   return shift(r.knacks, byId(r.knacks,a[0]), +a[1]);
    case 'pickwep': { const w = (arg && typeof arg === 'object') ? arg : null;
                      r.weapons.push(w ? {id:uid('w'),name:w.name,range:w.range||'',dmg:w.dmg||'',
                        type:w.type||'',quality:w.quality||'',note:w.note||''}
                        : {id:uid('w'),name:'',range:'',dmg:'',type:'',quality:'',note:''});
                      return true; }
    case 'keepwep': { const w = r.weapons.find(x => x.id === arg); if(!w || !w.name) return 'noname';
                      keep('weapons', {id:'kept_'+w.id, name:w.name, range:w.range, dmg:w.dmg,
                        type:w.type, quality:w.quality, note:w.note}); return 'kept'; }
    case 'delwep':    r.weapons = r.weapons.filter(x => x.id !== arg); return true;
    case 'mvwep':     return shift(r.weapons, byId(r.weapons,a[0]), +a[1]);
    case 'pickitem':{ const it = (arg && typeof arg === 'object') ? arg : null;
                      r.items.push(it ? {id:uid('i'),name:it.name,qty:+it.qty||1,
                        where:it.where||'',note:it.note||'',open:!!(it.note||'').trim()}
                        : {id:uid('i'),name:'',qty:1,where:'',note:'',open:false});
                      return true; }
    case 'keepitem':{ const it = r.items.find(x => x.id === arg); if(!it || !it.name) return 'noname';
                      keep('items', {id:'kept_'+it.id, name:it.name, qty:it.qty, where:it.where,
                        note:it.note}); return 'kept'; }
    case 'additem':   r.items.push({id:uid('i'),name:'',qty:1,where:'',note:''}); return 'new';
    case 'addwep':    r.weapons.push({id:uid('w'),name:'',range:'',dmg:'',type:'',quality:'',note:''}); return 'new';
    case 'addtrait':  r.traits.push({id:uid('t'),name:'',text:'',src:''}); return 'new';
    case 'addarm':  { const id = uid('a'); r.armour.list.push({id,name:'',av:2,quality:'',note:''});
                      r.armour.equipped = id; return 'new'; }
    case 'profshow':{ const b = r.bgs.find(x => x.id === a[0]); if(!b) return false;
                      const g = (b.profs||[])[+a[1]]; if(!g) return false;
                      g.show = !g.show; return 'view'; }
    case 'delitem':   r.items = r.items.filter(x => x.id !== arg); return true;
    case 'mvitem':    return shift(r.items, byId(r.items,a[0]), +a[1]);
    case 'pickarm': { const a = (arg && typeof arg === 'object') ? arg : null;
                      const id = uid('a');
                      r.armour.list.push(a ? {id,name:a.name,av:+a.av||2,quality:a.quality||'',note:a.note||''}
                                           : {id,name:'',av:2,quality:'',note:''});
                      r.armour.equipped = id; return true; }
    case 'keeparm': { const a = r.armour.list.find(x => x.id === arg); if(!a || !a.name) return 'noname';
                      keep('armour', {id:'kept_'+a.id, name:a.name, av:a.av, quality:a.quality,
                        note:a.note}); return 'kept'; }
    case 'delarm':    r.armour.list = r.armour.list.filter(x => x.id !== arg);
                      if (r.armour.equipped === arg) r.armour.equipped = null; return true;
    case 'mvarm':     return shift(r.armour.list, byId(r.armour.list,a[0]), +a[1]);
    case 'wear':      r.armour.equipped = arg || null; return true;
    case 'dropic':    r.who[arg] = ''; return true;
  }
  return false;
}

function note(r){
  const bits = [r.who.rank, r.who.species, r.who.culture].filter(Boolean);
  const d = derived(r);
  return (bits.length ? bits.join(' · ') + ' — ' : '') +
    'HP ' + d.hp + ' · St ' + d.st + ' · Str ' + d.str;
}

window.Sheet = { blank, fill, render, act, setPath, repaintNumbers, derived, note,
                 keep, dropKept, mine, pool };
})();

/* ══════════════════════════════════════════════════════════════
   WHAT THE CODEX SHOWS

   Every picker reads the same shape: {name, sub, find, read,
   value, kept}. `read` is the whole entry, so nothing is ever
   taken sight unseen.
══════════════════════════════════════════════════════════════ */
(function(){
const S = window.Sheet;
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const para = t => esc(String(t||'').trim()).replace(/\r?\n+/g,'<br>');
const SD = window.SKILL_DATA;

const H = (t, sub) => `<div class="cx-h"><h4>${esc(t)}</h4>${sub?`<span>${esc(sub)}</span>`:''}</div>`;

/* ── skills: the tree tells you what a name opens up ── */
function skillEntries(cat, tier, ctx){
  const D = SD[cat] || {};
  if (tier === 'p') return Object.keys(D).filter(n => (ctx && ctx.have || []).indexOf(n) < 0).map(n => {
    const secs = (D[n].secondaries||[]);
    return { name:n, sub:secs.length + ' secondaries', find:secs.join(' '), value:n,
      read: H(n, 'Primary · ' + cat) +
        `<p class="cx-p">A primary skill. What you roll for a test under it is this value,
         plus the secondary and tertiary below it.</p>
         <div class="cx-sub">Secondaries it opens</div>
         <ul class="cx-ul">${secs.map(x => `<li>${esc(x)}
           ${(D[n].tertiaries||{})[x] && D[n].tertiaries[x].length
             ? `<i>${D[n].tertiaries[x].map(esc).join(' · ')}</i>` : ''}</li>`).join('') || '<li><i>none written</i></li>'}</ul>` };
  });
  if (tier === 's'){
    const def = D[ctx.prim] || {};
    return (def.secondaries||[]).filter(n => ctx.have.indexOf(n) < 0).map(n => {
      const ters = (def.tertiaries||{})[n] || [];
      return { name:n, sub: ters.length ? ters.length + ' tertiaries' : 'no tertiaries',
        find:ters.join(' '), value:n,
        read: H(n, ctx.prim + ' › ' + n) +
          `<p class="cx-p">A test under a tertiary of this rolls
            <b>${esc(ctx.prim)} + ${esc(n)} + the tertiary</b>.</p>
           <div class="cx-sub">Tertiaries</div>
           <ul class="cx-ul">${ters.map(x => `<li>${esc(x)}</li>`).join('') || '<li><i>none written</i></li>'}</ul>` };
    });
  }
  const def = D[ctx.prim] || {};
  const ters = ((def.tertiaries||{})[ctx.sec] || []).filter(n => ctx.have.indexOf(n) < 0);
  return ters.map(n => ({ name:n, sub: ctx.prim + ' › ' + ctx.sec, value:n,
    read: H(n, ctx.prim + ' › ' + ctx.sec + ' › ' + n) +
      `<p class="cx-p">The most specific tier. You roll
       <b>${esc(ctx.prim)} + ${esc(ctx.sec)} + ${esc(n)}</b>.</p>
       <p class="cx-p dim">Have only the parent and you may still roll, at +2 difficulty,
       with the missing tier counting as 0.</p>` }));
}

function bgEntries(){
  return S.pool('backgrounds').map(b => ({
    name:b.name, kept:!b._book, value:b,
    sub:(b.profGroups||[]).length + ' proficiency ' + ((b.profGroups||[]).length===1?'choice':'choices'),
    find:(b.profGroups||[]).map(g => (g.options||[]).join(' ')).join(' '),
    read: H(b.name, 'Background') +
      `<p class="cx-p">${para(b.desc) || '<i>no description written</i>'}</p>` +
      (b.profGroups||[]).map(g => `<div class="cx-sub">${esc(g.label||'Proficiency')}</div>
        <ul class="cx-ul tight">${(g.options||[]).map(o => `<li>${esc(o)}</li>`).join('')}</ul>`).join('') +
      `<p class="cx-p dim">Each proficiency raises its own skill and every skill above it by one.</p>`
  }));
}
function slaEntries(){
  const kindName = { style:'Style', lore:'Lore', art:'Art' };
  return S.pool('sla').map(x => ({
    name:x.name, kept:!x._book, value:x,
    sub:(kindName[x.type]||'Style') + ' · ' + (x.entries||[]).length + ' abilities',
    find:(x.entries||[]).map(e => e.name).join(' '),
    read: H(x.name, kindName[x.type]||'Style') +
      `<p class="cx-p">${para(x.desc) || '<i>no description written</i>'}</p>` +
      (x.passive ? `<div class="cx-sub">Passive</div><p class="cx-p">${para(x.passive)}</p>` : '') +
      `<div class="cx-sub">Abilities</div>
       <table class="cx-t"><tbody>${(x.entries||[]).map(e => `<tr>
         <td class="n">${esc(e.name)}</td><td class="c">${esc(e.cost)}</td>
         <td class="d">${esc(e.cd)}</td></tr><tr class="e"><td colspan="3">${para(e.effect)}</td></tr>`).join('')}
       </tbody></table>`
  }));
}
function simpleEntries(kind, title, line){
  return S.pool(kind).map(x => ({
    name:x.name, kept:!x._book, value:x, sub:line(x),
    read: H(x.name, title) +
      (kind === 'weapons' ? `<table class="cx-kv"><tbody>
          <tr><th>Range</th><td>${esc(x.range||'—')} <i>lines forward, your own line is 0</i></td></tr>
          <tr><th>Damage</th><td>${esc(x.dmg||'—')}</td></tr>
          <tr><th>Type</th><td>${esc(x.type||'—')}</td></tr>
          <tr><th>Quality</th><td>${esc(x.quality||'—')}</td></tr></tbody></table>` : '') +
      (kind === 'armour' ? `<table class="cx-kv"><tbody>
          <tr><th>Armour Value</th><td>${esc(x.av||1)} <i>Health is Fortitude × AV + Resilience</i></td></tr>
          <tr><th>Quality</th><td>${esc(x.quality||'—')}</td></tr></tbody></table>` : '') +
      (kind === 'items' ? `<table class="cx-kv"><tbody>
          <tr><th>Carried</th><td>${esc(x.qty||1)}</td></tr>
          <tr><th>Where</th><td>${esc(x.where||'—')}</td></tr></tbody></table>` : '') +
      `<p class="cx-p">${para(x.note) || '<i>nothing written about it</i>'}</p>`
  }));
}
function traitEntries(){
  return S.pool('traits').map(x => ({
    name:x.name, kept:!x._book, value:x, sub:x.src || 'trait',
    read: H(x.name, x.src || 'Passive trait') +
      `<p class="cx-p">${para(x.text) || '<i>nothing written about it</i>'}</p>`
  }));
}

/* the short forms: a name, and one line telling you what is under it.
   No reading pane, because there is nothing here to read. */
function skillNames(cat, tier, ctx){
  const D = SD[cat] || {};
  if (tier === 'p') return Object.keys(D)
    .filter(n => (ctx && ctx.have || []).indexOf(n) < 0)
    .map(n => ({ name:n, value:n, find:(D[n].secondaries||[]).join(' '),
      sub:(D[n].secondaries||[]).slice(0,4).join(' · ') +
          ((D[n].secondaries||[]).length > 4 ? ' …' : '') }));
  if (tier === 's'){
    const def = D[ctx.prim] || {};
    return (def.secondaries||[]).filter(n => ctx.have.indexOf(n) < 0).map(n => {
      const t = (def.tertiaries||{})[n] || [];
      return { name:n, value:n, find:t.join(' '),
        sub: t.length ? t.slice(0,4).join(' · ') + (t.length>4?' …':'') : 'no tertiaries' };
    });
  }
  const def = D[ctx.prim] || {};
  return ((def.tertiaries||{})[ctx.sec] || []).filter(n => ctx.have.indexOf(n) < 0)
    .map(n => ({ name:n, value:n }));
}
function shortList(kind){
  return S.pool(kind).map(x => ({ name:x.name, value:x, kept:!x._book,
    sub: kind === 'weapons' ? [x.dmg, x.type].filter(Boolean).join(' · ')
       : kind === 'armour'  ? 'AV ' + (x.av||1)
       : kind === 'traits'  ? (x.src || '')
       : (x.where || '') }));
}

window.SheetCodex = { skillEntries, skillNames, shortList, bgEntries, slaEntries, traitEntries,
  weaponEntries: () => simpleEntries('weapons','Weapon',
    x => [x.dmg, x.type, x.range && ('range ' + x.range)].filter(Boolean).join(' · ')),
  armourEntries: () => simpleEntries('armour','Armour', x => 'AV ' + (x.av||1)),
  itemEntries:   () => simpleEntries('items','Kit', x => x.where || 'carried') };
})();
