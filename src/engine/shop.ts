import type { Item } from "./item.js";
import { ITEM_CATALOG } from "./item.js";
import { SeededRng } from "./rng.js";

export interface ShopOffering {
  item: Item;
  price: number;
}

export class Shop {
  private offerings: ShopOffering[] = [];

  public generateOfferings(rng: SeededRng, count: number = 3): void {
    this.offerings = [];
    for (let i = 0; i < count; i++) {
      const catalogIndex = Math.floor(rng.next() * ITEM_CATALOG.length);
      const item = ITEM_CATALOG[catalogIndex];
      const price = Math.floor(rng.next() * 21) + 90; // 90-110
      this.offerings.push({ item: { ...item, effects: [...item.effects] }, price });
    }
  }

  public getOfferings(): ReadonlyArray<ShopOffering> {
    return [...this.offerings];
  }

  public purchase(index: number, bankroll: number): { item: Item; cost: number } | null {
    if (index < 0 || index >= this.offerings.length) {
      return null;
    }
    const offering = this.offerings[index];
    if (bankroll < offering.price) {
      return null;
    }
    const purchased = this.offerings.splice(index, 1)[0];
    return { item: purchased.item, cost: purchased.price };
  }
}
