/* ══ COMBATANTS ══ */
let _draggedChip=null;
function makeDraggable(chip) {
  if (_sessionRole === 'player') return; // Players cannot move combatants
  chip.setAttribute('draggable','true');
  chip.addEventListener('dragstart',function(e) { _draggedChip=this; closeAllChipPanels(); setTimeout(()=>this.classList.add('dragging'),0); e.dataTransfer.effectAllowed='move'; });
  chip.addEventListener('dragend',function() { this.classList.remove('dragging'); _draggedChip=null; });
}
document.querySelectorAll('.bf-lane').forEach(lane => {
  lane.addEventListener('dragover',e=>{ if(_sessionRole==='player') return; e.preventDefault(); lane.classList.add('drag-over'); e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move'; });
  lane.addEventListener('dragleave',()=>lane.classList.remove('drag-over'));
     lane.addEventListener('drop',e=>{ if(_sessionRole==='player') return; _handleLaneDrop(e, lane); });
});
function closeAllChipPanels() { document.querySelectorAll('.chip-expand-overlay.open').forEach(p=>p.classList.remove('open')); }
document.addEventListener('click',function(e) { if(!e.target.closest('.chip-expand-overlay')&&!e.target.closest('.chip-toggle-btn')) closeAllChipPanels(); });

function buildCondChecks(cid, conditions) {
  // Render a simple "+ Add Condition" button; tokens rendered by renderCondPanel()
  const entries = Object.entries(conditions).filter(([k,v])=>v>0);
  let html = entries.map(([name,count])=>`
    <div class="cond-token-row">
      <span class="cond-token-name">${esc(name)}</span>
      <div class="cond-token-ctrl">
        <button onclick="addCondToChip('${cid}','${esc(name)}',-1);renderCondPanel('${cid}');event.stopPropagation()">−</button>
        <span class="cond-token-count">${count}</span>
        <button onclick="addCondToChip('${cid}','${esc(name)}',1);renderCondPanel('${cid}');event.stopPropagation()">+</button>
        <button class="cond-token-del" onclick="addCondToChip('${cid}','${esc(name)}',0);renderCondPanel('${cid}');event.stopPropagation()" title="Remove">✕</button>
      </div>
    </div>
  `).join('');
  html += `<button class="comb-cond-custom-btn" onclick="openAddCondModal('${cid}');event.stopPropagation()">+ Add Condition</button>`;
  return html;
}

function placeCombatant(opts) {
  opts=opts||null;
  let name,side,notes,lane,isForm,hp,units,uhp,atk,turnUsed,conditions,initiative,customConditions;
  if (opts) {
    name=opts.name; side=opts.side; notes=opts.notes; lane=opts.lane; isForm=opts.isForm;
    hp=opts.hp; units=opts.units; uhp=opts.uhp; atk=opts.atk;
    turnUsed=opts.turnUsed||false; conditions=opts.conditions||{};
    initiative=opts.initiative||'';
    customConditions=opts.customConditions||[];
  } else {
    name=document.getElementById('nc-name').value.trim(); if(!name) return;
    side=document.getElementById('nc-side').value;
    notes=document.getElementById('nc-notes').value.trim();
    lane=document.getElementById('nc-lane').value;
    isForm=document.getElementById('nc-isform').checked;
    const _hpCur = document.getElementById('nc-hp').value.trim();
    const _hpMax = document.getElementById('nc-hp-max').value.trim();
    hp = (_hpCur && _hpMax) ? _hpCur+'/'+_hpMax : (_hpCur || _hpMax || '');
    units=document.getElementById('nc-units').value.trim();
    uhp=document.getElementById('nc-uhp').value.trim();
    atk=document.getElementById('nc-atk').value.trim();
    turnUsed=false; conditions={}; initiative='';
  }
  // Parse cur/max from hp string (e.g. "15/20" or "15")
  const _hpMatch = String(hp||'').match(/^(\d+)\s*[\/]\s*(\d+)/);
  const hpCur = _hpMatch ? _hpMatch[1] : (hp||'');
  const hpMax = _hpMatch ? _hpMatch[2] : '';
  const laneEl=document.getElementById('lane-'+lane); if(!laneEl) return;
  // ✓ CRITICAL FIX #1: Generate unique combatant ID
  const cid = 'chip_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  
  // ✓ FIX: Determine chip size based on character sheet size if not already specified in opts
  let chipSize = 'normal';
  if (isForm) {
    chipSize = 'large'; // Formations are always large
  } else if (opts?.size) {
    chipSize = opts.size; // Use preset size from opts if provided
  } else if (!opts) {
    // When creating from form, check combatant size selector FIRST
    const ncSizeSelect = document.getElementById('nc-size');
    const ncSize = ncSizeSelect ? ncSizeSelect.value : '';
    
    if (ncSize === 'large') {
      chipSize = 'large'; // User explicitly selected large
    } else if (ncSize === 'normal') {
      chipSize = 'normal'; // User explicitly selected normal
    } else {
      // ncSize is empty, so auto-detect from character sheet
      const charSheetSize = document.getElementById('id-size')?.value?.toLowerCase() || '';
      const sizePreset = document.getElementById('id-size-preset')?.value || '';
      if (sizePreset === 'large' || charSheetSize.includes('large')) {
        chipSize = 'large';
      } else {
        chipSize = 'normal'; // Small and Medium characters are normal combatants
      }
    }
  }
  
  const icon=side==='ally'?'🛡':'💀';
  const chip=document.createElement('div');
  chip.className='comb-chip '+(side==='ally'?'ally':'enemy')+(turnUsed?' turn-used':'')+(chipSize==='large'?' chip-large':'')+(isForm?' chip-formation':'');
  chip.id=cid;
  chip.dataset.side=side; chip.dataset.lane=lane; chip.dataset.isform=isForm?'1':'0'; chip.dataset.size=chipSize;
  chip._conditions = {};
  // Support both old boolean format and new token-count format
  if (conditions) Object.entries(conditions).forEach(([k,v]) => {
    if (typeof v === 'boolean') { if (v) chip._conditions[k] = 1; }
    else if (typeof v === 'number' && v > 0) chip._conditions[k] = v;
  });
  if (customConditions) customConditions.forEach(c=>{ chip._conditions[c] = (chip._conditions[c]||0) + 1; });
  let statPillsHtml=isForm
    ?`<span class="chip-stat-pill" id="${cid}-lbl">${units||'?'}u · ${uhp||'?'}hp</span>${atk?`<span class="chip-stat-pill">⚔${atk}</span>`:''}`
    :`<span class="chip-stat-pill" id="${cid}-lbl">${hp?'♥ '+esc(hp):'HP ,'}</span>`;
  const turnBtnTxt = turnUsed ? '↩ Undo Turn' : '✓ Mark Turn';
  const isPlayer = _sessionRole === 'player';
  const chipBtns = isPlayer
    ? `<div class="chip-btns"><button class="chip-edit-btn chip-toggle-btn" onclick="toggleChip('${cid}',event)">👁</button></div>`
    : `<div class="chip-btns"><button class="chip-edit-btn chip-toggle-btn" onclick="toggleChip('${cid}',event)">✎</button><button class="chip-turn-btn" data-turnbtn="${cid}" onclick="toggleTurnUsed('${cid}');event.stopPropagation()" title="${turnBtnTxt}">${turnUsed?'↩':'✓'}</button><button class="chip-rm-btn" onclick="removeChip('${cid}',event)">✕</button></div>`;
  const hpBarHtml = !isForm ? `<div class="chip-hp-bar-wrap" id="${cid}-hpbar"><div class="chip-hp-bar-track"><div class="chip-hp-bar-fill" id="${cid}-hpfill" style="width:0%"></div></div><div class="chip-hp-text" id="${cid}-hptxt"></div></div>` : '';
  chip.innerHTML=`<div class="chip-turn-dot" title="Acted this turn" style="display:${turnUsed?'block':'none'}"></div><div class="chip-banner">${icon}</div><div class="chip-name-row"><span class="chip-name">${esc(name)}</span></div><div class="chip-stats">${statPillsHtml}</div>${hpBarHtml}<div class="chip-cond-bar"></div>${notes?`<div class="chip-note-line">${esc(notes)}</div>`:''}${chipBtns}`;

  const condChecks = buildCondChecks(cid, chip._conditions);
  const panel=document.createElement('div'); panel.className='chip-expand-overlay'; panel.id=cid+'-exp';
  panel.style.borderTopColor=side==='ally'?'#3a7a3a':'#8b1a1a'; panel.style.borderTopWidth='3px';
  const gmOnlyStyle = _sessionRole==='player'?'display:none;':'';
  const inputRO = _sessionRole==='player'?'readonly':'';
  if (isForm) {
    panel.innerHTML=`
      <div class="chip-exp-head"><span class="chip-exp-icon">${icon}</span><span class="chip-exp-name">${esc(name)}</span><button class="chip-exp-close" onclick="closeAllChipPanels();event.stopPropagation()">✕ close</button></div>
      <div class="chip-exp-body">
        <div class="chip-exp-grid">
          <div><span class="lbl">Units</span><input type="number" value="${esc(units)}" oninput="updateChipLabel('${cid}')" ${inputRO}></div>
          <div><span class="lbl">HP / Unit</span><input type="number" value="${esc(uhp)}" oninput="updateChipLabel('${cid}')" ${inputRO}></div>
          <div><span class="lbl">Attack</span><input type="number" value="${esc(atk)}" oninput="updateChipLabel('${cid}')" ${inputRO}></div>
          <div><span class="lbl">Notes</span><input type="text" value="${esc(notes||'')}" placeholder="role, status…" oninput="updateChipNotes('${cid}',this.value)" ${inputRO}></div>
        </div>
        <div class="chip-exp-sect-title">⚡ Conditions</div>
        <div class="chip-exp-conds">${condChecks}</div>
        <div class="chip-exp-row-btns" style="${gmOnlyStyle}">
          <button class="chip-turn-full-btn" data-turnbtn="${cid}" onclick="toggleTurnUsed('${cid}');event.stopPropagation()">${turnUsed?'↩ Undo Turn':'✓ Mark Acted'}</button>
          <button class="chip-exp-rm-btn" onclick="removeChip('${cid}',event)">✕ Remove</button>
        </div>
      </div>`;
  } else {
    panel.innerHTML=`
      <div class="chip-exp-head"><span class="chip-exp-icon">${icon}</span><span class="chip-exp-name">${esc(name)}</span><button class="chip-exp-close" onclick="closeAllChipPanels();event.stopPropagation()">✕ close</button></div>
      <div class="chip-exp-body">
        <div class="chip-exp-grid">
          <div><span class="lbl">HP Cur</span><input type="number" value="${esc(hpCur)}" oninput="updateHpLbl('${cid}',this.value+'/'+this.closest('.chip-exp-body').querySelector('.chip-hp-max').value);pushHpToLinkedPlayer('${cid}',this.value+'/'+this.closest('.chip-exp-body').querySelector('.chip-hp-max').value)" onfocus="_lockHpEdit('${cid}')" onblur="_unlockHpEdit('${cid}',this)" placeholder="," class="chip-hp-cur" style="font-size:18px;font-weight:700;"></div>
          <div><span class="lbl">HP Max</span><input type="number" value="${esc(hpMax)}" oninput="updateHpLbl('${cid}',this.closest('.chip-exp-body').querySelector('.chip-hp-cur').value+'/'+this.value);pushHpToLinkedPlayer('${cid}',this.closest('.chip-exp-body').querySelector('.chip-hp-cur').value+'/'+this.value)" onfocus="_lockHpEdit('${cid}')" onblur="_unlockHpEdit('${cid}',this)" placeholder="," class="chip-hp-max" style="font-size:18px;font-weight:700;"></div>
          <div><span class="lbl">Notes</span><input type="text" value="${esc(notes||'')}" placeholder="role, status…" oninput="updateChipNotes('${cid}',this.value)" ${inputRO}></div>
        </div>
        <div class="chip-exp-sect-title">⚡ Conditions</div>
        <div class="chip-exp-conds">${condChecks}</div>
        <div class="chip-exp-row-btns" style="${gmOnlyStyle}">
          <button class="chip-turn-full-btn" data-turnbtn="${cid}" onclick="toggleTurnUsed('${cid}');event.stopPropagation()">${turnUsed?'↩ Undo Turn':'✓ Mark Acted'}</button>
          <button class="chip-exp-rm-btn" onclick="removeChip('${cid}',event)">✕ Remove</button>
        </div>
        <div class="chip-link-row" style="${gmOnlyStyle}" id="${cid}-link-row">
          <span class="chip-link-lbl">🔗 Player Link:</span>
          <select class="chip-link-sel" id="${cid}-link-sel" onchange="setChipPlayerLink('${cid}',this.value);event.stopPropagation()">
            <option value="">, none ,</option>
          </select>
        </div>
      </div>`;
  }
  document.body.appendChild(panel);
  chip.dataset.panelId=cid+'-exp';
  // Set linkedPlayer from opts if restoring; otherwise empty
  const initialLink = (opts && opts.linkedPlayer) || '';
  chip.dataset.linkedPlayer = initialLink;
  makeDraggable(chip); laneEl.appendChild(chip);
  updateChipConditionDisplay(cid);
  updateLaneCapacityTooltips();
  // Apply link after chip is in DOM so dropdown can be populated
  if (initialLink) {
    // Populate the select element if it exists
    const linkSel = document.getElementById(cid + '-link-sel');
    if (linkSel) {
      const opt = document.createElement('option');
      opt.value = initialLink; opt.textContent = initialLink; opt.selected = true;
      linkSel.appendChild(opt);
    }
  }
  if (!opts) {
    document.getElementById('nc-name').value=''; document.getElementById('nc-hp').value=''; document.getElementById('nc-hp-max').value=''; document.getElementById('nc-notes').value='';
    document.getElementById('nc-units').value=''; document.getElementById('nc-uhp').value=''; document.getElementById('nc-atk').value='';
    document.getElementById('nc-name').focus();
  }
  // ✓ CRITICAL FIX #4: Initialize HP bar display for existing combatants on load
  if (!isForm && hp) {
    updateHpBar(cid, hp);
  }
  if (_sessionRole==='gm') { clearTimeout(_pushTimer); _pushTimer=setTimeout(pushBattlefield,600); }
}

function removeChip(cid,e) { e.stopPropagation(); const panel=document.getElementById(cid+'-exp'); if(panel) panel.remove(); const chip=document.getElementById(cid); if(chip) chip.remove(); clearTimeout(_pushTimer); _pushTimer=setTimeout(pushBattlefield,400); updateLaneCapacityTooltips(); }


function updateLaneCapacityTooltips() {
  document.querySelectorAll('.bf-lane').forEach(lane => {
    const laneId = lane.dataset.lane;
    const chips = lane.querySelectorAll('.comb-chip');
    let slots = 0;
    chips.forEach(c => { slots += c.classList.contains('chip-large') ? 2 : 1; });
    // Find corresponding column label
    const colIdx = ['a-back','a-support','a-second','a-front','e-front','e-second','e-support','e-back'].indexOf(laneId);
    if (colIdx >= 0) {
      const lbls = document.querySelectorAll('.bf-col-lbl');
      if (lbls[colIdx]) lbls[colIdx].dataset.capacity = `${slots} slot${slots!==1?'s':''} used · large=2 · normal=1`;
    }
  });
}

/* ══ COMBATANT CONDITIONS (token-stack: name → count) ══ */

// conditions object: { "Bleed": 3, "Prone": 1, ... } , integer token counts

function addCondToChip(cid, condName, delta) {
  // delta: +1 to add a token, -1 to remove, or 0 to remove entirely
  const chip = document.getElementById(cid);
  if (!chip) return;
  const conditions = chip._conditions || (chip._conditions = {});
  if (delta === 0) {
    delete conditions[condName];
  } else {
    const cur = conditions[condName] || 0;
    const next = Math.max(0, cur + delta);
    if (next === 0) delete conditions[condName];
    else conditions[condName] = next;
  }
  updateChipConditionDisplay(cid);
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 400);
}

function openAddCondModal(cid) {
  // Simple prompt-based add for now
  const condName = prompt('Condition name (e.g. Bleed, Stunned, Prone…):');
  if (!condName || !condName.trim()) return;
  addCondToChip(cid, condName.trim(), 1);
}

function renderCondPanel(cid) {
  const panel = document.getElementById(cid+'-exp');
  if (!panel) return;
  const condContainer = panel.querySelector('.chip-exp-conds');
  if (!condContainer) return;
  const chip = document.getElementById(cid);
  const conditions = (chip && chip._conditions) || {};
  const entries = Object.entries(conditions).filter(([k,v])=>v>0);
  let html = entries.map(([name,count])=>`
    <div class="cond-token-row">
      <span class="cond-token-name">${esc(name)}</span>
      <div class="cond-token-ctrl">
        <button onclick="addCondToChip('${cid}','${esc(name)}',-1);renderCondPanel('${cid}');event.stopPropagation()">−</button>
        <span class="cond-token-count">${count}</span>
        <button onclick="addCondToChip('${cid}','${esc(name)}',1);renderCondPanel('${cid}');event.stopPropagation()">+</button>
        <button class="cond-token-del" onclick="addCondToChip('${cid}','${esc(name)}',0);renderCondPanel('${cid}');event.stopPropagation()" title="Remove">✕</button>
      </div>
    </div>
  `).join('');
  html += `<button class="comb-cond-custom-btn" onclick="openAddCondModal('${cid}');event.stopPropagation()">+ Add Condition</button>`;
  condContainer.innerHTML = html;
}

function updateChipConditionDisplay(cid) {
  const chip = document.getElementById(cid);
  if (!chip) return;
  const conditions = chip._conditions || {};
  const active = Object.entries(conditions).filter(([k,v])=>v>0);
  let condBar = chip.querySelector('.chip-cond-bar');
  if (!condBar) {
    condBar = document.createElement('div'); condBar.className = 'chip-cond-bar';
    const btns = chip.querySelector('.chip-btns');
    if (btns) btns.before(condBar);
    else chip.appendChild(condBar);
  }
  condBar.innerHTML = active.map(([name,count])=>`<span class="chip-cond-tag">${esc(name)}${count>1?' ×'+count:''}</span>`).join('');
  // Also re-render the expanded panel if open
  renderCondPanel(cid);
  // sync linked player if any
  syncLinkedPlayerConditions(cid);
}

function toggleTurnUsed(cid) {
  const chip = document.getElementById(cid);
  if (!chip) return;
  const isUsed = chip.classList.toggle('turn-used');
  const dot = chip.querySelector('.chip-turn-dot');
  if (dot) dot.style.display = isUsed ? 'block' : 'none';
  // Update mini button in chip
  const miniBtn = chip.querySelector('.chip-turn-btn');
  if (miniBtn) miniBtn.textContent = isUsed ? '↩' : '✓';
  // Update full button in expanded panel
  const panelBtns = document.querySelectorAll(`button[data-turnbtn="${cid}"]`);
  panelBtns.forEach(btn => {
    if (btn.classList.contains('chip-turn-full-btn')) btn.textContent = isUsed ? '↩ Undo Turn' : '✓ Mark Acted';
    else btn.textContent = isUsed ? '↩' : '✓';
  });
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 600);
}
function toggleChip(cid,e) {
  e.stopPropagation(); const panel=document.getElementById(cid+'-exp'); if(!panel) return;
  const isOpen=panel.classList.contains('open'); closeAllChipPanels();
  if (!isOpen) {
    const chip=document.getElementById(cid); const rect=chip?chip.getBoundingClientRect():{top:100,left:100,width:0};
    panel.classList.add('open');
    // Measure actual rendered height for accurate positioning
    panel.style.visibility = 'hidden';
    const pw = 264;
    const ph = panel.offsetHeight || 340;
    panel.style.visibility = '';
    let left = rect.left; let top = rect.bottom + 4;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (left < 8) left = 8;
    // Flip above chip if it would be cut off at bottom
    if (top + ph > window.innerHeight - 8) top = Math.max(8, rect.top - ph - 4);
    if (top < 8) top = 8;
    panel.style.left=left+'px'; panel.style.top=top+'px';
  }
}
function updateHpLbl(cid,v) {
  const el=document.getElementById(cid+'-lbl'); if(el) el.textContent=v?'♥ '+v:'HP ,';
  updateHpBar(cid,v);
}
function updateHpBar(cid, hpStr) {
  const chip = document.getElementById(cid); if (!chip) return;
  const barWrap = document.getElementById(cid+'-hpbar'); if (!barWrap) return;
  // Parse "cur/max" or "cur" from hp string
  const s = String(hpStr||'').trim();
  const match = s.match(/^(\d+)\s*[\/]\s*(\d+)/);
  let cur=0,max=0;
  if (match) { cur=parseInt(match[1])||0; max=parseInt(match[2])||0; }
  else { cur=parseInt(s)||0; max=0; }
  const hasBar = max>0 && cur>=0;
  barWrap.classList.toggle('visible', hasBar);
  if (!hasBar) return;
  const pct = Math.max(0, Math.min(100, (cur/max)*100));
  const fill = document.getElementById(cid+'-hpfill');
  const txt  = document.getElementById(cid+'-hptxt');
  if (fill) {
    fill.style.width = pct+'%';
    fill.className = 'chip-hp-bar-fill';
    if (pct<=25) fill.classList.add('critical');
    else if (pct<=50) fill.classList.add('low');
  }
  if (txt) txt.textContent = cur+'/'+max+' HP · '+Math.round(pct)+'%';
}
function updateChipLabel(cid) {
  const panel=document.getElementById(cid+'-exp'); if(!panel) return;
  const inputs=panel.querySelectorAll('.chip-exp-grid input[type=number]');
  const u=inputs[0]?inputs[0].value:'?'; const h=inputs[1]?inputs[1].value:'?'; const a=inputs[2]?inputs[2].value:'';
  const lbl=document.getElementById(cid+'-lbl'); if(lbl) lbl.textContent=`${u||'?'}u · ${h||'?'}hp`;
  const chip=document.getElementById(cid);
  if(chip&&a) { let atkPill=chip.querySelector('.chip-stat-pill:nth-child(2)'); if(atkPill) atkPill.textContent='⚔'+a; }
}
function updateChipNotes(cid,v) {
  const chip=document.getElementById(cid); if(!chip) return;
  let noteLine=chip.querySelector('.chip-note-line');
  if(v&&!noteLine) { noteLine=document.createElement('div'); noteLine.className='chip-note-line'; chip.querySelector('.chip-btns').before(noteLine); }
  if(noteLine) noteLine.textContent=v;
}
document.getElementById('nc-name').addEventListener('keydown',e=>{ if(e.key==='Enter') placeCombatant(); });

