const SUITS = ["H", "D", "C", "S"];
const RANKS = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
];
export function buildStandardDeck() {
    const cards = [];
    let counter = 0;
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            cards.push({
                rank,
                suit,
                id: `${rank}${suit}-${counter}`,
            });
            counter += 1;
        }
    }
    return cards;
}
export function shuffleDeck(cards, rng) {
    const shuffled = [...cards];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(rng.next() * (index + 1));
        const temp = shuffled[index];
        shuffled[index] = shuffled[swapIndex];
        shuffled[swapIndex] = temp;
    }
    return shuffled;
}
export function baseCardValue(rank) {
    if (rank === "A") {
        return 11;
    }
    if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") {
        return 10;
    }
    return Number(rank);
}
export function isTenValueCard(rank) {
    return rank === "10" || rank === "J" || rank === "Q" || rank === "K";
}
//# sourceMappingURL=deck.js.map