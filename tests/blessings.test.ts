import { describe, it, expect } from 'vitest';
import { validateBlessingDefinition, buildBlessingModifier, checkCondition } from '../src/engine/blessings.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { BlessingDefinition, BlessingEffect, ModifierContext, Card, Rank, Suit } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('bless-test'),
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

// ── Validation Tests ──

describe('validateBlessingDefinition', () => {
  it('clamps out-of-range damage value', () => {
    const def: BlessingDefinition = { name: 'X', description: 'x', effects: [{ type: 'flat_damage_bonus', value: 999 }] };
    const v = validateBlessingDefinition(def);
    expect(v.effects[0].value).toBe(25);
  });

  it('clamps low value up to minimum', () => {
    const def: BlessingDefinition = { name: 'X', description: 'x', effects: [{ type: 'flat_damage_bonus', value: -10 }] };
    const v = validateBlessingDefinition(def);
    expect(v.effects[0].value).toBe(1);
  });

  it('caps effects array at 3', () => {
    const def: BlessingDefinition = {
      name: 'X', description: 'x',
      effects: [
        { type: 'flat_damage_bonus', value: 5 },
        { type: 'heal_per_hand', value: 2 },
        { type: 'dodge_chance', value: 0.1 },
        { type: 'flat_gold_bonus', value: 5 },
      ],
    };
    const v = validateBlessingDefinition(def);
    expect(v.effects).toHaveLength(3);
  });

  it('adds fallback effect for empty array', () => {
    const def: BlessingDefinition = { name: 'X', description: 'x', effects: [] };
    const v = validateBlessingDefinition(def);
    expect(v.effects).toHaveLength(1);
    expect(v.effects[0].type).toBe('flat_damage_bonus');
    expect(v.effects[0].value).toBe(5);
  });

  it('corrects invalid rank to default', () => {
    const def: BlessingDefinition = {
      name: 'X', description: 'x',
      effects: [{ type: 'flexible_rank', value: 1, rank: 'Z' as any }],
    };
    const v = validateBlessingDefinition(def);
    expect(v.effects[0].rank).toBe('A');
  });

  it('corrects invalid suit to default', () => {
    const def: BlessingDefinition = {
      name: 'X', description: 'x',
      effects: [{ type: 'suit_damage_bonus', value: 3, suit: 'banana' as any }],
    };
    const v = validateBlessingDefinition(def);
    expect(v.effects[0].suit).toBe('hearts');
  });

  it('truncates name at 60 chars', () => {
    const def: BlessingDefinition = { name: 'A'.repeat(80), description: 'x', effects: [{ type: 'flat_damage_bonus', value: 5 }] };
    const v = validateBlessingDefinition(def);
    expect(v.name).toHaveLength(60);
  });

  it('truncates description at 60 chars', () => {
    const def: BlessingDefinition = { name: 'X', description: 'B'.repeat(80), effects: [{ type: 'flat_damage_bonus', value: 5 }] };
    const v = validateBlessingDefinition(def);
    expect(v.description).toHaveLength(60);
  });

  it('replaces unknown effect type with fallback', () => {
    const def: BlessingDefinition = { name: 'X', description: 'x', effects: [{ type: 'nonexistent' as any, value: 5 }] };
    const v = validateBlessingDefinition(def);
    expect(v.effects[0].type).toBe('flat_damage_bonus');
  });
});

// ── Basic Builder Tests ──

describe('buildBlessingModifier', () => {
  it('creates modifier with correct id and source', () => {
    const mod = buildBlessingModifier({ name: 'Fire Power', description: 'Burns', effects: [{ type: 'flat_damage_bonus', value: 5 }] });
    expect(mod.id).toBe('wish_blessing_fire_power');
    expect(mod.source).toBe('wish_blessing');
    expect(mod.name).toBe('Fire Power');
  });

  it('composes multiple effects on same hook', () => {
    const mod = buildBlessingModifier({
      name: 'Double Boost', description: 'x',
      effects: [
        { type: 'flat_damage_bonus', value: 5 },
        { type: 'flat_damage_bonus', value: 3 },
      ],
    });
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(18); // 10 + 5 + 3
  });
});

// ── Card & Deck Manipulation ──

