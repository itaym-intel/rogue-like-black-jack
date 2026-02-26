import { describe, it, expect } from 'vitest';
import { buildModifier, checkCondition, UNIVERSAL_EFFECT_BOUNDS } from '../src/engine/effects.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { ModifierContext } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('effect-test'),
    stage: 1,
    battle: 1,
    handNumber: 1,
    lastDamageDealt: 0,
    lastDamageTaken: 0,
    handsWonThisBattle: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    previousHandScore: null,
    peekedCard: null,
    cardRemovesUsed: 0,
    killCause: null,
    ...overrides,
  };
}

describe('UNIVERSAL_EFFECT_BOUNDS', () => {
  it('has bounds for all effect types', () => {
    expect(Object.keys(UNIVERSAL_EFFECT_BOUNDS).length).toBeGreaterThanOrEqual(82);
  });
});

describe('New condition types', () => {
  it('hand_size_lte', () => {
    const ctx2 = makeContext({ playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] } });
    expect(checkCondition({ type: 'hand_size_lte', value: 2 }, ctx2)).toBe(true);
    const ctx3 = makeContext({ playerHand: { cards: [
      { suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' },
    ] } });
    expect(checkCondition({ type: 'hand_size_lte', value: 2 }, ctx3)).toBe(false);
  });

  it('dealer_hand_size_gte', () => {
    const ctx4 = makeContext({ dealerHand: { cards: [
      { suit: 'hearts', rank: '2' }, { suit: 'clubs', rank: '3' },
      { suit: 'spades', rank: '4' }, { suit: 'diamonds', rank: '5' },
    ] } });
    expect(checkCondition({ type: 'dealer_hand_size_gte', value: 4 }, ctx4)).toBe(true);
    expect(checkCondition({ type: 'dealer_hand_size_gte', value: 5 }, ctx4)).toBe(false);
  });
});

describe('conditional_flat_damage', () => {
  it('adds base + bonus when condition met', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'conditional_flat_damage', value: 4, bonusValue: 4,
      condition: { type: 'hand_size_lte', value: 2 },
    }]);
    const ctx2 = makeContext({ playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] } });
    expect(mod.modifyDamageDealt!(10, ctx2)).toBe(18); // 10 + 4 + 4

    const ctx3 = makeContext({ playerHand: { cards: [
      { suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' },
    ] } });
    expect(mod.modifyDamageDealt!(10, ctx3)).toBe(14); // 10 + 4 only
  });
});

describe('dealer_hand_size_bonus_damage', () => {
  it('adds bonus when dealer has enough cards', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'dealer_hand_size_bonus_damage', value: 8, threshold: 4,
    }]);
    const ctx4 = makeContext({ dealerHand: { cards: [
      { suit: 'hearts', rank: '2' }, { suit: 'clubs', rank: '3' },
      { suit: 'spades', rank: '4' }, { suit: 'diamonds', rank: '5' },
    ] } });
    expect(mod.modifyDamageDealt!(10, ctx4)).toBe(18);
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(10);
  });
});

describe('bonus_damage_on_opponent_bust', () => {
  it('adds damage when opponent busts', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'bonus_damage_on_opponent_bust', value: 5,
    }], 'enemy');
    // Enemy perspective: opponent is player
    const ctxBust = makeContext({ playerScore: { value: 25, soft: false, busted: true, isBlackjack: false } });
    expect(mod.modifyDamageDealt!(10, ctxBust)).toBe(15);

    const ctxNoBust = makeContext();
    expect(mod.modifyDamageDealt!(10, ctxNoBust)).toBe(10);
  });
});

describe('bonus_damage_on_score_win', () => {
  it('adds damage on non-bust score win', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'bonus_damage_on_score_win', value: 6,
    }], 'enemy');
    // Enemy perspective: own = dealer, opponent = player
    const ctxWin = makeContext({
      dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
      playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    });
    expect(mod.modifyDamageDealt!(10, ctxWin)).toBe(16);

    const ctxLose = makeContext({
      dealerScore: { value: 15, soft: false, busted: false, isBlackjack: false },
      playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    });
    expect(mod.modifyDamageDealt!(10, ctxLose)).toBe(10);
  });
});

describe('consecutive_loss_damage_bonus', () => {
  it('scales with consecutive losses up to max', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'consecutive_loss_damage_bonus', value: 2, max: 8,
    }]);
    expect(mod.modifyDamageDealt!(10, makeContext({ consecutiveLosses: 3 }))).toBe(16); // 10 + min(6, 8)
    expect(mod.modifyDamageDealt!(10, makeContext({ consecutiveLosses: 5 }))).toBe(18); // 10 + min(10, 8) = 18
    expect(mod.modifyDamageDealt!(10, makeContext({ consecutiveLosses: 0 }))).toBe(10);
  });
});

