import { describe, it, expect } from 'vitest';
import { getEnemiesForStage, getBossForStage } from '../src/engine/combatants.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { ModifierContext, HandScore } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] }, dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 50, isBoss: false, equipment: [], description: '' }, hp: 50 },
    rules: getDefaultRules(),
    rng: new SeededRNG('combatant-test'),
    stage: 1, battle: 1, handNumber: 1,
    ...overrides,
  };
}

describe('Stage 1 enemies', () => {
  const enemies = getEnemiesForStage(1);

  it('has 3 enemies', () => {
    expect(enemies).toHaveLength(3);
  });

  it('Vampire Bat: 50% damage reduction from spade hands', () => {
    const bat = enemies[0];
    expect(bat.name).toBe('Vampire Bat');
    const mod = bat.equipment[0].modifier;
    const ctxWithSpade = makeContext({
      playerHand: { cards: [{ suit: 'spades', rank: 'K' }, { suit: 'hearts', rank: '8' }] },
    });
    expect(mod.modifyDamageReceived!(10, ctxWithSpade)).toBe(5);
    const ctxNoSpade = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '8' }] },
    });
    expect(mod.modifyDamageReceived!(10, ctxNoSpade)).toBe(10);
  });

  it('Desert Jackal: +3 flat damage', () => {
    const jackal = enemies[2];
    expect(jackal.name).toBe('Desert Jackal');
    const mod = jackal.equipment[0].modifier;
    expect(mod.modifyDamageDealt!(10, makeContext())).toBe(13);
  });
});

describe('Stage 1 Boss: Ancient Strix', () => {
  const boss = getBossForStage(1);

  it('has correct stats', () => {
    expect(boss.name).toBe('Ancient Strix');
    expect(boss.maxHp).toBe(50);
    expect(boss.isBoss).toBe(true);
  });

  it('+10 damage on blackjack', () => {
    const weaponMod = boss.equipment[0].modifier;
    const ctx = makeContext({
      dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
    });
    expect(weaponMod.modifyDamageDealt!(10, ctx)).toBe(20);
  });

  it('+2 per red card in player hand', () => {
    const trinketMod = boss.equipment[1].modifier;
    const ctx = makeContext({
      playerHand: {
        cards: [
          { suit: 'hearts', rank: 'K' },
          { suit: 'diamonds', rank: '5' },
          { suit: 'spades', rank: '3' },
        ],
      },
    });
    expect(trinketMod.modifyDamageReceived!(10, ctx)).toBe(14); // 10 + 2*2
  });

  it('curse: +5 enemy damage on blackjack', () => {
    const curse = boss.curse!;
    const ctx = makeContext({
      dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
    });
    expect(curse.modifyDamageReceived!(10, ctx)).toBe(15);
  });
});

describe('Stage 2 enemies', () => {
  const enemies = getEnemiesForStage(2);

  it('Dust Wraith: 15% dodge', () => {
    const wraith = enemies[0];
    expect(wraith.name).toBe('Dust Wraith');
    const mod = wraith.equipment[0].modifier;
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      if (mod.dodgeCheck!(makeContext({ rng: new SeededRNG(`wraith-${i}`) }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(100);
    expect(dodges).toBeLessThan(200);
  });

  it('Tomb Guardian: 25% damage reduction', () => {
    const guardian = enemies[1];
    expect(guardian.name).toBe('Tomb Guardian');
    expect(guardian.equipment[0].modifier.modifyDamageReceived!(20, makeContext())).toBe(15);
  });

  it('Sand Serpent: +5 flat damage', () => {
    const serpent = enemies[2];
    expect(serpent.name).toBe('Sand Serpent');
    expect(serpent.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(15);
  });
});

describe('Stage 2 Boss: Djinn Warden', () => {
  const boss = getBossForStage(2);

  it('+8 flat damage', () => {
    expect(boss.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(18);
  });

  it('heals 10 on blackjack', () => {
    const es = { data: boss, hp: 50 };
    const ctx = makeContext({
      enemyState: es,
      dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
    });
    boss.equipment[1].modifier.onHandEnd!(ctx);
    expect(es.hp).toBe(60);
  });

  it('curse: 3 damage per hand to player', () => {
    const curse = boss.curse!;
    const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
    const ctx = makeContext({ playerState: ps as any });
    curse.onHandStart!(ctx);
    expect(ps.hp).toBe(47);
  });
});

describe('Stage 3 enemies', () => {
  const enemies = getEnemiesForStage(3);

  it('Obsidian Golem: 40% damage reduction', () => {
    expect(enemies[0].equipment[0].modifier.modifyDamageReceived!(20, makeContext())).toBe(12);
  });

  it('Shadow Assassin: +10 damage and 20% dodge', () => {
    const assassin = enemies[1];
    expect(assassin.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(20);
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      if (assassin.equipment[1].modifier.dodgeCheck!(makeContext({ rng: new SeededRNG(`sa-${i}`) }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(140);
    expect(dodges).toBeLessThan(260);
  });

  it('Fire Dancer: +3 per red card in dealer hand', () => {
    const dancer = enemies[2];
    const ctx = makeContext({
      dealerHand: {
        cards: [
          { suit: 'hearts', rank: 'K' },
          { suit: 'diamonds', rank: '5' },
          { suit: 'spades', rank: '3' },
        ],
      },
    });
    expect(dancer.equipment[0].modifier.modifyDamageDealt!(10, ctx)).toBe(16); // 10 + 2*3
  });
});

describe('Stage 3 Boss: Crimson Sultan', () => {
  const boss = getBossForStage(3);

  it('+15 flat damage', () => {
    expect(boss.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(25);
  });

  it('30% damage reduction', () => {
    expect(boss.equipment[1].modifier.modifyDamageReceived!(20, makeContext())).toBe(14);
  });

  it('5 damage on push', () => {
    const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
    const ctx = makeContext({
      playerState: ps as any,
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
      dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    boss.equipment[2].modifier.onHandEnd!(ctx);
    expect(ps.hp).toBe(45);
  });

  it('curse: ties favor dealer', () => {
    const curse = boss.curse!;
    const rules = getDefaultRules();
    const modified = curse.modifyRules!(rules);
    expect(modified.winConditions.tieResolution).toBe('dealer');
  });
});
