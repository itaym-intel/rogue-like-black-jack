import { describe, it, expect } from 'vitest';
import { getDefaultRules, applyModifierPipeline, applyDamageModifiers } from '../src/engine/modifiers.js';
import type { Modifier, ModifierContext, GameRules, Hand, HandScore, PlayerState, EnemyState } from '../src/engine/types.js';
import { SeededRNG } from '../src/engine/rng.js';

function dummyContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('test'),
    stage: 1,
    battle: 1,
    handNumber: 1,
    ...overrides,
  };
}

describe('applyModifierPipeline', () => {
  it('single modifier applies correctly', () => {
    const mod: Modifier = {
      id: 'test', name: 'Test', description: '', source: 'equipment',
      modifyRules(rules) {
        return { ...rules, damage: { ...rules.damage, flatBonusDamage: 10 } };
      },
    };
    const rules = applyModifierPipeline([mod], getDefaultRules());
    expect(rules.damage.flatBonusDamage).toBe(10);
  });

  it('multiple modifiers chain in order', () => {
    const mod1: Modifier = {
      id: 'a', name: 'A', description: '', source: 'equipment',
      modifyRules(rules) {
        return { ...rules, damage: { ...rules.damage, flatBonusDamage: rules.damage.flatBonusDamage + 5 } };
      },
    };
    const mod2: Modifier = {
      id: 'b', name: 'B', description: '', source: 'equipment',
      modifyRules(rules) {
        return { ...rules, damage: { ...rules.damage, flatBonusDamage: rules.damage.flatBonusDamage * 2 } };
      },
    };
    const rules = applyModifierPipeline([mod1, mod2], getDefaultRules());
    expect(rules.damage.flatBonusDamage).toBe(10); // (0+5)*2
  });

  it('does not mutate the original rules', () => {
    const original = getDefaultRules();
    const mod: Modifier = {
      id: 'test', name: 'Test', description: '', source: 'equipment',
      modifyRules(rules) {
        return { ...rules, damage: { ...rules.damage, flatBonusDamage: 999 } };
      },
    };
    applyModifierPipeline([mod], original);
    expect(original.damage.flatBonusDamage).toBe(0);
  });
});

describe('applyDamageModifiers', () => {
  it('modifyDamageDealt stacking', () => {
    const mod1: Modifier = {
      id: 'a', name: 'Wpn1', description: '', source: 'equipment',
      modifyDamageDealt(d) { return d + 5; },
    };
    const mod2: Modifier = {
      id: 'b', name: 'Wpn2', description: '', source: 'equipment',
      modifyDamageDealt(d) { return d + 3; },
    };
    const { finalDamage } = applyDamageModifiers(10, [mod1, mod2], [], dummyContext());
    expect(finalDamage).toBe(18);
  });

  it('modifyDamageReceived stacking', () => {
    const mod1: Modifier = {
      id: 'a', name: 'Arm', description: '', source: 'equipment',
      modifyDamageReceived(d) { return Math.floor(d * 0.8); },
    };
    const { finalDamage } = applyDamageModifiers(10, [], [mod1], dummyContext());
    expect(finalDamage).toBe(8);
  });

  it('dodgeCheck works correctly', () => {
    const mod: Modifier = {
      id: 'dodge', name: 'Dodge', description: '', source: 'equipment',
      dodgeCheck() { return true; },
    };
    const { finalDamage, dodged } = applyDamageModifiers(10, [], [mod], dummyContext());
    expect(dodged).toBe(true);
    expect(finalDamage).toBe(0);
  });

  it('modifyGoldEarned stacking', () => {
    const mod1: Modifier = {
      id: 'a', name: 'G1', description: '', source: 'equipment',
      modifyGoldEarned(g) { return g + 10; },
    };
    const mod2: Modifier = {
      id: 'b', name: 'G2', description: '', source: 'equipment',
      modifyGoldEarned(g) { return g + 5; },
    };
    let gold = 10;
    for (const mod of [mod1, mod2]) {
      if (mod.modifyGoldEarned) gold = mod.modifyGoldEarned(gold, dummyContext());
    }
    expect(gold).toBe(25);
  });
});
