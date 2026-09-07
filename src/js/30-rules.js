/* ══════════════════════════════════════════════════════════════
   MONARCHY — THE RULES ENGINE

   Pure functions. No DOM, no state, no side effects. Everything in here
   answers a question about a character, an ability and a board; nothing in
   here changes anything. That is not a style preference — it is the same rule
   the whole app runs on. THE APP INFORMS, THE GM ADJUDICATES. This file is
   the informing half, and keeping it pure is what makes that structural
   rather than a promise.

   It also means it can be tested in plain node in milliseconds instead of
   through a browser, which matters when the browser costs ten seconds a run.
   ══════════════════════════════════════════════════════════════ */

/* ── attributes ────────────────────────────────────────────────
   Four categories, each with a passive and an active half. Skill tests roll
   the ACTIVE one; the passive ones feed the derived pools. */
const ATTRS = {
  fortitude:   { cat:'Physicality', kind:'passive', label:'Fortitude'   },
  prowess:     { cat:'Physicality', kind:'active',  label:'Prowess'     },
  dexterity:   { cat:'Agility',     kind:'passive', label:'Dexterity'   },
  nimble:      { cat:'Agility',     kind:'active',  label:'Nimble'      },
  willpower:   { cat:'Mind',        kind:'passive', label:'Willpower'   },
  intelligence:{ cat:'Mind',        kind:'active',  label:'Intelligence'},
  presence:    { cat:'Social',      kind:'passive', label:'Presence'    },
  charisma:    { cat:'Social',      kind:'active',  label:'Charisma'    },
};
const ATTR_KEYS = Object.keys(ATTRS);

/* ── the eight lines ───────────────────────────────────────────
   Ordered back-to-back. "Forward" is toward the enemy, which is increasing
   index for an ally and decreasing for an enemy — so one distance function
   serves both sides and nothing has to know which army it is in. */
const LINES = [
  { key:'a-back',  side:'al', depth:'back',      label:'Backline'  },
  { key:'a-supp',  side:'al', depth:'support',   label:'Support'   },
  { key:'a-sec',   side:'al', depth:'secondary', label:'Secondary' },
  { key:'a-front', side:'al', depth:'front',     label:'Frontline' },
  { key:'e-front', side:'en', depth:'front',     label:'Frontline' },
  { key:'e-sec',   side:'en', depth:'secondary', label:'Secondary' },
  { key:'e-supp',  side:'en', depth:'support',   label:'Support'   },
  { key:'e-back',  side:'en', depth:'back',      label:'Backline'  },
];
const LINE_AT = {}; LINES.forEach((l,i) => { LINE_AT[l.key] = { ...l, i }; });

/* How many lines forward is `to` from `from`, for someone fighting on `side`?
   Negative means it is behind them. Own line is 0 — a range 1 weapon reaches
   the line it stands in and the one ahead of it. */
function forward(side, from, to){
  const a = LINE_AT[from], b = LINE_AT[to];
  if (!a || !b) return null;
  return side === 'al' ? b.i - a.i : a.i - b.i;
}

/* ══ THE EXPRESSION LANGUAGE ═══════════════════════════════════
   A weapon does not have a damage formula with weapon-shaped holes in it.
   Every weapon carries its OWN rule, and those rules differ in kind, not just
   in number: some are dice, some are dice plus a flat, some scale off an
   attribute, some off half an attribute, some change with the wielder's size.

   So damage is an expression. Authors write readable text — `d8 + Prowess`,
   `d8 + (Large ? Prowess : Prowess/2)`, `30% target.maxHp` — and it parses to
   a tree that can do two things:

     evaluate(tree, ctx)  -> a number, or a range when dice are unrolled
     explain(tree, ctx)   -> the same thing in words, with the numbers filled in

   The second is the point of the whole exercise. A player picking an ability
   has to see EXACTLY what it does, which means seeing `1d8 + 5 (Prowess)`,
   not `1d8 + Prowess` and not `9`.
   ══════════════════════════════════════════════════════════════ */

const REF = {
  /* attributes, by name and by common shorthand */
  ...Object.fromEntries(ATTR_KEYS.map(k => [k, c => c.self.attrs[k] || 0])),
  /* derived, so an ability can say `speed` or `charge` and mean it */
  speed:    c => moveSpeed(c.self),
  charge:   c => chargeBonus(c.self),
  maxhp:    c => c.self.maxHp || 0,
  hp:       c => c.self.hp || 0,
  stamina:  c => c.self.stamina || 0,
  'target.maxhp':   c => c.target ? (c.target.maxHp || 0) : null,
  'target.hp':      c => c.target ? (c.target.hp || 0) : null,
  'target.missing': c => c.target ? ((c.target.maxHp||0) - (c.target.hp||0)) : null,
};
/* Conditions an expression may branch on. Each returns true/false/null,
   where null means "cannot be known yet" — which the explainer shows as a
   choice rather than picking a side. */
const COND = {
  large:      c => c.self.size ? ['large','monstrous'].includes(c.self.size) : null,
  monstrous:  c => c.self.size ? c.self.size === 'monstrous' : null,
  mounted:    c => c.self.mounted == null ? null : !!c.self.mounted,
  charging:   c => c.charging == null ? null : !!c.charging,
  'target.large': c => c.target && c.target.size
    ? ['large','monstrous'].includes(c.target.size) : null,
};

/* ── tokeniser ── */
function lex(src){
  const out = [];
  const re = /\s*(\d*d\d+|\d+(?:\.\d+)?%?|[A-Za-z_][A-Za-z_.]*|[()+\-*/?:½])/g;
  let m, at = 0;
  while ((m = re.exec(src))){
    if (m.index !== at) throw new Error('bad character in expression at ' + at);
    out.push(m[1]); at = re.lastIndex;
  }
  if (at !== src.length) throw new Error('bad character in expression at ' + at);
  return out;
}

/* ── parser: ternary > additive > multiplicative > primary ── */
function parseExpr(src){
  const t = lex(src); let i = 0;
  const peek = () => t[i], eat = s => { if (t[i] !== s) throw new Error('expected ' + s + ' in "' + src + '"'); i++; };

  function primary(){
    const tok = t[i];
    if (tok === undefined) throw new Error('unexpected end of "' + src + '"');
    if (tok === '('){ i++; const e = ternary(); eat(')'); return e; }
    /* `half Prowess`, `½ Prowess` and `Prowess/2` are the same thing, and all
       three appear in the written rules. The explainer prints "half X", so the
       parser has to accept it back — an author copying a line out of the card
       should not find that it will not parse. */
    if (tok === '½' || tok.toLowerCase() === 'half'){
      i++; return { half:primary() }; }
    if (tok === '-'){ i++; return { op:'*', a:{ n:-1 }, b:primary() }; }
    i++;
    if (/^\d*d\d+$/i.test(tok)){
      const [n, f] = tok.toLowerCase().split('d');
      return { dice:[n === '' ? 1 : +n, +f] };
    }
    if (/^\d+(\.\d+)?%$/.test(tok)) return { pct:parseFloat(tok) / 100 };
    if (/^\d+(\.\d+)?$/.test(tok)) return { n:parseFloat(tok) };
    const key = tok.toLowerCase();
    /* `weapon` is not a number — it is whatever the thing in your hands does.
       Half the written abilities say "normal damage" or "your weapon's damage"
       and mean exactly this, so the language needs a word for it rather than
       every such ability being retyped per weapon. It resolves to the equipped
       weapon's own expression, which may itself branch on size. */
    if (key === 'weapon') return { weapon:true, label:tok };
    if (REF[key])  return { ref:key,  label:tok };
    if (COND[key]) return { cond:key, label:tok };
    throw new Error('unknown name "' + tok + '" in "' + src + '"');
  }
  function unary(){
    const e = primary();
    /* `30% target.maxHp` — a percentage binds to whatever follows it */
    if (e.pct !== undefined && peek() !== undefined && !'+-*/?:)'.includes(peek()))
      return { op:'*', a:e, b:unary() };
    return e;
  }
  function mul(){ let e = unary();
    while (peek() === '*' || peek() === '/'){ const op = t[i++]; const r = unary();
      /* `Prowess/2` IS `half Prowess`. Both spellings are in the written rules
         and they have to mean the same thing, rounding included — otherwise
         which word an author happened to type changes the damage. */
      e = (op === '/' && r.n === 2) ? { half:e } : { op, a:e, b:r }; }
    return e; }
  function add(){ let e = mul();
    while (peek() === '+' || peek() === '-'){ const op = t[i++]; e = { op, a:e, b:mul() }; }
    return e; }
  function ternary(){
    const c = add();
    if (peek() !== '?') return c;
    i++; const yes = ternary(); eat(':'); const no = ternary();
    return { if:c, then:yes, else:no };
  }
  const e = ternary();
  if (i !== t.length) throw new Error('trailing "' + t.slice(i).join(' ') + '" in "' + src + '"');
  return e;
}

