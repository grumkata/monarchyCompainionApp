// electron/content.js
//
// UPDATES WITHOUT REINSTALLING.
//
// grumkata: "i didnt realise by update it was literally just reinstalling it
// every time which isnt what a fucking update is [...] make updates work how
// i belive they should where i update github repo change the update number
// to say its an update and all monarchy versions will update without going
// through the install process every time".
//
// He is right about what an update should be for this app. Everything that
// changes from one week to the next — the hall, the table, the rules, the
// pictures — is the built page in dist/. The program around it (Electron,
// this folder) almost never changes. electron-updater replaced the whole
// program to deliver a new page: a 100MB installer, an install wizard, and a
// GitHub release somebody had to make by hand.
//
// So this updates the PAGE, straight from the repo:
//
//   1. dist/update.json on GitHub (written by build.js) says which version
//      is there and lists every file in dist/ with its sha256.
//   2. If that version is newer than the one on screen, the files whose
//      hashes this copy does not already have are downloaded — usually just
//      monarchy.html, since the pictures rarely change — and every one is
//      checked against its hash before it is kept.
//   3. They are put together in userData/content/<version>/, a copy of dist/
//      in its own folder, and current.json is pointed at it.
//   4. The window loads the newest copy there is: this folder's, or the one
//      that shipped inside the program, whichever is higher. The hall offers
//      to switch straight away (a reload, about a second), and the next
//      launch uses it regardless.
//
// Local storage — characters, tables, your arms — is kept across the switch:
// every page loaded from disk shares the one `file://` origin, so moving the
// page to another folder moves nothing that the page has saved.
//
// WHAT THIS CANNOT DO is change the program itself: this file, main.js,
// preload.js, the Electron version. For those electron-updater and a real
// release are still there (updater.js). A page that needs a newer program
// says so with `shell` in update.json, and a copy whose SHELL_API is lower
// leaves it alone rather than loading a page it cannot run.

const { app, net } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const OWNER = 'grumkata';
const REPO = 'monarchyCompainionApp';
const BRANCH = 'main';
/* what this program offers a page. Raise it together with build.js's
   NEEDS_SHELL when a page starts depending on something new in here. */
const SHELL_API = 1;

/* For testing against a local server instead of GitHub. Only read from the
   environment of the machine the app is running on. */
const TEST_BASE = process.env.MONARCHY_UPDATE_BASE || '';

const BUNDLED = path.join(__dirname, '..', 'dist');
const root = () => path.join(app.getPath('userData'), 'content');

const VERSION = /^\d{1,6}(\.\d{1,6}){0,3}$/;
/* a path inside dist/: plain names, forward slashes, no way out of it */
const SAFE_PATH = /^(?!.*\.\.)(?!\/)[A-Za-z0-9_\-][A-Za-z0-9_\-. /]*$/;

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}
/* is version a higher than b, part by part */
function newer(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}
const hash = buf => crypto.createHash('sha256').update(buf).digest('hex');
const inside = (dir, rel) => path.join(dir, ...rel.split('/'));

/* ── WHICH PAGE TO LOAD ─────────────────────────────────────── */
function bundled() {
  const m = readJSON(path.join(BUNDLED, 'update.json'));
  return { dir: BUNDLED, version: (m && m.version) || app.getVersion() };
}
function downloaded() {
  const cur = readJSON(path.join(root(), 'current.json'));
  if (!cur || !VERSION.test(String(cur.version || ''))) return null;
  const dir = path.join(root(), cur.version);
  const m = readJSON(path.join(dir, 'update.json'));
  if (!m || m.version !== cur.version || (m.shell || 1) > SHELL_API) return null;
  if (!fs.existsSync(path.join(dir, 'monarchy.html'))) return null;
  return { dir, version: m.version };
}
/* the newest page this copy has: the one that came with it, or a later
   one it has fetched since */
function pick() {
  const b = bundled(), d = downloaded();
  return (d && newer(d.version, b.version)) ? d : b;
}

let running = null;       /* what the window has loaded */
let ready = null;         /* a newer page, fetched and waiting */
let busy = false;

function load(win) {
  running = pick();
  ready = null;
  return win.loadFile(path.join(running.dir, 'monarchy.html'));
}

/* ── THE WIRE ───────────────────────────────────────────────── */
async function get(url, headers) {
  const res = await net.fetch(url, { headers: Object.assign({ 'User-Agent': 'monarchy-app' }, headers || {}) });
  if (!res.ok) throw new Error(res.status + ' for ' + url);
  return Buffer.from(await res.arrayBuffer());
}
/* THE COMMIT, NOT THE BRANCH. Files are fetched from one exact commit, so a
   push landing halfway through a download cannot mix two versions — and a
   commit's files never change, so GitHub's caching cannot serve a stale
   one. One API call per check; if it is refused (the anonymous limit is 60
   an hour per address), the branch is used with the cache bypassed. */
