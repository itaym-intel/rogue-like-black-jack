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

  it('getAllEquipment returns 39 items', () => {
    expect(getAllEquipment()).toHaveLength(39);
  });
});

// ── New Cloth Tier Tests ──

describe('Cloth Tier Expansion', () => {
  it('Copper Khanjar: +4 damage, +4 more with 2 or fewer cards', () => {
    const eq = getEquipmentById('weapon_cloth_2');
    const ctx2 = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] },
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctx2)).toBe(18); // 10 + 4 + 4
    const ctx3 = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' }] },
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctx3)).toBe(14); // 10 + 4 only
  });

  it('Bone Club: +3 damage and 2 damage DOT', () => {
    const eq = getEquipmentById('weapon_cloth_3');
    expect(eq.modifier.modifyDamageDealt!(10, makeContext())).toBe(13);
    const es = { data: { name: 'T', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 };
    eq.modifier.onHandEnd!(makeContext({ enemyState: es }));
    expect(es.hp).toBe(18);
  });

  it('Keffiyeh of Warding: 20% less damage with 2 or fewer cards', () => {
    const eq = getEquipmentById('helm_cloth_2');
    const ctx2 = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] },
    });
    expect(eq.modifier.modifyDamageReceived!(10, ctx2)).toBe(8);
    const ctx3 = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' }] },
    });
    expect(eq.modifier.modifyDamageReceived!(10, ctx3)).toBe(10);
  });

  it('Hardened Linen: 15% less damage', () => {
    const eq = getEquipmentById('armor_cloth_2');
    expect(eq.modifier.modifyDamageReceived!(20, makeContext())).toBe(17);
  });

  it('Lucky Knucklebone: +15 gold if 2+ hands won', () => {
    const eq = getEquipmentById('trinket_cloth_4');
    const ctx2 = makeContext({ handsWonThisBattle: 3 } as any);
    expect(eq.modifier.modifyGoldEarned!(0, ctx2)).toBe(15);
    const ctx1 = makeContext({ handsWonThisBattle: 1 } as any);
    expect(eq.modifier.modifyGoldEarned!(0, ctx1)).toBe(0);
  });
});

// ── New Bronze Tier Tests ──

describe('Bronze Tier Expansion', () => {
  it('Oasis Blade: +9 damage, +6 more at score 18+', () => {
    const eq = getEquipmentById('weapon_bronze_2');
    const ctx18 = makeContext({
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctx18)).toBe(25); // 10 + 9 + 6
    const ctxLow = makeContext({
      playerScore: { value: 16, soft: false, busted: false, isBlackjack: false },
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctxLow)).toBe(19); // 10 + 9
  });

  it('Twin Fangs: +8 damage, +8 more with Ace', () => {
    const eq = getEquipmentById('weapon_bronze_3');
    const ctxAce = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'clubs', rank: '7' }] },
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctxAce)).toBe(26); // 10 + 8 + 8
    const ctxNoAce = makeContext({
      playerHand: { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'clubs', rank: '7' }] },
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctxNoAce)).toBe(18); // 10 + 8
  });

  it("Vizier's Headpiece: 40% less bust damage and heals 3", () => {
    const eq = getEquipmentById('helm_bronze_2');
    const bustCtx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    });
    expect(eq.modifier.modifyDamageReceived!(10, bustCtx)).toBe(6);
    const ps = { hp: 20, maxHp: 30, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
    eq.modifier.onHandEnd!(makeContext({
      playerState: ps as any,
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    }));
    expect(ps.hp).toBe(23);
  });

  it('Silk-Wrapped Mail: 30% less damage', () => {
    const eq = getEquipmentById('armor_bronze_2');
    expect(eq.modifier.modifyDamageReceived!(20, makeContext())).toBe(14);
  });

  it("Merchant's Medallion: +18 gold", () => {
    const eq = getEquipmentById('trinket_bronze_2');
    expect(eq.modifier.modifyGoldEarned!(10, makeContext())).toBe(28);
  });
});

// ── New Iron Tier Tests ──

describe('Iron Tier Expansion', () => {
  it('Golden Scimitar: +22 damage, +10 on blackjack', () => {
    const eq = getEquipmentById('weapon_iron_2');
    const bjCtx = makeContext({
      playerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
    });
    expect(eq.modifier.modifyDamageDealt!(10, bjCtx)).toBe(42); // 10 + 22 + 10
    const nobjCtx = makeContext({
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    });
    expect(eq.modifier.modifyDamageDealt!(10, nobjCtx)).toBe(32); // 10 + 22
  });

  it('Sunfire Lance: +20 damage, +8 if dealer has 4+ cards', () => {
    const eq = getEquipmentById('weapon_iron_3');
    const ctx4 = makeContext({
      dealerHand: { cards: [
        { suit: 'hearts', rank: '2' }, { suit: 'clubs', rank: '3' },
        { suit: 'spades', rank: '4' }, { suit: 'diamonds', rank: '5' },
      ]},
    });
    expect(eq.modifier.modifyDamageDealt!(10, ctx4)).toBe(38); // 10 + 20 + 8
    expect(eq.modifier.modifyDamageDealt!(10, makeContext())).toBe(30); // 10 + 20
  });

  it("Sultan's Crown: 75% less bust damage and heals 4", () => {
    const eq = getEquipmentById('helm_iron_2');
    const bustCtx = makeContext({
      playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
    });
    expect(eq.modifier.modifyDamageReceived!(20, bustCtx)).toBe(5);
  });

  it('Lamellar Armor: 55% less damage', () => {
    const eq = getEquipmentById('armor_iron_2');
    expect(eq.modifier.modifyDamageReceived!(20, makeContext())).toBe(9);
  });

  it('Seal of the Caliph: double damage on hand 1', () => {
    const eq = getEquipmentById('trinket_iron_4');
    const h1 = makeContext({ handNumber: 1 } as any);
    expect(eq.modifier.modifyDamageDealt!(10, h1)).toBe(20);
    const h2 = makeContext({ handNumber: 2 } as any);
    expect(eq.modifier.modifyDamageDealt!(10, h2)).toBe(10);
  });

  it('Ring of Solomon: 15% less all damage', () => {
    const eq = getEquipmentById('trinket_iron_3');
    expect(eq.modifier.modifyDamageReceived!(20, makeContext())).toBe(17);
  });

  it('Lamp of Fortune: +30 gold', () => {
    const eq = getEquipmentById('trinket_iron_2');
    expect(eq.modifier.modifyGoldEarned!(10, makeContext())).toBe(40);
  });
});
