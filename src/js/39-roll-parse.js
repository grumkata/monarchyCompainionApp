/* ══════════════════════════════════════════════════════════════
   39-roll-parse.js — WHAT A PLAYER TYPES AFTER /r, UNDERSTOOD.

   The old reader looked for dice-shaped pieces in the text and ignored the
   rest, which meant it answered confidently and wrongly: `/r 3 4d6` dropped
   the 3, `(1d20+5)*2` dropped the `*2`, `4d6kh3` dropped the `kh3`. This one
   reads the whole line or says why it cannot.

     /r 2d6+3             a roll
     /r 3 4d6   3x 4d6    three SETS of four d6 — each its own total
     /r (1d20+5)*2        arithmetic:  + - * / ( )  and unary minus
     /r 4d6kh3            keep the highest 3   (kl lowest, dh/dl drop; k3 = kh3)
     /r d%   d100         a hundred-sider
     /r flip   3 flip     a coin; three coins

   Hand-written, no eval: the text comes from a chat box. Everything is
   capped, so that `9999d9999` is an error message and not a frozen app.

     parse(text)  -> { ok, sets, ast, source, dice }  |  { ok:false, error }
     roll(text)   -> parse, then roll it                |  { ok:false, error }

   A rolled set is  { groups, total, tail }:
     groups  [{ n, sides, coin, label, rolls:[{ v, drop, tens?, units? }] }]
     total   the number the set comes to (null for coins, which have none)
     tail    a constant added or taken from a lone dice group (2d6+3 -> +3),
             so the chat line can show it the way a table would
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const LIMIT = {
  chars: 80,        /* the whole line */
  sets: 20,         /* 3x … */
  perTerm: 100,     /* dice in one NdS */
  dice: 200,        /* dice in the whole roll, all sets together */
  sidesMin: 2, sidesMax: 1000,
  depth: 8,         /* brackets inside brackets */
  value: 1e9        /* nothing is allowed to run away */
};

const fail = error => ({ ok: false, error });

/* ── PARSING ───────────────────────────────────────────────────
   Precedence, loosest to tightest:  + -   then   * /   then   unary -
   then a number, a dice term, or a bracket. */
function parseBody(src) {
  let i = 0;
  const peek = () => src[i];
  const skip = () => { while (src[i] === ' ') i++; };
  const num = () => {
    const s = i;
    while (src[i] >= '0' && src[i] <= '9') i++;
    return i > s ? parseInt(src.slice(s, i), 10) : null;
  };
  const err = msg => { const e = new Error(msg); e.roll = true; throw e; };
  let depth = 0;

  function expr() {
    let l = term();
    for (;;) {
      skip();
      const c = peek();
      if (c === '+' || c === '-') { i++; l = { t: 'bin', op: c, l, r: term() }; } else return l;
    }
  }
  function term() {
    let l = factor();
    for (;;) {
      skip();
      const c = peek();
      if (c === '*' || c === '/') { i++; l = { t: 'bin', op: c, l, r: factor() }; } else return l;
    }
  }
  function factor() {
    skip();
    const c = peek();
    if (c === '-') { i++; return { t: 'neg', v: factor() }; }
    if (c === '+') { i++; return factor(); }
    if (c === '(') {
      if (++depth > LIMIT.depth) err('Too many brackets inside brackets');
      i++;
      const e = expr();
      skip();
      if (peek() !== ')') err('A bracket is not closed');
      i++; depth--;
      return e;
    }
    /* a coin, with an optional count in front: flip · coin · coins */
    const word = /^(flips?|coins?)(?![a-z])/.exec(src.slice(i));
    if (word) { i += word[0].length; return { t: 'coin', n: 1 }; }

    const n = num();
    if (peek() === 'd' || peek() === 'D') {
      i++;
      let sides;
      if (peek() === '%') { i++; sides = 100; }
      else { sides = num(); if (sides == null) err('A die needs its sides: d6, d20, d%'); }
      const count = n == null ? 1 : n;
      if (count < 1) err('You cannot roll no dice');
      if (count > LIMIT.perTerm) err('At most ' + LIMIT.perTerm + ' dice in one go');
      if (sides < LIMIT.sidesMin || sides > LIMIT.sidesMax)
        err('A die has between ' + LIMIT.sidesMin + ' and ' + LIMIT.sidesMax + ' sides');
      const node = { t: 'dice', n: count, sides, keep: null };
      /* keep / drop:  kh3 kl2 k3 dh1 dl2 */
      const m = /^(k|d)(h|l)?(\d+)?/.exec(src.slice(i));
      if (m && (m[1] === 'k' || m[2])) {
        i += m[0].length;
        const k = m[3] == null ? 1 : parseInt(m[3], 10);
        const high = m[2] !== 'l';
        node.keep = m[1] === 'k' ? { high, k: Math.min(k, count) }
                                 : { high: !high, k: Math.max(0, count - k) };   /* dropping the highest keeps the lowest */
      }
      return node;
    }
    if (n == null) {
      err(peek() === undefined ? 'The roll stops short — what comes next?'
                               : 'I do not understand "' + src.slice(i, i + 6).trim() + '"');
    }
    return { t: 'num', v: n };
  }

  const ast = expr();
  skip();
  if (i < src.length) {
    /* the old reader took "4d6 2d8" as two groups; say what to type instead */
    err('Put a + between the parts, e.g. 4d6 + 2d8 — I stopped at "' + src.slice(i, i + 8).trim() + '"');
  }
  return ast;
}

