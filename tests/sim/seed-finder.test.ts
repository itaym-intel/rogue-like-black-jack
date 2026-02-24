import { describe, it, expect } from 'vitest';
import { traceGame, findSeeds, filters, scorers } from '../../src/sim/seed-finder.js';
import { basicStrategy, standOn17 } from '../../src/sim/strategies.js';
import type { SeedFinderConfig } from '../../src/sim/types.js';

describe('traceGame', () => {
  it('produces a valid trace with hands, shops, and battles', () => {
    const trace = traceGame('trace-test-1', basicStrategy);

    expect(trace.seed).toBe('trace-test-1');
    expect(trace.strategyName).toBe('basicStrategy');
    expect(['victory', 'game_over']).toContain(trace.outcome);
    expect(trace.finalStage).toBeGreaterThanOrEqual(1);
    expect(trace.totalHandsPlayed).toBeGreaterThan(0);
    expect(trace.hands.length).toBe(trace.totalHandsPlayed);
    expect(trace.hands.length).toBeGreaterThan(0);
  });

  it('captures hand details (cards, scores, winner)', () => {
    const trace = traceGame('hand-detail-1', basicStrategy);
    const hand = trace.hands[0];

    expect(hand.stage).toBeGreaterThanOrEqual(1);
    expect(hand.battle).toBeGreaterThanOrEqual(1);
    expect(hand.handNumber).toBeGreaterThanOrEqual(1);
    expect(hand.playerScore).toBeGreaterThan(0);
    expect(hand.dealerScore).toBeGreaterThan(0);
    expect(['player', 'dealer', 'push']).toContain(hand.winner);
    expect(typeof hand.playerBlackjack).toBe('boolean');
    expect(typeof hand.dealerBlackjack).toBe('boolean');
    expect(typeof hand.playerBusted).toBe('boolean');
    expect(typeof hand.dealerBusted).toBe('boolean');
    expect(typeof hand.dodged).toBe('boolean');
  });

  it('captures shop inventories (not just purchases)', () => {
    // Run several seeds to find one that reaches a shop
    let foundShop = false;
    for (let i = 0; i < 50; i++) {
      const trace = traceGame(`shop-trace-${i}`, basicStrategy);
      if (trace.shops.length > 0) {
        const shop = trace.shops[0];
        expect(shop.inventory.length).toBeGreaterThan(0);
        expect(shop.inventory[0]).toHaveProperty('id');
        expect(shop.inventory[0]).toHaveProperty('name');
        expect(shop.inventory[0]).toHaveProperty('type');
        expect(shop.inventory[0]).toHaveProperty('cost');
        foundShop = true;
        break;
      }
    }
    expect(foundShop).toBe(true);
  });

  it('captures battle traces', () => {
    let foundBattle = false;
    for (let i = 0; i < 50; i++) {
      const trace = traceGame(`battle-trace-${i}`, basicStrategy);
      if (trace.battles.length > 0) {
        const battle = trace.battles[0];
        expect(battle.enemyName).toBeTruthy();
        expect(battle.enemyMaxHp).toBeGreaterThan(0);
        expect(typeof battle.isBoss).toBe('boolean');
        expect(battle.handsPlayed).toBeGreaterThan(0);
        expect(battle.playerHpAfter).toBeGreaterThanOrEqual(0);
        foundBattle = true;
        break;
      }
    }
    expect(foundBattle).toBe(true);
  });

  it('is deterministic — same seed+strategy produces identical traces', () => {
    const trace1 = traceGame('determinism-test', basicStrategy);
    const trace2 = traceGame('determinism-test', basicStrategy);

    expect(trace1.outcome).toBe(trace2.outcome);
    expect(trace1.finalStage).toBe(trace2.finalStage);
    expect(trace1.finalBattle).toBe(trace2.finalBattle);
    expect(trace1.finalHp).toBe(trace2.finalHp);
    expect(trace1.finalGold).toBe(trace2.finalGold);
    expect(trace1.totalHandsPlayed).toBe(trace2.totalHandsPlayed);
    expect(trace1.hands.length).toBe(trace2.hands.length);
    expect(trace1.shops.length).toBe(trace2.shops.length);
    expect(trace1.battles.length).toBe(trace2.battles.length);
    expect(trace1.deathEnemy).toBe(trace2.deathEnemy);

    // Check individual hand results match
    for (let i = 0; i < trace1.hands.length; i++) {
      expect(trace1.hands[i].winner).toBe(trace2.hands[i].winner);
      expect(trace1.hands[i].playerScore).toBe(trace2.hands[i].playerScore);
      expect(trace1.hands[i].dealerScore).toBe(trace2.hands[i].dealerScore);
    }
  });
});