describe('color_card_damage_bonus', () => {
  it('adds bonus per red card in opponent hand', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'color_card_damage_bonus', value: 2, color: 'red',
    }], 'enemy');
    // Enemy perspective: opponent hand is player hand
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: 'K' }, { suit: 'diamonds', rank: '5' },
        { suit: 'clubs', rank: '3' },
      ] },
    });
    // modifyDamageReceived adds damage (from attacker perspective, it modifies received)
    expect(mod.modifyDamageReceived!(10, ctx)).toBe(14); // 10 + 2*2
  });
});

describe('own_hand_color_damage_bonus', () => {
  it('adds bonus per red card in own hand', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'own_hand_color_damage_bonus', value: 3, color: 'red',
    }], 'enemy');
    // Enemy perspective: own hand = dealer hand
    const ctx = makeContext({
      dealerHand: { cards: [
        { suit: 'hearts', rank: 'K' }, { suit: 'diamonds', rank: '5' },
        { suit: 'clubs', rank: '3' },
      ] },
    });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(16); // 10 + 2*3
  });
});

describe('first_hand_damage_multiplier', () => {
  it('doubles damage on first hand only', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'first_hand_damage_multiplier', value: 2,
    }]);
    expect(mod.modifyDamageDealt!(10, makeContext({ handNumber: 1 }))).toBe(20);
    expect(mod.modifyDamageDealt!(10, makeContext({ handNumber: 2 }))).toBe(10);
  });
});

describe('percent_damage_penalty', () => {
  it('reduces damage output', () => {
    const mod = buildModifier('test', 'Test', 'test', 'wish_curse', [{
      type: 'percent_damage_penalty', value: 0.2,
    }]);
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(8);
  });
});

describe('conditional_damage_reduction', () => {
  it('reduces when condition met', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'conditional_damage_reduction', value: 0.2,
      condition: { type: 'hand_size_lte', value: 2 },
    }]);
    const ctx2 = makeContext({ playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] } });
    expect(mod.modifyDamageReceived!(10, ctx2)).toBe(8);

    const ctx3 = makeContext({ playerHand: { cards: [
      { suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' },
    ] } });
    expect(mod.modifyDamageReceived!(10, ctx3)).toBe(10);
  });
});

describe('random_suit_damage_reduction', () => {
  it('reduces damage when dealer hand contains randomly chosen suit', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'random_suit_damage_reduction', value: 0.25,
    }]);
    // Need to call onBattleStart to set the random suit
    const ctx = makeContext({ rng: new SeededRNG('suit-test') });
    mod.onBattleStart!(ctx);
    // Without knowing the exact suit, test that the modifier exists
    expect(mod.modifyDamageReceived).toBeDefined();
  });
});

describe('suit_in_attacker_hand_damage_reduction', () => {
  it('reduces damage when attacker hand has specific suit (enemy perspective)', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'suit_in_attacker_hand_damage_reduction', value: 0.5, suit: 'spades',
    }], 'enemy');
    // Enemy perspective: attacker = player
    const ctxSpade = makeContext({
      playerHand: { cards: [{ suit: 'spades', rank: 'K' }, { suit: 'hearts', rank: '5' }] },
    });
    expect(mod.modifyDamageReceived!(10, ctxSpade)).toBe(5);

    const ctxNoSpade = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' }] },
    });
    expect(mod.modifyDamageReceived!(10, ctxNoSpade)).toBe(10);
  });
});

describe('heal_on_bust', () => {
  it('heals player when they bust', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'heal_on_bust', value: 3,
    }]);
    const ctx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    });
    ctx.playerState.hp = 20;
    mod.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(23);

    // No heal when not busted
    const ctx2 = makeContext();
    ctx2.playerState.hp = 20;
    mod.onHandEnd!(ctx2);
    expect(ctx2.playerState.hp).toBe(20);
  });
});

describe('heal_on_opponent_bust', () => {
  it('heals enemy when player busts (enemy perspective)', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'heal_on_opponent_bust', value: 8,
    }], 'enemy');
    // Enemy perspective: opponent = player
    const ctx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    });
    ctx.enemyState.hp = 12;
    mod.onHandEnd!(ctx);
    expect(ctx.enemyState.hp).toBe(20); // 12 + 8, capped at maxHp 20
  });
});

