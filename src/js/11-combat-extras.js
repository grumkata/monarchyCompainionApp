/* ══ FOG OF WAR ══ */
function toggleFog(enabled) {
  const statusEl = document.getElementById('gm-fog-status');
  if (statusEl) statusEl.style.display = enabled ? 'block' : 'none';
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  showToast(enabled ? '🌫 Battlefield hidden from players' : '✓ Battlefield visible to players');
}

/* ══ GLOBAL MANA ══ */
let _globalMana = 0;
let _globalManaVisible = true;

function adjGlobalMana(delta) {
  _globalMana = Math.max(0, _globalMana + delta);
  const el = document.getElementById('global-mana-val');
  if (el) el.textContent = _globalMana;
  // Also update the player-facing display if present
  const playerEl = document.getElementById('global-mana-player-val');
  if (playerEl) playerEl.textContent = _globalMana;
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 200); // faster for mana
}

// Called on mana visibility checkbox change , DON'T reset mana value
document.addEventListener('DOMContentLoaded', function() {
  const cb = document.getElementById('gm-mana-visible');
  if (cb) cb.addEventListener('change', function() {
    _globalManaVisible = this.checked;
    clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  });
  
  // Formation checkbox listener
  const formCheckbox = document.getElementById('nc-isform');
  if (formCheckbox) {
    formCheckbox.addEventListener('change', function() {
      document.getElementById('hp-individual').style.display = this.checked ? 'none' : 'flex';
      document.getElementById('hp-formation').style.display = this.checked ? 'flex' : 'none';
    });
  }
});

// Fallback for checkbox if DOM ready event fires before listener attached
setTimeout(function() {
  const formCheckbox = document.getElementById('nc-isform');
  if (formCheckbox && !formCheckbox._listenerAttached) {
    formCheckbox.addEventListener('change', function() {
      document.getElementById('hp-individual').style.display = this.checked ? 'none' : 'flex';
      document.getElementById('hp-formation').style.display = this.checked ? 'flex' : 'none';
    });
    formCheckbox._listenerAttached = true;
  }
}, 100);

/* ══ CONNECTED PLAYERS & CHIP LINKING ══ */
let _playerName = '';
let _connectedPlayers = {};

function getMyPlayerName() {
  if (_playerName) return _playerName;
  const sheetName = val('id-name');
  if (sheetName && sheetName.trim()) { _playerName = sheetName.trim(); return _playerName; }
  const name = prompt('Enter your player name (displayed on the battlefield):');
  if (name && name.trim()) {
    _playerName = name.trim();
    const nameEl = document.getElementById('id-name');
    if (nameEl && !nameEl.value.trim()) nameEl.value = _playerName;
  }
  return _playerName || 'Player';
}
