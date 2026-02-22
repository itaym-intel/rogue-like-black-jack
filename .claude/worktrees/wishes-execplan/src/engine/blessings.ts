import type { BlessingDefinition, BlessingEffect, BlessingEffectType, Modifier, Suit } from './types.js';

const EFFECT_BOUNDS: Record<BlessingEffectType, { min: number; max: number }> = {
  flat_damage_bonus: { min: 1, max: 25 },
  percent_damage_bonus: { min: 0.1, max: 1.0 },
  flat_damage_reduction: { min: 1, max: 15 },
  percent_damage_reduction: { min: 0.05, max: 0.5 },
  dodge_chance: { min: 0.05, max: 0.35 },
  bust_save: { min: 8, max: 15 },
  max_hp_bonus: { min: 5, max: 30 },
  heal_per_hand: { min: 1, max: 5 },
  heal_on_win: { min: 1, max: 10 },
  lifesteal: { min: 0.1, max: 0.5 },
  bust_threshold_bonus: { min: 1, max: 4 },
  dealer_stands_on: { min: 15, max: 19 },
  double_down_multiplier: { min: 2, max: 4 },
  flat_gold_bonus: { min: 2, max: 20 },
  percent_gold_bonus: { min: 0.1, max: 1.0 },
  damage_per_hand: { min: 1, max: 5 },
  blackjack_bonus_damage: { min: 3, max: 20 },
  suit_damage_bonus: { min: 1, max: 10 },
};

const VALID_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function validateBlessingDefinition(def: BlessingDefinition): BlessingDefinition {
  let name = def.name ?? 'Unnamed Blessing';
  let description = def.description ?? 'A mysterious blessing';

  if (name.length > 60) name = name.slice(0, 60);
  if (description.length > 60) description = description.slice(0, 60);

  let effects = (def.effects ?? []).slice(0, 3);

  if (effects.length === 0) {
    effects = [{ type: 'flat_damage_bonus', value: 5 }];
  }

  effects = effects.map((e): BlessingEffect => {
    const bounds = EFFECT_BOUNDS[e.type];
    if (!bounds) {
      return { type: 'flat_damage_bonus', value: 5 };
    }
    const clamped: BlessingEffect = {
      type: e.type,
      value: clamp(e.value, bounds.min, bounds.max),
    };
    if (e.type === 'suit_damage_bonus') {
      clamped.suit = (e.suit && VALID_SUITS.includes(e.suit)) ? e.suit : 'hearts';
    }
    return clamped;
  });

  return { name, description, effects };
}