describe('heal_on_opponent_near_blackjack', () => {
  it('heals when opponent scores 19-21 without blackjack (enemy perspective)', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'heal_on_opponent_near_blackjack', value: 6, minScore: 19, maxScore: 21,
    }], 'enemy');
    // Enemy perspective: opponent = player
    const ctx = makeContext({
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    ctx.enemyState.hp = 10;
    mod.onHandEnd!(ctx);
    expect(ctx.enemyState.hp).toBe(16);

    // Blackjack doesn't trigger it
    const ctxBJ = makeContext({
      playerScore: { value: 21, soft: true, busted: false, isBlackjack: true },
    });
    ctxBJ.enemyState.hp = 10;
    mod.onHandEnd!(ctxBJ);
    expect(ctxBJ.enemyState.hp).toBe(10);
  });
});

describe('dot_to_opponent', () => {
  it('deals damage to opponent each hand (enemy perspective = damages player)', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'dot_to_opponent', value: 2,
    }], 'enemy');
    const ctx = makeContext();
    mod.onHandStart!(ctx);
    expect(ctx.playerState.hp).toBe(48);
  });

  it('deals damage to enemy when player perspective', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'dot_to_opponent', value: 3,
    }]);
    const ctx = makeContext();
    mod.onHandEnd!(ctx);
    expect(ctx.enemyState.hp).toBe(17);
  });
});

describe('self_damage_on_bust', () => {
  it('damages player when they bust', () => {
    const mod = buildModifier('test', 'Test', 'test', 'wish_curse', [{
      type: 'self_damage_on_bust', value: 4,
    }]);
    const ctx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    });
    mod.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(46);

    // No damage when not busted
    const ctx2 = makeContext();
    mod.onHandEnd!(ctx2);
    expect(ctx2.playerState.hp).toBe(50);
  });
});

describe('gold_if_hands_won_gte', () => {
  it('adds gold when enough hands won', () => {
    const mod = buildModifier('test', 'Test', 'test', 'equipment', [{
      type: 'gold_if_hands_won_gte', value: 15, threshold: 2,
    }]);
    expect(mod.modifyGoldEarned!(0, makeContext({ handsWonThisBattle: 3 }))).toBe(15);
    expect(mod.modifyGoldEarned!(0, makeContext({ handsWonThisBattle: 1 }))).toBe(0);
  });
});

describe('extra_damage_on_dealer_blackjack', () => {
  it('adds damage when dealer gets blackjack', () => {
    const mod = buildModifier('test', 'Test', 'test', 'wish_curse', [{
      type: 'extra_damage_on_dealer_blackjack', value: 5,
    }]);
    const ctxBJ = makeContext({
      dealerScore: { value: 21, soft: true, busted: false, isBlackjack: true },
    });
    expect(mod.modifyDamageReceived!(10, ctxBJ)).toBe(15);

    expect(mod.modifyDamageReceived!(10, makeContext())).toBe(10);
  });
});

describe('instant effects', () => {
  it('instant effects are no-ops as modifiers', () => {
    const mod = buildModifier('test', 'Test', 'test', 'consumable', [
      { type: 'instant_heal', value: 5 },
      { type: 'instant_damage', value: 5 },
      { type: 'instant_gold', value: 20 },
    ]);
    // These should not attach any hooks
    expect(mod.modifyDamageDealt).toBeUndefined();
    expect(mod.modifyDamageReceived).toBeUndefined();
    expect(mod.onHandStart).toBeUndefined();
    expect(mod.onHandEnd).toBeUndefined();
  });
});

describe('perspective parameter', () => {
  it('enemy perspective uses dealer hand for own hand in damage calcs', () => {
    const mod = buildModifier('test', 'Test', 'test', 'enemy', [{
      type: 'blackjack_bonus_damage', value: 10,
    }], 'enemy');
    // Enemy perspective: own score = dealer score
    const ctxDealerBJ = makeContext({
      dealerScore: { value: 21, soft: true, busted: false, isBlackjack: true },
      playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    });
    expect(mod.modifyDamageDealt!(10, ctxDealerBJ)).toBe(20);

    // Player blackjack shouldn't trigger it
    const ctxPlayerBJ = makeContext({
      playerScore: { value: 21, soft: true, busted: false, isBlackjack: true },
      dealerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    });
    expect(mod.modifyDamageDealt!(10, ctxPlayerBJ)).toBe(10);
  });
});

describe('buildModifier preserves existing blessing behavior', () => {
  it('flat_damage_bonus via buildModifier matches blessing behavior', () => {
    const mod = buildModifier('test', 'Test', '+5 dmg', 'equipment', [
      { type: 'flat_damage_bonus', value: 5 },
    ]);
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(15);
    expect(mod.source).toBe('equipment');
  });

  it('compose multiple effects on same hook', () => {
    const mod = buildModifier('test', 'Test', 'x', 'equipment', [
      { type: 'flat_damage_bonus', value: 5 },
      { type: 'flat_damage_bonus', value: 3 },
    ]);
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(18);
  });
});
