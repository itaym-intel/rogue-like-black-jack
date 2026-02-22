import { describe, it, expect } from 'vitest';
import { initCombat, dealInitialCards, playerHit, playerStand, playerDoubleDown, dealerPlay, resolveHand } from '../src/engine/combat.js';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import { scoreHand } from '../src/engine/scoring.js';
import type { ModifierContext } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] }, dealerHand: { cards: [] },
    playerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('combat-test'),
    stage: 1, battle: 1, handNumber: 1,
    ...overrides,
  };
}

describe('Combat', () => {
  const rules = getDefaultRules();

  it('initial deal gives correct number of cards', () => {
    const rng = new SeededRNG('deal-test');
    const combat = dealInitialCards(initCombat(rng, rules), rules);
    expect(combat.playerHand.cards).toHaveLength(2);
    expect(combat.dealerHand.cards).toHaveLength(2);
  });

  it('player hit draws one card', () => {
    const rng = new SeededRNG('hit-test');
    let combat = dealInitialCards(initCombat(rng, rules), rules);
    combat = playerHit(combat);
    expect(combat.playerHand.cards).toHaveLength(3);
  });

  it('player stand does not change hand', () => {
    const rng = new SeededRNG('stand-test');
    let combat = dealInitialCards(initCombat(rng, rules), rules);
    combat = playerStand(combat);
    expect(combat.playerHand.cards).toHaveLength(2);
    expect(combat.dealerFaceDown).toBe(false);
  });

  it('double down draws exactly one card and sets doubledDown', () => {
    const rng = new SeededRNG('dd-test');
    let combat = dealInitialCards(initCombat(rng, rules), rules);
    combat = playerDoubleDown(combat);
    expect(combat.playerHand.cards).toHaveLength(3);
    expect(combat.doubledDown).toBe(true);
  });

  it('dealer hits below standsOn value', () => {
    const rng = new SeededRNG('dealer-test');
    let combat = dealInitialCards(initCombat(rng, rules), rules);
    combat = dealerPlay(combat, rules);
    const score = scoreHand(combat.dealerHand, rules);
    // Dealer should have score >= 17 or busted
    expect(score.value >= 17 || score.busted).toBe(true);
  });

  it('full hand resolution produces HandResult', () => {
    const rng = new SeededRNG('resolve-test');
    let combat = dealInitialCards(initCombat(rng, rules), rules);
    combat = playerStand(combat);
    combat = dealerPlay(combat, rules);
    const ctx = makeContext({
      playerHand: combat.playerHand,
      dealerHand: combat.dealerHand,
    });
    const result = resolveHand(combat, [], [], rules, ctx);
    expect(result).toHaveProperty('winner');
    expect(result).toHaveProperty('damageDealt');
    expect(result).toHaveProperty('playerScore');
    expect(result).toHaveProperty('dealerScore');
  });

  it('deterministic — same seed produces same result', () => {
    function playHand(seed: string) {
      const rng = new SeededRNG(seed);
      let combat = dealInitialCards(initCombat(rng, rules), rules);
      combat = playerStand(combat);
      combat = dealerPlay(combat, rules);
      const ctx = makeContext({ playerHand: combat.playerHand, dealerHand: combat.dealerHand, rng });
      return resolveHand(combat, [], [], rules, ctx);
    }
    const r1 = playHand('determinism-test');
    const r2 = playHand('determinism-test');
    expect(r1.winner).toBe(r2.winner);
    expect(r1.damageDealt).toBe(r2.damageDealt);
    expect(r1.playerScore.value).toBe(r2.playerScore.value);
    expect(r1.dealerScore.value).toBe(r2.dealerScore.value);
  });
});
