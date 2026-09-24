/* ══════════════════════════════════════════════════════════════
   59-table-menu.js — THE MENU.

   grumkata: "the table needs a real menu not random buttons all over the
   place [...] that stupid page back button in the top left instead make it
   an escape key and menu button in the top left that THEN brings you to
   menu that lets yuou chose leaving the table hosting ect ect ect".

   And: "hosting should be a thing you can do in the table not on opening
   thats so fucking dumb".

   Both are the same complaint. The table had a Back button in one corner, a
   Theme and a Fit in another, and hosting was a decision you had to make in
   the hall before you had even seen the wood. None of those is where a
   person would look for them, because a person looks in one place: the
   menu.

   So there is one, it opens with Escape or the mark in the top left, and
   everything that is a DECISION ABOUT THIS TABLE rather than a thing you do
   TO the wood is in it. Escape closes it again, which is the same key,
   because that is how every menu anybody has ever used works.

   ── WHAT IS NOT IN HERE ──────────────────────────────────────
   Anything you do to the board. Fit, zoom, the chest, the bin, the dice —
   those are tools you use while looking at the table, and burying a tool
   you reach for forty times an evening inside a menu is the opposite of
   this fix. The test is whether it is a decision or a gesture: leaving is a
   decision, fitting the view is a gesture.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let el = null, open = false;
let view = 'main';        /* 'main' | 'settings' */

const S = () => root.Session;
const live = () => !!(S() && S().live);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ══ THE MARK, TOP LEFT ════════════════════════════════════════ */
function mount() {
  if (doc.getElementById('tm-open')) return;
  const b = doc.createElement('button');
  b.id = 'tm-open';
  b.className = 'tm-open';
  b.title = 'Menu  ·  Esc';
  b.innerHTML = '<i></i><i></i><i></i>';
  b.addEventListener('click', toggle);
  doc.body.appendChild(b);

  el = doc.createElement('div');
  el.id = 'tmenu';
  el.className = 'tmenu';
  el.hidden = true;
  el.addEventListener('click', onClick);
  doc.body.appendChild(el);
}

/* ══ WHAT IS IN IT ═════════════════════════════════════════════
   Written out rather than assembled from state, because a menu that
   rearranges itself is a menu you have to read every time. The only thing
   that changes is which of the two hosting lines is showing, and that IS
   the state you came here to look at. */
function draw() {
  if (view === 'settings') return drawSettings();
  const word = live() ? S().word : '';
  const role = live() ? S().role : '';
  const n = live() ? S().members.length : 0;
  const net = root.Net;
  const local = net && net.mode === 'local';

  el.innerHTML =
    '<div class="tm-card">' +
      '<div class="tm-head">' +
        '<b>' + esc(tableName()) + '</b>' +
        (live()
          ? '<span class="tm-word">' + esc(word) + '</span>'
          : '') +
      '</div>' +

      (live()
        ? '<div class="tm-who">' + n + (n === 1 ? ' seat' : ' seats') +
            ' · you are the ' + (role === 'gm' ? 'GM' : 'player') +
            (local ? ' · this machine only' : '') + '</div>'
        : '') +

      (said
        ? '<div class="tm-note' + (said[0] === '!' ? ' bad' : '') + '">' +
          esc(said[0] === '!' ? said.slice(1) : said) + '</div>'
        : '') +

      '<div class="tm-rows">' +
        (live()
          ? (role === 'gm'
              ? row('close', 'Stop hosting', 'gules')
              : row('leave-live', 'Leave the game', 'gules'))
          : row('host', working ? 'Opening…' : 'Host this table', 'or', working)) +

        /* the GM hands the players a pen, or takes it back (61-ink.js) */
        (live() && role === 'gm'
          ? row('pens', 'Players may draw · ' + (S().allowed('draw') ? 'Yes' : 'No'))
          : '') +

        row('fit', 'Fit the table') +
        row('settings', 'Settings') +
        row('hall', 'Back to the hall') +
      '</div>' +


    '</div>';
}

/* ══ SETTINGS, WITHOUT LEAVING ═════════════════════════════════
   grumkata: "when you click settings it kicks you out of the table for some
   reason and sends you back to the hall".

   The reason was that Settings is a cloth in the hall, and the hall's
   stylesheet only exists while you are standing in it (tools/scope-css.js),
   so the row walked you out to get there — which at a live table means
   leaving the room everybody else is in to change a slider. The switches
   themselves were never the hall's: they are 07-options.js's, which reaches
   both halves. So they are drawn here, on this card, from the same
   declaration the hall draws them from. What is left in the hall is about
   YOU and this machine — your name, your likeness, the multiplayer config,
   what is kept — none of which is a thing you change mid-game. */
