function normalizeSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
        return seed >>> 0;
    }
    const text = String(seed);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
export class SeededRng {
    state;
    constructor(seed) {
        const initial = normalizeSeed(seed);
        this.state = initial === 0 ? 0x6d2b79f5 : initial;
    }
    next() {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let value = this.state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }
}
//# sourceMappingURL=rng.js.map