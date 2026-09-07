/* ═══════════════════════════════════════════════════════════════
   THE COMBAT HUD

   A MENU, not a browser. Four levels, and only one of them is on screen at a
   time, because the thing you are mostly doing in this view is reading the
   board:

     0  the bar          who you are, what you can spend, and your SOURCES —
                         your weapon, your Styles, your Lores, your Arts.
                         Not your abilities. Attack and Move sit out front
                         because hitting the thing in front of you should not
                         cost three clicks.
     1  a source opens   what that Style does, in the book's own words.
                         NO COMPUTED NUMBERS AT ALL. You know what your Style
                         does; you bought it. Printing a damage range beside
                         every line turns choosing into arithmetic, which is
                         the one thing a person at a table is there to escape.
     2  you pick one     NOW the numbers: the dice you roll, the skill you can
                         spend, the damage with your Prowess in it, the reach,
                         and exactly what it will cost. This is the popup that
                         says yes, you can use this.
     3  the board        the menu CLOSES. One thin strip remains, legal targets
                         light up on the field, and you click a figure.

   Browsing is a book. Selecting is a declaration. Resolving is a record.

   It only exists in the field — in the table view there is no HUD, because
   the table view is for looking at the whole board.
   ═══════════════════════════════════════════════════════════════ */
