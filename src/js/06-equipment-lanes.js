/* ══ WEAPONS ══ */
function addWeapon(opts) {
  opts=opts||{}; const el=document.createElement('div'); el.className='weapon-card';
  const lanes=opts.lanes||[false,false,false,false];
  const laneLabels=['F','2','S','B'];
  const laneTitles=['Frontline','2nd Line','Support','Backline'];
  const laneBoxes=laneLabels.map((lbl,i)=>`<label class="weapon-lane-box${lanes[i]?' checked':''}" title="${laneTitles[i]}"><input type="checkbox" class="weapon-lane-cb"${lanes[i]?' checked':''}onchange="this.closest('.weapon-lane-box').classList.toggle('checked',this.checked)"><span class="weapon-lane-num">${lbl}</span></label>`).join('');
  el.innerHTML=`<div class="weapon-card-top"><div><span class="lbl">Name</span><input type="text" placeholder="Weapon name…" style="font-size:13px;font-weight:600;" value="${esc(opts.name||'')}"></div><div><span class="lbl">Damage</span><input type="text" placeholder="1d8+2" value="${esc(opts.dmg||'')}"></div><div><span class="lbl">Type</span><input type="text" placeholder="Slashing" value="${esc(opts.type||'')}"></div><div><span class="lbl">Quality</span><input type="text" placeholder="Standard" value="${esc(opts.quality||'')}"></div><button class="rm" onclick="this.closest('.weapon-card').remove()">✕</button></div><div class="weapon-card-mid"><div class="weapon-range-wrap"><span class="lbl">Range Modifier</span><input type="text" class="weapon-range-input" placeholder="e.g. −1 per lane" value="${esc(opts.range||'')}"></div><div class="weapon-lanes-wrap"><span class="lbl">Attack From</span><div class="weapon-lanes">${laneBoxes}</div></div></div><div class="weapon-card-notes"><span class="lbl">Special Effects &amp; Notes</span><textarea placeholder="Special effects, passives, properties, quirks…">${esc(opts.notes||'')}</textarea></div>`;
  document.getElementById('weapon-list').appendChild(el);
}

/* ══ ARMOUR ══ */
let _armorN=0;
function addArmor(opts) {
  opts=opts||{}; _armorN++; const id='armor_'+_armorN; const el=document.createElement('div'); el.className='armor-card'; el.id=id;
  const isEquipped=opts.equipped||false; if(isEquipped) { el.classList.add('equipped'); _equippedArmorId=id; }
  el.innerHTML=`<div class="armor-card-top"><input type="radio" class="armor-equip-radio" name="equipped-armor" title="Equip this armour" ${isEquipped?'checked':''} onchange="equipArmor('${id}')"><div><span class="lbl">Name</span><input type="text" class="armor-name-input" placeholder="Armour name…" style="font-size:13px;font-weight:600;" value="${esc(opts.name||'')}" oninput="refreshArmorUI()"></div><div><span class="lbl">AV</span><input type="number" class="armor-av-input" placeholder="3" min="1" value="${esc(opts.av||'')}" oninput="if(_equippedArmorId==='${id}'){refreshArmorUI();recalcDerived();}"></div><div><span class="lbl">Quality</span><input type="text" placeholder="Standard" value="${esc(opts.quality||'')}"></div><button class="rm" onclick="removeArmor('${id}')">✕</button></div><div class="armor-card-notes"><span class="lbl">Passives, Encumbrance &amp; Notes</span><textarea placeholder="+2 encumbrance, special passives, penalties…">${esc(opts.notes||'')}</textarea></div>`;
  document.getElementById('armor-list').appendChild(el);
  if (isEquipped) refreshArmorUI();
}
function removeArmor(id) {
  if (_equippedArmorId===id) { _equippedArmorId=null; refreshArmorUI(); recalcDerived(); }
  const card=document.getElementById(id); if(card) card.remove();
}

/* ══ ABILITY SLOTS ══ */
let _abilN=0;
const ROMAN=['I','II','III','IV','V','VI','VII','VIII'];
const COST_LABELS=['4/6/8 pts','6/8/10 pts','8/10/12 pts','(extra slot)','(extra slot)','(extra slot)','(extra slot)','(extra slot)'];
const COOLDOWNS=[',','No cooldown','2 turns','3 turns','4 turns','5 turns','6 turns','Per combat','Per day','Per week','Once ever'];

