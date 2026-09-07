/* ══════════════════════════════════════════════════════════════
   MONARCHY — CONTENT, TYPED

   Everything here is transcribed from the rules PDF, not invented, EXCEPT
   where a `todo` field says otherwise. Those are the places the written rules
   are silent and something had to be chosen for the app to say anything at
   all — each one is marked so it can be corrected rather than discovered.

   The point of this file is not to be complete. It is to be REAL enough to
   break the schema: a weapon whose damage changes with the wielder's size, a
   Style whose abilities are reactions, a Lore that costs from a shared pool,
   an Art gated behind banked Favor, and a trait that is a passive rather than
   an action. If the schema survives these five it will survive the rest.
   ══════════════════════════════════════════════════════════════ */

/* ── WEAPONS ───────────────────────────────────────────────────
   Quality is not a modifier applied to a weapon. It is WHERE THE WEAPON IS
   in its own family tree — "decrepit great mace" and "great mace" are two
   entries that happen to be related, and each carries its own numbers. So a
   weapon knows its `family` and its `tier`, and the tree is reconstructed
   from those rather than stored as a modifier to be applied at runtime.

   Range is counted forward in lines with YOUR OWN LINE AS 0. A great weapon
   at range 2 reaches the line it stands in, the line ahead, and the one after
   that — which is what lets a second rank fight over a frontline. */
const WEAPONS = [
  /* grumkata's own entries. Nothing here is invented except where a `todo`
     says so — I made up an arming sword and a longbow in the first pass and
     got them wrong, which was predictable and my fault for guessing. */
  {
    id:'great-mace-decrepit', name:'Decrepit Great Mace',
    family:'great-mace', tier:0, tierName:'Decrepit',
    skill:['Melee Weapons','Blunt','Maces'],
    attr:'prowess', range:2,
    tags:['great weapon','two-handed','blunt'],
    damage:'d8 + Prowess', damageType:'blunt', hands:2, effects:[],
  },
  {
    id:'longsword-decrepit', name:'Decrepit Longsword',
    family:'longsword', tier:0, tierName:'Decrepit',
    skill:['Melee Weapons','Slashing/Piercing','Swords'],
    attr:'prowess', range:2,
    tags:['great weapon','two-handed','bladed'],
    damage:'d10 + Prowess', damageType:'piercing/slashing', hands:2, effects:[],
  },
  {
    id:'spear', name:'Spear',
    family:'spear', tier:1, tierName:'Serviceable',
    skill:['Melee Weapons','Polearms','Spears'],
    attr:'prowess', range:2, tags:['polearm','reach','two-handed'],
    damage:'d6 + half Prowess', damageType:'piercing', hands:2, effects:[],
    invented:true,
    todo:['EVERY NUMBER HERE IS MINE, NOT YOURS. It exists only so the ' +
          'Impervious Spearmanship style has something to hold. Replace it.'],
  },
];

/* THE DEFAULTS, so a new weapon does not have to restate them:
     a great weapon adds your FULL Prowess
     any other melee weapon adds HALF Prowess, most of the time
     very few weapons use Nimble — Prowess is the melee attribute
   "Most of the time" is doing real work in that sentence: these are the
   starting point for a new entry, not a rule the entry has to obey. Every
   weapon still carries its own expression and may ignore all of this. */
const WEAPON_DEFAULTS = {
  attr:'prowess',
  bonus:{ 'great weapon':'Prowess', melee:'half Prowess' },
};

/* ── GENERIC MOVES ─────────────────────────────────────────────
   From the PDF: "If your combined skill level of 5 or more (must have 2 in
   the tertiary skill) or more you have access to the given weapon's generic
   moves." So these are not bought — they UNLOCK, and the app can tell you
   the moment you qualify. They attach to weapon tags rather than to weapons,
   which is why one entry serves every great mace ever written. */
