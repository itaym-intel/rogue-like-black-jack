import { describe, it, expect } from 'vitest';
import { getEquipmentById, getEquipmentBySlotAndTier, getAllEquipment } from '../src/engine/equipment.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { ModifierContext, HandScore } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('equip-test'),
    stage: 1,
    battle: 1,
    handNumber: 1,
    ...overrides,
  };
}

describe('Weapons', () => {
  it('Flint Spear adds 5 damage', () => {
    const spear = getEquipmentById('weapon_cloth');
    expect(spear.modifier.modifyDamageDealt!(10, makeContext())).toBe(15);
  });

  it('Bronze Saif adds 10 damage', () => {
    const saif = getEquipmentById('weapon_bronze');
    expect(saif.modifier.modifyDamageDealt!(10, makeContext())).toBe(20);
  });

  it('Iron Scimitar adds 25 damage', () => {
    const scimitar = getEquipmentById('weapon_iron');
    expect(scimitar.modifier.modifyDamageDealt!(10, makeContext())).toBe(35);
  });
});

describe('Helms', () => {
  it('Cloth Helm reduces bust damage by 30%', () => {
    const helm = getEquipmentById('helm_cloth');
    const ctx = makeContext({ playerScore: { value: 25, soft: false, busted: true, isBlackjack: false } });
    expect(helm.modifier.modifyDamageReceived!(10, ctx)).toBe(7);
  });

  it('Cloth Helm does NOT reduce non-bust damage', () => {
    const helm = getEquipmentById('helm_cloth');
    const ctx = makeContext({ playerScore: { value: 18, soft: false, busted: false, isBlackjack: false } });
    expect(helm.modifier.modifyDamageReceived!(10, ctx)).toBe(10);
  });

  it('Bronze Helm reduces bust damage by 50%', () => {
    const helm = getEquipmentById('helm_bronze');
    const ctx = makeContext({ playerScore: { value: 25, soft: false, busted: true, isBlackjack: false } });
    expect(helm.modifier.modifyDamageReceived!(10, ctx)).toBe(5);
  });

  it('Iron Helm reduces bust damage by 80%', () => {
    const helm = getEquipmentById('helm_iron');
    const ctx = makeContext({ playerScore: { value: 25, soft: false, busted: true, isBlackjack: false } });
    expect(helm.modifier.modifyDamageReceived!(10, ctx)).toBe(2);
  });
});

describe('Armors', () => {
  it('Cloth Armor reduces all damage by 20%', () => {
    const armor = getEquipmentById('armor_cloth');
    expect(armor.modifier.modifyDamageReceived!(10, makeContext())).toBe(8);
  });

  it('Bronze Armor reduces all damage by 40%', () => {
    const armor = getEquipmentById('armor_bronze');
    expect(armor.modifier.modifyDamageReceived!(10, makeContext())).toBe(6);
  });

  it('Iron Armor reduces all damage by 60%', () => {
    const armor = getEquipmentById('armor_iron');
    expect(armor.modifier.modifyDamageReceived!(10, makeContext())).toBe(4);
  });
});

describe('Boots', () => {
  it('Cloth Boots 10% dodge (deterministic)', () => {
    const boots = getEquipmentById('boots_cloth');
    // With a fixed RNG, we test that dodgeCheck uses rng.next()
    const rng = new SeededRNG('dodge-cloth');
    const ctx = makeContext({ rng });
    // Run multiple checks and verify the rate makes sense
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      const testRng = new SeededRNG(`dodge-cloth-${i}`);
      if (boots.modifier.dodgeCheck!(makeContext({ rng: testRng }))) dodges++;
    }
    // 10% dodge: expect roughly 100 dodges out of 1000 (allow wide margin)
    expect(dodges).toBeGreaterThan(50);
    expect(dodges).toBeLessThan(150);
  });

  it('Bronze Boots 25% dodge (deterministic)', () => {
    const boots = getEquipmentById('boots_bronze');
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      const testRng = new SeededRNG(`dodge-bronze-${i}`);
      if (boots.modifier.dodgeCheck!(makeContext({ rng: testRng }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(180);
    expect(dodges).toBeLessThan(320);
  });

  it('Iron Boots 40% dodge (deterministic)', () => {
    const boots = getEquipmentById('boots_iron');
    let dodges = 0;
    for (let i = 0; i < 1000; i++) {
      const testRng = new SeededRNG(`dodge-iron-${i}`);
      if (boots.modifier.dodgeCheck!(makeContext({ rng: testRng }))) dodges++;
    }
    expect(dodges).toBeGreaterThan(320);
    expect(dodges).toBeLessThan(480);
  });
});

describe('Trinkets', () => {
  it('Cloth Trinket adds 10 gold', () => {
    const trinket = getEquipmentById('trinket_cloth');
    expect(trinket.modifier.modifyGoldEarned!(10, makeContext())).toBe(20);
  });

  it('Iron Trinket converts bust to score of 10', () => {
    const trinket = getEquipmentById('trinket_iron');
    const result = trinket.modifier.modifyBust!(
      { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' }, { suit: 'hearts', rank: '9' }] },
      24,
      makeContext()
    );
    expect(result).toEqual({ busted: false, effectiveScore: 10 });
  });

  it('getAllEquipment returns 15 items', () => {
    expect(getAllEquipment()).toHaveLength(15);
  });
});
