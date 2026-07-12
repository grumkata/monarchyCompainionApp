/* ══ SKILL PICKER MODAL ══ */
let _spResolve = null;

function _injectSkillPickerModal() {
  if (document.getElementById('skill-picker-modal')) return;
  const style = document.createElement('style');
  style.textContent = `
    #skill-picker-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:700;align-items:center;justify-content:center;}
    #skill-picker-modal.open{display:flex;}
    .sp-box{background:var(--paper);border:3px solid var(--ink);max-width:420px;width:92%;box-shadow:0 10px 40px rgba(0,0,0,.85);display:flex;flex-direction:column;max-height:82vh;}
    .sp-head{background:var(--ink);color:var(--paper);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
    .sp-title{font-family:'Cinzel',serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;}
    .sp-close{background:none;border:1.5px solid rgba(240,230,204,.3);color:var(--paper);cursor:pointer;font-family:'Cinzel',serif;font-size:8px;padding:2px 9px;opacity:.5;transition:opacity .12s;}
    .sp-close:hover{opacity:1;}
    .sp-tabs{display:flex;border-bottom:2.5px solid var(--ink);flex-shrink:0;}
    .sp-tab{flex:1;font-family:'Cinzel',serif;font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:8px 4px;border:none;cursor:pointer;background:var(--paper2);color:var(--ink);opacity:.5;transition:all .13s;border-right:1.5px solid var(--mid);}
    .sp-tab:last-child{border-right:none;}
    .sp-tab:hover{opacity:.85;background:var(--paper3);}
    .sp-tab.active{background:var(--ink);color:var(--paper);opacity:1;}
    .sp-body{flex:1;overflow-y:auto;padding:14px 16px 16px;}
    .sp-hint{font-family:'Crimson Text',serif;font-style:italic;font-size:12px;opacity:.5;margin-bottom:12px;line-height:1.5;}
    .sp-custom-confirm{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:8px 20px;border:2px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer;width:100%;transition:all .12s;}
    .sp-custom-confirm:hover{background:#3a2a18;}
    .sp-list{display:flex;flex-direction:column;gap:4px;}
    .sp-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border:1.5px solid var(--faint);background:var(--paper2);cursor:pointer;transition:all .11s;font-family:'Crimson Text',serif;font-size:13px;font-weight:600;}
    .sp-item:hover{border-color:var(--mid);background:var(--paper3);}
    .sp-item.selected{border-color:var(--red);background:rgba(139,26,26,.07);}
    .sp-item-dot{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--mid);flex-shrink:0;transition:all .11s;}
    .sp-item.selected .sp-item-dot{background:var(--red);border-color:var(--red);}
    .sp-footer{flex-shrink:0;display:flex;gap:8px;padding:10px 16px;border-top:2px solid var(--faint);background:var(--paper2);}
    .sp-footer-hint{font-family:'Crimson Text',serif;font-style:italic;font-size:11px;opacity:.4;flex:1;display:flex;align-items:center;}
    .sp-confirm{font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:8px 20px;border:2px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer;white-space:nowrap;transition:all .12s;}
    .sp-confirm:hover{background:#3a2a18;}
    .sp-confirm:disabled{opacity:.3;cursor:default;}
  `;
  document.head.appendChild(style);
  const modal = document.createElement('div');
  modal.id = 'skill-picker-modal';
  modal.innerHTML = `<div class="sp-box">
    <div class="sp-head"><span class="sp-title" id="sp-title">Choose Skill</span><button class="sp-close" onclick="_spCancel()">✕</button></div>
    <div class="sp-tabs">
      <button class="sp-tab active" id="sp-tab-builtin" onclick="_spSwitchTab('builtin')">✦ Built-In</button>
      <button class="sp-tab" id="sp-tab-custom" onclick="_spSwitchTab('custom')">✎ Custom</button>
    </div>
    <div class="sp-body" id="sp-body">
      <div id="sp-panel-builtin"><div class="sp-list" id="sp-list"></div></div>
      <div id="sp-panel-custom" style="display:none;">
        <p class="sp-hint">Enter a custom name , you can edit it anytime in the skill field.</p>
        <button class="sp-custom-confirm" onclick="_spConfirmCustom()">+ Add Custom Skill</button>
      </div>
    </div>
    <div class="sp-footer" id="sp-footer">
      <span class="sp-footer-hint" id="sp-footer-hint">Select a skill above</span>
      <button class="sp-confirm" id="sp-confirm-btn" onclick="_spConfirmBuiltin()" disabled>Add Selected ✦</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) _spCancel(); });
}

function _spSwitchTab(tab) {
  document.getElementById('sp-tab-builtin').classList.toggle('active', tab==='builtin');
  document.getElementById('sp-tab-custom').classList.toggle('active', tab==='custom');
  document.getElementById('sp-panel-builtin').style.display = tab==='builtin' ? 'block' : 'none';
  document.getElementById('sp-panel-custom').style.display = tab==='custom' ? 'block' : 'none';
  document.getElementById('sp-footer').style.display = tab==='builtin' ? 'flex' : 'none';
  if (tab==='builtin') {
    document.querySelectorAll('.sp-item').forEach(el=>el.classList.remove('selected'));
    document.getElementById('sp-confirm-btn').disabled = true;
    document.getElementById('sp-footer-hint').textContent = 'Select a skill above';
  }
}

let _spSelected = null;
function _spSelectItem(name, el) {
  _spSelected = name;
  document.querySelectorAll('.sp-item').forEach(i=>i.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('sp-confirm-btn').disabled = false;
  document.getElementById('sp-footer-hint').textContent = name;
}

function _spConfirmBuiltin() {
  if (!_spSelected || !_spResolve) return;
  const cb = _spResolve; const name = _spSelected;
  _spResolve = null; _spSelected = null;
  _closeSkillPicker();
  cb(name);
}
function _spConfirmCustom() {
  if (!_spResolve) return;
  const cb = _spResolve; _spResolve = null; _spSelected = null;
  _closeSkillPicker();
  cb(null);
}
function _spCancel() {
  _spResolve = null; _spSelected = null;
  _closeSkillPicker();
}
function _closeSkillPicker() {
  const m = document.getElementById('skill-picker-modal');
  if (m) m.classList.remove('open');
}

function openSkillPicker(title, options) {
  _injectSkillPickerModal();
  _spSelected = null;
  const hasBuiltin = options && options.length > 0;

  document.getElementById('sp-title').textContent = title;
  document.getElementById('sp-confirm-btn').disabled = true;
  document.getElementById('sp-footer-hint').textContent = 'Select a skill above';

  if (!hasBuiltin) {
    document.getElementById('sp-tab-builtin').style.display = 'none';
    _spSwitchTab('custom');
  } else {
    document.getElementById('sp-tab-builtin').style.display = '';
    _spSwitchTab('builtin');
  }

  const listEl = document.getElementById('sp-list');
  listEl.innerHTML = '';
  const sortedOptions = (options || []).slice().sort((a, b) => a.localeCompare(b));
  sortedOptions.forEach(name => {
    const item = document.createElement('div');
    item.className = 'sp-item';
    item.innerHTML = `<div class="sp-item-dot"></div><span>${esc(name)}</span>`;
    item.onclick = () => _spSelectItem(name, item);
    listEl.appendChild(item);
  });

  document.getElementById('skill-picker-modal').classList.add('open');

  return new Promise(resolve => { _spResolve = resolve; });
}

/* ══ SKILL TREES ══ */
function updateEmpty(cat) {
  const t=document.getElementById('tree-'+cat);
  const e=document.getElementById('empty-'+cat);
  if(e) e.style.display=t&&t.children.length>0?'none':'flex';
}

async function addPrimary(cat, opts) {
  if (!opts) {
    const primaries = Object.keys(SKILL_DATA[cat] || {});
    if (!primaries.length) {
      opts = {};
    } else {
      const chosen = await openSkillPicker('Choose Primary Skill', primaries);
      if (chosen === undefined) return;
      opts = chosen ? { name: chosen } : {};
    }
  }
  const tree = document.getElementById('tree-'+cat);
  const id = uid('prim');
  const el = document.createElement('div');
  el.className = 'skill-primary';
  el.id = id;
  el.dataset.cat = cat;
  el.dataset.primName = opts.name || '';
  el.innerHTML = `<div class="skill-prim-head"><div class="skill-prim-score"><input type="number" min="0" max="20" value="${opts.score||1}"></div><input type="text" style="flex:1;min-width:0;" placeholder="Primary skill name…" value="${esc(opts.name||'')}" oninput="document.getElementById('${id}').dataset.primName=this.value"><button class="skill-collapse-btn" title="Collapse/Expand" onclick="toggleSkillCollapse('${id}')">▾</button><button class="skill-btn-light" onclick="addSecondary('${id}')">+ Secondary</button><button class="rm" style="color:var(--paper);" onclick="document.getElementById('${id}').remove();updateEmpty('${cat}')">✕</button></div><div class="skill-children" id="sc-${id}"></div>`;
  tree.appendChild(el);
  if (opts.secondaries) opts.secondaries.forEach(s => addSecondary(id, s, true));
  updateEmpty(cat);
  return id;
}

async function addSecondary(primId, opts, skipPicker) {
  if (!opts && !skipPicker) {
    const primEl = document.getElementById(primId);
    const cat = primEl ? primEl.dataset.cat : null;
    const primName = primEl ? (primEl.dataset.primName || '') : '';
    const primData = (SKILL_DATA[cat] || {})[primName];
    const secondaries = primData ? (primData.secondaries || []) : [];
    if (!secondaries.length) {
      opts = {};
    } else {
      const chosen = await openSkillPicker('Secondary for ' + (primName || 'skill'), secondaries);
      if (chosen === undefined) return;
      opts = chosen ? { name: chosen } : {};
    }
  }
  opts = opts || {};
  const id = uid('sec');
  const el = document.createElement('div');
  el.className = 'skill-secondary';
  el.id = id;
  el.dataset.secName = opts.name || '';
  el.innerHTML = `<div class="skill-sec-head"><div style="font-family:'Cinzel',serif;font-size:8px;opacity:.25;flex-shrink:0;">↳</div><div class="skill-sec-score"><input type="number" min="0" max="20" value="${opts.score||1}" oninput="updateSkillBadge('${id}')"></div><input type="text" style="flex:1;min-width:0;font-family:'Crimson Text',serif;font-size:13px;font-weight:600;border-bottom:1.5px solid var(--mid);background:transparent;outline:none;" placeholder="Secondary skill name…" value="${esc(opts.name||'')}" oninput="this.closest('.skill-secondary').dataset.secName=this.value"><button class="skill-btn-dark" onclick="addTertiary('${id}')">+ Tertiary</button><button class="rm" onclick="document.getElementById('${id}').remove()">✕</button></div><div class="skill-ter-list" id="tc-${id}"></div>`;
  document.getElementById('sc-'+primId).appendChild(el);
  if (opts.tertiaries) opts.tertiaries.forEach(t => addTertiary(id, t, true));
  return id;
}

async function addTertiary(secId, opts, skipPicker) {
  if (!opts && !skipPicker) {
    const secEl = document.getElementById(secId);
    const primEl = secEl ? secEl.closest('.skill-primary') : null;
    const cat = primEl ? primEl.dataset.cat : null;
    const primName = primEl ? (primEl.dataset.primName || '') : '';
    const secName = secEl ? (secEl.dataset.secName || '') : '';
    const primData = (SKILL_DATA[cat] || {})[primName];
    const tertiaries = primData && primData.tertiaries ? (primData.tertiaries[secName] || []) : [];
    if (!tertiaries.length) {
      opts = {};
    } else {
      const chosen = await openSkillPicker('Tertiary for ' + (secName || 'skill'), tertiaries);
      if (chosen === undefined) return;
      opts = chosen ? { name: chosen } : {};
    }
  }
  opts = opts || {};
  const id = uid('ter');
  const el = document.createElement('div');
  el.className = 'skill-ter-row';
  el.id = id;
  el.innerHTML = `<div style="font-family:'Cinzel',serif;font-size:9px;opacity:.2;padding-left:2px;flex-shrink:0;">└</div><div class="skill-ter-score"><input type="number" min="0" max="20" value="${opts.score||1}" oninput="updateSkillBadge(this.closest('.skill-ter-row').id)"></div><input type="text" style="flex:1;min-width:0;font-family:'Crimson Text',serif;font-style:italic;font-size:12px;border-bottom:1px solid var(--mid);background:transparent;outline:none;" placeholder="Tertiary skill name…" value="${esc(opts.name||'')}" ><button class="rm" onclick="document.getElementById('${id}').remove()">✕</button>`;
  document.getElementById('tc-'+secId).appendChild(el);
}

/* ══ KNACKS ══ */
function addKnack(opts) {
  opts=opts||{}; const el=document.createElement('div'); el.className='knack-row';
  el.innerHTML=`<input type="text" placeholder="Knack name" value="${esc(opts.name||'')}"><input type="number" min="0" max="20" value="${opts.level||0}"><button class="rm" onclick="this.closest('.knack-row').remove()">✕</button>`;
  document.getElementById('knacks-list').appendChild(el);
}

/* ══ BACKGROUNDS ══ */
let _bgN=0, _bgGN=0;
// updateSkillBadge is referenced in skill input oninput handlers , stub if not defined elsewhere
if (typeof updateSkillBadge === 'undefined') { window.updateSkillBadge = function() {}; }

/* ── Path helpers ── */
// Parse "Survival → Wilderness → Hunting" or structured {path:[...]} into array
function bgParsePath(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && raw.path) return raw.path;
  // Legacy string format
  return String(raw).split(/\s*→\s*/).map(s=>s.trim()).filter(Boolean);
}
function bgPathToDisplay(path) {
  if (!Array.isArray(path) || !path.length) return ', choose one ,';
  return path.join(' → ');
}

/* ── Find which category a primary skill belongs to ── */
function bgFindSkillCat(primName) {
  for (const cat of ['body','mind','social']) {
    if (SKILL_DATA[cat] && SKILL_DATA[cat][primName]) return cat;
  }
  // Fuzzy match (case-insensitive)
  for (const cat of ['body','mind','social']) {
    const keys = Object.keys(SKILL_DATA[cat]||{});
    const match = keys.find(k=>k.toLowerCase()===primName.toLowerCase());
    if (match) return cat;
  }
  return null;
}

/* ── Apply a proficiency path to the skill trees ──
   path = ['Primary', 'Secondary', 'Tertiary'] (1–3 levels)
   Rulebook: +1 to each level up the hierarchy. Capped at max for that tier.
   Caps: Primary max 3, Secondary max (parent*2), Tertiary max (parent*3).
   If skill doesn't exist yet, create it at value 1. */
function bgApplyPathToSkills(path, delta) {
  delta = delta || 1;
  if (!path || !path.length) return false;
  const primName = path[0];
  const cat = bgFindSkillCat(primName);
  if (!cat) { showToast('Unknown primary skill: ' + primName); return false; }

  // Find or create primary
  let primEl = null;
  const tree = document.getElementById('tree-'+cat);
  if (!tree) return false;
  [...tree.querySelectorAll(':scope > .skill-primary')].forEach(el => {
    const nameIn = el.querySelector('.skill-prim-head input[type=text]');
    if (nameIn && nameIn.value.toLowerCase() === primName.toLowerCase()) primEl = el;
  });
  if (!primEl) {
    // Create it
    const id = uid('prim');
    primEl = document.createElement('div');
    primEl.className = 'skill-primary'; primEl.id = id; primEl.dataset.cat = cat; primEl.dataset.primName = primName;
    primEl.innerHTML = `<div class="skill-prim-head"><div class="skill-prim-score"><input type="number" min="0" max="20" value="0"></div><input type="text" style="flex:1;min-width:0;" placeholder="Primary skill name…" value="${esc(primName)}" oninput="document.getElementById('${id}').dataset.primName=this.value"><button class="skill-collapse-btn" title="Collapse/Expand" onclick="toggleSkillCollapse('${id}')">▾</button><button class="skill-btn-light" onclick="addSecondary('${id}')">+ Secondary</button><button class="rm" style="color:var(--paper);" onclick="document.getElementById('${id}').remove();updateEmpty('${cat}')">✕</button></div><div class="skill-children" id="sc-${id}"></div>`;
    tree.appendChild(primEl);
    updateEmpty(cat);
  }
  // Adjust primary score (max 3)
  const primScoreIn = primEl.querySelector('.skill-prim-score input');
  if (primScoreIn) {
    let v = (parseInt(primScoreIn.value)||0) + delta;
    v = Math.max(0, Math.min(3, v));
    primScoreIn.value = v;
    if (v === 0) { primEl.remove(); updateEmpty(cat); return true; }
  }

  if (path.length < 2) return true;
  const secName = path[1];
  // Find or create secondary
  let secEl = null;
  const scList = primEl.querySelector('.skill-children');
  if (scList) {
    [...scList.querySelectorAll(':scope > .skill-secondary')].forEach(el => {
      const nameIn = el.querySelector('.skill-sec-head input[type=text]');
      if (nameIn && nameIn.value.toLowerCase() === secName.toLowerCase()) secEl = el;
    });
  }
  if (!secEl) {
    const id = uid('sec');
    secEl = document.createElement('div');
    secEl.className = 'skill-secondary'; secEl.id = id; secEl.dataset.secName = secName;
    secEl.innerHTML = `<div class="skill-sec-head"><div style="font-family:'Cinzel',serif;font-size:8px;opacity:.25;flex-shrink:0;">↳</div><div class="skill-sec-score"><input type="number" min="0" max="20" value="0" oninput="updateSkillBadge('${id}')"></div><input type="text" style="flex:1;min-width:0;font-family:'Crimson Text',serif;font-size:13px;font-weight:600;border-bottom:1.5px solid var(--mid);background:transparent;outline:none;" placeholder="Secondary skill name…" value="${esc(secName)}" oninput="this.closest('.skill-secondary').dataset.secName=this.value"><button class="skill-btn-dark" onclick="addTertiary('${id}')">+ Tertiary</button><button class="rm" onclick="document.getElementById('${id}').remove()">✕</button></div><div class="skill-ter-list" id="tc-${id}"></div>`;
    if (scList) scList.appendChild(secEl);
  }
  // Adjust secondary score (max primScore*2)
  const primScore = parseInt(primScoreIn ? primScoreIn.value : 1)||1;
  const secScoreIn = secEl.querySelector('.skill-sec-score input');
  if (secScoreIn) {
    let v = (parseInt(secScoreIn.value)||0) + delta;
    v = Math.max(0, Math.min(primScore*2, v));
    secScoreIn.value = v;
    if (v === 0) { secEl.remove(); return true; }
  }

  if (path.length < 3) return true;
  const terName = path[2];
  // Find or create tertiary
  let terEl = null;
  const tcList = secEl.querySelector('.skill-ter-list');
  if (tcList) {
    [...tcList.querySelectorAll(':scope > .skill-ter-row')].forEach(el => {
      const nameIn = el.querySelectorAll('input')[1];
      if (nameIn && nameIn.value.toLowerCase() === terName.toLowerCase()) terEl = el;
    });
  }
  if (!terEl) {
    const id = uid('ter');
    terEl = document.createElement('div');
    terEl.className = 'skill-ter-row'; terEl.id = id;
    terEl.innerHTML = `<div style="font-family:'Cinzel',serif;font-size:9px;opacity:.2;padding-left:2px;flex-shrink:0;">└</div><div class="skill-ter-score"><input type="number" min="0" max="20" value="0" oninput="updateSkillBadge(this.closest('.skill-ter-row').id)"></div><input type="text" style="flex:1;min-width:0;font-family:'Crimson Text',serif;font-style:italic;font-size:12px;border-bottom:1px solid var(--mid);background:transparent;outline:none;" placeholder="Tertiary skill name…" value="${esc(terName)}"><button class="rm" onclick="document.getElementById('${id}').remove()">✕</button>`;
    if (tcList) tcList.appendChild(terEl);
  }
  const secScore = parseInt(secScoreIn ? secScoreIn.value : 1)||1;
  const terScoreIn = terEl.querySelectorAll('input')[0];
  if (terScoreIn) {
    let v = (parseInt(terScoreIn.value)||0) + delta;
    v = Math.max(0, Math.min(secScore*3, v));
    terScoreIn.value = v;
    if (v === 0) { terEl.remove(); return true; }
  }
  return true;
}

/* ── Apply chosen proficiency from a pgroup to skills ── */
function bgApplyGroupToSkills(gid, delta) {
  delta = delta || 1;
  const opts = document.getElementById(gid+'-opts'); if (!opts) return;
  const sel = opts.querySelector('.bg-pgroup-option.selected'); if (!sel) { showToast('No proficiency selected , choose one first'); return; }
  const pathRaw = sel.dataset.path;
  let path;
  try { path = JSON.parse(pathRaw); } catch(e) { path = bgParsePath(sel.querySelector('.bg-opt-txt')?.textContent||''); }
  if (!path.length) { showToast('No skill path to apply'); return; }
  bgApplyPathToSkills(path, delta);
  const verb = delta >= 0 ? 'Applied' : 'Removed';
  showToast(verb + ': ' + path.join(' → '));
}

/* ── Toggle apply: check = apply proficiency bonuses + unlock invest; uncheck = remove all ── */
function bgToggleApply(bgId) {
  const card = document.getElementById(bgId); if (!card) return;
  const toggle = card.querySelector('.bg-apply-toggle');
  const isApplied = toggle.classList.contains('active');

  if (!isApplied) {
    // Collect paths , need both chosen
    const groups = [...card.querySelectorAll('.bg-pgroup')];
    const paths = [];
    groups.forEach(g => {
      const sel = g.querySelector('.bg-pgroup-option.selected'); if (!sel) return;
      let path; try { path = JSON.parse(sel.dataset.path); } catch(e) { path = bgParsePath(sel.querySelector('.bg-opt-txt')?.textContent||''); }
      if (path.length) paths.push(path);
    });
    if (paths.length < 2) { showToast('Choose both proficiencies before applying'); return; }
    paths.forEach(path => bgApplyPathToSkills(path, 1));
    toggle.classList.add('active');
    toggle.querySelector('.bg-apply-check').textContent = '✦';
    toggle.querySelector('.bg-apply-lbl').textContent = 'Applied';
    card.querySelector('.bg-invest-wrap').classList.remove('locked');
    showToast('Proficiencies applied');
  } else {
    // Deinvest all invested points first, then remove proficiency bonuses
    const countEl = card.querySelector('.bg-invest-count');
    const invested = parseInt(countEl.textContent)||0;
    const groups = [...card.querySelectorAll('.bg-pgroup')];
    const paths = [];
    groups.forEach(g => {
      const sel = g.querySelector('.bg-pgroup-option.selected'); if (!sel) return;
      let path; try { path = JSON.parse(sel.dataset.path); } catch(e) { path = bgParsePath(sel.querySelector('.bg-opt-txt')?.textContent||''); }
      if (path.length) paths.push(path);
    });
    if (invested > 0) paths.forEach(path => bgInvestDeepest(path, -invested));
    paths.forEach(path => bgApplyPathToSkills(path, -1));
    countEl.textContent = 0;
    toggle.classList.remove('active');
    toggle.querySelector('.bg-apply-check').textContent = '';
    toggle.querySelector('.bg-apply-lbl').textContent = 'Apply Proficiencies';
    card.querySelector('.bg-invest-wrap').classList.add('locked');
    showToast('Proficiencies removed , invested points returned');
  }
}

/* ── Investment: deepest skill only, only works when applied ── */
function bgInvestDeepest(path, delta) {
  if (!path || !path.length) return false;
  const cat = bgFindSkillCat(path[0]);
  if (!cat) return false;
  const tree = document.getElementById('tree-'+cat); if (!tree) return false;

  if (path.length === 1) {
    let primEl = null;
    [...tree.querySelectorAll(':scope > .skill-primary')].forEach(el => {
      const ni = el.querySelector('.skill-prim-head input[type=text]');
      if (ni && ni.value.toLowerCase() === path[0].toLowerCase()) primEl = el;
    });
    if (!primEl) { showToast('Skill not found: ' + path[0]); return false; }
    const si = primEl.querySelector('.skill-prim-score input');
    if (si) { const v = Math.max(0, Math.min(3, (parseInt(si.value)||0)+delta)); si.value = v; if(v===0){primEl.remove();updateEmpty(cat);} }
    return true;
  }

  if (path.length === 2) {
    let secEl = null;
    [...tree.querySelectorAll('.skill-secondary')].forEach(el => {
      const ni = el.querySelector('.skill-sec-head input[type=text]');
      const primNi = el.closest('.skill-primary')?.querySelector('.skill-prim-head input[type=text]');
      if (ni && ni.value.toLowerCase()===path[1].toLowerCase() && primNi && primNi.value.toLowerCase()===path[0].toLowerCase()) secEl = el;
    });
    if (!secEl) { showToast('Skill not found: ' + path[1]); return false; }
    const primScore = parseInt(secEl.closest('.skill-primary')?.querySelector('.skill-prim-score input')?.value)||1;
    const si = secEl.querySelector('.skill-sec-score input');
    if (si) { const v = Math.max(0, Math.min(primScore*2, (parseInt(si.value)||0)+delta)); si.value = v; if(v===0) secEl.remove(); }
    return true;
  }

  let terEl = null;
  [...tree.querySelectorAll('.skill-ter-row')].forEach(el => {
    const ni = el.querySelectorAll('input')[1];
    const secNi = el.closest('.skill-secondary')?.querySelector('.skill-sec-head input[type=text]');
    const primNi = el.closest('.skill-primary')?.querySelector('.skill-prim-head input[type=text]');
    if (ni && ni.value.toLowerCase()===path[2].toLowerCase() &&
        secNi && secNi.value.toLowerCase()===path[1].toLowerCase() &&
        primNi && primNi.value.toLowerCase()===path[0].toLowerCase()) terEl = el;
  });
  if (!terEl) { showToast('Skill not found: ' + path[2]); return false; }
  const secScore = parseInt(terEl.closest('.skill-secondary')?.querySelector('.skill-sec-score input')?.value)||1;
  const si = terEl.querySelectorAll('input')[0];
  if (si) { const v = Math.max(0, Math.min(secScore*3, (parseInt(si.value)||0)+delta)); si.value = v; if(v===0) terEl.remove(); }
  return true;
}

function bgAdjInvest(bgId, delta) {
  const card = document.getElementById(bgId); if (!card) return;
  const countEl = card.querySelector('.bg-invest-count');
  let cur = parseInt(countEl.textContent)||0;
  const next = Math.max(0, cur + delta);
  if (next === cur) return;
  const diff = next - cur;
  const groups = [...card.querySelectorAll('.bg-pgroup')];
  const paths = [];
  groups.forEach(g => {
    const sel = g.querySelector('.bg-pgroup-option.selected'); if (!sel) return;
    let path; try { path = JSON.parse(sel.dataset.path); } catch(e) { path = bgParsePath(sel.querySelector('.bg-opt-txt')?.textContent||''); }
    if (path.length) paths.push(path);
  });
  if (paths.length < 2) { showToast('Both proficiencies must be selected'); return; }
  let ok = true;
  paths.forEach(path => { if (!bgInvestDeepest(path, diff)) ok = false; });
  if (ok) {
    countEl.textContent = next;
    showToast((diff>0?'+1 invested in ':'−1 deinvested from ') + paths.map(p=>p[p.length-1]).join(' & '));
  }
}

/* ── Render a pgroup option with structured path data ── */
function bgMakeOptionEl(gid, path, idx, isSelected) {
  const text = bgPathToDisplay(path);
  const div = document.createElement('div');
  div.className = 'bg-pgroup-option' + (isSelected?' selected':'');
  div.dataset.idx = idx;
  div.dataset.path = JSON.stringify(path);
  div.innerHTML = `<div class="bg-opt-dot"></div><span class="bg-opt-txt">${esc(text)}</span><button class="bg-opt-rm" onclick="event.stopPropagation();bgRemoveOption('${gid}',this)">✕</button>`;
  div.onclick = () => bgChooseOption(gid, [...document.getElementById(gid+'-opts').querySelectorAll('.bg-pgroup-option')].indexOf(div));
  return div;
}

function bgAddGroup(bgId, slotNum, data) {
  data=data||{}; _bgGN++; const gid=bgId+'_g'+_bgGN;
  const container = document.getElementById(bgId+'-groups'); if(!container) return;
  const rawOptions = data.options||[];
  const paths = rawOptions.map(o => {
    if (Array.isArray(o)) return o;
    if (o && typeof o === 'object' && o.path) return o.path;
    return bgParsePath(o);
  });
  const chosenIdx = (data.chosenIdx!==undefined) ? parseInt(data.chosenIdx) : -1;
  const chosenPath = (chosenIdx>=0 && chosenIdx<paths.length) ? paths[chosenIdx] : null;
  const chosenText = chosenPath ? bgPathToDisplay(chosenPath) : '';

  const div=document.createElement('div'); div.className='bg-pgroup'; div.id=gid;
  div.innerHTML=`<div class="bg-pgroup-head" onclick="bgToggleGroup('${gid}')"><div class="bg-pgroup-chosen${chosenText?'':' none'}" id="${gid}-pill">${chosenText?esc(chosenText):', choose one ,'}</div><div class="bg-pgroup-arrow" id="${gid}-arrow">▼</div></div><div class="bg-pgroup-body" id="${gid}-body"><div id="${gid}-opts"></div><div class="bg-pgroup-add"><input id="${gid}-newinput" type="text" placeholder="Survival → Wilderness → Hunting" onkeydown="if(event.key==='Enter'){bgAddOptionText('${gid}');event.preventDefault();}"><button class="bg-pgroup-add-btn" onclick="bgAddOptionText('${gid}')">+ Add</button></div></div>`;
  container.appendChild(div);
  const optsEl = div.querySelector('#'+gid+'-opts');
  paths.forEach((path,i) => optsEl.appendChild(bgMakeOptionEl(gid, path, i, i===chosenIdx)));
}

function bgToggleGroup(gid) { const body=document.getElementById(gid+'-body'); const arrow=document.getElementById(gid+'-arrow'); if(!body) return; const open=body.classList.toggle('open'); if(arrow) arrow.classList.toggle('open',open); }

function bgAddOptionText(gid) {
  const inp=document.getElementById(gid+'-newinput'); if(!inp||!inp.value.trim()) return;
  const path = bgParsePath(inp.value.trim());
  if (!path.length) return;
  const optsEl = document.getElementById(gid+'-opts');
  const idx = optsEl.querySelectorAll('.bg-pgroup-option').length;
  optsEl.appendChild(bgMakeOptionEl(gid, path, idx, false));
  inp.value=''; inp.focus();
}

function bgRemoveOption(gid,rmBtn) {
  const optEl=rmBtn.closest('.bg-pgroup-option'); const opts=document.getElementById(gid+'-opts');
  const wasSel=optEl.classList.contains('selected'); optEl.remove();
  if(wasSel) { const pill=document.getElementById(gid+'-pill'); if(pill) { pill.textContent=', choose one ,'; pill.classList.add('none'); } }
  [...opts.querySelectorAll('.bg-pgroup-option')].forEach((el,i)=>{ el.dataset.idx=i; el.onclick=()=>bgChooseOption(gid,i); });
}

function bgChooseOption(gid,idx) {
  const opts=document.getElementById(gid+'-opts'); if(!opts) return;
  const all=[...opts.querySelectorAll('.bg-pgroup-option')];
  all.forEach((el,i)=>el.classList.toggle('selected',i===idx));
  const chosenPath = all[idx] ? JSON.parse(all[idx].dataset.path||'[]') : [];
  const chosenText = bgPathToDisplay(chosenPath);
  const pill=document.getElementById(gid+'-pill');
  if(pill) { pill.textContent=chosenText||', choose one ,'; pill.classList.toggle('none',!chosenText); }
  const body=document.getElementById(gid+'-body'); const arrow=document.getElementById(gid+'-arrow');
  if(body) body.classList.remove('open'); if(arrow) arrow.classList.remove('open');
}

function bgSerializeGroup(gEl) {
  const opts=[...gEl.querySelectorAll('.bg-pgroup-option')];
  const options = opts.map(el => {
    try { return JSON.parse(el.dataset.path||'[]'); } catch(e) { return bgParsePath(el.querySelector('.bg-opt-txt')?.textContent||''); }
  });
  const chosenIdx=opts.findIndex(el=>el.classList.contains('selected'));
  return {label:'',options,chosenIdx};
}

function addBg(opts) {
  opts=opts||{}; _bgN++; const id='bg'+_bgN; const el=document.createElement('div'); el.className='bg-card'; el.id=id;
  const invest = opts.invest||0;
  const isApplied = opts.applied||false;
  el.innerHTML=`<div class="bg-head"><input type="text" class="bg-name" placeholder="Background name…" value="${esc(opts.name||'')}"><input type="text" class="bg-inst" placeholder="Instance" value="${esc(opts.inst||'')}"><button class="rm-light" onclick="document.getElementById('${id}').remove()">✕ Remove</button></div><div class="bg-body"><div id="${id}-groups"></div><div class="bg-action-bar"><div class="bg-apply-toggle${isApplied?' active':''}" onclick="bgToggleApply('${id}')"><div class="bg-apply-check">${isApplied?'✦':''}</div><span class="bg-apply-lbl">${isApplied?'Proficiencies Applied':'Apply Proficiencies'}</span></div><div class="bg-invest-wrap${isApplied?'':' locked'}"><span class="bg-invest-lbl">Invest</span><div class="bg-invest-ctrl"><button class="bg-invest-btn" onclick="bgAdjInvest('${id}',-1)">−</button><span class="bg-invest-count">${invest}</span><button class="bg-invest-btn" onclick="bgAdjInvest('${id}',1)">+</button></div><span class="bg-invest-lbl">pts</span></div></div><div class="bg-notes"><span class="lbl">Notes &amp; Bonuses</span><textarea placeholder="Story context, additional bonuses, prerequisites…">${esc(opts.notes||'')}</textarea></div></div>`;
  document.getElementById('bg-container').appendChild(el);
  const groups=opts.profGroups||[];
  bgAddGroup(id, 1, groups[0]||{options:[],chosenIdx:-1});
  bgAddGroup(id, 2, groups[1]||{options:[],chosenIdx:-1});
}