const _cache = {};
const expr = src => (typeof src === 'string'
  ? (_cache[src] || (_cache[src] = parseExpr(src)))
  : src);

/* ── evaluate ──
   Returns {min, max, avg, dice:[...], flat} — a RANGE, not a number, because
   the dice have not been rolled. A player deciding whether to commit needs to
   know it is 6 to 13, and a single average would lie to them about both ends. */
function evaluate(e, ctx){
  e = expr(e);
  const z = (min, max) => ({ min, max });
  if (e.n !== undefined)   return z(e.n, e.n);
  if (e.pct !== undefined) return z(e.pct, e.pct);
  if (e.dice)              return z(e.dice[0], e.dice[0] * e.dice[1]);
  if (e.weapon)            return ctx.weapon ? evaluate(ctx.weapon.damage, ctx) : null;
  /* HALF ROUNDS UP. grumkata's ruling: half of 7 is 4, not 3 and not 3.5.
     It is a node of its own rather than a multiply by a half precisely so the
     rounding lives in one place instead of being reapplied, or forgotten, at
     every point a halved value is used. */
  if (e.half){ const v = evaluate(e.half, ctx);
               return v == null ? null : z(half(v.min), half(v.max)); }
  if (e.ref){ const v = REF[e.ref](ctx); return v == null ? null : z(v, v); }
  if (e.cond){ const v = COND[e.cond](ctx); return v == null ? null : z(v?1:0, v?1:0); }
  if (e.if){
    const c = COND[e.if.cond] ? COND[e.if.cond](ctx) : null;
    if (c === null){                       // unknowable: report the whole span
      const a = evaluate(e.then, ctx), b = evaluate(e.else, ctx);
      if (!a || !b) return a || b;
      return z(Math.min(a.min, b.min), Math.max(a.max, b.max));
    }
    return evaluate(c ? e.then : e.else, ctx);
  }
  const a = evaluate(e.a, ctx), b = evaluate(e.b, ctx);
  if (!a || !b) return null;
  switch (e.op){
    case '+': return z(a.min + b.min, a.max + b.max);
    case '-': return z(a.min - b.max, a.max - b.min);
    case '*': return z(Math.min(a.min*b.min, a.max*b.max), Math.max(a.min*b.min, a.max*b.max));
    case '/': return z(a.min / (b.max||1), a.max / (b.min||1));
  }
  throw new Error('cannot evaluate ' + JSON.stringify(e));
}

/* ── explain ──
   The same tree in words, with everything known filled in. `d8 + Prowess`
   becomes `1d8 + 5 (Prowess)`. An unknowable branch stays a branch, so the
   player sees the choice rather than a number the app guessed at. */
function explain(e, ctx){
  e = expr(e);
  if (e.n !== undefined)   return String(round(e.n));
  if (e.pct !== undefined) return (e.pct * 100) + '%';
  if (e.dice)              return e.dice[0] + 'd' + e.dice[1];
  if (e.weapon)            return ctx.weapon ? explain(ctx.weapon.damage, ctx)
                                             : "your weapon's damage";
  if (e.ref){
    const v = REF[e.ref](ctx);
    const name = e.label || e.ref;
    return v == null ? name : round(v) + ' (' + name + ')';
  }
  if (e.cond) return e.label || e.cond;
  /* When the attribute is known, print the ANSWER — "4 (half Prowess)" — not
     the sum. Half of 7 is 4 in this game and a player should not have to
     remember which way it rounds while reading a damage line. */
  if (e.half){
    const v = evaluate(e.half, ctx);
    const inner = explain(e.half, ctx);
    if (v == null || v.min !== v.max) return 'half ' + inner + ', rounded up';
    return half(v.min) + ' (half ' + inner.replace(/^\d+ \(|\)$/g, '') + ')';
  }
  if (e.if){
    const c = COND[e.if.cond] ? COND[e.if.cond](ctx) : null;
    if (c !== null) return explain(c ? e.then : e.else, ctx);
    return 'if ' + (e.if.label || e.if.cond) + ': ' + explain(e.then, ctx)
         + ', otherwise ' + explain(e.else, ctx);
  }
  const wrap = s => /[+\-]/.test(s) && e.op !== '+' && e.op !== '-' ? '(' + s + ')' : s;
  const a = wrap(explain(e.a, ctx)), b = wrap(explain(e.b, ctx));
  /* halves read better as words. The rules say "half Prowess" and a player
     reading "0.5 × 5 (Prowess)" has to do arithmetic to get back to the
     sentence they already knew. */
  if (e.op === '*' && e.a.n === 0.5)  return 'half ' + b;
  if (e.op === '/' && e.b.n === 2)    return 'half ' + a;
  if (e.op === '/' && e.b.n === 4)    return 'a quarter of ' + a;
  if (e.op === '*' && e.a.n === -1)   return '-' + b;
  if (e.op === '*' && e.a.pct)        return a + ' of ' + b;
  return a + ' ' + e.op.replace('*','×').replace('/','÷') + ' ' + b;
}
const round = n => Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : Math.round(n*100)/100;

/* Does this expression reach for whatever is in the wielder's hands? */
function usesWeapon(e){
  e = expr(e);
  if (!e || typeof e !== 'object') return false;
  if (e.weapon) return true;
  return usesWeapon2(e.a) || usesWeapon2(e.b) || usesWeapon2(e.then) || usesWeapon2(e.else);
}
const usesWeapon2 = e => e ? usesWeapon(e) : false;

/* Both at once, which is what a caller almost always wants. */
function value(e, ctx){
  const r = evaluate(e, ctx);
  return { text:explain(e, ctx), ...(r || {}), known: !!r };
}

/* ══ CHARACTER MATHS ═══════════════════════════════════════════ */

/* A skill total walks the tree: a tertiary test adds primary + secondary +
   tertiary, a secondary test adds primary + secondary. A tier the character
   does not own contributes 0 and makes the whole test UNTRAINED, which the
   rules price at +2 difficulty — so the app reports it rather than hiding it. */
function skillTotal(ch, path){
  const have = ch.skills || {};
  let total = 0, missing = [];
  const parts = path.map(step => {
    const v = have[step] || 0;
    total += v;
    if (!v) missing.push(step);
    return { name:step, value:v };
  });
  return { total, parts, untrained: missing.length > 0, missing,
           difficultyMod: missing.length ? 2 : 0 };
}

/* The pool is the ACTIVE attribute, full stop. Skill is not dice — it is the
   budget you spend editing them, which is the whole shape of this system. */
/* HALF ROUNDS UP, everywhere, once. grumkata's ruling: half of 7 is 4. It is a
   named function rather than an inline `/2` at each site because a rounding
   rule applied in six places is a rounding rule that will eventually disagree
   with itself in one of them. */
const half = n => Math.ceil((n || 0) / 2);

const dicePool = (ch, attr) => ch.attrs[attr] || 0;

const moveSpeed = ch => { const d = ch.attrs && ch.attrs.dexterity || 0;
  return d <= 3 ? 1 : d <= 6 ? 2 : d <= 8 ? 3 : 4; };
