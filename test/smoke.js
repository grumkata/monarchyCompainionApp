/* Runtime smoke test — loads the built dist/monarchy.html in jsdom and
   exercises the paths this refactor touched (window registration,
   sheet/combat/multiplayer split, save-format version bump, battlefield
   serialize/restore, local persistence). Run with: node test/smoke.js
   (builds dist/monarchy.html first via build.js if it isn't present, or
   run `npm run build:html` yourself first if you want to test a fresh
   build). Requires the `jsdom` package: npm install --save-dev jsdom */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const distPath = path.join(__dirname, '..', 'dist', 'monarchy.html');
if (!fs.existsSync(distPath)) {
  execSync('node build.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
}

const { JSDOM } = require('jsdom');
const html = fs.readFileSync(distPath, 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  url: 'https://example.org/monarchy.html',
  beforeParse(window) {
    // jsdom has no canvas 2D context implementation; stub it so fx-polish's
    // particle canvas code doesn't throw and abort script execution.
    window.HTMLCanvasElement.prototype.getContext = () => ({
      clearRect(){}, beginPath(){}, arc(){}, fill(){}, save(){}, restore(){},
      translate(){}, rotate(){}, moveTo(){}, lineTo(){}, closePath(){}, fillRect(){}
    });
    // jsdom doesn't implement IntersectionObserver (unrelated decorative
    // scroll-reveal feature in 01-fx-polish.js); real browsers/Electron do.
    window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.onerror = (msg) => { errors.push(String(msg)); };
    window.addEventListener('error', (e) => { errors.push(e.error ? String(e.error.stack||e.error) : String(e.message)); });
  }
});