/* what is in the tree: how many dice, how many coins */
function census(ast) {
  const c = { dice: 0, coins: 0, other: 0 };
  (function walk(a) {
    if (a.t === 'dice') c.dice += a.n;
    else if (a.t === 'coin') c.coins += a.n;
    else if (a.t === 'num') c.other++;
    else if (a.t === 'bin') { walk(a.l); walk(a.r); }
    else if (a.t === 'neg') walk(a.v);
  })(ast);
  return c;
}

function parse(text) {
  let src = String(text == null ? '' : text).trim().toLowerCase()
    .replace(/^\/(?:roll|r)(?![a-z])/, '').replace(/×/g, 'x').trim();
  if (src.length > LIMIT.chars) return fail('That is too long to roll — keep it under ' + LIMIT.chars + ' characters');
  if (!src) return fail('Roll what? Try 2d6+3, 4d6kh3, or 3 4d6');

  /* SETS: "3 4d6", "3x 4d6", "3 (2d6+1)", "3 flip". A number then a space
     then something that starts a roll — a bare "3 + 4" stays arithmetic. */
  let sets = 1;
  const pre = /^(\d+)\s*x\s+/.exec(src) || /^(\d+)\s+(?=[\d(d]|flips?\b|coins?\b)/.exec(src);
  if (pre) {
    sets = parseInt(pre[1], 10);
    if (sets < 1) return fail('Roll something at least once');
    if (sets > LIMIT.sets) return fail('At most ' + LIMIT.sets + ' sets at a time');
    src = src.slice(pre[0].length);
  }
  let ast;
  try { ast = parseBody(src); }
  catch (e) { if (e && e.roll) return fail(e.message); throw e; }

  const c = census(ast);
  if (!c.dice && !c.coins) return fail('There is nothing to roll in that — try 2d6+3');
  if (c.coins && (c.dice || c.other || ast.t !== 'coin'))
    return fail('A coin stands on its own: flip, or 3 flip');
  if (c.dice * sets > LIMIT.dice) return fail('That is more than ' + LIMIT.dice + ' dice altogether');
  return { ok: true, sets, ast, source: src, dice: c.dice * sets };
}

/* ── ROLLING ───────────────────────────────────────────────────
   The numbers come from `rng` (Math.random unless a test hands one in). A
   d100 is two ten-siders, the way it is on a real table: a tens die reading
   00-90 and a units die 0-9, 00+0 meaning 100. */
function rollSet(ast, rng) {
  const groups = [];
  const rnd = n => Math.floor(rng() * n) + 1;

  function ev(a) {
    switch (a.t) {
      case 'num': return a.v;
      case 'coin': {
        groups.push({ n: 1, sides: 2, coin: true, label: 'coin',
                      rolls: [{ v: rng() < .5 ? 'Heads' : 'Tails', drop: false }] });
        return 0;
      }
      case 'neg': return -ev(a.v);
      case 'dice': {
        const rolls = [];
        for (let k = 0; k < a.n; k++) {
          if (a.sides === 100) {
            const tens = Math.floor(rng() * 10), units = Math.floor(rng() * 10);
            rolls.push({ v: (tens * 10 + units) === 0 ? 100 : tens * 10 + units, tens, units, drop: false });
          } else rolls.push({ v: rnd(a.sides), drop: false });
        }
        if (a.keep) {
          /* mark what is NOT kept: sort indexes by value, the kept ones are the top (or bottom) k */
          const order = rolls.map((r, ix) => ix).sort((x, y) => rolls[x].v - rolls[y].v || x - y);
          const kept = new Set(a.keep.high ? order.slice(order.length - a.keep.k) : order.slice(0, a.keep.k));
          rolls.forEach((r, ix) => { if (!kept.has(ix)) r.drop = true; });
        }
        groups.push({ n: a.n, sides: a.sides, coin: false, rolls,
                      label: (a.n > 1 ? a.n : '') + 'd' + a.sides });
        return rolls.reduce((s, r) => s + (r.drop ? 0 : r.v), 0);
      }
      case 'bin': {
        const l = ev(a.l), r = ev(a.r);
        let v;
        if (a.op === '+') v = l + r;
        else if (a.op === '-') v = l - r;
        else if (a.op === '*') v = l * r;
        else {
          if (r === 0) { const e = new Error('Cannot divide by zero'); e.roll = true; throw e; }
          v = Math.trunc(l / r);                 /* whole numbers, towards zero */
        }
        if (Math.abs(v) >= LIMIT.value) { const e = new Error('That number is too big to be a roll'); e.roll = true; throw e; }
        return v;
      }
    }
    return 0;
  }
  const total = ev(ast);

  /* the constant tacked onto a lone dice group — 2d6+3 — so a line can say "+3" */
  let tail = 0;
  if (groups.length === 1 && !groups[0].coin) {
    const kept = groups[0].rolls.reduce((s, r) => s + (r.drop ? 0 : r.v), 0);
    const diff = total - kept;
    if (diff !== 0 && ast.t === 'bin' && (ast.op === '+' || ast.op === '-')) tail = diff;
  }
  const coin = groups.length === 1 && groups[0].coin;
  return { groups, total: coin ? null : total, tail };
}

function roll(text, rng) {
  const p = parse(text);
  if (!p.ok) return p;
  rng = rng || Math.random;
  const sets = [];
  try { for (let k = 0; k < p.sets; k++) sets.push(rollSet(p.ast, rng)); }
  catch (e) { if (e && e.roll) return fail(e.message); throw e; }
  return { ok: true, spec: (p.sets > 1 ? p.sets + ' × ' : '') + p.source.replace(/\s+/g, ''), sets,
           dice: p.dice };
}

const API = { parse, roll, LIMIT };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.RollParse = API;
})(typeof window !== 'undefined' ? window : globalThis);