async function head() {
  if (TEST_BASE) return null;
  try {
    const sha = (await get(`https://api.github.com/repos/${OWNER}/${REPO}/commits/${BRANCH}`,
      { Accept: 'application/vnd.github.sha' })).toString('utf8').trim();
    return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
  } catch (e) { return null; }
}
function rawURL(ref, rel, bust) {
  const p = rel.split('/').map(encodeURIComponent).join('/');
  const base = TEST_BASE || `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/dist`;
  return `${base.replace(/\/$/, '')}/${p}${bust ? '?t=' + bust : ''}`;
}

/* a few at a time, not seventy at once */
async function each(list, n, fn) {
  let i = 0;
  const run = async () => { while (i < list.length) { const x = list[i++]; await fn(x); } };
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, run));
}

/* ── LOOKING FOR ONE ────────────────────────────────────────── */
async function check(report) {
  if (busy) return;
  busy = true;
  let stage = null;
  try {
    report({ state: 'checking' });
    const sha = await head();
    const ref = sha || BRANCH;
    const bust = sha ? 0 : Date.now();
    const m = JSON.parse((await get(rawURL(ref, 'update.json', bust))).toString('utf8'));
    const have = ready ? ready.version : running.version;

    if (!m || !VERSION.test(String(m.version || '')) || !newer(m.version, have)) {
      report(ready ? { state: 'downloaded', latest: ready.version }
                   : { state: 'not-available' });
      return;
    }
    if ((m.shell || 1) > SHELL_API) {
      console.log('[content] ' + m.version + ' needs a newer program (shell ' + m.shell + ')');
      report({ state: 'not-available', needsShell: m.version });
      return;
    }
    const files = Object.keys(m.files || {});
    if (!files.length || !files.includes('monarchy.html') ||
        files.some(f => !SAFE_PATH.test(f) || !/^[0-9a-f]{64}$/.test(m.files[f])))
      throw new Error('update.json for ' + m.version + ' does not look right');

    /* put together beside the live copies, then moved into place whole */
    await fsp.mkdir(root(), { recursive: true });
    stage = path.join(root(), '.staging-' + m.version);
    await fsp.rm(stage, { recursive: true, force: true });
    const reuse = [running.dir, BUNDLED].concat(ready ? [ready.dir] : []);
    let done = 0, fetched = 0;
    report({ state: 'downloading', percent: 0, latest: m.version });
    await each(files, 6, async rel => {
      const want = m.files[rel];
      const dst = inside(stage, rel);
      await fsp.mkdir(path.dirname(dst), { recursive: true });
      /* a file this copy already has, byte for byte, is not fetched again */
      for (const dir of reuse) {
        try {
          const buf = await fsp.readFile(inside(dir, rel));
          if (hash(buf) === want) { await fsp.writeFile(dst, buf); done++; return; }
        } catch (e) { /* not here */ }
      }
      const buf = await get(rawURL(ref, rel, bust));
      if (hash(buf) !== want) throw new Error(rel + ' did not match its hash');
      await fsp.writeFile(dst, buf);
      done++; fetched++;
      report({ state: 'downloading', percent: Math.round(done * 100 / files.length), latest: m.version });
    });
    await fsp.writeFile(path.join(stage, 'update.json'), JSON.stringify(m));

    const final = path.join(root(), m.version);
    await fsp.rm(final, { recursive: true, force: true });
    await fsp.rename(stage, final);
    /* written beside and renamed over, so a crash mid-write cannot leave a
       half-written pointer for the next launch to trip on */
    const tmp = path.join(root(), 'current.json.tmp');
    await fsp.writeFile(tmp, JSON.stringify({ version: m.version }));
    await fsp.rename(tmp, path.join(root(), 'current.json'));

    stage = null;
    ready = { dir: final, version: m.version };
    console.log(`[content] ${m.version} ready — ${fetched} file(s) fetched, ${files.length - fetched} already here`);
    prune();
    report({ state: 'downloaded', latest: m.version });
  } catch (e) {
    /* a dead network or a half-pushed repo is not an application error:
       the page on screen carries on, and the next check tries again */
    console.error('[content] check failed (carrying on with ' + (running && running.version) + '):',
      e && e.message);
    report(ready ? { state: 'downloaded', latest: ready.version } : { state: 'error' });
    /* a half-built copy is thrown away, not left for the next launch */
    if (stage) fsp.rm(stage, { recursive: true, force: true }).catch(() => {});
  } finally {
    busy = false;
  }
}

/* keep what is on screen and what is waiting; the rest is old */
async function prune() {
  try {
    const keep = new Set([running && running.dir, ready && ready.dir].filter(Boolean));
    for (const e of await fsp.readdir(root(), { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const dir = path.join(root(), e.name);
      if (!keep.has(dir)) await fsp.rm(dir, { recursive: true, force: true });
    }
  } catch (e) { /* tidying is never worth failing over */ }
}

/* switch the window to the page that is waiting */
function apply(win) {
  if (!ready || !win || win.isDestroyed()) return false;
  load(win);
  return true;
}

/* updates come from the repo only in a real installed copy — `npm start`
   is for looking at the dist/ you just built, not at GitHub's */
const enabled = () => app.isPackaged || !!TEST_BASE;

module.exports = {
  load, check, apply, enabled, newer,
  get running() { return running; },
  get ready() { return ready; }
};
