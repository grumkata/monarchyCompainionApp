/* ═══════════════════════════════════════════════════════════════
   THE DICE ROLLER
   One way to roll: type it in chat. The line it makes is the same for
   everybody at the table, and the dice are thrown onto the wood so you can
   watch them land — or `quiet` skips the throw.

   The numbers come from Math.random FIRST; the tumble is choreographed
   to land on them afterwards. The dice never decide anything, and a
   quiet roll and a thrown roll are the same roll.

   What is understood after /r — see 39-roll-parse.js, which reads the whole
   line or says why it cannot:
     /r 2d6+3 · /r d20 · /r 3 4d6 (three sets of four) · /r 4d6kh3
     /r (1d20+5)*2 · /r d% · /r flip · /r 3 flip
   There used to be a tray of dice buttons under the chat. It is gone: typing
   is faster, and it could not say 3 sets, or keep the highest three.
═══════════════════════════════════════════════════════════════ */
(function(){
const P = window.RollParse;
/* the dice the table has models and physics for; anything else still rolls,
   in chat, it is just not thrown */
const KINDS3D = [4,6,8,10,12,20,100];
/* more than this many on the wood is a pile, not a roll — chat still has them */
const MAX_THROWN = 30;

const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

/* ── the dice the table has to throw ──
   A d100 is two ten-siders, the way it is on a real table. */
function tableDice(res){
  const list = [];
  res.sets.forEach(s => s.groups.forEach(g => g.rolls.forEach(r => {
    if (g.coin){ list.push({kind:'coin', result:r.v}); return; }
    if (g.sides === 100){
      list.push({kind:10, result:r.tens === 0 ? 10 : r.tens});
      list.push({kind:10, result:r.units === 0 ? 10 : r.units});
      return;
    }
    if (KINDS3D.includes(g.sides)) list.push({kind:g.sides, result:r.v});
  })));
  return list;
}

/* do thrown dice land on the wood? Settings → The table. `quiet` in the
   roll text still overrides it for a single throw. */
const onWood = () => !(window.Options && window.Options.get('dice') === 'off');

/* ── chat ── */
/* WHO. This was hardcoded to 'GM' or the string 'Sir Aldric' — the demo
   fixture's character — so every roll anyone ever made in chat was signed
   by a person who is not at the table. The hall knows your name; use it. */
function speaker(){
  /* AT A LIVE TABLE THE SESSION SAYS WHO YOU ARE. ROLE is 29-role.js's
     constant and it is 'gm' on every machine, so at a live table every
     player's roll was signed "GM". */
  const S = window.Session;
  const gm = (S && S.live) ? S.role === 'gm'
                           : (typeof ROLE !== 'undefined' && ROLE === 'gm');
  if (gm) return 'GM';
  try {
    const me = JSON.parse(localStorage.getItem('monarchy.me.v1') || '{}');
    if (me && me.name && String(me.name).trim()) return String(me.name).trim();
  } catch (e) {}
  return 'You';
}

/* ── THE LINE ──
   One dice group is a run of chips; a die the roll did not keep (4d6kh3)
   is struck out; a natural 20 or 1 on a d20 is lit. A single set is the
   flat line it always was; several sets are one row each under one header. */
function chips(g){
  return g.rolls.map(r => {
    if (g.coin) return `<i class="cn">${r.v}</i>`;
    const nat = (g.sides === 20 && !r.drop) ? (r.v === 20 ? 'hi' : r.v === 1 ? 'lo' : '') : '';
    const cls = [nat, r.drop ? 'gone' : ''].filter(Boolean).join(' ');
    return cls ? `<i class="${cls}">${r.v}</i>` : `<i>${r.v}</i>`;
  }).join('');
}
function lineHTML(res, compact){
  const multi = res.sets.length > 1;
  const sets = res.sets.map(s => {
    const dice = compact ? '' : s.groups.map(chips).join('') + (s.tail ? `<u>${s.tail > 0 ? '+' : ''}${s.tail}</u>` : '');
    const rd = dice ? `<span class="rdice">${dice}</span>` : '';
    const tot = s.total == null ? '' : `<span class="rtot">${s.total}</span>`;
    return multi ? `<span class="rset">${rd}${tot}</span>` : rd + tot;
  }).join('');
  return `<b>${esc(speaker())}</b><span class="rspec">${esc(res.spec)}</span>` + sets;
}

function say(res, thrown){
  /* THE LINE TRAVELS AS TEXT, and the table caps that text (06-session.js).
     Two hundred struck-out dice would be cut off before the total — so a line
     that is too long is sent as totals alone. */
  let html = lineHTML(res, false);
  if (html.length > 3400) html = lineHTML(res, true);
  /* THE NUMBERS ARE DECIDED ONCE, BY WHOEVER ROLLED. Eleven clients each
     rolling their own would be eleven different answers to one roll. What
     goes on the wire is the line that was drawn here, and it comes back to
     this screen the same way it reaches theirs. 57-chat-net.js filters it on
     arrival, because by then it is markup from a machine nobody controls.

     AND THE DICE GO WITH IT. grumkata: "dice visually do not show for
     everyone they only show up in chat and visually for the one who
     rolled". They were kept back on purpose, and the reason was wrong: the
     tumble never decided anything (see the head of this file — the numbers
     come first and the throw is choreographed to land on them). So a throw
     is sent as its RESULTS, `thrown`, and every other table stages the same
     landing on those numbers. Nobody re-rolls anything. */
  if (atTable()) { window.Session.talk(html, 'roll', thrown && thrown.length ? { dice: thrown } : null); return; }
  const d = document.createElement('div');
  d.className = 'cl roll';
  d.innerHTML = html;
  const cb = document.getElementById('chat-body');
  cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}

/* returns { ok } or { ok:false, error } — the caller says what went wrong */
function roll(text, onTable){
  const res = P.roll(text);
  if (!res.ok) return res;
  let thrown = null;
  if (onTable && window.GLDice){
    const list = tableDice(res);
    if (list.length && list.length <= MAX_THROWN) thrown = list;
  }
  say(res, thrown);
  if (thrown) window.GLDice.spawn(thrown);
  return { ok: true };
}

/* ── SAYING SOMETHING ─────────────────────────────────────────
   A line of speech, in the same dock the rolls land in, so the two
   read as one conversation. Emotes with a leading /me, because that
   is the one bit of chat grammar everyone already knows.        */
/* ══ WHERE A LINE GOES ═══════════════════════════════════
   Alone, onto your own screen. At a live table, to the table — and back
   from it like everybody else's, so there is one copy of the conversation
   and no way for yours to drift from theirs.

   THIS HAS TO BE HERE, at the source. The first attempt wrapped
   `window.Dice.talk` from another file and it never ran once: the chat box
   calls the LOCAL `talk`, and reassigning a property on the exports object
   does nothing to a closure that was captured when this module loaded.
   Exported functions are a copy of the reference, not a hook. */
const atTable = () => !!(window.Session && window.Session.live);

function talk(text){
  const t = String(text || '').trim(); if (!t) return false;
  if (atTable()) {
    window.Session.talk(t, /^\/me\s+/i.test(t) ? 'emote' : 'say');
    return true;
  }
  const cb = document.getElementById('chat-body');
  if (!cb) return false;
  const emote = /^\/me\s+/i.test(t);
  const body = emote ? t.replace(/^\/me\s+/i, '') : t;
  const d = document.createElement('div');
  d.className = 'cl said' + (emote ? ' emote' : '');
  d.innerHTML = emote
    ? `<span class="stxt"><b>${esc(speaker())}</b> ${esc(body)}</span>`
    : `<b>${esc(speaker())}</b><span class="stxt">${esc(body)}</span>`;
  cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
  return true;
}

/* ── A SKILL, ROLLED THE WAY THE BOOK SAYS ───────────────────
   d6 equal to the active attribute; the skill's total is spent on the two edits
   that are plain arithmetic — a 1 struck out, a die walked up to 6 (the rules
   engine's autoSpend; it never rerolls, because a reroll is the player's gamble
   to take); successes are 6s minus 1s. A crit reads the RAW roll. The throw on
   the wood shows the raw dice; the line in chat shows what they came to. */
function rollSkill(o){
  const R = window.RULES;
  if (!R || !R.roll) return { ok:false, error:'The rules are not loaded.' };
  const pool = Math.max(0, Math.min(20, parseInt(o.pool, 10) || 0));
  if (pool < 1){ notice((o.attrName || 'That attribute') + ' is 0 — there is nothing to roll with.'); return { ok:false }; }
  const budget = Math.max(0, Math.min(99, parseInt(o.budget, 10) || 0));
  const raw = R.roll(pool);
  const ed = R.autoSpend(raw, budget);
  const cr = R.crit(raw);
  const label = { 'super-crit':'Super critical success', crit:'Critical success',
                  fail:'Critical failure', 'super-fail':'Super critical failure' }[cr] || '';
  const spec = `${o.skill || 'Skill'} · ${o.attrName || 'Attribute'} ${pool}d6 · skill ${budget}`
             + (ed.spent ? ` (spent ${ed.spent})` : '');
  const dice = raw.map((v, i) => {
    const n = ed.dice[i];
    if (n === null) return `<i class="gone">${v}</i>`;
    if (n !== v) return `<i class="up hi">${n}</i>`;
    return n === 6 ? `<i class="hi">${n}</i>` : n === 1 ? `<i class="lo">${n}</i>` : `<i>${n}</i>`;
  }).join('');
  const html = `<b>${esc(speaker())}</b><span class="rspec">${esc(spec)}</span>`
    + `<span class="rdice">${dice}</span><span class="rtot">${ed.successes}</span>`
    + `<span class="rspec">successes</span>` + (label ? `<span class="rspec">${label}</span>` : '');
  const thrown = (onWood() && window.GLDice && pool <= MAX_THROWN) ? raw.map(v => ({ kind:6, result:v })) : null;
  if (atTable()) window.Session.talk(html, 'roll', thrown ? { dice: thrown } : null);
  else {
    const d = document.createElement('div');
    d.className = 'cl roll'; d.innerHTML = html;
    const cb = document.getElementById('chat-body');
    if (cb){ cb.appendChild(d); cb.scrollTop = cb.scrollHeight; }
  }
  if (thrown) window.GLDice.spawn(thrown);
  return { ok:true, successes: ed.successes, crit: cr };
}

/* A LINE ONLY YOU SEE: why a roll was refused, what the commands are. It is
   not sent to the table and is not kept. */
function notice(text){
  const cb = document.getElementById('chat-body'); if (!cb) return;
  const d = document.createElement('div');
  d.className = 'cl said sys';
  d.innerHTML = `<span class="stxt">${esc(text)}</span>`;
  cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}
const HELP = 'Dice: /r 2d6+3  ·  /r 3 4d6 (three sets of four)  ·  /r 4d6kh3 (keep the highest 3)  ·  '
           + '/r (1d20+5)*2  ·  /r d%  ·  /r flip.  Add "quiet" to skip the 3D dice.  /me for an emote.';

/* a line with nothing but dice-shaped characters, which also parses, is a roll
   without a /r in front: "2d6", "3 4d6", "flip". Anything else is talk. */
const bareRoll = v => /^(?:[\d\s+\-*\/().x×%dkhl]|flips?|coins?)+$/i.test(v) && P.parse(v).ok;

/* ── chat as a roll box ── */
function hookChat(){
  const inp = document.getElementById('chat-in');
  const go  = document.getElementById('chat-go');
  if (!inp) return;
  inp.placeholder = 'Say something, or roll  ·  /r 3 4d6';
  inp.maxLength = 400;                                   /* a line, not a document */
  let last = 0;
  const send = () => {
    const v = inp.value.trim(); if (!v) return true;
    /* one line at a time: eleven people and a held Enter key are a flood */
    const now = Date.now();
    if (now - last < 350) return false;
    last = now;
    if (/^\/help\b/i.test(v)){ notice(HELP); inp.value = ''; return false; }
    const explicit = /^\/(roll|r)(?![a-z])/i.test(v);
    if (explicit || bareRoll(v)){
      const quiet = /\bquiet\b/i.test(v);
      const out = roll(v.replace(/\bquiet\b/ig, ''), !quiet && onWood());
      if (out.ok){ inp.value = ''; return false; }
      /* a refused /r keeps what you typed, so it can be mended */
      if (explicit){ notice(out.error); return false; }
    }
    /* a command that is not one: say so, to you alone, rather than telling
       the whole table "/rol 2d6" */
    if (/^\/(?!me\b)\S/i.test(v)){
      notice('Not a command I know. /r rolls dice, /me is an emote, /help lists them.');
      return false;
    }
    /* NOT DICE — SO IT IS SPEECH, AND IT HAS TO GO SOMEWHERE.
       This used to `return true` to "let the normal chat handler have
       it", and there was no normal chat handler: nothing else in the
       app listens on this box. Words were not sent, not shown, and the
       input was not even cleared. A table has to be able to talk. */
    talk(v);
    inp.value = '';
    return false;
  };
  inp.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter') return;
    if (!send()){ ev.stopPropagation(); ev.preventDefault(); }
  }, true);
  go.addEventListener('click', ev => {
    if (!send()){ ev.stopPropagation(); ev.preventDefault(); }
  }, true);
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', hookChat);
else hookChat();

window.Dice = { roll, rollSkill, parse: P.parse, talk, speaker, onWood, notice };
})();