const GENERIC = [
  {
    id:'gm-heart-stopper', name:'Heart Stopper', kind:'move',
    forTags:['great mace','morningstar'], unlock:{ skillTotal:5, tertiary:2 },
    cost:{ stamina:5 }, action:'full',
    text:'Make a called attack on the torso, with no accuracy penalty for the called shot. '
       + 'If you hit you may roll damage twice. If it sends them below 25% HP they die instantly '
       + '(and if they were already below 25% HP they die instantly).',
    effects:[
      { effect:'note', text:'Called shot to the torso, no accuracy penalty' },
      { effect:'note', when:'onHit', text:'Roll this weapon’s damage twice' },
      { effect:'note', when:'onHit', text:'Instant death if it takes them below 25% HP, or if they were already below it' },
    ],
  },
  {
    id:'gm-bone-break', name:'Bone Break', kind:'move',
    forTags:['mace','club'], unlock:{ skillTotal:5, tertiary:2 },
    cost:{ stamina:4 }, action:'full',
    text:'Make a called attack on a specific limb (head and chest count). If you rolled at '
       + 'least the median of the damage roll, cripple that limb. Damage cannot exceed 50% of max.',
    effects:[
      { effect:'note', text:'Called shot to a named limb' },
      { effect:'note', when:'onHit', text:'Cripple the limb if the damage roll was at or above its median' },
      { effect:'note', when:'onHit', text:'Damage is capped at half the target’s maximum HP' },
    ],
  },
  {
    id:'gm-shove', name:'Shove', kind:'stunt',
    forTags:['one-handed'], unlock:{ skillTotal:5, tertiary:2 },
    cost:{}, action:'quick',
    text:'Does 1 damage if your Prowess is 1 or higher. They are moved out of range; '
       + 'they must make a Fortitude check for that not to happen.',
    effects:[
      { effect:'damage', amount:'1', when:'onHit' },
      { effect:'check', who:'target', attr:'fortitude',
        onFail:[{ effect:'move', who:'target', lines:1, direction:'back', forced:true }] },
    ],
  },
];

/* ── TRAITS ────────────────────────────────────────────────────
   Passives, in three shapes the PDF names: a small bonus, a situational perk,
   or access to an action. Typed the same way so the app can show a trait's
   effect with the same numbers filled in as an ability's. */
const TRAITS = [
  {
    id:'overwhelming-force', name:'Overwhelming Force', kind:'bonus',
    source:{ kind:'weapon', tags:['great mace','morningstar'] },
    text:'When you hit a target, their physical dice are reduced by your Prowess for their '
       + 'next action — but only if your Prowess is higher than their Fortitude.',
    effects:[
      { effect:'modifyRoll', dice:-1, to:'target', scope:'their next physical action',
        when:'onHit', amount:'Prowess',
        note:'only while your Prowess exceeds their Fortitude' },
    ],
    todo:['"reduced by your prowess mod" — is that the full attribute, or a modifier derived from it?'],
  },
  {
    id:'flight', name:'Flight', kind:'action',
    source:{ kind:'species', id:'kit-knight' },
    text:'You can fly.',
    effects:[{ effect:'note', text:'Movement may ignore ground obstacles — GM adjudicates reach and height' }],
  },
  {
    id:'wardens-sense', name:"Warden's Sense", kind:'perk',
    source:{ kind:'background', id:'silver-warden' },
    text:'Immunity to disease, resistance to demonic magic, and holy marks.',
    effects:[
      { effect:'note', text:'Immune to disease' },
      { effect:'note', text:'Resistant to demonic magic' },
    ],
  },
];

/* ── A STYLE ───────────────────────────────────────────────────
   Impervious Spearmanship, transcribed whole. Styles run on Stamina and are
   the most mechanical of the three power types, which makes this the best
   test of whether the effect vocabulary is rich enough: it has reactions,
   triggers off other abilities, conditional cascade damage, and a passive
   that trades one resource for another. */
