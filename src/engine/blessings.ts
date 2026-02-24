import type {
  BlessingDefinition, BlessingEffect, BlessingEffectType, BlessingCondition,
  Modifier, ModifierContext, GameRules, Card, Hand, Rank, Suit,
} from './types.js';

const VALID_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const VALID_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

// ── Clamping bounds per effect type ──

interface EffectBounds {
  min: number;
  max: number;
  needsSuit?: boolean;
  needsRank?: boolean;
  needsRanks?: boolean;
  boolean?: boolean;
}

const EFFECT_BOUNDS: Record<BlessingEffectType, EffectBounds> = {
  // Card & Deck
  flexible_rank: { min: 1, max: 1, boolean: true, needsRank: true },
  change_face_card_value: { min: 5, max: 15 },
  change_ace_high_value: { min: 8, max: 15 },
  suit_card_value_bonus: { min: 1, max: 5, needsSuit: true },
  rank_value_override: { min: 0, max: 15, needsRank: true },
  remove_rank_from_deck: { min: 1, max: 1, boolean: true, needsRank: true },
  remove_suit_from_deck: { min: 1, max: 1, boolean: true, needsSuit: true },
  force_deck_ranks: { min: 1, max: 1, boolean: true, needsRanks: true },
  extra_copies_of_rank: { min: 1, max: 4, needsRank: true },
  no_reshuffle: { min: 1, max: 1, boolean: true },
  multiple_decks: { min: 2, max: 4 },
  // Scoring & Bust
  bust_threshold_bonus: { min: 1, max: 5 },
  additional_blackjack_value: { min: 22, max: 25 },
  bust_save: { min: 8, max: 18 },
  bust_card_value_halved: { min: 1, max: 1, boolean: true },
  ignore_card_on_bust: { min: 1, max: 1, boolean: true },
  five_card_charlie: { min: 5, max: 30 },
  soft_hand_bonus: { min: 2, max: 15 },
  exact_target_bonus: { min: 3, max: 20 },
  // Player Actions
  enable_remove_card: { min: 1, max: 3 },
  enable_peek: { min: 1, max: 1, boolean: true },
  enable_surrender: { min: 1, max: 1, boolean: true },
  enable_split: { min: 1, max: 1, boolean: true },
  extra_starting_cards: { min: 1, max: 3 },
  fewer_starting_cards: { min: 1, max: 1 },
  double_down_any_time: { min: 1, max: 1, boolean: true },
  hit_after_double: { min: 1, max: 1, boolean: true },
  // Dealer
  dealer_stands_on: { min: 14, max: 19 },
  dealer_hits_soft_17: { min: 1, max: 1, boolean: true },
  ties_favor_player: { min: 1, max: 1, boolean: true },
  double_bust_favors_player: { min: 1, max: 1, boolean: true },
  dealer_reveals_cards: { min: 1, max: 1, boolean: true },
  dealer_extra_starting_card: { min: 1, max: 2 },
  dealer_fewer_starting_cards: { min: 1, max: 1 },
  // Damage
  flat_damage_bonus: { min: 1, max: 25 },
  percent_damage_bonus: { min: 0.1, max: 1.0 },
  damage_multiplier: { min: 1.5, max: 3.0 },
  suit_damage_bonus: { min: 1, max: 10, needsSuit: true },
  face_card_damage_bonus: { min: 1, max: 8 },
  ace_damage_bonus: { min: 2, max: 15 },
  even_card_bonus: { min: 1, max: 8 },
  odd_card_bonus: { min: 1, max: 8 },
  low_card_bonus: { min: 1, max: 8 },
  high_card_bonus: { min: 1, max: 8 },
  blackjack_bonus_damage: { min: 3, max: 25 },
  blackjack_damage_multiplier: { min: 1.5, max: 3.0 },
  damage_on_push: { min: 2, max: 15 },
  damage_per_card_in_hand: { min: 1, max: 5 },
  overkill_carry: { min: 0.25, max: 1.0 },
  scaling_damage_per_win: { min: 1, max: 5 },
  double_down_multiplier: { min: 2, max: 5 },
  // Defense
  flat_damage_reduction: { min: 1, max: 15 },
  percent_damage_reduction: { min: 0.05, max: 0.5 },
  dodge_chance: { min: 0.05, max: 0.35 },
  thorns: { min: 0.1, max: 0.5 },
  damage_shield: { min: 5, max: 30 },
  damage_cap: { min: 5, max: 25 },
  suit_damage_reduction: { min: 0.1, max: 0.4, needsSuit: true },
  reduce_bust_damage: { min: 0.2, max: 0.8 },
  // Healing
  max_hp_bonus: { min: 5, max: 30 },
  heal_per_hand: { min: 1, max: 5 },
  heal_on_win: { min: 1, max: 10 },
  heal_on_blackjack: { min: 3, max: 15 },
  heal_on_dodge: { min: 2, max: 10 },
  lifesteal: { min: 0.1, max: 0.5 },
  heal_per_battle: { min: 3, max: 15 },
  heal_on_push: { min: 1, max: 8 },
  // DoT
  damage_per_hand: { min: 1, max: 5 },
  poison: { min: 1, max: 3 },
  damage_on_enemy_bust: { min: 3, max: 15 },
  // Economy
  flat_gold_bonus: { min: 2, max: 20 },
  percent_gold_bonus: { min: 0.1, max: 1.0 },
  gold_per_hand_won: { min: 1, max: 5 },
  gold_per_blackjack: { min: 3, max: 15 },
  shop_discount: { min: 0.1, max: 0.5 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function validRank(rank: Rank | undefined): Rank {
  if (rank && VALID_RANKS.includes(rank)) return rank;
  return 'A';
}

function validSuit(suit: Suit | undefined): Suit {
  if (suit && VALID_SUITS.includes(suit)) return suit;
  return 'hearts';
}

function validRanks(ranks: Rank[] | undefined): Rank[] {
  if (!ranks || !Array.isArray(ranks) || ranks.length === 0) return ['K', 'A'];
  const valid = ranks.filter(r => VALID_RANKS.includes(r));
  if (valid.length === 0) return ['K', 'A'];
  return valid.slice(0, 4);
}

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
  switch (condition.type) {
    case 'hand_contains_pair': {
      const ranks = context.playerHand.cards.map(c => c.rank);
      return ranks.some((r, i) => ranks.indexOf(r) !== i);
    }
    case 'hand_is_flush': {
      const cards = context.playerHand.cards;
      return cards.length >= 2 && cards.every(c => c.suit === cards[0].suit);
    }
    case 'hand_all_same_color': {
      const cards = context.playerHand.cards;
      if (cards.length < 2) return false;
      const isRed = (s: Suit) => s === 'hearts' || s === 'diamonds';
      const firstRed = isRed(cards[0].suit);
      return cards.every(c => isRed(c.suit) === firstRed);
    }
    case 'hand_size_equals':
      return context.playerHand.cards.length === (condition.value ?? 0);
    case 'hand_size_gte':
      return context.playerHand.cards.length >= (condition.value ?? 0);
    case 'hand_contains_rank':
      return context.playerHand.cards.some(c => c.rank === condition.rank);
    case 'hand_contains_suit':
      return context.playerHand.cards.some(c => c.suit === condition.suit);
    case 'score_exactly':
      return context.playerScore.value === (condition.value ?? 0);
    case 'score_gte':
      return context.playerScore.value >= (condition.value ?? 0);
    case 'on_blackjack':
      return context.playerScore.isBlackjack;
    case 'on_bust':
      return context.playerScore.busted;
    case 'on_soft_hand':
      return context.playerScore.soft;
    case 'on_win':
      return !context.playerScore.busted && (context.dealerScore.busted || context.playerScore.value > context.dealerScore.value);
    case 'on_loss':
      return context.playerScore.busted || (!context.dealerScore.busted && context.dealerScore.value > context.playerScore.value);
    case 'on_push':
      return !context.playerScore.busted && !context.dealerScore.busted && context.playerScore.value === context.dealerScore.value;
    case 'on_dodge':
      return false; // Handled via flag in engine
    case 'on_enemy_bust':
      return context.dealerScore.busted;
    case 'on_win_no_damage_taken':
      return context.lastDamageTaken === 0 &&
        !context.playerScore.busted &&
        (context.dealerScore.busted || context.playerScore.value > context.dealerScore.value);
    case 'hp_below_percent':
      return (context.playerState.hp / context.playerState.maxHp) < ((condition.value ?? 50) / 100);
    case 'hp_above_percent':
      return (context.playerState.hp / context.playerState.maxHp) > ((condition.value ?? 50) / 100);
    case 'enemy_hp_below_percent':
      return (context.enemyState.hp / context.enemyState.data.maxHp) < ((condition.value ?? 50) / 100);
    case 'gold_above':
      return context.playerState.gold > (condition.value ?? 0);
    case 'consecutive_wins':
      return context.consecutiveWins >= (condition.value ?? 1);
    case 'consecutive_losses':
      return context.consecutiveLosses >= (condition.value ?? 1);
    case 'first_hand_of_battle':
      return context.handNumber === 1;
    case 'same_score_as_previous':
      return context.previousHandScore !== null && context.playerScore.value === context.previousHandScore;
    case 'enemy_killed_by_dot':
      return context.killCause === 'dot';
    case 'enemy_killed_by_blackjack':
      return context.enemyState.hp <= 0 && context.playerScore.isBlackjack;
    // Event-driven conditions handled by builder
    case 'when_player_draws_rank':
    case 'when_player_draws_suit':
    case 'when_dealer_draws_rank':
    case 'when_dealer_draws_suit':
      return false; // These are event-driven, not state-based
    default:
      return false;
  }
}

// ── Builder ──

function isEvenRank(rank: Rank): boolean {
  return ['2', '4', '6', '8', '10'].includes(rank);
}

function isOddRank(rank: Rank): boolean {
  return ['3', '5', '7', '9', 'A'].includes(rank);
}

function isLowRank(rank: Rank): boolean {
  return ['2', '3', '4', '5', '6'].includes(rank);
}

function isHighRank(rank: Rank): boolean {
  return ['7', '8', '9', '10'].includes(rank);
}

function isFaceCard(rank: Rank): boolean {
  return ['J', 'Q', 'K'].includes(rank);
}

export function buildBlessingModifier(def: BlessingDefinition): Modifier {
  const modifier: Modifier = {
    id: 'wish_blessing_' + def.name.toLowerCase().replace(/\s+/g, '_'),
    name: def.name,
    description: def.description,
    source: 'wish_blessing',
  };

  for (const effect of def.effects) {
    applyEffect(modifier, effect);
  }

  return modifier;
}

function applyEffect(modifier: Modifier, effect: BlessingEffect): void {
  const { type, value } = effect;
  const condition = effect.condition;
  const isEventDriven = condition && [
    'when_player_draws_rank', 'when_player_draws_suit',
    'when_dealer_draws_rank', 'when_dealer_draws_suit',
  ].includes(condition.type);

  // For event-driven conditions, set up the trigger flag system
  let triggered = false;
  if (isEventDriven && condition) {
    const prevOnCardDrawn = modifier.onCardDrawn;
    const prevOnHandStart = modifier.onHandStart;

    modifier.onCardDrawn = (card: Card, drawer: 'player' | 'dealer', ctx: ModifierContext) => {
      if (prevOnCardDrawn) prevOnCardDrawn(card, drawer, ctx);
      if (condition.type === 'when_player_draws_rank' && drawer === 'player' && card.rank === condition.rank) triggered = true;
      if (condition.type === 'when_player_draws_suit' && drawer === 'player' && card.suit === condition.suit) triggered = true;
      if (condition.type === 'when_dealer_draws_rank' && drawer === 'dealer' && card.rank === condition.rank) triggered = true;
      if (condition.type === 'when_dealer_draws_suit' && drawer === 'dealer' && card.suit === condition.suit) triggered = true;
    };

    modifier.onHandStart = (ctx: ModifierContext) => {
      if (prevOnHandStart) prevOnHandStart(ctx);
      triggered = false;
    };
  }

  // Helper to wrap effect hook with condition check
  const shouldApply = (ctx: ModifierContext): boolean => {
    if (!condition) return true;
    if (isEventDriven) return triggered;
    return checkCondition(condition, ctx);
  };

  switch (type) {
    // ── Card & Deck Manipulation ──
    case 'flexible_rank': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        if (!r.scoring.flexibleRanks.includes(effect.rank!)) {
          r.scoring.flexibleRanks = [...r.scoring.flexibleRanks, effect.rank!];
        }
        return r;
      };
      break;
    }
    case 'change_face_card_value': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.scoring.faceCardValue = value;
        return r;
      };
      break;
    }
    case 'change_ace_high_value': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.scoring.aceHighValue = value;
        return r;
      };
      break;
    }
    case 'suit_card_value_bonus': {
      const prevModifyCardValue = modifier.modifyCardValue;
      modifier.modifyCardValue = (card: Card, baseValue: number, ctx: ModifierContext): number => {
        const base = prevModifyCardValue ? prevModifyCardValue(card, baseValue, ctx) : baseValue;
        if (card.suit === effect.suit) return base + value;
        return base;
      };
      break;
    }
    case 'rank_value_override': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.scoring.rankValueOverrides = { ...r.scoring.rankValueOverrides, [effect.rank!]: value };
        return r;
      };
      break;
    }
    case 'remove_rank_from_deck': {
      const prevModifyDeck = modifier.modifyDeck;
      modifier.modifyDeck = (deck: Card[], rules: GameRules): Card[] => {
        let d = prevModifyDeck ? prevModifyDeck(deck, rules) : deck;
        return d.filter(c => c.rank !== effect.rank);
      };
      break;
    }
    case 'remove_suit_from_deck': {
      const prevModifyDeck = modifier.modifyDeck;
      modifier.modifyDeck = (deck: Card[], rules: GameRules): Card[] => {
        let d = prevModifyDeck ? prevModifyDeck(deck, rules) : deck;
        return d.filter(c => c.suit !== effect.suit);
      };
      break;
    }
    case 'force_deck_ranks': {
      const prevModifyDeck = modifier.modifyDeck;
      const allowedRanks = effect.ranks!;
      modifier.modifyDeck = (deck: Card[], rules: GameRules): Card[] => {
        let d = prevModifyDeck ? prevModifyDeck(deck, rules) : deck;
        return d.filter(c => allowedRanks.includes(c.rank));
      };
      break;
    }
    case 'extra_copies_of_rank': {
      const prevModifyDeck = modifier.modifyDeck;
      modifier.modifyDeck = (deck: Card[], rules: GameRules): Card[] => {
        let d = prevModifyDeck ? prevModifyDeck(deck, rules) : [...deck];
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        for (let i = 0; i < value; i++) {
          for (const suit of suits) {
            d.push({ suit, rank: effect.rank! });
          }
        }
        return d;
      };
      break;
    }
    case 'no_reshuffle': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.deck.reshuffleBetweenHands = false;
        return r;
      };
      break;
    }
    case 'multiple_decks': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.deck.numberOfDecks = value;
        return r;
      };
      break;
    }

    // ── Scoring & Bust Manipulation ──
    case 'bust_threshold_bonus': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.scoring.bustThreshold += value;
        return r;
      };
      break;
    }
    case 'additional_blackjack_value': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        if (!r.scoring.additionalBlackjackValues.includes(value)) {
          r.scoring.additionalBlackjackValues = [...r.scoring.additionalBlackjackValues, value];
        }
        return r;
      };
      break;
    }
    case 'bust_save': {
      const prevModifyBust = modifier.modifyBust;
      modifier.modifyBust = (hand: Hand, score: number, ctx: ModifierContext) => {
        if (prevModifyBust) {
          const prev = prevModifyBust(hand, score, ctx);
          if (prev && !prev.busted) return prev;
        }
        return { busted: false, effectiveScore: value };
      };
      break;
    }
    case 'bust_card_value_halved': {
      const prevModifyBust = modifier.modifyBust;
      modifier.modifyBust = (hand: Hand, score: number, ctx: ModifierContext) => {
        if (prevModifyBust) {
          const prev = prevModifyBust(hand, score, ctx);
          if (prev && !prev.busted) return prev;
        }
        // Halve the last card's value and check if it saves
        const cards = hand.cards;
        if (cards.length === 0) return null;
        const lastCard = cards[cards.length - 1];
        const lastValue = isFaceCard(lastCard.rank) ? ctx.rules.scoring.faceCardValue :
          lastCard.rank === 'A' ? ctx.rules.scoring.aceHighValue :
          parseInt(lastCard.rank, 10);
        const halved = Math.floor(lastValue / 2);
        const newScore = score - lastValue + halved;
        if (newScore <= ctx.rules.scoring.bustThreshold) {
          return { busted: false, effectiveScore: newScore };
        }
        return null;
      };
      break;
    }
    case 'ignore_card_on_bust': {
      const prevModifyBust = modifier.modifyBust;
      modifier.modifyBust = (hand: Hand, score: number, ctx: ModifierContext) => {
        if (prevModifyBust) {
          const prev = prevModifyBust(hand, score, ctx);
          if (prev && !prev.busted) return prev;
        }
        // Remove highest non-ace card value
        const cards = hand.cards;
        let highestNonAceValue = 0;
        for (const card of cards) {
          if (card.rank === 'A') continue;
          const v = isFaceCard(card.rank) ? ctx.rules.scoring.faceCardValue : parseInt(card.rank, 10);
          if (v > highestNonAceValue) highestNonAceValue = v;
        }
        const newScore = score - highestNonAceValue;
        if (newScore <= ctx.rules.scoring.bustThreshold) {
          return { busted: false, effectiveScore: newScore };
        }
        return null;
      };
      break;
    }
    case 'five_card_charlie': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        if (ctx.playerHand.cards.length >= 5 && !ctx.playerScore.busted) return base + value;
        return base;
      };
      break;
    }
    case 'soft_hand_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        if (ctx.playerScore.soft) return base + value;
        return base;
      };
      break;
    }
    case 'exact_target_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        if (ctx.playerScore.value === ctx.rules.scoring.bustThreshold) return base + value;
        return base;
      };
      break;
    }

    // ── Player Actions ──
    case 'enable_remove_card': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.canRemoveCard = true;
        r.actions.cardRemovesPerHand = value;
        return r;
      };
      break;
    }
    case 'enable_peek': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.canPeek = true;
        return r;
      };
      break;
    }
    case 'enable_surrender': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.canSurrender = true;
        return r;
      };
      break;
    }
    case 'enable_split': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.canSplit = true;
        return r;
      };
      break;
    }
    case 'extra_starting_cards': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.turnOrder.initialPlayerCards += value;
        return r;
      };
      break;
    }
    case 'fewer_starting_cards': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.turnOrder.initialPlayerCards = Math.max(1, r.turnOrder.initialPlayerCards - value);
        return r;
      };
      break;
    }
    case 'double_down_any_time': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.canDoubleDownAnyTime = true;
        return r;
      };
      break;
    }
    case 'hit_after_double': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.canHitAfterDouble = true;
        return r;
      };
      break;
    }

    // ── Dealer Manipulation ──
    case 'dealer_stands_on': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.dealer.standsOn = value;
        return r;
      };
      break;
    }
    case 'dealer_hits_soft_17': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.dealer.standsOnSoft17 = false;
        return r;
      };
      break;
    }
    case 'ties_favor_player': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.winConditions.tieResolution = 'player';
        return r;
      };
      break;
    }
    case 'double_bust_favors_player': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.winConditions.doubleBustResolution = 'player';
        return r;
      };
      break;
    }
    case 'dealer_reveals_cards': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.dealer.peeksForBlackjack = true;
        return r;
      };
      break;
    }
    case 'dealer_extra_starting_card': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.turnOrder.initialDealerCards += value;
        return r;
      };
      break;
    }
    case 'dealer_fewer_starting_cards': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.turnOrder.initialDealerCards = Math.max(1, r.turnOrder.initialDealerCards - value);
        return r;
      };
      break;
    }

    // ── Damage Bonuses ──
    case 'flat_damage_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return base + value;
      };
      break;
    }
    case 'percent_damage_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return Math.floor(base * (1 + value));
      };
      break;
    }
    case 'damage_multiplier': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return Math.floor(base * value);
      };
      break;
    }
    case 'suit_damage_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => c.suit === effect.suit).length;
        return base + count * value;
      };
      break;
    }
    case 'face_card_damage_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => isFaceCard(c.rank)).length;
        return base + count * value;
      };
      break;
    }
    case 'ace_damage_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => c.rank === 'A').length;
        return base + count * value;
      };
      break;
    }
    case 'even_card_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => isEvenRank(c.rank)).length;
        return base + count * value;
      };
      break;
    }
    case 'odd_card_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => isOddRank(c.rank)).length;
        return base + count * value;
      };
      break;
    }
    case 'low_card_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => isLowRank(c.rank)).length;
        return base + count * value;
      };
      break;
    }
    case 'high_card_bonus': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => isHighRank(c.rank)).length;
        return base + count * value;
      };
      break;
    }
    case 'blackjack_bonus_damage': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        if (ctx.playerScore.isBlackjack) return base + value;
        return base;
      };
      break;
    }
    case 'blackjack_damage_multiplier': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        if (ctx.playerScore.isBlackjack) return Math.floor(base * value);
        return base;
      };
      break;
    }
    case 'damage_on_push': {
      const prevOnPush = modifier.onPush;
      modifier.onPush = (ctx: ModifierContext): void => {
        if (prevOnPush) prevOnPush(ctx);
        if (!shouldApply(ctx)) return;
        ctx.enemyState.hp = Math.max(0, ctx.enemyState.hp - value);
      };
      break;
    }
    case 'damage_per_card_in_hand': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return base + ctx.playerHand.cards.length * value;
      };
      break;
    }
    case 'overkill_carry': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.damage.overkillCarryPercent = value;
        return r;
      };
      break;
    }
    case 'scaling_damage_per_win': {
      const prevDmg = modifier.modifyDamageDealt;
      modifier.modifyDamageDealt = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmg ? prevDmg(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return base + ctx.handsWonThisBattle * value;
      };
      break;
    }
    case 'double_down_multiplier': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.actions.doubleDownMultiplier = value;
        return r;
      };
      break;
    }

    // ── Damage Reduction & Defense ──
    case 'flat_damage_reduction': {
      const prevDmgRecv = modifier.modifyDamageReceived;
      modifier.modifyDamageReceived = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmgRecv ? prevDmgRecv(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return Math.max(0, base - value);
      };
      break;
    }
    case 'percent_damage_reduction': {
      const prevDmgRecv = modifier.modifyDamageReceived;
      modifier.modifyDamageReceived = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmgRecv ? prevDmgRecv(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        return Math.floor(base * (1 - value));
      };
      break;
    }
    case 'dodge_chance': {
      const prevDodge = modifier.dodgeCheck;
      modifier.dodgeCheck = (ctx: ModifierContext): boolean => {
        if (prevDodge && prevDodge(ctx)) return true;
        return ctx.rng.next() < value;
      };
      break;
    }
    case 'thorns': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.damage.thornsPercent = value;
        return r;
      };
      break;
    }
    case 'damage_shield': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.damage.damageShield = value;
        return r;
      };
      break;
    }
    case 'damage_cap': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.damage.damageCap = value;
        return r;
      };
      break;
    }
    case 'suit_damage_reduction': {
      const prevDmgRecv = modifier.modifyDamageReceived;
      modifier.modifyDamageReceived = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmgRecv ? prevDmgRecv(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        const count = ctx.playerHand.cards.filter(c => c.suit === effect.suit).length;
        if (count >= 2) return Math.floor(base * (1 - value));
        return base;
      };
      break;
    }
    case 'reduce_bust_damage': {
      const prevDmgRecv = modifier.modifyDamageReceived;
      modifier.modifyDamageReceived = (damage: number, ctx: ModifierContext): number => {
        const base = prevDmgRecv ? prevDmgRecv(damage, ctx) : damage;
        if (!shouldApply(ctx)) return base;
        if (ctx.playerScore.busted) return Math.floor(base * (1 - value));
        return base;
      };
      break;
    }

    // ── Healing ──
    case 'max_hp_bonus': {
      let applied = false;
      const prevOnBattleStart = modifier.onBattleStart;
      modifier.onBattleStart = (ctx: ModifierContext): void => {
        if (prevOnBattleStart) prevOnBattleStart(ctx);
        if (!applied) {
          ctx.playerState.maxHp += value;
          ctx.playerState.hp += value;
          applied = true;
        }
      };
      break;
    }
    case 'heal_per_hand': {
      const prevOnHandStart = modifier.onHandStart;
      modifier.onHandStart = (ctx: ModifierContext): void => {
        if (prevOnHandStart) prevOnHandStart(ctx);
        ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
      };
      break;
    }
    case 'heal_on_win': {
      const prevOnHandEnd = modifier.onHandEnd;
      modifier.onHandEnd = (ctx: ModifierContext): void => {
        if (prevOnHandEnd) prevOnHandEnd(ctx);
        if (!ctx.playerScore.busted && (ctx.dealerScore.busted || ctx.playerScore.value > ctx.dealerScore.value)) {
          ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
        }
      };
      break;
    }
    case 'heal_on_blackjack': {
      const prevOnHandEnd = modifier.onHandEnd;
      modifier.onHandEnd = (ctx: ModifierContext): void => {
        if (prevOnHandEnd) prevOnHandEnd(ctx);
        if (ctx.playerScore.isBlackjack) {
          ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
        }
      };
      break;
    }
    case 'heal_on_dodge': {
      const prevOnDodge = modifier.onDodge;
      modifier.onDodge = (ctx: ModifierContext): void => {
        if (prevOnDodge) prevOnDodge(ctx);
        ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
      };
      break;
    }
    case 'lifesteal': {
      const prevOnHandEnd = modifier.onHandEnd;
      modifier.onHandEnd = (ctx: ModifierContext): void => {
        if (prevOnHandEnd) prevOnHandEnd(ctx);
        if (ctx.lastDamageDealt > 0) {
          const heal = Math.floor(ctx.lastDamageDealt * value);
          ctx.playerState.hp = Math.min(ctx.playerState.hp + heal, ctx.playerState.maxHp);
        }
      };
      break;
    }
    case 'heal_per_battle': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.health.healthRegenPerBattle += value;
        return r;
      };
      break;
    }
    case 'heal_on_push': {
      const prevOnPush = modifier.onPush;
      modifier.onPush = (ctx: ModifierContext): void => {
        if (prevOnPush) prevOnPush(ctx);
        ctx.playerState.hp = Math.min(ctx.playerState.hp + value, ctx.playerState.maxHp);
      };
      break;
    }

    // ── Damage Over Time / Passive ──
    case 'damage_per_hand': {
      const prevOnHandStart = modifier.onHandStart;
      modifier.onHandStart = (ctx: ModifierContext): void => {
        if (prevOnHandStart) prevOnHandStart(ctx);
        if (!shouldApply(ctx)) return;
        ctx.enemyState.hp = Math.max(0, ctx.enemyState.hp - value);
      };
      break;
    }
    case 'poison': {
      let poisonCounter = 0;
      const prevOnHandStart = modifier.onHandStart;
      modifier.onHandStart = (ctx: ModifierContext): void => {
        if (prevOnHandStart) prevOnHandStart(ctx);
        if (!shouldApply(ctx)) return;
        const damage = value + poisonCounter;
        ctx.enemyState.hp = Math.max(0, ctx.enemyState.hp - damage);
        poisonCounter++;
      };
      break;
    }
    case 'damage_on_enemy_bust': {
      const prevOnEnemyBust = modifier.onEnemyBust;
      modifier.onEnemyBust = (ctx: ModifierContext): void => {
        if (prevOnEnemyBust) prevOnEnemyBust(ctx);
        if (!shouldApply(ctx)) return;
        ctx.enemyState.hp = Math.max(0, ctx.enemyState.hp - value);
      };
      break;
    }

    // ── Economy ──
    case 'flat_gold_bonus': {
      const prevGold = modifier.modifyGoldEarned;
      modifier.modifyGoldEarned = (gold: number, ctx: ModifierContext): number => {
        const base = prevGold ? prevGold(gold, ctx) : gold;
        if (!shouldApply(ctx)) return base;
        return base + value;
      };
      break;
    }
    case 'percent_gold_bonus': {
      const prevGold = modifier.modifyGoldEarned;
      modifier.modifyGoldEarned = (gold: number, ctx: ModifierContext): number => {
        const base = prevGold ? prevGold(gold, ctx) : gold;
        if (!shouldApply(ctx)) return base;
        return Math.floor(base * (1 + value));
      };
      break;
    }
    case 'gold_per_hand_won': {
      const prevGold = modifier.modifyGoldEarned;
      modifier.modifyGoldEarned = (gold: number, ctx: ModifierContext): number => {
        const base = prevGold ? prevGold(gold, ctx) : gold;
        if (!shouldApply(ctx)) return base;
        return base + ctx.handsWonThisBattle * value;
      };
      break;
    }
    case 'gold_per_blackjack': {
      let bjCount = 0;
      const prevOnHandEnd = modifier.onHandEnd;
      modifier.onHandEnd = (ctx: ModifierContext): void => {
        if (prevOnHandEnd) prevOnHandEnd(ctx);
        if (ctx.playerScore.isBlackjack) bjCount++;
      };
      const prevGold = modifier.modifyGoldEarned;
      modifier.modifyGoldEarned = (gold: number, ctx: ModifierContext): number => {
        const base = prevGold ? prevGold(gold, ctx) : gold;
        const bonus = bjCount * value;
        bjCount = 0; // Reset after gold collection
        return base + bonus;
      };
      break;
    }
    case 'shop_discount': {
      const prevModifyRules = modifier.modifyRules;
      modifier.modifyRules = (rules: GameRules): GameRules => {
        const r = prevModifyRules ? prevModifyRules(rules) : rules;
        r.economy.shopPriceMultiplier *= (1 - value);
        return r;
      };
      break;
    }
  }
}
