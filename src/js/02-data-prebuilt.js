/* ══ PREBUILT DATA ══ */
const PREBUILT_DATA = {

  // ══════════════════════════════════════════════
  //  BACKGROUNDS
  // ══════════════════════════════════════════════
  backgrounds: [

    {
      id: 'wanderer',
      name: 'Wanderer',
      desc: 'Your A Drifter, Claiming Nowhere As Your Home But Learning Quickly How Things Work On With A Nomadic Lifestyle. \r',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Survival → Streetsmarts',
            'Survival → Wilderness → Hunting',
            'Survival → Wilderness → Foraging',
            'Survival → Wilderness → Tracking',
            'Resilience → Endurance → Marches',
            'Insight → Common Sense',
            'Insight → Perception',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons → Polearms → Improvised',
            'Ranged Weapons → Bows → Shortbow',
            'Charm → Diplomacy',
            'Acting → Lying',
            'Etiquette → Commoners',
            'Insight → Appraisal',
          ],
        },
      ],
    },

    {
      id: 'soldier',
      name: 'Soldier',
      desc: 'You Were A Professional Soldier, Either Conscripted Or Taken The King\'s Shilling You Fought In War For The Name Of A Higher Power\r',
      notes: 'Gain the "Professional Fighter" Martial Style. If you already have a Style it is cheaper by 2 points instead.',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons → Polearms → Spears',
            'Melee Weapons → Polearms → Halberds',
            'Melee Weapons → Slashing → Swords',
            'Melee Weapons → Slashing → Axes',
            'Melee Weapons → Piercing → Swords',
            'Ranged Weapons → Bows → Longbow',
            'Ranged Weapons → Crossbows → Light Crossbow',
            'Ranged Weapons → Crossbows → Heavy Crossbow',
            'Ranged Weapons → Firearms → Pistol',
            'Ranged Weapons → Firearms → Muskets',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Resilience → Endurance → Marches',
            'Melee Weapons → Shields → Light',
            'Melee Weapons → Shields → Heavy',
            'Vigor → Light Armor',
            'Vigor → Medium Armor',
            'Etiquette → Commoners',
            'Etiquette → Discipline',
            'Knowledge → Military → Soldier',
            'Poise → Intimidation',
          ],
        },
      ],
    },

    {
      id: 'acolyte',
      name: 'Acolyte',
      desc: 'You Are A Student Of Magic, Learning And The Arcane Arts. You Either Started At An Early Age Or Later In Life, But Magic Is A Hard Thing To Master',
      notes: 'One Practiced Magic (any starting with "Lore Of") is cheaper by 2.',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Arcane → Magic',
            'Arcane → Casting',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Arcane → Magic',
            'Arcane → Casting',
            'Knowledge → Lore → Arcane Lore',
            'Etiquette → Mages/Wizards',
            'Craft → Enchanting',
            'Craft → Alchemy',
          ],
        },
      ],
    },
{
      id: 'Vestal',
      name: 'Vestal',
      desc: 'You Are A Sister Of Battle, Pious And Skilled In Both Healing And Holy Incantations.',
      notes: '(Requires Faith, Must Be Female)Gain One Divine Magic Lore, If You Already Have One, Its cheaper by 2',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Divine →  Divine Magic ',
            'Divine →  Holy Practice',
            'Divine →  Blessings/Curses',
            'Melee Weapons →  Blunt →  Maces',
            'Melee Weapons →  Polearms →  spear',
            'Melee Weapons →  Shields →  light',
            'Melee Weapons →  Shields →  heavy',
            'Melee Weapons →  Shields →  tower',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Divine →  Divine Magic ',
            'Divine →  Blessings/Curses',
            'Melee Weapons →  Blunt →  Maces',
            'Melee Weapons →  Polearms →  spear',
            'Melee Weapons →  Shields →  light',
            'Melee Weapons →  Shields →  heavy',
            'Melee Weapons →  Shields →  tower',
            'Vigor →  Medium Armor',
            'Empathy →  Kindness',
            'Empathy →  Compassion',
            'Etiquette →  Church',
          ],
        },
      ],
    },
{
      id: 'Apostate',
      name: 'Apostate',
      desc: 'You Were A Mage, But To Escape The King\'s Regulations And The Strict Teachings Of Mage Colleges You Ran Away, Either To Pursue Less Practiced Magic Or To Get Away From The Laws Around The Arcane',
      notes: '(Requires At Least One Magic Spell List, Outlaw)',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Arcane →  Magic  ',
            'Arcane →  Casting ',
            'Knowledge →  Lore →  Arcane Lore',
            'Knowledge →  Lore →  Criminal Lore',
            'Acting →  Lying',
            'Poise→  Stealth →  Hiding',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Arcane →  Magic  ',
            'Arcane →  Casting ',
            'Knowledge →  Lore →  Arcane Lore',
            'Knowledge →  Lore →  Criminal Lore',
            'Etiquette →  Mages/Wizards',
            'Craft →  Enchanting',
            'Coordination→  Sleight Of Hand',
          ],
        },
      ],
    },


    {
      id: 'noble',
      name: 'Noble',
      desc: 'You Were Born Into Wealth, Your Family Is Powerful, You Left For One Of Many Reasons, Maybe You Were Ostracized. Or Ran Off To Pressure Adventure',
      notes: 'Requires Noble Birth.',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons → Piercing → Rapiers',
            'Charm → Diplomacy',
            'Etiquette → Nobles',
            'Acting → Lying',
            'Convince → Politics',
            'Empathy → Kindness',
            'Knowledge → Lore',
            'Insight → Perception',
            'Poise → Equestrian',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Charm → Diplomacy',
            'Etiquette → Nobles',
            'Acting → Lying',
            'Convince → Politics',
            'Knowledge → Lore',
            'Insight → Perception',
          ],
        },
      ],
    },

    {
      id: 'merchant',
      name: 'Merchant',
      desc: 'You Sell And Trade, The Blood Of Economy Flows Through You, You Live For Watching Profits Go Up And Competition Go Down.',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Charm → Barter',
            'Acting → Lying',
            'Empathy → Cruelty',
            'Etiquette → Nobles',
            'Etiquette → Commoners',
            'Insight → Perception',
            'Knowledge → Mercantilism',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Charm → Barter',
            'Acting → Lying',
            'Melee Weapons → Piercing → Daggers',
            'Insight → Appraisal → Authenticity',
            'Insight → Appraisal → Value',
            'Coordination → Sleight Of Hand',
          ],
        },
      ],
    },

  {
      id: 'Town_Guard',
      name: 'Town Guard',
      desc: 'You Were A Simple Guard, Stationed On A Wall, Gate Or Street, Simply Put You Do What You Can To Protect The Town, From Stopping Sweetroll Thefts To Fending Off Raids',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons →  Polearms →  Spear',
           'Melee Weapons →  Polearms → halberd',
           'Melee Weapons →  Polearms →  glaive',
           'Ranged Weapons →  Bows →  longbow',
           'Ranged Weapons →  Bows → shortbow',
           'Ranged Weapons →  Crossbows → light crossbow',
           'Ranged Weapons →  Crossbows →heavy crossbow',
           'Vigor →  Medium Armor',
           'Insight →  Perception ',
           'Insight →  Intuition',
           'Knowledge →  Law',
 
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons →  Polearms →  Spear',
           'Melee Weapons →  Polearms → halberd',
           'Melee Weapons →  Polearms →  glaive',
           'Ranged Weapons →  Bows →  longbow',
           'Ranged Weapons →  Bows → shortbow',
           'Ranged Weapons →  Crossbows → light crossbow',
           'Ranged Weapons →  Crossbows →heavy crossbow',
           'Vigor →  Medium Armor',
           'Etiquette →  Commoners ',
           'Poise →  Intimidation',
          ],
        },
      ],
    },

