/* ══════════════════════════════════════════════════════════════
   LIVE SYNC  ,  clean two-channel architecture
   ┌─────────────────────────────────────────────────────────┐
   │  GAS sheet stores two independent JSON blobs per server │
   │  bf:{srv}  , battlefield  (GM writes, everyone reads)   │
   │  pl:{srv}  , players dict (players write, GM reads)     │
   │  GET ?srv=X returns { bf:{…}, pl:{…} } in one call      │
   │  POST ?srv=X&ch=bf  writes battlefield cell only        │
   │  POST ?srv=X&ch=pl&name=Y  merges one player into pl    │
   └─────────────────────────────────────────────────────────┘
══════════════════════════════════════════════════════════════ */

let _scriptUrl   = null;   // base URL (no srv param yet)
let _sessionRole = null;   // 'gm' | 'player' | null
let _serverId    = null;   // active server id

// Timers
let _bfPollTimer     = null;  // player: poll battlefield
let _plPollTimer     = null;  // gm: poll player vitals
let _plPushTimer     = null;  // player: push own vitals
let _statusTickTimer = null;
let _pushTimer       = null;  // debounce for GM bf push

// Timestamps
let _lastPushTs  = 0;
let _lastPollTs  = 0;
let _lastBfTs    = 0;  // ts of last applied battlefield state

/* ── URL builder ── */
function _url(extra) {
  return _scriptUrl + '?srv=' + encodeURIComponent(_serverId) + (extra || '');
}

/* ── GET state from GAS , fetch() with JSONP fallback ──────
 *
 *  GAS 302-redirects script.google.com to script.googleusercontent.com.
 *  fetch() works when CORS headers survive that redirect (they usually do
 *  for GET, but some browsers/networks block it). JSONP via <script> tags
 *  is always allowed (scripts are never CORS-restricted) so we use it as
 *  a reliable fallback.
 *
 *  Strategy:
 *   1. Try fetch() , fast, clean, works in modern browsers on most networks
 *   2. If fetch fails for any reason , fall back to JSONP automatically
 *   3. JSONP uses a 10s timeout to avoid hanging polls
 */
function fetchState() {
  return fetch(_url('&_t=' + Date.now()), {
    method:      'GET',
    cache:       'no-store',
    credentials: 'omit'
  })
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  })
  .then(txt => {
    const trimmed = txt.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
    const m = trimmed.match(/^[^(]+\((.+)\)\s*;?\s*$/s);
    if (m) return JSON.parse(m[1]);
    throw new Error('unparseable');
  })
  .catch(() => _fetchStateJsonp());
}

