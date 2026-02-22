import { describe, it, expect } from 'vitest';
import { validateBlessingDefinition, buildBlessingModifier } from '../src/engine/blessings.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { ModifierContext, BlessingDefinition } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('blessing-test'),
    stage: 1,
    battle: 1,
    handNumber: 1,
    ...overrides,
  };
}

describe('validateBlessingDefinition', () => {
  it('clamps out-of-range values', () => {
    const def: BlessingDefinition = {
      name: 'Test',
      description: 'Test blessing',
      effects: [
        { type: 'flat_damage_bonus', value: 100 },
        { type: 'dodge_chance', value: 0.99 },
      ],
    };
    const validated = validateBlessingDefinition(def);
    expect(validated.effects[0].value).toBe(25);
    expect(validated.effects[1].value).toBe(0.35);
  });

  it('clamps values below minimum', () => {
    const def: BlessingDefinition = {
      name: 'Test',
      description: 'Test',
      effects: [{ type: 'flat_damage_bonus', value: -5 }],
    };
    const validated = validateBlessingDefinition(def);
    expect(validated.effects[0].value).toBe(1);
  });

  it('caps effects array at 3', () => {
    const def: BlessingDefinition = {
      name: 'Test',
      description: 'Test',
      effects: [
        { type: 'flat_damage_bonus', value: 5 },
        { type: 'dodge_chance', value: 0.1 },
        { type: 'heal_per_hand', value: 2 },
        { type: 'flat_gold_bonus', value: 10 },
      ],
    };
    const validated = validateBlessingDefinition(def);
    expect(validated.effects).toHaveLength(3);
  });

  it('adds fallback effect for empty array', () => {
    const def: BlessingDefinition = {
      name: 'Test',
      description: 'Test',
      effects: [],
    };
    const validated = validateBlessingDefinition(def);
    expect(validated.effects).toHaveLength(1);
    expect(validated.effects[0].type).toBe('flat_damage_bonus');
    expect(validated.effects[0].value).toBe(5);
  });

  it('truncates long names and descriptions', () => {
    const def: BlessingDefinition = {
      name: 'A'.repeat(100),
      description: 'B'.repeat(100),
      effects: [{ type: 'flat_damage_bonus', value: 5 }],
    };
    const validated = validateBlessingDefinition(def);
    expect(validated.name).toHaveLength(60);
    expect(validated.description).toHaveLength(60);
  });

  it('defaults suit to hearts for suit_damage_bonus with invalid suit', () => {
    const def: BlessingDefinition = {
      name: 'Test',
      description: 'Test',
      effects: [{ type: 'suit_damage_bonus', value: 3, suit: 'bananas' as any }],
    };
    const validated = validateBlessingDefinition(def);
    expect(validated.effects[0].suit).toBe('hearts');
  });
});

