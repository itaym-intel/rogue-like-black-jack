import { describe, it, expect } from 'vitest';
import { getEnemiesForStage, getBossForStage, STAGE_POOLS, sampleEnemiesForStage } from '../src/engine/combatants.js';
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

describe('Stage 2 Boss: Murad the Brass Ifrit', () => {
  const boss = getBossForStage(2);

  it('has correct stats', () => {
    expect(boss.name).toBe('Murad the Brass Ifrit');
    expect(boss.maxHp).toBe(75);
    expect(boss.isBoss).toBe(true);
  });

  it('+8 flat damage', () => {
    expect(boss.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(18);
  });

  it('Brass Shackle: 20% damage reduction', () => {
    expect(boss.equipment[1].modifier.modifyDamageReceived!(20, makeContext())).toBe(16);
  });

  it('Sihr Amulet: heals 8 HP when player busts', () => {
    const es = { data: boss, hp: 50 };
    const ctx = makeContext({
      enemyState: es,
      playerScore: { value: 24, soft: false, busted: true, isBlackjack: false },
    });
    boss.equipment[2].modifier.onHandEnd!(ctx);
    expect(es.hp).toBe(58);
  });

  it('Sihr Amulet: does NOT heal when player does not bust', () => {
    const es = { data: boss, hp: 50 };
    const ctx = makeContext({
      enemyState: es,
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    boss.equipment[2].modifier.onHandEnd!(ctx);
    expect(es.hp).toBe(50);
  });

  it('curse: 4 damage to player on bust', () => {
    const curse = boss.curse!;
    const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
    const ctx = makeContext({
      playerState: ps as any,
      playerScore: { value: 24, soft: false, busted: true, isBlackjack: false },
    });
    curse.onHandEnd!(ctx);
    expect(ps.hp).toBe(46);
  });

  it('curse: does NOT fire when player wins', () => {
    const curse = boss.curse!;
    const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
    const ctx = makeContext({
      playerState: ps as any,
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    curse.onHandEnd!(ctx);
    expect(ps.hp).toBe(50);
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

describe('Stage 3 Boss: Zahhak the Mirror King', () => {
  const boss = getBossForStage(3);

  it('has correct stats', () => {
    expect(boss.name).toBe('Zahhak the Mirror King');
    expect(boss.maxHp).toBe(100);
    expect(boss.isBoss).toBe(true);
  });

  it('Serpent Fang: +12 base damage, +4 per face card', () => {
    const ctx = makeContext({
      playerHand: {
        cards: [
          { suit: 'hearts', rank: 'J' },
          { suit: 'spades', rank: 'K' },
          { suit: 'clubs', rank: '5' },
        ],
      },
    });
    expect(boss.equipment[0].modifier.modifyDamageDealt!(10, ctx)).toBe(30); // 10 + 12 + 2*4
  });

  it('Mirror Aegis: 35% damage reduction', () => {
    expect(boss.equipment[1].modifier.modifyDamageReceived!(20, makeContext())).toBe(13);
  });

  it('Crown of Stolen Souls: heals 6 HP on player score 19-21 without BJ', () => {
    const es = { data: boss, hp: 80 };
    const ctx = makeContext({
      enemyState: es,
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    boss.equipment[2].modifier.onHandEnd!(ctx);
    expect(es.hp).toBe(86);
  });

  it('Crown of Stolen Souls: does NOT heal on blackjack', () => {
    const es = { data: boss, hp: 80 };
    const ctx = makeContext({
      enemyState: es,
      playerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
    });
    boss.equipment[2].modifier.onHandEnd!(ctx);
    expect(es.hp).toBe(80);
  });

  it('curse: reduces player damage by 20%', () => {
    const curse = boss.curse!;
    expect(curse.modifyDamageDealt!(100, makeContext())).toBe(80);
  });
});

// ── Expanded Enemy Pool Tests ──

describe('expanded enemy pool', () => {
  it('stage 1 pool has 6 enemies', () => {
    expect(STAGE_POOLS[0]).toHaveLength(6);
  });
  it('stage 2 pool has 6 enemies', () => {
    expect(STAGE_POOLS[1]).toHaveLength(6);
  });
  it('stage 3 pool has 6 enemies', () => {
    expect(STAGE_POOLS[2]).toHaveLength(6);
  });
  it('getEnemiesForStage still returns first 3 for backward compat', () => {
    expect(getEnemiesForStage(1)).toHaveLength(3);
    expect(getEnemiesForStage(1)[0].name).toBe('Vampire Bat');
  });
  it('sampleEnemiesForStage returns 3 enemies', () => {
    const rng = new SeededRNG('pool-test');
    expect(sampleEnemiesForStage(1, rng)).toHaveLength(3);
  });
  it('sampleEnemiesForStage is deterministic', () => {
    const r1 = sampleEnemiesForStage(1, new SeededRNG('same-seed'));
    const r2 = sampleEnemiesForStage(1, new SeededRNG('same-seed'));
    expect(r1.map(e => e.name)).toEqual(r2.map(e => e.name));
  });
});

describe('Stage 1 new enemies', () => {
  it('Qarin: 20% dodge', () => {
    const qarin = STAGE_POOLS[0].find(e => e.name === 'Qarin')!;
    expect(qarin.maxHp).toBe(18);
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      if (qarin.equipment[0].modifier.dodgeCheck!(makeContext({ rng: new SeededRNG(`qarin-${i}`) }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(140);
    expect(dodges).toBeLessThan(260);
  });

  it('Roc Hatchling: +3 damage, +3 more with 3+ cards', () => {
    const roc = STAGE_POOLS[0].find(e => e.name === 'Roc Hatchling')!;
    expect(roc.maxHp).toBe(22);
    const ctx2cards = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] },
    });
    expect(roc.equipment[0].modifier.modifyDamageDealt!(10, ctx2cards)).toBe(13);
    const ctx3cards = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' }] },
    });
    expect(roc.equipment[0].modifier.modifyDamageDealt!(10, ctx3cards)).toBe(16);
  });

  it('Ghul: +5 damage when player busts', () => {
    const ghul = STAGE_POOLS[0].find(e => e.name === 'Ghul')!;
    expect(ghul.maxHp).toBe(25);
    const bustCtx = makeContext({ playerScore: { value: 25, soft: false, busted: true, isBlackjack: false } });
    expect(ghul.equipment[0].modifier.modifyDamageDealt!(10, bustCtx)).toBe(15);
    const noBustCtx = makeContext({ playerScore: { value: 20, soft: false, busted: false, isBlackjack: false } });
    expect(ghul.equipment[0].modifier.modifyDamageDealt!(10, noBustCtx)).toBe(10);
  });
});

describe('Stage 2 new enemies', () => {
  it('Salamander: +3 per red card in dealer hand', () => {
    const sal = STAGE_POOLS[1].find(e => e.name === 'Salamander')!;
    expect(sal.maxHp).toBe(22);
    const ctx = makeContext({
      dealerHand: { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'diamonds', rank: '5' }, { suit: 'spades', rank: '3' }] },
    });
    expect(sal.equipment[0].modifier.modifyDamageDealt!(10, ctx)).toBe(16); // 10 + 2*3
  });

  it('Brass Sentinel: 30% damage reduction', () => {
    const sentinel = STAGE_POOLS[1].find(e => e.name === 'Brass Sentinel')!;
    expect(sentinel.maxHp).toBe(30);
    expect(sentinel.equipment[0].modifier.modifyDamageReceived!(20, makeContext())).toBe(14);
  });

  it('Shadhavar: +4 damage and 2 damage DOT at hand start', () => {
    const shad = STAGE_POOLS[1].find(e => e.name === 'Shadhavar')!;
    expect(shad.maxHp).toBe(28);
    expect(shad.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(14);
    const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
    const ctx = makeContext({ playerState: ps as any });
    shad.equipment[1].modifier.onHandStart!(ctx);
    expect(ps.hp).toBe(48);
  });
});

describe('Stage 3 new enemies', () => {
  it('Palace Guard: +8 damage and 20% DR', () => {
    const guard = STAGE_POOLS[2].find(e => e.name === 'Palace Guard')!;
    expect(guard.maxHp).toBe(35);
    expect(guard.equipment[0].modifier.modifyDamageDealt!(10, makeContext())).toBe(18);
    expect(guard.equipment[1].modifier.modifyDamageReceived!(20, makeContext())).toBe(16);
  });

  it('Jinn Inquisitor: +6 damage when dealer wins without busting', () => {
    const jinn = STAGE_POOLS[2].find(e => e.name === 'Jinn Inquisitor')!;
    expect(jinn.maxHp).toBe(30);
    const winCtx = makeContext({
      playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
      dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    expect(jinn.equipment[0].modifier.modifyDamageDealt!(10, winCtx)).toBe(16);
    const bustCtx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
      dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    expect(jinn.equipment[0].modifier.modifyDamageDealt!(10, bustCtx)).toBe(10); // no bonus on bust
  });

  it('Cursed Vizier: +2 per consecutive loss, max +8', () => {
    const vizier = STAGE_POOLS[2].find(e => e.name === 'Cursed Vizier')!;
    expect(vizier.maxHp).toBe(38);
    const ctx3 = makeContext({ consecutiveLosses: 3 } as any);
    expect(vizier.equipment[0].modifier.modifyDamageDealt!(10, ctx3)).toBe(16); // 10 + min(6, 8)
    const ctx5 = makeContext({ consecutiveLosses: 5 } as any);
    expect(vizier.equipment[0].modifier.modifyDamageDealt!(10, ctx5)).toBe(18); // 10 + min(10, 8) = 18
  });
});
