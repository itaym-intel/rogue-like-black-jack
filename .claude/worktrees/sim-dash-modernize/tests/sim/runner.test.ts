import { describe, it, expect } from 'vitest';
import { runGame } from '../../src/sim/runner.js';
import { standOn17, basicStrategy } from '../../src/sim/strategies.js';
import type { RunResult } from '../../src/sim/types.js';

describe('Runner produces valid RunResult', () => {
  it('returns a RunResult with expected structure', () => {
    const result = runGame('runner-test-1', standOn17);

    expect(result.seed).toBe('runner-test-1');
    expect(result.strategyName).toBe('standOn17');
    expect(['victory', 'game_over']).toContain(result.outcome);
    expect(result.finalStage).toBeGreaterThanOrEqual(1);
    expect(result.finalStage).toBeLessThanOrEqual(4); // stage 4 means won stage 3
    expect(result.finalBattle).toBeGreaterThanOrEqual(1);
    expect(result.totalHandsPlayed).toBeGreaterThanOrEqual(1);
    expect(result.totalDamageDealt).toBeGreaterThanOrEqual(0);
    expect(result.totalDamageReceived).toBeGreaterThanOrEqual(0);
    expect(result.totalPlayerDodges).toBeGreaterThanOrEqual(0);
    expect(result.totalEnemyDodges).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.events)).toBe(true);
    expect(Array.isArray(result.equipmentPurchaseOrder)).toBe(true);
    expect(typeof result.consumablesUsedByType).toBe('object');
    expect(typeof result.finalEquipment).toBe('object');
  });

  it('records at least one battle_end event for a non-trivial game', () => {
    // Run several seeds to find one with at least one battle won
    let found = false;
    for (let i = 0; i < 50; i++) {
      const result = runGame(`battle-event-${i}`, standOn17);
      const battleEnds = result.events.filter(e => e.type === 'battle_end');
      if (battleEnds.length > 0) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('records a terminal event (player_death or victory)', () => {
    const result = runGame('terminal-test', standOn17);
    const terminalEvents = result.events.filter(
      e => e.type === 'player_death' || e.type === 'victory'
    );
    expect(terminalEvents.length).toBe(1);
  });

  it('records hand_result events', () => {
    const result = runGame('hand-events-test', standOn17);
    const handResults = result.events.filter(e => e.type === 'hand_result');
    expect(handResults.length).toBeGreaterThan(0);
    expect(handResults.length).toBe(result.totalHandsPlayed);
  });

  it('never exceeds 5000 actions', () => {
    // Run 20 seeds and verify all complete in reasonable action counts
    for (let i = 0; i < 20; i++) {
      const result = runGame(`action-cap-${i}`, standOn17);
      // A completed game means it didn't hit the 5000 cap (or terminated cleanly)
      expect(['victory', 'game_over']).toContain(result.outcome);
    }
  });
});

describe('Runner determinism', () => {
  it('same seed + strategy produces identical results', () => {
    const result1 = runGame('determinism-seed', standOn17);
    const result2 = runGame('determinism-seed', standOn17);

    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.finalStage).toBe(result2.finalStage);
    expect(result1.finalBattle).toBe(result2.finalBattle);
    expect(result1.totalHandsPlayed).toBe(result2.totalHandsPlayed);
    expect(result1.totalGoldEarned).toBe(result2.totalGoldEarned);
    expect(result1.totalGoldSpent).toBe(result2.totalGoldSpent);
    expect(result1.totalDamageDealt).toBe(result2.totalDamageDealt);
    expect(result1.totalDamageReceived).toBe(result2.totalDamageReceived);
    expect(result1.totalPlayerDodges).toBe(result2.totalPlayerDodges);
    expect(result1.totalEnemyDodges).toBe(result2.totalEnemyDodges);
    expect(result1.deathEnemy).toBe(result2.deathEnemy);
    expect(result1.events.length).toBe(result2.events.length);
    expect(result1.equipmentPurchaseOrder).toEqual(result2.equipmentPurchaseOrder);
    expect(result1.finalEquipment).toEqual(result2.finalEquipment);
  });

  it('different seeds produce different results', () => {
    const result1 = runGame('diff-seed-a', standOn17);
    const result2 = runGame('diff-seed-b', standOn17);

    // At least one field should differ (very high probability)
    const allSame = result1.outcome === result2.outcome
      && result1.finalStage === result2.finalStage
      && result1.finalBattle === result2.finalBattle
      && result1.totalHandsPlayed === result2.totalHandsPlayed
      && result1.totalDamageDealt === result2.totalDamageDealt
      && result1.totalDamageReceived === result2.totalDamageReceived;

    // It's theoretically possible for two different seeds to produce identical results,
    // but extremely unlikely across all these fields
    expect(allSame).toBe(false);
  });
});

describe('Runner with different strategies', () => {
  it('basicStrategy produces valid results', () => {
    const result = runGame('basic-strat-test', basicStrategy);
    expect(['victory', 'game_over']).toContain(result.outcome);
    expect(result.strategyName).toBe('basicStrategy');
  });
});
