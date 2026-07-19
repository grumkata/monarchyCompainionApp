/* ══ SERIALIZATION ══
   Character "build" data only: identity, attributes, skills,
   backgrounds, weapons/armor, abilities. This used to also carry
   combat/session state (current HP-STA-STR, Ward, Exhaustion,
   Conditions, battlefield combatants) and lived inside
   07-combat-tracker.js despite PROJECT.md's claim that file was
   "isolated" — quickSave, confirmSave, loadCharacter, exportMonarch,
   importMonarch, and the undo system all depend on these two
   functions covering the WHOLE character, not just combat, so moving
   the file wholesale would have broken saving/loading for everything.
   Combat/session state now lives entirely in the standalone Combat
   window (07-combat-window.js), which persists itself independently
   (see _combatAutosave there) instead of riding along with the
   character file. Save format bumped v3 → v4 for this; v3 imports
   still load fine, they just won't have any combat fields to drop. */
function serializeSheet() {
  const data={v:4};
  data.id={name:val('id-name'),species:val('id-species'),culture:val('id-culture'),rank:val('id-rank'),size:val('id-size'),player:val('id-player')};
  data.attrs={}; ['for','pro','dex','nim','wil','int','pre','cha'].forEach(k=>{data.attrs[k]=val('attr-'+k);});
  data.derived={hpMax:val('hp-max'),stMax:val('st-max'),strMax:val('str-max')};
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
  return data;
}

function restoreSheet(data) {
  if (!data||(data.v!==3&&data.v!==4)) { showToast('Incompatible save format'); return; }
  const id=data.id||{};
  ['name','species','culture','rank','size','player'].forEach(k=>{const el=document.getElementById('id-'+k);if(el) el.value=id[k]||'';});

  if (id.size) {
    const sizeText = (id.size || '').toLowerCase();
    const preset = document.getElementById('id-size-preset');
    if (preset) {
      if (sizeText.includes('small')) preset.value = 'small';
      else if (sizeText.includes('medium')) preset.value = 'medium';
      else if (sizeText.includes('large')) preset.value = 'large';
      else preset.value = '';
    }
  }

  const attrs=data.attrs||{}; ['for','pro','dex','nim','wil','int','pre','cha'].forEach(k=>{const el=document.getElementById('attr-'+k);if(el) el.value=attrs[k]!==undefined?attrs[k]:5;});
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
}

/* ══ ACTIVE SAVE TRACKING ══ */
let _activeSaveId=null;
function setActiveSave(id,name) {
  _activeSaveId=id; const lbl=document.getElementById('current-save-label'); if(lbl) lbl.textContent=name?name:'';
  document.querySelectorAll('.save-entry').forEach(e=>e.classList.remove('active-save'));
  if(id) { const el=document.querySelector(`.save-entry[data-id="${id}"]`); if(el) el.classList.add('active-save'); }
}

/* ══ QUICK SAVE ══ */
function quickSave() {
  if (!_activeSaveId) { openSaveModal(); return; }
  const saves=getSaves(); if(!saves[_activeSaveId]) { openSaveModal(); return; }
  saves[_activeSaveId].data=serializeSheet(); saves[_activeSaveId].date=new Date().toLocaleDateString();
  _ls.set('monarchy_v3_saves',JSON.stringify(saves));
  const btn=document.getElementById('quicksave-btn'); btn.classList.add('saved-flash'); setTimeout(()=>btn.classList.remove('saved-flash'),800);
  showToast('Saved: '+saves[_activeSaveId].name); renderSavesList();
}