/* JSONP fallback , never blocked by CORS since script tags bypass it */
function _fetchStateJsonp() {
  return new Promise((resolve, reject) => {
    const cb  = '_mc_' + Date.now() + '_' + Math.floor(Math.random() * 99999);
    const el  = document.createElement('script');
    const tid = setTimeout(() => { cleanup(); reject(new Error('jsonp timeout')); }, 10000);
    window[cb] = d => { cleanup(); resolve(d); };
    function cleanup() {
      clearTimeout(tid);
      delete window[cb];
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    el.onerror = () => { cleanup(); reject(new Error('jsonp error')); };
    el.src = _url('&callback=' + cb + '&_t=' + Date.now());
    document.head.appendChild(el);
  });
}

/* ── fire-and-forget POST ──
 *
 *  mode:'no-cors' is required for POST to GAS. Without it the browser
 *  blocks the response due to CORS (GAS redirect chain). Since we only
 *  need the write to happen (not the response), no-cors is correct here.
 *  Content-Type: text/plain keeps it a simple request (no preflight).
 */
function _post(extraParams, body) {
  fetch(_url(extraParams), {
    method:      'POST',
    body:        JSON.stringify(body),
    headers:     { 'Content-Type': 'text/plain' },
    mode:        'no-cors',
    credentials: 'omit'
  }).catch(() => {});
}

/* ────────────────────────────────────────────────
   GM  , push battlefield
──────────────────────────────────────────────── */
async function pushBattlefield() {
  if (!_scriptUrl || _sessionRole !== 'gm') return;
  setPulse('syncing');
  try {
    _post('&ch=bf', serializeBattlefield());
    _lastPushTs = Date.now();
    setPulse('live');
  } catch(e) {
    setPulse('err');
  }
}

/* ────────────────────────────────────────────────
   GM , poll for player vitals (every 3 s)
──────────────────────────────────────────────── */
async function _gmPollPlayers() {
  if (!_scriptUrl || _sessionRole !== 'gm') return;
  if (_pollsPaused) return;
  try {
    const env = await fetchState();
    if (env && env.pl) _applyPlayers(env.pl);
  } catch(e) {}
}

/* ────────────────────────────────────────────────
   Player , poll battlefield (every 1.5 s)
──────────────────────────────────────────────── */
async function _playerPollBf() {
  if (!_scriptUrl || _sessionRole !== 'player') return;
  if (_pollsPaused) return;
  _lastPollTs = Date.now();
  try {
    const env = await fetchState();
    if (env && env.bf) {
      const bfTs = env.bf.ts || 0;
      if (bfTs > _lastBfTs) {
        _lastBfTs = bfTs;
        if (env.bf.v) restoreBattlefield(env.bf);
        // Apply any GM damage commands directed at this player
        _applyGmCommands(env.bf.cmds);
      }
    }
    setPulse('live');
    updateStatusText();
  } catch(e) {
    setPulse('err');
    updateStatusText('⚠ ' + (e && e.message ? e.message : String(e)));
    console.error('[monarchy sync]', e);
  }
}

/** Apply GM→player commands embedded in the battlefield blob.
 *  cmds = [ { target: playerName, type: 'setHp'|'adjHp', hp?, hpMax?, st?, str?, delta? }, … ]
 *  Commands are consumed once applied (tracked by cmdTs). */
let _lastCmdTs = 0;
function _applyGmCommands(cmds) {
  if (!Array.isArray(cmds) || !cmds.length) return;
  const myName = getMyPlayerName();
  cmds.forEach(cmd => {
    if (!cmd || cmd.ts <= _lastCmdTs) return;
    if (cmd.target && cmd.target !== myName) return;
    _lastCmdTs = Math.max(_lastCmdTs, cmd.ts || 0);

    if (cmd.type === 'setHp') {
      const hpEl  = document.getElementById('c-hp-cur');
      const hpEl2 = document.getElementById('hp-cur');
      if (hpEl  && cmd.hp !== undefined) hpEl.value  = cmd.hp;
      if (hpEl2 && cmd.hp !== undefined) hpEl2.value = cmd.hp;
      const stEl  = document.getElementById('c-st-cur');
      const stEl2 = document.getElementById('st-cur');
      if (stEl  && cmd.st !== undefined) stEl.value  = cmd.st;
      if (stEl2 && cmd.st !== undefined) stEl2.value = cmd.st;
      const vb = document.getElementById('player-vitals-section');
      if (vb) { vb.style.outline = '2px solid var(--red)'; setTimeout(() => { vb.style.outline = ''; }, 800); }
      setTimeout(_playerPushVitals, 500);
    }

    if (cmd.type === 'addCond') {
      if (cmd.cond) {
        // Only add if not already present
        const existing = [...document.querySelectorAll('#cond-list .cond-name')].find(el => el.value.trim().toLowerCase() === cmd.cond.trim().toLowerCase());
        if (!existing) addCondition(cmd.cond, { count: 1 });
      }
    }

    if (cmd.type === 'syncAllConds') {
      // GM sent full conditions snapshot , rebuild player's condition list to match
      if (cmd.conditions && typeof cmd.conditions === 'object') {
        const condList = document.getElementById('cond-list');
        if (!condList) return;
        // Remove any conditions NOT in the GM's snapshot
        [...condList.querySelectorAll('.cond-item')].forEach(item => {
          const nameEl = item.querySelector('.cond-name');
          if (!nameEl) return;
          const n = nameEl.value.trim().toLowerCase();
          const inSnapshot = Object.keys(cmd.conditions).some(k => k.trim().toLowerCase() === n);
          if (!inSnapshot) item.remove();
        });
        // Add any conditions present in snapshot but missing from player sheet
        Object.keys(cmd.conditions).forEach(condName => {
          const already = [...condList.querySelectorAll('.cond-name')].find(el => el.value.trim().toLowerCase() === condName.trim().toLowerCase());
          if (!already) addCondition(condName, { count: 1 });
        });
      }
    }
  });
}

/* ────────────────────────────────────────────────
   Player , push own vitals (every 5 s + on join)
──────────────────────────────────────────────── */
let _plPushDebounce = null;
function _playerPushVitals() {
  if (!_scriptUrl || _sessionRole !== 'player') return;
  const vitals = serializePlayerVitals();
  _post('&ch=pl&name=' + encodeURIComponent(vitals.name), vitals);
}
/** Debounced push triggered by HP/condition input changes while in player mode. */
function _scheduleVitalsPush() {
  if (_sessionRole !== 'player') return;
  clearTimeout(_plPushDebounce);
  _plPushDebounce = setTimeout(_playerPushVitals, 800);
}

/* ────────────────────────────────────────────────
   GM change listener , debounced bf push
──────────────────────────────────────────────── */
function onBfChange(e) {
  if (!e.target.closest('#bf-lanes, .chip-expand-overlay, .add-comb-form, #gm-tools-panel')) return;
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushBattlefield, 250);
}

/** Player input change listener , push vitals when HP, stamina, stress, or conditions change. */
function onVitalsChange(e) {
  if (!e.target.closest('#player-vitals-section, #c-hp-cur, #c-st-cur, #c-str-cur, #cond-list')) return;
  _scheduleVitalsPush();
}

/* ────────────────────────────────────────────────
   START / LEAVE SESSION
──────────────────────────────────────────────── */
async function startSession(role) {
  if (role === 'gm') {
    if (!confirm('Host as GM on server "' + (getServers().find(s=>s.id===getActiveServer())||{name:'Main Table'}).name + '"?\n\nThis will push your current battlefield to that server.')) return;
  }
  if (role === 'player') {
    getMyPlayerName();
    if (!_playerName) return; // cancelled prompt
  }

  const serverName = (getServers().find(s=>s.id===getActiveServer())||{name:getActiveServer()}).name;
  _scriptUrl   = BASE_SCRIPT_URL;
  _serverId    = getActiveServer();
  _sessionRole = role;

  const srvLbl = document.getElementById('session-server-name');
  if (srvLbl) srvLbl.textContent = '· ' + serverName;

  setSessionUI(role);

  if (role === 'gm') {
    await pushBattlefield();
    document.addEventListener('click', onBfChange);
    document.addEventListener('input', onBfChange);
    _plPollTimer     = setInterval(_gmPollPlayers, 3000);
    _statusTickTimer = setInterval(updateStatusText, 1000);
    showToast('Hosting on: ' + serverName);
  } else {
    await _playerPollBf();                           // immediate fetch
    _playerPushVitals();                             // immediate vitals push
    document.addEventListener('input',  onVitalsChange);
    document.addEventListener('change', onVitalsChange);
    _bfPollTimer     = setInterval(_playerPollBf,    1500);
    _plPushTimer     = setInterval(_playerPushVitals, 5000);
    _statusTickTimer = setInterval(updateStatusText,  1000);
    showToast('Joined: ' + serverName);
  }
}

