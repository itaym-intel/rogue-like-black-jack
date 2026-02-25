import type { Equipment, EquipmentSlot, EquipmentTier, Modifier, Suit } from './types.js';

function createWeapon(id: string, name: string, tier: EquipmentTier, cost: number, flatDamage: number, desc: string): Equipment {
  return {
    id, name, slot: 'weapon', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `+${flatDamage} damage`, source: 'equipment',
      modifyDamageDealt(damage) { return damage + flatDamage; },
    },
  };
}

function createHelm(id: string, name: string, tier: EquipmentTier, cost: number, reduction: number, desc: string): Equipment {
  const pct = Math.round(reduction * 100);
  return {
    id, name, slot: 'helm', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `${pct}% less bust damage`, source: 'equipment',
      modifyDamageReceived(damage, context) {
        if (context.playerScore.busted) {
          return Math.round(damage * (1 - reduction));
        }
        return damage;
      },
    },
  };
}

function createArmor(id: string, name: string, tier: EquipmentTier, cost: number, reduction: number, desc: string): Equipment {
  const pct = Math.round(reduction * 100);
  return {
    id, name, slot: 'armor', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `${pct}% less damage`, source: 'equipment',
      modifyDamageReceived(damage) {
        return Math.round(damage * (1 - reduction));
      },
    },
  };
}

function createBoots(id: string, name: string, tier: EquipmentTier, cost: number, dodgeChance: number, desc: string): Equipment {
  const pct = Math.round(dodgeChance * 100);
  return {
    id, name, slot: 'boots', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `${pct}% dodge`, source: 'equipment',
      dodgeCheck(context) { return context.rng.next() < dodgeChance; },
    },
  };
}

