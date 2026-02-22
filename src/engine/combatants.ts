import type { CombatantData, Equipment, Modifier, EquipmentSlot, EquipmentTier, Suit } from './types.js';

function enemyEquip(id: string, name: string, slot: EquipmentSlot, modifier: Modifier): Equipment {
  return { id, name, slot, tier: 'cloth' as EquipmentTier, description: modifier.description, cost: 0, modifier };
}

// ── Stage 1: Desert Outskirts ──

const vampireBat: CombatantData = {
  name: 'Vampire Bat',
  maxHp: 15,
  isBoss: false,
  description: 'A leathery winged creature that thrives in darkness.',
  equipment: [
    enemyEquip('vbat_trinket', 'Shadow Cloak', 'trinket', {
      id: 'mod_vbat_spade_resist', name: 'Shadow Cloak',
      description: '50% less damage from spade hands', source: 'enemy',
      modifyDamageReceived(damage, context) {
        const hasSpade = context.playerHand.cards.some(c => c.suit === 'spades');
        return hasSpade ? Math.round(damage * 0.5) : damage;
      },
    }),
  ],
};

const sandScorpion: CombatantData = {
  name: 'Sand Scorpion',
  maxHp: 18,
  isBoss: false,
  description: 'A large scorpion with a venomous stinger.',
  equipment: [],
};

const desertJackal: CombatantData = {
  name: 'Desert Jackal',
  maxHp: 20,
  isBoss: false,
  description: 'A cunning predator of the dunes.',
  equipment: [
    enemyEquip('jackal_trinket', 'Predator Fangs', 'trinket', {
      id: 'mod_jackal_dmg', name: 'Predator Fangs',
      description: '+3 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 3; },
    }),
  ],
};

const ancientStrix: CombatantData = {
  name: 'Ancient Strix',
  maxHp: 50,
  isBoss: true,
  description: 'An ancient owl-like demon of the desert night.',
  equipment: [
    enemyEquip('strix_weapon', 'Night Fang', 'weapon', {
      id: 'mod_strix_bj_dmg', name: 'Night Fang',
      description: '+10 damage on blackjack', source: 'enemy',
      modifyDamageDealt(damage, context) {
        if (context.dealerScore.isBlackjack) return damage + 10;
        return damage;
      },
    }),
    enemyEquip('strix_trinket', 'Red Bane', 'trinket', {
      id: 'mod_strix_red_vuln', name: 'Red Bane',
      description: '+2 damage per red card in player hand', source: 'enemy',
      modifyDamageReceived(damage, context) {
        const redCards = context.playerHand.cards.filter(
          c => c.suit === 'hearts' || c.suit === 'diamonds'
        ).length;
        return damage + redCards * 2;
      },
    }),
  ],
  curse: {
    id: 'curse_strix', name: 'Night Fang Curse',
    description: 'Enemies deal +5 damage on blackjack', source: 'wish_curse',
    modifyRules(rules) {
      // This curse manifests as enemy modifiers; we handle it via onHandEnd
      // Actually, we store it as a player-side modifier that modifies incoming damage
      return rules;
    },
    modifyDamageReceived(damage, context) {
      if (context.dealerScore.isBlackjack) return damage + 5;
      return damage;
    },
  },
};

// ── Stage 2: Oasis Ruins ──

const dustWraith: CombatantData = {
  name: 'Dust Wraith',
  maxHp: 25,
  isBoss: false,
  description: 'A swirling phantom of desert sand.',
  equipment: [
    enemyEquip('wraith_boots', 'Phantom Step', 'boots', {
      id: 'mod_wraith_dodge', name: 'Phantom Step',
      description: '15% dodge', source: 'enemy',
      dodgeCheck(context) { return context.rng.next() < 0.15; },
    }),
  ],
};

const tombGuardian: CombatantData = {
  name: 'Tomb Guardian',
  maxHp: 28,
  isBoss: false,
  description: 'An animated stone sentinel guarding forgotten tombs.',
  equipment: [
    enemyEquip('guardian_armor', 'Stone Shell', 'armor', {
      id: 'mod_guardian_armor', name: 'Stone Shell',
      description: '25% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.75); },
    }),
  ],
};

const sandSerpent: CombatantData = {
  name: 'Sand Serpent',
  maxHp: 22,
  isBoss: false,
  description: 'A massive viper that strikes from beneath the dunes.',
  equipment: [
    enemyEquip('serpent_weapon', 'Venom Fangs', 'weapon', {
      id: 'mod_serpent_dmg', name: 'Venom Fangs',
      description: '+5 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 5; },
    }),
  ],
};