const startingDodge = ch => { const d = ch.attrs && ch.attrs.dexterity || 0;
  return d <= 2 ? null : d <= 4 ? 0 : d <= 7 ? 1 : d <= 10 ? 2 : 3; };
const chargeBonus = ch => {
  const a = ch.attrs || {};
  /* each halved attribute rounds up on its own, not the total after adding —
     the rule is about halving an attribute, and it is applied where the
     halving happens */
  const base = half(a.prowess) + half(a.fortitude) + moveSpeed(ch)*2;
  return base * (ch.sizeBonus == null ? 1 : ch.sizeBonus);
};
const maxHealth  = ch => Math.ceil((ch.attrs.fortitude||0) * (ch.armourValue||1))
                       + ((ch.skills||{})['Resilience'] || 0);
const maxStamina = ch => half((ch.attrs.fortitude||0) + (ch.attrs.willpower||0)) + 4;
const maxStress  = ch => 2 * (ch.attrs.willpower||0);

/* ── rolling an expression for real ────────────────────────────
   `evaluate` gives the range you show BEFORE committing. This gives the number
   you get after, with the dice it actually rolled, so a result can be read
   back and argued with rather than just appearing. */
function rollValue(e, ctx, rng){
  rng = rng || Math.random;
  const rolled = [];
  const walk = n => {
    n = expr(n);
    if (n.n !== undefined)   return n.n;
    if (n.pct !== undefined) return n.pct;
    if (n.dice){ let t = 0;
      for (let i = 0; i < n.dice[0]; i++){ const d = 1 + Math.floor(rng() * n.dice[1]);
        rolled.push({ face:n.dice[1], v:d }); t += d; }
      return t; }
    if (n.half)   return half(walk(n.half));               // half rounds UP
    if (n.weapon) return ctx.weapon ? walk(ctx.weapon.damage) : 0;
    if (n.ref)  { const v = REF[n.ref](ctx);  return v == null ? 0 : v; }
    if (n.cond) { const v = COND[n.cond](ctx); return v ? 1 : 0; }
    if (n.if)   { const c = COND[n.if.cond] ? COND[n.if.cond](ctx) : null;
                  return walk(c ? n.then : n.else); }
    const a = walk(n.a), b = walk(n.b);
    return n.op === '+' ? a + b : n.op === '-' ? a - b
         : n.op === '*' ? a * b : a / (b || 1);
  };
  const total = walk(e);
  return { total:Math.max(0, Math.round(total)), rolled, text:explain(e, ctx) };
}

/* ══ ACTIONS ═══════════════════════════════════════════════════
   Each turn: one quick, one full, and unlimited free. The full can be
   DOWNGRADED into a second quick, which is why "can I do this" is not simply
   "do I have that action" — a quick can be paid for with either. */
const ACTIONS = { quick:'quick action', full:'full action',
                  free:'free action', reaction:'reaction' };
function actionAvailable(ch, kind){
  if (!kind || kind === 'free' || kind === 'reaction' || kind === 'passive')
    return { ok:true, free:true };
  const q = ch.q !== false, f = ch.f !== false;
  if (kind === 'full')  return { ok:f, spends:'full',
    why:f ? null : 'your full action is already spent' };
  if (kind === 'quick') return { ok:q || f, spends:q ? 'quick' : 'full',
    downgrade:!q && f, why:(q || f) ? null : 'you have no actions left this turn' };
  return { ok:true, free:true };
}

/* ══ WHEN CAN YOU USE IT ═══════════════════════════════════════
   Three different things, and they were all being drawn as one list:

     a TURN action  — you choose it, it costs an action, you do it now
     a REACTION     — you set it down and it waits on the world; Brace is
                      armed on your turn and then answers whatever walks into
                      it, so once it is set there is nothing more to click
     a RESPONSE     — it is not yours to start at all. Retaliatory Bash exists
                      only as the attack that Brace causes; on your own turn it
                      is not an option, it is a consequence

   Showing a response next to an attack, both waiting to be clicked, is a lie
   about what the player can do. */
function usability(ability, actor){
  const armed = (actor.armed || []);
  if (ability.respondsTo)
    return { kind:'response', parent:ability.respondsTo,
             ready:armed.includes(ability.respondsTo),
             why:'only when ' + (ability.respondsToName || 'its trigger') + ' fires' };
  if (ability.arms)
    return { kind:'arm', arms:ability.arms, ready:!armed.includes(ability.id),
             set:armed.includes(ability.id),
             why:armed.includes(ability.id) ? 'already set' : null };
  if (ability.action === 'reaction')
    return { kind:'reaction', ready:true, why:ability.trigger || null };
  if (!ability.action || ability.action === 'passive')
    return { kind:'passive', ready:true };
  return { kind:'turn', ready:true };
}

/* ══ COSTS ═════════════════════════════════════════════════════
   Three currencies and they behave differently, so they are not one field:
     stamina — spent, refreshes on a rest         (Styles)
     mana    — spent from the SHARED pool in the air, nobody's own  (Lores)
     favor   — mostly a THRESHOLD you must have banked, not a spend;
               only ultimates actually cost it, and paying can drop you back
               below other thresholds and take those abilities away  (Arts)
     hp      — some spells are paid in blood
   `affordable` reports each separately so the reason is never guessed at. */
function affordable(ch, ability, field){
  const c = ability.cost || {}, out = [];
  if (c.stamina) out.push({ kind:'stamina', need:c.stamina, have:ch.stamina|0,
                            ok:(ch.stamina|0) >= c.stamina });
  if (c.mana)    out.push({ kind:'mana', need:c.mana, have:field && field.mana|0,
                            ok:!field || (field.mana|0) >= c.mana, shared:true });
  if (c.hp)      out.push({ kind:'hp', need:c.hp, have:ch.hp|0, ok:(ch.hp|0) > c.hp });
  /* FAVOR IS PER ART. Each one is a separate account with a separate patron,
     so the bank being read is the bank belonging to the Art this ability came
     from — and a character who does not have that Art has no Favor in it at
     all, which is a different answer from "not enough". */
  if (ability.favorThreshold != null || c.favor){
    const bank = favorIn(ch, ability.artId);
    if (bank === null){
      out.push({ kind:'favor', need:ability.favorThreshold || c.favor, have:0, ok:false,
                 missing:true, art:ability.artId || null });
    } else {
      const free = favorCapstone(ch, ability.artId);   // at 100 the Art stops charging
      if (ability.favorThreshold != null)
        out.push({ kind:'favor', need:ability.favorThreshold, have:bank,
                   ok:bank >= ability.favorThreshold, threshold:true, art:ability.artId });
      if (c.favor)
        out.push({ kind:'favor', need:free ? 0 : c.favor, have:bank,
                   ok:free || bank >= c.favor, spends:true, capstone:free, art:ability.artId });
    }
  }
  return { parts:out, ok:out.every(p => p.ok) };
}

/* A cantrip is free but the air still has to carry it. */
const cantripReady = (ability, field) =>
  !ability.cantrip || !field || (field.mana|0) >= 5;

/* ══ TARGETING ═════════════════════════════════════════════════
   Two separate questions, because the written abilities already ask them
   separately: WHERE MUST I BE STANDING (`castZones`, from the Art of
   Nehekhara's "cast zones: back, support") and WHAT CAN I REACH (`range`,
   counted forward in lines with your own line as 0). */
function canCastFrom(ability, lineKey){
  const z = ability.castZones;
  if (!z || !z.length) return true;
  const l = LINE_AT[lineKey];
  return !!l && z.includes(l.depth);
}

/* Every entity on the board this ability could legally be aimed at, with the
   reason attached to the ones it could not — a player who cannot see why a
   target is greyed out will assume the app is broken. */
