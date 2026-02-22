import { describe, it, expect } from 'vitest';
import { scoreHand, compareHands, calculateBaseDamage } from '../src/engine/scoring.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import type { Hand, HandScore, GameRules } from '../src/engine/types.js';

function hand(...cards: { rank: string; suit?: string }[]): Hand {
  return {
    cards: cards.map(c => ({
      rank: c.rank as any,
      suit: (c.suit ?? 'hearts') as any,
    })),
  };
}

describe('scoreHand', () => {
  const rules = getDefaultRules();

  it('scores hard hands correctly', () => {
    expect(scoreHand(hand({ rank: '2' }, { rank: '3' }), rules).value).toBe(5);
    expect(scoreHand(hand({ rank: '10' }, { rank: 'K' }), rules).value).toBe(20);
    expect(scoreHand(hand({ rank: '7' }, { rank: '8' }, { rank: '9' }), rules).value).toBe(24);
  });

  it('detects bust', () => {
    const score = scoreHand(hand({ rank: '7' }, { rank: '8' }, { rank: '9' }), rules);
    expect(score.busted).toBe(true);
  });

  it('scores soft hands with aces', () => {
    const score = scoreHand(hand({ rank: 'A' }, { rank: '5' }), rules);
    expect(score.value).toBe(16);
    expect(score.soft).toBe(true);
  });

  it('demotes ace when it would cause bust', () => {
    const score = scoreHand(hand({ rank: 'A' }, { rank: '5' }, { rank: '7' }), rules);
    expect(score.value).toBe(13);
    expect(score.soft).toBe(false);
  });

  it('detects blackjack', () => {
    const score = scoreHand(hand({ rank: 'A' }, { rank: 'K' }), rules);
    expect(score.value).toBe(21);
    expect(score.isBlackjack).toBe(true);
  });

  it('21 with 3 cards is not blackjack', () => {
    const score = scoreHand(hand({ rank: 'A' }, { rank: '5' }, { rank: '5' }), rules);
    expect(score.value).toBe(21);
    expect(score.isBlackjack).toBe(false);
  });

  it('respects custom bust threshold', () => {
    const customRules = { ...rules, scoring: { ...rules.scoring, bustThreshold: 25 } };
    const score = scoreHand(hand({ rank: '7' }, { rank: '8' }, { rank: '9' }), customRules);
    expect(score.value).toBe(24);
    expect(score.busted).toBe(false);
  });

  it('supports additional blackjack values', () => {
    const customRules = { ...rules, scoring: { ...rules.scoring, additionalBlackjackValues: [17] } };
    const score = scoreHand(hand({ rank: '10' }, { rank: '7' }), customRules);
    expect(score.isBlackjack).toBe(true);
  });

  it('supports bust save threshold', () => {
    const customRules = { ...rules, scoring: { ...rules.scoring, bustSaveThreshold: 22 } };
    const score = scoreHand(hand({ rank: '10' }, { rank: '5' }, { rank: '7' }), customRules);
    expect(score.value).toBe(22);
    expect(score.busted).toBe(false);
  });
});

describe('compareHands', () => {
  const rules = getDefaultRules();

  function hs(value: number, busted = false, isBlackjack = false): HandScore {
    return { value, soft: false, busted, isBlackjack };
  }

  it('higher score wins', () => {
    expect(compareHands(hs(21), hs(18), rules)).toBe('player');
    expect(compareHands(hs(18), hs(21), rules)).toBe('dealer');
  });

  it('tie defaults to push', () => {
    expect(compareHands(hs(20), hs(20), rules)).toBe('push');
  });

  it('tie resolved as player wins', () => {
    const r = { ...rules, winConditions: { ...rules.winConditions, tieResolution: 'player' as const } };
    expect(compareHands(hs(20), hs(20), r)).toBe('player');
  });

  it('tie resolved as dealer wins', () => {
    const r = { ...rules, winConditions: { ...rules.winConditions, tieResolution: 'dealer' as const } };
    expect(compareHands(hs(20), hs(20), r)).toBe('dealer');
  });

  it('player bust means dealer wins', () => {
    expect(compareHands(hs(25, true), hs(18), rules)).toBe('dealer');
  });

  it('dealer bust means player wins', () => {
    expect(compareHands(hs(18), hs(25, true), rules)).toBe('player');
  });

  it('double bust defaults to push', () => {
    expect(compareHands(hs(25, true), hs(25, true), rules)).toBe('push');
  });

  it('double bust resolved as player', () => {
    const r = { ...rules, winConditions: { ...rules.winConditions, doubleBustResolution: 'player' as const } };
    expect(compareHands(hs(25, true), hs(25, true), r)).toBe('player');
  });
});

describe('calculateBaseDamage', () => {
  const rules = getDefaultRules();

  function hs(value: number, busted = false, isBlackjack = false): HandScore {
    return { value, soft: false, busted, isBlackjack };
  }

  it('calculates damage as difference when neither busts', () => {
    expect(calculateBaseDamage(hs(21), hs(18), rules)).toBe(3);
  });

  it('calculates damage as winner score when loser busts', () => {
    expect(calculateBaseDamage(hs(18), hs(25, true), rules)).toBe(18);
  });

  it('applies blackjack payout multiplier', () => {
    // blackjack wins: base damage * 1.5
    const dmg = calculateBaseDamage(hs(21, false, true), hs(18), rules);
    expect(dmg).toBe(Math.floor(3 * 1.5));
  });

  it('applies flat bonus damage', () => {
    const r = { ...rules, damage: { ...rules.damage, flatBonusDamage: 5 } };
    expect(calculateBaseDamage(hs(21), hs(18), r)).toBe(8); // 3 + 5
  });

  it('applies percent bonus damage', () => {
    const r = { ...rules, damage: { ...rules.damage, percentBonusDamage: 0.5 } };
    expect(calculateBaseDamage(hs(21), hs(18), r)).toBe(Math.floor(3 * 1.5));
  });

  it('clamps to maximum damage', () => {
    const r = { ...rules, damage: { ...rules.damage, maximumDamage: 2 } };
    expect(calculateBaseDamage(hs(21), hs(18), r)).toBe(2);
  });

  it('never returns negative', () => {
    expect(calculateBaseDamage(hs(20), hs(20), rules)).toBe(0);
  });
});
