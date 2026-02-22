import { describe, it, expect } from 'vitest';
import { aggregateResults } from '../../src/sim/aggregator.js';
import { runGame } from '../../src/sim/runner.js';
import { standOn17, basicStrategy, ALL_STRATEGIES } from '../../src/sim/strategies.js';
import type { RunResult, SimConfig } from '../../src/sim/types.js';

function makeResults(seeds: number, strategies = [standOn17, basicStrategy]): { results: RunResult[]; config: SimConfig } {
  const results: RunResult[] = [];
  for (const strategy of strategies) {
    for (let i = 0; i < seeds; i++) {
      results.push(runGame(`agg-test-${i}`, strategy));
    }
  }
  return {
    results,
    config: { count: seeds, seedPrefix: 'agg-test', strategies },
  };
}

describe('Aggregator produces valid AggregateStats', () => {
  it('returns correct structure with meta', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    expect(stats.meta.totalGames).toBe(10); // 5 seeds × 2 strategies
    expect(stats.meta.seedPrefix).toBe('agg-test');
    expect(stats.meta.seedCount).toBe(5);
    expect(stats.meta.strategies).toHaveLength(2);
    expect(stats.meta.timestamp).toBeTruthy();
  });

  it('byStrategy has one entry per strategy', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    expect(stats.byStrategy).toHaveLength(2);
    expect(stats.byStrategy.map(s => s.name)).toContain('standOn17');
    expect(stats.byStrategy.map(s => s.name)).toContain('basicStrategy');
  });

  it('win rates are between 0 and 1', () => {
    const { results, config } = makeResults(10);
    const stats = aggregateResults(results, config);

    for (const s of stats.byStrategy) {
      expect(s.winRate).toBeGreaterThanOrEqual(0);
      expect(s.winRate).toBeLessThanOrEqual(1);
    }
  });

  it('averages are non-negative', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    for (const s of stats.byStrategy) {
      expect(s.avgStageReached).toBeGreaterThanOrEqual(1);
      expect(s.avgHandsPlayed).toBeGreaterThanOrEqual(0);
      expect(s.avgGoldEarned).toBeGreaterThanOrEqual(0);
      expect(s.avgDamageDealt).toBeGreaterThanOrEqual(0);
      expect(s.avgDamageReceived).toBeGreaterThanOrEqual(0);
    }
  });

  it('equipment stats cover all equipment items', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    expect(stats.equipmentStats.length).toBe(15); // 15 equipment items
    for (const eq of stats.equipmentStats) {
      expect(eq.purchaseRate).toBeGreaterThanOrEqual(0);
      expect(eq.purchaseRate).toBeLessThanOrEqual(1);
    }
  });

  it('consumable stats cover all consumable types', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    expect(stats.consumableStats.length).toBe(4); // 4 consumable types
    for (const c of stats.consumableStats) {
      expect(c.totalUsed).toBeGreaterThanOrEqual(0);
      expect(c.avgPerRun).toBeGreaterThanOrEqual(0);
    }
  });

  it('stage funnel has correct totals', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    expect(stats.stageCompletionFunnel.total).toBe(10);
    expect(stats.stageCompletionFunnel.reachedStage1).toBe(10); // everyone starts at stage 1
    expect(stats.stageCompletionFunnel.reachedStage2).toBeLessThanOrEqual(10);
    expect(stats.stageCompletionFunnel.reachedStage3).toBeLessThanOrEqual(stats.stageCompletionFunnel.reachedStage2);
    expect(stats.stageCompletionFunnel.completed).toBeLessThanOrEqual(stats.stageCompletionFunnel.reachedStage3);
  });

  it('hand outcome distribution totals match', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    const { playerWins, dealerWins, pushes, total } = stats.handOutcomeDistribution;
    expect(playerWins + dealerWins + pushes).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it('hpOverTime has entries per strategy', () => {
    const { results, config } = makeResults(5);
    const stats = aggregateResults(results, config);

    expect(Object.keys(stats.hpOverTime)).toHaveLength(2);
    for (const hp of Object.values(stats.hpOverTime)) {
      expect(hp).toHaveLength(12); // 12 battles across 3 stages
    }
  });
});

describe('Aggregator edge cases', () => {
  it('handles empty results', () => {
    const config: SimConfig = { count: 0, seedPrefix: 'empty', strategies: [] };
    const stats = aggregateResults([], config);

    expect(stats.meta.totalGames).toBe(0);
    expect(stats.byStrategy).toHaveLength(0);
    expect(stats.stageCompletionFunnel.total).toBe(0);
    expect(stats.handOutcomeDistribution.total).toBe(0);
  });

  it('handles single result', () => {
    const result = runGame('single-test', standOn17);
    const config: SimConfig = { count: 1, seedPrefix: 'single-test', strategies: [standOn17] };
    const stats = aggregateResults([result], config);

    expect(stats.meta.totalGames).toBe(1);
    expect(stats.byStrategy).toHaveLength(1);
  });
});
