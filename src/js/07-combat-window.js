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


/* serializeSheet() / restoreSheet() / setActiveSave() moved to
   08-saves-io.js — they save/restore the WHOLE character (identity,
   attributes, skills, backgrounds, gear, abilities), not just combat,
   so they belong next to quickSave/loadCharacter/exportMonarch which
   already lived there. Combat's own state (vitals, ward, exhaustion,
   conditions, battlefield) now persists independently — see
   _saveLocalBattlefield / _loadLocalBattlefield below. */

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

/* ══ VITALS ADJUST ══
   Moved from 03-sheet-basics.js. Used to also mirror onto a page-1
   copy (hp-cur/st-cur/str-cur) — that copy no longer exists, current
   HP/Stamina/Stress live only here now, so this is a plain adjuster. */
function adjVal(id,delta) {
  const el=document.getElementById(id); if(!el) return;
  el.value=(parseInt(el.value)||0)+delta;
}

/* ══ FORMATION FORM TOGGLE ══
   Moved from 11-combat-extras.js. This script tag loads at the end of
   <body>, after #nc-isform already exists in the DOM, so — same as
   the #nc-name listener above — it can attach directly with no
   DOMContentLoaded/setTimeout dance. */
(() => {
  const formCheckbox = document.getElementById('nc-isform');
  if (formCheckbox) {
    formCheckbox.addEventListener('change', function() {
      document.getElementById('hp-individual').style.display = this.checked ? 'none' : 'flex';
      document.getElementById('hp-formation').style.display = this.checked ? 'flex' : 'none';
    });
  }
})();

/* ══ TURN COUNTER ══ */
let _turnCount = 1;
function adjTurn(delta) {
  _turnCount = Math.max(1, _turnCount + delta);
  const el = document.getElementById('turn-counter');
  if (el) el.textContent = _turnCount;
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 600); }
  _scheduleLocalSave();
}
function resetTurn() {
  _turnCount = 1;
  const el = document.getElementById('turn-counter');
  if (el) el.textContent = '1';
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 600); }
  _scheduleLocalSave();
}
// Reset all combatants' "acted this turn" state , GM QoL
function resetAllTurns() {
  document.querySelectorAll('.comb-chip.turn-used').forEach(chip => {
    chip.classList.remove('turn-used');
    const dot = chip.querySelector('.chip-turn-dot');
    if (dot) dot.style.display = 'none';
    const btns = document.querySelectorAll(`button[data-turnbtn="${chip.id}"]`);
    btns.forEach(btn => { btn.textContent = btn.classList.contains('chip-turn-full-btn') ? '✓ Mark Acted' : '✓'; });
  });
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 400); }
  showToast('All turns reset');
  _scheduleLocalSave();
}
// Clear entire battlefield , GM QoL
function clearBattlefield() {
  if (!confirm('Remove ALL combatants from the battlefield?')) return;
  document.querySelectorAll('.chip-expand-overlay').forEach(p => p.remove());
  document.querySelectorAll('.bf-lane .comb-chip').forEach(c => c.remove());
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 400); }
  showToast('Battlefield cleared');
  _scheduleLocalSave();
}

/* ══ BATTLEFIELD SERIALIZE / RESTORE ══
   Moved from 09-session-sync.js — this is Combat's own state shape
   (chips, turn count, mana, fog); session-sync just pushes/pulls it
   over the network by calling these two functions, same as before
   (this file loads before 09-session-sync.js, so that still resolves
   fine). Turn count used to be spliced in via a monkey-patch sitting
   in a separate file (13-turn-and-init.js) — folded directly in here
   instead now that both live in the same place. */
function serializeBattlefield() {
  const combatants = [];
  document.querySelectorAll('.bf-lane').forEach(lane => {
    [...lane.querySelectorAll('.comb-chip')].forEach(chip => {
      const nameEl  = chip.querySelector('.chip-name');
      const isForm  = chip.dataset.isform === '1';
      const panel   = chip.dataset.panelId ? document.getElementById(chip.dataset.panelId) : null;
      const inputs  = panel ? [...panel.querySelectorAll('.chip-exp-grid input')] : [];
      const co = {
        name:       nameEl ? nameEl.textContent : '',
        side:       chip.dataset.side,
        lane:       (chip.closest('.bf-lane') || {}).dataset?.lane || chip.dataset.lane,
        isForm,
        size:       chip.dataset.size || 'normal',
        turnUsed:   chip.classList.contains('turn-used'),
        conditions: Object.assign({}, chip._conditions || {}),
        linkedPlayer: chip.dataset.linkedPlayer || ''
      };
      if (isForm) { co.units=inputs[0]?.value||''; co.uhp=inputs[1]?.value||''; co.atk=inputs[2]?.value||''; co.notes=inputs[3]?.value||''; }
      else {
        const curEl = panel?.querySelector('.chip-hp-cur'); const maxEl = panel?.querySelector('.chip-hp-max');
        const curV = curEl?.value||''; const maxV = maxEl?.value||'';
        co.hp = (curV && maxV) ? curV+'/'+maxV : (curV||maxV||'');
        co.notes = panel?.querySelector('input[type=text]')?.value||'';
      }
      combatants.push(co);
    });
  });
  const manaVisibleCb = document.getElementById('gm-mana-visible');
  const fogCb = document.getElementById('gm-fog-enabled');
  const cmds = _pendingCmds.length ? _pendingCmds.slice() : undefined;
  _pendingCmds = [];
  return {
    v: 2, ts: Date.now(), combatants, turn: _turnCount,
    globalMana: _globalMana,
    globalManaVisible: manaVisibleCb ? manaVisibleCb.checked : _globalManaVisible,
    fogEnabled: fogCb ? fogCb.checked : false,
    cmds
  };
}