function leaveSession() {
  document.removeEventListener('click', onBfChange);
  document.removeEventListener('input', onBfChange);
  document.removeEventListener('input',  onVitalsChange);
  document.removeEventListener('change', onVitalsChange);
  clearTimeout(_pushTimer);
  clearTimeout(_plPushDebounce);
  clearInterval(_bfPollTimer);
  clearInterval(_plPollTimer);
  clearInterval(_plPushTimer);
  clearInterval(_statusTickTimer);

  _scriptUrl = null; _sessionRole = null; _serverId = null;
  _lastPushTs = 0; _lastPollTs = 0; _lastBfTs = 0;
  _connectedPlayers = {}; _playerLastSeen = {};

  // Reset UI
  const ids = {
    'gm-tools-panel':        'none',
    'place-combatant-panel': 'block',
    'global-mana-wrap':      'none',
    'player-vitals-section': 'block',
    'fog-overlay':           'none'
  };
  Object.entries(ids).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = val;
  });
  const srvLbl = document.getElementById('session-server-name');
  if (srvLbl) srvLbl.textContent = '';
  const lbl  = document.getElementById('session-role-label');
  const idle = document.getElementById('session-mid-idle');
  const act  = document.getElementById('session-mid-active');
  if (lbl)  { lbl.className = 'session-role-cell none'; lbl.textContent = '⚔ Live Sync'; }
  if (idle) idle.style.display = 'flex';
  if (act)  act.style.display  = 'none';
  // Restore all tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.style.display = '');
  setPulse(null);
  showToast('Sync stopped');
}

/* ── Pause polling while tab is hidden; resume + push immediately when visible ── */
let _pollsPaused = false;
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    _pollsPaused = true;
  } else {
    _pollsPaused = false;
    if (!_scriptUrl || !_sessionRole) return;
    // Immediately re-push so player re-appears in GM list
    if (_sessionRole === 'player') {
      _playerPushVitals();
      _playerPollBf();
    } else if (_sessionRole === 'gm') {
      _gmPollPlayers();
    }
  }
});
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
    v: 2, ts: Date.now(), combatants,
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
}

/* ────────────────────────────────────────────────
   PLAYER VITALS , serialize / apply
──────────────────────────────────────────────── */
function serializePlayerVitals() {
  // ── Conditions (tokens: name → count) ──
  const conds = {};
  document.querySelectorAll('#cond-list .cond-item').forEach(item => {
    const nameEl  = item.querySelector('.cond-name');
    const countEl = item.querySelector('.cond-count');
    const name = nameEl?.value?.trim();
    if (name) conds[name] = parseInt(countEl?.value) || 1;
  });

  // ── Attributes ──
  const attrs = {};
  ['for','pro','dex','nim','wil','int','pre','cha'].forEach(k => {
    const v = parseInt(val('attr-' + k));
    if (v) attrs[k] = v;
  });

  // ── Skills , full tree: primary → secondary → tertiary ──
  const skills = [];
  document.querySelectorAll('.skill-primary').forEach(primEl => {
    const pName  = primEl.querySelector('.skill-prim-head input[type=text]')?.value?.trim() || '';
    const pScore = primEl.querySelector('.skill-prim-head input[type=number]')?.value || '0';
    if (!pName) return;
    const secondaries = [];
    primEl.querySelectorAll(':scope > .skill-children > .skill-secondary').forEach(secEl => {
      const sName  = secEl.querySelector('.skill-sec-head input[type=text]')?.value?.trim() || '';
      const sScore = secEl.querySelector('.skill-sec-head input[type=number]')?.value || '0';
      if (!sName) return;
      const tertiaries = [];
      secEl.querySelectorAll(':scope > .skill-ter-list > .skill-ter-row').forEach(terEl => {
        const tName  = terEl.querySelector('input[type=text]')?.value?.trim() || '';
        const tScore = terEl.querySelector('input[type=number]')?.value || '0';
        if (tName) tertiaries.push({ name: tName, score: parseInt(tScore) || 0 });
      });
      secondaries.push({ name: sName, score: parseInt(sScore) || 0, tertiaries });
    });
    skills.push({ name: pName, score: parseInt(pScore) || 0, secondaries });
  });

  // ── Weapons ──
  const weapons = [];
  document.querySelectorAll('#weapon-list .weapon-card').forEach(c => {
    const inputs = c.querySelectorAll('input[type=text]');
    const name = inputs[0]?.value?.trim() || '';
    if (name) weapons.push({
      name,
      dmg:     inputs[1]?.value || '',
      type:    inputs[2]?.value || '',
      quality: inputs[3]?.value || ''
    });
  });

  // ── Abilities (slot names + entries) ──
  const abilities = [];
  document.querySelectorAll('#abil-container .abil-slot').forEach(slot => {
    const headInputs = slot.querySelector('.abil-head')?.querySelectorAll('input[type=text]');
    const slotName   = headInputs?.[0]?.value?.trim() || '';
    if (!slotName) return;
    const entries = [...slot.querySelectorAll('.abil-entry')].map(e => ({
      name:   e.querySelectorAll('input')?.[0]?.value?.trim() || '',
      cost:   e.querySelectorAll('input')?.[1]?.value || '',
      effect: e.querySelector('textarea')?.value?.trim() || ''
    })).filter(e => e.name);
    abilities.push({ slotName, entries });
  });

  // ── Knacks ──
  const knacks = [...document.querySelectorAll('#knacks-list .knack-row')].map(row => {
    const ins = row.querySelectorAll('input');
    return { name: ins[0]?.value || '', level: ins[1]?.value || '' };
  }).filter(k => k.name);

  // ── Exhaustion & Ward ──
  const exhaustion = [...document.querySelectorAll('#exh-pips .exh-pip')].filter(p => p.classList.contains('lit')).length;

  return {
    name:       getMyPlayerName(),
    hp:         parseInt(val('c-hp-cur'))  || 0,
    hpMax:      parseInt(val('hp-max'))    || 0,
    st:         parseInt(val('c-st-cur'))  || 0,
    stMax:      parseInt(val('c-st-max'))  || 0,
    str:        parseInt(val('c-str-cur')) || 0,
    strMax:     parseInt(val('c-str-max')) || 0,
    size:       val('id-size') || '',
    species:    val('id-species') || '',
    culture:    val('id-culture') || '',
    rank:       val('id-rank')    || '',
    background: val('id-player') || '',
    passiveTraits: val('passive-traits') || '',
    conditions: conds,
    attrs,
    skills:     skills.slice(0, 20),
    weapons:    weapons.slice(0, 8),
    abilities:  abilities.slice(0, 6),
    knacks:     knacks.slice(0, 10),
    exhaustion: exhaustion || undefined,
    ward:       val('ward-val') || undefined,
    wardType:   val('ward-type') || undefined,
    ts:         Date.now()
  };
}