{
      id: 'Occultist',
      name: 'Occultist',
      desc: 'Whether part of a recognized cult or a heretical one. You were a member of their practices, gaining an affinity for magic and religions either by experiencing it yourself or watching the priests work',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
           'Arcane →  Magic ',
           'Arcane →  Casting ',
           'Divine →  Casting',
           'Divine →  Rituals',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
           'Arcane →  Magic ',
           'Arcane →  Casting ',
           'Divine →  Casting',
           'Divine →  Rituals',
           'Knowledge →  Lore →  Religion Lore',
           'Etiquette →  Religion ',
           'Divine →  Rituals',
          ],
        },
      ],
    },

{
      id: 'Orphan',
      name: 'Orphan',
      desc: 'Without a home or Guardian, you found other ways to make do and entertain yourself',
      notes: '(Early backstory only)',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
           'Survival →  Streetsmarts ',
           'Convince →  Begging →  charity begging ',
           'Acting →  Lying ',
           'Poise →  Stealth →  Hiding ',
           'Poise →  Stealth →  Sneaking ',
           'Coordination →  Sleight Of Hand →  Pickpocketing ',
           'Etiquette →  Streets ',
           'Etiquette →  Criminal  ',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
           'Melee Weapons →  Slashing →  Knives ',
           'Empathy →  Kindness ',
           'Empathy →  Selfish ',
           'Acting →  Lying ',
           'Poise →  Stealth →  Hiding ',
           'Poise →  Stealth →  Sneaking ',
           'Coordination →  Sleight Of Hand →  stealing ',
           'Etiquette →  Streets ',
           'Etiquette →  Criminal ',
          ],
        },
      ],
    },

    {
      id: 'hunter',
      name: 'Hunter',
      desc: 'You Hunted The Woods, The Seas, The Mountains, Wherever It Was You Know How To Make A Living With Nothing But Simple Tools And The Wilderness',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons → Slashing → Axe',
            'Melee Weapons → Slashing → Knives',
            'Ranged Weapons → Bows → Shortbow',
           'Ranged Weapons →  Thrown →  javelin',
            'Survival → Wilderness → Hunting',
            'Survival → Wilderness → Foraging',
            'Survival → Wilderness → Tracking',
            'Survival → Wilderness → Navigation',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Ranged Weapons → Bows → Shortbow',
           'Ranged Weapons →  Thrown →  javelin',
            'Survival → Wilderness → Hunting',
            'Survival → Wilderness → Foraging',
            'Survival → Wilderness → Tracking',
            'Survival → Wilderness → Navigation',
            'Etiquette → Commoners',
            'Etiquette → Outcasts',
          ],
        },
      ],
    },

    {
      id: 'Charlatan',
      name: 'Charlatan',
      desc: 'A liar, a no good Coward, Bully, Cad and thief. For one reason or another cheating and sneaking have become your bread and butter',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Survival →  Streetsmarts',
            'Empathy →  Cruelty',
            'Acting →  Lying',
            'Acting →  impersonation →  Noble',
            'Acting →  impersonation →  Common',
            'Acting →  impersonation → Merchant',
            'Poise →  Stealth →  Hiding',
            'Coordination→  Sleight Of Hand →  Stealing',
            'Etiquette →  Streets',
            'Etiquette →  Criminal ',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Poise →  Stealth →  Hiding',
            'Coordination→  Sleight Of Hand →  Stealing',
            'Coordination→  Sleight Of Hand →  Lockpicking',
            'Knowledge →  Lore →  Criminal Lore',
          ],
        },
      ],
    },

    {
      id: 'Bandit',
      name: 'Bandit',
      desc: 'Pickpocket, Highwayman and Rouge. you take from others as your lifeblood',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Survival →  Wilderness →  Foraging ',
            'Convince →  Intimidate',
            'Poise →  Intimidate',
            'Poise→  Stealth →  Hiding',
            'Acting →  Lying',
            'Coordination→  Sleight Of Hand  →  Stealing ',
            'Etiquette →  Streets',
            'Etiquette →  Criminal ',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Melee Weapons →  Slashing →  Knives',
            'Ranged Weapons →  Firearms →  Pistol',
            'Ranged Weapons →  Bow →  Shortbow',
            'Empathy →  Selfish',
            'Acting →  Lying',
            'Coordination→  Sleight Of Hand  →  stealing',
            'Poise →  Stealth →  Hiding',
            'Etiquette →  Streets',
            'Etiquette →  Criminal',
          ],
        },
      ],
    },

    {
      id: 'doctor',
      name: 'Doctor',
      desc: 'A medical practitioner, an apothecary or Nurse, be it by coin or volunteer',
      notes: '',
      profGroups: [
        {
          label: 'First Proficiency',
          chosenIdx: -1,
          options: [
            'Knowledge → Medical → Treatment',
            'Knowledge → Medical → Emergency',
            'Knowledge → Lore → Medicine',
            'Empathy → Kindness',
            'Empathy → Compassion',
            'Melee Weapons → Slashing → Knives',
          ],
        },
        {
          label: 'Second Proficiency',
          chosenIdx: -1,
          options: [
            'Knowledge → Medical → Treatment',
            'Knowledge → Medical → Emergency',
            'Knowledge → Lore → Medicine',
            'Empathy → Kindness',
            'Empathy → Compassion',
          ],
        },
      ],
    },

  ], // end backgrounds


  // ══════════════════════════════════════════════
  //  STYLES · LORES · ARTS
  // ══════════════════════════════════════════════
  "sla": [
    {
      "id": "Executioners_Axemenship",
      "name": "Executioners Axemenship",
      "type": "style",
      "desc": "Horrifying, a demon, A ghost of the battlefield that what many people call you, the others are dead. But out of all the names you've been called the only one you ever felt was right was Inevitable",
      "passive": "You would have a +1 bonus to attack the neck. Neck attacks deal x3 damage.",
      "entries": [
        {
          "name": "Execute",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Core]Generic attack on someone if they are below 20% health after damage (bosses immune) they immediately die."
        },
        {
          "name": "Paradise or Purgatory",
          "cost": 1,
          "cd": "No cooldown",
          "effect": "You invoke utter fear , make an Intimidation check. On success, for the next 3 turns: all evil-aligned enemies give you +1 to attack them, all good-aligned enemies get +1 difficulty to hit."
        },
        {
          "name": "Call to the Gallows",
          "cost": 1,
          "cd": "No cooldown",
          "effect": "Make a Presence or Fortitude/2 attribute roll (skill = your Great Axe skill). The three closest enemies must make a Willpower check , on failure they must either enter melee combat with you or gain the Fear condition."
        },
        {
          "name": "Show of Violence",
          "cost": 2,
          "cd": "No cooldown",
          "effect": "After successfully Mutilating someone (a neck called shot works), you may pay this cost. Target must make a Willpower check or become Frightened and Knocked Prone."
        },
        {
          "name": "All Men Bleed",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "Must declare before rolling to attack. No damage is dealt , instead, on success, inflict Bleed equal to half the damage that would have been dealt."
        },
        {
          "name": "The Axe's Judgement",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "[Special Action] If an enemy dealt an unparried attack to an ally within melee range, you may immediately make 1 free normal attack against that enemy."
        },
        {
          "name": "Inordinate Exsanguination",
          "cost": 7,
          "cd": "No cooldown",
          "effect": "Attack roll that deals 30% of the target's maximum HP. If the target is below Large size: +2 difficulty. If Large or above: +1 difficulty."
        },
        {
          "name": "Inevitable",
          "cost": 8,
          "cd": "No cooldown",
          "effect": "Guaranteed uncalled attack. Can be parried only if the target's total Body exceeds yours. Cannot be dodged."
        }
      ]
    },
    {
      "id": "Forgotten_Soldiers",
      "name": "Forgotten Soldiers",
      "type": "style",
      "desc": "Soldiers left behind, forgotten by the wars that made them. They carry the weight of every battle in their bones , and they keep marching anyway.",
      "passive": "Silent Vigil , Do not take levels of exhaustion from watch shifts or marching.",
      "entries": [
        {
          "name": "Chamber",
          "cost": 0,
          "cd": "2 turn cooldown",
          "effect": "[Core] After parrying, before rolling for parry declare Chamber. On parry success, may instantly go for an attack with +1 difficulty."
        },
        {
          "name": "Reflection on the Past",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Core] Remove negative debuffs from self. Does not remove damage over time effects (like bleed). Regain 1d4 stamina on first use in combat."
        },
        {
          "name": "Isolation",
          "cost": 3,
          "cd": "No cooldown",
          "effect": "Make a melee attack on target where possible. Move them to the opposing side's backline regardless of distance. The move MUST be possible."
        },
        {
          "name": "Withstand",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "Gain 50% ward and gain immunity to bleeding, blighting, burning, or being moved. Duration: 2 turns."
        },
        {
          "name": "Solemn Silence",
          "cost": 5,
          "cd": "6 turn cooldown",
          "effect": "Heal self for 50% max HP. If below 30% HP, in addition recover 2 stamina at the end of turn."
        },
        {
          "name": "Vengeance",
          "cost": 5,
          "cd": "No cooldown",
          "effect": "Add 2 brittleness to self. Next attack ignores all difficulty and guarantees a crit if it lands. If you get 3 or more successes on the attack, you may choose EVERY crit effect instead of 1."
        },
        {
          "name": "Break Them",
          "cost": 6,
          "cd": "No cooldown",
          "effect": "Melee attack on target. Ignores physical resistance. May apply either blind or brittle to self to ignore ward. After a successful attack apply 1 helpless."
        },
        {
          "name": "Ruin Upon the Cities",
          "cost": 6,
          "cd": "No cooldown",
          "effect": "3 turn duration. Every time you take damage apply 1 Inspired Offense to self (50% increased damage on next attack). In addition, may gain brittleness for each attack and instead gain Greater Inspiration (double damage on next attack)."
        },
        {
          "name": "Pure Intimidation",
          "cost": 8,
          "cd": "No cooldown",
          "effect": "Deal 1 damage to a single target and make an intimidation effect. On success, apply 2 weakness to every enemy that fails a leadership check. Apply 2 taunt to self."
        }
      ]
    },
    {
      "id": "Captain_at_Arms",
      "name": "Captain at Arms",
      "type": "style",
      "desc": "A commander forged in the heat of battle, the Captain at Arms leads from the front , directing the flow of combat and turning the tide through sheer force of will and tactical mastery.",
      "passive": "Orders , May give attack, defend, or move orders as a bonus. Attack orders on an enemy make your ability and their ability take bonus effects on the target (enemies: applies Strength or Dexterity again on damage). Move orders: Retreat or Advance. Advance grants either 10 missile resistance, 10 physical resistance, or 10 magical resistance ablative (temp). On Retreat, upon reaching destination gain 1d4 HP. Advance and Retreat have separate cooldowns of 3 turns. Defend orders: any allies who accept the order step in front of the ally and gain Guarded Taunt (guard gains 25 ablative resistance of choice that is not ward). 4 turn cooldown.",
      "entries": [
        {
          "name": "Rampart",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Core] Requires shield, blunt, or unarmed. Deals blunt damage. Use as a charge attack , advance forward and deal 25% reduced attack, inducing stun on a failed check. If attack order is on target, increase resistance to stun difficulty by 1."
        },
        {
          "name": "Defender of Unit",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Core] Select 1 ally with a defend order. Give them 50% ward save until ability ends. Duration: 1/2 Charisma."
        },
        {
          "name": "Bolster the Ranks",
          "cost": 0,
          "cd": "Once per battle",
          "effect": "[Core] All allies refresh 1d4 stamina including self. Ally with a defend order gains 10 ablative resistance of choice. If no stamina remains when used, take 1d4 damage."
        },
        {
          "name": "Hold the Line",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "Advance self to the frontline. May choose to guard all other allies on the frontline, they may take a step behind you. Any allies that stay on the frontline gain 5 ablative resistance of choice (you also gain resistance). For every ally that stays behind, increase your ablative by 5. You may not leave the frontline for 3 turns. Allies who stay on the frontline may not leave for 3 turns unless given an order."
        },
        {
          "name": "Retribution",
          "cost": 5,
          "cd": "No cooldown",
          "effect": "Apply riposte to self or an ally with a defend order for 5 turns. Ripostes have a chance to stun."
        },
        {
          "name": "Stand Fast",
          "cost": 6,
          "cd": "No cooldown",
          "effect": "May choose any allies in backline. Give each a defend order. You may choose to instantly accept each defend order. For the purpose of this ability, allies have no defend order after the ability is used."
        },
        {
          "name": "True Courage in Face of Adversity",
          "cost": 8,
          "cd": "No cooldown",
          "effect": "Target all allies including self. Remove all ablative damage resistance on them  ablative resistance becomes full resistance. Remove brittle and weakened from all allies."
        }
      ]
    },
    {
      "id": "Bloodthirsty_Barbarian",
      "name": "Bloodthirsty Barbarian",
      "type": "style",
      "desc": "A savage force of nature that grows more dangerous the closer they are to death , bleeding, howling, and unstoppable.",
      "passive": "Bloodlust , When below 75% HP, deal 25% more damage. When below 50% HP, basic attacks inflict 1 hemorrhaging. When below 25% HP, all attacks deal 50% more damage. When below 10% HP, all attacks inflict Execution on targets with hemorrhaging (if below 50% HP they die).\n\n Brutality,Basic attacks deal 50% more damage to targets with hemorrhaging. When fighting formations and inflicting hemorrhaging, instead kill a number of members equal to half of the damage dealt.",
      "entries": [

        {
          "name": "Toe to Toe",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Core] Select 1 target. Charge target (may not target foes in back or support line). Upon hitting, apply rooted to them and 2 turns of taunt to self, and gain rooted. If target is hemorrhaging, apply 3 rooted to them and 2 to self instead. Consume all hemorrhaging on target."
        },
        {
          "name": "If It Bleeds...",
          "cost": 2,
          "cd": "No cooldown",
          "effect": "Make a melee attack on target. Apply 2 stacks of hemorrhaging. If the target is resistant or immune to bleeding, only apply 1. If already hemorrhaging, may make a free attack on them."
        },
        {
          "name": "Breakthrough",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "Use in any line except the frontline. Either move self to the frontline or to the enemy's support line. Every hostile target you would pass takes damage from a basic attack at 50% reduced damage. This damage ignores guarded or taunt. Apply 1 winded to self."
        },
        {
          "name": "Barbaric Revelry",
          "cost": 5,
          "cd": "No cooldown",
          "effect": "Either heal 25% max HP or remove all winded and all debuffs from self (excluding damage over time effects)."
        },
        {
          "name": "Adrenaline Rush",
          "cost": 6,
          "cd": "Once per combat",
          "effect": "Apply 1 token of Adrenaline Rush to self. Every time you attack, heal 1d6 HP and restore 1 stamina. Extend Adrenaline Rush by 1 if the target dies or gains hemorrhaging. During Adrenaline Rush you have 50% ward save. If you kill a target during Adrenaline Rush you may perform 1 additional attack. (Formation kills do not count as kills for kill abilities; destroying a formation does count.)"
        },
        {
          "name": "Bleed Out",
          "cost": 7,
          "cd": "No cooldown",
          "effect": "Only used when in the frontline. Make a melee attack on an enemy in the frontline. Attack inflicts 1 point of hemorrhaging for each 4 points in Prowess. Convert all bleeding you have into hemorrhaging. Then double all hemorrhaging on target. Inflict all hemorrhaging as damage that ignores resistances. Consume all hemorrhaging. Add 1 winded to self."
        },
        {
          "name": "Howling End",
          "cost": 10,
          "cd": "No cooldown",
          "effect": "Every time you would receive an attack for 5 or more damage (even while healed), add 1 token to Howling End. Triggers for free at Death's Door. Consume all Howling End tokens to perform a short or long range melee attack on any target. During this phase, cannot provoke attacks of opportunity but cannot leave the frontline. If you finish Howling End you may either: 1) go unconscious, or 2) add 1 winded for each token you started with."
        }
      ]
    },
    {
      "id": "Crusader_of_the_Faith",
      "name": "Crusader of the Faith",
      "type": "style",
      "desc": "A warrior bound to a higher purpose, the Crusader channels divine zeal into both sword and shield , protecting allies and smiting the unholy.",
      "passive": "You give out zeal tokens. Holy Strike (Stunt) , When you hit someone of unholy, demonic, or eldritch type, you may spend a zeal token to deal 1 additional die of damage (may take a token from anyone else to do this). When you hit someone of these types and do not spend a zeal token, gain 1 zeal token on yourself. You may have up to 5 zeal tokens.",
      "entries": [
        {
          "name": "Inspiring Cry",
          "cost": 3,
          "cd": "No cooldown",
          "effect": "Remove stress on target equal to half Charisma. If target is at over 50% stress when healed, either remove stress from self or gain a zeal token."
        },
        {
          "name": "Stand Fast",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "Grant all allies and self 3 turns of rooted."
        },
        {
          "name": "Battle Heal",
          "cost": 4,
          "cd": "2 turn cooldown",
          "effect": "Heal target for 25% of max HP. If you are less than 50% HP, heal self for 10% HP. May expend a zeal token to heal an additional 10% HP on self or target. The zeal token spent must be on the target."
        },
        {
          "name": "Holy Guardian",
          "cost": 5,
          "cd": "No cooldown",
          "effect": "May only be used in front or second rank. Guard target ally for 3 strikes (any attacks targeting them redirect to you; area effects ignore this). They receive 50% more healing. If you are less than 25% HP, you receive all HP they would receive. If they are less than 25% HP, they receive all healing you receive. Active until you stop guarding or guard ends. If someone attacks the guarded target and you take over 5 damage from that, gain 1 zeal token. When gaining the healing bonus from being less than 25% HP, gain 1 zeal token."
        },
        {
          "name": "Bulwark of Faith",
          "cost": 5,
          "cd": "5 turn cooldown",
          "effect": "Apply hardened tokens to self equal to half Fortitude. Apply taunt to self equal to 50% Charisma. Heal equal to Prowess or Charisma, whichever is higher."
        },
        {
          "name": "Surefire Determination",
          "cost": 6,
          "cd": "3 turn cooldown",
          "effect": "Grant ablative ward equal to 3 * Charisma + Fortitude. May not use on self again if at least 50% of the ablative ward remains. While this ward is active, may always make a Willpower check to resist all negative tokens. Every time an attack is fully negated by the ward, gain a zeal token."
        },
        {
          "name": "True Radiance",
          "cost": 8,
          "cd": "No cooldown",
          "effect": "Target self or 1 ally. May spend zeal tokens to reduce cost by 1 each. You and a number of allies equal to Charisma heal HP equal to Charisma. Next melee attacks deal fire damage and ignite the target. If the target they attack is unholy, eldritch, demonic, or evil and they kill the target, refresh the flame. While weapons are flaming they deal radiant damage and cannot harm allies."
        }
      ]
    },
    {
      "id": "Lore_of_Ice",
      "name": "Lore of Ice",
      "type": "lore",
      "desc": "A lore of bitter cold and unyielding frost, the Lore of Ice arms its wielder with glacial shields and devastating freezing power.",
      "passive": "Frost Shield , As long as you have 10 or more mana you permanently act as if you have a shield equipped (even if you have no hands available), allowing you to parry ranged attacks (no bonus to parrying melee attacks). In addition, you take 75% less damage from frost damage as long as there is 10 or more mana in the air.",
      "entries": [
        {
          "name": "Frost Bolt",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Cantrip] Deal 1d8 frost damage. No additional effects. Can only be used in support or back line."
        },
        {
          "name": "Ray of Frost",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Cantrip] Ice damage ray dealing 1d4 damage. Only used in second line or support line. Affects entire enemy party excluding backline. Can only hit 1 formation."
        },
        {
          "name": "Ice Sheet",
          "cost": 4,
          "cd": "No cooldown",
          "effect": "Can only be used in back 2 ranks. Converts the terrain of battle into ice (unless terrain cannot be converted). Enemies must make a Dexterity check when taking a move action or being pushed to avoid falling prone. Does not apply to friendlies."
        },
        {
          "name": "Ice Maiden's Kiss",
          "cost": 6,
          "cd": "No cooldown",
          "effect": "Make a kissing motion and send a giant breath-shaped cone of ice in front of you. May be used in any rank. Affects entire enemy party. Deals 1 * Intelligence + 1/2 Charisma frost damage. On crit, inflicts Frozen. On non-crits, inflicts Frostbite."
        },
        {
          "name": "Blades of Frost",
          "cost": 7,
          "cd": "No cooldown",
          "effect": "Target 1 ally or self (cannot be used in frontline). Imbues their damage with magical frost damage and armor piercing. They gain +1 attack for 2 tokens (expended on each attack)."
        },
        {
          "name": "Crystal Sanctuary",
          "cost": 12,
          "cd": "No cooldown",
          "effect": "Can be used in any rank. May target self or 1 ally. Target gains 80% ward save (80% all damage reduction) for one turn. They gain rooted until the ward is gone."
        },
        {
          "name": "Death Frost",
          "cost": 15,
          "cd": "No cooldown",
          "effect": "Only used in back 2 ranks. Instantly kills 1 non-boss, non-henchman enemy. If target is a boss or henchman, deal 6 * Intelligence as magical frost damage to them instead."
        },
        {
          "name": "Heart of Winter",
          "cost": 24,
          "cd": "No cooldown",
          "effect": "Only used in back 2 ranks. Hits entire enemy party. Must be concentrated on for the full duration to function. 1st turn: deal damage equal to 2 * Intelligence. 2nd turn: apply rooted and deal 5 * Intelligence damage. 3rd turn: deal 10 * Intelligence damage and apply rooted. 4th turn: deal 10 * Intelligence damage twice, apply 1 rooted, 1 weakened, and 1 brittle."
        }
      ]
    },
    {
      "id": "Lore_of_Heavens",
      "name": "Lore of Heavens",
      "type": "lore",
      "desc": "A lore of stars, storm, and sky , those who wield it command lightning, wind, and the celestial movements themselves to devastate enemies and empower allies.",
      "passive": "While present in battle and 10 or more mana is in the air, all flying units deal 1/2 damage and suffer -2 on parry and dodge checks. This affects both friends and enemies.",
      "entries": [
        {
          "name": "Star Bolt",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Cantrip] Back 2 ranks only. Deal 1d10 magical damage."
        },
        {
          "name": "Psionic Message",
          "cost": 0,
          "cd": "No cooldown",
          "effect": "[Cantrip] May send a message to someone via magic. They may not respond. You must know the target's location (bare minimum location info is which building or location , e.g., a specific park, not just a city)."
        },
        {
          "name": "Wind Blast",
          "cost": 5,
          "cd": "No cooldown",
          "effect": "Only in back 2 ranks. Select 1 target. Either push them back 3 ranks or forward 3 ranks. May choose whether they enter friendly ranks or not. Deal damage to target equal to Intelligence * 1.5."
        },
        {
          "name": "Alignment of the Stars",
          "cost": 5,
          "cd": "No cooldown",
          "effect": "Grant 1 ally 1 stack of Swiftness, 1 stack of Hardened, and 1 stack of Inspired Melee (50% increased damage). May choose to turn any token into one of the other tokens."
        },
        {
          "name": "Thunderbolt of the Stars",
          "cost": 6,
          "cd": "No cooldown",
          "effect": "Back rank only. Target 1 enemy. After 1 turn of concentration, activate thunderbolt bombardment on area. Deal 7 * Intelligence armor piercing magical damage, then deal Intelligence damage to the adjacent 2 ranks (can hit friendlies)."
        },
        {
          "name": "Curse of the Midnight Wind",
          "cost": 8,
          "cd": "No cooldown",
          "effect": "Apply weakened to all enemies and shuffle their arrangement. Can be used in any rank (shows up in a random spot on the line). On formations, inflict Disorganized instead."
        },
        {
          "name": "Chain Lightning",
          "cost": 14,
          "cd": "No cooldown",
          "effect": "Deal 2d10 armor piercing magical damage. Chains to a random adjacent line, reducing damage by 2 (can hit friendlies). Cannot be parried but may be dodged."
        },
        {
          "name": "Comet of Cassadora",
          "cost": 17,
          "cd": "No cooldown",
          "effect": "Deal 2d100 + 2 * Intelligence armor sundering (destroys armor) magical damage. Inflicts Monstrous Impact and explodes in 4 adjacent lines. Affects friendlies."
        },
        {
          "name": "Thorson's Thunderstorm",
          "cost": 25,
          "cd": "No cooldown",
          "effect": "Target 1 line. As long as you continue to concentrate on that area, recast Thunderbolt of the Stars on that area every turn, or an adjacent area."
        }
      ]
    }
  ], // end sla

};
