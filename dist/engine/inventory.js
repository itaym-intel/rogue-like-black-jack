export class Inventory {
    items = [];
    addItem(item) {
        this.items.push({ ...item, effects: [...item.effects] });
    }
    getItems() {
        return [...this.items];
    }
    size() {
        return this.items.length;
    }
    isEmpty() {
        return this.items.length === 0;
    }
}
//# sourceMappingURL=inventory.js.map