/* ── HP edit lock: prevent server overwrites while GM is typing ── */
const _hpEditingSet = new Set(); // Set of cids currently being edited by GM
const _hpGmSetTs = {};           // cid → timestamp of last GM HP override

function _lockHpEdit(cid) { _hpEditingSet.add(cid); }
function _unlockHpEdit(cid, hpInput) {
  _hpEditingSet.delete(cid);
  // Mark this chip as GM-overridden for 12s so player polls don't revert it
  _hpGmSetTs[cid] = Date.now();
  if (_sessionRole === 'gm') {
    updateHpLbl(cid, hpInput ? hpInput.value : '');
    clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  }
}

/* ── apply pl dict received from server ── */
/* ── Player seen-timestamps: keep players in list for 45s after last push ── */
let _playerLastSeen = {}; // name → Date.now() timestamp

function _applyPlayers(pl) {
  if (!pl || typeof pl !== 'object') return;

  // Track when we last saw each player
  const now = Date.now();
  Object.keys(pl).forEach(name => { _playerLastSeen[name] = now; });

  // ✓ FIX: Remove players that are NO LONGER in the server's list
  // (Server removes them after 30s of inactivity)
  Object.keys(_connectedPlayers).forEach(name => {
    if (!(name in pl)) {
      // Player was in our list but not in server's list - they disconnected
      delete _connectedPlayers[name];
      delete _playerLastSeen[name];
    }
  });

  // Merge new/updated player data from server
  Object.assign(_connectedPlayers, pl);
  
  // ✓ Re-render the player list UI to reflect any disconnects
  renderGmPlayersList();

  // Update linked chip HP & conditions from player data
  document.querySelectorAll('.comb-chip').forEach(chip => {
    const linkedName = chip.dataset.linkedPlayer;
    if (!linkedName) return;
    const pdata = _connectedPlayers[linkedName];
    if (!pdata) return;
    const cid   = chip.id;
    // ── Don't overwrite HP if GM is currently editing OR recently set this chip's HP ──
    const gmRecentlySet = _hpGmSetTs[cid] && (Date.now() - _hpGmSetTs[cid] < 12000);
    if (!_hpEditingSet.has(cid) && !gmRecentlySet) {
      const panel = document.getElementById(cid + '-exp');
      if (panel) {
        // ✓ FIX: Select HP inputs by class, not by type
        const hpCurInput = panel.querySelector('.chip-hp-cur');
        const hpMaxInput = panel.querySelector('.chip-hp-max');
        if (hpCurInput && hpMaxInput) {
          const hpCurStr = String(pdata.hp ?? '');
          const hpMaxStr = String(pdata.hpMax ?? '');
          hpCurInput.value = hpCurStr;
          hpMaxInput.value = hpMaxStr;
          const hpStr = (hpCurStr && hpMaxStr) ? `${hpCurStr}/${hpMaxStr}` : hpCurStr;
          updateHpLbl(cid, hpStr);
          updateHpBar(cid, hpStr);
        }
      }
    }
  });

  updateGmPlayerLinkDropdowns();
  renderGmPlayersList();
  updateStatusText();
}

/* ── legacy shim so old call sites still work ── */
function applyPlayerLinksFromState(state) {
  if (state && state.pl)      _applyPlayers(state.pl);
  else if (state && state.players) _applyPlayers(state.players);
}

/* ────────────────────────────────────────────────
   CHIP ↔ PLAYER LINK  (was missing , caused JS crash on every sync)
──────────────────────────────────────────────── */

