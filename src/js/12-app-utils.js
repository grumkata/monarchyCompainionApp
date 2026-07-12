/* ══ DARK MODE ══ */
(function(){
  if ((_ls.get('monarchy_darkmode')) === '1') document.body.classList.add('dark-mode');
})();
function toggleDarkMode() {
  const on = document.body.classList.toggle('dark-mode');
  _ls.set('monarchy_darkmode', on ? '1' : '0');
  const btn = document.getElementById('darkmode-btn');
  if (btn) btn.textContent = on ? '☀ Light' : '🌙 Dark';
}
(function(){
  const btn = document.getElementById('darkmode-btn');
  if (btn && document.body.classList.contains('dark-mode')) btn.textContent = '☀ Light';
})();

/* ══ UNDO SYSTEM ══ */
const _undoStack = [];
const _UNDO_MAX = 30;
let _undoBlocked = false;

function pushUndo() {
  if (_undoBlocked) return;
  try {
    const snap = JSON.stringify(serializeSheet());
    if (_undoStack.length && _undoStack[_undoStack.length-1] === snap) return;
    _undoStack.push(snap);
    if (_undoStack.length > _UNDO_MAX) _undoStack.shift();
  } catch(e) {}
}

function undoLast() {
  if (!_undoStack.length) { showToast('Nothing to undo'); return; }
  _undoBlocked = true;
  try {
    const snapshot = JSON.parse(_undoStack.pop());
    restoreSheet(snapshot);
    showToast('Undone' + (_undoStack.length ? ' · ' + _undoStack.length + ' left' : ''));
  } catch(e) { showToast('Undo failed'); }
  finally { _undoBlocked = false; }
}

document.addEventListener('keydown', function(e) {
  if (!((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey)) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  e.preventDefault(); undoLast();
});

// Capture phase: push snapshot BEFORE remove buttons fire
document.addEventListener('click', function(e) {
  if (e.target.closest('.rm, .rm-light, .abil-rm-slot, .chip-rm-btn, .chip-exp-rm-btn')) pushUndo();
}, true);

// Wrap add-functions so adding is also undoable
(function(){
  function wrap(fn, guard) { return function() { if (guard()) pushUndo(); return fn.apply(this, arguments); }; }
  const noOpts = () => !arguments; // always push for interactive adds
  addKnack = wrap(addKnack, () => true);
  addPrimary = (function(orig){ return function(cat,opts){ if(!opts) pushUndo(); return orig.call(this,cat,opts); }; })(addPrimary);
  addSecondary = (function(orig){ return function(id,opts){ if(!opts) pushUndo(); return orig.call(this,id,opts); }; })(addSecondary);
  addTertiary = (function(orig){ return function(id,opts){ if(!opts) pushUndo(); return orig.call(this,id,opts); }; })(addTertiary);
  addBg = (function(orig){ return function(opts){ if(!opts) pushUndo(); return orig.call(this,opts); }; })(addBg);
  addWeapon = (function(orig){ return function(opts){ if(!opts) pushUndo(); return orig.call(this,opts); }; })(addWeapon);
  addArmor = (function(orig){ return function(opts){ if(!opts) pushUndo(); return orig.call(this,opts); }; })(addArmor);
  addAbilSlot = (function(orig){ return function(opts){ if(!opts) pushUndo(); return orig.call(this,opts); }; })(addAbilSlot);
  placeCombatant = (function(orig){ return function(opts){ if(!opts) pushUndo(); return orig.call(this,opts); }; })(placeCombatant);
})();

// Push on blur/change for inputs across the whole sheet
document.addEventListener('change', function(e) {
  if (_undoBlocked) return;
  const el = e.target;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') pushUndo();
}, true);

/* ══ SKILL COLLAPSE ══ */
function toggleSkillCollapse(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('collapsed');
  const btn = el.querySelector('.skill-collapse-btn');
  if (btn) btn.textContent = el.classList.contains('collapsed') ? '▸' : '▾';
}

/* ══ SKILL TOTAL TOOLTIP (JS-positioned, one at a time, no overlap) ══ */
const _skillTip = document.getElementById('skill-total-tip');
let _skillTipTarget = null;

function _getSkillTotalText(el) {
  if (el.classList.contains('skill-secondary')) {
    const primEl = el.closest('.skill-primary');
    const p = primEl ? (parseInt(primEl.querySelector('.skill-prim-score input')?.value)||0) : 0;
    const s = parseInt(el.querySelector('.skill-sec-score input')?.value)||0;
    const name = el.querySelector('input[type=text]')?.value || 'Secondary';
    return name + ':  ' + p + ' + ' + s + ' = ' + (p+s);
  } else if (el.classList.contains('skill-ter-row')) {
    const secEl = el.closest('.skill-secondary');
    const primEl = el.closest('.skill-primary');
    const p = primEl ? (parseInt(primEl.querySelector('.skill-prim-score input')?.value)||0) : 0;
    const s = secEl ? (parseInt(secEl.querySelector('.skill-sec-score input')?.value)||0) : 0;
    const t = parseInt(el.querySelector('.skill-ter-score input')?.value)||0;
    const name = el.querySelector('input[type=text]')?.value || 'Tertiary';
    return name + ':  ' + p + '+' + s + '+' + t + ' = ' + (p+s+t);
  }
  return null;
}

function _positionTip(e) {
  if (!_skillTip || _skillTip.style.display === 'none') return;
  const tw = _skillTip.offsetWidth, th = _skillTip.offsetHeight;
  let x = e.clientX - tw/2, y = e.clientY - th - 12;
  if (x < 8) x = 8;
  if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
  if (y < 8) y = e.clientY + 18;
  _skillTip.style.left = x + 'px';
  _skillTip.style.top = y + 'px';
}

document.addEventListener('mouseover', function(e) {
  // tertiary takes priority since it's nested inside secondary
  const ter = e.target.closest('.skill-ter-row');
  const sec = !ter && e.target.closest('.skill-secondary');
  const target = ter || sec;
  if (!target) return;
  if (target === _skillTipTarget) return;
  const text = _getSkillTotalText(target);
  if (!text) return;
  _skillTipTarget = target;
  _skillTip.textContent = text;
  _skillTip.style.display = 'block';
});
document.addEventListener('mousemove', _positionTip);
document.addEventListener('mouseout', function(e) {
  if (!_skillTipTarget) return;
  if (!e.relatedTarget || !e.relatedTarget.closest('.skill-secondary, .skill-ter-row')) {
    _skillTip.style.display = 'none';
    _skillTipTarget = null;
  }
});
document.addEventListener('input', function(e) {
  if (!_skillTipTarget) return;
  if (e.target.closest('.skill-prim-score, .skill-sec-score, .skill-ter-score')) {
    const text = _getSkillTotalText(_skillTipTarget);
    if (text) _skillTip.textContent = text;
  }
});