/* ══ HELPERS ══ */
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function val(id) { const el=document.getElementById(id); return el?el.value:''; }
function selVal(el) { return el?el.value:''; }

function applySizePreset(preset) {
  const sizeInput = document.getElementById('id-size');
  if (!sizeInput) return;
  
  if (preset === 'small') {
    sizeInput.value = 'Small (3-4 feet tall)';
  } else if (preset === 'medium') {
    sizeInput.value = 'Medium (5-6 feet tall)';
  } else if (preset === 'large') {
    sizeInput.value = 'Large (8-12 feet tall)';
  }
  // If custom, leave the input as-is for user to edit
  
  // Trigger change event for autosave
  sizeInput.dispatchEvent(new Event('change', { bubbles: true }));
  sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
}


/* ══ SERIALIZATION ══ */
function serializeSheet() {
  const data={v:3};
  data.id={name:val('id-name'),species:val('id-species'),culture:val('id-culture'),rank:val('id-rank'),size:val('id-size'),player:val('id-player')};
  data.attrs={}; ['for','pro','dex','nim','wil','int','pre','cha'].forEach(k=>{data.attrs[k]=val('attr-'+k);});
  data.derived={hpCur:val('hp-cur'),hpMax:val('hp-max'),stCur:val('st-cur'),stMax:val('st-max'),strCur:val('str-cur'),strMax:val('str-max')};
  data.passiveTraits=val('passive-traits');
  data.knacks=[...document.querySelectorAll('#knacks-list .knack-row')].map(row=>{const ins=row.querySelectorAll('input');return{name:ins[0]?ins[0].value:'',level:ins[1]?ins[1].value:''};});
  data.skills={body:[],mind:[],social:[]};
  ['body','mind','social'].forEach(cat=>{
    document.querySelectorAll('#tree-'+cat+' > .skill-primary').forEach(pEl=>{
      const pInputs=pEl.querySelector('.skill-prim-head').querySelectorAll('input');
      const pData={score:pInputs[0]?pInputs[0].value:'0',name:pInputs[1]?pInputs[1].value:'',secondaries:[]};
      pEl.querySelectorAll(':scope > .skill-children > .skill-secondary').forEach(sEl=>{
        const sInputs=sEl.querySelector('.skill-sec-head').querySelectorAll('input');
        const sData={score:sInputs[0]?sInputs[0].value:'0',name:sInputs[1]?sInputs[1].value:'',tertiaries:[]};
        sEl.querySelectorAll(':scope > .skill-ter-list > .skill-ter-row').forEach(tEl=>{const tInputs=tEl.querySelectorAll('input');sData.tertiaries.push({score:tInputs[0]?tInputs[0].value:'0',name:tInputs[1]?tInputs[1].value:''});});
        pData.secondaries.push(sData);
      });
      data.skills[cat].push(pData);
    });
  });
  data.backgrounds=[...document.querySelectorAll('#bg-container .bg-card')].map(c=>{
    const nameEl=c.querySelector('.bg-name'); const instEl=c.querySelector('.bg-inst'); const notesEl=c.querySelector('.bg-notes textarea');
    const profGroups=[...c.querySelectorAll('.bg-pgroup')].map(g=>bgSerializeGroup(g));
    const investEl=c.querySelector('.bg-invest-count'); const invest=investEl?parseInt(investEl.textContent)||0:0;
    const applied=c.querySelector('.bg-apply-toggle')?.classList.contains('active')||false;
    return{name:nameEl?nameEl.value:'',inst:instEl?instEl.value:'',profGroups,notes:notesEl?notesEl.value:'',invest,applied};
  });
  data.weapons=[...document.querySelectorAll('#weapon-list .weapon-card')].map(c=>{const ins=c.querySelectorAll('input[type=text]');const ta=c.querySelector('textarea');const rangeEl=c.querySelector('.weapon-range-input');const laneCbs=[...c.querySelectorAll('.weapon-lane-cb')].map(cb=>cb.checked);return{name:ins[0]?ins[0].value:'',dmg:ins[1]?ins[1].value:'',type:ins[2]?ins[2].value:'',quality:ins[3]?ins[3].value:'',range:rangeEl?rangeEl.value:'',lanes:laneCbs,notes:ta?ta.value:''};});
  data.armors=[...document.querySelectorAll('#armor-list .armor-card')].map(c=>{
    const nameInput=c.querySelector('.armor-name-input'); const avInput=c.querySelector('.armor-av-input');
    const qualInput=c.querySelectorAll('input[type=text]')[1]; const ta=c.querySelector('textarea');
    return{name:nameInput?nameInput.value:'',av:avInput?avInput.value:'',quality:qualInput?qualInput.value:'',notes:ta?ta.value:'',equipped:c.id===_equippedArmorId};
  });
  data.equippedArmorId=_equippedArmorId; data.otherGear=val('other-gear'); data.generalNotes=val('general-notes');
  data.abilSlots=[...document.querySelectorAll('#abil-container .abil-slot')].map(slot=>{
    const headInputs=slot.querySelector('.abil-head').querySelectorAll('input[type=text]');
    const typeEl=slot.querySelector('.abil-type-sel'); const passiveEl=slot.querySelector('.abil-passive textarea'); const favorEl=slot.querySelector('.favor-box input');
    const entries=[...slot.querySelectorAll('.abil-entry')].map(e=>{const ins=e.querySelectorAll('input');const sel=e.querySelector('select');const ta=e.querySelector('textarea');return{name:ins[0]?ins[0].value:'',cost:ins[1]?ins[1].value:'',cd:sel?sel.value:'',effect:ta?ta.value:''};});
    return{slotName:headInputs[0]?headInputs[0].value:'',type:typeEl?typeEl.value:'',passive:passiveEl?passiveEl.value:'',favor:favorEl?favorEl.value:'',entries};
  });
  data.combat={wardVal:val('ward-val'),wardType:selVal(document.getElementById('ward-type')),exhaustion:[...document.querySelectorAll('#exh-pips .exh-pip')].map(p=>p.classList.contains('lit')?1:0),cHpCur:val('c-hp-cur'),cStCur:val('c-st-cur'),cStrCur:val('c-str-cur')};
  data.conditions=[...document.querySelectorAll('#cond-list .cond-item')].map(c=>{const nameEl=c.querySelector('.cond-name');const countEl=c.querySelector('.cond-count');return{name:nameEl?nameEl.value:'',count:parseInt(countEl?countEl.value:1)||1};}).filter(c=>c.name);
  data.combatants=[];
  document.querySelectorAll('.bf-lane').forEach(lane=>{
    [...lane.querySelectorAll('.comb-chip')].forEach(chip=>{
      const nameEl=chip.querySelector('.chip-name'); const isForm=chip.dataset.isform==='1';
      const panelId=chip.dataset.panelId; const panel=panelId?document.getElementById(panelId):null;
      const inputs=panel?[...panel.querySelectorAll('.chip-exp-grid input')]:[];
      const co={name:nameEl?nameEl.textContent:'',side:chip.dataset.side,lane:chip.dataset.lane,isForm};
      if(isForm){co.units=inputs[0]?inputs[0].value:'';co.uhp=inputs[1]?inputs[1].value:'';co.atk=inputs[2]?inputs[2].value:'';co.notes=inputs[3]?inputs[3].value:'';}
      else{const hpCur=inputs[0]?inputs[0].value:'';const hpMax=inputs[1]?inputs[1].value:'';co.hp=(hpCur&&hpMax)?hpCur+'/'+hpMax:hpCur;co.notes=inputs[3]?inputs[3].value:'';}
      data.combatants.push(co);
    });
  });
  return data;
}