(function(){
const R = window.RULES, C = window.CONTENT;
if (!R || !C) return;

const byId = (list, id) => (list || []).find(x => x.id === id);
const weaponOf = sh => byId(C.WEAPONS, sh.equipped) || null;

/* ── the character behind the HUD ──────────────────────────── */
function actorOf(e){
  const sh = e.sheet; if (!sh) return null;
  const line = (S.lines.find(l => l.ents.includes(e)) || {}).key;
  return { ...sh, id:e.id, name:e.name, line, hp:e.hp, maxHp:e.max,
           q:e.q !== false, f:e.f !== false,
           armed:(e.armed || []).map(a => a.id),
           weapon:weaponOf(sh), size:sh.size };
}
function sweepArmed(e){
  if (!e.armed || !e.armed.length) return;
  const before = e.armed.length;
  e.armed = e.armed.filter(a => a.round >= S.round);
  if (e.armed.length !== before) toast('Your set actions expired');
}
const board = () => ({ field:{ mana:S.mana }, lines:S.lines });
const clock = () => ({ round:S.round, combat:S.combat|0, day:S.day|0, week:S.week|0 });

/* ── what this character can do, grouped BY SOURCE ─────────────
   The rules put abilities in four places and a character sheet is organised
   the same way, so that is the top level of the menu. */
function sourcesOf(e){
  const a = actorOf(e); if (!a) return [];
  const out = [];

  const w = weaponOf(a);
  if (w) out.push({ key:'weapon', name:'Attack', sub:w.name, kind:'weapon',
    direct:{ id:'atk-' + w.id, name:'Attack', action:'full', cost:{},
      range:w.range, roll:{ skill:w.skill, attr:w.attr },
      targets:{ side:'enemy', kind:['unit','formation'] },
      effects:[{ effect:'damage', amount:w.damage, type:w.damageType, when:'onHit' },
               ...(w.effects || [])],
      text:'A basic attack with your ' + w.name.toLowerCase() + '.' },
    weapon:w });

  out.push({ key:'move', name:'Move', kind:'move',
    sub:R.moveSpeed(a) + ' line' + (R.moveSpeed(a) === 1 ? '' : 's'),
    direct:{ id:'move', name:'Move', action:'quick', cost:{},
      targets:{ side:'self' },
      text:'One line costs a quick action. Your full action moves you up to '
         + R.moveSpeed(a) + ' lines.' } });

  /* the generic moves your weapon unlocks — same source as the weapon */
  if (w){
    const extra = [];
    for (const g of C.GENERIC){
      if (!g.forTags.some(t => w.tags.includes(t) || w.name.toLowerCase().includes(t))) continue;
      const sk = R.skillTotal(a, w.skill);
      const tert = (a.skills || {})[w.skill[w.skill.length-1]] || 0;
      const locked = sk.total < g.unlock.skillTotal || tert < g.unlock.tertiary;
      extra.push({ ability:{ ...g, roll:{ skill:w.skill, attr:w.attr }, range:w.range,
                             targets:{ side:'enemy', kind:['unit'] } },
                   weapon:w, locked,
                   lockNote:locked ? 'needs ' + g.unlock.skillTotal + ' combined skill and '
                     + g.unlock.tertiary + ' in ' + w.skill[w.skill.length-1] : null });
    }
    if (extra.length) out.push({ key:'moves', name:w.name, sub:'weapon moves',
                                 kind:'weapon', items:extra });
  }

  const shelf = (list, coll, kind, resource) => { for (const id of list || []){
    const src = byId(C[coll], id); if (!src) continue;
    out.push({ key:kind + ':' + src.id, name:src.name, kind, src,
      sub:resource(src),
      items:(src.abilities || []).map(ab => ({ ability:ab })),
      passives:(src.passives || []).map(ab => ({ ability:ab })) }); } };
  shelf(a.styles, 'STYLES', 'style', () => (a.stamina|0) + ' stamina');
  shelf(a.lores,  'LORES',  'lore',  () => S.mana + ' mana in the air');
  shelf(a.arts,   'ARTS',   'art',   src => {
    const bank = R.favorIn(a, src.id);
    return (bank == null ? 'no favor' : bank + ' favor'); });

  const traits = (a.traits || []).map(t => byId(C.TRAITS, t)).filter(Boolean);
  if (traits.length) out.push({ key:'traits', name:'Traits', sub:'always on',
    kind:'trait', passives:traits.map(ab => ({ ability:ab })) });
  return out;
}

const entryFor = (e, id) => {
  for (const s of sourcesOf(e)){
    if (s.direct && s.direct.id === id) return { ability:s.direct, weapon:s.weapon, src:s };
    for (const it of (s.items || [])) if (it.ability.id === id) return { ...it, src:s };
    for (const it of (s.passives || [])) if (it.ability.id === id) return { ...it, src:s, passive:true };
  }
  return null;
};
function describeOf(entry, e, target){
  const a = actorOf(e);
  return R.describe(entry.ability, a, board(),
                    { weapon:entry.weapon || a.weapon, target:target || null });
}

/* ── can you, and if not why not ───────────────────────────────
   Every reason is a sentence, because a greyed-out row with no explanation
   reads as a broken app. This is the ONE computed thing level 1 is allowed:
   not what it would do, only whether you may. */
function blockers(entry, e){
  const a = actorOf(e), ab = entry.ability, out = [];
  if (entry.locked) out.push(entry.lockNote);
  const d = R.describe(ab, a, board(), { weapon:entry.weapon || a.weapon });
  if (!d.action.ok) out.push(d.action.why);
  d.cost.parts.filter(p => !p.ok).forEach(p => out.push(
    p.missing   ? 'you do not have this Art'
    : p.threshold ? 'needs ' + p.need + ' Favor banked, you have ' + p.have
    : p.shared  ? 'only ' + p.have + ' mana in the air, it needs ' + p.need
    : 'you have ' + p.have + ' ' + p.kind + ', it costs ' + p.need));
  if (!d.canCast) out.push('cast from the ' + (d.castZones || []).join(' or ') + ' line');
  if (!d.ready)   out.push('a cantrip needs 5 mana in the air');
  if (d.use.kind === 'response' && !d.use.ready) out.push(d.use.why);
  if (d.use.kind === 'reaction') out.push('a reaction — not on your turn');
  const av = R.available(ab, a, clock());
  if (!av.ok) out.push(av.why);
  return out.filter(Boolean);
}

/* ══ LEVEL 0 — THE BAR ═════════════════════════════════════════ */
let bar = null, open = null, picked = null, aim = null;

function el(){
  if (bar) return bar;
  bar = document.createElement('div');
  bar.className = 'abar';
  document.body.appendChild(bar);
  return bar;
}
const ACT = { free:'Free', quick:'Quick', full:'Full', reaction:'Reaction' };

function barHTML(e){
  const a = actorOf(e), sh = e.sheet;
  const hp = Math.max(0, Math.min(1, e.hp / (e.max || 1))) * 100;
  const st = Math.max(0, Math.min(1, sh.stamina / (sh.maxStamina || 1))) * 100;
  const srcs = sourcesOf(e);
  return `<div class="abar-me">
      <span class="aport">${esc(e.mono)}</span>
      <div class="awho">
        <b>${esc(e.name)}</b>
        <div class="agauge hp"><i style="width:${hp.toFixed(0)}%"></i><u>${e.hp}/${e.max}</u></div>
        <div class="agauge st"><i style="width:${st.toFixed(0)}%"></i><u>${sh.stamina}/${sh.maxStamina}</u></div>
      </div>
      <div class="apips">
        <button class="apip${e.q ? '' : ' out'}" id="a-q">Quick</button>
        <button class="apip${e.f ? '' : ' out'}" id="a-f">Full</button>
      </div>
    </div>
    <div class="asrcs">${srcs.map(s => {
      /* COUNT WHAT IS IN THERE, AND CALL IT WHAT IT IS. Traits keep everything
         in `passives`, so counting only `items` printed "0 moves" on a tile
         with four traits behind it — and "moves" is the weapon's word, not a
         Style's or an Art's. */
      /* COUNT WHAT YOU CAN PRESS. A Style with eight abilities and one
         always-on passive is eight things to do, not nine — and a Traits tile,
         which is nothing but passives, counts those instead of printing zero. */
      const n = s.direct ? 1 : ((s.items || []).length || (s.passives || []).length);
      const noun = s.key === 'moves' ? ['move','moves']
                 : s.kind === 'trait' ? ['trait','traits'] : ['ability','abilities'];
      return `<button class="asrc k-${s.kind}${open === s.key ? ' on' : ''}" data-src="${s.key}">
        <b>${esc(s.name)}</b><i>${esc(s.sub || '')}</i>${
        s.direct ? `<em>${ACT[s.direct.action] || ''}</em>`
                 : `<em>${n} ${noun[n === 1 ? 0 : 1]}</em>`}</button>`;
    }).join('')}</div>
    <div class="abar-end">
      <div class="amana"><b>${S.mana}</b><i>mana in the air</i></div>
      <button class="aend" id="a-end">End<br>Turn</button>
    </div>`;
}

/* ══ LEVEL 1 — A SOURCE OPENS ══════════════════════════════════
   The book's own words. No dice, no ranges, no reach diagrams. */
function menuHTML(e, s){
  const items = s.items || [];
  const row = it => {
    const ab = it.ability, stop = blockers(it, e);
    const cost = [];
    if (ab.cost && ab.cost.stamina) cost.push(ab.cost.stamina + ' stamina');
    if (ab.cost && ab.cost.mana)    cost.push(ab.cost.mana + ' mana');
    if (ab.cost && ab.cost.hp)      cost.push(ab.cost.hp + ' HP');
    if (ab.cost && ab.cost.favor)   cost.push(ab.cost.favor + ' favor');
    if (ab.favorThreshold != null)  cost.push(ab.favorThreshold + ' favor banked');
    if (ab.cantrip)                 cost.push('cantrip');
    if (ab.uses) cost.push((ab.uses.n || 1) + '× per ' + (ab.uses.per || 'combat'));
    if (ab.cooldown) cost.push(R.turnsOf(ab.cooldown.turns != null ? ab.cooldown.turns : ab.cooldown)
                               + ' turn cooldown');
    return `<li class="aitem${stop.length ? ' cold' : ''}" data-ab="${ab.id}">
      <div class="ahead"><b>${esc(ab.name)}</b>
        <em>${[ACT[ab.action] || (ab.action ? esc(ab.action) : 'passive'),
               ...cost].filter(Boolean).join(' · ')}</em></div>
      ${ab.text ? `<p>${esc(ab.text)}</p>` : ''}
      ${ab.trigger ? `<p class="atrig">Triggers when ${esc(ab.trigger)}</p>` : ''}
      ${stop.length ? `<span class="astop">${esc(stop[0])}</span>` : ''}
    </li>`;
  };
  const pass = (s.passives || []);
  return `<div class="amenu${items.length > 5 ? ' two' : ''}">
    <header><b>${esc(s.name)}</b><span>${esc(s.sub || '')}</span>
      <button class="ax" id="a-close">&times;</button></header>
    ${items.length ? `<ul>${items.map(row).join('')}</ul>` : ''}
    ${pass.length ? `<div class="apass"><h5>Always on</h5>${pass.map(it =>
      `<p><b>${esc(it.ability.name)}</b> ${esc(it.ability.text || '')}</p>`).join('')}</div>` : ''}
  </div>`;
}

/* ══ LEVEL 2 — YOU PICKED ONE, HERE ARE THE NUMBERS ════════════ */
function confirmHTML(e, entry){
  const a = actorOf(e), ab = entry.ability;
  const d = describeOf(entry, e);
  const stop = blockers(entry, e);
  const rows = [];

  const pay = [];
  /* SAY WHICH ACTION IT ACTUALLY IS. This read the spends field and printed
     QUICK for anything that was not full — so Brace, a FREE action, was
     announced as costing your quick one, which is the opposite of what the
     rules say and the sort of thing that loses a fight. A free action and a
     reaction cost you no action at all and say so; a quick one declared when
     your quick is gone says that it is being paid for out of your full. */
  if (ab.action === 'free')          pay.push('no action — it is free');
  else if (ab.action === 'reaction') pay.push('a reaction, not your turn');
  else if (d.action.spends === 'full' && ab.action === 'quick')
                                     pay.push('your FULL action (your quick is spent)');
  else if (d.action.spends)          pay.push('your ' + d.action.spends.toUpperCase() + ' action');
  d.cost.parts.forEach(p => pay.push(
    p.threshold ? p.need + ' Favor banked (you have ' + p.have + ')'
                : p.need + ' ' + p.kind));
  if (pay.length) rows.push(['Costs', pay.join(' + ')]);

  if (d.roll) rows.push(['Roll', `<b>${d.roll.pool}d6</b> ${esc(d.roll.attrLabel)}
      &middot; <b>${d.roll.skill.total}</b> skill to spend
      <span class="apath">${d.roll.skill.parts.map(x =>
        esc(x.name) + ' ' + x.value).join(' · ')}${
        d.roll.skill.untrained ? ' · untrained, +2 difficulty' : ''}</span>`]);

  /* GROUPED BY WHEN. Brace does three things when it triggers, and listing
     "when it triggers" three times down the left margin reads like three
     separate conditions rather than one moment with three consequences. */
  const byWhen = [];
  d.effects.forEach(fx => {
    const label = fx.when === 'always' ? 'Does' : esc(fx.whenText);
    const line = esc(fx.text) + (fx.note ? ' <span class="anote">' + esc(fx.note) + '</span>' : '');
    const last = byWhen[byWhen.length - 1];
    if (last && last[0] === label) last[1].push(line); else byWhen.push([label, [line]]);
  });
  byWhen.forEach(([label, lines]) => rows.push([label,
    lines.length === 1 ? lines[0] : '<span class="alist">' + lines.join('</span><span class="alist">') + '</span>']));

  if (ab.range != null) rows.push(['Reach', ab.range === 0 ? 'your own line'
    : ab.range + ' line' + (ab.range === 1 ? '' : 's') + ' forward']);
  if (d.castZones) rows.push(['Cast from', esc(d.castZones.join(' or ')) + ' line']);

  return `<div class="aconf${stop.length ? ' no' : ''}">
    <h4>${esc(ab.name)}<i>${stop.length ? esc(stop[0]) : 'you can use this'}</i></h4>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    ${ab.todo ? `<div class="atodo">Not settled in the rules yet &mdash; ${
      ab.todo.map(esc).join('; ')}</div>` : ''}
    <div class="aacts">
      ${stop.length ? '' : `<button class="ago" id="a-go">${
        needsTarget(ab) ? 'Choose a target' : 'Declare it'}</button>`}
      <button class="aback" id="a-back">Back</button>
    </div>
  </div>`;
}

/* Setting a card down is not aiming it, and neither is moving. */
const needsTarget = ab => !ab.arms && !!(ab.targets && ab.targets.side
  && ab.targets.side !== 'self') && ab.id !== 'move';

/* ══ LEVEL 3 — THE BOARD ═══════════════════════════════════════ */
function aimHTML(){
  return `<div class="aaim"><b>${esc(aim.name)}</b>
    <span>pick who it lands on</span>
    <button class="aback" id="a-cancel">Cancel</button></div>`;
}

/* ══ DRAW ══════════════════════════════════════════════════════ */
function render(){
  const e = S.sel && entById(S.sel);
  const inField = document.body.classList.contains('field-on');
  const mine = e && e.sheet && canControl(e) && inField;
  const b = el();
  if (!mine){
    b.classList.remove('on');
    document.body.classList.remove('hud-on');
    if (aim) cancelAim(true);
    open = picked = null;
    b.innerHTML = '';
    return;
  }
  sweepArmed(e);
  b.classList.add('on');
  document.body.classList.add('hud-on');
  const src = open && sourcesOf(e).find(s => s.key === open);
  const entry = picked && entryFor(e, picked);
  b.innerHTML = barHTML(e)
    + (aim ? aimHTML()
      : entry ? confirmHTML(e, entry)
      : src ? menuHTML(e, src) : '');
}

/* ══ THE GESTURE ═══════════════════════════════════════════════ */
document.addEventListener('click', ev => {
  const e = S.sel && entById(S.sel);
  if (!e || !bar || !bar.classList.contains('on')) return;
  const hit = sel => ev.target.closest(sel);

  if (hit('#a-close')){ open = picked = null; render(); return; }
  if (hit('#a-back')){ picked = null; render(); return; }
  if (hit('#a-cancel')){ cancelAim(); return; }
  if (hit('#a-q')){ e.q = !e.q; window.render(); return; }
  if (hit('#a-f')){ e.f = !e.f; window.render(); return; }
  if (hit('#a-end')){ endTurn(); return; }

  const s = hit('.asrc');
  if (s){
    const key = s.dataset.src;
    const source = sourcesOf(e).find(x => x.key === key);
    picked = null;
    if (source && source.direct){ open = null; picked = source.direct.id; }
    else open = (open === key ? null : key);
    render(); return;
  }
  const it = hit('.aitem');
  if (it){ picked = it.dataset.ab; render(); return; }

  if (hit('#a-go')){
    const entry = entryFor(e, picked); if (!entry) return;
    if (needsTarget(entry.ability)) beginAim(entry, e);
    else declare(entry, null);
    return;
  }
});

addEventListener('keydown', ev => {
  if (ev.key !== 'Escape' || !bar || !bar.classList.contains('on')) return;
  if (aim){ cancelAim(); ev.stopPropagation(); return; }
  if (picked){ picked = null; render(); ev.stopPropagation(); return; }
  if (open){ open = null; render(); ev.stopPropagation(); }
}, true);

/* ── aiming on the field ──────────────────────────────────────── */
function beginAim(entry, e){
  const d = describeOf(entry, e);
  const legal = (d.targets || []).filter(t => t.ok).map(t => t.ent.id);
  if (!legal.length){ toast('Nothing it can reach from where you are standing'); return; }
  aim = { id:entry.ability.id, name:entry.ability.name, entry, legal };
  open = picked = null;
  if (window.__field) window.__field.aim(legal);
  document.body.classList.add('aiming');
  render();
}
function cancelAim(quiet){
  aim = null;
  if (window.__field) window.__field.aim(null);
  document.body.classList.remove('aiming');
  if (!quiet) toast('Cancelled');
  render();
}
/* the field's own click handler asks us first while a card is in the air */
window.__hudTarget = id => {
  if (!aim) return false;
  if (!aim.legal.includes(id)) { toast('Not a legal target'); return true; }
  const e = entById(S.sel), entry = entryFor(e, aim.id);
  const keep = entry;
  cancelAim(true);
  declare(keep, id);
  return true;
};

/* ══ DECLARING ═════════════════════════════════════════════════
   A proposal on the table. Nothing spent, nothing rolled, nothing moved. */
function declare(entry, targetId){
  const e = entById(S.sel); if (!e || !entry) return;
  const stop = blockers(entry, e);
  if (stop.length){ toast(stop[0]); return; }
  S.intent = { by:e.id, ability:entry.ability.id, target:targetId || null,
               weapon:(entry.weapon || {}).id || null };
  open = picked = null;
  if (S.autoAllow && S.autoDiff != null){ S.intent.diff = S.autoDiff; allow(S.intent); return; }
  toast('Declared — waiting on the GM');
  window.render();
}

/* ── the GM's yes ─────────────────────────────────────────────
   From here the app executes the description it already showed in full. */
function allow(it){
  const e = entById(it.by); if (!e) return;
  const a = actorOf(e);
  const entry = entryFor(e, it.ability); if (!entry) return;
  const tgt = it.target && entById(it.target);
  const r = R.resolve(entry.ability, a, { target:tgt, difficulty:it.diff,
                                          weapon:entry.weapon || a.weapon });
  if (r.needsDifficulty){ toast('Set a difficulty first'); return; }
  applyChanges(r.changes);
  it.result = { ...r.roll, diff:(r.roll ? r.roll.difficulty : 0), hit:r.hit,
                applied:r.applied, forGM:r.forGM };
  chat(e.name, entry.ability.name, it.result, tgt);
  window.render();
}

function applyChanges(changes){
  for (const c of changes){
    const e = c.to && entById(c.to), who = c.who && entById(c.who);
    switch (c.op){
      case 'hp':
        if (!e) break;
        if (e.kind === 'form') e.alive = Math.max(0, e.alive + (c.delta < 0 ? -1 : 1));
        else e.hp = Math.max(0, Math.min(e.max, (e.hp || 0) + c.delta));
        break;
      case 'token': {
        if (!e) break;
        e.cond = e.cond || [];
        const t = e.cond.find(x => x.n === c.token);
        if (c.delta <= -99) e.cond = e.cond.filter(x => x.n !== c.token);
        else if (t){ t.c += c.delta; if (t.c <= 0) e.cond = e.cond.filter(x => x !== t); }
        else if (c.delta > 0) e.cond.push({ n:c.token, c:c.delta });
        break; }
      case 'push': {
        if (!e) break;
        const from = S.lines.find(l => l.ents.includes(e)); if (!from) break;
        const here = R.LINE_AT[from.key], me = R.LINE_AT[c.from];
        const away = me && me.side === 'al' ? 1 : -1;
        const to = S.lines.find(l => R.LINE_AT[l.key].i === here.i + away * c.lines);
        if (!to || usedIn(to) + slotsOf(e) > S.width) break;
        from.ents.splice(from.ents.indexOf(e), 1);
        e.col = firstFree(to, slotsOf(e), colOf(e), e);
        to.ents.push(e); to.ents.sort((x,y) => colOf(x) - colOf(y));
        break; }
      case 'arm':
        if (!who) break;
        who.armed = who.armed || [];
        if (!who.armed.some(x => x.id === c.ability))
          who.armed.push({ id:c.ability, token:c.token, round:S.round });
        break;
      case 'spend':
        if (who && who.sheet) who.sheet[c.kind] = Math.max(0, (who.sheet[c.kind] || 0) - c.n);
        break;
      case 'mana': S.mana = Math.max(0, S.mana + c.n); break;
      case 'action':
        if (who) who[c.kind === 'full' ? 'f' : 'q'] = false;
        break;
    }
  }
}

/* ── the GM's half, in the sheet's own bar ─────────────────────
   The app never guesses a difficulty. The field starts EMPTY. */
function intentHTML(){
  const it = S.intent; if (!it) return '';
  const e = entById(it.by); if (!e) return '';
  const entry = entryFor(e, it.ability); if (!entry) return '';
  const tgt = it.target && entById(it.target);
  return `<div class="ibar${it.result ? ' done' : ''}">
    <span class="ilab">Declared</span>
    <span class="itxt"><b>${esc(e.name)}</b> &mdash; ${esc(entry.ability.name)}${
      tgt ? ' on <b>' + esc(tgt.name) + '</b>' : ''}</span>
    ${it.result ? renderResult(it.result) : `<span class="iacts">
      ${ROLE === 'gm' ? `<label class="idiff">Difficulty
        <input id="i-diff" type="number" min="0" max="12" placeholder="?"
               value="${it.diff == null ? '' : it.diff}"
               oninput="if(S.intent) S.intent.diff = this.value===''?null:+this.value"></label>
      <button class="act" id="i-yes">Allow &amp; roll</button>
      <button class="act" id="i-no">Refuse</button>`
      : `<button class="act" id="i-no">Withdraw</button>
         <span class="iwait">waiting on the GM</span>`}</span>`}
  </div>`;
}
function chat(who, what, r, tgt){
  const cb = document.getElementById('chat-body'); if (!cb) return;
  const chips = (r.dice || []).map((v, i) => v === null
    ? `<i class="lo gone">${r.raw[i]}</i>`
    : `<i class="${v === 6 ? 'hi' : v === 1 ? 'lo' : ''}${r.raw[i] !== v ? ' up' : ''}">${v}</i>`).join('');
  const d = document.createElement('div');
  d.className = 'cl roll';
  d.innerHTML = `<b>${esc(who)}</b><span class="rspec">${esc(what)}${
      tgt ? ' &rarr; ' + esc(tgt.name) : ''}</span>`
    + (r.raw ? `<span class="rdice">${chips}</span>`
      + `<span class="rtot ${r.hit ? 'win' : 'lose'}">${r.successes}/${r.diff}</span>` : '')
    + (r.spent ? `<span class="redit">spent ${r.spent} skill &middot; ${
        r.log.map(l => l.act).join(', ')}</span>` : '')
    + (r.crit ? `<span class="redit">${r.crit} on the raw roll</span>` : '')
    + ((r.applied || []).length ? `<span class="redit did">${
        r.applied.map(x => esc(x.text)).join(' &middot; ')}</span>` : '')
    + ((r.forGM || []).length ? `<span class="redit gm">GM: ${
        r.forGM.map(x => esc(x.text)).join(' &middot; ')}</span>` : '');
  cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}
function renderResult(r){
  const dice = (r.dice || []).map((v, i) => v === null
    ? `<i class="gone">${r.raw[i]}</i>`
    : `<i class="${v === 6 ? 'six' : v === 1 ? 'one' : ''}${r.raw[i] !== v ? ' up' : ''}">${v}</i>`).join('');
  return `<span class="ires">${dice}
    ${r.raw ? `<b class="${r.hit ? 'win' : 'lose'}">${r.successes} vs ${r.diff}</b>` : ''}
    ${(r.applied || []).length ? `<em class="idid">${
      r.applied.map(x => esc(x.text)).join(' &middot; ')}</em>` : ''}
    ${(r.forGM || []).length ? `<em class="igm">yours to rule on: ${
      r.forGM.map(x => esc(x.text)).join(' &middot; ')}</em>` : ''}
  </span>`;
}
document.addEventListener('click', ev => {
  if (ev.target.id === 'i-no'){ S.intent = null; window.render(); return; }
  if (ev.target.id === 'i-yes'){
    const it = S.intent; if (!it) return;
    const v = (document.getElementById('i-diff') || {}).value;
    if (v === '' || v == null){ toast('Set a difficulty — the app does not guess one'); return; }
    it.diff = +v; allow(it); return;
  }
});

window.__intentHTML   = intentHTML;
window.__abilityPanel = render;
window.__hudRender    = render;
})();
