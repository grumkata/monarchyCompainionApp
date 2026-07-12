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
  const payload={format:'monarchy-character-sheet',version:3,exported:new Date().toISOString(),character:data};
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