const STYLES = [{
  id:'impervious-spearmanship', name:'Impervious Spearmanship', tier:'common',
  weapons:'spear and large shield',
  flavour:"You don't remember when you stopped being a man and became a wall. "
        + 'They come in hordes, screaming for your blood, and every single one breaks upon you '
        + 'like water on stone. You are inevitable. You are immovable. You are the end of the advance.',
  passives:[{
    id:'closely-guarded', name:'Closely Guarded',
    text:'You may forgo your movement for an additional Brace action (costs 1 stamina to do).',
    effects:[{ effect:'note', text:'Trade your movement for an extra Brace, at a cost of 1 stamina' }],
  }],
  abilities:[
    { id:'is-brace', name:'Brace', core:true, cost:{}, action:'free', range:1,
      arms:'Braced',            /* you SET this down and it waits */
      targets:{ side:'enemy', kind:['unit','formation'] },
      text:'Until next turn, anyone who moves into your range to attack you — anyone who moves '
         + 'into your melee range — you may make a free attack on them. If they are cavalry you '
         + 'dismount them. If they are size Large or larger they may not move.',
      trigger:'an enemy moves into your range',
      effects:[
        { effect:'freeAttack', with:'spear', when:'onTrigger' },
        { effect:'dismount', to:'target', when:'onTrigger' },
        { effect:'note', when:'onTrigger', text:'A Large or larger target may not move at all' },
      ] },
    { id:'is-retaliatory-bash', name:'Retaliatory Bash', core:true, cost:{}, action:'free',
      /* never a thing you do on your turn — it exists only as the attack Brace
         causes, so it belongs behind Brace rather than beside it */
      respondsTo:'is-brace', range:1, targets:{ side:'enemy', kind:['unit'] },
      roll:{ skill:['Melee Weapons','Shields','Heavy'], attr:'prowess' },
      text:'May only be used as an attack caused by Brace. On success you shield bash them and knock them prone.',
      effects:[{ effect:'prone', to:'target', when:'onHit' }] },
    { id:'is-wall-holds', name:'The Wall Holds', cost:{ stamina:1 }, action:'reaction',
      trigger:'you successfully block an attack', range:1,
      targets:{ side:'enemy', kind:['unit'] },
      text:'When you successfully block an attack you may push the attacker back, and they must '
         + 'make a Dexterity balance check at difficulty 2. On a failure they are knocked prone.',
      effects:[
        { effect:'move', who:'target', lines:1, direction:'back', forced:true },
        { effect:'check', who:'target', attr:'dexterity', difficulty:'2',
          onFail:[{ effect:'prone', to:'target' }] },
      ] },
    { id:'is-firm-defense', name:'Firm Defense', cost:{ stamina:2 }, action:'quick',
      targets:{ side:'self' },
      text:'You dig your shield deep into the ground. You cannot be moved, knocked prone or grappled '
         + 'until your next turn, and you gain 1 automatic success on blocking all uncalled attack '
         + 'attempts — unless they specify they are attacking from behind or the sides.',
      effects:[
        { effect:'token', token:'Immobilize', count:'1', to:'self',
          note:'self-imposed: cannot be moved, downed or grappled' },
        { effect:'modifyRoll', autoSuccess:1, to:'self', scope:'blocks against uncalled attacks' },
        { effect:'note', text:'No benefit against attacks declared from behind or the sides' },
      ] },
    { id:'is-shield-slam', name:'Shield Slam', cost:{ stamina:2 }, action:'full', range:1,
      targets:{ side:'enemy', kind:['unit'] },
      roll:{ skill:['Melee Weapons','Shields','Heavy'], attr:'prowess' },
      text:'Make a shield bash attack. On success, deal your Prowess in damage and push the target '
         + 'back 10 feet. If this pushes them into another enemy or obstacle, both take an '
         + 'additional 1d6 damage and the target is knocked prone.',
      effects:[
        { effect:'damage', amount:'Prowess', when:'onHit' },
        { effect:'move', who:'target', lines:1, direction:'back', forced:true, when:'onHit' },
        { effect:'damage', amount:'1d6', to:'target', when:'pushed into something' },
        { effect:'prone', to:'target', when:'pushed into something' },
      ],
      todo:['"push back 10 feet" in a line-based game — modelled as 1 line'] },
    { id:'is-impaling-counter', name:'Impaling Counter', cost:{ stamina:5 }, action:'reaction',
      trigger:'you knock an enemy prone', range:1, targets:{ side:'enemy', kind:['unit'] },
      roll:{ skill:['Melee Weapons','Polearms','Spears'], attr:'prowess' },
      text:'When you successfully knock an enemy prone you may immediately make a spear attack '
         + 'against them while they are falling. This attack ignores all armour and resistances '
         + '(not immunities).',
      /* "ignores all armour and resistances (not immunities)" — armour here
         means a physical Ward. This is a STYLE ability, so it is only available
         to someone who bought Impervious Spearmanship; nothing general. */
      effects:[{ effect:'damage', amount:'weapon', bypass:['ward','resistance'],
                 when:'onHit', note:'immunities still stop it' }] },
    { id:'is-breakthrough', name:'Breakthrough', cost:{ stamina:7 }, action:'full', range:4,
      targets:{ side:'enemy', kind:['unit','formation'], count:'every enemy in your path' },
      roll:{ skill:['Melee Weapons','Polearms','Spears'], attr:'prowess' },
      text:'Make a charging spear attack with your shield raised. You may move up to your full '
         + 'movement in a straight line, making a spear attack against every enemy in your path. '
         + 'You start at 2 reduced difficulty and each attack increases difficulty by 1. Enemies '
         + 'hit are knocked prone. You cannot be stopped or knocked prone during this charge.',
      effects:[
        { effect:'modifyRoll', difficulty:-2, to:'self', scope:'the first attack of the charge' },
        { effect:'note', text:'Each attack after the first is +1 difficulty on the one before' },
        { effect:'prone', to:'target', when:'onHit' },
        { effect:'note', text:'You cannot be stopped or knocked prone during the charge' },
      ] },
    { id:'is-bristling-defense', name:'Bristling Defense', cost:{ stamina:8 }, action:'full',
      arms:'Bristling', targets:{ side:'self' },
      text:'Until your next turn, any enemy that attacks you in melee — whether they hit or miss — '
         + 'takes 1d6 automatic damage from your spear positioning. If you are Braced, this '
         + 'increases to 2d6.',
      effects:[{ effect:'damage', amount:'1d6', to:'target',
                 when:'an enemy attacks you in melee', note:'2d6 instead while you are Braced' }] },
  ],
}];

