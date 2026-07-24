/* ══════════════════════════════════════════════════════════════
   LIVE SYNC  —  Firebase Realtime Database (replaces the old
   Google Apps Script relay — see the note left in 10-gm-tools.js
   where BASE_SCRIPT_URL used to live)
   ┌───────────────────────────────────────────────────────────┐
   │  servers/{srv}/battlefield      GM writes; everyone       │
   │                                  listens — pushed the      │
   │                                  instant it changes, no    │
   │                                  polling                   │
   │  servers/{srv}/players/{name}   that player writes their   │
   │                                  own vitals; GM listens to  │
   │                                  the whole node             │
   │  servers/{srv}/presence/{name}  true while connected —      │
   │                                  Firebase itself clears it  │
   │                                  on disconnect (tab close,  │
   │                                  crash, lost network), so   │
   │                                  we're never guessing who's │
   │                                  actually still there       │
   └───────────────────────────────────────────────────────────┘
   SETUP: paste your own project's values below. Firebase console →
   Project settings → your web app → SDK setup and configuration.
   This object is NOT a secret — it's meant to ship in client code.
   Access control lives in the Realtime Database security rules,
   not in hiding this object.
══════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyAlcAPvg9pBUD6oax2u-sqGOvamCct4IYs",
  authDomain: "monarchy-companion.firebaseapp.com",
  databaseURL: "https://monarchy-companion-default-rtdb.firebaseio.com",
  projectId: "monarchy-companion",
  storageBucket: "monarchy-companion.firebasestorage.app",
  messagingSenderId: "632244770803",
  appId: "1:632244770803:web:a21824788754ce5729e486",
  measurementId: "G-4KDSPRDN96"
};

let _sessionRole = null;   // 'gm' | 'player' | null
let _serverId    = null;   // active table id

// Firebase handles — only live while a session is active
let _db          = null;
let _bfRef       = null;
let _playersRef  = null;
let _presenceRef = null;

// Timers
let _pushTimer       = null;  // debounce for GM bf push — other files clear/set this directly, keep the name
let _plPushDebounce  = null;
let _statusTickTimer = null;

// Timestamps
let _lastPushTs = 0;
let _lastPollTs = 0;  // "last update received" — kept for updateStatusText()
// (_lastCmdTs lives right next to _applyGmCommands below, where it's used)

/** Bring up the Firebase connection once, defensively. If the SDK
 *  didn't load (no internet at boot, CDN blocked, etc.) this never
 *  throws — every sync function below checks _db/_bfRef first, so
 *  solo/offline use of the character sheet and tracker still works
 *  fine even with zero connectivity. Awaits the (non-blocking) SDK
 *  load kicked off in index.html, so this resolves correctly even if
 *  that request happened to still be in flight — it never blocked
 *  page startup in the first place, so there's no downside to
 *  checking on it here right before actually needing it. */
async function _ensureFirebase() {
  if (_db) return true;
  if (String(firebaseConfig.apiKey).startsWith('PASTE_YOUR') || String(firebaseConfig.databaseURL).includes('PASTE_YOUR')) {
    // Never even attempt a connection with placeholder values — Firebase
    // will otherwise retry a nonexistent project forever in a tight loop,
    // which is expensive enough to make the whole app feel frozen. Fail
    // once, clearly, instead.
    console.error('[monarchy sync] firebaseConfig still has placeholder values — see FIREBASE_SETUP.md, then rebuild.');
    alert('Live sync isn\'t set up yet — firebaseConfig in 09-session-sync.js still has placeholder values. Follow FIREBASE_SETUP.md, then rebuild.');
    return false;
  }
  if (window.__firebaseSdkReady) await window.__firebaseSdkReady;
  if (typeof firebase === 'undefined') {
    console.error('[monarchy sync] Firebase SDK did not load — check your internet connection.');
    return false;
  }
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  // Electron's renderer exposes a `process` global even with nodeIntegration
  // off, which is enough to trip Firebase's "is this Node?" detection —
  // and in a Node-like environment, Realtime Database falls back to a
  // third-party WebSocket implementation instead of the browser's native
  // one, which is known to be unstable specifically in Electron (constant
  // disconnect/reconnect). Forcing long-polling sidesteps that entirely —
  // plain HTTP requests, no WebSocket involved either way. Plenty fast
  // enough for a combat tracker that isn't pushing updates more than a
  // few times a second.
  if (firebase.database && firebase.database.INTERNAL && firebase.database.INTERNAL.forceLongPolling) {
    firebase.database.INTERNAL.forceLongPolling();
  }
  _db = firebase.database();
  return true;
}

