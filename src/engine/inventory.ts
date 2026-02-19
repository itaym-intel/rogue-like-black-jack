import type { Item } from "./item.js";

export class Inventory {
  private readonly items: Item[] = [];

  public addItem(item: Item): void {
    this.items.push({ ...item, effects: [...item.effects] });
  }

  public getItems(): ReadonlyArray<Item> {
    return [...this.items];
  }

  public size(): number {
    return this.items.length;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }
}