export function buildBlessingModifier(def: BlessingDefinition): Modifier {
  const id = 'wish_blessing_' + def.name.toLowerCase().replace(/\s+/g, '_');

  // Composed hook references
  let modifyDamageDealt: ((damage: number, context: import('./types.js').ModifierContext) => number) | undefined;
  let modifyDamageReceived: ((damage: number, context: import('./types.js').ModifierContext) => number) | undefined;
  let dodgeCheck: ((context: import('./types.js').ModifierContext) => boolean) | undefined;
  let modifyBust: ((hand: import('./types.js').Hand, score: number, context: import('./types.js').ModifierContext) => { busted: boolean; effectiveScore: number } | null) | undefined;
  let modifyRules: ((rules: import('./types.js').GameRules) => import('./types.js').GameRules) | undefined;
  let modifyGoldEarned: ((gold: number, context: import('./types.js').ModifierContext) => number) | undefined;
  let onHandStart: ((context: import('./types.js').ModifierContext) => void) | undefined;
  let onHandEnd: ((context: import('./types.js').ModifierContext) => void) | undefined;
  let onBattleStart: ((context: import('./types.js').ModifierContext) => void) | undefined;

  for (const effect of def.effects) {
    const { type, value } = effect;

    switch (type) {
      case 'flat_damage_bonus': {
        const prev = modifyDamageDealt;
        modifyDamageDealt = (damage, ctx) => {
          const d = prev ? prev(damage, ctx) : damage;
          return d + value;
        };
        break;
      }
      case 'percent_damage_bonus': {
        const prev = modifyDamageDealt;
        modifyDamageDealt = (damage, ctx) => {
          const d = prev ? prev(damage, ctx) : damage;
          return Math.floor(d * (1 + value));
        };
        break;
      }
      case 'flat_damage_reduction': {
        const prev = modifyDamageReceived;
        modifyDamageReceived = (damage, ctx) => {
          const d = prev ? prev(damage, ctx) : damage;
          return Math.max(0, d - value);
        };
        break;
      }
      case 'percent_damage_reduction': {
        const prev = modifyDamageReceived;
        modifyDamageReceived = (damage, ctx) => {
          const d = prev ? prev(damage, ctx) : damage;
          return Math.floor(d * (1 - value));
        };
        break;
      }
      case 'dodge_chance': {
        const prev = dodgeCheck;
        dodgeCheck = (ctx) => {
          if (prev && prev(ctx)) return true;
          return ctx.rng.next() < value;
        };
        break;
      }
      case 'bust_save': {
        modifyBust = (_hand, _score, _ctx) => {
          return { busted: false, effectiveScore: value };
        };
        break;
      }
      case 'max_hp_bonus': {
        let applied = false;
        const prev = onBattleStart;
        onBattleStart = (ctx) => {
          if (prev) prev(ctx);
          if (!applied) {
            ctx.playerState.maxHp += value;
            ctx.playerState.hp += value;
            applied = true;
          }
        };
        break;
      }
      case 'heal_per_hand': {
        const prev = onHandStart;
        onHandStart = (ctx) => {
          if (prev) prev(ctx);
          ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
        };
        break;
      }
      case 'heal_on_win': {
        const prev = onHandEnd;
        onHandEnd = (ctx) => {
          if (prev) prev(ctx);
          const pScore = ctx.playerScore;
          const dScore = ctx.dealerScore;
          const playerWon = (!pScore.busted && dScore.busted) ||
            (!pScore.busted && !dScore.busted && pScore.value > dScore.value);
          if (playerWon) {
            ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
          }
        };
        break;
      }
      case 'lifesteal': {
        const prev = onHandEnd;
        onHandEnd = (ctx) => {
          if (prev) prev(ctx);
          const pScore = ctx.playerScore;
          const dScore = ctx.dealerScore;
          const playerWon = (!pScore.busted && dScore.busted) ||
            (!pScore.busted && !dScore.busted && pScore.value > dScore.value);
          if (playerWon) {
            const scoreDiff = Math.abs(pScore.value - (dScore.busted ? 0 : dScore.value));
            const healAmt = Math.floor(scoreDiff * value);
            if (healAmt > 0) {
              ctx.playerState.hp = Math.min(ctx.playerState.hp + healAmt, ctx.playerState.maxHp);
            }
          }
        };
        break;
      }
      case 'bust_threshold_bonus': {
        const prev = modifyRules;
        modifyRules = (rules) => {
          const r = prev ? prev(rules) : rules;
          return { ...r, scoring: { ...r.scoring, bustThreshold: r.scoring.bustThreshold + value } };
        };
        break;
      }
      case 'dealer_stands_on': {
        const prev = modifyRules;
        modifyRules = (rules) => {
          const r = prev ? prev(rules) : rules;
          return { ...r, dealer: { ...r.dealer, standsOn: value } };
        };
        break;
      }
      case 'double_down_multiplier': {
        const prev = modifyRules;
        modifyRules = (rules) => {
          const r = prev ? prev(rules) : rules;
          return { ...r, actions: { ...r.actions, doubleDownMultiplier: value } };
        };
        break;
      }
      case 'flat_gold_bonus': {
        const prev = modifyGoldEarned;
        modifyGoldEarned = (gold, ctx) => {
          const g = prev ? prev(gold, ctx) : gold;
          return g + value;
        };
        break;
      }
      case 'percent_gold_bonus': {
        const prev = modifyGoldEarned;
        modifyGoldEarned = (gold, ctx) => {
          const g = prev ? prev(gold, ctx) : gold;
          return Math.floor(g * (1 + value));
        };
        break;
      }
      case 'damage_per_hand': {
        const prev = onHandStart;
        onHandStart = (ctx) => {
          if (prev) prev(ctx);
          ctx.enemyState.hp = Math.max(0, ctx.enemyState.hp - value);
        };
        break;
      }
      case 'blackjack_bonus_damage': {
        const prev = modifyDamageDealt;
        modifyDamageDealt = (damage, ctx) => {
          const d = prev ? prev(damage, ctx) : damage;
          if (ctx.playerScore.isBlackjack) {
            return d + value;
          }
          return d;
        };
        break;
      }
      case 'suit_damage_bonus': {
        const suit = effect.suit ?? 'hearts';
        const prev = modifyDamageDealt;
        modifyDamageDealt = (damage, ctx) => {
          const d = prev ? prev(damage, ctx) : damage;
          const matchingCards = ctx.playerHand.cards.filter(c => c.suit === suit).length;
          return d + matchingCards * value;
        };
        break;
      }
    }
  }

  const modifier: Modifier = {
    id,
    name: def.name,
    description: def.description,
    source: 'wish_blessing',
  };

  if (modifyDamageDealt) modifier.modifyDamageDealt = modifyDamageDealt;
  if (modifyDamageReceived) modifier.modifyDamageReceived = modifyDamageReceived;
  if (dodgeCheck) modifier.dodgeCheck = dodgeCheck;
  if (modifyBust) modifier.modifyBust = modifyBust;
  if (modifyRules) modifier.modifyRules = modifyRules;
  if (modifyGoldEarned) modifier.modifyGoldEarned = modifyGoldEarned;
  if (onHandStart) modifier.onHandStart = onHandStart;
  if (onHandEnd) modifier.onHandEnd = onHandEnd;
  if (onBattleStart) modifier.onBattleStart = onBattleStart;

  return modifier;
}