describe('Card & Deck effects', () => {
  it('flexible_rank adds rank to flexibleRanks', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'flexible_rank', value: 1, rank: '10' }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.scoring.flexibleRanks).toContain('10');
  });

  it('remove_rank_from_deck removes all cards of rank', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'remove_rank_from_deck', value: 1, rank: '5' }] });
    const deck: Card[] = [
      { suit: 'hearts', rank: '5' }, { suit: 'clubs', rank: '5' },
      { suit: 'hearts', rank: 'K' }, { suit: 'clubs', rank: 'A' },
    ];
    const filtered = mod.modifyDeck!(deck, getDefaultRules());
    expect(filtered).toHaveLength(2);
    expect(filtered.every(c => c.rank !== '5')).toBe(true);
  });

  it('force_deck_ranks keeps only allowed ranks', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'force_deck_ranks', value: 1, ranks: ['K', 'A'] }] });
    const deck: Card[] = [
      { suit: 'hearts', rank: '5' }, { suit: 'hearts', rank: 'K' },
      { suit: 'clubs', rank: 'A' }, { suit: 'diamonds', rank: '2' },
    ];
    const filtered = mod.modifyDeck!(deck, getDefaultRules());
    expect(filtered).toHaveLength(2);
    expect(filtered.every(c => c.rank === 'K' || c.rank === 'A')).toBe(true);
  });

  it('extra_copies_of_rank adds copies', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'extra_copies_of_rank', value: 2, rank: 'A' }] });
    const deck: Card[] = [{ suit: 'hearts', rank: 'A' }];
    const result = mod.modifyDeck!(deck, getDefaultRules());
    // Original 1 + 2 copies * 4 suits = 9
    expect(result).toHaveLength(9);
  });

  it('change_face_card_value modifies rules', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'change_face_card_value', value: 12 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.scoring.faceCardValue).toBe(12);
  });

  it('rank_value_override sets override', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'rank_value_override', value: 0, rank: '5' }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.scoring.rankValueOverrides['5']).toBe(0);
  });

  it('no_reshuffle sets rule', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'no_reshuffle', value: 1 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.deck.reshuffleBetweenHands).toBe(false);
  });

  it('multiple_decks sets number', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'multiple_decks', value: 3 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.deck.numberOfDecks).toBe(3);
  });
});

// ── Scoring & Bust Manipulation ──

describe('Scoring & Bust effects', () => {
  it('bust_save returns effective score', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'bust_save', value: 15 }] });
    const result = mod.modifyBust!({ cards: [] }, 25, makeContext());
    expect(result).toEqual({ busted: false, effectiveScore: 15 });
  });

  it('bust_threshold_bonus increases threshold', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'bust_threshold_bonus', value: 2 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.scoring.bustThreshold).toBe(23);
  });

  it('additional_blackjack_value adds value', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'additional_blackjack_value', value: 22 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.scoring.additionalBlackjackValues).toContain(22);
  });

  it('bust_card_value_halved saves when halving works', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'bust_card_value_halved', value: 1 }] });
    // Hand: K(10) + Q(10) + 5 = 25, last card is 5, halved = 2, new score = 22 > 21, still bust
    const hand = { cards: [
      { suit: 'hearts' as Suit, rank: 'K' as Rank },
      { suit: 'hearts' as Suit, rank: 'Q' as Rank },
      { suit: 'hearts' as Suit, rank: '5' as Rank },
    ] };
    const result = mod.modifyBust!(hand, 25, makeContext());
    // 25 - 5 + 2 = 22 > 21 -> null (still bust)
    expect(result).toBeNull();

    // Hand: K(10) + 8 + 5 = 23, halved last = 2, 23-5+2=20 <= 21 -> saved
    const hand2 = { cards: [
      { suit: 'hearts' as Suit, rank: 'K' as Rank },
      { suit: 'hearts' as Suit, rank: '8' as Rank },
      { suit: 'hearts' as Suit, rank: '5' as Rank },
    ] };
    const result2 = mod.modifyBust!(hand2, 23, makeContext());
    expect(result2).toEqual({ busted: false, effectiveScore: 20 });
  });

  it('ignore_card_on_bust removes highest non-ace', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'ignore_card_on_bust', value: 1 }] });
    // Hand: K(10) + 5 + 8 = 23, remove highest non-ace (10) -> 13 <= 21 -> saved
    const hand = { cards: [
      { suit: 'hearts' as Suit, rank: 'K' as Rank },
      { suit: 'hearts' as Suit, rank: '5' as Rank },
      { suit: 'hearts' as Suit, rank: '8' as Rank },
    ] };
    const result = mod.modifyBust!(hand, 23, makeContext());
    expect(result).toEqual({ busted: false, effectiveScore: 13 });
  });

  it('five_card_charlie adds bonus with 5+ cards', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'five_card_charlie', value: 10 }] });
    const ctx5 = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '3' },
        { suit: 'hearts', rank: '4' }, { suit: 'hearts', rank: '2' },
        { suit: 'hearts', rank: '3' },
      ] },
      playerScore: { value: 14, soft: false, busted: false, isBlackjack: false },
    });
    expect(mod.modifyDamageDealt!(10, ctx5)).toBe(20);

    // 4 cards — no bonus
    const ctx4 = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '3' },
        { suit: 'hearts', rank: '4' }, { suit: 'hearts', rank: '2' },
      ] },
    });
    expect(mod.modifyDamageDealt!(10, ctx4)).toBe(10);
  });
});