const ALL_EQUIPMENT: Equipment[] = [
  // Weapons
  createWeapon('weapon_cloth', 'Flint Spear', 'cloth', 30, 5, '+5 flat damage'),
  createWeapon('weapon_bronze', 'Bronze Saif', 'bronze', 60, 10, '+10 flat damage'),
  createWeapon('weapon_iron', 'Iron Scimitar', 'iron', 100, 25, '+25 flat damage'),
  // Helms
  createHelm('helm_cloth', 'Cloth Helm', 'cloth', 20, 0.3, '30% less damage on bust'),
  createHelm('helm_bronze', 'Bronze Helm', 'bronze', 45, 0.5, '50% less damage on bust'),
  createHelm('helm_iron', 'Iron Helm', 'iron', 80, 0.8, '80% less damage on bust'),
  // Armors
  createArmor('armor_cloth', 'Cloth Armor', 'cloth', 25, 0.2, '20% less incoming damage'),
  createArmor('armor_bronze', 'Bronze Armor', 'bronze', 55, 0.4, '40% less incoming damage'),
  createArmor('armor_iron', 'Iron Armor', 'iron', 90, 0.6, '60% less incoming damage'),
  // Boots
  createBoots('boots_cloth', 'Cloth Boots', 'cloth', 20, 0.10, '10% dodge chance'),
  createBoots('boots_bronze', 'Bronze Boots', 'bronze', 50, 0.25, '25% dodge chance'),
  createBoots('boots_iron', 'Iron Boots', 'iron', 85, 0.40, '40% dodge chance'),
  // ── Cloth Weapons (new) ──
  {
    id: 'weapon_cloth_2', name: 'Copper Khanjar',
    slot: 'weapon' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+4 damage; +4 more if player has 2 or fewer cards', cost: 28,
    modifier: {
      id: 'mod_weapon_cloth_2', name: 'Copper Khanjar',
      description: '+4 damage; +4 more if player has 2 or fewer cards', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 4 + (context.playerHand.cards.length <= 2 ? 4 : 0);
      },
    },
  },
  {
    id: 'weapon_cloth_3', name: 'Bone Club',
    slot: 'weapon' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+3 damage on win; deals 2 damage to enemy each hand', cost: 30,
    modifier: {
      id: 'mod_weapon_cloth_3', name: 'Bone Club',
      description: '+3 damage on win; deals 2 damage to enemy each hand', source: 'equipment',
      modifyDamageDealt(damage) { return damage + 3; },
      onHandEnd(context) {
        context.enemyState.hp = Math.max(0, context.enemyState.hp - 2);
      },
    },
  },
  // ── Cloth Helm (new) ──
  {
    id: 'helm_cloth_2', name: 'Keffiyeh of Warding',
    slot: 'helm' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '20% less damage when player has 2 or fewer cards in hand', cost: 24,
    modifier: {
      id: 'mod_helm_cloth_2', name: 'Keffiyeh of Warding',
      description: '20% less damage when player has 2 or fewer cards in hand', source: 'equipment',
      modifyDamageReceived(damage, context) {
        return context.playerHand.cards.length <= 2 ? Math.round(damage * 0.8) : damage;
      },
    },
  },
  // ── Cloth Armor (new) ──
  createArmor('armor_cloth_2', 'Hardened Linen', 'cloth', 22, 0.15, '15% less incoming damage'),
  // ── Cloth Boots (new) ──
  createBoots('boots_cloth_2', 'Whirling Sandals', 'cloth', 22, 0.12, '12% dodge chance'),
  // ── Cloth Trinkets (new) ──
  {
    id: 'trinket_cloth_2', name: 'Copper Coin Ring',
    slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+8 gold per battle', cost: 18,
    modifier: {
      id: 'mod_trinket_cloth_2', name: 'Copper Coin Ring',
      description: '+8 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 8; },
    },
  },
  {
    id: 'trinket_cloth_3', name: "Wanderer's Pouch",
    slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+3 gold per hand won this battle', cost: 22,
    modifier: {
      id: 'mod_trinket_cloth_3', name: "Wanderer's Pouch",
      description: '+3 gold per hand won this battle', source: 'equipment',
      modifyGoldEarned(gold, context) { return gold + (context.handsWonThisBattle ?? 0) * 3; },
    },
  },
  {
    id: 'trinket_cloth_4', name: 'Lucky Knucklebone',
    slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+15 gold per battle if player won 2 or more hands', cost: 25,
    modifier: {
      id: 'mod_trinket_cloth_4', name: 'Lucky Knucklebone',
      description: '+15 gold per battle if player won 2 or more hands', source: 'equipment',
      modifyGoldEarned(gold, context) {
        return gold + ((context.handsWonThisBattle ?? 0) >= 2 ? 15 : 0);
      },
    },
  },
  // Trinkets
  {
    id: 'trinket_cloth', name: 'Cloth Trinket', slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+10 gold per battle', cost: 15,
    modifier: {
      id: 'mod_trinket_cloth', name: 'Cloth Trinket', description: '+10 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 10; },
    },
  },
  {
    id: 'trinket_bronze', name: 'Bronze Trinket', slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '25% less damage from random suit', cost: 40,
    modifier: (() => {
      let activeSuit: Suit | null = null;
      const mod: Modifier = {
        id: 'mod_trinket_bronze', name: 'Bronze Trinket',
        description: '25% less damage from a random suit', source: 'equipment',
        onBattleStart(context) {
          const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
          activeSuit = suits[context.rng.nextInt(0, 3)];
        },
        modifyDamageReceived(damage, context) {
          if (!activeSuit) return damage;
          // Check if any card in the winning hand (dealer hand when player loses) has the active suit
          const winnerHand = context.dealerHand;
          const hasSuit = winnerHand.cards.some(c => c.suit === activeSuit);
          if (hasSuit) {
            return Math.floor(damage * 0.75);
          }
          return damage;
        },
      };
      return mod;
    })(),
  },
  {
    id: 'trinket_iron', name: 'Iron Trinket', slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: 'Bust counts as score of 10', cost: 75,
    modifier: {
      id: 'mod_trinket_iron', name: 'Iron Trinket',
      description: 'Bust counts as score of 10', source: 'equipment',
      modifyBust(_hand, _score, _context) {
        return { busted: false, effectiveScore: 10 };
      },
    },
  },
  // ── Bronze Weapons (new) ──
  {
    id: 'weapon_bronze_2', name: 'Oasis Blade',
    slot: 'weapon' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+9 flat damage; +6 more if player score is 18 or higher', cost: 55,
    modifier: {
      id: 'mod_weapon_bronze_2', name: 'Oasis Blade',
      description: '+9 damage; +6 more at score 18+', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 9 + (!context.playerScore.busted && context.playerScore.value >= 18 ? 6 : 0);
      },
    },
  },
  {
    id: 'weapon_bronze_3', name: 'Twin Fangs',
    slot: 'weapon' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+8 flat damage; +8 more if player holds an Ace', cost: 65,
    modifier: {
      id: 'mod_weapon_bronze_3', name: 'Twin Fangs',
      description: '+8 damage; +8 more with an Ace in hand', source: 'equipment',
      modifyDamageDealt(damage, context) {
        const hasAce = context.playerHand.cards.some(c => c.rank === 'A');
        return damage + 8 + (hasAce ? 8 : 0);
      },
    },
  },
  // ── Bronze Helm (new) ──
  {
    id: 'helm_bronze_2', name: "Vizier's Headpiece",
    slot: 'helm' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '40% less bust damage; heal 3 HP on bust', cost: 48,
    modifier: {
      id: 'mod_helm_bronze_2', name: "Vizier's Headpiece",
      description: '40% less bust damage; heal 3 HP on bust', source: 'equipment',
      modifyDamageReceived(damage, context) {
        return context.playerScore.busted ? Math.round(damage * 0.6) : damage;
      },
      onHandEnd(context) {
        if (context.playerScore.busted) {
          context.playerState.hp = Math.min(context.playerState.hp + 3, context.playerState.maxHp);
        }
      },
    },
  },
  // ── Bronze Armor (new) ──
  createArmor('armor_bronze_2', 'Silk-Wrapped Mail', 'bronze', 52, 0.30, '30% less incoming damage'),
  // ── Bronze Boots (new) ──
  createBoots('boots_bronze_2', 'Quickstep Shoes', 'bronze', 48, 0.20, '20% dodge chance'),
  // ── Bronze Trinkets (new) ──
  {
    id: 'trinket_bronze_2', name: "Merchant's Medallion",
    slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+18 gold per battle', cost: 45,
    modifier: {
      id: 'mod_trinket_bronze_2', name: "Merchant's Medallion",
      description: '+18 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 18; },
    },
  },
  {
    id: 'trinket_bronze_3', name: 'Serpent Amulet',
    slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+8 gold per battle; +5 gold per blackjack scored', cost: 50,
    modifier: (() => {
      let bjCount = 0;
      const mod: Modifier = {
        id: 'mod_trinket_bronze_3', name: 'Serpent Amulet',
        description: '+8 gold per battle; +5 gold per blackjack', source: 'equipment',
        onHandEnd(context) {
          if (context.playerScore.isBlackjack) bjCount++;
        },
        modifyGoldEarned(gold) {
          const bonus = bjCount * 5;
          bjCount = 0;
          return gold + 8 + bonus;
        },
      };
      return mod;
    })(),
  },
  {
    id: 'trinket_bronze_4', name: 'Desert Eye',
    slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '15% less damage from a randomly chosen suit each battle', cost: 42,
    modifier: (() => {
      let activeSuit: Suit | null = null;
      const mod: Modifier = {
        id: 'mod_trinket_bronze_4', name: 'Desert Eye',
        description: '15% less damage from a random suit', source: 'equipment',
        onBattleStart(context) {
          const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
          activeSuit = suits[context.rng.nextInt(0, 3)];
        },
        modifyDamageReceived(damage, context) {
          if (!activeSuit) return damage;
          const hasSuit = context.dealerHand.cards.some(c => c.suit === activeSuit);
          return hasSuit ? Math.floor(damage * 0.85) : damage;
        },
      };
      return mod;
    })(),
  },
  // ── Iron Weapons (new) ──
  {
    id: 'weapon_iron_2', name: 'Golden Scimitar',
    slot: 'weapon' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '+22 flat damage; +10 on blackjack', cost: 95,
    modifier: {
      id: 'mod_weapon_iron_2', name: 'Golden Scimitar',
      description: '+22 damage; +10 on blackjack', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 22 + (context.playerScore.isBlackjack ? 10 : 0);
      },
    },
  },
  {
    id: 'weapon_iron_3', name: 'Sunfire Lance',
    slot: 'weapon' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '+20 flat damage; +8 if dealer drew 4 or more cards', cost: 108,
    modifier: {
      id: 'mod_weapon_iron_3', name: 'Sunfire Lance',
      description: '+20 damage; +8 if dealer has 4+ cards', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 20 + (context.dealerHand.cards.length >= 4 ? 8 : 0);
      },
    },
  },
  // ── Iron Helm (new) ──
  {
    id: 'helm_iron_2', name: "Sultan's Crown",
    slot: 'helm' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '75% less bust damage; heal 4 HP on bust', cost: 85,
    modifier: {
      id: 'mod_helm_iron_2', name: "Sultan's Crown",
      description: '75% less bust damage; heal 4 HP on bust', source: 'equipment',
      modifyDamageReceived(damage, context) {
        return context.playerScore.busted ? Math.round(damage * 0.25) : damage;
      },
      onHandEnd(context) {
        if (context.playerScore.busted) {
          context.playerState.hp = Math.min(context.playerState.hp + 4, context.playerState.maxHp);
        }
      },
    },
  },
  // ── Iron Armor (new) ──
  createArmor('armor_iron_2', 'Lamellar Armor', 'iron', 92, 0.55, '55% less incoming damage'),
  // ── Iron Boots (new) ──
  createBoots('boots_iron_2', 'Winged Sandals', 'iron', 88, 0.35, '35% dodge chance'),
  // ── Iron Trinkets (new) ──
  {
    id: 'trinket_iron_2', name: 'Lamp of Fortune',
    slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '+30 gold per battle', cost: 80,
    modifier: {
      id: 'mod_trinket_iron_2', name: 'Lamp of Fortune',
      description: '+30 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 30; },
    },
  },
  {
    id: 'trinket_iron_3', name: 'Ring of Solomon',
    slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '15% less incoming damage from all sources', cost: 90,
    modifier: {
      id: 'mod_trinket_iron_3', name: 'Ring of Solomon',
      description: '15% less all incoming damage', source: 'equipment',
      modifyDamageReceived(damage) { return Math.floor(damage * 0.85); },
    },
  },
  {
    id: 'trinket_iron_4', name: 'Seal of the Caliph',
    slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: 'First hand of each battle deals double damage', cost: 85,
    modifier: {
      id: 'mod_trinket_iron_4', name: 'Seal of the Caliph',
      description: 'First hand of each battle deals double damage', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return context.handNumber === 1 ? damage * 2 : damage;
      },
    },
  },
];

export function getAllEquipment(): Equipment[] {
  return [...ALL_EQUIPMENT];
}

export function getEquipmentById(id: string): Equipment {
  const found = ALL_EQUIPMENT.find(e => e.id === id);
  if (!found) throw new Error(`Equipment not found: ${id}`);
  return found;
}

export function getEquipmentBySlotAndTier(slot: EquipmentSlot, tier: EquipmentTier): Equipment {
  const found = ALL_EQUIPMENT.find(e => e.slot === slot && e.tier === tier);
  if (!found) throw new Error(`Equipment not found: ${slot}/${tier}`);
  return found;
}