function drawSettings() {
  const O = root.Options;
  const full = !!doc.fullscreenElement;
  const chips = (k, list) => '<div class="tm-chips">' + list.map(([v, name, on]) =>
    '<button class="tm-chip' + (on ? ' on' : '') + '" data-opt="' + k + '" data-v="' +
    esc(v) + '">' + esc(name) + '</button>').join('') + '</div>';
  const opt = (name, body) => '<div class="tm-opt"><span>' + esc(name) + '</span>' + body + '</div>';

  const groups = O ? O.groups() : [];
  el.innerHTML =
    '<div class="tm-card tm-set">' +
      '<div class="tm-head"><b>Settings</b></div>' +
      groups.map((g, i) =>
        '<div class="tm-grp">' + esc(g.name) + '</div>' +
        (i === 0 ? opt('Full screen', chips('__full',
          [['off', 'Windowed', !full], ['on', 'Full screen', full]])) : '') +
        g.keys.map(k => {
          const d = O.DEFS[k];
          return opt(d.t, chips(k, d.of.map(v => [v, d.say[v], O.get(k) === v])));
        }).join('')
      ).join('') +
      '<div class="tm-rows">' + row('back', 'Back') + '</div>' +
    '</div>';
}
function setOpt(k, v) {
  if (k === '__full') {
    const want = v === 'on';
    try {
      if (want && !doc.fullscreenElement) doc.documentElement.requestFullscreen();
      if (!want && doc.fullscreenElement) doc.exitFullscreen();
    } catch (e) {}
    return setTimeout(() => { if (open) draw(); }, 120);
  }
  if (root.Options) root.Options.set(k, v);
  if (open) draw();
}

/* `tone` marks the one row on this card that is the reason you opened it:
   Or for the thing to do next, Gules for the thing that ends something. The
   rest are plain, because a menu where everything is emphasised is a menu
   where nothing is. */
function row(act, name, tone, off) {
  return '<button class="tm-row' + (tone ? ' is-' + tone : '') + (off ? ' busy' : '') +
         '" data-tm="' + act + '"' + (off ? ' disabled' : '') + '>' +
         esc(name) + '</button>';
}

function tableName() {
  const hud = doc.querySelector('.hud.tl');
  const txt = hud && [...hud.childNodes].find(x => x.nodeType === 3);
  return (txt && txt.nodeValue.trim()) || 'The Table';
}

/* ══ DOING THEM ════════════════════════════════════════════════ */
function onClick(e) {
  /* the scrim: anywhere off the card shuts it, which is the other half of
     "Escape closes it" */
  if (e.target === el) return shut();
  const o = e.target.closest('[data-opt]');
  if (o) return setOpt(o.dataset.opt, o.dataset.v);
  const b = e.target.closest('[data-tm]');
  if (!b) return;
  const act = b.dataset.tm;

  if (act === 'hall') { shut(); return root.Shell.backToHall(); }
  if (act === 'fit') { shut(); return root.Table3D && root.Table3D.fit(); }
  /* THERE IS NO LIGHT THEME, so there was no business having a switch for
     one. `body.dark` matched two rules in 12-combat.css and nothing at all
     anywhere else: it is a survivor of the theme system Blazon replaced,
     and the button had been doing nothing since. Settings is what belongs
     in that row — and it opens on this card (drawSettings), not in the
     hall, so nobody is walked out of a game to change one. */
  if (act === 'settings') { view = 'settings'; said = ''; return draw(); }
  if (act === 'back') { view = 'main'; return draw(); }

  if (act === 'pens') {
    return S().allow({ draw: !S().allowed('draw') })
      .then(() => draw(), e => note(reason(e), true));
  }
  if (act === 'host') return startHosting();
  if (act === 'close') return S().leave().then(() => { draw(); });
  /* A PLAYER WHO LEAVES GOES HOME. grumkata: "when you leave the table as a
     player your still at the table just like a dm hosting it treats you the
     same". Stopping hosting leaves a GM at their own table, because it IS
     theirs. A player's table was the GM's board, and with the session gone
     it is nobody's — so leaving it walks you back to the hall. */
  if (act === 'leave-live') {
    shut();
    return S().leave().then(() => root.Shell.backToHall());
  }
}

/* ── hosting, from inside the table, where you can see it ───── */
function startHosting() {
  const id = (root.TableBoot && root.TableBoot.standing) || null;
  if (!id) return note('This table is not open yet', true);
  const name = tableName();
  /* SAY SOMETHING IMMEDIATELY. Going live is not instant — signing in and
     the first write took seven seconds on the day this was written, because
     Firebase retries a refused write several times before it gives up — and
     a button that greys out and then does nothing for seven seconds is a
     button that looks broken. */
  busy(true);
  note('Opening the table…');
  S().host(id, { name: name }).then(() => {
    busy(false); note('');
  }).catch(e => {
    busy(false);
    note(reason(e), true);
  });
}

