/* Targeted test for the multi-sheet-instance mechanism (16-multi-sheet.js).
   Mirrors test/smoke.js's harness. Run with: node test/multi-sheet.test.js */
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
    window.HTMLCanvasElement.prototype.getContext = () => ({
      clearRect(){}, beginPath(){}, arc(){}, fill(){}, save(){}, restore(){},
      translate(){}, rotate(){}, moveTo(){}, lineTo(){}, closePath(){}, fillRect(){}
    });
    window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.onerror = (msg) => { errors.push(String(msg)); };
    window.addEventListener('error', (e) => { errors.push(e.error ? String(e.error.stack||e.error) : String(e.message)); });
  }
});
const { window } = dom;
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Fires input+change with a real value, the same way a person typing would,
// so it goes through the document-level scheduleAutosave listener exactly
// like it does for a real user.
function setFieldValue(win, id, value) {
  win.eval(`
    (function(){
      const el = document.getElementById(${JSON.stringify(id)});
      if (!el) throw new Error('no element with id ' + ${JSON.stringify(id)});
      el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event('input', {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
    })();
  `);
}

function activate(win, winId) {
  win.eval(`
    (function(){
      const inst = _sheetInstances.find(i => i.winId === ${JSON.stringify(winId)});
      if (!inst) throw new Error('no instance ' + ${JSON.stringify(winId)});
      inst.winEl.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
    })();
  `);
}

(async () => {
  await wait(300);
  const results = [];
  function check(label, fn) {
    try { const r = fn(); results.push([label, true, r]); }
    catch (e) { results.push([label, false, e.message]); }
  }
  async function checkAsync(label, fn) {
    try { const r = await fn(); results.push([label, true, r]); }
    catch (e) { results.push([label, false, e.message]); }
  }

  // --- baseline: original instance registered itself on load ---
  check('original instance auto-registered as "sheet"', () =>
    window.eval("_sheetInstances.some(i => i.winId === 'sheet')"));
  check('original instance is active by default', () =>
    window.eval("_activeSheetRoot === document.getElementById('sheet-root')"));

  // --- name instance 1, so we can tell it apart from instance 2 ---
  setFieldValue(window, 'id-name', 'Sir Reginald');
  check('instance 1 name set', () => window.eval("val('id-name')") === 'Sir Reginald');

  // --- create a second, independent instance ---
  check('createSheetInstance runs cleanly', () => { window.eval("createSheetInstance({title:'Test Two'})"); return true; });
  check('two instances now tracked', () => window.eval("_sheetInstances.length") === 2);
  check('second window actually registered with WM', () =>
    window.eval("!!document.querySelector('.table-window[data-window-id=\"sheet-2\"]')"));
  check('enableScaling actually wired up the second instance (scale wrapper present)', () =>
    window.eval(`!!document.querySelector('.table-window[data-window-id="sheet-2"] .window-scale-outer')`));
  check('no duplicate #sheet-root id in the DOM', () =>
    window.eval("document.querySelectorAll('#sheet-root').length") === 1);

  // instance 2 is active immediately after creation (createSheetInstance activates it)
  check('instance 2 is active right after creation', () =>
    window.eval("_activeSheetRoot === _sheetInstances[1].root"));
  check('instance 2 starts blank, not a copy of instance 1', () =>
    window.eval("val('id-name')") === '');

  setFieldValue(window, 'id-name', 'Grakthar the Orc');
  check('instance 2 name set independently', () => window.eval("val('id-name')") === 'Grakthar the Orc');

  // --- switch back to instance 1 via simulated focus (mousedown), confirm
  //     its OWN value survived untouched while instance 2 was active ---
  activate(window, 'sheet');
  await wait(20);
  check('switching back to instance 1 restores ITS OWN name (no cross-contamination)', () =>
    window.eval("val('id-name')") === 'Sir Reginald');
  check('instance 1 now owns the ids again', () =>
    window.eval("_activeSheetRoot === document.getElementById('sheet-root')"));
  check('instance 2 no longer owns any live ids', () =>
    window.eval("_sheetInstances[1].root.querySelector('#id-name') === null"));
  check('instance 2 kept its OWN value in its own DOM subtree while unclaimed', () =>
    window.eval("_sheetInstances[1].root.querySelector('[data-field=\"id-name\"]').value") === 'Grakthar the Orc');

  // --- the debounce race: edit instance 1, then IMMEDIATELY switch to
  //     instance 2 before the 4s autosave debounce would normally fire.
  //     First need instance 1 to actually have a save slot to write to. ---
  window.eval(`
    (function(){
      const saves = getSaves();
      const id = 'char_test1';
      saves[id] = {name:'Sir Reginald', date:'', data:{}};
      _ls.set('monarchy_v3_saves', JSON.stringify(saves));
      setActiveSave(id, 'Sir Reginald');
    })();
  `);
  setFieldValue(window, 'id-culture', 'Ashford Marches'); // schedules a real autosave (4s debounce)
  activate(window, 'sheet-2'); // switch away almost immediately - well under 4s
  await wait(20);
  check('outgoing autosave was flushed immediately on switch, not lost', () =>
    window.eval("JSON.parse(_ls.get('monarchy_v3_saves'))['char_test1'].data.id.culture") === 'Ashford Marches');
  check('the flushed save landed in instance 1 own slot, not instance 2', () =>
    window.eval("_sheetInstances[1].root.dataset.activeSaveId") !== 'char_test1');

  // --- global invariant: no duplicate ids anywhere, at any point above ---
  check('no duplicate ids exist anywhere in the document (final state)', () => {
    const dupeCheck = window.eval(`
      (function(){
        const seen = {}; const dupes = [];
        document.querySelectorAll('[id]').forEach(el => {
          if (seen[el.id]) dupes.push(el.id); else seen[el.id] = true;
        });
        return dupes;
      })();
    `);
    if (dupeCheck.length) throw new Error('duplicate ids: ' + dupeCheck.join(', '));
    return true;
  });

  console.log('\n=== MULTI-SHEET TEST RESULTS ===');
  let failed = 0;
  for (const [label, ok, detail] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + label + '  -> ' + JSON.stringify(detail));
    if (!ok) failed++;
  }
  console.log('\n=== WINDOW-LEVEL JS ERRORS DURING RUN ===');
  console.log(errors.length ? errors.join('\n---\n') : '(none)');
  process.exit(failed || errors.length ? 1 : 0);
})();