// ── Player Actions ──

describe('Player Action effects', () => {
  it('enable_remove_card sets rules', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'enable_remove_card', value: 2 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.actions.canRemoveCard).toBe(true);
    expect(rules.actions.cardRemovesPerHand).toBe(2);
  });

  it('enable_peek sets rule', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'enable_peek', value: 1 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.actions.canPeek).toBe(true);
  });

  it('extra_starting_cards increases count', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'extra_starting_cards', value: 1 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.turnOrder.initialPlayerCards).toBe(3);
  });
});

// ── Dealer Manipulation ──

describe('Dealer effects', () => {
  it('dealer_stands_on sets value', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'dealer_stands_on', value: 15 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.dealer.standsOn).toBe(15);
  });

  it('ties_favor_player sets tieResolution', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'ties_favor_player', value: 1 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.winConditions.tieResolution).toBe('player');
  });

  it('dealer_hits_soft_17 sets standsOnSoft17 false', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'dealer_hits_soft_17', value: 1 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.dealer.standsOnSoft17).toBe(false);
  });
});

// ── Damage Tests ──

describe('Damage effects', () => {
  it('flat_damage_bonus adds value', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'flat_damage_bonus', value: 7 }] });
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(17);
  });

  it('suit_damage_bonus scales with suit count', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'suit_damage_bonus', value: 3, suit: 'hearts' }] });
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' },
        { suit: 'clubs', rank: '3' },
      ] },
    });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(16); // 10 + 2*3
  });

  it('face_card_damage_bonus scales with face cards', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'face_card_damage_bonus', value: 4 }] });
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: 'J' }, { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: '5' },
      ] },
    });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(18); // 10 + 2*4
  });

  it('even_card_bonus scales with even cards', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'even_card_bonus', value: 2 }] });
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: '2' }, { suit: 'hearts', rank: '4' },
        { suit: 'hearts', rank: '3' },
      ] },
    });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(14); // 10 + 2*2
  });

  it('blackjack_bonus_damage only applies on blackjack', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'blackjack_bonus_damage', value: 10 }] });
    const ctxBJ = makeContext({ playerScore: { value: 21, soft: true, busted: false, isBlackjack: true } });
    expect(mod.modifyDamageDealt!(10, ctxBJ)).toBe(20);

    const ctxNoBJ = makeContext({ playerScore: { value: 20, soft: false, busted: false, isBlackjack: false } });
    expect(mod.modifyDamageDealt!(10, ctxNoBJ)).toBe(10);
  });

  it('damage_on_push deals damage to enemy', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'damage_on_push', value: 5 }] });
    const ctx = makeContext();
    mod.onPush!(ctx);
    expect(ctx.enemyState.hp).toBe(15);
  });

  it('damage_per_card_in_hand scales with hand size', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'damage_per_card_in_hand', value: 2 }] });
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' },
        { suit: 'hearts', rank: '3' }, { suit: 'clubs', rank: '2' },
      ] },
    });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(18); // 10 + 4*2
  });

  it('scaling_damage_per_win scales with wins', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'scaling_damage_per_win', value: 3 }] });
    const ctx = makeContext({ handsWonThisBattle: 4 });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(22); // 10 + 4*3
  });
});

// ── Defense Tests ──

