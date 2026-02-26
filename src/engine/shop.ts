import type { ShopItem, PlayerState, Equipment, Consumable, EquipmentSlot, EquipmentTier } from './types.js';
import { SeededRNG } from './rng.js';
import { getAllEquipment } from './equipment.js';
import { getAllConsumables } from './consumables.js';

const STAGE_TIER: Record<number, EquipmentTier> = { 1: 'cloth', 2: 'bronze', 3: 'iron' };

export function generateShopInventory(
  stage: number,
  playerState: PlayerState,
  rng: SeededRNG
): ShopItem[] {
  const allEquipment = getAllEquipment();
  const allConsumables = getAllConsumables();

  // Filter equipment: only offer items matching the current stage's tier
  const stageTier = STAGE_TIER[stage] ?? 'iron';
  const availableEquipment = allEquipment.filter(eq => eq.tier === stageTier);

  // Shuffle and pick 3-5 equipment items
  const shuffledEquip = rng.shuffle(availableEquipment);
  const equipCount = Math.min(rng.nextInt(3, 5), shuffledEquip.length);
  const selectedEquip = shuffledEquip.slice(0, equipCount);

  // Shuffle and pick 2-4 consumables
  const shuffledCons = rng.shuffle(allConsumables);
  const consCount = rng.nextInt(2, 4);
  const selectedCons = shuffledCons.slice(0, consCount);

  const items: ShopItem[] = [];
  let idx = 0;

  for (const eq of selectedEquip) {
    items.push({
      index: idx++,
      item: eq,
      type: 'equipment',
      affordable: playerState.gold >= eq.cost,
    });
  }

  for (const con of selectedCons) {
    items.push({
      index: idx++,
      item: con,
      type: 'consumable',
      affordable: playerState.gold >= con.cost,
    });
  }

  return items;
}

export function purchaseItem(
  item: ShopItem,
  playerState: PlayerState
): { success: boolean; message: string } {
  const cost = item.item.cost;

  if (playerState.gold < cost) {
    return { success: false, message: `Not enough gold (need ${cost}, have ${playerState.gold})` };
  }

  playerState.gold -= cost;

  if (item.type === 'equipment') {
    const eq = item.item as Equipment;
    playerState.equipment.set(eq.slot, eq);
    return { success: true, message: `Equipped ${eq.name} (${eq.slot})` };
  } else {
    const con = item.item as Consumable;
    playerState.consumables.push(con);
    return { success: true, message: `Bought ${con.name}` };
  }
}