function legalTargets(ability, actor, board){
  const from = actor.line, side = LINE_AT[from] ? LINE_AT[from].side : 'al';
  const spec = ability.targets || { side:'enemy', kind:['unit','formation'] };
  const out = [];
  for (const line of board.lines){
    const d = forward(side, from, line.key);
    const inRange = d !== null && d >= 0 && d <= (ability.range == null ? 0 : ability.range);
    for (const e of line.ents){
      const enemy = LINE_AT[line.key].side !== side;
      const sideOk = spec.side === 'any' ? true
                   : spec.side === 'enemy' ? enemy
                   : spec.side === 'ally'  ? !enemy && e !== actor
                   : spec.side === 'self'  ? e === actor : true;
      const kindOk = !spec.kind || spec.kind.includes(e.kind === 'form' ? 'formation' : 'unit');
      const why = !sideOk ? 'wrong side' : !kindOk ? 'wrong kind of target'
                : !inRange ? (d < 0 ? 'behind you' : 'out of range by ' +
                    (d - (ability.range||0)) + ' line' + (d-(ability.range||0)>1?'s':''))
                : null;
      out.push({ ent:e, line:line.key, distance:d, ok:!why, why });
    }
  }
  return out;
}

/* ══ THE WHOLE ANSWER ══════════════════════════════════════════
   One call, everything a player needs to decide, and nothing they do not.
   No dice are rolled here and no resource is spent — this is the description
   of a thing that has not happened yet. The GM approves it first. */
function describe(ability, actor, board, opts){
  opts = opts || {};
  const ctx = { self:actor, target:opts.target || null, charging:opts.charging,
                weapon:opts.weapon || actor.weapon || null };
  const roll = ability.roll ? (() => {
    const sk = skillTotal(actor, ability.roll.skill);
    return { attr:ability.roll.attr, attrLabel:ATTRS[ability.roll.attr].label,
             pool:dicePool(actor, ability.roll.attr), skill:sk,
             note:sk.untrained ? 'Untrained: +2 difficulty, and ' +
                  sk.missing.join(' / ') + ' adds nothing' : null };
  })() : null;

  return {
    ability,
    cost: affordable(actor, ability, board && board.field),
    ready: cantripReady(ability, board && board.field),
    canCast: canCastFrom(ability, actor.line),
    castZones: ability.castZones || null,
    roll,
    use: usability(ability, actor),
    action: actionAvailable(actor, ability.action),
    actionLabel: ACTIONS[ability.action] || null,
    effects: (ability.effects || []).map(fx => describeEffect(fx, ctx)),
    targets: board ? legalTargets(ability, actor, board) : null,
  };
}

/* ══ RESOLUTION ════════════════════════════════════════════════
   What happens once the GM has said yes.

   This still changes nothing — it returns a LIST OF CHANGES for the caller to
   apply, so the engine stays pure and every change is inspectable before it
   lands. But it does the whole job: roll the attack, work out whether it beat
   the difficulty, roll the damage, and turn each effect into a change.

   The split that matters: an effect fires automatically when the app can KNOW
   whether its condition held. `always` always can. `onHit` can, because the
   difficulty is now on the table. Anything else — "pushed into something",
   "an enemy attacks you in melee" — depends on a fiction the app is not in,
   and goes to the GM with the reason attached. Same for every `note`.

   With every ability approved on sight this becomes automatic play, which is
   the point; the GM's approval is the adjudication, and the app is executing
   a description it already showed the player in full. */
function resolve(ability, actor, opts){
  opts = opts || {};
  const ctx = { self:actor, target:opts.target || null, charging:opts.charging,
                weapon:opts.weapon || actor.weapon || null };
  const rng = opts.rng || Math.random;
  const out = { changes:[], applied:[], forGM:[], roll:null, hit:true };

  if (ability.roll){
    /* NO ROLL WITHOUT A DIFFICULTY. The GM sets it and nothing in the rules
       produces one, so a missing difficulty is a question, not a zero — and a
       zero would be an auto-pass dressed up as an answer. The old default of 2
       was worse than nothing: measured against the edit system it is a 98%
       pass for a trained character. */
    if (opts.difficulty == null){
      out.needsDifficulty = true;
      out.forGM = [{ text:'set a difficulty', why:'the app does not guess one' }];
      return out;
    }
    const pool = dicePool(actor, ability.roll.attr);
    const budget = skillTotal(actor, ability.roll.skill);
    const raw = roll(pool, rng);
    const sp = opts.spend || autoSpend(raw, budget.total);
    const diff = opts.difficulty == null ? 0 : opts.difficulty
               + (budget.untrained ? budget.difficultyMod : 0);
    out.roll = { raw, dice:sp.dice, successes:sp.successes, spent:sp.spent, log:sp.log,
                 difficulty:diff, crit:crit(raw), budget:budget.total,
                 untrained:budget.untrained };
    out.hit = sp.successes >= diff;
  }

  /* the costs are paid whether or not it landed — you swung */
  const c = ability.cost || {};
  if (c.stamina) out.changes.push({ op:'spend', who:actor.id, kind:'stamina', n:c.stamina });
  if (c.hp)      out.changes.push({ op:'hp', to:actor.id, delta:-c.hp });
  if (c.mana)    out.changes.push({ op:'mana', n:-c.mana });
  if (c.favor)   out.changes.push({ op:'spend', who:actor.id, kind:'favor', n:c.favor });
  const act = actionAvailable(actor, ability.action);
  if (act.spends) out.changes.push({ op:'action', who:actor.id, kind:act.spends });

  /* Some abilities are not a thing you do and finish. You SET THEM DOWN and
     they wait on the world — Brace is the type case, and approving it attacks
     nobody: it stands a condition in front of you that its own responses hang
     off. So it emits a change like any other cost or result, and its effects
     stay untouched below, because every one of them is `onTrigger` and the app
     cannot see a trigger. Those go to the GM as the terms of the deal. */
  if (ability.arms){
    out.changes.push({ op:'arm', who:actor.id, ability:ability.id, token:ability.arms });
    out.applied.push({ text:ability.arms + ' \u2014 set down until your next turn' });
  }

  for (const fx of ability.effects || []){
    const when = fx.when || 'always';
    const auto = when === 'always' || (when === 'onHit' && out.hit);
    const skip = when === 'onHit' && !out.hit;
    if (skip) continue;
    if (!auto || fx.effect === 'note'){
      out.forGM.push({ text:describeEffect(fx, ctx).text,
                       why:fx.effect === 'note' ? 'not a modelled effect'
                         : 'depends on "' + when + '", which the app cannot see' });
      continue;
    }
    const who = fx.to === 'self' ? actor.id : (opts.target && opts.target.id);
    switch (fx.effect){
      case 'damage': {
        if (!who){ out.forGM.push({ text:describeEffect(fx, ctx).text, why:'no single target' }); break; }
        const v = rollValue(fx.amount, ctx, rng);
        out.changes.push({ op:'hp', to:who, delta:-v.total, bypass:fx.bypass || null });
        out.applied.push({ text:v.total + (describeEffect(fx, ctx).type
          ? ' ' + describeEffect(fx, ctx).type : '') + ' damage'
          + (v.rolled.length ? ' (' + v.text + ' \u2192 rolled ' +
             v.rolled.map(r => r.v).join(', ') + ')' : ''), amount:v.total });
        break; }
      case 'heal': { const v = rollValue(fx.amount, ctx, rng);
        out.changes.push({ op:'hp', to:who || actor.id, delta:v.total });
        out.applied.push({ text:'healed ' + v.total }); break; }
      case 'token': { const n = fx.count ? rollValue(fx.count, ctx, rng).total : 1;
        if (!who){ out.forGM.push({ text:describeEffect(fx, ctx).text, why:'no single target' }); break; }
        out.changes.push({ op:'token', to:who, token:fx.token, delta:n });
        out.applied.push({ text:n + ' ' + fx.token }); break; }
      case 'removeToken':
        out.changes.push({ op:'token', to:who || actor.id, token:fx.token,
                           delta:fx.all ? -99 : -1 });
        out.applied.push({ text:'removed ' + (fx.all ? 'all ' : '1 ') + (fx.token || 'tokens') });
        break;
      case 'move':
        if (!who){ out.forGM.push({ text:describeEffect(fx, ctx).text, why:'no single target' }); break; }
        out.changes.push({ op:'push', to:who, lines:fx.lines, direction:fx.direction || 'back',
                           from:actor.line });
        out.applied.push({ text:'pushed ' + fx.lines + ' line back' });
        break;
      case 'prone': case 'dismount':
        out.changes.push({ op:'token', to:who, token:fx.effect === 'prone' ? 'Prone' : 'Dismounted', delta:1 });
        out.applied.push({ text:fx.effect }); break;
      default:
        out.forGM.push({ text:describeEffect(fx, ctx).text,
                         why:'"' + fx.effect + '" has no automatic result yet' });
    }
  }
  return out;
}

