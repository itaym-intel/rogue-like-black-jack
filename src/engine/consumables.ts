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
  {
    id: 'armor_elixir', name: 'Elixir of Iron Skin', type: 'armor_elixir',
    description: '−30% damage received for 2 hands', cost: 20,
    effect: { type: 'armor_elixir', value: 0.30, duration: 2 },
  },
  {
    id: 'dodge_brew', name: "Sand Dancer's Brew", type: 'dodge_brew',
    description: '25% dodge chance for 1 hand', cost: 18,
    effect: { type: 'dodge_brew', value: 0.25, duration: 1 },
  },
  {
    id: 'regen_draught', name: 'Phoenix Draught', type: 'regen_draught',
    description: 'Heal 2 HP per hand for 3 hands', cost: 22,
    effect: { type: 'regen_draught', value: 2, duration: 3 },
  },
  {
    id: 'battle_trance', name: 'Battle Trance', type: 'battle_trance',
    description: '+40% damage dealt and −20% damage received for 2 hands', cost: 25,
    effect: { type: 'battle_trance', value: 0.40, duration: 2 },
  },
  {
    id: 'fortune_vessel', name: "Fortune's Vessel", type: 'fortune_vessel',
    description: 'Instantly gain 20 gold', cost: 20,
    effect: { type: 'fortune_vessel', value: 20 },
  },
  {
    id: 'wrath_elixir', name: 'Wrath Elixir', type: 'wrath_elixir',
    description: '+80% damage for 1 hand', cost: 28,
    effect: { type: 'wrath_elixir', value: 0.80, duration: 1 },
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
    case 'armor_elixir': {
      const effect: ActiveEffect = {
        id: 'armor_elixir_effect', name: 'Iron Skin',
        remainingHands: consumable.effect.duration ?? 2,
        modifier: {
          id: 'mod_armor_elixir', name: 'Iron Skin',
          description: `−${Math.round(consumable.effect.value * 100)}% damage received`,
          source: 'consumable',
          modifyDamageReceived(damage) {
            return Math.round(damage * (1 - consumable.effect.value));
          },
        },
      };
      playerState.activeEffects.push(effect);
      return `Iron Skin active: −${Math.round(consumable.effect.value * 100)}% damage for ${effect.remainingHands} hand(s)`;
    }
    case 'dodge_brew': {
      const effect: ActiveEffect = {
        id: 'dodge_brew_effect', name: 'Evasion',
        remainingHands: consumable.effect.duration ?? 1,
        modifier: {
          id: 'mod_dodge_brew', name: 'Evasion',
          description: `${Math.round(consumable.effect.value * 100)}% dodge`,
          source: 'consumable',
          dodgeCheck(context) { return context.rng.next() < consumable.effect.value; },
        },
      };
      playerState.activeEffects.push(effect);
      return `Evasion active: ${Math.round(consumable.effect.value * 100)}% dodge for ${effect.remainingHands} hand(s)`;
    }
    case 'regen_draught': {
      const effect: ActiveEffect = {
        id: 'regen_effect', name: 'Regeneration',
        remainingHands: consumable.effect.duration ?? 3,
        modifier: {
          id: 'mod_regen_draught', name: 'Regeneration',
          description: `Heal ${consumable.effect.value} HP per hand`,
          source: 'consumable',
          onHandStart(context) {
            context.playerState.hp = Math.min(
              context.playerState.hp + consumable.effect.value,
              context.playerState.maxHp
            );
          },
        },
      };
      playerState.activeEffects.push(effect);
      return `Regeneration active: heal ${consumable.effect.value} HP/hand for ${effect.remainingHands} hands`;
    }
    case 'battle_trance': {
      const effect: ActiveEffect = {
        id: 'battle_trance_effect', name: 'Battle Trance',
        remainingHands: consumable.effect.duration ?? 2,
        modifier: {
          id: 'mod_battle_trance', name: 'Battle Trance',
          description: `+${Math.round(consumable.effect.value * 100)}% damage dealt, −20% damage received`,
          source: 'consumable',
          modifyDamageDealt(damage) { return Math.floor(damage * (1 + consumable.effect.value)); },
          modifyDamageReceived(damage) { return Math.round(damage * 0.8); },
        },
      };
      playerState.activeEffects.push(effect);
      return `Battle Trance active for ${effect.remainingHands} hand(s)`;
    }
    case 'fortune_vessel': {
      playerState.gold += consumable.effect.value;
      return `Gained ${consumable.effect.value} gold (${playerState.gold} total)`;
    }
    case 'wrath_elixir': {
      const effect: ActiveEffect = {
        id: 'wrath_effect', name: 'Wrath',
        remainingHands: consumable.effect.duration ?? 1,
        modifier: {
          id: 'mod_wrath_elixir', name: 'Wrath',
          description: `+${Math.round(consumable.effect.value * 100)}% damage`,
          source: 'consumable',
          modifyDamageDealt(damage) { return Math.floor(damage * (1 + consumable.effect.value)); },
        },
      };
      playerState.activeEffects.push(effect);
      return `Wrath active: +${Math.round(consumable.effect.value * 100)}% damage for ${effect.remainingHands} hand(s)`;
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