function restoreSheet(data) {
  if (!data||data.v!==3) { showToast('Incompatible save format'); return; }
  const id=data.id||{};
  ['name','species','culture','rank','size','player'].forEach(k=>{const el=document.getElementById('id-'+k);if(el) el.value=id[k]||'';});
  
  // ✓ FIX: Also set the preset dropdown based on loaded size
  if (id.size) {
    const sizeText = (id.size || '').toLowerCase();
    const preset = document.getElementById('id-size-preset');
    if (preset) {
      if (sizeText.includes('small')) {
        preset.value = 'small';
      } else if (sizeText.includes('medium')) {
        preset.value = 'medium';
      } else if (sizeText.includes('large')) {
        preset.value = 'large';
      } else {
        preset.value = '';
      }
    }
  }
  
  const attrs=data.attrs||{}; ['for','pro','dex','nim','wil','int','pre','cha'].forEach(k=>{const el=document.getElementById('attr-'+k);if(el) el.value=attrs[k]!==undefined?attrs[k]:5;});
  const d=data.derived||{};
  const el_hpCur=document.getElementById('hp-cur');if(el_hpCur) el_hpCur.value=d.hpCur||'';
  const el_stCur=document.getElementById('st-cur');if(el_stCur) el_stCur.value=d.stCur||'';
  const el_strCur=document.getElementById('str-cur');if(el_strCur) el_strCur.value=d.strCur||'';
  const pt=document.getElementById('passive-traits');if(pt) pt.value=data.passiveTraits||'';
  document.getElementById('knacks-list').innerHTML=''; (data.knacks||[]).forEach(k=>addKnack(k));
  ['body','mind','social'].forEach(cat=>{document.getElementById('tree-'+cat).innerHTML='';const prims=data.skills&&data.skills[cat]||[];prims.forEach(p=>addPrimary(cat,p));setTimeout(()=>updateEmpty(cat),0);});
  document.getElementById('bg-container').innerHTML=''; _bgN=0; (data.backgrounds||[]).forEach(b=>addBg(b));
  document.getElementById('weapon-list').innerHTML=''; (data.weapons||[]).forEach(w=>addWeapon(w));
  document.getElementById('armor-list').innerHTML=''; _armorN=0; _equippedArmorId=null; (data.armors||[]).forEach(a=>addArmor(a));
  refreshArmorUI(); recalcDerived(); if(typeof updateCombatReadout==="function") updateCombatReadout();
  const ogEl=document.getElementById('other-gear');if(ogEl) ogEl.value=data.otherGear||'';
  const gnEl=document.getElementById('general-notes');if(gnEl) gnEl.value=data.generalNotes||'';
  document.getElementById('abil-container').innerHTML=''; _abilN=0; (data.abilSlots||[]).forEach(s=>addAbilSlot(s));
  const combat=data.combat||{};
  const wv=document.getElementById('ward-val');if(wv) wv.value=combat.wardVal||'';
  const wt=document.getElementById('ward-type');if(wt&&combat.wardType){for(let i=0;i<wt.options.length;i++){if(wt.options[i].value===combat.wardType){wt.selectedIndex=i;break;}}}
  const pips=[...document.querySelectorAll('#exh-pips .exh-pip')];
  (combat.exhaustion||[]).forEach((v,i)=>{if(pips[i]) pips[i].classList.toggle('lit',v===1);});
  const cHpCurEl=document.getElementById('c-hp-cur');if(cHpCurEl) cHpCurEl.value=combat.cHpCur||d.hpCur||'';
  const cStCurEl=document.getElementById('c-st-cur');if(cStCurEl) cStCurEl.value=combat.cStCur||d.stCur||'';
  const cStrCurEl=document.getElementById('c-str-cur');if(cStrCurEl) cStrCurEl.value=combat.cStrCur||d.strCur||'';
  document.getElementById('cond-list').innerHTML=''; _condN=0; (data.conditions||[]).forEach(c=>addCondition(c.name||'',c));
  document.querySelectorAll('.chip-expand-overlay').forEach(p=>p.remove());
  document.querySelectorAll('.bf-lane').forEach(l=>{[...l.querySelectorAll('.comb-chip')].forEach(c=>c.remove());});
  (data.combatants||[]).forEach(c=>placeCombatant(c));
}