/* ══ THE EFFECT VOCABULARY ═════════════════════════════════════
   "Fully structured" means an effect is a record, not a sentence. Each one
   names WHAT happens, TO WHOM, and WHEN — and every amount is an expression,
   so an effect can scale off an attribute exactly the way damage does.

   `note` is the deliberate escape hatch. A few abilities genuinely resist
   typing (Doom at Last rewrites the turn; Rally for the Cause summons a
   formation whose size depends on your other summons). Forcing those into a
   schema would produce a lie. They carry their prose and are MARKED as a GM
   call, which is honest and is also exactly what the app is for. */

const DAMAGE_TYPES = ['physical','radiant','necrotic','force','soul','psionic',
                      'fire','cold','poison','emotional'];

const WHEN = {
  always:  'always',
  onHit:   'on a hit',
  onMiss:  'on a miss',
  onCrit:  'on a critical',
  onKill:  'if it kills',
  onParry: 'on a successful parry',
  onTrigger: 'when it triggers',
};

/* what a damage effect can be declared to go straight through */
const BYPASS = {
  ward:       'physical Ward',
  resistance: 'resistances',
  cover:      'cover',
};

const TO = {
  target:  'the target',
  self:    'you',
  allies:  'allies',
  line:    'every unit in the line',
  allInRange: 'everything in range',
  mount:   'your mount',
};

/* Each entry turns one typed effect into a sentence with the numbers in it. */
const EFFECTS = {
  damage: (fx, ctx) => {
    const v = value(fx.amount, ctx);
    /* An ability that deals "your weapon's damage" deals your weapon's damage
       TYPE too. A spear does not stop being piercing because the ability that
       swung it was written by a Style. */
    const type = fx.type || (usesWeapon(fx.amount) && ctx.weapon
                             ? ctx.weapon.damageType : null);
    /* "Armour" in the written abilities means a physical WARD — the token that
       absorbs damage — not the Armour Value that multiplies Fortitude into
       Health. So an attack does not "ignore armour", it BYPASSES what would
       have soaked it, and that is a thing the app can actually resolve. */
    const past = (fx.bypass || []).map(b => BYPASS[b] || b);
    return { icon:'damage', amount:v, bypass:fx.bypass || null, type,
      text:'Deal ' + v.text + (type ? ' ' + type : '') + ' damage' +
           (past.length ? ', past ' + past.join(' and ') : '') +
           ' to ' + (TO[fx.to] || TO.target) };
  },
  heal: (fx, ctx) => { const v = value(fx.amount, ctx);
    return { icon:'heal', amount:v, text:'Heal ' + v.text + ' on ' + (TO[fx.to] || TO.self) }; },
  token: (fx, ctx) => { const n = fx.count ? value(fx.count, ctx) : null;
    const c = n ? (n.min === n.max ? n.min : n.text) : 1;
    return { icon:'token', token:fx.token,
      text:'Apply ' + c + ' ' + fx.token + ' to ' + (TO[fx.to] || TO.target) }; },
  removeToken: fx => ({ icon:'token',
    text:'Remove ' + (fx.all ? 'all ' + (fx.token || 'tokens') : '1 ' + fx.token) +
         ' from ' + (TO[fx.to] || TO.self) }),
  move: fx => ({ icon:'move',
    text:(fx.forced ? 'Push ' : 'Move ') + (TO[fx.who] || TO.target) + ' ' + fx.lines +
         ' line' + (fx.lines > 1 ? 's' : '') + ' ' + (fx.direction || 'back') }),
  prone:   fx => ({ icon:'state', text:'Knock ' + (TO[fx.to] || TO.target) + ' prone' }),
  dismount:fx => ({ icon:'state', text:'Dismount ' + (TO[fx.to] || TO.target) }),
  disarm:  fx => ({ icon:'state', text:'Disarm ' + (TO[fx.to] || TO.target) +
                    (fx.slot ? ' (' + fx.slot + ')' : '') }),
  destroy: fx => ({ icon:'state', text:'Destroy ' + (TO[fx.to] || TO.target) + "'s " + fx.what }),
  freeAttack: fx => ({ icon:'attack',
    text:'Make a free ' + (fx.with || 'weapon') + ' attack' +
         (fx.against ? ' against ' + fx.against : '') }),
  grantAction: fx => ({ icon:'action',
    text:'Gain a free ' + fx.kind + ' action' + (fx.to ? ' for ' + TO[fx.to] : '') }),
  modifyRoll: (fx, ctx) => {
    const bits = [];
    if (fx.dice) bits.push((fx.dice > 0 ? '+' : '') + fx.dice + ' dice');
    if (fx.difficulty) bits.push((fx.difficulty > 0 ? '+' : '') + fx.difficulty + ' difficulty');
    if (fx.autoSuccess) bits.push(fx.autoSuccess + ' automatic success');
    return { icon:'roll', text:bits.join(' and ') + ' on ' + (fx.scope || 'the next roll') +
             ' for ' + (TO[fx.to] || TO.self) };
  },
  contest: (fx, ctx) => ({ icon:'contest',
    text:'Contest your ' + ATTRS[fx.mine].label + ' against their ' + ATTRS[fx.theirs].label,
    then:(fx.onWin || []).map(f => describeEffect(f, ctx)) }),
  check: (fx, ctx) => { const d = fx.difficulty ? value(fx.difficulty, ctx) : null;
    return { icon:'check',
      text:(TO[fx.who] || TO.target) + ' makes a ' + ATTRS[fx.attr].label + ' check' +
           (d ? ' at difficulty ' + (d.min === d.max ? d.min : d.text) : ''),
      then:(fx.onFail || []).map(f => describeEffect(f, ctx)), thenLabel:'on a failure' }; },
  summon: (fx, ctx) => { const n = fx.count ? value(fx.count, ctx) : null;
    return { icon:'summon',
      text:'Summon ' + (n ? (n.min === n.max ? n.min : n.text) + ' ' : '') + fx.what }; },
  resource: (fx, ctx) => { const v = value(fx.amount, ctx);
    return { icon:'cost', text:(fx.gain ? 'Gain ' : 'Spend ') + v.text + ' ' + fx.kind }; },
  note: fx => ({ icon:'note', gmCall:true, text:fx.text }),
};

function describeEffect(fx, ctx){
  const fn = EFFECTS[fx.effect];
  if (!fn) return { icon:'note', gmCall:true, text:'(unmodelled: ' + fx.effect + ')' };
  const d = fn(fx, ctx || { self:{ attrs:{} } });
  d.when = fx.when || 'always';
  d.whenText = WHEN[d.when] || fx.when;
  if (fx.chance) d.chance = fx.chance;
  return d;
}

/* ══ THE ROLL ══════════════════════════════════════════════════
   Nothing here runs until the GM has approved the action. The app does not
   decide whether you may act, and it does not decide the difficulty.

   Editing is the interesting half of this system: you roll dice equal to your
   active attribute, then spend skill points to change what you rolled —
   upgrade a die, delete a 1, or reroll. `autoSpend` will do the first two for
   you because they are arithmetic. IT WILL NOT REROLL: a reroll is a gamble,
   and taking someone's gamble away and calling it a convenience is the wrong
   trade. */
