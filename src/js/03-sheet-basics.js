/* ══ ARMOUR EQUIP SYSTEM ══ */
let _equippedArmorId = null;

function getEquippedAV() {
  if (!_equippedArmorId) return 1;
  const card = document.getElementById(_equippedArmorId);
  if (!card) { _equippedArmorId = null; return 1; }
  const avInput = card.querySelector('.armor-av-input');
  return Math.max(1, parseFloat(avInput && avInput.value) || 1);
}

function equipArmor(armorId) {
  _equippedArmorId = armorId;
  refreshArmorUI();
  recalcDerived();
}

function selectUnarmoured() {
  _equippedArmorId = null;
  refreshArmorUI();
  recalcDerived();
}

function refreshArmorUI() {
  document.querySelectorAll('#armor-list .armor-card').forEach(card => {
    card.classList.toggle('equipped', card.id === _equippedArmorId);
    const radio = card.querySelector('.armor-equip-radio');
    if (radio) radio.checked = (card.id === _equippedArmorId);
  });
  const unarmOpt = document.getElementById('unarmoured-option');
  const unarmRadio = document.getElementById('unarmoured-radio');
  if (unarmOpt) unarmOpt.classList.toggle('selected', _equippedArmorId === null);
  if (unarmRadio) unarmRadio.checked = (_equippedArmorId === null);

  const nameEl = document.getElementById('equipped-armour-name');
  const avEl = document.getElementById('equipped-av');
  if (_equippedArmorId) {
    const card = document.getElementById(_equippedArmorId);
    if (card) {
      const nameInput = card.querySelector('.armor-name-input');
      const avInput = card.querySelector('.armor-av-input');
      if (nameEl) nameEl.textContent = nameInput ? (nameInput.value || 'Unnamed Armour') : 'Unnamed Armour';
      if (avEl) avEl.textContent = avInput ? (avInput.value || '1') : '1';
    }
  } else {
    if (nameEl) nameEl.textContent = 'Unarmoured';
    if (avEl) avEl.textContent = '1';
  }
}

/* ══ AUTO-CALC DERIVED STATS ══ */
function recalcDerived() {
  const FOR = parseInt(document.getElementById('attr-for').value) || 0;
  const WIL = parseInt(document.getElementById('attr-wil').value) || 0;
  const AV = getEquippedAV();
  const hpMax = Math.round(FOR * AV);
  const stMax = Math.floor((FOR + WIL) / 2) + 4;
  const strMax = WIL * 2;
  ['hp-max','c-hp-max'].forEach(id => { const el=document.getElementById(id); if(el) el.value=hpMax; });
  ['st-max','c-st-max'].forEach(id => { const el=document.getElementById(id); if(el) el.value=stMax; });
  ['str-max','c-str-max'].forEach(id => { const el=document.getElementById(id); if(el) el.value=strMax; });
}

/* ══ SYNC VITALS ══ */
function syncFromCombat(p1id, p3id) {
  const c = document.getElementById(p3id);
  const v = document.getElementById(p1id);
  if (c && v) v.value = c.value;
}
function adjBothVals(p1id, p3id, delta) {
  const p1 = document.getElementById(p1id);
  const p3 = document.getElementById(p3id);
  if (!p1) return;
  p1.value = (parseInt(p1.value) || 0) + delta;
  if (p3) p3.value = p1.value;
}
function bindCurSync(p1id, p3id) {
  const el = document.getElementById(p1id);
  if (el) el.addEventListener('input', () => {
    const c = document.getElementById(p3id);
    if (c) c.value = el.value;
  });
}

/* ══ FIX 3: ATTRIBUTE ENTER-KEY NAVIGATION ══ */
(function setupAttrNavigation() {
  const attrOrder = ['attr-for','attr-pro','attr-dex','attr-nim','attr-wil','attr-int','attr-pre','attr-cha'];
  attrOrder.forEach((id, idx) => {
    // Wait for DOM ready - inputs exist on page load so bind immediately
    function bind() {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const nextId = attrOrder[idx + 1];
          if (nextId) {
            const next = document.getElementById(nextId);
            if (next) { next.focus(); next.select(); }
          }
        }
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  });
})();

/* ══ PREBUILT MODAL ══ */
let _pbMode = 'bg', _pbSelected = null;

