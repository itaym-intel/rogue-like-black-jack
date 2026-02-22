import type { Card, Hand, Suit, Rank } from './types.js';
import { SeededRNG } from './rng.js';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

export function createDeck(rng: SeededRNG, numberOfDecks: number = 1): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < numberOfDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank });
      }
    }
  }
  return rng.shuffle(cards);
}

export function cardValue(card: Card): number[] {
  if (card.rank === 'A') return [1, 11];
  if (['J', 'Q', 'K'].includes(card.rank)) return [10];
  return [parseInt(card.rank, 10)];
}

export function cardToString(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function handToString(hand: Hand): string {
  return `[${hand.cards.map(cardToString).join(' ')}]`;
}