/** Set the player link on a combatant chip and update its label. */
function setChipPlayerLink(cid, playerName) {
  const chip = document.getElementById(cid);
  if (!chip) return;
  chip.dataset.linkedPlayer = playerName || '';

  // Update the dropdown in the expanded panel if it is open
  const sel = document.getElementById(cid + '-link-sel');
  if (sel) sel.value = playerName || '';

  // If we already have data for this player, apply HP and SIZE
  if (playerName && _connectedPlayers[playerName]) {
    const pdata = _connectedPlayers[playerName];
    const panel = document.getElementById(cid + '-exp');
    if (panel) {
      // ✓ FIX: Select HP inputs by class, not by type (type=text might select Notes field!)
      const hpCurInput = panel.querySelector('.chip-hp-cur');
      const hpMaxInput = panel.querySelector('.chip-hp-max');
      if (hpCurInput && hpMaxInput) {
        const hpCurStr = String(pdata.hp || '');
        const hpMaxStr = String(pdata.hpMax || '');
        hpCurInput.value = hpCurStr;
        hpMaxInput.value = hpMaxStr;
        const hpStr = (hpCurStr && hpMaxStr) ? `${hpCurStr}/${hpMaxStr}` : hpCurStr;
        updateHpLbl(cid, hpStr);
        // ✓ FIX: Update HP bar display immediately
        updateHpBar(cid, hpStr);
      }
    }
    
    // ✓ FIX: Apply size from player character sheet
    if (pdata.size) {
      const charSize = pdata.size.toLowerCase();
      if (charSize.includes('large')) {
        if (!chip.classList.contains('chip-large')) {
          chip.classList.add('chip-large');
          chip.dataset.size = 'large';
        }
      } else {
        if (chip.classList.contains('chip-large')) {
          chip.classList.remove('chip-large');
          chip.dataset.size = 'normal';
        }
      }
    }
    
    // ✓ FIX: Merge BOTH chip conditions AND player conditions into chip
    const mergedConditions = {};
    
    // Start with player's conditions
    if (pdata.conditions && typeof pdata.conditions === 'object') {
      Object.assign(mergedConditions, pdata.conditions);
    }
    
    // Add chip conditions (GM's take precedence if both exist)
    if (chip._conditions && typeof chip._conditions === 'object') {
      Object.entries(chip._conditions).forEach(([k, v]) => {
        if (!(k in mergedConditions) || v > (mergedConditions[k] || 0)) {
          mergedConditions[k] = v;
        }
      });
    }
    
    // Apply merged conditions to chip
    chip._conditions = mergedConditions;
    updateChipConditionDisplay(cid);
    
    // ✓ IMPORTANT: Also add these conditions to the PLAYER'S character sheet
    if (_sessionRole === 'player' && pdata.conditions) {
      const condList = document.getElementById('cond-list');
      if (condList) {
        Object.entries(pdata.conditions).forEach(([condName, count]) => {
          if (count <= 0) return;
          const already = [...condList.querySelectorAll('.cond-name, input[type=text]')].find(el => el.value.trim().toLowerCase() === condName.trim().toLowerCase());
          if (!already) {
            addCondition(condName, { count });
          }
        });
      }
    }
  }

  // Push new link state to server (GM only)
  if (_sessionRole === 'gm') { clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 400); }
}

/** Called by GM when manually editing chip HP , push setHp command to linked player. */
function pushHpToLinkedPlayer(cid, hpStr) {
  if (_sessionRole !== 'gm') return;
  const chip = document.getElementById(cid);
  if (!chip || !chip.dataset.linkedPlayer) return;
  const target = chip.dataset.linkedPlayer;
  if (!target) return;
  const hp = parseInt(hpStr) || 0;
  _queueGmCommand({ type: 'setHp', target, hp, ts: Date.now() });
}

/** Queue a GM command into the next battlefield push. */
let _pendingCmds = [];
function _queueGmCommand(cmd) {
  _pendingCmds = _pendingCmds.filter(c => !(c.type === cmd.type && c.target === cmd.target));
  _pendingCmds.push(cmd);
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushBattlefield, 400);
}

/** Populate the player-link <select> in every open chip panel. */
function updateGmPlayerLinkDropdowns() {
  const playerNames = Object.keys(_connectedPlayers);
  document.querySelectorAll('.chip-link-sel').forEach(sel => {
    const cid       = sel.id.replace(/-link-sel$/, '');
    const chip      = document.getElementById(cid);
    const current   = chip ? (chip.dataset.linkedPlayer || '') : '';
    const prevVal   = sel.value;

    // Rebuild options
    sel.innerHTML = '<option value="">, none ,</option>' +
      playerNames.map(n => `<option value="${esc(n)}" ${n === current ? 'selected' : ''}>${esc(n)}</option>`).join('');

    // Restore selection if still valid
    if (current) sel.value = current;
    else if (prevVal && playerNames.includes(prevVal)) sel.value = prevVal;
  });
}