/* ────────────────────────────────────────────────
   GM — push battlefield.
   Real write, real error handling: unlike the old fire-and-forget
   POST (which always reported "live" whether or not the write
   actually landed), this only shows "live" once Firebase confirms
   the write, and shows a real error if it didn't.
──────────────────────────────────────────────── */
/** Firebase's Realtime Database throws synchronously if the value passed
 *  to .set() contains `undefined` anywhere in it — even nested. The old
 *  transport didn't care, because JSON.stringify() (used to build the
 *  old POST body) silently drops undefined keys instead of choking on
 *  them. serializeBattlefield()/serializePlayerVitals() were written
 *  against that old, forgiving behavior (e.g. "cmds: ... : undefined"
 *  whenever there's nothing pending — which is the normal, common case,
 *  including the very first push of a fresh session). Strip them
 *  recursively right before every write so a completely ordinary state
 *  (no pending commands, no exhaustion, no ward) never throws. */
function _stripUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(_stripUndefined);
  if (obj && typeof obj === 'object') {
    const out = {};
    Object.keys(obj).forEach(k => { if (obj[k] !== undefined) out[k] = _stripUndefined(obj[k]); });
    return out;
  }
  return obj;
}
function pushBattlefield() {
  if (!_bfRef || _sessionRole !== 'gm') return;
  setPulse('syncing');
  try {
    _bfRef.set(_stripUndefined(serializeBattlefield()))
      .then(() => { _lastPushTs = Date.now(); setPulse('live'); updateStatusText(); })
      .catch(err => {
        setPulse('err');
        updateStatusText('⚠ push failed — ' + (err && err.message ? err.message : String(err)));
        console.error('[monarchy sync] battlefield push failed', err);
      });
  } catch (err) {
    // A synchronous throw here must never propagate to whoever called
    // pushBattlefield() — for startSession specifically, an uncaught
    // throw here would skip every line after it (event listeners,
    // Firebase listeners, the status ticker), leaving a "session" that
    // looks like it started but never actually wired itself up.
    setPulse('err');
    updateStatusText('⚠ push failed — ' + (err && err.message ? err.message : String(err)));
    console.error('[monarchy sync] battlefield push failed (sync)', err);
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
      const hpEl = document.getElementById('c-hp-cur');
      if (hpEl && cmd.hp !== undefined) hpEl.value = cmd.hp;
      const stEl = document.getElementById('c-st-cur');
      if (stEl && cmd.st !== undefined) stEl.value = cmd.st;
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
   Player — push own vitals. Deliberate only: once on join, and
   again whenever something actually changes (via _scheduleVitalsPush's
   debounce, triggered by onVitalsChange below). There's no more blind
   "resend every 5 seconds no matter what" heartbeat — that heartbeat
   was quietly doing double duty as a presence signal, which is why
   it could also race a GM's own edit; presence is Firebase's job now
   (see _presenceRef / onDisconnect in startSession), fully decoupled
   from resending vitals data.
──────────────────────────────────────────────── */
function _playerPushVitals() {
  if (!_playersRef || _sessionRole !== 'player') return;
  try {
    const vitals = _stripUndefined(serializePlayerVitals());
    _playersRef.child(vitals.name).set(vitals)
      .catch(err => console.error('[monarchy sync] vitals push failed', err));
  } catch (err) {
    // Same reasoning as pushBattlefield(): must never throw out to the
    // caller. In startSession's player branch specifically, that would
    // skip the presence registration and listeners right after it.
    console.error('[monarchy sync] vitals push failed (sync)', err);
  }
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
/** In-page replacement for window.confirm() — avoids a documented,
 *  maintainer-confirmed Electron bug where showing a native alert()/
 *  confirm()/prompt() dialog can leave text inputs looking focused but
 *  silently refuse keyboard input afterward, until the whole window
 *  loses and regains OS-level focus (electron/electron#40212 and
 *  others). Resolves true/false, same as a real confirm() would. */
function _showConfirmModal(message, confirmLabel) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1c140f;color:#e9ddc8;border:1px solid #6b5842;border-radius:6px;padding:20px 24px;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.6);font:14px/1.5 inherit;';
    const msg = document.createElement('div');
    msg.style.cssText = 'white-space:pre-wrap;margin-bottom:16px;';
    msg.textContent = message;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;';
    function mkBtn(label, val, primary) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'padding:6px 16px;border-radius:4px;border:1px solid #6b5842;cursor:pointer;font-size:13px;' + (primary ? 'background:#8a6d3b;color:#fff;' : 'background:#2a221a;color:#e9ddc8;');
      b.onclick = () => { document.body.removeChild(backdrop); resolve(val); };
      return b;
    }
    row.appendChild(mkBtn('Cancel', false, false));
    row.appendChild(mkBtn(confirmLabel || 'OK', true, true));
    box.appendChild(msg);
    box.appendChild(row);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  });
}

