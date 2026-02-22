import { describe, it, expect } from 'vitest';
import { applyConsumable, tickActiveEffects, getAllConsumables, getConsumableByType } from '../src/engine/consumables.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { PlayerState, EnemyState, ModifierContext } from '../src/engine/types.js';

function makePlayerState(overrides?: Partial<PlayerState>): PlayerState {
  return {
    hp: 40, maxHp: 50, gold: 100,
    equipment: new Map(),
    consumables: [], wishes: [], activeEffects: [],
    ...overrides,
  };
}

function makeEnemyState(): EnemyState {
  return {
    data: { name: 'TestEnemy', maxHp: 20, isBoss: false, equipment: [], description: '' },
    hp: 20,
  };
}

function makeContext(ps: PlayerState, es: EnemyState): ModifierContext {
  return {
    playerHand: { cards: [] }, dealerHand: { cards: [] },
    playerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    playerState: ps, enemyState: es,
    rules: getDefaultRules(), rng: new SeededRNG('consumable-test'),
    stage: 1, battle: 1, handNumber: 1,
  };
}

describe('Health Potion', () => {
  it('heals 5 HP', () => {
    const ps = makePlayerState({ hp: 40 });
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('health_potion'), ps, es);
    expect(ps.hp).toBe(45);
  });

  it('does not exceed maxHp', () => {
    const ps = makePlayerState({ hp: 48, maxHp: 50 });
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('health_potion'), ps, es);
    expect(ps.hp).toBe(50);
  });
});

describe('Damage Potion', () => {
  it('deals 5 damage to enemy', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('damage_potion'), ps, es);
    expect(es.hp).toBe(15);
  });

  it('does not reduce enemy below 0', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    es.hp = 3;
    applyConsumable(getConsumableByType('damage_potion'), ps, es);
    expect(es.hp).toBe(0);
  });
});

describe('Strength Potion', () => {
  it('creates active effect lasting 1 hand', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('strength_potion'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(1);
  });

  it('modifier increases damage by 30%', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('strength_potion'), ps, es);
    const mod = ps.activeEffects[0].modifier;
    expect(mod.modifyDamageDealt!(10, makeContext(ps, es))).toBe(13);
  });

  it('effect expires after 1 hand tick', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('strength_potion'), ps, es);
    tickActiveEffects(ps, es, makeContext(ps, es));
    expect(ps.activeEffects).toHaveLength(0);
  });
});

describe('Poison Potion', () => {
  it('creates active effect lasting 3 hands', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('poison_potion'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(3);
  });

  it('deals 3 damage per hand tick', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('poison_potion'), ps, es);
    tickActiveEffects(ps, es, makeContext(ps, es));
    expect(es.hp).toBe(17);
  });

  it('expires after 3 ticks', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('poison_potion'), ps, es);
    for (let i = 0; i < 3; i++) {
      tickActiveEffects(ps, es, makeContext(ps, es));
    }
    expect(ps.activeEffects).toHaveLength(0);
    expect(es.hp).toBe(11); // 20 - 3*3 = 11
  });

  it('getAllConsumables returns 4 items', () => {
    expect(getAllConsumables()).toHaveLength(4);
  });
});
