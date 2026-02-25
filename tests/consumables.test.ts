import { describe, it, expect } from 'vitest';
import { applyConsumable, tickActiveEffects, getAllConsumables, getConsumableByType } from '../src/engine/consumables.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { PlayerState, EnemyState, ModifierContext, ActiveEffect } from '../src/engine/types.js';

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

  it('getAllConsumables returns 10 items', () => {
    expect(getAllConsumables()).toHaveLength(10);
  });
});

// ── New Consumable Tests ──

describe('Elixir of Iron Skin', () => {
  it('applies 30% damage reduction for 2 hands', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('armor_elixir'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(2);
    expect(ps.activeEffects[0].modifier.modifyDamageReceived!(100, makeContext(ps, es))).toBe(70);
  });
});

describe("Sand Dancer's Brew", () => {
  it('applies 25% dodge for 1 hand', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('dodge_brew'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(1);
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      const ctx = makeContext(ps, es);
      ctx.rng = new SeededRNG(`dodge-brew-${i}`);
      if (ps.activeEffects[0].modifier.dodgeCheck!(ctx)) dodges++;
    }
    expect(dodges).toBeGreaterThan(180);
    expect(dodges).toBeLessThan(320);
  });
});

describe('Phoenix Draught', () => {
  it('heals 2 HP per hand for 3 hands', () => {
    const ps = makePlayerState({ hp: 30, maxHp: 50 });
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('regen_draught'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(3);
    const ctx = makeContext(ps, es);
    ps.activeEffects[0].modifier.onHandStart!(ctx);
    expect(ps.hp).toBe(32);
  });
});

describe('Battle Trance', () => {
  it('+40% damage dealt and −20% damage received for 2 hands', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('battle_trance'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(2);
    const mod = ps.activeEffects[0].modifier;
    expect(mod.modifyDamageDealt!(100, makeContext(ps, es))).toBe(140);
    expect(mod.modifyDamageReceived!(100, makeContext(ps, es))).toBe(80);
  });
});

describe("Fortune's Vessel", () => {
  it('instantly adds 20 gold', () => {
    const ps = makePlayerState({ gold: 10 });
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('fortune_vessel'), ps, es);
    expect(ps.gold).toBe(30);
    expect(ps.activeEffects).toHaveLength(0);
  });
});

describe('Wrath Elixir', () => {
  it('+80% damage for 1 hand', () => {
    const ps = makePlayerState();
    const es = makeEnemyState();
    applyConsumable(getConsumableByType('wrath_elixir'), ps, es);
    expect(ps.activeEffects).toHaveLength(1);
    expect(ps.activeEffects[0].remainingHands).toBe(1);
    expect(ps.activeEffects[0].modifier.modifyDamageDealt!(100, makeContext(ps, es))).toBe(180);
  });
});