/** Re-render the "Connected Players" list , clickable cards that open full sheet summary. */
function renderGmPlayersList() {
  const el = document.getElementById('gm-players-list');
  if (!el) return;
  const players = Object.values(_connectedPlayers);
  if (!players.length) {
    el.innerHTML = '<span style="font-style:italic;opacity:.55;font-family:\'Crimson Text\',serif;font-size:11px;">No players connected</span>';
    return;
  }
  const isDark = document.body.classList.contains('dark-mode');
  // Use bright colors that work on both light and dark backgrounds
  function hpColor(pct) {
    if (pct > 60) return isDark ? '#5adf2a' : '#2a7a0a';
    if (pct > 25) return isDark ? '#f0c030' : '#8a6010';
    return isDark ? '#ff5555' : '#8b0000';
  }
  el.innerHTML = players.map(p => {
    const hpPct   = p.hpMax > 0 ? Math.round((p.hp / p.hpMax) * 100) : 0;
    const col     = hpColor(hpPct);
    const condStr = p.conditions && Object.keys(p.conditions).length
      ? Object.keys(p.conditions).join(', ') : '';
    const exhaustStr = p.exhaustion ? '💤'.repeat(Math.min(p.exhaustion, 5)) : '';
    const wardStr  = p.ward ? `🛡${p.ward}` : '';
    const pName = esc(p.name || '');
    // Stale indicator , if last seen > 20s ago show a warning dot
    const seenAgo = Date.now() - (_playerLastSeen[p.name] || 0);
    const staleHint = seenAgo > 20000 ? ` <span title="Last seen ${Math.round(seenAgo/1000)}s ago" style="opacity:.5;font-size:9px;">⚠ idle</span>` : '';
    return `<div class="gm-player-card"
      draggable="true"
      data-player-name="${pName}"
      ondragstart="startPlayerDrag(event,'${pName}')"
      onclick="openPlayerSheet('${pName}')"
      style="display:flex;align-items:center;gap:7px;padding:6px 8px;margin-bottom:4px;border:1.5px solid var(--mid);cursor:grab;transition:background .12s;background:var(--paper2);"
      onmouseover="this.style.background='var(--paper3)'"
      onmouseout="this.style.background='var(--paper2)'">
      <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;display:inline-block;box-shadow:0 0 6px ${col};"></span>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${esc(p.name || '?')}${staleHint} <span style="font-weight:400;opacity:.5;font-size:9px;">${esc(p.species||'')}${p.rank?' · '+esc(p.rank):''}</span>
        </div>
        <div style="font-family:'Crimson Text',serif;font-size:12px;color:var(--ink);">
          ♥ <strong style="color:${col};font-size:13px;">${p.hp}${p.hpMax>0?' / '+p.hpMax:''}</strong>
          ${p.hpMax>0?`<span style="font-size:10px;opacity:.6;"> (${hpPct}%)</span>`:''}
          &nbsp;⚡ ${p.st}/${p.stMax}
          &nbsp;🧠 ${p.str}/${p.strMax}
          ${wardStr}${exhaustStr}
          ${condStr ? `<span style="color:${isDark?'#ff8888':'#8b1a1a'};"> · ${esc(condStr)}</span>` : ''}
        </div>
      </div>
      <span style="font-size:9px;opacity:.4;flex-shrink:0;" title="Drag to battlefield or click for sheet">⠿▶</span>
    </div>`;
  }).join('');
}