/* ══ ACTIVE SAVE TRACKING ══ */
let _activeSaveId=null;
function setActiveSave(id,name) {
  _activeSaveId=id; const lbl=document.getElementById('current-save-label'); if(lbl) lbl.textContent=name?name:'';
  document.querySelectorAll('.save-entry').forEach(e=>e.classList.remove('active-save'));
  if(id) { const el=document.querySelector(`.save-entry[data-id="${id}"]`); if(el) el.classList.add('active-save'); }
}


/* ══ COMBAT READOUT , movement speed & dodge tokens from DEX ══ */
function updateCombatReadout() {
  const dex = parseInt(document.getElementById('attr-dex')?.value) || 0;

  // Movement speed
  let moveSpd, moveNote, moveWarn = false;
  if (dex <= 0)       { moveSpd = ','; moveNote = 'No DEX set'; }
  else if (dex <= 3)  { moveSpd = '1'; moveNote = 'Full action only , no quick action move'; moveWarn = true; }
  else if (dex <= 6)  { moveSpd = '2'; moveNote = '1 as quick action · 2 as full action'; }
  else if (dex <= 8)  { moveSpd = '3'; moveNote = '1 as quick action · 3 as full action'; }
  else if (dex <= 10) { moveSpd = '4'; moveNote = '1 as quick action · 4 as full action'; }
  else                { moveSpd = '4'; moveNote = '1 as quick action · 4 as full action'; }

  // Dodge tokens
  let dodgeVal, dodgeNote, dodgeWarn = false;
  if (dex <= 0)       { dodgeVal = ','; dodgeNote = 'No DEX set'; }
  else if (dex <= 2)  { dodgeVal = '✕'; dodgeNote = 'Cannot earn dodge tokens'; dodgeWarn = true; }
  else if (dex <= 4)  { dodgeVal = '0'; dodgeNote = 'Can earn tokens , 0 granted at combat start'; }
  else if (dex <= 7)  { dodgeVal = '1'; dodgeNote = '1 dodge token granted at combat start'; }
  else if (dex <= 10) { dodgeVal = '2'; dodgeNote = '2 dodge tokens granted at combat start'; }
  else                { dodgeVal = '3'; dodgeNote = '3 dodge tokens granted at combat start'; }

  const mv = document.getElementById('cro-move-val');
  const mn = document.getElementById('cro-move-note');
  const dv = document.getElementById('cro-dodge-val');
  const dn = document.getElementById('cro-dodge-note');
  if (mv) { mv.textContent = moveSpd; mv.classList.toggle('cro-warn', moveWarn); }
  if (mn) { mn.textContent = moveNote; mn.classList.toggle('cro-warn', moveWarn); }
  if (dv) { dv.textContent = dodgeVal; dv.classList.toggle('cro-warn', dodgeWarn); }
  if (dn) { dn.textContent = dodgeNote; dn.classList.toggle('cro-warn', dodgeWarn); }
}