/* WHAT WENT WRONG, IN WORDS. PERMISSION_DENIED is the one that will
   actually happen: it means the database rules have not been set, which is
   a thing the person reading this can fix in two minutes and cannot guess
   from silence. */
function reason(e) {
  const m = String((e && (e.code || e.message)) || e || '');
  if (/PERMISSION_DENIED|permission_denied/i.test(m))
    return 'The database refused it — its rules have not been set (see MULTIPLAYER.md)';
  if (/already at a table/i.test(m)) return 'You are already at a live table';
  return m || 'That did not work';
}

/* kept as state rather than poked onto the button, because note() redraws
   the whole card and a class set on the old node would go with it */
let working = false;
function busy(on) { working = !!on; if (open) draw(); }
/* WHERE A MESSAGE BELONGS IS WHERE THE ACTION WAS. This went through
   Herald.proclaim, which throws a word across the whole screen in type
   clamped between 46 and 124 pixels — built for ROUND THREE and FORTUNE,
   and hopeless for a sentence, which overflowed the band it was painted on.
   An answer to a button you just pressed goes next to that button. */
let said = '';
function note(text, bad) {
  said = text ? (bad ? '!' : '') + text : '';
  if (open) draw();
}

/* ══ OPENING AND SHUTTING ══════════════════════════════════════ */
function show() { mount(); said = ''; view = 'main'; draw(); el.hidden = false; open = true;
                  doc.body.classList.add('menuing'); }
function shut() { if (!el) return; el.hidden = true; open = false;
                  doc.body.classList.remove('menuing'); }
function toggle() { open ? shut() : show(); }

/* ── ESCAPE, AND WHAT ELSE ESCAPE ALREADY MEANS ───────────────
   It is the table's own leave key everywhere else in this app, and there
   are three things already using it on this screen: a reading of a record,
   the chest, and a field you are typing in. This runs LAST, so anything
   with something to close closes it first and the menu only answers when
   Escape would otherwise have done nothing. */
/* Bound on `window` in the BUBBLE phase, which puts it after every
   document-level handler on the table — 23-table3d.js steps out of a field,
   then a lock, then a selection; 45-papers.js puts a record down;
   25-toolbox.js shuts the chest; 47-hand.js drops what you are holding.
   Each of those is a thing Escape should do FIRST. The menu is what Escape
   means when it would otherwise have meant nothing.

   Every lookup is guarded, because most of these elements are built lazily
   and a throw here would take the key out altogether — which is exactly
   what happened the first time. */
function somethingElseIsOpen() {
  const a = doc.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { a.blur(); return true; }
  const tp = doc.getElementById('tp');
  if (tp && !tp.hidden) return true;                     /* a record is up */
  if (doc.body.classList.contains('holding')) return true;
  if (doc.body.classList.contains('locked-in')) return true;
  try { if (root.Toolbox && root.Toolbox.isOpen && root.Toolbox.isOpen()) return true; }
  catch (e) {}
  try { if (root.TableModel && root.TableModel.state && root.TableModel.state.sel) return true; }
  catch (e) {}
  /* the kit's pen, pointer or card, and a note up in your hand */
  try { if (root.Kit && root.Kit.busy()) return true; } catch (e) {}
  try { if (root.Pocket && root.Pocket.isOpen()) return true; } catch (e) {}
  return false;
}
root.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!doc.body.classList.contains('at-table')) return;
  if (open) { shut(); e.preventDefault(); return; }
  /* SOMETHING ELSE ALREADY ANSWERED IT. Every handler before this one puts
     its own thing away and says so with preventDefault — and then, a
     moment later, somethingElseIsOpen() finds nothing open (it has just
     been shut) and the menu came up as well. One Escape, one step. */
  if (e.defaultPrevented) return;
  if (somethingElseIsOpen()) return;
  show(); e.preventDefault();
});

root.addEventListener('monarchy:session', e => {
  const d = e.detail || {};
  /* the GM closed the table under a player: same as leaving it, and they
     are told where they will be looking — the hall — rather than in the
     table's chat, which they are about to stop seeing */
  if (d.what === 'closed' && d.was === 'player' && doc.body.classList.contains('at-table')) {
    shut();
    root.Shell.backToHall();
    setTimeout(() => { if (root.Menu && root.Menu.toast) root.Menu.toast('The GM has closed the table'); }, 700);
    return;
  }
  if (open) draw();
});
root.addEventListener('monarchy:opts', () => { if (open && view === 'settings') draw(); });
doc.addEventListener('fullscreenchange', () => { if (open && view === 'settings') draw(); });
root.addEventListener('monarchy:where', e => {
  if (!e.detail || e.detail.at !== 'table') shut(); else mount();
});

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.TableMenu = { show, shut, toggle, get open() { return open; } };

})(window, document);