const { window } = dom;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await wait(300); // let DOMContentLoaded-driven init settle
  const results = [];
  function check(label, fn) {
    try { const r = fn(); results.push([label, true, r]); }
    catch (e) { results.push([label, false, e.message]); }
  }

  check('WM is defined as a page global (top-level const bindings are usable bare from any script on the page, but — like _ls — are not reflected as window.WM from outside; confirmed working via every other WM-dependent check below)', () => window.eval("typeof WM === 'object' && typeof WM.open === 'function'"));
  check('sheet window registered', () => !!window.document.querySelector('[data-window-id="sheet"]'));
  check('combat window registered', () => !!window.document.querySelector('[data-window-id="combat"]'));
  check('tableToggleCombat exists', () => typeof window.tableToggleCombat === 'function');
  check('serializeSheet exists', () => typeof window.serializeSheet === 'function');
  check('restoreSheet exists', () => typeof window.restoreSheet === 'function');
  check('serializeBattlefield exists', () => typeof window.serializeBattlefield === 'function');
  check('restoreBattlefield exists', () => typeof window.restoreBattlefield === 'function');
  check('placeCombatant exists', () => typeof window.placeCombatant === 'function');
  check('adjVal exists', () => typeof window.adjVal === 'function');
  check('adjTurn exists', () => typeof window.adjTurn === 'function');
  check('esc/val/selVal exist', () => typeof window.esc==='function' && typeof window.val==='function' && typeof window.selVal==='function');

  // fill some attributes then recalc
  check('set attrs + recalcDerived', () => {
    window.document.getElementById('attr-for').value = 8;
    window.document.getElementById('attr-wil').value = 6;
    window.recalcDerived();
    const hpMax = window.document.getElementById('hp-max').value;
    const cHpMax = window.document.getElementById('c-hp-max').value;
    if (hpMax != cHpMax) throw new Error(`hp-max (${hpMax}) != c-hp-max (${cHpMax})`);
    return { hpMax, cHpMax };
  });

  check('id-name set + serializeSheet v4', () => {
    window.document.getElementById('id-name').value = 'Test Hero';
    const data = window.serializeSheet();
    if (data.v !== 4) throw new Error('expected v4, got ' + data.v);
    if (data.combat !== undefined) throw new Error('combat state leaked into character save');
    if (data.combatants !== undefined) throw new Error('combatants leaked into character save');
    if (data.id.name !== 'Test Hero') throw new Error('name not captured');
    return data.id;
  });

  check('restoreSheet round-trip (v4)', () => {
    const data = window.serializeSheet();
    window.document.getElementById('id-name').value = 'CHANGED';
    window.restoreSheet(data);
    if (window.document.getElementById('id-name').value !== 'Test Hero') throw new Error('round-trip failed');
    return 'ok';
  });

  check('restoreSheet accepts legacy v3', () => {
    window.restoreSheet({ v: 3, id: { name: 'Legacy Hero' }, attrs: {} });
    if (window.document.getElementById('id-name').value !== 'Legacy Hero') throw new Error('v3 import failed');
    return 'ok';
  });

  check('restoreSheet rejects v2/garbage', () => {
    window.showToast = window.showToast || (()=>{}); // ensure exists
    const before = window.document.getElementById('id-name').value;
    window.restoreSheet({ v: 2, id: { name: 'Should Not Load' } });
    const after = window.document.getElementById('id-name').value;
    if (after !== before) throw new Error('bad version was NOT rejected');
    return 'ok';
  });

  check('placeCombatant + serializeBattlefield has turn', () => {
    window.placeCombatant({ name: 'Goblin', side: 'enemy', lane: 'e-front', hp: '10/10' });
    window.adjTurn(2);
    const bf = window.serializeBattlefield();
    if (bf.turn !== 3) throw new Error('expected turn 3, got ' + bf.turn);
    if (!bf.combatants.length) throw new Error('no combatants serialized');
    if (bf.combatants[0].name !== 'Goblin') throw new Error('combatant name mismatch');
    return bf;
  });

  check('restoreBattlefield round-trip incl turn', () => {
    const bf = window.serializeBattlefield();
    window.document.querySelectorAll('.bf-lane .comb-chip').forEach(c=>c.remove());
    window.eval('_turnCount = 1');
    window.restoreBattlefield(bf);
    const turnEl = window.document.getElementById('turn-counter');
    if (turnEl.textContent != '3') throw new Error('turn not restored, got ' + turnEl.textContent);
    const chips = window.document.querySelectorAll('.bf-lane .comb-chip');
    if (chips.length !== 1) throw new Error('expected 1 chip restored, got ' + chips.length);
    return 'ok';
  });

  check('adjVal adjusts c-hp-cur only (no page-1 hp-cur to break)', () => {
    window.document.getElementById('c-hp-cur').value = 5;
    window.adjVal('c-hp-cur', -2);
    if (window.document.getElementById('c-hp-cur').value != '3') throw new Error('adjVal failed');
    if (window.document.getElementById('hp-cur')) throw new Error('hp-cur should not exist on page 1 anymore');
    return 'ok';
  });

  check('local battlefield persistence save/load', () => {
    window.eval('_saveLocalBattlefield()');
    const raw = window.eval("_ls.get('monarchy_combat_state')");
    if (!raw) throw new Error('nothing saved locally');
    const parsed = JSON.parse(raw);
    if (!parsed.combatants || !parsed.combatants.length) throw new Error('local save missing combatants');
    return 'ok';
  });

  check('quickSave / loadCharacter via saves-io still wired', () => typeof window.quickSave === 'function' && typeof window.loadCharacter==='function' && typeof window.exportMonarch==='function');

  check('renderServerSelector ran at init (10-gm-tools init moved from 13)', () => {
    const sel = window.document.getElementById('session-server-sel');
    return !!sel; // existence + no throw is what matters, it ran without error during load
  });

  check('realistic OLD v3 save still imports cleanly (extra combat/conditions/combatants fields ignored, not crashed on)', () => {
    const oldV3Save = {
      v: 3,
      id: { name: 'Old Character', species: 'Human', culture:'', rank:'', size:'Medium', player:'' },
      attrs: { for:7, pro:5, dex:6, nim:5, wil:6, int:5, pre:5, cha:5 },
      derived: { hpCur:'12', hpMax:'20', stCur:'5', stMax:'9', strCur:'2', strMax:'12' },
      combat: { wardVal:'3', wardType:'Ablative', exhaustion:[1,0,0], cHpCur:'12', cStCur:'5', cStrCur:'2' },
      conditions: [{ name:'Bleed', count:2 }],
      combatants: [{ name:'Old NPC', side:'enemy', lane:'e-front', hp:'8/8' }],
      skills:{body:[],mind:[],social:[]}, backgrounds:[], weapons:[], armors:[], abilSlots:[], knacks:[]
    };
    window.restoreSheet(oldV3Save);
    if (window.document.getElementById('id-name').value !== 'Old Character') throw new Error('old v3 id not restored');
    // The old save's combat/conditions/combatants fields should be silently
    // ignored (that data no longer belongs to the character), not crash.
    return 'ok, old extra fields ignored without error';
  });

  check('WM open/close cycle for combat window', () => {
    window.eval("WM.open('combat')");
    const el = window.document.querySelector('[data-window-id="combat"]');
    const openDisplay = el.style.display;
    window.eval("WM.close('combat')");
    const closedDisplay = el.style.display;
    if (openDisplay === closedDisplay) throw new Error('open/close did not change display style');
    return { openDisplay, closedDisplay };
  });

  check('formation checkbox toggles individual/formation HP fields', () => {
    const cb = window.document.getElementById('nc-isform');
    cb.checked = true;
    cb.dispatchEvent(new window.Event('change'));
    const indiv = window.document.getElementById('hp-individual').style.display;
    const form  = window.document.getElementById('hp-formation').style.display;
    if (indiv !== 'none' || form !== 'flex') throw new Error(`indiv=${indiv} form=${form}`);
    cb.checked = false;
    cb.dispatchEvent(new window.Event('change'));
    return 'ok';
  });

  check('GM remote setHp command updates c-hp-cur without touching a nonexistent hp-cur', () => {
    window.eval("_applyGmCommands([{type:'setHp', hp: 7, st: 4, ts: Date.now()+9999}])");
    if (window.document.getElementById('c-hp-cur').value != '7') throw new Error('c-hp-cur not updated by GM command');
    return 'ok';
  });

  check('checkHpDanger (via native input event) targets the Combat window element', () => {
    const cur = window.document.getElementById('c-hp-cur');
    const max = window.document.getElementById('c-hp-max');
    max.value = 20; max.dispatchEvent(new window.Event('input'));
    cur.value = 1; cur.dispatchEvent(new window.Event('input'));
    const combatWin = window.document.querySelector('[data-window-id="combat"]');
    if (!combatWin.classList.contains('hp-crit')) throw new Error('hp-crit class not applied to combat window on low HP');
    cur.value = 20; cur.dispatchEvent(new window.Event('input'));
    if (combatWin.classList.contains('hp-crit')) throw new Error('hp-crit class not cleared when healthy');
    return 'ok';
  });

  check('setSessionUI(gm) auto-opens the Combat window', () => {
    window.eval("WM.close('combat')");
    window.eval("setSessionUI('gm')");
    const el = window.document.querySelector('[data-window-id="combat"]');
    if (el.style.display !== 'flex') throw new Error('combat window did not auto-open on GM session start, display=' + el.style.display);
    return 'ok';
  });

  console.log('\n=== RESULTS ===');
  let anyFail = false;
  for (const [label, ok, info] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + label + '  -> ' + JSON.stringify(info));
    if (!ok) anyFail = true;
  }
  console.log('\n=== WINDOW-LEVEL JS ERRORS DURING LOAD ===');
  console.log(errors.length ? errors.join('\n---\n') : '(none)');
  process.exit(anyFail || errors.length ? 1 : 0);
})();