// Wire up: update on DEX change and on page load
document.addEventListener('DOMContentLoaded', () => {
  const dexInput = document.getElementById('attr-dex');
  if (dexInput) dexInput.addEventListener('input', updateCombatReadout);
  updateCombatReadout();
});


/* ══ DRAG-TO-REORDER , primaries, backgrounds, weapons, power groups ══ */
(function(){
  let _dragEl = null, _dragContainer = null;

  function handleDragStart(e) {
    _dragEl = this.closest('[data-draggable]');
    _dragContainer = _dragEl?.parentElement;
    if (!_dragEl) return;
    setTimeout(() => _dragEl.classList.add('dragging-card'), 0);
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragEnd() {
    _dragEl?.classList.remove('dragging-card');
    if (_dragContainer) [..._dragContainer.querySelectorAll('.drag-over-card')].forEach(el => el.classList.remove('drag-over-card'));
    _dragEl = null; _dragContainer = null;
  }
  function handleDragOver(e) {
    if (!_dragEl) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  }
  function handleDragEnter(e) {
    if (!_dragEl) return;
    const target = e.currentTarget;
    if (target === _dragEl || target.parentElement !== _dragContainer) return;
    if (_dragContainer) [..._dragContainer.querySelectorAll('.drag-over-card')].forEach(el => el.classList.remove('drag-over-card'));
    target.classList.add('drag-over-card');
  }
  function handleDragLeave(e) {
    // Only remove if leaving to outside the card entirely
    if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drag-over-card');
  }
  function handleDrop(e) {
    e.preventDefault();
    const target = e.target.closest('[data-draggable]');
    if (!target || target === _dragEl || !_dragContainer || target.parentElement !== _dragContainer) return;
    target.classList.remove('drag-over-card');
    const allItems = [..._dragContainer.querySelectorAll(':scope > [data-draggable]')];
    const fromIdx = allItems.indexOf(_dragEl);
    const toIdx   = allItems.indexOf(target);
    if (fromIdx < toIdx) target.after(_dragEl); else target.before(_dragEl);
  }

  // Attach handle to an element and make it draggable
  function makeCardDraggable(el) {
    if (el.dataset.draggable) return; // already done
    el.dataset.draggable = '1';
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    // Inject handle — for weapon-cards, place ABOVE the card-top bar; for others, inside the header
    const weaponTop = el.classList.contains('weapon-card') ? el.querySelector('.weapon-card-top') : null;
    if (weaponTop) {
      if (!el.querySelector(':scope > .drag-handle')) {
        const h = document.createElement('div');
        h.className = 'drag-handle weapon-drag-handle'; h.textContent = '⠿'; h.title = 'Drag to reorder';
        h.addEventListener('mousedown', e => { el.setAttribute('draggable','true'); });
        el.insertBefore(h, weaponTop);
      }
    } else {
      const head = el.querySelector('.bg-head, .abil-head, .skill-prim-head');
      if (head && !head.querySelector('.drag-handle')) {
        const h = document.createElement('span');
        h.className = 'drag-handle'; h.textContent = '⠿'; h.title = 'Drag to reorder';
        h.addEventListener('mousedown', e => { el.setAttribute('draggable','true'); });
        head.insertBefore(h, head.firstChild);
      }
    }
  }

  // Observe containers and make new children draggable
  function observeContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Existing children
    [...container.querySelectorAll(':scope > .bg-card, :scope > .weapon-card, :scope > .abil-slot, :scope > .skill-primary')]
      .forEach(makeCardDraggable);
    // Future children
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && (n.classList.contains('bg-card') || n.classList.contains('weapon-card') || n.classList.contains('abil-slot') || n.classList.contains('skill-primary')))
          makeCardDraggable(n);
      }));
    }).observe(container, { childList: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['bg-container','weapon-list','abil-container','tree-body','tree-mind','tree-social'].forEach(observeContainer);
  });
})();