describe('Defense effects', () => {
  it('dodge_chance works over many iterations', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'dodge_chance', value: 0.2 }] });
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      const rng = new SeededRNG(`dodge-${i}`);
      if (mod.dodgeCheck!(makeContext({ rng }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(140);
    expect(dodges).toBeLessThan(260);
  });

  it('flat_damage_reduction reduces damage', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'flat_damage_reduction', value: 5 }] });
    expect(mod.modifyDamageReceived!(10, makeContext())).toBe(5);
    expect(mod.modifyDamageReceived!(3, makeContext())).toBe(0);
  });

  it('damage_cap sets rule', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'damage_cap', value: 10 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.damage.damageCap).toBe(10);
  });

  it('thorns sets rule', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'thorns', value: 0.3 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.damage.thornsPercent).toBe(0.3);
  });

  it('suit_damage_reduction reduces when 2+ suit cards present', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'suit_damage_reduction', value: 0.3, suit: 'spades' }] });
    const ctx2 = makeContext({
      playerHand: { cards: [
        { suit: 'spades', rank: 'K' }, { suit: 'spades', rank: '5' },
      ] },
    });
    expect(mod.modifyDamageReceived!(10, ctx2)).toBe(7);

    // Only 1 spade — no reduction
    const ctx1 = makeContext({
      playerHand: { cards: [
        { suit: 'spades', rank: 'K' }, { suit: 'hearts', rank: '5' },
      ] },
    });
    expect(mod.modifyDamageReceived!(10, ctx1)).toBe(10);
  });
});

// ── Healing Tests ──

describe('Healing effects', () => {
  it('heal_per_hand heals on hand start', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'heal_per_hand', value: 3 }] });
    const ctx = makeContext();
    ctx.playerState.hp = 40;
    mod.onHandStart!(ctx);
    expect(ctx.playerState.hp).toBe(43);
  });

  it('heal_on_win heals when player wins', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'heal_on_win', value: 5 }] });
    const ctxWin = makeContext({
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
      dealerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    });
    ctxWin.playerState.hp = 40;
    mod.onHandEnd!(ctxWin);
    expect(ctxWin.playerState.hp).toBe(45);

    // Loss — no heal
    const ctxLoss = makeContext({
      playerScore: { value: 15, soft: false, busted: false, isBlackjack: false },
      dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    ctxLoss.playerState.hp = 40;
    mod.onHandEnd!(ctxLoss);
    expect(ctxLoss.playerState.hp).toBe(40);
  });

  it('heal_on_blackjack heals on BJ', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'heal_on_blackjack', value: 8 }] });
    const ctx = makeContext({ playerScore: { value: 21, soft: true, busted: false, isBlackjack: true } });
    ctx.playerState.hp = 40;
    mod.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(48);
  });

  it('heal_on_dodge heals on dodge', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'heal_on_dodge', value: 5 }] });
    const ctx = makeContext();
    ctx.playerState.hp = 40;
    mod.onDodge!(ctx);
    expect(ctx.playerState.hp).toBe(45);
  });

  it('lifesteal heals % of damage dealt', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'lifesteal', value: 0.5 }] });
    const ctx = makeContext({ lastDamageDealt: 20 });
    ctx.playerState.hp = 40;
    mod.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(50); // 40 + floor(20*0.5)
  });

  it('max_hp_bonus increases maxHp once only', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'max_hp_bonus', value: 10 }] });
    const ctx = makeContext();
    mod.onBattleStart!(ctx);
    expect(ctx.playerState.maxHp).toBe(60);
    expect(ctx.playerState.hp).toBe(60);
    // Second call — no double
    mod.onBattleStart!(ctx);
    expect(ctx.playerState.maxHp).toBe(60);
  });

  it('heal does not exceed maxHp', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'heal_per_hand', value: 20 }] });
    const ctx = makeContext();
    ctx.playerState.hp = 48;
    mod.onHandStart!(ctx);
    expect(ctx.playerState.hp).toBe(50); // Capped at maxHp
  });
});

// ── DoT Tests ──

describe('DoT effects', () => {
  it('damage_per_hand deals damage to enemy', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'damage_per_hand', value: 3 }] });
    const ctx = makeContext();
    mod.onHandStart!(ctx);
    expect(ctx.enemyState.hp).toBe(17);
  });

  it('poison deals escalating damage', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'poison', value: 2 }] });
    const ctx = makeContext();
    ctx.enemyState.hp = 50;
    mod.onHandStart!(ctx); // 2
    expect(ctx.enemyState.hp).toBe(48);
    mod.onHandStart!(ctx); // 3
    expect(ctx.enemyState.hp).toBe(45);
    mod.onHandStart!(ctx); // 4
    expect(ctx.enemyState.hp).toBe(41);
  });

  it('damage_on_enemy_bust deals extra damage', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'damage_on_enemy_bust', value: 8 }] });
    const ctx = makeContext();
    mod.onEnemyBust!(ctx);
    expect(ctx.enemyState.hp).toBe(12);
  });
});

