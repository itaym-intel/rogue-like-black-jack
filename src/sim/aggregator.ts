import type {
  RunResult, SimConfig, AggregateStats, StrategyStats,
  EquipmentStat, ConsumableStat, EnemyStat,
  HandResultEvent, BattleEndEvent, ShopPurchaseEvent,
} from './types.js';
import { getAllEquipment } from '../engine/equipment.js';
import { getAllConsumables } from '../engine/consumables.js';

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function damageBucket(dmg: number): string {
  if (dmg === 0) return '0';
  if (dmg <= 5) return '1-5';
  if (dmg <= 10) return '6-10';
  if (dmg <= 15) return '11-15';
  if (dmg <= 20) return '16-20';
  return '21+';
}

export function aggregateResults(results: RunResult[], config: SimConfig): AggregateStats {
  const startTime = Date.now();

  // ── By Strategy ──
  const byStrategyMap = new Map<string, RunResult[]>();
  for (const r of results) {
    const arr = byStrategyMap.get(r.strategyName) ?? [];
    arr.push(r);
    byStrategyMap.set(r.strategyName, arr);
  }

  const byStrategy: StrategyStats[] = [];
  for (const [name, runs] of byStrategyMap) {
    const wins = runs.filter(r => r.outcome === 'victory').length;
    byStrategy.push({
      name,
      winRate: runs.length > 0 ? wins / runs.length : 0,
      avgStageReached: avg(runs.map(r => r.finalStage)),
      avgBattleReached: avg(runs.map(r => (r.finalStage - 1) * 4 + r.finalBattle)),
      avgHandsPlayed: avg(runs.map(r => r.totalHandsPlayed)),
      avgGoldEarned: avg(runs.map(r => r.totalGoldEarned)),
      avgGoldSpent: avg(runs.map(r => r.totalGoldSpent)),
      avgDamageDealt: avg(runs.map(r => r.totalDamageDealt)),
      avgDamageReceived: avg(runs.map(r => r.totalDamageReceived)),
      avgPlayerDodges: avg(runs.map(r => r.totalPlayerDodges)),
      avgEnemyDodges: avg(runs.map(r => r.totalEnemyDodges)),
    });
  }

  // ── Equipment Stats ──
  const allEquipment = getAllEquipment();
  const equipmentStats: EquipmentStat[] = allEquipment.map(eq => {
    const runsThatBought = results.filter(r => r.equipmentPurchaseOrder.includes(eq.id));
    const runsThatDidntBuy = results.filter(r => !r.equipmentPurchaseOrder.includes(eq.id));
    const winsBought = runsThatBought.filter(r => r.outcome === 'victory').length;
    const winsNotBought = runsThatDidntBuy.filter(r => r.outcome === 'victory').length;

    // Average purchase timing
    const purchaseEvents = results.flatMap(r =>
      r.events
        .filter((e): e is ShopPurchaseEvent => e.type === 'shop_purchase' && e.itemId === eq.id)
    );
    const avgBattle = purchaseEvents.length > 0
      ? avg(purchaseEvents.map(e => (e.stage - 1) * 4 + e.battleNumber))
      : 0;
    const avgStage = purchaseEvents.length > 0
      ? avg(purchaseEvents.map(e => e.stage))
      : 0;

    return {
      id: eq.id,
      name: eq.name,
      slot: eq.slot,
      tier: eq.tier,
      purchaseCount: runsThatBought.length,
      purchaseRate: results.length > 0 ? runsThatBought.length / results.length : 0,
      winRateWhenPurchased: runsThatBought.length > 0 ? winsBought / runsThatBought.length : 0,
      winRateWhenNotPurchased: runsThatDidntBuy.length > 0 ? winsNotBought / runsThatDidntBuy.length : 0,
      avgPurchaseBattle: avgBattle,
      avgPurchaseStage: avgStage,
    };
  });

  // ── Consumable Stats ──
  const allConsumables = getAllConsumables();
  const consumableStats: ConsumableStat[] = allConsumables.map(c => {
    let totalUsed = 0;
    let usedInWinning = 0;
    let usedInLosing = 0;
    for (const r of results) {
      const count = r.consumablesUsedByType[c.type] ?? 0;
      totalUsed += count;
      if (r.outcome === 'victory') usedInWinning += count;
      else usedInLosing += count;
    }
    return {
      type: c.type,
      name: c.name,
      totalUsed,
      avgPerRun: results.length > 0 ? totalUsed / results.length : 0,
      usedInWinningRuns: usedInWinning,
      usedInLosingRuns: usedInLosing,
    };
  });

  // ── Enemy Stats ──
  const enemyMap = new Map<string, { isBoss: boolean; stage: number; deaths: number; handsToDefeat: number[]; dmgDealtTo: number[]; dmgReceivedFrom: number[] }>();
  for (const r of results) {
    // Deaths
    if (r.deathEnemy) {
      const entry = enemyMap.get(r.deathEnemy) ?? { isBoss: false, stage: 0, deaths: 0, handsToDefeat: [], dmgDealtTo: [], dmgReceivedFrom: [] };
      entry.deaths++;
      enemyMap.set(r.deathEnemy, entry);
    }

    // Battle ends
    for (const e of r.events) {
      if (e.type === 'battle_end') {
        const entry = enemyMap.get(e.enemyName) ?? { isBoss: false, stage: 0, deaths: 0, handsToDefeat: [], dmgDealtTo: [], dmgReceivedFrom: [] };
        entry.stage = e.stage;
        entry.handsToDefeat.push(e.handsPlayed);
        enemyMap.set(e.enemyName, entry);
      }
      if (e.type === 'hand_result') {
        // We'll aggregate damage by enemy from hand results contextually
        // This is complex to attribute per-enemy from events, so we'll use battle_end data
      }
    }
  }

  // Determine boss/non-boss from battle events
  const knownBosses = new Set(['Ancient Strix', 'Djinn Warden', 'Crimson Sultan']);
  const enemyStats: EnemyStat[] = Array.from(enemyMap.entries()).map(([name, data]) => ({
    name,
    isBoss: knownBosses.has(name),
    stage: data.stage,
    deathsTo: data.deaths,
    avgHandsToDefeat: avg(data.handsToDefeat),
    avgDamageDealtTo: 0, // Would need per-enemy damage tracking
    avgDamageReceivedFrom: 0,
  }));

  // ── Stage Completion Funnel ──
  let reachedStage1 = 0;
  let reachedStage2 = 0;
  let reachedStage3 = 0;
  let completed = 0;
  for (const r of results) {
    reachedStage1++;
    if (r.finalStage >= 2 || r.outcome === 'victory') reachedStage2++;
    if (r.finalStage >= 3 || r.outcome === 'victory') reachedStage3++;
    if (r.outcome === 'victory') completed++;
  }

  // ── Purchase Order Stats ──
  const purchaseOrderStats: Record<string, Record<string, number>> = {};
  const slots = ['weapon', 'helm', 'armor', 'boots', 'trinket'];
  for (const slot of slots) {
    const tierCounts: Record<string, number> = { cloth: 0, bronze: 0, iron: 0 };
    for (const r of results) {
      // Find first purchase of this slot
      const firstPurchase = r.events.find(
        (e): e is ShopPurchaseEvent => e.type === 'shop_purchase' && e.slot === slot
      );
      if (firstPurchase && firstPurchase.tier) {
        tierCounts[firstPurchase.tier] = (tierCounts[firstPurchase.tier] ?? 0) + 1;
      }
    }
    purchaseOrderStats[slot] = tierCounts;
  }

  // ── Hand Outcome Distribution ──
  let playerWins = 0;
  let dealerWins = 0;
  let pushes = 0;
  for (const r of results) {
    for (const e of r.events) {
      if (e.type === 'hand_result') {
        if (e.winner === 'player') playerWins++;
        else if (e.winner === 'dealer') dealerWins++;
        else pushes++;
      }
    }
  }
  const totalHands = playerWins + dealerWins + pushes;

  // ── Damage Distribution ──
  const playerDealt: Record<string, number> = { '0': 0, '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21+': 0 };
  const enemyDealt: Record<string, number> = { '0': 0, '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21+': 0 };
  for (const r of results) {
    for (const e of r.events) {
      if (e.type === 'hand_result') {
        if (e.damageTarget === 'dealer') {
          const bucket = damageBucket(e.damageDealt);
          playerDealt[bucket] = (playerDealt[bucket] ?? 0) + 1;
        } else if (e.damageTarget === 'player') {
          const bucket = damageBucket(e.damageDealt);
          enemyDealt[bucket] = (enemyDealt[bucket] ?? 0) + 1;
        } else {
          playerDealt['0']++;
          enemyDealt['0']++;
        }
      }
    }
  }

  // ── HP Over Time ──
  // Average HP at the start of each battle (1-12) per strategy
  const hpOverTime: Record<string, number[]> = {};
  for (const [stratName, runs] of byStrategyMap) {
    const battleHps: number[][] = Array.from({ length: 12 }, () => []);

    for (const r of runs) {
      // Track HP at each battle from hand_result events
      const battleFirstHp = new Map<number, number>();
      let currentHp = 50; // starting HP

      for (const e of r.events) {
        if (e.type === 'hand_result') {
          const battleIndex = (e.stage - 1) * 4 + e.battleNumber - 1;
          if (!battleFirstHp.has(battleIndex) && battleIndex < 12) {
            battleFirstHp.set(battleIndex, e.playerHp + (e.damageTarget === 'player' && !e.dodged ? e.damageDealt : 0));
          }
        }
      }

      for (const [idx, hp] of battleFirstHp) {
        if (idx < 12) battleHps[idx].push(hp);
      }
    }

    hpOverTime[stratName] = battleHps.map(hps => hps.length > 0 ? avg(hps) : 0);
  }

  return {
    meta: {
      timestamp: new Date().toISOString(),
      totalGames: results.length,
      seedPrefix: config.seedPrefix,
      seedCount: config.count,
      strategies: config.strategies.map(s => s.name),
      durationMs: Date.now() - startTime,
    },
    byStrategy,
    equipmentStats,
    consumableStats,
    enemyStats,
    stageCompletionFunnel: { reachedStage1, reachedStage2, reachedStage3, completed, total: results.length },
    purchaseOrderStats,
    handOutcomeDistribution: { playerWins, dealerWins, pushes, total: totalHands },
    damageDistribution: { playerDealt, enemyDealt },
    hpOverTime,
  };
}
