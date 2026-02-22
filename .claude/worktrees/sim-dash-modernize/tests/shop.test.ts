import { describe, it, expect } from 'vitest';
import { generateShopInventory, purchaseItem } from '../src/engine/shop.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { PlayerState, Equipment, EquipmentSlot } from '../src/engine/types.js';

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
  return {
    hp: 50, maxHp: 50, gold: 100,
    equipment: new Map<EquipmentSlot, Equipment | null>([
      ['weapon', null], ['helm', null], ['armor', null], ['boots', null], ['trinket', null],
    ]),
    consumables: [], wishes: [], activeEffects: [],
    ...overrides,
  };
}

describe('Shop', () => {
  it('generates items', () => {
    const rng = new SeededRNG('shop-test');
    const items = generateShopInventory(1, makePlayer(), rng);
    expect(items.length).toBeGreaterThan(0);
  });

  it('marks affordability correctly', () => {
    const rng = new SeededRNG('afford-test');
    const player = makePlayer({ gold: 15 });
    const items = generateShopInventory(1, player, rng);
    for (const item of items) {
      expect(item.affordable).toBe(player.gold >= item.item.cost);
    }
  });

  it('purchase deducts gold', () => {
    const rng = new SeededRNG('buy-test');
    const player = makePlayer({ gold: 200 });
    const items = generateShopInventory(1, player, rng);
    const equipItem = items.find(i => i.type === 'equipment')!;
    const costBefore = player.gold;
    purchaseItem(equipItem, player);
    expect(player.gold).toBe(costBefore - equipItem.item.cost);
  });

  it('purchase with insufficient gold fails', () => {
    const rng = new SeededRNG('fail-buy');
    const player = makePlayer({ gold: 0 });
    const items = generateShopInventory(1, player, rng);
    const result = purchaseItem(items[0], player);
    expect(result.success).toBe(false);
  });

  it('equipment purchase replaces slot', () => {
    const rng = new SeededRNG('equip-test');
    const player = makePlayer({ gold: 200 });
    const items = generateShopInventory(1, player, rng);
    const equipItem = items.find(i => i.type === 'equipment')!;
    const eq = equipItem.item as Equipment;
    purchaseItem(equipItem, player);
    expect(player.equipment.get(eq.slot)).toBe(eq);
  });

  it('consumable purchase adds to inventory', () => {
    const rng = new SeededRNG('cons-test');
    const player = makePlayer({ gold: 200 });
    const items = generateShopInventory(1, player, rng);
    const consItem = items.find(i => i.type === 'consumable')!;
    purchaseItem(consItem, player);
    expect(player.consumables).toHaveLength(1);
  });
});