/** Open full character sheet summary modal for a connected player. */
function openPlayerSheet(playerName) {
  const p = _connectedPlayers[playerName];
  if (!p) return;

  const hpPct   = p.hpMax > 0 ? Math.round((p.hp / p.hpMax) * 100) : 0;
  const hpColor = hpPct > 60 ? '#4a9a2a' : hpPct > 25 ? '#c8a85a' : '#8b1a1a';

  // ── Attributes ──
  const attrKeys = { for:'FOR', pro:'PRO', dex:'DEX', nim:'NIM', wil:'WIL', int:'INT', pre:'PRE', cha:'CHA' };
  const attrsHtml = p.attrs ? Object.entries(attrKeys).map(([k, label]) => {
    const v = p.attrs[k] || ',';
    return `<div style="text-align:center;padding:4px 2px;border:1px solid var(--faint);min-width:36px;">
      <div style="font-family:'Cinzel',serif;font-size:7px;letter-spacing:.1em;opacity:.5;">${label}</div>
      <div style="font-size:16px;font-weight:700;">${v}</div>
    </div>`;
  }).join('') : '<span style="opacity:.4;font-style:italic;font-size:11px;">Not synced yet</span>';

  // ── Skills , full tree with hover-sum ──
  const skillsHtml = p.skills && p.skills.length
    ? p.skills.filter(s => s.name).map(prim => {
        const hasChildren = prim.secondaries && prim.secondaries.length > 0;
        const secsHtml = hasChildren ? prim.secondaries.map(sec => {
          const secSum = (sec.score || 0) + (sec.tertiaries || []).reduce((a, t) => a + (t.score || 0), 0);
          const terHtml = sec.tertiaries && sec.tertiaries.length
            ? sec.tertiaries.map(ter =>
                `<div style="display:flex;align-items:center;padding:1px 0 1px 28px;font-size:10px;opacity:.75;">
                  <span style="flex:1;">└ ${esc(ter.name)}</span>
                  <strong style="min-width:24px;text-align:right;">${ter.score||0}</strong>
                </div>`
              ).join('')
            : '';
          return `<div style="padding:2px 0 2px 12px;">
            <div style="display:flex;align-items:center;font-size:11px;" title="Hover: sum includes tertiaries">
              <span style="flex:1;">↳ ${esc(sec.name)}</span>
              <strong style="min-width:24px;text-align:right;">${sec.score||0}</strong>
              ${sec.tertiaries && sec.tertiaries.length ? `<span style="font-size:9px;opacity:.45;border:1px solid var(--faint);padding:1px 4px;margin-left:5px;" title="Sum with tertiaries: ${secSum}">&Sigma;${secSum}</span>` : ''}
            </div>
            ${terHtml}
          </div>`;
        }).join('') : '';
        return `<div class="ps-skill-block" style="margin-bottom:4px;border:1px solid var(--faint);cursor:${hasChildren?'pointer':'default'};" ${hasChildren?`onclick="const c=this.querySelector('.ps-skill-children');c.style.display=c.style.display==='none'?'block':'none'"`:''}> 
          <div style="display:flex;align-items:center;padding:3px 6px;background:var(--paper2);">
            <span style="flex:1;font-family:'Cinzel',serif;font-size:10px;font-weight:700;">${esc(prim.name)}</span>
            <strong style="font-size:13px;margin-right:6px;">${prim.score||0}</strong>
            ${hasChildren ? '<span style="font-size:9px;opacity:.4;">▾</span>' : ''}
          </div>
          ${hasChildren ? `<div class="ps-skill-children" style="display:none;padding:2px 4px;">${secsHtml}</div>` : ''}
        </div>`;
      }).join('')
    : '<span style="opacity:.4;font-size:11px;font-style:italic;">None synced</span>';

  // ── Weapons ──
  const weaponsHtml = p.weapons && p.weapons.length
    ? p.weapons.map(w => `<div style="padding:2px 0;border-bottom:1px solid var(--faint);font-size:12px;">
        <strong>${esc(w.name)}</strong>
        ${w.dmg ? ` <span style="opacity:.6;">${esc(w.dmg)}</span>` : ''}
        ${w.type ? ` · <span style="opacity:.5;font-size:11px;">${esc(w.type)}</span>` : ''}
        ${w.quality ? ` · <span style="opacity:.5;font-size:11px;font-style:italic;">${esc(w.quality)}</span>` : ''}
      </div>`).join('')
    : '<span style="opacity:.4;font-size:11px;font-style:italic;">None synced</span>';

  // ── Abilities ──
  const abilitiesHtml = p.abilities && p.abilities.length
    ? p.abilities.map(slot => `
        <div style="margin-bottom:6px;">
          <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:2px;">${esc(slot.slotName)}</div>
          ${slot.entries.map(e => `<div style="font-size:12px;padding:1px 0;"><strong>${esc(e.name)}</strong>${e.cost?' <span style="opacity:.5;font-size:10px;">['+esc(e.cost)+']</span>':''} ${e.effect?'<span style="opacity:.65;font-size:11px;"> , '+esc(e.effect.substring(0,80))+(e.effect.length>80?'…':'')+'</span>':''}</div>`).join('')}
        </div>`).join('')
    : '<span style="opacity:.4;font-size:11px;font-style:italic;">None synced</span>';

  // ── Knacks ──
  const knacksHtml = p.knacks && p.knacks.length
    ? p.knacks.map(k => `<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 6px;border:1px solid var(--faint);font-size:11px;">${esc(k.name)}${k.level?' ('+esc(k.level)+')':''}</span>`).join('')
    : '<span style="opacity:.4;font-size:11px;font-style:italic;">None</span>';

  // ── Conditions ──
  const condsHtml = p.conditions && Object.keys(p.conditions).length
    ? Object.entries(p.conditions).map(([name, dur]) =>
        `<span style="display:inline-block;margin:1px 3px 1px 0;padding:2px 7px;background:var(--red-faint);border:1px solid var(--red);color:var(--red);font-size:11px;">${esc(name)}${dur>1?' ×'+dur:''}</span>`
      ).join('')
    : '<span style="opacity:.4;font-size:11px;font-style:italic;">None</span>';

  // ── Ward & Exhaustion ──
  const wardHtml = p.ward
    ? `<span style="padding:2px 8px;border:1px solid var(--gold);font-size:11px;">🛡 ${esc(p.ward)} ${esc(p.wardType||'')}</span>`
    : '';
  const exhHtml = p.exhaustion
    ? `<span style="padding:2px 8px;border:1px solid var(--mid);font-size:11px;">💤 Exhaustion ${p.exhaustion}</span>`
    : '';



  const modal = document.getElementById('player-sheet-modal');
  const body  = document.getElementById('player-sheet-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid var(--ink);">
      <div style="flex:1;">
        <div style="font-family:'UnifrakturMaguntia',cursive;font-size:28px;line-height:1;color:var(--ink);">${esc(p.name||'Unknown')}</div>
        <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;opacity:.55;margin-top:2px;">
          ${[p.species,p.culture,p.rank].filter(Boolean).map(esc).join(' · ')}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:22px;font-weight:700;color:${hpColor};font-family:'Cinzel',serif;">♥ ${p.hp}</div>
        <div style="font-size:13px;opacity:.7;">⚡ ${p.st}/${p.stMax} &nbsp; 🧠 ${p.str}/${p.strMax}</div>
        ${wardHtml || exhHtml ? `<div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap;">${wardHtml}${exhHtml}</div>` : ''}
      </div>
    </div>

    <!-- Conditions -->
    ${Object.keys(p.conditions||{}).length ? `
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">⚡ Conditions</div>
      <div>${condsHtml}</div>
    </div>` : ''}

    <!-- Attributes -->
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">Attributes</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">${attrsHtml}</div>
    </div>

    <!-- Skills -->
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">Skills</div>
      <div>${skillsHtml}</div>
    </div>

    <!-- Knacks -->
    ${p.knacks && p.knacks.length ? `
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">Knacks</div>
      <div>${knacksHtml}</div>
    </div>` : ''}

    <!-- Weapons -->
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">Weapons</div>
      ${weaponsHtml}
    </div>

    <!-- Abilities -->
    ${p.abilities && p.abilities.length ? `
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">Abilities</div>
      ${abilitiesHtml}
    </div>` : ''}

    <!-- Passive Traits -->
    ${p.passiveTraits ? `
    <div style="margin-bottom:10px;">
      <div class="ps-section-label">Passive Traits</div>
      <div style="font-family:'Crimson Text',serif;font-size:12px;opacity:.8;">${esc(p.passiveTraits)}</div>
    </div>` : ''}


  `;

  modal.style.display = 'flex';
}

function closePlayerSheet() {
  const modal = document.getElementById('player-sheet-modal');
  if (modal) modal.style.display = 'none';
}

/** Drag a connected player card from the GM panel onto a battlefield lane. */
function startPlayerDrag(e, playerName) {
  e.dataTransfer.setData('text/plain', 'player:' + playerName);
  e.dataTransfer.effectAllowed = 'copy';
}

/** Called when something is dropped onto a battlefield lane.
 *  Handles both existing chip drags (internal) and player-card drops (new). */
function _handleLaneDrop(e, lane) {
  e.preventDefault();
  lane.classList.remove('drag-over');
  const raw = e.dataTransfer.getData('text/plain');

  if (raw && raw.startsWith('player:')) {
    const playerName = raw.slice(7);
    const pdata = _connectedPlayers[playerName];
    if (!playerName) return;
    // Side determined by which lane they dropped onto (a- = ally, e- = enemy)
    const side = lane.dataset.lane.startsWith('a') ? 'ally' : 'enemy';
    // ✓ FIX: Parse HP properly as "cur/max" and include size
    const hpCur = pdata ? (pdata.hp || '') : '';
    const hpMax = pdata ? (pdata.hpMax || pdata.hp || '') : '';
    const hp = hpCur && hpMax ? `${hpCur}/${hpMax}` : hpCur;
    const playerSize = pdata ? (pdata.size || '') : '';
    
    placeCombatant({
      name:  playerName,
      side,
      lane:  lane.dataset.lane,
      hp,
      size: playerSize ? (playerSize.toLowerCase().includes('large') ? 'large' : 'normal') : 'normal',
      notes: playerName
    });
    // Auto-link the new chip to this player
    const chips = document.querySelectorAll('.bf-lane .comb-chip');
    const newChip = chips[chips.length - 1];
    if (newChip) setChipPlayerLink(newChip.id, playerName);

  } else if (_draggedChip) {
    // Normal chip drag between lanes
    lane.appendChild(_draggedChip);
    _draggedChip.dataset.lane = lane.dataset.lane;
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(pushBattlefield, 400);
    _draggedChip = null;
  }
}

/** When the GM edits a chip's conditions, push them back to any linked player's display.
 *  (One-way: GM condition edits reflect on chip; player's own sheet is not overwritten.) */
function syncLinkedPlayerConditions(cid) {
  if (_sessionRole !== 'gm') return;
  // Conditions are serialized in the battlefield blob per-combatant.
  // restoreBattlefield() on the player side reads them on every poll.
  // Just trigger a push so the updated conditions reach players quickly.
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushBattlefield, 300);
  updateGmPlayerLinkDropdowns();
}

/* ────────────────────────────────────────────────
   UI HELPERS
──────────────────────────────────────────────── */
function setPulse(state) {
  const pulse = document.getElementById('session-pulse');
  if (!pulse) return;
  pulse.className = 'session-pulse';
  if (state) pulse.classList.add(state);
}

function setSessionUI(role) {
  const lbl  = document.getElementById('session-role-label');
  const idle = document.getElementById('session-mid-idle');
  const act  = document.getElementById('session-mid-active');
  if (lbl)  { lbl.className = 'session-role-cell ' + role; lbl.textContent = role === 'gm' ? '⚔ GM · Live' : '👁 Watching'; }
  if (idle) idle.style.display = 'none';
  if (act)  act.style.display  = 'flex';
  setPulse('live');

  const gmPanel       = document.getElementById('gm-tools-panel');
  const placePanel    = document.getElementById('place-combatant-panel');
  const vitalsSection = document.getElementById('player-vitals-section');

  // Tab visibility
  const tabBtns = document.querySelectorAll('.tab-btn');
  const p1 = document.getElementById('p1');
  const p2 = document.getElementById('p2');

  if (role === 'gm') {
    if (gmPanel)       gmPanel.style.display       = 'block';
    if (placePanel)    placePanel.style.display     = 'block';
    if (vitalsSection) vitalsSection.style.display  = 'none';
    // Hide tabs I and II, jump straight to Combat tab
    tabBtns.forEach(b => {
      const target = b.getAttribute('onclick')?.match(/showTab\('(\w+)'/)?.[1];
      b.style.display = (target === 'p1' || target === 'p2') ? 'none' : '';
    });
    showTab('p3', document.querySelector('.tab-btn[onclick*="p3"]'));
    renderGmTools();
  } else {
    if (gmPanel)       gmPanel.style.display       = 'none';
    if (placePanel)    placePanel.style.display     = 'none';
    if (vitalsSection) vitalsSection.style.display  = 'block';
    // Restore all tabs
    tabBtns.forEach(b => b.style.display = '');
  }
  updateStatusText();
}

function updateStatusText(override) {
  const el = document.getElementById('session-status-text');
  if (!el) return;
  if (typeof override === 'string') { el.textContent = override; return; }
  if (_sessionRole === 'gm') {
    const ago = _lastPushTs ? Math.round((Date.now() - _lastPushTs) / 1000) : null;
    const pc  = Object.keys(_connectedPlayers).length;
    const ps  = pc > 0 ? ' · ' + pc + ' player' + (pc > 1 ? 's' : '') + ' online' : ' · no players yet';
    el.textContent = 'Hosting' + (ago !== null ? ' · pushed ' + (ago < 3 ? 'just now' : ago + 's ago') : '') + ps;
  } else if (_sessionRole === 'player') {
    const ago = _lastPollTs ? Math.round((Date.now() - _lastPollTs) / 1000) : null;
    el.textContent = 'Live' + (ago !== null ? ' · ' + (ago < 2 ? 'just now' : ago + 's ago') : '');
  }
}
