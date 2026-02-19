import type { Item } from "./item.js";
import { SeededRng } from "./rng.js";
export interface ShopOffering {
    item: Item;
    price: number;
}
export declare class Shop {
    private offerings;
    generateOfferings(rng: SeededRng, count?: number): void;
    getOfferings(): ReadonlyArray<ShopOffering>;
    purchase(index: number, bankroll: number): {
        item: Item;
        cost: number;
    } | null;
}
