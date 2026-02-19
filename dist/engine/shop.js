import { ITEM_CATALOG } from "./item.js";
export class Shop {
    offerings = [];
    generateOfferings(rng, count = 3) {
        this.offerings = [];
        for (let i = 0; i < count; i++) {
            const catalogIndex = Math.floor(rng.next() * ITEM_CATALOG.length);
            const item = ITEM_CATALOG[catalogIndex];
            const price = Math.floor(rng.next() * 21) + 90; // 90-110
            this.offerings.push({ item: { ...item, effects: [...item.effects] }, price });
        }
    }
    getOfferings() {
        return [...this.offerings];
    }
    purchase(index, bankroll) {
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
//# sourceMappingURL=shop.js.map