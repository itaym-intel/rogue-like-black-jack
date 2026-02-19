import type { Card, Rank } from "./types.js";
import { SeededRng } from "./rng.js";
export declare function buildStandardDeck(): Card[];
export declare function shuffleDeck(cards: ReadonlyArray<Card>, rng: SeededRng): Card[];
export declare function baseCardValue(rank: Rank): number;
export declare function isTenValueCard(rank: Rank): boolean;