describe('findSeeds', () => {
  const makeConfig = (overrides: Partial<SeedFinderConfig> = {}): SeedFinderConfig => ({
    count: 100,
    seedPrefix: 'test',
    strategy: basicStrategy,
    filters: [],
    scorer: scorers.constant(),
    topN: 10,
    ...overrides,
  });

  it('searches the requested number of seeds', () => {
    const result = findSeeds(makeConfig({ count: 50 }));
    expect(result.totalSearched).toBe(50);
  });

  it('with victory filter returns only victories', () => {
    const result = findSeeds(makeConfig({
      filters: [filters.victory()],
    }));

    for (const m of result.matches) {
      expect(m.trace.outcome).toBe('victory');
    }
    // Verify totalMatched <= totalSearched
    expect(result.totalMatched).toBeLessThanOrEqual(result.totalSearched);
  });

  it('with gameOver filter returns only game_over', () => {
    const result = findSeeds(makeConfig({
      filters: [filters.gameOver()],
    }));

    for (const m of result.matches) {
      expect(m.trace.outcome).toBe('game_over');
    }
  });

  it('respects topN limit', () => {
    const result = findSeeds(makeConfig({ topN: 3 }));
    expect(result.matches.length).toBeLessThanOrEqual(3);
  });

  it('results sorted by score descending', () => {
    const result = findSeeds(makeConfig({
      scorer: scorers.blackjackCount(),
    }));

    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
    }
  });

  it('multiple filters compose with AND', () => {
    const result = findSeeds(makeConfig({
      count: 200,
      filters: [
        filters.victory(),
        filters.minBlackjacks(1),
      ],
    }));

    for (const m of result.matches) {
      expect(m.trace.outcome).toBe('victory');
      const bjs = m.trace.hands.filter(h => h.playerBlackjack).length;
      expect(bjs).toBeGreaterThanOrEqual(1);
    }
  });

  it('deterministic — same config produces same results', () => {
    const config = makeConfig({
      count: 50,
      filters: [filters.victory()],
      scorer: scorers.blackjackCount(),
    });

    const result1 = findSeeds(config);
    const result2 = findSeeds(config);

    expect(result1.totalMatched).toBe(result2.totalMatched);
    expect(result1.matches.length).toBe(result2.matches.length);
    for (let i = 0; i < result1.matches.length; i++) {
      expect(result1.matches[i].seed).toBe(result2.matches[i].seed);
      expect(result1.matches[i].score).toBe(result2.matches[i].score);
    }
  });

  it('tracks durationMs', () => {
    const result = findSeeds(makeConfig({ count: 10 }));
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('filters', () => {
  it('noBusts filters correctly', () => {
    const result = findSeeds({
      count: 100,
      seedPrefix: 'nobust',
      strategy: basicStrategy,
      filters: [filters.noBusts()],
      scorer: scorers.constant(),
      topN: 10,
    });

    for (const m of result.matches) {
      expect(m.trace.hands.every(h => !h.playerBusted)).toBe(true);
    }
  });

  it('minStage filters correctly', () => {
    const result = findSeeds({
      count: 100,
      seedPrefix: 'minstage',
      strategy: basicStrategy,
      filters: [filters.minStage(2)],
      scorer: scorers.constant(),
      topN: 10,
    });

    for (const m of result.matches) {
      expect(m.trace.finalStage).toBeGreaterThanOrEqual(2);
    }
  });

  it('shopContains checks inventory, not just purchases', () => {
    // Run through seeds and find one with a shop, then verify the filter works
    // on inventory (not purchases)
    let testedShop = false;
    for (let i = 0; i < 100; i++) {
      const trace = traceGame(`shopfilter-${i}`, basicStrategy);
      if (trace.shops.length > 0) {
        const shop = trace.shops[0];
        if (shop.inventory.length > 0) {
          const itemId = shop.inventory[0].id;
          const filter = filters.shopContains(itemId);
          expect(filter(trace)).toBe(true);

          // Verify with non-existent item
          const noFilter = filters.shopContains('nonexistent_item_xyz');
          expect(noFilter(trace)).toBe(false);
          testedShop = true;
          break;
        }
      }
    }
    expect(testedShop).toBe(true);
  });

  it('cardDealtToPlayer matches specific cards', () => {
    // Find a trace with known cards and test the filter
    const trace = traceGame('cardfilter-1', basicStrategy);
    if (trace.hands.length > 0 && trace.hands[0].playerCards.length > 0) {
      const card = trace.hands[0].playerCards[0];
      const filter = filters.cardDealtToPlayer(card.rank, card.suit);
      expect(filter(trace)).toBe(true);
    }
  });

  it('blackjackOnHand matches specific hand', () => {
    // Search for a seed with a blackjack, then verify the filter
    let tested = false;
    for (let i = 0; i < 200; i++) {
      const trace = traceGame(`bjhand-${i}`, basicStrategy);
      const bjHand = trace.hands.find(h => h.playerBlackjack);
      if (bjHand) {
        const filter = filters.blackjackOnHand(bjHand.stage, bjHand.battle, bjHand.handNumber);
        expect(filter(trace)).toBe(true);

        // Non-matching should fail
        const noFilter = filters.blackjackOnHand(99, 99, 99);
        expect(noFilter(trace)).toBe(false);
        tested = true;
        break;
      }
    }
    expect(tested).toBe(true);
  });
});

describe('scorers', () => {
  it('blackjackCount ranks correctly', () => {
    const result = findSeeds({
      count: 100,
      seedPrefix: 'bjscore',
      strategy: basicStrategy,
      filters: [],
      scorer: scorers.blackjackCount(),
      topN: 5,
    });

    // First match should have highest blackjack count
    if (result.matches.length >= 2) {
      const first = result.matches[0].trace.hands.filter(h => h.playerBlackjack).length;
      const last = result.matches[result.matches.length - 1].trace.hands.filter(h => h.playerBlackjack).length;
      expect(first).toBeGreaterThanOrEqual(last);
    }
  });

  it('finalHp ranks correctly', () => {
    const result = findSeeds({
      count: 100,
      seedPrefix: 'hpscore',
      strategy: basicStrategy,
      filters: [filters.victory()],
      scorer: scorers.finalHp(),
      topN: 5,
    });

    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].trace.finalHp).toBeGreaterThanOrEqual(result.matches[i].trace.finalHp);
    }
  });

  it('fewestHands ranks correctly (fewer = better)', () => {
    const result = findSeeds({
      count: 100,
      seedPrefix: 'hands-score',
      strategy: basicStrategy,
      filters: [filters.victory()],
      scorer: scorers.fewestHands(),
      topN: 5,
    });

    // fewestHands uses negative scores, so first match has fewest hands
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].trace.totalHandsPlayed).toBeLessThanOrEqual(
        result.matches[i].trace.totalHandsPlayed
      );
    }
  });

  it('constant scorer gives all matches score 0', () => {
    const result = findSeeds({
      count: 50,
      seedPrefix: 'const',
      strategy: basicStrategy,
      filters: [],
      scorer: scorers.constant(),
      topN: 5,
    });

    for (const m of result.matches) {
      expect(m.score).toBe(0);
    }
  });
});
