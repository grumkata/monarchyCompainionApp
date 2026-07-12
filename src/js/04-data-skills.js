/* ══ SKILL DATA ══ */
const SKILL_DATA = {
  body: {
    'Melee Weapons': {
      secondaries: ['Blunt','Polearms','Slashing','Piercing','Shields'],
      tertiaries: {
        'Blunt': ['Maces','Clubs','Improvised'],
        'Polearms': ['Spears (Pikes)','Halberds (Polaxes/Polhammer)','Glaives','Improvised'],
        'Slashing': ['Axes','Swords','Knives (Daggers)','Improvised'],
        'Piercing': ['Rapiers','Knives (Daggers)','Swords','Improvised'],
        'Shields': ['Improvised','light','heavy','tower']
      }
    },
    'Ranged Weapons': {
      secondaries: ['Bows','Crossbows','Firearms','Thrown'],
      tertiaries: {
        'Bows': ['Shortbow','Longbow','Slings'],
        'Crossbows': ['hand ','light','heavy'],
        'Firearms': ['Pistol','Muskets','Cannons','Gezail'],
        'Thrown': ['Improvised','Knives (Daggers)','Axes','Javelins','Net']
      }
    },
    'Resilience': {
      secondaries: ['Pain Tolerance','Endurance','Environmental Tolerance','Recovery'],
      tertiaries: {
        'Pain Tolerance': ['Torture'],
        'Endurance': ['Marches','Holding Breath'],
        'Environmental Tolerance': ['Heat','Cold','Poison'],
        'Recovery': []
      }
    },
    'Coordination': {
      secondaries: ['Sleight Of Hand'],
      tertiaries: {
        'Sleight Of Hand': ['Pickpocketing','Concealment','Disarming','Lockpicking']
      }
    },
    'Vigor': {
      secondaries: ['Light Armor','Medium Armor','Heavy Armor','Unarmed Combat','Strength','Equestrian','Athletics'],
      tertiaries: {
        'Light Armor': [], 'Medium Armor': [], 'Heavy Armor': [], 'Equestrian': [], 'Athletics': [],
        'Unarmed Combat': ['Strikes','Grapples'],
        'Strength': ['Breaking','Lifting']
      }
    },
    'Finesse': {
      secondaries: ['Athletics','Sprinting','Climbing','Swimming'],
      tertiaries: { 'Athletics': [], 'Sprinting': [], 'Climbing': [], 'Swimming': [] }
    },
    'Poise': {
      secondaries: ['Equestrian','Intimidate','Stealth','Balance','Acrobatics'],
      tertiaries: {
        'Equestrian': [], 'Intimidate': [], 'Balance': [],
        'Stealth': ['Hiding','Sneaking','Conceal'],
        'Acrobatics': ['Dodging']
      }
    }
  },
  mind: {
    'Arcane': {
      secondaries: ['Magic','Casting'],
      tertiaries: { 'Magic': [], 'Casting': [] }
    },
    'Divine': {
      secondaries: ['Divine Magic','Holy Practice','Blessings/Curses','Casting','Rituals'],
      tertiaries: { 'Divine Magic': [], 'Holy Practice': [], 'Blessings/Curses': [], 'Casting': [], 'Rituals': [] }
    },
    'Insight': {
      secondaries: ['Appraisal','Perception','Intuition','Common Sense'],
      tertiaries: {
	'Common Sense': [],
        'Intuition': [],
        'Appraisal': ['Value','Authenticity'],
        'Perception': ['Sight','Sound','Smell','Taste','Touch']
      }
    },
    'Survival': {
      secondaries: ['Streetsmarts','Wilderness','Animal Handling'],
      tertiaries: {
        'Streetsmarts': ['Navigation'],
        'Animal Handling': [],
        'Wilderness': ['Hunting','Foraging','Tracking','Navigation']
      }
    },
    'Knowledge': {
      secondaries: ['Military','Lore','Mercantilism','Law','Medical','Nature','Monsters'],
      tertiaries: {
        'Military': [], 'Mercantilism': [], 'Law': [],
        'Lore': ['Arcane Lore','Criminal Lore','Religion Lore'],
        'Medical': ['Treatment','Emergency'],
        'Nature': ['Plant','Animal','Bestial'],
        'Monsters': ['Unholy','Demonic','Eldritch','Bestial']
      }
    },
    'Logic': {
      secondaries: ['Investigation','Research','Strategy','Reasoning'],
      tertiaries: {
        'Research': [], 'Strategy': [],
        'Investigation': ['Interrogation'],
        'Reasoning': ['Deduction']
      }
    },
    'Craft': {
      secondaries: ['Enchanting','Alchemy','Smithing','Carpentry','Tailoring'],
      tertiaries: {
        'Enchanting': [], 'Alchemy': [], 'Carpentry': [],
        'Smithing': ['Weapon Smithing','Armour Smithing'],
        'Tailoring': ['Clothing']
      }
    }
  },
  social: {
    'Charm': {
      secondaries: ['Barter','Diplomacy','Rapport','Animal Handling'],
      tertiaries: { 'Barter': [], 'Diplomacy': [], 'Rapport': [], 'Animal Handling': [] }
    },
    'Command': {
      secondaries: ['Leadership','Rallying'],
      tertiaries: {
        'Leadership': ['Discipline'],
        'Rallying': ['Speeches']
      }
    },
    'Acting': {
      secondaries: ['Lying','Impersonation'],
      tertiaries: {
        'Lying': [],
        'Impersonation': ['Noble','Commoner','Criminal','Church','Wizard','Military']
      }
    },
    'Empathy': {
      secondaries: ['Logical','Cruelty','Selfish','Pragmatic','Lustful','Compassion','Kindness'],
      tertiaries: { 'Logical': [], 'Cruelty': [], 'Selfish': [], 'Pragmatic': [], 'Lustful': [], 'Compassion': [], 'Kindness': [] }
    },
    'Entertain': {
      secondaries: ['Performance','Seduction'],
      tertiaries: {
        'Seduction': [],
        'Performance': ['Music','Storytelling']
      }
    },
    'Convince': {
      secondaries: ['Politics','Argue','Begging','Intimidate'],
      tertiaries: {
        'Politics': [], 'Argue': [], 'Intimidate': [],
        'Begging': ['Pleading','Charity-Begging']
      }
    },
    'Etiquette': {
      secondaries: ['Commoners','Discipline','Mages/Wizards','Church','Religion','Nobles','Nomads','Streets','Criminal','Outcasts'],
      tertiaries: {
        'Commoners': [], 'Mages/Wizards': [], 'Church': [], 'Religion': [], 'Nobles': [], 'Nomads': [], 'Streets': [], 'Criminal': [], 'Outcasts': [],
        'Discipline': ['Officer','Soldier']
      }
    }
  }
};
