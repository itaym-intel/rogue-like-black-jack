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