/* ── A LORE ────────────────────────────────────────────────────
   Spells of Glory. Lores run on MANA, and mana is the one resource nobody
   owns: it is a shared pool in the air that both armies draw from, so the
   cost check has to look at the board rather than at the character. */
const LORES = [{
  id:'spells-of-glory', name:'Spells of Glory', tier:'masterful',
  base:'charisma', incompatible:['lore-of-tyranny'],
  passives:[{
    id:'sweet-victory', name:'Sweet Victory',
    text:'The first time each round a summoned formation or unit you control kills an enemy unit, '
       + 'the cost of your next spell is reduced by 1. This stacks up to your Presence. '
       + 'Does not last between combats.',
    effects:[{ effect:'note', text:'−1 to your next spell’s cost, once per round, stacking up to your Presence' }],
  }],
  abilities:[
    { id:'sog-commanding-shout', name:'Commanding Shout', cantrip:true, cost:{}, action:'full',
      range:1, castZones:null,
      targets:{ side:'ally', kind:['unit','formation'], count:'Presence units, or one formation' },
      text:'You bark an order that spurs your forces to immediate action. Target one allied or '
         + 'summoned formation, or a number of allied or summoned units equal to your Presence, '
         + 'within range 1. They may immediately make a single basic attack against a target in '
         + 'their range. This attack counts as their action for the round. They gain +1 attack for '
         + 'the attack if they are not a formation, +0.25 attack if they are.',
      effects:[
        { effect:'freeAttack', with:'their own weapon', to:'allies' },
        { effect:'note', text:'Spends the target’s action for the round' },
        { effect:'modifyRoll', dice:1, to:'allies', scope:'that attack', note:'+0.25 for a formation' },
      ] },
    { id:'sog-call-aspirant', name:'Call the Aspirant', cost:{ mana:6 }, action:'full',
      targets:{ side:'ally', kind:['unit'], count:1 },
      text:'Promote one unit to an Aspirant on your side — a capable individual warrior. You may '
         + 'have a number of Aspirants equal to your Presence summoned at a time. They keep all '
         + 'equipment they had at the time of promotion. Aspirants have +2 HP. Without a champion '
         + 'this takes 30 minutes (360 turns), or costs an additional 7 mana.',
      effects:[
        { effect:'summon', what:'Aspirant (the promoted unit, +2 HP)', count:'1' },
        { effect:'note', text:'Cap: as many Aspirants as your Presence' },
        { effect:'resource', kind:'mana', amount:'7',
          when:'you control no champion', note:'or take 30 minutes instead' },
      ] },
    { id:'sog-distribution-of-faith', name:'Distribution of Faith',
      cost:{ mana:7, hp:6 }, action:'full', range:1,
      targets:{ side:'ally', kind:['unit','formation'], count:'Presence allies, or one formation' },
      text:'You sacrifice 6 of your own HP — this cost cannot be reduced in any way. The targets '
         + 'gain a Ward that absorbs the next 15 damage. With a champion it lasts to the end of '
         + 'combat; with an Aspirant only, 4 turns; with neither, exactly 1 turn.',
      effects:[
        { effect:'token', token:'Ward 15', count:'1', to:'allies' },
        { effect:'note', text:'Duration: end of combat with a champion, 4 turns with an Aspirant, 1 turn with neither' },
      ] },
    { id:'sog-glorious-battle', name:'Glorious Battle', cost:{ mana:10 }, action:'full', range:2,
      targets:{ side:'enemy', kind:['formation'], count:'all in a 2-line cone' },
      text:'A wave of brilliant energy surges from your position. All enemy formations in a range 2 '
         + 'cone in front of you take 1d6 Radiant damage. For every allied or summoned formation '
         + 'adjacent to you, the damage increases by 1d6. If you control at least 1 champion this '
         + 'has a blinding effect.',
      effects:[
        { effect:'damage', amount:'1d6', type:'radiant', to:'allInRange' },
        { effect:'note', text:'+1d6 for every allied or summoned formation adjacent to you' },
        { effect:'token', token:'Blind', count:'1', to:'allInRange',
          when:'you control at least one champion' },
      ] },
    { id:'sog-avatar', name:'Avatar of Glory', ultimate:true, cost:{ mana:30 }, action:'full',
      targets:{ side:'any', count:'a location you can see' },
      text:'You tear a fragment of your own soul to forge a beacon of absolute loyalty. All allied '
         + 'and subservient formations anywhere on the battlefield immediately gain 5 temporary Ward '
         + 'and +2 dice to all attack and defense rolls until the start of the next round. While the '
         + 'Avatar is active you are incapacitated. If it is destroyed it explodes: all enemy '
         + 'formations within range 4 take 2d6 Radiant, and every allied formation gets a free move '
         + 'and a free attack. Duration 30 seconds (6 turns).',
      effects:[
        { effect:'summon', what:'Avatar of Glory (30 HP + 1 per controlled formation, 1 armour per unique champion)' },
        { effect:'token', token:'Ward 5', count:'1', to:'allies' },
        { effect:'modifyRoll', dice:2, to:'allies', scope:'all attack and defense rolls until next round' },
        { effect:'note', text:'You are incapacitated while it stands' },
        { effect:'damage', amount:'2d6', type:'radiant', to:'allInRange', when:'the Avatar is destroyed' },
        { effect:'grantAction', kind:'move', to:'allies', when:'the Avatar is destroyed' },
        { effect:'grantAction', kind:'attack', to:'allies', when:'the Avatar is destroyed' },
      ] },
  ],
}];

