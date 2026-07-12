/* ══ TURN COUNTER ══ */
let _turnCount = 1;
function adjTurn(delta) {
  _turnCount = Math.max(1, _turnCount + delta);
  const el = document.getElementById('turn-counter');
  if (el) el.textContent = _turnCount;
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 600); }
}
function resetTurn() {
  _turnCount = 1;
  const el = document.getElementById('turn-counter');
  if (el) el.textContent = '1';
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 600); }
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
}
// Clear entire battlefield , GM QoL
function clearBattlefield() {
  if (!confirm('Remove ALL combatants from the battlefield?')) return;
  document.querySelectorAll('.chip-expand-overlay').forEach(p => p.remove());
  document.querySelectorAll('.bf-lane .comb-chip').forEach(c => c.remove());
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 400); }
  showToast('Battlefield cleared');
}
const _origSerializeBattlefield = serializeBattlefield;
serializeBattlefield = function() {
  const state = _origSerializeBattlefield(); state.turn = _turnCount; return state;
};
const _origRestoreBattlefield = restoreBattlefield;
restoreBattlefield = function(state) {
  _origRestoreBattlefield(state);
  if (state && state.turn !== undefined) {
    _turnCount = state.turn;
    const el = document.getElementById('turn-counter');
    if (el) el.textContent = _turnCount;
  }
};

/* ══ INIT ══ */
renderServerSelector();
bindCurSync('hp-cur', 'c-hp-cur');
bindCurSync('st-cur', 'c-st-cur');
bindCurSync('str-cur', 'c-str-cur');
recalcDerived();