function roll(pool, rng){
  rng = rng || Math.random;
  const dice = [];
  for (let i = 0; i < pool; i++) dice.push(1 + Math.floor(rng() * 6));
  return dice;
}
const tally = dice => dice.filter(d => d === 6).length - dice.filter(d => d === 1).length;

/* Crits read the RAW roll, before any editing, and need at least three dice. */
function crit(raw){
  if (raw.length < 3) return null;
  const t = tally(raw);
  return t >= 5 ? 'super-crit' : t >= 3 ? 'crit'
       : t <= -5 ? 'super-fail' : t <= -3 ? 'fail' : null;
}

/* Spend a budget on the two edits that are pure arithmetic.
   A 1 removed is worth a whole success; a 5 upgraded to a 6 is worth one too,
   and costs the same, so they are equal value — but removing a 1 also shrinks
   the pool, which can only help a tally of sixes-minus-ones. Ones first.
   Anything below a 5 is not worth walking up: two points to turn a 4 into a 6
   buys one success, where two points spent on 1s or 5s buys two. */
function autoSpend(dice, budget){
  const out = dice.slice(), log = [];
  let left = budget;
  /* Ones first. A 1 removed is worth a whole success and costs one point, and
     it also shrinks the pool, which a tally of sixes-minus-ones can only like. */
  for (let i = 0; i < out.length && left > 0; i++)
    if (out[i] === 1){ out[i] = null; left--; log.push({ i, from:1, to:null, act:'removed a 1' }); }
  /* Then walk dice up to 6, cheapest climb first: a 5 buys a success for one
     point, a 4 for two, a 3 for three. Every one of these is still worth doing
     while budget remains — it is only ever a worse rate than the last, never a
     losing one. Note that a 1 cannot be upgraded at all; the rules only allow
     upgrading a NON-1, which is why removal is the only thing to do with them. */
  for (let face = 5; face >= 2 && left > 0; face--){
    const climb = 6 - face;
    for (let i = 0; i < out.length && left >= climb; i++)
      if (out[i] === face){
        out[i] = 6; left -= climb;
        log.push({ i, from:face, to:6, act:'upgraded ' + face + ' to 6' });
      }
  }
  const kept = out.filter(d => d !== null);
  return { dice:out, kept, spent:budget - left, left, log, successes:tally(kept) };
}


/* ══════════════════════════════════════════════════════════════
   THE BOOKKEEPING

   Everything below is the half of the rules the app exists FOR: the arithmetic
   a GM running twenty units cannot hold in their head. It is all pure — every
   function returns a description of what should happen and changes nothing —
   and none of it needs a browser to test.

   It was missing because I spent three passes building an ability browser,
   which is what you build when you think the app's job is choosing. Choosing
   is the small part. This is the big one.
   ══════════════════════════════════════════════════════════ */

/* ── the clock ─────────────────────────────────────────────────
   ONE COMBAT TURN IS FIVE SECONDS. Every duration in the written content is in
   real time — "for 20 seconds (4 turns)", "30 minutes (360 turns)", "lasts 10
   minutes" — with the turn count worked out by hand beside it. The app does
   that conversion so an author never has to, and so a duration written either
   way lands in the same place. */
const TURN_SECONDS = 5;
const TIME_UNITS = { turn:TURN_SECONDS, turns:TURN_SECONDS, round:TURN_SECONDS, rounds:TURN_SECONDS,
                     second:1, seconds:1, sec:1, s:1,
                     minute:60, minutes:60, min:60, m:60,
                     hour:3600, hours:3600, h:3600 };
function turnsOf(d){
  if (d == null) return null;
  if (typeof d === 'number') return d;                    // a bare number is turns
  if (typeof d === 'object') return d.turns != null ? d.turns
                                : d.seconds != null ? Math.ceil(d.seconds / TURN_SECONDS) : null;
  const m = String(d).trim().match(/^([\d.]+)\s*([a-z]+)$/i);
  if (!m) throw new Error('unreadable duration: ' + d);
  const unit = TIME_UNITS[m[2].toLowerCase()];
  if (unit == null) throw new Error('unknown time unit: ' + m[2]);
  return Math.ceil(+m[1] * unit / TURN_SECONDS);
}
/* and back the other way, for printing what the book said */
function durationText(d){
  const t = turnsOf(d);
  if (t == null) return null;
  const sec = t * TURN_SECONDS;
  const pretty = sec < 60 ? sec + ' seconds'
               : sec < 3600 ? (sec/60) + ' minute' + (sec === 60 ? '' : 's')
               : (sec/3600) + ' hour' + (sec === 3600 ? '' : 's');
  return t + ' turn' + (t === 1 ? '' : 's') + ' (' + pretty + ')';
}

/* ── cooldowns and uses ────────────────────────────────────────
   Two different limiters that the content uses interchangeably in prose and
   which behave nothing alike:

     cooldown — "smite, 2 turn cooldown". You may use it again N turns later.
     uses     — "once a combat", "3 times a day", "1 time per 15 favor you
                have". A budget that refills when its period rolls over.

   Styles mostly do neither; a stamina cost is their limiter. Turn cooldowns
   are the common case in combat, and days/weeks belong almost entirely to
   Arts, where a spell is a favour asked of something that gets tired of you.

   The clock is whatever the app is counting: { round, combat, day, week }.
   The engine never advances it — it only reads it — so a session that pauses
   overnight cannot silently refill anything. */
const PERIODS = ['turn','round','combat','day','week','month','session'];

function usesAllowed(ability, ch){
  const u = ability.uses; if (!u) return null;
  let n = u.n == null ? 1 : u.n;
  /* "prayer of healing: 1 time per 15 favor you have" — a budget that grows
     with the thing it is asked of */
  if (u.each){
    const [kind, per] = Object.entries(u.each)[0];
    const have = kind === 'favor' ? favorIn(ch, ability.artId) : (ch[kind] | 0);
    n = Math.floor(have / per) * (u.n == null ? 1 : u.n);
  }
  return n;
}

function available(ability, ch, clock){
  clock = clock || {};
  const log = (ch && ch.used && ch.used[ability.id]) || null;

  if (ability.cooldown){
    const turns = turnsOf(ability.cooldown.turns != null ? ability.cooldown.turns : ability.cooldown);
    const readyOn = log && log.usedOnRound != null ? log.usedOnRound + turns : null;
    if (readyOn != null && (clock.round | 0) < readyOn)
      return { ok:false, kind:'cooldown', readyIn: readyOn - (clock.round|0),
               why:'on cooldown for ' + (readyOn - (clock.round|0)) + ' more turn'
                   + (readyOn - (clock.round|0) === 1 ? '' : 's') };
  }
  const allowed = usesAllowed(ability, ch);
  if (allowed != null){
    const per = ability.uses.per || 'combat';
    const bucket = log && log.per && log.per[per];
    /* the period is identified by the counter's VALUE, so a stale bucket from
       yesterday simply does not match and the budget is whole again */
    const spent = bucket && bucket.at === (clock[per] | 0) ? bucket.n : 0;
    const left = allowed - spent;
    if (left <= 0)
      return { ok:false, kind:'uses', left:0, allowed,
               why:'no uses left ' + (per === 'day' ? 'today' : 'this ' + per) };
    return { ok:true, kind:'uses', left, allowed };
  }
  return { ok:true };
}

/* what USING it costs the clock — returned, never applied */
function spendUse(ability, clock){
  clock = clock || {};
  const out = [];
  if (ability.cooldown) out.push({ op:'cooldown', ability:ability.id, round:clock.round|0 });
  if (ability.uses) out.push({ op:'use', ability:ability.id,
                               per:ability.uses.per || 'combat', at:clock[ability.uses.per || 'combat']|0 });
  return out;
}

