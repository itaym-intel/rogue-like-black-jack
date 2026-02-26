import { describe, it, expect } from 'vitest';
import type { ModifierContext, Hand, HandScore, PlayerState, EnemyState, EquipmentSlot, Equipment, Modifier } from '../src/engine/types.js';
import { getDefaultRules } from '../src/engine/modifiers.js';

// Old (current) registries
import { getAllEquipment as getOldEquipment } from '../src/engine/equipment.js';
import { getAllConsumables as getOldConsumables } from '../src/engine/consumables.js';
import { STAGE_POOLS, getBossForStage } from '../src/engine/combatants.js';

// New (component registry)
import {
  getAllEquipment as getNewEquipment,
  getEquipmentById,
  getRegistryConsumables,
  getRegistryStagePool,
  getRegistryBoss,
} from '../src/engine/component-registry.js';

function makeContext(overrides: Partial<ModifierContext> = {}): ModifierContext {
  const defaultHand: Hand = { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '7' }] };
  const defaultScore: HandScore = { value: 17, soft: false, busted: false, isBlackjack: false };
  const rules = getDefaultRules();
  let rngCounter = 0;
  return {
    playerHand: defaultHand,
    dealerHand: { cards: [{ suit: 'clubs', rank: '9' }, { suit: 'diamonds', rank: '8' }] },
    playerScore: defaultScore,
    dealerScore: { value: 17, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 40, maxHp: 50, gold: 100, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test Enemy', maxHp: 30, isBoss: false, equipment: [], description: '' }, hp: 25 },
    rules,
    rng: {
      next: () => { rngCounter++; return (rngCounter % 100) / 100; },
      nextInt: (min: number, max: number) => { rngCounter++; return min + (rngCounter % (max - min + 1)); },
    },
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

describe('Component Registry vs Old Registry Comparison', () => {
  describe('Equipment', () => {
    it('same number of equipment items', () => {
      const oldEquip = getOldEquipment();
      const newEquip = getNewEquipment();
      expect(newEquip.length).toBe(oldEquip.length);
    });

    it('equipment metadata matches (id, name, slot, tier, cost)', () => {
      const oldEquip = getOldEquipment();
      const newEquip = getNewEquipment();
      for (const old of oldEquip) {
        const nw = newEquip.find(e => e.id === old.id);
        expect(nw, `Missing new equipment: ${old.id}`).toBeTruthy();
        if (nw) {
          expect(nw.name).toBe(old.name);
          expect(nw.slot).toBe(old.slot);
          expect(nw.tier).toBe(old.tier);
          expect(nw.cost).toBe(old.cost);
        }
      }
    });

    // Test modifyDamageDealt for all weapons
    it('weapon modifyDamageDealt matches', () => {
      const oldEquip = getOldEquipment().filter(e => e.slot === 'weapon');
      const newEquip = getNewEquipment().filter(e => e.slot === 'weapon');

      for (const old of oldEquip) {
        const nw = newEquip.find(e => e.id === old.id)!;
        const ctx = makeContext();

        // Standard scenario
        const oldDmg = old.modifier.modifyDamageDealt?.(10, ctx) ?? 10;
        const newDmg = nw.modifier.modifyDamageDealt?.(10, ctx) ?? 10;
        expect(newDmg, `Damage mismatch for ${old.id}`).toBe(oldDmg);
      }
    });

    // Test conditional weapons with various contexts
    it('Copper Khanjar conditional damage matches', () => {
      const nw = getEquipmentById('weapon_cloth_2');

      // 2 cards: should get bonus
      const ctx2 = makeContext({
        playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '7' }] },
      });
      expect(nw.modifier.modifyDamageDealt!(10, ctx2)).toBe(18); // 10 + 4 + 4

      // 3 cards: no bonus
      const ctx3 = makeContext({
        playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '7' }, { suit: 'clubs', rank: '3' }] },
      });
      expect(nw.modifier.modifyDamageDealt!(10, ctx3)).toBe(14); // 10 + 4
    });

    it('Oasis Blade conditional damage matches', () => {
      const nw = getEquipmentById('weapon_bronze_2');

      // Score >= 18
      const ctx18 = makeContext({ playerScore: { value: 18, soft: false, busted: false, isBlackjack: false } });
      expect(nw.modifier.modifyDamageDealt!(10, ctx18)).toBe(25); // 10 + 9 + 6

      // Score < 18
      const ctx16 = makeContext({ playerScore: { value: 16, soft: false, busted: false, isBlackjack: false } });
      expect(nw.modifier.modifyDamageDealt!(10, ctx16)).toBe(19); // 10 + 9
    });

    it('Twin Fangs conditional damage matches', () => {
      const nw = getEquipmentById('weapon_bronze_3');

      // Has ace
      const ctxAce = makeContext({
        playerHand: { cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'spades', rank: '10' }] },
      });
      expect(nw.modifier.modifyDamageDealt!(10, ctxAce)).toBe(26); // 10 + 8 + 8

      // No ace
      const ctxNoAce = makeContext({
        playerHand: { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '9' }] },
      });
      expect(nw.modifier.modifyDamageDealt!(10, ctxNoAce)).toBe(18); // 10 + 8
    });

    it('Golden Scimitar blackjack bonus matches', () => {
      const nw = getEquipmentById('weapon_iron_2');

      // Blackjack
      const ctxBJ = makeContext({ playerScore: { value: 21, soft: false, busted: false, isBlackjack: true } });
      expect(nw.modifier.modifyDamageDealt!(10, ctxBJ)).toBe(42); // 10 + 22 + 10

      // No blackjack
      const ctxNoBJ = makeContext();
      expect(nw.modifier.modifyDamageDealt!(10, ctxNoBJ)).toBe(32); // 10 + 22
    });

    it('Sunfire Lance dealer hand size bonus matches', () => {
      const nw = getEquipmentById('weapon_iron_3');

      // Dealer has 4+ cards
      const ctx4 = makeContext({
        dealerHand: { cards: [
          { suit: 'hearts', rank: '2' }, { suit: 'spades', rank: '3' },
          { suit: 'clubs', rank: '4' }, { suit: 'diamonds', rank: '5' },
        ]},
      });
      expect(nw.modifier.modifyDamageDealt!(10, ctx4)).toBe(38); // 10 + 20 + 8

      // Dealer has 2 cards
      const ctx2 = makeContext();
      expect(nw.modifier.modifyDamageDealt!(10, ctx2)).toBe(30); // 10 + 20
    });

    // Test helms (bust damage reduction)
    it('helm modifyDamageReceived matches on bust', () => {
      const helmIds = ['helm_cloth', 'helm_bronze', 'helm_iron'];
      const expectedReductions = [0.3, 0.5, 0.8];

      for (let i = 0; i < helmIds.length; i++) {
        const nw = getEquipmentById(helmIds[i]);
        const ctxBust = makeContext({
          playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
        });
        const expected = Math.round(20 * (1 - expectedReductions[i]));
        expect(nw.modifier.modifyDamageReceived!(20, ctxBust), `${helmIds[i]} bust`).toBe(expected);

        // Not busted: no reduction
        const ctxOk = makeContext();
        expect(nw.modifier.modifyDamageReceived!(20, ctxOk), `${helmIds[i]} no bust`).toBe(20);
      }
    });

    // Test armor (flat percent reduction)
    it('armor modifyDamageReceived matches', () => {
      const armorIds = ['armor_cloth', 'armor_bronze', 'armor_iron'];
      const expectedReductions = [0.2, 0.4, 0.6];

      for (let i = 0; i < armorIds.length; i++) {
        const nw = getEquipmentById(armorIds[i]);
        const ctx = makeContext();
        const expected = Math.round(20 * (1 - expectedReductions[i]));
        expect(nw.modifier.modifyDamageReceived!(20, ctx), armorIds[i]).toBe(expected);
      }
    });

    // Test trinket gold bonuses
    it('gold bonus trinkets match', () => {
      const trinketGoldItems = [
        { id: 'trinket_cloth', expected: 10 },
        { id: 'trinket_cloth_2', expected: 8 },
        { id: 'trinket_bronze_2', expected: 18 },
        { id: 'trinket_iron_2', expected: 30 },
      ];

      for (const { id, expected } of trinketGoldItems) {
        const nw = getEquipmentById(id);
        const ctx = makeContext();
        const result = nw.modifier.modifyGoldEarned!(0, ctx);
        expect(result, `${id} gold`).toBe(expected);
      }
    });

    // Test Seal of the Caliph (first hand double damage)
    it('Seal of the Caliph first hand multiplier matches', () => {
      const nw = getEquipmentById('trinket_iron_4');

      // First hand
      const ctx1 = makeContext({ handNumber: 1 });
      expect(nw.modifier.modifyDamageDealt!(10, ctx1)).toBe(20);

      // Second hand
      const ctx2 = makeContext({ handNumber: 2 });
      expect(nw.modifier.modifyDamageDealt!(10, ctx2)).toBe(10);
    });

    // Test Ring of Solomon (15% all damage reduction)
    it('Ring of Solomon damage reduction matches', () => {
      const nw = getEquipmentById('trinket_iron_3');
      const ctx = makeContext();
      expect(nw.modifier.modifyDamageReceived!(20, ctx)).toBe(Math.floor(20 * 0.85));
    });
  });

  describe('Consumables', () => {
    it('same number of consumables', () => {
      const old = getOldConsumables();
      const nw = getRegistryConsumables();
      expect(nw.length).toBe(old.length);
    });

    it('consumable metadata matches', () => {
      const old = getOldConsumables();
      const nw = getRegistryConsumables();
      for (const o of old) {
        const n = nw.find(c => c.id === o.id);
        expect(n, `Missing: ${o.id}`).toBeTruthy();
        if (n) {
          expect(n.name).toBe(o.name);
          expect(n.type).toBe(o.type);
          expect(n.cost).toBe(o.cost);
        }
      }
    });
  });

  describe('Enemies', () => {
    it('stage 1 enemies have correct metadata', () => {
      const oldPool = STAGE_POOLS[0];
      const newPool = getRegistryStagePool(1);
      expect(newPool.length).toBe(oldPool.length);

      for (const old of oldPool) {
        const nw = newPool.find(e => e.name === old.name);
        expect(nw, `Missing: ${old.name}`).toBeTruthy();
        if (nw) {
          expect(nw.maxHp).toBe(old.maxHp);
          expect(nw.isBoss).toBe(old.isBoss);
          expect(nw.equipment.length).toBe(old.equipment.length);
        }
      }
    });

    it('stage 2 enemies have correct metadata', () => {
      const oldPool = STAGE_POOLS[1];
      const newPool = getRegistryStagePool(2);
      expect(newPool.length).toBe(oldPool.length);

      for (const old of oldPool) {
        const nw = newPool.find(e => e.name === old.name);
        expect(nw, `Missing: ${old.name}`).toBeTruthy();
        if (nw) {
          expect(nw.maxHp).toBe(old.maxHp);
          expect(nw.equipment.length).toBe(old.equipment.length);
        }
      }
    });

    it('stage 3 enemies have correct metadata', () => {
      const oldPool = STAGE_POOLS[2];
      const newPool = getRegistryStagePool(3);
      expect(newPool.length).toBe(oldPool.length);

      for (const old of oldPool) {
        const nw = newPool.find(e => e.name === old.name);
        expect(nw, `Missing: ${old.name}`).toBeTruthy();
        if (nw) {
          expect(nw.maxHp).toBe(old.maxHp);
          expect(nw.equipment.length).toBe(old.equipment.length);
        }
      }
    });

    // Test enemy modifier behavior
    it('Desert Jackal +3 damage matches', () => {
      const newPool = getRegistryStagePool(1);
      const jackal = newPool.find(e => e.name === 'Desert Jackal')!;
      const ctx = makeContext();
      const dmg = jackal.equipment[0].modifier.modifyDamageDealt!(10, ctx);
      expect(dmg).toBe(13);
    });

    it('Ghul bust bonus matches (enemy perspective)', () => {
      const newPool = getRegistryStagePool(1);
      const ghul = newPool.find(e => e.name === 'Ghul')!;

      // Player busted (from enemy perspective, opponent = player)
      const ctxBust = makeContext({
        playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
      });
      const dmg = ghul.equipment[0].modifier.modifyDamageDealt!(10, ctxBust);
      expect(dmg).toBe(15); // 10 + 5

      // Player not busted
      const ctxOk = makeContext();
      const dmgOk = ghul.equipment[0].modifier.modifyDamageDealt!(10, ctxOk);
      expect(dmgOk).toBe(10);
    });

    it('Tomb Guardian 25% armor matches', () => {
      const newPool = getRegistryStagePool(2);
      const guardian = newPool.find(e => e.name === 'Tomb Guardian')!;
      const ctx = makeContext();
      const dmg = guardian.equipment[0].modifier.modifyDamageReceived!(20, ctx);
      expect(dmg).toBe(Math.floor(20 * 0.75));
    });
  });

  describe('Bosses', () => {
    it('boss metadata matches for all stages', () => {
      for (let stage = 1; stage <= 3; stage++) {
        const oldBoss = getBossForStage(stage);
        const newBoss = getRegistryBoss(stage);
        expect(newBoss.name).toBe(oldBoss.name);
        expect(newBoss.maxHp).toBe(oldBoss.maxHp);
        expect(newBoss.isBoss).toBe(true);
        expect(newBoss.equipment.length).toBe(oldBoss.equipment.length);
        expect(!!newBoss.curse).toBe(!!oldBoss.curse);
      }
    });

    it('Ancient Strix blackjack damage bonus matches', () => {
      const boss = getRegistryBoss(1);
      const weapon = boss.equipment.find(e => e.name === 'Night Fang')!;

      // Enemy has blackjack (dealer hand = enemy hand for enemy perspective)
      const ctxBJ = makeContext({
        dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
      });
      expect(weapon.modifier.modifyDamageDealt!(10, ctxBJ)).toBe(20);

      // No blackjack
      const ctxNoBJ = makeContext();
      expect(weapon.modifier.modifyDamageDealt!(10, ctxNoBJ)).toBe(10);
    });

    it('Zahhak curse -20% damage matches', () => {
      const boss = getRegistryBoss(3);
      const curse = boss.curse!;
      const ctx = makeContext();
      expect(curse.modifyDamageDealt!(20, ctx)).toBe(Math.floor(20 * 0.8));
    });

    it("Murad's Brand bust self-damage matches", () => {
      const boss = getRegistryBoss(2);
      const curse = boss.curse!;

      // Player busts
      const ctx = makeContext({
        playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
      });
      const hpBefore = ctx.playerState.hp;
      curse.onHandEnd!(ctx);
      expect(ctx.playerState.hp).toBe(hpBefore - 4);
    });

    it("Night Fang Curse +5 damage on dealer blackjack matches", () => {
      const boss = getRegistryBoss(1);
      const curse = boss.curse!;

      // Dealer has blackjack
      const ctxBJ = makeContext({
        dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
      });
      expect(curse.modifyDamageReceived!(10, ctxBJ)).toBe(15);

      // No blackjack
      const ctx = makeContext();
      expect(curse.modifyDamageReceived!(10, ctx)).toBe(10);
    });
  });
});
