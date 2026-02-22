import type { Suit, Rank } from "@engine/types";

export const SUIT_SYMBOLS: Record<Suit, string> = {
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
  S: "\u2660",
};

export const SUIT_NAMES: Record<Suit, string> = {
  H: "Hearts",
  D: "Diamonds",
  C: "Clubs",
  S: "Spades",
};

export function isRedSuit(suit: Suit): boolean {
  return suit === "H" || suit === "D";
}

export function displayRank(rank: Rank): string {
  return rank;
}

export function displayCard(rank: Rank, suit: Suit): string {
  return `${displayRank(rank)}${SUIT_SYMBOLS[suit]}`;
}