/* ── Favor is per Art ──────────────────────────────────────────
   Not one number on the character. Each Art is a separate account with a
   separate patron, and paying an ultimate out of one can drop you below a
   threshold in that Art alone. A character with no Art has no Favor at all —
   which is the bug that started this: Sir Aldric had 22 of it and no Art. */
function favorIn(ch, artId){
  const arts = (ch && ch.arts) || [];
  if (!artId) return null;
  const a = arts.find(x => (x && x.id) === artId);
  return a ? (a.favor | 0) : null;
}
/* 100 Favor is a capstone: the Art stops charging you. */
const CAPSTONE = 100;
const favorCapstone = (ch, artId) => (favorIn(ch, artId) | 0) >= CAPSTONE;

/* ── Wards ─────────────────────────────────────────────────────
   "target gains a Ward that absorbs the next 15 damage" — a pool with a
   number in it, not a label. Wards are consumed in the order they were laid
   down, and an attack that bypasses Ward walks straight past all of them. */
function applyDamage(target, amount, opts){
  opts = opts || {};
  const bypass = opts.bypass || [];
  const out = { dealt:0, absorbed:0, wards:[], changes:[], notes:[] };
  let left = Math.max(0, Math.round(amount));

  if (!bypass.includes('ward')){
    for (const w of (target.ward || [])){
      if (left <= 0) break;
      const take = Math.min(w.n, left);
      w.n -= take; left -= take; out.absorbed += take;
      out.wards.push({ source:w.source || null, took:take, leftInWard:w.n });
      out.changes.push({ op:'ward', to:target.id, source:w.source || null, delta:-take });
    }
    if (out.absorbed) out.notes.push(out.absorbed + ' absorbed by Ward');
  } else if ((target.ward || []).length){
    out.notes.push('went past their Ward');
  }
  out.dealt = left;
  if (left) out.changes.push({ op:'hp', to:target.id, delta:-left });
  return out;
}

/* ── Tokens ────────────────────────────────────────────────────
   Twenty-six of them with real mechanics and three different removal timings.
   The table is the rules text turned into fields, so the app can tick them,
   spend them, and apply them without anybody at the table remembering that
   Bleed goes off at the end of the turn and Hardened goes off when it saves you.

     remove: 'turn'  — comes off at the end of the turn, whatever happened
             'use'   — comes off when it does its job, and not before
             'never' — lasts the combat (true forever is vanishingly rare)  */
const TOKENS = {
  /* positive */
  Crit:        { sign:'good', remove:'use',  text:'next attack crits even on a miss' },
  Riposte:     { sign:'good', remove:'never',text:'may attack when attacked, or on a successful parry' },
  Dodge:       { sign:'good', remove:'use',  text:'spend to dodge one melee or ranged attack' },
  Hardened:    { sign:'good', remove:'use',  text:'half damage from the next hit', damageTaken:0.5 },
  Impenetrable:{ sign:'good', remove:'use',  text:'75% less damage from the next hit', damageTaken:0.25 },
  Guarded:     { sign:'good', remove:'use',  text:'an attack on you is redirected to your Guard' },
  Guard:       { sign:'good', remove:'use',  text:'you are targeted instead of the ally you guard' },
  Inspiration: { sign:'good', remove:'use',  text:'may deal +50% damage', damageDealt:1.5 },
  'Greater Inspiration':
               { sign:'good', remove:'use',  text:'may deal double damage', damageDealt:2 },
  Swiftness:   { sign:'good', remove:'use',  text:'reload as a quick action, a second ranged attack, or a free offhand melee attack' },
  Determination:{sign:'good', remove:'use',  text:'on Death’s Door, auto-succeed every check from that attack', lasts:'d6 turns' },
  /* neutral */
  Taunt:       { sign:'neutral', remove:'turn', text:'enemies that could target you must' },
  Goad:        { sign:'neutral', remove:'use',  text:'enemies that could target you must; one comes off per attack made against you' },
  Rooted:      { sign:'neutral', remove:'turn', text:'cannot move' },
  Immobilize:  { sign:'neutral', remove:'turn', text:'cannot move or be moved' },
  Stealth:     { sign:'neutral', remove:'turn', text:'non-AoE attacks cannot hit you and enemies cannot see you' },
  /* negative */
  Daze:        { sign:'bad', remove:'never', text:'go last in initiative; every 2 become 1 Stun', convert:{ at:2, to:'Stun', n:1 } },
  Stun:        { sign:'bad', remove:'use',  text:'lose your turn' },
  Blind:       { sign:'bad', remove:'use',  text:'cannot see; +1 attack difficulty per token', difficulty:1 },
  Weakened:    { sign:'bad', remove:'use',  text:'50% less damage on the next attack', damageDealt:0.5 },
  Vulnerable:  { sign:'bad', remove:'use',  text:'150% damage from the next hit', damageTaken:1.5 },
  Brittle:     { sign:'bad', remove:'use',  text:'double damage from the next hit', damageTaken:2 },
  Bleed:       { sign:'bad', remove:'tick', text:'damage equal to the token count at end of turn', tick:true },
  Blight:      { sign:'bad', remove:'tick', text:'damage equal to the token count at end of turn', tick:true },
  Fire:        { sign:'bad', remove:'tick', text:'damage equal to the token count at end of turn', tick:true },
  Winded:      { sign:'bad', remove:'never', text:'−1 on all attacks; only comes off when stamina comes back', attack:-1 },
  Debilitated: { sign:'bad', remove:'never', text:'lose your attribute bonus to damage, charge bonus included' },
  Helpless:    { sign:'bad', remove:'turn', text:'no resistance; cannot dodge or parry' },
  Prone:       { sign:'bad', remove:'turn', text:'knocked down' },
  Dismounted:  { sign:'bad', remove:'never', text:'off your mount' },
};

const tokensOf = ent => (ent && ent.cond) || [];
const tokenCount = (ent, name) => { const t = tokensOf(ent).find(x => x.n === name); return t ? t.c : 0; };

/* Everything the tokens do to one attack, collected. Returned as a report
   rather than a number so the chat line can say WHY the damage was what it was
   — "18, doubled by Brittle, then 15 absorbed by Ward" is a record; "3" is not. */
function damageMods(attacker, target){
  const out = { dealt:1, taken:1, spend:[], why:[] };
  const once = (ent, name, side) => {
    if (!tokenCount(ent, name)) return;
    const t = TOKENS[name];
    if (side === 'dealt' && t.damageDealt != null){ out.dealt *= t.damageDealt;
      out.spend.push({ who:ent.id, token:name }); out.why.push(name); }
    if (side === 'taken' && t.damageTaken != null){ out.taken *= t.damageTaken;
      out.spend.push({ who:ent.id, token:name }); out.why.push(name); }
  };
  if (attacker){ once(attacker,'Greater Inspiration','dealt'); once(attacker,'Inspiration','dealt');
                 once(attacker,'Weakened','dealt'); }
  if (target){ once(target,'Brittle','taken'); once(target,'Vulnerable','taken');
               once(target,'Impenetrable','taken'); once(target,'Hardened','taken'); }
  return out;
}
/* what the tokens do to an attack ROLL, as opposed to its damage */
function attackMods(ent){
  const blind = tokenCount(ent, 'Blind'), winded = tokenCount(ent, 'Winded');
  return { difficulty: blind * (TOKENS.Blind.difficulty || 0),
           dice: winded ? TOKENS.Winded.attack : 0,
           why: [blind ? blind + ' Blind' : null, winded ? 'Winded' : null].filter(Boolean) };
}

/* THE END OF A TURN. Bleed, Blight and Fire go off and step down; the
   turn-timed tokens come off; two Daze become a Stun. Nobody at the table
   should be remembering any of this. */