function openPbModal(mode) {
  _pbMode = mode; _pbSelected = null;
  document.getElementById('pb-modal-title').textContent = mode === 'bg' ? 'Add Background' : 'Add Style / Lore / Art';
  pbSwitchTab('custom');
  const listEl = document.getElementById('pb-list');
  listEl.innerHTML = '';
  const items = mode === 'bg' ? PREBUILT_DATA.backgrounds : PREBUILT_DATA.sla;
  if (!items || !items.length) {
    listEl.innerHTML = '<p style="font-family:\'Crimson Text\',serif;font-style:italic;font-size:12px;opacity:.4;padding:12px 0;">No pre-built entries available yet.</p>';
  } else {
    if (mode === 'sla') {
      const groups = { style:[], lore:[], art:[] };
      items.forEach(item => { if(groups[item.type]) groups[item.type].push(item); });
      const labels = { style:'Styles', lore:'Lores', art:'Arts' };
      ['style','lore','art'].forEach(type => {
        if (!groups[type].length) return;
        groups[type].sort((a, b) => a.name.localeCompare(b.name));
        const catDiv = document.createElement('div'); catDiv.className = 'pb-category';
        catDiv.innerHTML = `<div class="pb-cat-label">${labels[type]}</div>`;
        groups[type].forEach(item => catDiv.appendChild(pbMakeItem(item)));
        listEl.appendChild(catDiv);
      });
    } else {
      const sortedItems = items.slice().sort((a, b) => a.name.localeCompare(b.name));
      const catDiv = document.createElement('div'); catDiv.className = 'pb-category';
      catDiv.innerHTML = '<div class="pb-cat-label">Backgrounds</div>';
      sortedItems.forEach(item => catDiv.appendChild(pbMakeItem(item)));
      listEl.appendChild(catDiv);
    }
  }
  document.getElementById('prebuilt-modal').classList.add('open');
}
function pbMakeItem(item) {
  const div = document.createElement('div'); div.className = 'pb-item'; div.dataset.id = item.id;
  div.innerHTML = `<div class="pb-item-dot"></div><div class="pb-item-info"><div class="pb-item-name">${esc(item.name)}</div><div class="pb-item-desc">${esc(item.desc)}</div></div>`;
  div.onclick = () => pbSelectItem(item.id); return div;
}
function pbSelectItem(id) {
  _pbSelected = id;
  document.querySelectorAll('#pb-list .pb-item').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
  const items = _pbMode === 'bg' ? PREBUILT_DATA.backgrounds : PREBUILT_DATA.sla;
  const item = items.find(i => i.id === id);
  const hint = document.getElementById('pb-footer-hint'); const btn = document.getElementById('pb-add-btn');
  if (hint && item) hint.textContent = item.name; if (btn) btn.disabled = false;
}
function pbSwitchTab(tab) {
  document.getElementById('pb-tab-custom').classList.toggle('active', tab==='custom');
  document.getElementById('pb-tab-prebuilt').classList.toggle('active', tab==='prebuilt');
  document.getElementById('pb-panel-custom').classList.toggle('active', tab==='custom');
  document.getElementById('pb-panel-prebuilt').classList.toggle('active', tab==='prebuilt');
  document.getElementById('pb-footer').style.display = tab==='prebuilt' ? 'flex' : 'none';
  if (tab==='prebuilt') { _pbSelected=null; document.querySelectorAll('#pb-list .pb-item').forEach(el=>el.classList.remove('selected')); const btn=document.getElementById('pb-add-btn'); if(btn) btn.disabled=true; const hint=document.getElementById('pb-footer-hint'); if(hint) hint.textContent='Select an entry above'; }
}
function pbConfirmCustom() { if(_pbMode==='bg') addBg(); else addAbilSlot(); closePbModal(); }
function pbConfirmPrebuilt() {
  if (!_pbSelected) return;
  if (_pbMode==='bg') { const item=PREBUILT_DATA.backgrounds.find(i=>i.id===_pbSelected); if(item) addBg({name:item.name,notes:item.notes,profGroups:item.profGroups}); }
  else { const item=PREBUILT_DATA.sla.find(i=>i.id===_pbSelected); if(item) addAbilSlot({slotName:item.name,type:item.type,passive:item.passive,entries:item.entries}); }
  closePbModal();
}
function closePbModal() { document.getElementById('prebuilt-modal').classList.remove('open'); _pbSelected=null; }
document.getElementById('prebuilt-modal').addEventListener('click', function(e) { if(e.target===this) closePbModal(); });

/* ══ TABS ══ */
function showTab(id,btn) {
  document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active'); btn.classList.add('active');
  if (id==='p3') syncCombatPage();
}
function syncCombatPage() {
  ['hp-cur','st-cur','str-cur'].forEach((p1id,i) => {
    const p3ids=['c-hp-cur','c-st-cur','c-str-cur'];
    const p1=document.getElementById(p1id); const p3=document.getElementById(p3ids[i]);
    if (p1&&p3&&p3.value==='') p3.value=p1.value;
  });
  recalcDerived();
}
function showSkillCat(cat,btn) {
  document.querySelectorAll('.skill-panel').forEach(p=>p.style.display='none');
  document.querySelectorAll('.sct-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('sp-'+cat).style.display='block'; btn.classList.add('active');
}

/* ══ UNIQUE IDS ══ */
let _sid=0;
function uid(prefix) { return (prefix||'n')+(++_sid)+'_'+Math.random().toString(36).slice(2,6); }

/* ══ HP ADJUST ══ */
function adjVal(id,delta) {
  const el=document.getElementById(id); if(!el) return;
  el.value=(parseInt(el.value)||0)+delta;
  const mirrorMap={'hp-cur':'c-hp-cur','st-cur':'c-st-cur','str-cur':'c-str-cur'};
  if (mirrorMap[id]) { const m=document.getElementById(mirrorMap[id]); if(m) m.value=el.value; }
}
