import type { Consumable, ConsumableType, PlayerState, EnemyState, ActiveEffect, ModifierContext } from './types.js';

const CONSUMABLE_DEFS: Consumable[] = [
  {
    id: 'health_potion', name: 'Health Potion', type: 'health_potion',
    description: 'Restores 5 HP', cost: 10,
    effect: { type: 'health_potion', value: 5 },
  },
  {
    id: 'damage_potion', name: 'Damage Potion', type: 'damage_potion',
    description: 'Deals 5 damage to enemy', cost: 15,
    effect: { type: 'damage_potion', value: 5 },
  },
  {
    id: 'strength_potion', name: 'Strength Potion', type: 'strength_potion',
    description: '+30% damage for 1 hand', cost: 20,
    effect: { type: 'strength_potion', value: 0.3, duration: 1 },
  },
  {
    id: 'poison_potion', name: 'Poison Potion', type: 'poison_potion',
    description: '3 damage/hand for 3 hands', cost: 20,
    effect: { type: 'poison_potion', value: 3, duration: 3 },
  },
];

export function getAllConsumables(): Consumable[] {
  return [...CONSUMABLE_DEFS];
}

export function getConsumableByType(type: ConsumableType): Consumable {
  const found = CONSUMABLE_DEFS.find(c => c.type === type);
  if (!found) throw new Error(`Consumable not found: ${type}`);
  return found;
}

export function applyConsumable(
  consumable: Consumable,
  playerState: PlayerState,
  enemyState: EnemyState
): string {
  switch (consumable.effect.type) {
    case 'health_potion': {
      const heal = consumable.effect.value;
      const before = playerState.hp;
      playerState.hp = Math.min(playerState.hp + heal, playerState.maxHp);
      const actual = playerState.hp - before;
      return `Healed ${actual} HP (${playerState.hp}/${playerState.maxHp})`;
    }
    case 'damage_potion': {
      const dmg = consumable.effect.value;
      enemyState.hp = Math.max(0, enemyState.hp - dmg);
      return `Dealt ${dmg} damage to ${enemyState.data.name} (${enemyState.hp}/${enemyState.data.maxHp})`;
    }
    case 'strength_potion': {
      const effect: ActiveEffect = {
        id: 'strength_effect',
        name: 'Strength',
        remainingHands: consumable.effect.duration ?? 1,
        modifier: {
          id: 'mod_strength_potion',
          name: 'Strength',
          description: '+30% damage for 1 hand',
          source: 'consumable',
          modifyDamageDealt(damage) {
            return Math.floor(damage * (1 + consumable.effect.value));
          },
        },
      };
      playerState.activeEffects.push(effect);
      return `Strength increased by ${Math.round(consumable.effect.value * 100)}% for ${effect.remainingHands} hand(s)`;
    }
    case 'poison_potion': {
      const effect: ActiveEffect = {
        id: 'poison_effect',
        name: 'Poison',
        remainingHands: consumable.effect.duration ?? 3,
        modifier: {
          id: 'mod_poison_potion',
          name: 'Poison',
          description: `${consumable.effect.value} damage/hand`,
          source: 'consumable',
          onHandEnd(_context) {
            // Poison damage is applied in tickActiveEffects
          },
        },
      };
      playerState.activeEffects.push(effect);
      return `Poisoned enemy for ${consumable.effect.value} damage/hand for ${effect.remainingHands} hands`;
    }
    default:
      return 'Unknown consumable';
  }
}

export function tickActiveEffects(
  playerState: PlayerState,
  enemyState: EnemyState,
  _context: ModifierContext
): string[] {
  const messages: string[] = [];

  for (const effect of playerState.activeEffects) {
    // Apply poison damage
    if (effect.id === 'poison_effect') {
      const poisonDmg = 3; // poison always deals 3
      enemyState.hp = Math.max(0, enemyState.hp - poisonDmg);
      messages.push(`Poison dealt ${poisonDmg} to ${enemyState.data.name} (${enemyState.hp}/${enemyState.data.maxHp})`);
    }

    effect.remainingHands--;
  }

  // Remove expired effects
  playerState.activeEffects = playerState.activeEffects.filter(e => e.remainingHands > 0);

  return messages;
}