const djinnWarden: CombatantData = {
  name: 'Djinn Warden',
  maxHp: 75,
  isBoss: true,
  description: 'A bound djinn forced to guard the oasis for eternity.',
  equipment: [
    enemyEquip('djinn_weapon', 'Warden Blade', 'weapon', {
      id: 'mod_djinn_dmg', name: 'Warden Blade',
      description: '+8 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 8; },
    }),
    enemyEquip('djinn_trinket', 'Oasis Heart', 'trinket', {
      id: 'mod_djinn_heal', name: 'Oasis Heart',
      description: 'Heals 10 on blackjack', source: 'enemy',
      onHandEnd(context) {
        if (context.dealerScore.isBlackjack) {
          context.enemyState.hp = Math.min(
            context.enemyState.hp + 10,
            context.enemyState.data.maxHp
          );
        }
      },
    }),
  ],
  curse: {
    id: 'curse_djinn', name: 'Warden Curse',
    description: 'Take 3 damage at the start of each hand', source: 'wish_curse',
    onHandStart(context) {
      context.playerState.hp = Math.max(0, context.playerState.hp - 3);
    },
  },
};

// ── Stage 3: Sultan's Palace ──

const obsidianGolem: CombatantData = {
  name: 'Obsidian Golem',
  maxHp: 35,
  isBoss: false,
  description: 'A hulking construct of volcanic glass.',
  equipment: [
    enemyEquip('golem_armor', 'Obsidian Plates', 'armor', {
      id: 'mod_golem_armor', name: 'Obsidian Plates',
      description: '40% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.6); },
    }),
  ],
};

const shadowAssassin: CombatantData = {
  name: 'Shadow Assassin',
  maxHp: 30,
  isBoss: false,
  description: 'A silent killer wreathed in magical darkness.',
  equipment: [
    enemyEquip('assassin_weapon', 'Shadow Blade', 'weapon', {
      id: 'mod_assassin_dmg', name: 'Shadow Blade',
      description: '+10 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 10; },
    }),
    enemyEquip('assassin_boots', 'Shadow Step', 'boots', {
      id: 'mod_assassin_dodge', name: 'Shadow Step',
      description: '20% dodge', source: 'enemy',
      dodgeCheck(context) { return context.rng.next() < 0.20; },
    }),
  ],
};

const fireDancer: CombatantData = {
  name: 'Fire Dancer',
  maxHp: 32,
  isBoss: false,
  description: 'A performer whose flames are anything but theatrical.',
  equipment: [
    enemyEquip('dancer_trinket', 'Flame Veil', 'trinket', {
      id: 'mod_dancer_red', name: 'Flame Veil',
      description: '+3 damage per red card in dealer hand', source: 'enemy',
      modifyDamageDealt(damage, context) {
        const redCards = context.dealerHand.cards.filter(
          c => c.suit === 'hearts' || c.suit === 'diamonds'
        ).length;
        return damage + redCards * 3;
      },
    }),
  ],
};

const crimsonSultan: CombatantData = {
  name: 'Crimson Sultan',
  maxHp: 100,
  isBoss: true,
  description: 'The tyrannical ruler of the palace, wielding forbidden magic.',
  equipment: [
    enemyEquip('sultan_weapon', 'Crimson Blade', 'weapon', {
      id: 'mod_sultan_dmg', name: 'Crimson Blade',
      description: '+15 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 15; },
    }),
    enemyEquip('sultan_armor', 'Royal Guard', 'armor', {
      id: 'mod_sultan_armor', name: 'Royal Guard',
      description: '30% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.7); },
    }),
    enemyEquip('sultan_trinket', 'Tyrant Crown', 'trinket', {
      id: 'mod_sultan_push', name: 'Tyrant Crown',
      description: '5 damage to player on push', source: 'enemy',
      onHandEnd(context) {
        // Check if this hand was a push by comparing scores
        if (!context.playerScore.busted && !context.dealerScore.busted &&
            context.playerScore.value === context.dealerScore.value) {
          context.playerState.hp = Math.max(0, context.playerState.hp - 5);
        }
      },
    }),
  ],
  curse: {
    id: 'curse_sultan', name: 'Crimson Curse',
    description: 'Ties favor the dealer', source: 'wish_curse',
    modifyRules(rules) {
      return {
        ...rules,
        winConditions: { ...rules.winConditions, tieResolution: 'dealer' as const },
      };
    },
  },
};

// ── Stage data ──

const STAGES: CombatantData[][] = [
  [vampireBat, sandScorpion, desertJackal],
  [dustWraith, tombGuardian, sandSerpent],
  [obsidianGolem, shadowAssassin, fireDancer],
];

const BOSSES: CombatantData[] = [ancientStrix, djinnWarden, crimsonSultan];

export function getEnemiesForStage(stage: number): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return STAGES[stage - 1];
}

export function getBossForStage(stage: number): CombatantData {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return BOSSES[stage - 1];
}
