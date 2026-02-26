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

const qarin: CombatantData = {
  name: 'Qarin',
  maxHp: 18,
  isBoss: false,
  description: 'A personal shadow demon that mirrors the player\'s every fear.',
  equipment: [
    enemyEquip('qarin_boots', 'Spirit Veil', 'boots', {
      id: 'mod_qarin_dodge', name: 'Spirit Veil',
      description: '20% dodge', source: 'enemy',
      dodgeCheck(context) { return context.rng.next() < 0.20; },
    }),
  ],
};

const rocHatchling: CombatantData = {
  name: 'Roc Hatchling',
  maxHp: 22,
  isBoss: false,
  description: 'A young roc, its iron beak already capable of shattering bone.',
  equipment: [
    enemyEquip('roc_weapon', 'Razor Beak', 'weapon', {
      id: 'mod_roc_dmg', name: 'Razor Beak',
      description: '+3 damage, +3 more if player has 3+ cards', source: 'enemy',
      modifyDamageDealt(damage, context) {
        return damage + 3 + (context.playerHand.cards.length >= 3 ? 3 : 0);
      },
    }),
  ],
};

const ghul: CombatantData = {
  name: 'Ghul',
  maxHp: 25,
  isBoss: false,
  description: 'A carrion-eating desert ghoul that feasts on the misfortune of others.',
  equipment: [
    enemyEquip('ghul_trinket', 'Carrion Hunger', 'trinket', {
      id: 'mod_ghul_bust', name: 'Carrion Hunger',
      description: '+5 damage when player busts', source: 'enemy',
      modifyDamageDealt(damage, context) {
        return context.playerScore.busted ? damage + 5 : damage;
      },
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

const salamander: CombatantData = {
  name: 'Salamander',
  maxHp: 22,
  isBoss: false,
  description: 'A fire elemental spirit that feeds on the heat of the oasis sands.',
  equipment: [
    enemyEquip('salamander_trinket', 'Ember Scales', 'trinket', {
      id: 'mod_salamander_red', name: 'Ember Scales',
      description: '+3 damage per red card in dealer hand', source: 'enemy',
      modifyDamageDealt(damage, context) {
        const reds = context.dealerHand.cards.filter(
          c => c.suit === 'hearts' || c.suit === 'diamonds'
        ).length;
        return damage + reds * 3;
      },
    }),
  ],
};

const brassSentinel: CombatantData = {
  name: 'Brass Sentinel',
  maxHp: 30,
  isBoss: false,
  description: 'An ancient brass automaton guardian, still dutifully protecting its long-dead master\'s tomb.',
  equipment: [
    enemyEquip('brass_sentinel_armor', 'Brass Casing', 'armor', {
      id: 'mod_brass_sentinel_armor', name: 'Brass Casing',
      description: '30% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.7); },
    }),
  ],
};

const shadhavar: CombatantData = {
  name: 'Shadhavar',
  maxHp: 28,
  isBoss: false,
  description: 'A mythical one-horned beast whose hollow horn emits a melody that weakens all who hear it.',
  equipment: [
    enemyEquip('shadhavar_weapon', 'Hollow Horn', 'weapon', {
      id: 'mod_shadhavar_dmg', name: 'Hollow Horn',
      description: '+4 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 4; },
    }),
    enemyEquip('shadhavar_trinket', 'Eerie Melody', 'trinket', {
      id: 'mod_shadhavar_dot', name: 'Eerie Melody',
      description: 'Player takes 2 damage at the start of each hand', source: 'enemy',
      onHandStart(context) {
        context.playerState.hp = Math.max(0, context.playerState.hp - 2);
      },
    }),
  ],
};

const muradTheBrassIfrit: CombatantData = {
  name: 'Murad the Brass Ifrit',
  maxHp: 75,
  isBoss: true,
  description: 'A fire spirit bound in brass rings, enforcer of the Shadow King across the Oasis Ruins.',
  equipment: [
    enemyEquip('murad_weapon', "Murad's Ember", 'weapon', {
      id: 'mod_murad_dmg', name: "Murad's Ember",
      description: '+8 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 8; },
    }),
    enemyEquip('murad_armor', 'Brass Shackle', 'armor', {
      id: 'mod_murad_armor', name: 'Brass Shackle',
      description: '20% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.8); },
    }),
    enemyEquip('murad_trinket', 'Sihr Amulet', 'trinket', {
      id: 'mod_murad_heal', name: 'Sihr Amulet',
      description: 'Heals 8 HP when player busts', source: 'enemy',
      onHandEnd(context) {
        if (context.playerScore.busted) {
          context.enemyState.hp = Math.min(
            context.enemyState.hp + 8,
            context.enemyState.data.maxHp
          );
        }
      },
    }),
  ],
  curse: {
    id: 'curse_murad', name: "Murad's Brand",
    description: 'Take 4 damage whenever you bust', source: 'wish_curse',
    onHandEnd(context) {
      if (context.playerScore.busted) {
        context.playerState.hp = Math.max(0, context.playerState.hp - 4);
      }
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

const palaceGuard: CombatantData = {
  name: 'Palace Guard',
  maxHp: 35,
  isBoss: false,
  description: 'An elite warrior of the Sultan\'s palace, armored in layered iron and trained to kill.',
  equipment: [
    enemyEquip('palace_guard_weapon', 'Palace Halberd', 'weapon', {
      id: 'mod_palace_guard_dmg', name: 'Palace Halberd',
      description: '+8 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 8; },
    }),
    enemyEquip('palace_guard_armor', 'Tower Shield', 'armor', {
      id: 'mod_palace_guard_armor', name: 'Tower Shield',
      description: '20% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.8); },
    }),
  ],
};

const jinnInquisitor: CombatantData = {
  name: 'Jinn Inquisitor',
  maxHp: 30,
  isBoss: false,
  description: 'A bound jinn tasked with judging souls. It strikes hardest when victory is closest.',
  equipment: [
    enemyEquip('inquisitor_trinket', 'Eye of Judgment', 'trinket', {
      id: 'mod_inquisitor_judge', name: 'Eye of Judgment',
      description: '+6 damage when dealer wins with higher score than player (non-bust loss)', source: 'enemy',
      modifyDamageDealt(damage, context) {
        if (!context.playerScore.busted && !context.dealerScore.busted
            && context.dealerScore.value > context.playerScore.value) {
          return damage + 6;
        }
        return damage;
      },
    }),
  ],
};

const cursedVizier: CombatantData = {
  name: 'Cursed Vizier',
  maxHp: 38,
  isBoss: false,
  description: 'A disgraced palace official whose soul was bound here as punishment. His suffering feeds on yours.',
  equipment: [
    enemyEquip('vizier_trinket', 'Ledger of Debt', 'trinket', {
      id: 'mod_vizier_debt', name: 'Ledger of Debt',
      description: '+2 damage per consecutive loss (max +8)', source: 'enemy',
      modifyDamageDealt(damage, context) {
        return damage + Math.min((context.consecutiveLosses ?? 0) * 2, 8);
      },
    }),
  ],
};

const zahhakTheMirrorKing: CombatantData = {
  name: 'Zahhak the Mirror King',
  maxHp: 100,
  isBoss: true,
  description: 'The sorcerer-tyrant who enslaved the jinn and stole their power. Master of illusions and stolen magic.',
  equipment: [
    enemyEquip('zahhak_weapon', 'Serpent Fang', 'weapon', {
      id: 'mod_zahhak_dmg', name: 'Serpent Fang',
      description: '+12 damage, +4 per face card in player hand', source: 'enemy',
      modifyDamageDealt(damage, context) {
        const faces = context.playerHand.cards.filter(
          c => c.rank === 'J' || c.rank === 'Q' || c.rank === 'K'
        ).length;
        return damage + 12 + faces * 4;
      },
    }),
    enemyEquip('zahhak_armor', 'Mirror Aegis', 'armor', {
      id: 'mod_zahhak_armor', name: 'Mirror Aegis',
      description: '35% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.65); },
    }),
    enemyEquip('zahhak_trinket', 'Crown of Stolen Souls', 'trinket', {
      id: 'mod_zahhak_steal', name: 'Crown of Stolen Souls',
      description: 'Heals 6 HP when player scores 19-21 without blackjack', source: 'enemy',
      onHandEnd(context) {
        const score = context.playerScore.value;
        if (!context.playerScore.busted && !context.playerScore.isBlackjack
            && score >= 19 && score <= 21) {
          context.enemyState.hp = Math.min(
            context.enemyState.hp + 6,
            context.enemyState.data.maxHp
          );
        }
      },
    }),
  ],
  curse: {
    id: 'curse_zahhak', name: 'Curse of the Serpent King',
    description: 'Your damage output is permanently reduced by 20%', source: 'wish_curse',
    modifyDamageDealt(damage) { return Math.floor(damage * 0.8); },
  },
};

// ── Stage data ──

export const STAGE_POOLS: CombatantData[][] = [
  [vampireBat, sandScorpion, desertJackal, qarin, rocHatchling, ghul],
  [dustWraith, tombGuardian, sandSerpent, salamander, brassSentinel, shadhavar],
  [obsidianGolem, shadowAssassin, fireDancer, palaceGuard, jinnInquisitor, cursedVizier],
];

const BOSSES: CombatantData[] = [ancientStrix, muradTheBrassIfrit, zahhakTheMirrorKing];

export function getEnemiesForStage(stage: number): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return STAGE_POOLS[stage - 1].slice(0, 3);
}

export function sampleEnemiesForStage(
  stage: number,
  rng: { nextInt(min: number, max: number): number }
): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  const pool = [...STAGE_POOLS[stage - 1]];
  // Fisher-Yates shuffle using seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function getBossForStage(stage: number): CombatantData {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return BOSSES[stage - 1];
}
