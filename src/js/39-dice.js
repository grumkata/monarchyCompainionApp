/* ═══════════════════════════════════════════════════════════════
   THE DICE ROLLER
   Two ways to roll, both producing the same line in chat:
     · ON THE TABLE — the dice are thrown onto the tray, settle, are
       readable for a couple of seconds, then fade off the wood.
     · QUIET        — the same roll, no dice, straight to chat.

   The numbers come from Math.random FIRST; the tumble is choreographed
   to land on them afterwards. The dice never decide anything, and a
   quiet roll and a thrown roll are the same roll.

   Notation: 2d6+3 · d20 · 4d6 2d8+1 · d100 · flip · 3 flip
   Typed into chat, or built with the tray under it.
═══════════════════════════════════════════════════════════════ */
(function(){
const KINDS = [4,6,8,10,12,20,100];
const rnd = n => Math.floor(Math.random()*n) + 1;

/* ── parsing ───────────────────────────────────────────────────
   Accepts several terms in one roll, each with its own modifier, and
   treats "flip"/"coin" as a die with two faces and no number. */
function parse(text){
  const terms = [];
  const src = String(text).trim().toLowerCase()
    .replace(/^\/(roll|r)\s+/,'')
    .replace(/([+-]\s*\d+)/g,' $1 ')
    .replace(/\s+/g,' ');
  const re = /(\d*)\s*(d\s*(\d+)|flips?|coins?)\s*([+-]\s*\d+)?/g;
  let m;
  while ((m = re.exec(src))){
    const n = Math.min(50, Math.max(1, parseInt(m[1] || '1', 10)));
    const mod = m[4] ? parseInt(m[4].replace(/\s+/g,''), 10) : 0;
    if (/^(flip|coin)/.test(m[2])){ terms.push({kind:'coin', n, mod:0}); continue; }
    const sides = parseInt(m[3], 10);
    if (!KINDS.includes(sides)) continue;
    terms.push({kind:sides, n, mod});
  }
  return terms;
}

/* ── rolling ───────────────────────────────────────────────────
   A d100 is two ten-siders, the way it is on a real table: a tens die
   reading 00-90 and a units die reading 0-9, with 00+0 meaning 100. */
function rollTerms(terms){
  const out = [];
  terms.forEach(t => {
    const rolls = [];
    for (let i = 0; i < t.n; i++){
      if (t.kind === 'coin'){ rolls.push(Math.random() < .5 ? 'Heads' : 'Tails'); continue; }
      if (t.kind === 100){
        const tens = Math.floor(Math.random()*10), units = Math.floor(Math.random()*10);
        const v = (tens*10 + units) === 0 ? 100 : tens*10 + units;
        rolls.push({v, tens, units});
        continue;
      }
      rolls.push(rnd(t.kind));
    }
    out.push({...t, rolls});
  });
  return out;
}

function label(t){
  if (t.kind === 'coin') return t.n > 1 ? t.n + ' coins' : 'coin';
  return (t.n > 1 ? t.n : '') + 'd' + t.kind + (t.mod ? (t.mod > 0 ? '+' : '') + t.mod : '');
}
function totalOf(res){
  return res.reduce((s,t) => t.kind === 'coin' ? s
    : s + t.rolls.reduce((a,r) => a + (typeof r === 'object' ? r.v : r), 0) + t.mod, 0);
}
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

/* ── the dice the table has to throw ── */
function tableDice(res){
  const list = [];
  res.forEach(t => t.rolls.forEach(r => {
    if (t.kind === 'coin'){ list.push({kind:'coin', result:r}); return; }
    if (t.kind === 100){
      list.push({kind:10, result:r.tens === 0 ? 10 : r.tens});
      list.push({kind:10, result:r.units === 0 ? 10 : r.units});
      return;
    }
    list.push({kind:t.kind, result:r});
  }));
  return list;
}

/* ── chat ── */
/* WHO. This was hardcoded to 'GM' or the string 'Sir Aldric' — the demo
   fixture's character — so every roll anyone ever made in chat was signed
   by a person who is not at the table. The hall knows your name; use it. */
function speaker(){
  if (typeof ROLE !== 'undefined' && ROLE === 'gm') return 'GM';
  try {
    const me = JSON.parse(localStorage.getItem('monarchy.me.v1') || '{}');
    if (me && me.name && String(me.name).trim()) return String(me.name).trim();
  } catch (e) {}
  return 'You';
}

function say(res){
  const who = speaker();
  const spec = res.map(label).join(' · ');
  const anyNum = res.some(t => t.kind !== 'coin');
  const chips = res.map(t => t.rolls.map(r => {
    if (t.kind === 'coin') return `<i class="cn">${r}</i>`;
    if (t.kind === 100)   return `<i>${r.v}</i>`;
    const nat = (t.kind === 20 && r === 20) ? ' hi' : (t.kind === 20 && r === 1) ? ' lo' : '';
    return `<i class="${nat.trim()}">${r}</i>`;
  }).join('') + (t.mod ? `<u>${t.mod > 0 ? '+' : ''}${t.mod}</u>` : '')).join('');

  const d = document.createElement('div');
  d.className = 'cl roll';
  d.innerHTML = `<b>${esc(who)}</b><span class="rspec">${esc(spec)}</span>`
    + `<span class="rdice">${chips}</span>`
    + (anyNum ? `<span class="rtot">${totalOf(res)}</span>` : '');
  const cb = document.getElementById('chat-body');
  cb.appendChild(d); cb.scrollTop = cb.scrollHeight;
}

function roll(text, onTable){
  const terms = parse(text);
  if (!terms.length) return false;
  const res = rollTerms(terms);
  say(res);
  if (onTable && window.GLDice) window.GLDice.spawn(tableDice(res));
  return true;
}

/* ── the tray under the chat ── */
const pool = {};
function poolText(){
  const parts = KINDS.filter(k => pool[k]).map(k => pool[k] + 'd' + k);
  if (pool.coin) parts.push(pool.coin + (pool.coin > 1 ? ' coins' : ' coin'));
  return parts.join('  ·  ');
}
function paint(){
  const el = document.getElementById('dpool');
  const txt = poolText();
  el.classList.toggle('empty', !txt);
  el.textContent = txt || 'pick dice, or type 2d6+3 in chat';
  document.querySelectorAll('.dtypes button').forEach(b => {
    const k = b.dataset.d === 'coin' ? 'coin' : +b.dataset.d;
    b.classList.toggle('has', !!pool[k]);
    b.dataset.n = pool[k] || '';
  });
}
function build(){
  const dock = document.querySelector('.chatdock');
  const bar = document.createElement('div');
  bar.className = 'dicebar';
  bar.innerHTML =
    `<div class="dtypes">` +
      KINDS.map(k => `<button data-d="${k}">d${k}</button>`).join('') +
      `<button data-d="coin" class="coin">Coin</button></div>` +
    `<div class="dpool empty" id="dpool"></div>` +
    `<div class="drow">` +
      `<label class="dmod">Mod<input id="dmod" type="number" value="0" step="1"></label>` +
      `<label class="dtog"><input type="checkbox" id="dtable" checked><span>On the table</span></label>` +
      `<button class="dclear" id="dclear">Clear</button>` +
      `<button class="droll" id="droll">Roll</button></div>`;
  dock.insertBefore(bar, dock.querySelector('.cin'));

  bar.querySelectorAll('.dtypes button').forEach(b => {
    const k = b.dataset.d === 'coin' ? 'coin' : +b.dataset.d;
    b.addEventListener('click', ev => {
      /* shift or right-click takes one back off, so you can correct a fat finger */
      if (ev.shiftKey) pool[k] = Math.max(0, (pool[k]||0) - 1);
      else pool[k] = Math.min(50, (pool[k]||0) + 1);
      if (!pool[k]) delete pool[k];
      paint();
    });
    b.addEventListener('contextmenu', ev => {
      ev.preventDefault(); ev.stopPropagation();
      pool[k] = Math.max(0, (pool[k]||0) - 1);
      if (!pool[k]) delete pool[k];
      paint();
    });
  });
  document.getElementById('dclear').onclick = () => {
    Object.keys(pool).forEach(k => delete pool[k]); paint(); };
  document.getElementById('droll').onclick = () => {
    const txt = poolText().replace(/·/g,' ').replace(/coins?/g,'flip');
    if (!txt.trim()) return;
    const mod = parseInt(document.getElementById('dmod').value, 10) || 0;
    const terms = parse(txt);
    if (mod && terms.length){
      const num = terms.filter(t => t.kind !== 'coin');
      if (num.length) num[num.length-1].mod = mod;   // one modifier, on the last term
    }
    const res = rollTerms(terms);
    say(res);
    if (document.getElementById('dtable').checked && window.GLDice)
      window.GLDice.spawn(tableDice(res));
  };
  /* the tray is a control, not the table — never start a pan from it */
  bar.addEventListener('pointerdown', ev => ev.stopPropagation());
  paint();
}

/* ── SAYING SOMETHING ─────────────────────────────────────────
   A line of speech, in the same dock the rolls land in, so the two
   read as one conversation. Emotes with a leading /me, because that
   is the one bit of chat grammar everyone already knows.        */
function talk(text){
  const cb = document.getElementById('chat-body');
  if (!cb) return false;
  const t = String(text || '').trim(); if (!t) return false;
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

/* ── chat as a roll box ──
   Anything that parses as dice is a roll; anything else is just talk. */
function hookChat(){
  const inp = document.getElementById('chat-in');
  const go  = document.getElementById('chat-go');
  if (!inp) return;
  inp.placeholder = 'Say something, or roll  ·  2d6+3';
  const send = () => {
    const v = inp.value.trim(); if (!v) return true;
    const explicit = /^\/(roll|r)\b/i.test(v);
    if (explicit || parse(v).length && /^[\d\s+\-dflipcoin·]+$/i.test(v)){
      const onTable = !/\bquiet\b/i.test(v)
        && (document.getElementById('dtable') || {checked:true}).checked;
      if (roll(v.replace(/\bquiet\b/ig,''), onTable)){ inp.value = ''; return false; }
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
  document.addEventListener('DOMContentLoaded', () => { build(); hookChat(); });
else { build(); hookChat(); }

window.Dice = { roll, parse, talk, speaker };
})();
