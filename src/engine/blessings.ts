import type {
  BlessingDefinition, BlessingEffect, BlessingCondition,
  Modifier, ModifierContext, Rank, Suit,
} from './types.js';
import {
  UNIVERSAL_EFFECT_BOUNDS,
  clamp, validRank, validSuit, validRanks,
  checkCondition as checkConditionImpl,
  buildModifier,
} from './effects.js';

const EFFECT_BOUNDS = UNIVERSAL_EFFECT_BOUNDS;

// ── Validation ──

export function validateBlessingDefinition(def: BlessingDefinition): BlessingDefinition {
  const name = (def.name || 'Blessing').slice(0, 60);
  const description = (def.description || 'A magical blessing').slice(0, 60);
  let effects = [...(def.effects || [])];

  // Cap at 3 effects
  if (effects.length > 3) effects = effects.slice(0, 3);

  // Fallback for empty
  if (effects.length === 0) {
    effects = [{ type: 'flat_damage_bonus', value: 5 }];
  }

  const validatedEffects: BlessingEffect[] = effects.map(effect => {
    const bounds = EFFECT_BOUNDS[effect.type];
    if (!bounds) {
      return { type: 'flat_damage_bonus', value: 5 };
    }

    const validated: BlessingEffect = {
      type: effect.type,
      value: bounds.boolean ? bounds.min : clamp(effect.value ?? bounds.min, bounds.min, bounds.max),
    };

    if (bounds.needsSuit) validated.suit = validSuit(effect.suit);
    if (bounds.needsRank) validated.rank = validRank(effect.rank);
    if (bounds.needsRanks) validated.ranks = validRanks(effect.ranks);

    if (effect.condition) {
      validated.condition = effect.condition;
    }

    return validated;
  });

  return { name, description, effects: validatedEffects };
}

// ── Condition Checking ──

export function checkCondition(condition: BlessingCondition, context: ModifierContext): boolean {
  return checkConditionImpl(condition, context);
}

// ── Builder ──

export function buildBlessingModifier(def: BlessingDefinition): Modifier {
  const id = 'wish_blessing_' + def.name.toLowerCase().replace(/\s+/g, '_');
  return buildModifier(id, def.name, def.description, 'wish_blessing', def.effects);
}