function tickTokens(ent){
  const out = { changes:[], damage:0, notes:[] };
  for (const t of tokensOf(ent).slice()){
    const def = TOKENS[t.n]; if (!def) continue;
    if (def.tick){
      out.damage += t.c;
      out.notes.push(t.c + ' from ' + t.n);
      out.changes.push({ op:'token', to:ent.id, token:t.n, delta:-1 });
    } else if (def.remove === 'turn'){
      out.changes.push({ op:'token', to:ent.id, token:t.n, delta:-1 });
      out.notes.push(t.n + ' wears off');
    }
    if (def.convert && t.c >= def.convert.at){
      const n = Math.floor(t.c / def.convert.at);
      out.changes.push({ op:'token', to:ent.id, token:t.n, delta:-n * def.convert.at });
      out.changes.push({ op:'token', to:ent.id, token:def.convert.to, delta:n * def.convert.n });
      out.notes.push(n * def.convert.at + ' ' + t.n + ' became ' + n * def.convert.n + ' ' + def.convert.to);
    }
  }
  if (out.damage) out.changes.push({ op:'hp', to:ent.id, delta:-out.damage });
  return out;
}

/* ── Formation combat ──────────────────────────────────────────
   A formation is not a big unit and does not fight like one. Both halves are
   dice a person would have to roll and count by hand, ten at a time, which is
   exactly the kind of thing that gets waved through as "call it three" at
   two in the morning. */

/* ATTACKING: one d6 per living body, successes at or above the Attack Skill,
   damage is successes x Attack Value — and it is thrown at a WHOLE LINE, not
   at a person, unless the target is itself a formation. */
function formationAttack(form, rng){
  rng = rng || Math.random;
  const n = form.alive != null ? form.alive : form.units || 0;
  const dice = [];
  for (let i = 0; i < n; i++) dice.push(1 + Math.floor(rng() * 6));
  const skill = form.attackSkill != null ? form.attackSkill : 4;
  const hits = dice.filter(d => d >= skill).length;
  const value = form.attackValue != null ? form.attackValue : 1;
  return { dice, skill, hits, value, damage: hits * value,
           spread:'the whole line — every unit on it takes at least 1',
           text: n + 'd6, ' + hits + ' at ' + skill + '+ × ' + value + ' = ' + (hits * value) };
}

/* BEING ATTACKED: work out how many bodies are at risk, then let the Defense
   Skill try to save each one. No Defense Skill means the arithmetic simply
   happens. */
function formationHit(form, damage, opts, rng){
  opts = opts || {}; rng = rng || Math.random;
  const hpEach = form.hpEach != null ? form.hpEach : (form.hpea != null ? form.hpea : 1);
  const atRisk = opts.aoe ? Math.floor(damage / hpEach) : (damage > hpEach ? 1 : 0);
  const capped = Math.min(atRisk, form.alive != null ? form.alive : form.units || 0);
  const out = { hpEach, atRisk:capped, saves:[], dead:capped, changes:[], text:'' };
  const def = form.defSkill != null ? form.defSkill : (form.def && /^\d/.test(form.def) ? parseInt(form.def) : null);
  if (def){
    out.dead = 0;
    for (let i = 0; i < capped; i++){
      const d = 1 + Math.floor(rng() * 6);
      const saved = d >= def;
      out.saves.push({ roll:d, saved });
      if (!saved) out.dead++;
    }
    out.text = capped + ' at risk, ' + def + '+ to survive — ' + out.dead + ' died';
  } else {
    out.text = capped + ' at risk, no Defense Skill — ' + out.dead + ' died';
  }
  if (out.dead) out.changes.push({ op:'casualties', to:form.id, n:out.dead });
  return out;
}

/* ── Leadership ────────────────────────────────────────────────
   The other thing no GM can carry: a d100 under the unit's number, at the end
   of any turn it took leadership damage, laddering down on failures and back
   up on two in a row. Fourteen listed ways to lose it. NPC units only —
   player characters do not rout. */
const LEAD_LADDER = ['Stable','Wavering','Crumbling','Broken'];
const LEAD_LOSS = ['sustained casualties','severe casualties this turn','allies routing nearby',
  'a feared or terrifying enemy nearby','encirclement','army-wide casualties','allied casualties',
  'a leadership-debuffing spell','an intimidation roll','their lord or leader is dead',
  'their formation officer is dead','being charged','losing this fight',
  'being targeted by archers or artillery','enemy air supremacy'];
const LEAD_GAIN = ['winning this fight','encouraged by a lord or captain','being the defender',
  'flanks secure','an inspire effect','ranged supremacy','the high ground'];

function leadershipTest(unit, rng){
  rng = rng || Math.random;
  const lead = unit.leadership | 0;
  const out = { roll:0, pass:false, fails:unit.leadFails | 0, streak:unit.leadStreak | 0,
                state:LEAD_LADDER[Math.min(3, unit.leadFails | 0)], changes:[], notes:[] };

  /* Unbreakable is a flat 100 and cannot rout, full stop. */
  if (unit.unbreakable || lead >= 100){
    out.pass = true; out.notes.push('unbreakable — no test');
    return out;
  }
  /* Leadership at exactly 0 is Shattered: automatic, immediate, no recovery. */
  if (lead <= 0){
    out.shattered = true; out.routed = true; out.state = 'Shattered';
    out.notes.push('leadership 0 — shattered, routs with no recovery');
    out.changes.push({ op:'lead', to:unit.id, state:'Shattered', routed:true });
    return out;
  }
  out.roll = 1 + Math.floor(rng() * 100);
  out.pass = out.roll < lead;                 // "success if the roll is UNDER"

  if (out.pass){
    out.streak = (unit.leadStreak | 0) + 1;
    if (out.streak >= 2 && out.fails > 0){    // two in a row climbs one rung
      out.fails--; out.streak = 0; out.notes.push('steadied');
    }
  } else {
    out.fails = (unit.leadFails | 0) + 1;
    out.streak = 0;
  }
  out.state = LEAD_LADDER[Math.min(3, out.fails)];

  /* the ones that never run: they take the damage instead */
  const stoic = unit.undead || unit.demonic || unit.elemental || unit.construct;
  if (!out.pass && stoic){
    out.fails = unit.leadFails | 0;           // no ladder for them
    out.state = LEAD_LADDER[Math.min(3, out.fails)];
    out.damageInstead = true;
    out.notes.push('undead or unliving — takes damage rather than routing');
  } else if (out.fails >= (unit.routsAt || 3)){
    out.routed = true;
    out.notes.push('routs');
  }
  if (out.state === 'Crumbling') out.notes.push('crumbling — attack and aim penalties, cannot charge');
  out.changes.push({ op:'lead', to:unit.id, fails:out.fails, streak:out.streak,
                     state:out.state, routed:!!out.routed });
  return out;
}

/* A Broken unit that is asked to run rolls for it: 1-5 rout, 6 surrender —
   and once the fight is decided anyway it is a coin toss. */
function brokenChoice(decided, rng){
  rng = rng || Math.random;
  if (decided) return rng() < 0.5 ? 'routs' : 'surrenders';
  return (1 + Math.floor(rng() * 6)) === 6 ? 'surrenders' : 'routs';
}

/* ══ exports ══ */
const RULES = { ATTRS, ATTR_KEYS, LINES, LINE_AT, forward, DAMAGE_TYPES,
  expr, evaluate, explain, value, skillTotal, dicePool, moveSpeed, startingDodge,
  chargeBonus, maxHealth, maxStamina, maxStress, affordable, cantripReady,
  canCastFrom, legalTargets, describe, describeEffect, EFFECTS, WHEN,
  roll, tally, crit, autoSpend, BYPASS, rollValue, ACTIONS, actionAvailable, usability, resolve,
  /* the bookkeeping */
  TURN_SECONDS, turnsOf, durationText, PERIODS, usesAllowed, available, spendUse,
  favorIn, favorCapstone, CAPSTONE, applyDamage,
  TOKENS, tokensOf, tokenCount, damageMods, attackMods, tickTokens,
  formationAttack, formationHit,
  LEAD_LADDER, LEAD_LOSS, LEAD_GAIN, leadershipTest, brokenChoice };
if (typeof module !== 'undefined') module.exports = RULES;
if (typeof window !== 'undefined') window.RULES = RULES;
