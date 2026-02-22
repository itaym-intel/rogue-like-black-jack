import { describe, it, expect } from 'vitest';
import { createDeck, cardValue, cardToString, handToString } from '../src/engine/cards.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { Card, Hand } from '../src/engine/types.js';

describe('createDeck', () => {
  it('creates a deck with 52 cards', () => {
    const rng = new SeededRNG('deck-test');
    const deck = createDeck(rng);
    expect(deck).toHaveLength(52);
  });

  it('has no duplicate cards', () => {
    const rng = new SeededRNG('no-dupes');
    const deck = createDeck(rng);
    const keys = deck.map(c => `${c.rank}-${c.suit}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(52);
  });

  it('same seed produces same deck order', () => {
    const rng1 = new SeededRNG('order-test');
    const rng2 = new SeededRNG('order-test');
    const deck1 = createDeck(rng1);
    const deck2 = createDeck(rng2);
    expect(deck1).toEqual(deck2);
  });

  it('creates multiple decks correctly', () => {
    const rng = new SeededRNG('multi-deck');
    const deck = createDeck(rng, 2);
    expect(deck).toHaveLength(104);
  });
});

describe('cardValue', () => {
  it('returns correct value for number cards', () => {
    expect(cardValue({ suit: 'hearts', rank: '2' })).toEqual([2]);
    expect(cardValue({ suit: 'hearts', rank: '5' })).toEqual([5]);
    expect(cardValue({ suit: 'hearts', rank: '10' })).toEqual([10]);
  });

  it('returns 10 for face cards', () => {
    expect(cardValue({ suit: 'hearts', rank: 'J' })).toEqual([10]);
    expect(cardValue({ suit: 'hearts', rank: 'Q' })).toEqual([10]);
    expect(cardValue({ suit: 'hearts', rank: 'K' })).toEqual([10]);
  });

  it('returns [1, 11] for ace', () => {
    expect(cardValue({ suit: 'hearts', rank: 'A' })).toEqual([1, 11]);
  });
});

describe('cardToString', () => {
  it('formats cards correctly', () => {
    expect(cardToString({ suit: 'spades', rank: 'A' })).toBe('A\u2660');
    expect(cardToString({ suit: 'hearts', rank: 'K' })).toBe('K\u2665');
    expect(cardToString({ suit: 'diamonds', rank: '10' })).toBe('10\u2666');
    expect(cardToString({ suit: 'clubs', rank: '3' })).toBe('3\u2663');
  });
});

describe('handToString', () => {
  it('formats a hand correctly', () => {
    const hand: Hand = {
      cards: [
        { suit: 'spades', rank: 'A' },
        { suit: 'hearts', rank: '5' },
        { suit: 'clubs', rank: '3' },
      ],
    };
    expect(handToString(hand)).toBe('[A\u2660 5\u2665 3\u2663]');
  });
});