/* ── AN ART ────────────────────────────────────────────────────
   Nehekhara, chosen because it is the one Art that already writes its own
   targeting down — "cast zones: back, support | attack zones: any" — which is
   where the two-part targeting model came from.

   Favor is a THRESHOLD, not a cost. You unlock an ability by having banked
   enough; only ultimates actually spend it, and spending can drop you below
   other thresholds and take those abilities away again. So the two are
   separate fields and the app has to show them differently. */
const ARTS = [{
  id:'art-of-nehekhara', name:'Divine Art of Nehekhara', tier:'advanced',
  entity:'the Mortuary Cult',
  passives:[{
    id:'restless-dead', name:'Restless Dead',
    text:'Whenever you cast a spell, you and all undead allies gain HP equal to your summon cantrip count.',
    effects:[{ effect:'heal', amount:'1', to:'allies',
               note:'equal to your summon cantrip count, so it grows as the Art does' }],
  }],
  abilities:[
    { id:'neh-bolt', name:'Bolt of Usirian', basic:true, favorThreshold:0, cost:{}, action:'full',
      range:7, targets:{ side:'enemy', kind:['unit','formation'] },
      roll:{ skill:['Divine','Divine Magic'], attr:'intelligence' },
      text:'A basic attack of raw mortuary power.',
      effects:[{ effect:'damage', amount:'d6', type:'necrotic', when:'onHit' }],
      todo:['damage undefined in the source — d6 necrotic is a placeholder'] },
    { id:'neh-summon', name:'Summon the Sun-Scorched', cantrip:true, favorThreshold:0,
      cost:{}, action:'full', targets:{ side:'self' },
      text:'Summon 2 tier 0 units (sun-scorched skeletons). Summon limit 2.',
      effects:[{ effect:'summon', what:'tier 0 sun-scorched skeleton', count:'2' },
               { effect:'note', text:'Summon limit 2, raised by later thresholds' }] },
    { id:'neh-protection', name:"Neru's Incantation of Protection", favorThreshold:5,
      cost:{}, action:'full', castZones:['back','support'], range:7,
      targets:{ side:'ally', kind:['unit','formation'], count:1 },
      text:'Target 1 formation or 1 ally — or both, if both are undead. The target gains 1 Hardened token.',
      effects:[{ effect:'token', token:'Hardened', count:'1', to:'target' },
               { effect:'note', text:'May take both a formation and an ally if both are undead' }] },
    { id:'neh-cursed-blades', name:"Djaf's Incantation of Cursed Blades", favorThreshold:10,
      cost:{}, action:'full', castZones:['back','support'], range:7,
      targets:{ side:'ally', kind:['unit','formation'], count:1 },
      text:'Target 1 formation or 1 ally (or both, if both are undead). The target gains 1 Inspiration '
         + 'token; their blades are imbued with the power of death and harvest the souls they kill.',
      effects:[{ effect:'token', token:'Inspiration', count:'1', to:'target' }] },
    { id:'neh-vengeance', name:"Usirian's Incantation of Vengeance", favorThreshold:20,
      cost:{}, action:'full', castZones:['back','support'], range:7,
      uses:{ per:'day', n:2 },
      targets:{ side:'enemy', kind:['unit','formation'], count:1 },
      text:'Target 1 formation or unit. The target gains 1 Rooted token and takes d8+4 force damage '
         + '(multi-target). 2 casts a day.',
      effects:[{ effect:'token', token:'Rooted', count:'1', to:'target' },
               { effect:'damage', amount:'d8+4', type:'force', to:'target' }] },
    { id:'neh-desiccation', name:"Usekph's Incantation of Desiccation", favorThreshold:45,
      cost:{}, action:'full', castZones:['back','support'], range:7,
      uses:{ per:'day', n:1 },
      targets:{ side:'enemy', kind:['unit','formation'], count:1 },
      text:'Apply 1 Vulnerable and 1 Weakened token. 1 cast a day.',
      effects:[{ effect:'token', token:'Vulnerable', count:'1', to:'target' },
               { effect:'token', token:'Weakened', count:'1', to:'target' }] },
    { id:'neh-hierotitan', name:'Summon Hierotitan', ultimate:true, favorThreshold:50,
      cost:{ favor:20 }, action:'full', targets:{ side:'self' },
      text:'Summon a hierotitan to slay your foes. It gets 1 free cast of Burden of Evil.',
      effects:[{ effect:'summon', what:'Hierotitan', count:'1' },
               { effect:'note', text:'It arrives with one free cast of Burden of Evil' }] },
  ],
}];

const CONTENT = { WEAPONS, WEAPON_DEFAULTS, GENERIC, TRAITS, STYLES, LORES, ARTS };
/* ── every ability knows where it came from ────────────────────
   Favor is banked PER ART, cooldowns are tracked per ability, and a card has
   to be able to say "Impervious Spearmanship" without being told. Stamping the
   source on once, here, is the alternative to threading it through every call
   that ever touches an ability. */
(function stampSource(){
  const mark = (list, kind, key) => (list || []).forEach(src => {
    const all = [].concat(src.abilities || [], src.passives || [],
                          src.stunts || [], src.moves || [], src.traits || []);
    all.forEach(a => { a.source = src.name; a.sourceKind = kind; a[key] = src.id; });
  });
  mark(typeof STYLES !== 'undefined' ? STYLES : [], 'style', 'styleId');
  mark(typeof LORES  !== 'undefined' ? LORES  : [], 'lore',  'loreId');
  mark(typeof ARTS   !== 'undefined' ? ARTS   : [], 'art',   'artId');
})();

if (typeof module !== 'undefined') module.exports = CONTENT;
if (typeof window !== 'undefined') window.CONTENT = CONTENT;