function mkAbilEntry(opts) {
  opts=opts||{}; const cdOpts=COOLDOWNS.map(c=>`<option${c===(opts.cd||',')?' selected':''}>${c}</option>`).join('');
  return `<div class="abil-entry"><div class="abil-entry-top"><input type="text" placeholder="Ability name…" style="font-weight:600;" value="${esc(opts.name||'')}"><input type="number" min="0" placeholder="0" value="${opts.cost||''}"><select style="font-size:11.5px;border-bottom:1.5px solid var(--mid);font-family:'Crimson Text',serif;appearance:none;-webkit-appearance:none;background:transparent;outline:none;cursor:pointer;">${cdOpts}</select><button class="rm" onclick="this.closest('.abil-entry').remove()">✕</button></div><div class="abil-entry-desc"><span class="lbl">Effect</span><textarea placeholder="Describe effect, range, targets, conditions, duration…">${esc(opts.effect||'')}</textarea></div></div>`;
}
function addAbilEntry(eid,opts) { const c=document.getElementById(eid); const d=document.createElement('div'); d.innerHTML=mkAbilEntry(opts); c.appendChild(d.firstChild); }
function addAbilSlot(opts) {
  opts=opts||{}; _abilN++; const n=_abilN; const sid=uid('aslot'); const eid=uid('ae'); const favId=uid('afav'); const typeId=uid('atype');
  const el=document.createElement('div'); el.className='abil-slot'; el.id=sid;
  const typeVal=opts.type||''; const typeOpts=['','style','lore','art'].map(v=>`<option value="${v}"${v===typeVal?' selected':''}>${v===''?', Type ,':v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('');
  el.innerHTML=`<div class="abil-head"><span class="abil-slot-lbl">Slot ${ROMAN[n-1]||n}</span><input type="text" placeholder="Name this Style / Lore / Art…" value="${esc(opts.slotName||'')}"><select class="abil-type-sel" id="${typeId}" onchange="onTypeChange('${typeId}','${favId}')">${typeOpts}</select><span class="abil-cost-lbl">${COST_LABELS[n-1]||'(extra slot)'}</span><button class="abil-rm-slot" onclick="document.getElementById('${sid}').remove()">✕ Remove Slot</button></div><div class="abil-body"><div class="abil-passive"><div class="abil-passive-lbl">Passive Effects</div><textarea placeholder="Always-on effects, auras, resistances…">${esc(opts.passive||'')}</textarea></div><div class="favor-row" id="${favId}" style="display:${typeVal==='art'?'flex':'none'};"><div class="favor-lbl">Favor</div><div class="favor-box"><input type="number" min="0" placeholder="0" value="${opts.favor||''}"></div><div class="favor-note">Current favor. Ultimates spend favor , most use cooldowns only.</div></div><div class="abil-col-hdr"><span>Ability Name</span><span>Cost</span><span>Cooldown</span></div><div id="${eid}"></div><button class="add-btn" style="margin-bottom:0;" onclick="addAbilEntry('${eid}')">+ Add Ability</button></div>`;
  document.getElementById('abil-container').appendChild(el);
  const entries=opts.entries||[{},{},{}]; entries.forEach(e=>addAbilEntry(eid,e));
}
function onTypeChange(typeId,favId) { const val=document.getElementById(typeId).value; document.getElementById(favId).style.display=(val==='art')?'flex':'none'; }

/* ══ EXHAUSTION ══ */
const pipsEl=document.getElementById('exh-pips');
for (let i=1;i<=8;i++) {
  const p=document.createElement('div'); p.className='exh-pip'; p.textContent=i;
  p.onclick=function() { const all=[...pipsEl.querySelectorAll('.exh-pip')]; const idx=all.indexOf(this); const already=this.classList.contains('lit'); all.forEach((pip,j)=>pip.classList.toggle('lit',j<=idx&&!already)); };
  pipsEl.appendChild(p);
}

/* ══ CONDITIONS ══ */
let _condN=0;
function addCondition(name,opts) {
  opts=opts||{}; _condN++; const id='cond'+_condN; const el=document.createElement('div'); el.className='cond-item'; el.id=id;
  const count = opts.count || 1;
  el.innerHTML=`<div class="token-badge">${esc(count)}</div><input class="cond-name" type="text" value="${esc(name||opts.name||'')}" placeholder="Token name…"><input class="cond-count" type="number" value="${esc(count)}" min="1" placeholder="1" title="Number of tokens" oninput="this.previousElementSibling.previousElementSibling.textContent=this.value||'1'"><button class="cond-rm" onclick="document.getElementById('${id}').remove()">✕</button>`;
  document.getElementById('cond-list').appendChild(el);
}

/* ══ LANE OPTIONS ══ */
function syncLaneOpts() {
  const side=document.getElementById('nc-side').value;
  document.getElementById('nc-lane').innerHTML=side==='ally'
    ?`<option value="a-front">Ally Frontline</option><option value="a-second">Ally Secondary</option><option value="a-support">Ally Support</option><option value="a-back">Ally Backline</option>`
    :`<option value="e-front">Enemy Frontline</option><option value="e-second">Enemy Secondary</option><option value="e-support">Enemy Support</option><option value="e-back">Enemy Backline</option>`;
}
syncLaneOpts();
// ✓ FIX: Single clean formation checkbox listener
function setupFormationCheckbox() {
  const formCheckbox = document.getElementById('nc-isform');
  const hpIndividual = document.getElementById('hp-individual');
  const hpFormation = document.getElementById('hp-formation');
  
  if (!formCheckbox) return;
  
  formCheckbox.addEventListener('change', function() {
    if (this.checked) {
      hpIndividual.style.display = 'none';
      hpFormation.style.display = 'flex';
    } else {
      hpIndividual.style.display = 'flex';
      hpFormation.style.display = 'none';
    }
  });
}

// Attach when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFormationCheckbox);
} else {
  setupFormationCheckbox();
}
