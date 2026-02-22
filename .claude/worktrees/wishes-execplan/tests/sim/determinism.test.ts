import { describe, it, expect } from 'vitest';
import { runGame } from '../../src/sim/runner.js';
import { standOn17, basicStrategy, ALL_STRATEGIES } from '../../src/sim/strategies.js';

describe('Determinism: identical seeds produce identical results', () => {
  const seeds = Array.from({ length: 10 }, (_, i) => `det-${i}`);

  it('standOn17: 10 seeds run twice produce identical results', () => {
    for (const seed of seeds) {
      const run1 = runGame(seed, standOn17);
      const run2 = runGame(seed, standOn17);

      expect(run1.outcome).toBe(run2.outcome);
      expect(run1.finalStage).toBe(run2.finalStage);
      expect(run1.finalBattle).toBe(run2.finalBattle);
      expect(run1.totalHandsPlayed).toBe(run2.totalHandsPlayed);
      expect(run1.totalGoldEarned).toBe(run2.totalGoldEarned);
      expect(run1.totalGoldSpent).toBe(run2.totalGoldSpent);
      expect(run1.totalDamageDealt).toBe(run2.totalDamageDealt);
      expect(run1.totalDamageReceived).toBe(run2.totalDamageReceived);
      expect(run1.totalPlayerDodges).toBe(run2.totalPlayerDodges);
      expect(run1.totalEnemyDodges).toBe(run2.totalEnemyDodges);
      expect(run1.deathEnemy).toBe(run2.deathEnemy);
      expect(run1.events.length).toBe(run2.events.length);
      expect(run1.equipmentPurchaseOrder).toEqual(run2.equipmentPurchaseOrder);
      expect(run1.consumablesUsedByType).toEqual(run2.consumablesUsedByType);
      expect(run1.finalEquipment).toEqual(run2.finalEquipment);
    }
  });

  it('basicStrategy: 10 seeds run twice produce identical results', () => {
    for (const seed of seeds) {
      const run1 = runGame(seed, basicStrategy);
      const run2 = runGame(seed, basicStrategy);

      expect(run1.outcome).toBe(run2.outcome);
      expect(run1.finalStage).toBe(run2.finalStage);
      expect(run1.finalBattle).toBe(run2.finalBattle);
      expect(run1.totalHandsPlayed).toBe(run2.totalHandsPlayed);
      expect(run1.totalGoldEarned).toBe(run2.totalGoldEarned);
      expect(run1.totalGoldSpent).toBe(run2.totalGoldSpent);
      expect(run1.totalDamageDealt).toBe(run2.totalDamageDealt);
      expect(run1.totalDamageReceived).toBe(run2.totalDamageReceived);
      expect(run1.events.length).toBe(run2.events.length);
    }
  });

  it('all strategies are deterministic with a shared seed', () => {
    const seed = 'all-strat-det';
    for (const strategy of ALL_STRATEGIES) {
      const run1 = runGame(seed, strategy);
      const run2 = runGame(seed, strategy);

      expect(run1.outcome).toBe(run2.outcome);
      expect(run1.totalHandsPlayed).toBe(run2.totalHandsPlayed);
      expect(run1.totalDamageDealt).toBe(run2.totalDamageDealt);
      expect(run1.events.length).toBe(run2.events.length);
    }
  });
});
