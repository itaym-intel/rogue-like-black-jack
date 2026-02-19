import type { Item } from "./item.js";
export declare class Inventory {
    private readonly items;
    addItem(item: Item): void;
    getItems(): ReadonlyArray<Item>;
    size(): number;
    isEmpty(): boolean;
}