describe('buildBlessingModifier', () => {
  it('creates a modifier with correct id and source', () => {
    const def: BlessingDefinition = {
      name: 'Fire Power',
      description: 'Burns with fury',
      effects: [{ type: 'flat_damage_bonus', value: 5 }],
    };
    const mod = buildBlessingModifier(def);
    expect(mod.id).toBe('wish_blessing_fire_power');
    expect(mod.source).toBe('wish_blessing');
    expect(mod.name).toBe('Fire Power');
    expect(mod.description).toBe('Burns with fury');
  });

  it('flat_damage_bonus adds flat damage', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'flat_damage_bonus', value: 8 }],
    });
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(18);
  });

  it('percent_damage_bonus multiplies damage', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'percent_damage_bonus', value: 0.5 }],
    });
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(15);
  });

  it('flat_damage_reduction reduces incoming damage', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'flat_damage_reduction', value: 3 }],
    });
    expect(mod.modifyDamageReceived!(10, makeContext())).toBe(7);
  });

  it('flat_damage_reduction does not go below zero', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'flat_damage_reduction', value: 15 }],
    });
    expect(mod.modifyDamageReceived!(5, makeContext())).toBe(0);
  });

  it('percent_damage_reduction reduces by percentage', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'percent_damage_reduction', value: 0.25 }],
    });
    expect(mod.modifyDamageReceived!(20, makeContext())).toBe(15);
  });

  it('dodge_chance returns true at approximately correct rate', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'dodge_chance', value: 0.2 }],
    });
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      const rng = new SeededRNG(`dodge-test-${i}`);
      if (mod.dodgeCheck!(makeContext({ rng }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(140);
    expect(dodges).toBeLessThan(260);
  });

  it('bust_save returns effective score', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'bust_save', value: 12 }],
    });
    const result = mod.modifyBust!({ cards: [] }, 25, makeContext());
    expect(result).toEqual({ busted: false, effectiveScore: 12 });
  });

  it('bust_threshold_bonus increases bust threshold', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'bust_threshold_bonus', value: 2 }],
    });
    const rules = getDefaultRules();
    const modified = mod.modifyRules!(rules);
    expect(modified.scoring.bustThreshold).toBe(23);
  });

  it('heal_per_hand heals player on hand start', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'heal_per_hand', value: 3 }],
    });
    const ctx = makeContext();
    ctx.playerState.hp = 40;
    ctx.playerState.maxHp = 50;
    mod.onHandStart!(ctx);
    expect(ctx.playerState.hp).toBe(43);
  });

  it('heal_per_hand does not exceed maxHp', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'heal_per_hand', value: 5 }],
    });
    const ctx = makeContext();
    ctx.playerState.hp = 48;
    ctx.playerState.maxHp = 50;
    mod.onHandStart!(ctx);
    expect(ctx.playerState.hp).toBe(50);
  });

  it('damage_per_hand deals damage to enemy', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'damage_per_hand', value: 3 }],
    });
    const ctx = makeContext();
    ctx.enemyState.hp = 20;
    mod.onHandStart!(ctx);
    expect(ctx.enemyState.hp).toBe(17);
  });

  it('suit_damage_bonus increases damage per matching card', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'suit_damage_bonus', value: 3, suit: 'hearts' }],
    });
    const ctx = makeContext({
      playerHand: {
        cards: [
          { suit: 'hearts', rank: 'K' },
          { suit: 'hearts', rank: '5' },
          { suit: 'spades', rank: '3' },
        ],
      },
    });
    expect(mod.modifyDamageDealt!(10, ctx)).toBe(16); // 10 + 2*3
  });

  it('blackjack_bonus_damage adds damage only on blackjack', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'blackjack_bonus_damage', value: 10 }],
    });
    // Not blackjack
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(10);
    // Blackjack
    const bjCtx = makeContext({
      playerScore: { value: 21, soft: true, busted: false, isBlackjack: true },
    });
    expect(mod.modifyDamageDealt!(10, bjCtx)).toBe(20);
  });

  it('multiple effects on the same hook compose correctly', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [
        { type: 'flat_damage_bonus', value: 5 },
        { type: 'flat_damage_bonus', value: 3 },
      ],
    });
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(18); // 10 + 5 + 3
  });

  it('max_hp_bonus increases maxHp once via onBattleStart', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'max_hp_bonus', value: 10 }],
    });
    const ctx = makeContext();
    ctx.playerState.hp = 50;
    ctx.playerState.maxHp = 50;
    mod.onBattleStart!(ctx);
    expect(ctx.playerState.maxHp).toBe(60);
    expect(ctx.playerState.hp).toBe(60);
    // Second call does not double it
    mod.onBattleStart!(ctx);
    expect(ctx.playerState.maxHp).toBe(60);
    expect(ctx.playerState.hp).toBe(60);
  });

  it('heal_on_win heals only when player wins', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'heal_on_win', value: 5 }],
    });
    // Player wins (player 20, dealer busted)
    const winCtx = makeContext({
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
      dealerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    });
    winCtx.playerState.hp = 40;
    mod.onHandEnd!(winCtx);
    expect(winCtx.playerState.hp).toBe(45);

    // Player loses (player busted)
    const loseCtx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
      dealerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    });
    loseCtx.playerState.hp = 40;
    mod.onHandEnd!(loseCtx);
    expect(loseCtx.playerState.hp).toBe(40);
  });

  it('flat_gold_bonus adds gold', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'flat_gold_bonus', value: 10 }],
    });
    expect(mod.modifyGoldEarned!(20, makeContext())).toBe(30);
  });

  it('percent_gold_bonus multiplies gold', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'percent_gold_bonus', value: 0.5 }],
    });
    expect(mod.modifyGoldEarned!(20, makeContext())).toBe(30);
  });

  it('dealer_stands_on sets dealer stand value', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'dealer_stands_on', value: 15 }],
    });
    const rules = getDefaultRules();
    const modified = mod.modifyRules!(rules);
    expect(modified.dealer.standsOn).toBe(15);
  });

  it('double_down_multiplier sets multiplier', () => {
    const mod = buildBlessingModifier({
      name: 'Test', description: 'Test',
      effects: [{ type: 'double_down_multiplier', value: 3 }],
    });
    const rules = getDefaultRules();
    const modified = mod.modifyRules!(rules);
    expect(modified.actions.doubleDownMultiplier).toBe(3);
  });
});