/* ══ SAVE / LOAD ══ */
/* ══ SAVE / LOAD ══ */
function getSaves() { try { return JSON.parse(_ls.get('monarchy_v3_saves'))||{}; } catch(e) { return {}; } }
function openSaveModal() { document.getElementById('save-name-input').value=val('id-name')||''; document.getElementById('save-modal').classList.add('open'); setTimeout(()=>document.getElementById('save-name-input').select(),50); }
function closeSaveModal() { document.getElementById('save-modal').classList.remove('open'); }
function confirmSave() {
  const name=document.getElementById('save-name-input').value.trim(); if(!name) { showToast('Enter a character name'); return; }
  const saves=getSaves(); const id='char_'+Date.now();
  saves[id]={name,date:new Date().toLocaleDateString(),data:serializeSheet()};
  _ls.set('monarchy_v3_saves',JSON.stringify(saves));
  closeSaveModal(); setActiveSave(id,name); showToast('Saved: '+name); renderSavesList();
}
function loadCharacter(id) {
  const saves=getSaves(); const entry=saves[id]; if(!entry) return;
  if(!confirm('Load "'+entry.name+'"? Unsaved changes will be lost.')) return;
  restoreSheet(entry.data); setActiveSave(id,entry.name); closeMenu(); showToast('Loaded: '+entry.name);
}
function deleteSave(id,e) {
  e.stopPropagation(); const saves=getSaves(); const name=(saves[id]||{}).name||'this character';
  if(!confirm('Delete "'+name+'"?')) return;
  delete saves[id]; _ls.set('monarchy_v3_saves',JSON.stringify(saves));
  if(_activeSaveId===id) setActiveSave(null,''); renderSavesList(); showToast('Deleted: '+name);
}
function renderSavesList() {
  const saves=getSaves(); const container=document.getElementById('saves-list'); const keys=Object.keys(saves).reverse();
  if(!keys.length) { container.innerHTML='<div class="smenu-empty">No saved characters</div>'; return; }
  container.innerHTML='';
  keys.forEach(id=>{
    const s=saves[id]; const el=document.createElement('div'); el.className='save-entry'; el.dataset.id=id;
    if(id===_activeSaveId) el.classList.add('active-save');
    el.onclick=()=>loadCharacter(id);
    el.innerHTML=`<div class="save-entry-name">${esc(s.name)}</div><div class="save-entry-date">${s.date||''}</div><button class="save-entry-del" onclick="deleteSave('${id}',event)">✕</button>`;
    container.appendChild(el);
  });
}
function newSheet() { if(!confirm('Start a new blank sheet? Unsaved changes will be lost.')) return; setActiveSave(null,''); location.reload(); }

/* ══ EXPORT / IMPORT ══ */
function exportMonarch() {
  const data=serializeSheet(); const charName=(data.id&&data.id.name)?data.id.name:'character';
  const payload={format:'monarchy-character-sheet',version:4,exported:new Date().toISOString(),character:data};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=charName.replace(/[^a-z0-9_\- ]/gi,'_')+'.monarch';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Exported: '+charName+'.monarch'); closeMenu();
}
function importMonarch(event) {
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e) {
    try {
      const payload=JSON.parse(e.target.result);
      if(!payload||payload.format!=='monarchy-character-sheet') { showToast('Not a valid .monarch file'); return; }
      const data=payload.character;
      if(!confirm('Import "'+(( data.id&&data.id.name)||'Unknown')+'"? Current sheet will be replaced.')) { event.target.value=''; return; }
      restoreSheet(data);
      const saves=getSaves(); const id='char_'+Date.now(); const name=(data.id&&data.id.name)||file.name.replace('.monarch','');
      saves[id]={name,date:new Date().toLocaleDateString(),data};
      _ls.set('monarchy_v3_saves',JSON.stringify(saves));
      setActiveSave(id,name); showToast('Imported: '+name); renderSavesList(); closeMenu();
    } catch(err) { showToast('Error reading file'); }
    event.target.value='';
  };
  reader.readAsText(file);
}

/* ══ AUTOSAVE ══ */
let _autosaveTimer=null; let _autosaveDot=document.getElementById('autosave-dot');
function scheduleAutosave() {
  if(!_activeSaveId) return;
  clearTimeout(_autosaveTimer); if(_autosaveDot) _autosaveDot.style.background='#c8a85a';
  _autosaveTimer=setTimeout(()=>{
    if(!_activeSaveId) return; const saves=getSaves(); if(!saves[_activeSaveId]) return;
    saves[_activeSaveId].data=serializeSheet(); saves[_activeSaveId].date=new Date().toLocaleDateString();
    _ls.set('monarchy_v3_saves',JSON.stringify(saves));
    if(_autosaveDot) { _autosaveDot.style.background='#2a6e2a'; setTimeout(()=>{if(_autosaveDot) _autosaveDot.style.background='#4a3a20';},1500); }
  },4000);
}
document.addEventListener('input',scheduleAutosave);
document.addEventListener('change',scheduleAutosave);

/* ══ KEYBOARD SHORTCUTS ══ */
document.addEventListener('keydown',function(e) { if((e.ctrlKey||e.metaKey)&&e.key==='s') { e.preventDefault(); quickSave(); } });

/* ══ MENU ══ */
function openMenu() { document.getElementById('sidemenu').classList.add('open'); document.getElementById('overlay').classList.add('open'); renderSavesList(); }
function closeMenu() { document.getElementById('sidemenu').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }

/* ══ TOAST ══ */
let _toastT;
function showToast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('show'),2600); }
