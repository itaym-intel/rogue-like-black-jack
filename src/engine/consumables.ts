import type { Consumable, ConsumableType, PlayerState, EnemyState, ActiveEffect, ModifierContext } from './types.js';
import {
  getRegistryConsumables,
  getRegistryConsumableByType,
} from './component-registry.js';

// Re-export data access from registry
export function getAllConsumables(): Consumable[] {
  return getRegistryConsumables();
}

export function getConsumableByType(type: ConsumableType): Consumable {
  return getRegistryConsumableByType(type);
}

// Behavioral functions remain here — these contain game logic, not just data

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