async function startSession(role) {
  // Both dialogs happen first, as part of the original click. Uses
  // _showConfirmModal() instead of window.confirm() specifically to
  // avoid the Electron input-lock bug described above — this was the
  // actual root cause of typing breaking after hosting, not anything
  // about async timing (that reordering was a reasonable hygiene fix,
  // just not the real one).
  if (role === 'gm') {
    if (!(await _showConfirmModal('Host as GM on server "' + (getServers().find(s => s.id === getActiveServer()) || { name: 'Main Table' }).name + '"?\n\nThis will push your current battlefield to that server.', 'Host'))) return;
  }
  if (role === 'player') {
    getMyPlayerName();
    if (!_playerName) return; // cancelled prompt
  }

  if (!(await _ensureFirebase())) {
    alert('Could not reach the sync service — check your internet connection and try again.');
    return;
  }

  const serverName = (getServers().find(s => s.id === getActiveServer()) || { name: getActiveServer() }).name;
  _serverId    = getActiveServer();
  _sessionRole = role;
  _bfRef       = _db.ref('servers/' + _serverId + '/battlefield');
  _playersRef  = _db.ref('servers/' + _serverId + '/players');
  _presenceRef = _db.ref('servers/' + _serverId + '/presence');

  const srvLbl = document.getElementById('session-server-name');
  if (srvLbl) srvLbl.textContent = '· ' + serverName;

  setSessionUI(role);

  if (role === 'gm') {
    pushBattlefield();
    document.addEventListener('click', onBfChange);
    document.addEventListener('input', onBfChange);
    _playersRef.on('value', _onPlayersUpdate);
    _presenceRef.on('value', _onPresenceUpdate);
    _statusTickTimer = setInterval(updateStatusText, 1000);
    showToast('Hosting on: ' + serverName);
  } else {
    _bfRef.on('value', snap => {
      const bf = snap.val();
      _lastPollTs = Date.now();
      if (bf && bf.v) restoreBattlefield(bf);
      _applyGmCommands(bf && bf.cmds);
      setPulse('live');
      updateStatusText();
    });
    _playerPushVitals();
    _presenceRef.child(_playerName).set(true)
      .then(() => _presenceRef.child(_playerName).onDisconnect().remove())
      .catch(() => {});
    document.addEventListener('input',  onVitalsChange);
    document.addEventListener('change', onVitalsChange);
    _statusTickTimer = setInterval(updateStatusText, 1000);
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
  clearInterval(_statusTickTimer);

  if (_bfRef)      _bfRef.off();
  if (_playersRef) _playersRef.off();
  if (_presenceRef) {
    _presenceRef.off();
    if (_sessionRole === 'player' && _playerName) _presenceRef.child(_playerName).remove().catch(() => {});
  }
  _bfRef = _playersRef = _presenceRef = null;

  _sessionRole = null; _serverId = null;
  _lastPushTs = 0; _lastPollTs = 0;
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
  document.querySelectorAll('.tab-btn').forEach(b => b.style.display = '');
  setPulse(null);
  showToast('Sync stopped');
}

/* ── Re-affirm presence + do one deliberate re-sync when the tab
   comes back from being hidden (covers throttled background timers
   and brief connectivity blips, e.g. a laptop waking from sleep).
   There's no "paused polling" bookkeeping needed anymore — listeners
   just keep listening in the background regardless of tab visibility. ── */
document.addEventListener('visibilitychange', function() {
  if (document.hidden || !_sessionRole) return;
  if (_sessionRole === 'gm' && _bfRef) pushBattlefield();
  if (_sessionRole === 'player' && _presenceRef && _playerName) {
    _presenceRef.child(_playerName).set(true).then(() => _presenceRef.child(_playerName).onDisconnect().remove()).catch(() => {});
    _playerPushVitals();
  }
});

/* serializeBattlefield() / restoreBattlefield() now live in
   07-combat-window.js — that file loads before this one, so these
   calls below still resolve exactly as they did when both functions
   were defined in this file. Moved because the battlefield's own
   shape (chips, turn count, mana, fog) is Combat's data to own; this
   file's job is just pushing/pulling it over Firebase. */


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

/* ── HP edit lock: while the GM has a chip's HP field focused, don't
   let an incoming player update visually interrupt them mid-keystroke.
   The old mechanism also assumed "my edit wins for the next 12
   seconds" as a guess to cover slow, unreliable polling — that guess
   is gone. Firebase pushes in well under a second, and _unlockHpEdit
   already triggers an immediate pushBattlefield() below, so there's
   no multi-second window of stale-but-still-arriving data left to
   guard against — this was the main mechanism behind "players
   overwriting GM info." ── */
const _hpEditingSet = new Set(); // cids currently focused for HP editing by the GM
function _lockHpEdit(cid) { _hpEditingSet.add(cid); }
function _unlockHpEdit(cid, hpInput) {
  _hpEditingSet.delete(cid);
  if (_sessionRole === 'gm') {
    updateHpLbl(cid, hpInput ? hpInput.value : '');
    clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  }
}

/* ── Player seen-timestamps, for the "idle" hint in renderGmPlayersList ── */
let _playerLastSeen = {}; // name → Date.now() timestamp

/** GM: fired every time servers/{srv}/players changes (pushed, not polled). */
function _onPlayersUpdate(snapshot) {
  const pl = snapshot.val() || {};
  const now = Date.now();
  Object.keys(pl).forEach(name => { _playerLastSeen[name] = now; });
  Object.assign(_connectedPlayers, pl);

  // Reflect a linked player's self-reported HP onto their chip. Same
  // single-writer idea as the rest of the battlefield: whoever touches
  // a field last wins, and it's pushed straight back out so it durably
  // persists for everyone instead of only updating the GM's screen.
  document.querySelectorAll('.comb-chip').forEach(chip => {
    const linkedName = chip.dataset.linkedPlayer;
    if (!linkedName) return;
    const pdata = _connectedPlayers[linkedName];
    if (!pdata) return;
    const cid = chip.id;
    if (_hpEditingSet.has(cid)) return; // GM is actively typing this exact field right now
    const panel = document.getElementById(cid + '-exp');
    if (!panel) return;
    const hpCurInput = panel.querySelector('.chip-hp-cur');
    const hpMaxInput = panel.querySelector('.chip-hp-max');
    if (!hpCurInput || !hpMaxInput) return;
    const hpCurStr = String(pdata.hp ?? '');
    const hpMaxStr = String(pdata.hpMax ?? '');
    if (hpCurInput.value === hpCurStr && hpMaxInput.value === hpMaxStr) return; // unchanged, nothing to do
    hpCurInput.value = hpCurStr;
    hpMaxInput.value = hpMaxStr;
    const hpStr = (hpCurStr && hpMaxStr) ? `${hpCurStr}/${hpMaxStr}` : hpCurStr;
    updateHpLbl(cid, hpStr);
    updateHpBar(cid, hpStr);
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(pushBattlefield, 400);
  });

  updateGmPlayerLinkDropdowns();
  renderGmPlayersList();
  updateStatusText();
}

/** GM: fired every time servers/{srv}/presence changes. True disconnect
 *  detection (each player registers Firebase's own onDisconnect on join)
 *  instead of guessing someone left because their last poll went missing. */
function _onPresenceUpdate(snapshot) {
  const online = snapshot.val() || {};
  Object.keys(_connectedPlayers).forEach(name => {
    if (!online[name]) { delete _connectedPlayers[name]; delete _playerLastSeen[name]; }
  });
  renderGmPlayersList();
}

/* ── legacy shim so old call sites still work ── */
function applyPlayerLinksFromState(state) {
  if (state && state.pl)           _onPlayersUpdate({ val: () => state.pl });
  else if (state && state.players) _onPlayersUpdate({ val: () => state.players });
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
    // Hide tabs I and II, jump straight to Multiplayer tab
    tabBtns.forEach(b => {
      const target = b.getAttribute('onclick')?.match(/showTab\('(\w+)'/)?.[1];
      b.style.display = (target === 'p1' || target === 'p2') ? 'none' : '';
    });
    showTab('p3', document.querySelector('.tab-btn[onclick*="p3"]'));
    renderGmTools();
    if (typeof WM !== 'undefined') WM.open('combat'); // battlefield/vitals live there now, not in this tab
  } else {
    if (gmPanel)       gmPanel.style.display       = 'none';
    if (placePanel)    placePanel.style.display     = 'none';
    if (vitalsSection) vitalsSection.style.display  = 'block';
    // Restore all tabs
    tabBtns.forEach(b => b.style.display = '');
    if (typeof WM !== 'undefined') WM.open('combat'); // player's vitals + the shared battlefield live there now
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