// ── Economy Tests ──

describe('Economy effects', () => {
  it('flat_gold_bonus adds value', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'flat_gold_bonus', value: 5 }] });
    expect(mod.modifyGoldEarned!(10, makeContext())).toBe(15);
  });

  it('shop_discount reduces shopPriceMultiplier', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'shop_discount', value: 0.2 }] });
    const rules = mod.modifyRules!(getDefaultRules());
    expect(rules.economy.shopPriceMultiplier).toBeCloseTo(0.8);
  });

  it('gold_per_hand_won scales with wins', () => {
    const mod = buildBlessingModifier({ name: 'X', description: 'x', effects: [{ type: 'gold_per_hand_won', value: 3 }] });
    expect(mod.modifyGoldEarned!(10, makeContext({ handsWonThisBattle: 5 }))).toBe(25);
  });
});

// ── Condition Tests ──

describe('checkCondition', () => {
  it('on_blackjack', () => {
    expect(checkCondition({ type: 'on_blackjack' }, makeContext({ playerScore: { value: 21, soft: true, busted: false, isBlackjack: true } }))).toBe(true);
    expect(checkCondition({ type: 'on_blackjack' }, makeContext())).toBe(false);
  });

  it('hand_contains_pair', () => {
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: 'K' }, { suit: 'clubs', rank: 'K' },
      ] },
    });
    expect(checkCondition({ type: 'hand_contains_pair' }, ctx)).toBe(true);
  });

  it('hand_is_flush', () => {
    const ctx = makeContext({
      playerHand: { cards: [
        { suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' }, { suit: 'hearts', rank: '3' },
      ] },
    });
    expect(checkCondition({ type: 'hand_is_flush' }, ctx)).toBe(true);
  });

  it('hp_below_percent', () => {
    const ctx = makeContext();
    ctx.playerState.hp = 20;
    expect(checkCondition({ type: 'hp_below_percent', value: 50 }, ctx)).toBe(true);
    ctx.playerState.hp = 30;
    expect(checkCondition({ type: 'hp_below_percent', value: 50 }, ctx)).toBe(false);
  });

  it('consecutive_wins', () => {
    expect(checkCondition({ type: 'consecutive_wins', value: 3 }, makeContext({ consecutiveWins: 3 }))).toBe(true);
    expect(checkCondition({ type: 'consecutive_wins', value: 3 }, makeContext({ consecutiveWins: 2 }))).toBe(false);
  });

  it('first_hand_of_battle', () => {
    expect(checkCondition({ type: 'first_hand_of_battle' }, makeContext({ handNumber: 1 }))).toBe(true);
    expect(checkCondition({ type: 'first_hand_of_battle' }, makeContext({ handNumber: 2 }))).toBe(false);
  });

  it('on_enemy_bust', () => {
    expect(checkCondition({ type: 'on_enemy_bust' }, makeContext({ dealerScore: { value: 25, soft: false, busted: true, isBlackjack: false } }))).toBe(true);
  });
});

// ── Conditional Effect Integration ──

describe('Conditional effects', () => {
  it('flat_damage_bonus with on_blackjack condition', () => {
    const mod = buildBlessingModifier({
      name: 'BJ Bonus', description: 'x',
      effects: [{ type: 'flat_damage_bonus', value: 10, condition: { type: 'on_blackjack' } }],
    });
    const ctxBJ = makeContext({ playerScore: { value: 21, soft: true, busted: false, isBlackjack: true } });
    expect(mod.modifyDamageDealt!(5, ctxBJ)).toBe(15);

    const ctxNoBJ = makeContext({ playerScore: { value: 20, soft: false, busted: false, isBlackjack: false } });
    expect(mod.modifyDamageDealt!(5, ctxNoBJ)).toBe(5);
  });

  it('heal_on_push with condition', () => {
    const mod = buildBlessingModifier({
      name: 'Push Heal', description: 'x',
      effects: [{ type: 'heal_on_push', value: 5 }],
    });
    const ctx = makeContext();
    ctx.playerState.hp = 40;
    mod.onPush!(ctx);
    expect(ctx.playerState.hp).toBe(45);
  });
});