function restoreBattlefield(bf) {
  if (!bf || !bf.combatants) return;
  document.querySelectorAll('.chip-expand-overlay').forEach(p => p.remove());
  document.querySelectorAll('.bf-lane .comb-chip').forEach(c => c.remove());

  bf.combatants.forEach(c => {
    placeCombatant(c);
    if (c.linkedPlayer) {
      const chips = document.querySelectorAll('.bf-lane .comb-chip');
      const last  = chips[chips.length - 1];
      if (last) {
        setChipPlayerLink(last.id, c.linkedPlayer);
        // Render HP bar for restored combatants
        if (!c.isForm && c.hp) updateHpBar(last.id, c.hp);
      }
    } else if (!c.isForm && c.hp) {
      const chips = document.querySelectorAll('.bf-lane .comb-chip');
      const last  = chips[chips.length - 1];
      if (last) updateHpBar(last.id, c.hp);
    }
  });

  if (bf.turn !== undefined) {
    _turnCount = bf.turn;
    const turnEl = document.getElementById('turn-counter');
    if (turnEl) turnEl.textContent = _turnCount;
  }

  if (bf.globalMana !== undefined) {
    _globalMana = bf.globalMana;
    const el = document.getElementById('global-mana-val');
    if (el) el.textContent = _globalMana;
  }

  if (_sessionRole === 'player') {
    const visible = bf.globalManaVisible !== false;
    const manaWrap = document.getElementById('global-mana-wrap');
    if (manaWrap) manaWrap.style.display = visible ? 'flex' : 'none';
    const playerVal = document.getElementById('global-mana-player-val');
    if (playerVal) playerVal.textContent = _globalMana;
    const fogOverlay = document.getElementById('fog-overlay');
    const fogOn = bf.fogEnabled === true;
    if (fogOverlay) fogOverlay.style.display = fogOn ? 'flex' : 'none';
    document.body.classList.toggle('fog-active', fogOn);

    // ── Sync GM chip conditions → player character sheet ──
    // Find the combatant linked to this player and apply its conditions
    const myName = getMyPlayerName();
    if (myName) {
      const linked = bf.combatants.find(c => c.linkedPlayer === myName);
      if (linked && linked.conditions && typeof linked.conditions === 'object') {
        const condList = document.getElementById('cond-list');
        if (condList) {
          // Remove conditions no longer on the chip
          [...condList.querySelectorAll('.cond-item')].forEach(item => {
            const nameEl = item.querySelector('.cond-name') || item.querySelector('input[type=text]');
            if (!nameEl) return;
            const n = nameEl.value.trim().toLowerCase();
            const stillActive = Object.keys(linked.conditions).some(k => k.trim().toLowerCase() === n && linked.conditions[k] > 0);
            if (!stillActive) item.remove();
          });
          // Add conditions present on chip but missing from sheet, and UPDATE token counts
          Object.entries(linked.conditions).forEach(([condName, count]) => {
            if (count <= 0) return;
            const existing = [...condList.querySelectorAll('.cond-name, input[type=text]')].find(el => el.value.trim().toLowerCase() === condName.trim().toLowerCase());
            if (existing) {
              // UPDATE existing condition's token count
              const item = existing.closest('.cond-item');
              if (item) {
                const countEl = item.querySelector('.cond-count');
                if (countEl) countEl.value = count;
              }
            } else {
              // Add new condition
              addCondition(condName, { count });
            }
          });
        }
      }
    }
  }
  _scheduleLocalSave();
}

/* ══ LOCAL PERSISTENCE ══
   The battlefield used to ride along inside the character's own save
   file (serializeSheet/restoreSheet), so it persisted for solo/local
   play but was tangled up with a specific character. Now that Combat
   is its own window, it persists itself, independent of which (if
   any) character sheet is currently loaded — closer to how window
   position/size already persist per-window (14-window-manager.js).
   This is a deliberate behavior change from before: switching which
   character is loaded on the sheet no longer resets or reloads the
   battlefield, since the two are no longer the same save. */
const _COMBAT_LOCAL_KEY = 'monarchy_combat_state';
function _saveLocalBattlefield() {
  try { _ls.set(_COMBAT_LOCAL_KEY, JSON.stringify(serializeBattlefield())); } catch (e) {}
}
let _localSaveTimer = null;
function _scheduleLocalSave() {
  clearTimeout(_localSaveTimer);
  _localSaveTimer = setTimeout(_saveLocalBattlefield, 800);
}
function _loadLocalBattlefield() {
  try {
    const raw = _ls.get(_COMBAT_LOCAL_KEY);
    if (raw) restoreBattlefield(JSON.parse(raw));
  } catch (e) {}
}
document.addEventListener('DOMContentLoaded', _loadLocalBattlefield);
window.addEventListener('beforeunload', _saveLocalBattlefield);
setInterval(_saveLocalBattlefield, 5000);

