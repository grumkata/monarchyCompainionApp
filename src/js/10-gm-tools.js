/* ══════════════════════════════════════════════════════════════
   SERVER MANAGEMENT
   (Firebase config now lives at the top of 09-session-sync.js —
   BASE_SCRIPT_URL used to live here, back when the backend was a
   Google Apps Script relay.)
══════════════════════════════════════════════════════════════ */
function getServers() {
  try {
    const stored = JSON.parse(_ls.get('monarchy_servers'));
    if (stored && stored.length) return stored;
  } catch (e) {}
  // First run on this install — generate a private table id so this
  // install never collides with anyone else's table. (The old fallback
  // here was the literal string 'default', shared by EVERY fresh
  // install of the app — two unrelated tables that both just clicked
  // "start session" without first renaming their table would land in
  // the exact same shared room and see each other's data.)
  const fresh = [{ id: 'srv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: 'Main Table' }];
  saveServers(fresh);
  return fresh;
}
function saveServers(servers) { _ls.set('monarchy_servers', JSON.stringify(servers)); }
function getActiveServer() {
  const sel = document.getElementById('session-server-sel');
  const fallback = (getServers()[0] || {}).id;
  return sel ? (sel.value || fallback) : fallback;
}

function renderServerSelector() {
  const sel = document.getElementById('session-server-sel');
  if (!sel) return;
  const servers = getServers();
  const prev = sel.value;
  sel.innerHTML = servers.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  if (prev && servers.find(s => s.id === prev)) sel.value = prev;
}

function openServerManageModal() {
  renderServerListUI();
  document.getElementById('server-modal').style.display = 'flex';
}
function closeServerModal() {
  document.getElementById('server-modal').style.display = 'none';
  renderServerSelector();
}
function renderServerListUI() {
  const container = document.getElementById('server-list-ui');
  const servers = getServers();
  container.innerHTML = servers.map((s,i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border:1.5px solid var(--faint);background:var(--paper2);">
      <span style="font-family:'Crimson Text',serif;font-size:13px;flex:1;">${esc(s.name)}</span>
      <span style="font-family:'Cinzel',serif;font-size:7px;opacity:.4;letter-spacing:.1em;">#${esc(s.id)}</span>
      ${servers.length > 1 ? `<button onclick="deleteServer('${esc(s.id)}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:10px;opacity:.5;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.5'">✕</button>` : ''}
    </div>
  `).join('');
}
function addServer() {
  const inp = document.getElementById('new-server-name');
  const name = inp ? inp.value.trim() : '';
  if (!name) return;
  const servers = getServers();
  const id = 'srv_' + Date.now();
  servers.push({id, name});
  saveServers(servers);
  inp.value = '';
  renderServerListUI();
}
function deleteServer(id) {
  const servers = getServers().filter(s => s.id !== id);
  if (!servers.length) servers.push({id:'default', name:'Main Table'});
  saveServers(servers);
  renderServerListUI();
}

/* ══════════════════════════════════════════════════════════════
   GM TOOL: SAVED NPCs (localStorage)
══════════════════════════════════════════════════════════════ */
let _editingNpcId = null;

function getGmNpcs() {
  try { return JSON.parse((_ls.get('monarchy_gm_npcs'))) || []; } catch(e) { return []; }
}
function saveGmNpcs(npcs) { _ls.set('monarchy_gm_npcs', JSON.stringify(npcs)); }

function openGmNpcModal(id) {
  _editingNpcId = id || null;
  const npcs = getGmNpcs();
  const npc = id ? npcs.find(n => n.id === id) : null;
  document.getElementById('gm-npc-modal-title').textContent = npc ? 'Edit NPC Template' : 'New NPC Template';
  document.getElementById('gmnpc-name').value = npc ? npc.name : '';
  document.getElementById('gmnpc-hp').value = npc ? (npc.hp || '') : '';
  document.getElementById('gmnpc-notes').value = npc ? (npc.notes || '') : '';
  document.getElementById('gmnpc-isform').checked = npc ? !!npc.isForm : false;
  document.getElementById('gmnpc-units').value = npc ? (npc.units || '') : '';
  document.getElementById('gmnpc-uhp').value = npc ? (npc.uhp || '') : '';
  document.getElementById('gmnpc-atk').value = npc ? (npc.atk || '') : '';
  document.getElementById('gmnpc-form-fields').style.display = (npc && npc.isForm) ? 'flex' : 'none';
  document.getElementById('gmnpc-isform').onchange = function() {
    document.getElementById('gmnpc-form-fields').style.display = this.checked ? 'flex' : 'none';
  };
  document.getElementById('gm-npc-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('gmnpc-name').focus(), 50);
}
function closeGmNpcModal() { document.getElementById('gm-npc-modal').style.display = 'none'; }
function saveGmNpc() {
  const name = document.getElementById('gmnpc-name').value.trim();
  if (!name) { showToast('Enter a name'); return; }
  const isForm = document.getElementById('gmnpc-isform').checked;
  const npc = {
    id: _editingNpcId || ('npc_' + Date.now()),
    name, isForm,
    hp: document.getElementById('gmnpc-hp').value.trim(),
    notes: document.getElementById('gmnpc-notes').value.trim(),
    units: document.getElementById('gmnpc-units').value.trim(),
    uhp: document.getElementById('gmnpc-uhp').value.trim(),
    atk: document.getElementById('gmnpc-atk').value.trim(),
  };
  const npcs = getGmNpcs();
  const idx = npcs.findIndex(n => n.id === npc.id);
  if (idx >= 0) npcs[idx] = npc; else npcs.push(npc);
  saveGmNpcs(npcs);
  closeGmNpcModal();
  renderGmTools();
  showToast('NPC saved: ' + name);
}
function deleteGmNpc(id, e) {
  e.stopPropagation();
  const npcs = getGmNpcs().filter(n => n.id !== id);
  saveGmNpcs(npcs);
  renderGmTools();
}

// Drag-from-bar: creates a temporary ghost that snaps to a lane on drop
let _draggingNpcId = null;
function startNpcBarDrag(npcId, e) {
  _draggingNpcId = npcId;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', 'npc:' + npcId);
}

// Updated renderGmTools will make NPC chips draggable with a drag indicator

/* ══════════════════════════════════════════════════════════════
   GM TOOL: SAVED ENCOUNTERS (localStorage)
══════════════════════════════════════════════════════════════ */
let _editingEncId = null;
let _gmEncCombatants = [];

function getGmEncounters() {
  try { return JSON.parse((_ls.get('monarchy_gm_encounters'))) || []; } catch(e) { return []; }
}
function saveGmEncounters(encs) { _ls.set('monarchy_gm_encounters', JSON.stringify(encs)); }

function openGmEncounterModal(id) {
  _editingEncId = id || null;
  const encs = getGmEncounters();
  const enc = id ? encs.find(e => e.id === id) : null;
  document.getElementById('gm-enc-modal-title').textContent = enc ? 'Edit Encounter' : 'New Encounter';
  document.getElementById('gmenc-name').value = enc ? enc.name : '';
  _gmEncCombatants = enc ? enc.combatants.map(c => Object.assign({}, c)) : [];
  renderEncCombatantsList();
  document.getElementById('gm-enc-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('gmenc-name').focus(), 50);
}
function closeGmEncModal() { document.getElementById('gm-enc-modal').style.display = 'none'; }

function addGmEncCombatant() {
  _gmEncCombatants.push({ name: '', side: 'enemy', lane: 'e-front', hp: '', notes: '', isForm: false, units: '', uhp: '', atk: '' });
  renderEncCombatantsList();
}
function renderEncCombatantsList() {
  const el = document.getElementById('gmenc-combatants-list');
  if (!el) return;
  if (!_gmEncCombatants.length) {
    el.innerHTML = '<span style="font-family:\'Crimson Text\',serif;font-style:italic;opacity:.4;font-size:12px;">No combatants yet , click "+ Add Combatant"</span>';
    return;
  }
  el.innerHTML = _gmEncCombatants.map((c, i) => `
    <div class="gmenc-row" id="gmenc-row-${i}">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
        <input type="text" value="${esc(c.name)}" placeholder="Name" class="gmenc-field" style="flex:2;min-width:80px;" oninput="_gmEncCombatants[${i}].name=this.value">
        <select class="gmenc-field" style="width:70px;" onchange="_gmEncCombatants[${i}].side=this.value;if(this.value==='ally')_gmEncCombatants[${i}].lane='a-front';else _gmEncCombatants[${i}].lane='e-front';renderEncCombatantsList()">
          <option value="enemy" ${c.side==='enemy'?'selected':''}>Enemy</option>
          <option value="ally" ${c.side==='ally'?'selected':''}>Ally</option>
        </select>
        <select class="gmenc-field" style="width:90px;" onchange="_gmEncCombatants[${i}].lane=this.value">
          ${c.side==='ally'
            ? `<option value="a-front" ${c.lane==='a-front'?'selected':''}>A-Front</option>
               <option value="a-second" ${c.lane==='a-second'?'selected':''}>A-Second</option>
               <option value="a-support" ${c.lane==='a-support'?'selected':''}>A-Support</option>
               <option value="a-back" ${c.lane==='a-back'?'selected':''}>A-Back</option>`
            : `<option value="e-front" ${c.lane==='e-front'?'selected':''}>E-Front</option>
               <option value="e-second" ${c.lane==='e-second'?'selected':''}>E-Second</option>
               <option value="e-support" ${c.lane==='e-support'?'selected':''}>E-Support</option>
               <option value="e-back" ${c.lane==='e-back'?'selected':''}>E-Back</option>`}
        </select>
        <label style="display:flex;align-items:center;gap:3px;font-family:'Crimson Text',serif;font-size:11px;cursor:pointer;white-space:nowrap;">
          <input type="checkbox" ${c.isForm?'checked':''} onchange="_gmEncCombatants[${i}].isForm=this.checked;renderEncCombatantsList()" style="accent-color:var(--red);">Formation
        </label>
        <button onclick="_gmEncCombatants.splice(${i},1);renderEncCombatantsList()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;padding:0 3px;opacity:.55;margin-left:auto;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.55'">✕</button>
      </div>
      ${c.isForm
        ? `<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
            <div style="display:flex;flex-direction:column;gap:1px;"><span class="lbl">Units</span><input type="number" value="${esc(c.units)}" placeholder="10" class="gmenc-field" style="width:55px;" oninput="_gmEncCombatants[${i}].units=this.value"></div>
            <div style="display:flex;flex-direction:column;gap:1px;"><span class="lbl">HP/Unit</span><input type="number" value="${esc(c.uhp)}" placeholder="5" class="gmenc-field" style="width:55px;" oninput="_gmEncCombatants[${i}].uhp=this.value"></div>
            <div style="display:flex;flex-direction:column;gap:1px;"><span class="lbl">Attack</span><input type="number" value="${esc(c.atk)}" placeholder="," class="gmenc-field" style="width:55px;" oninput="_gmEncCombatants[${i}].atk=this.value"></div>
            <div style="display:flex;flex-direction:column;gap:1px;flex:1;"><span class="lbl">Notes</span><input type="text" value="${esc(c.notes)}" placeholder="role…" class="gmenc-field" oninput="_gmEncCombatants[${i}].notes=this.value"></div>
           </div>`
        : `<div style="display:flex;gap:6px;margin-top:4px;">
            <div style="display:flex;flex-direction:column;gap:1px;"><span class="lbl">HP</span><input type="text" value="${esc(c.hp)}" placeholder="20" class="gmenc-field" style="width:55px;" oninput="_gmEncCombatants[${i}].hp=this.value"></div>
            <div style="display:flex;flex-direction:column;gap:1px;flex:1;"><span class="lbl">Notes</span><input type="text" value="${esc(c.notes)}" placeholder="role…" class="gmenc-field" oninput="_gmEncCombatants[${i}].notes=this.value"></div>
           </div>`}
    </div>
  `).join('');
}
function saveGmEncounter() {
  const name = document.getElementById('gmenc-name').value.trim();
  if (!name) { showToast('Enter an encounter name'); return; }
  const enc = { id: _editingEncId || ('enc_' + Date.now()), name, combatants: _gmEncCombatants, globalMana: _globalMana };
  const encs = getGmEncounters();
  const idx = encs.findIndex(e => e.id === enc.id);
  if (idx >= 0) encs[idx] = enc; else encs.push(enc);
  saveGmEncounters(encs);
  closeGmEncModal();
  renderGmTools();
  showToast('Encounter saved: ' + name);
}
function deleteGmEncounter(id, e) {
  e.stopPropagation();
  const encs = getGmEncounters().filter(e => e.id !== id);
  saveGmEncounters(encs);
  renderGmTools();
}
function loadGmEncounter(id) {
  const enc = getGmEncounters().find(e => e.id === id);
  if (!enc) return;
  if (!confirm(`Load encounter "${enc.name}"?\nThis adds these combatants to the current battlefield.`)) return;
  enc.combatants.forEach(c => placeCombatant(Object.assign({}, c)));
  // ✓ Restore encounter mana if saved
  if (enc.globalMana !== undefined) {
    _globalMana = enc.globalMana;
    const el = document.getElementById('global-mana-val');
    if (el) el.textContent = _globalMana;
  }
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  showToast('Loaded: ' + enc.name);
}

function renderGmTools() {
  const npcEl = document.getElementById('gm-npc-btns');
  const encEl = document.getElementById('gm-encounter-btns');
  const npcs = getGmNpcs();
  const encs = getGmEncounters();
  if (npcEl) {
    if (!npcs.length) {
      npcEl.innerHTML = '<span class="gm-empty-hint">No saved NPCs , click "+ New NPC" to create one.<br><span style="opacity:.6;font-size:10px;">Drag NPC chips onto the battlefield lanes during combat.</span></span>';
    } else {
      npcEl.innerHTML = '<div style="font-family:\'Crimson Text\',serif;font-style:italic;font-size:10px;opacity:.45;margin-bottom:4px;">Drag onto a battlefield lane, or click to place:</div>' +
        npcs.map(n => {
          const hint = n.isForm ? ` <span class="gm-npc-form-badge">⚔ Formation</span>` : '';
          const stat = n.isForm ? `${n.units||'?'}u·${n.uhp||'?'}hp` : (n.hp ? `♥${n.hp}` : ',');
          return `<div class="gm-npc-chip" draggable="true" data-npc-id="${esc(n.id)}" ondragstart="startNpcBarDrag('${esc(n.id)}',event)" onclick="promptPlaceNpc('${esc(n.id)}')" title="Drag to battlefield lane or click to choose lane">
            <span class="gm-npc-drag-handle">⠿</span>
            <span class="gm-npc-place">${esc(n.name)}${hint} <span style="opacity:.45;font-size:10px;">${stat}</span></span>
            <button class="gm-npc-edit" onclick="openGmNpcModal('${esc(n.id)}');event.stopPropagation()" title="Edit">✎</button>
            <button class="gm-npc-del" onclick="deleteGmNpc('${esc(n.id)}',event)" title="Delete">✕</button>
          </div>`;
        }).join('');
      // After render, set up drop targets on the lanes
      setTimeout(setupNpcDropZones, 50);
    }
  }
  if (encEl) {
    if (!encs.length) {
      encEl.innerHTML = '<span class="gm-empty-hint">No saved encounters , click "+ New Encounter" to create one</span>';
    } else {
      encEl.innerHTML = encs.map(e => `
        <div class="gm-enc-chip">
          <button class="gm-enc-place" onclick="loadGmEncounter('${esc(e.id)}')" title="Load encounter">${esc(e.name)} <span style="opacity:.45;font-size:10px;">(${e.combatants.length})</span></button>
          <button class="gm-enc-edit" onclick="openGmEncounterModal('${esc(e.id)}')" title="Edit">✎</button>
          <button class="gm-enc-del" onclick="deleteGmEncounter('${esc(e.id)}',event)" title="Delete">✕</button>
        </div>
      `).join('');
    }
  }
}

// Prompt for side and lane when clicking NPC chip
function promptPlaceNpc(npcId) {
  const npc = getGmNpcs().find(n => n.id === npcId);
  if (!npc) return;
  const side = confirm('Place on ALLY side? (Cancel = Enemy)') ? 'ally' : 'enemy';
  const laneChoices = side === 'ally'
    ? ['a-front:Frontline', 'a-second:Secondary', 'a-support:Support', 'a-back:Backline']
    : ['e-front:Frontline', 'e-second:Secondary', 'e-support:Support', 'e-back:Backline'];
  const laneStr = prompt('Lane: 1=Frontline 2=Secondary 3=Support 4=Backline', '1');
  const laneIdx = Math.min(Math.max((parseInt(laneStr)||1)-1, 0), 3);
  const lane = laneChoices[laneIdx].split(':')[0];
  placeCombatant(Object.assign({}, npc, {side, lane}));
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
}

// Setup drag-and-drop from NPC bar to battlefield lanes
let _dropZonesSetup = false;
function setupNpcDropZones() {
  document.querySelectorAll('.bf-lane').forEach(lane => {
    // Only set up once per lane (avoid duplicate listeners)
    if (lane.dataset.npcDropReady) return;
    lane.dataset.npcDropReady = '1';
    lane.addEventListener('dragover', e => {
      if (!_draggingNpcId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      lane.classList.add('npc-drop-target');
    });
    lane.addEventListener('dragleave', e => { lane.classList.remove('npc-drop-target'); });
    lane.addEventListener('drop', e => {
      lane.classList.remove('npc-drop-target');
      if (!_draggingNpcId) return;
      e.preventDefault();
      e.stopPropagation();
      const npc = getGmNpcs().find(n => n.id === _draggingNpcId);
      _draggingNpcId = null;
      if (!npc) return;
      const laneId = lane.dataset.lane;
      const side = laneId.startsWith('a-') ? 'ally' : 'enemy';
      placeCombatant(Object.assign({}, npc, {side, lane: laneId}));
      clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
    });
    lane.addEventListener('dragend', () => { _draggingNpcId = null; });
  });
}

/* ══ INIT ══ populate the server dropdown once at load, same as every
   reload after. */
renderServerSelector();
