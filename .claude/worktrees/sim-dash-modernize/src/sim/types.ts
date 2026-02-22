import type { GameView, PlayerAction, EquipmentSlot, EquipmentTier } from '../engine/types.js';

// ── Strategy ──

export interface Strategy {
  name: string;
  description: string;
  decideAction(view: GameView): PlayerAction;
}

// ── Run Events ──

export type RunEvent =
  | HandResultEvent
  | BattleEndEvent
  | ShopPurchaseEvent
  | ConsumableUseEvent
  | PlayerDeathEvent
  | VictoryEvent;

export interface HandResultEvent {
  type: 'hand_result';
  winner: 'player' | 'dealer' | 'push';
  playerScore: number;
  dealerScore: number;
  damageDealt: number;
  damageTarget: 'player' | 'dealer' | 'none';
  dodged: boolean;
  playerHp: number;
  enemyHp: number;
  handNumber: number;
  battleNumber: number;
  stage: number;
  playerBusted: boolean;
  dealerBusted: boolean;
  playerBlackjack: boolean;
  dealerBlackjack: boolean;
}

export interface BattleEndEvent {
  type: 'battle_end';
  enemyName: string;
  stage: number;
  battleNumber: number;
  handsPlayed: number;
  playerHpRemaining: number;
  goldEarned: number;
}

export interface ShopPurchaseEvent {
  type: 'shop_purchase';
  itemId: string;
  itemName: string;
  itemType: 'equipment' | 'consumable';
  slot: EquipmentSlot | null;
  tier: EquipmentTier | null;
  cost: number;
  goldRemaining: number;
  stage: number;
  battleNumber: number;
}

export interface ConsumableUseEvent {
  type: 'consumable_use';
  consumableType: string;
  stage: number;
  battleNumber: number;
  handNumber: number;
}

export interface PlayerDeathEvent {
  type: 'player_death';
  killingEnemy: string;
  stage: number;
  battleNumber: number;
  playerHp: 0;
  totalHandsPlayed: number;
}

export interface VictoryEvent {
  type: 'victory';
  finalHp: number;
  finalGold: number;
  totalHandsPlayed: number;
  finalEquipment: Record<string, string | null>;
  cursesAccumulated: number;
}

// ── Run Result ──

export interface RunResult {
  seed: string;
  strategyName: string;
  outcome: 'victory' | 'game_over';
  finalStage: number;
  finalBattle: number;
  totalHandsPlayed: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalPlayerDodges: number;
  totalEnemyDodges: number;
  events: RunEvent[];
  equipmentPurchaseOrder: string[];
  consumablesUsedByType: Record<string, number>;
  finalEquipment: Record<string, string | null>;
  deathEnemy: string | null;
  durationMs: number;
}

// ── Sim Config ──

export interface SimConfig {
  count: number;
  seedPrefix: string;
  strategies: Strategy[];
}

// ── Sim Progress ──

export interface SimProgress {
  totalGames: number;
  completedGames: number;
  currentStrategy: string;
  currentSeed: string;
  startTime: string;
  estimatedEndTime: string | null;
  partialResults: Array<{
    name: string;
    completed: number;
    winCount: number;
    lossCount: number;
  }>;
}

// ── Aggregate Stats ──

export interface StrategyStats {
  name: string;
  winRate: number;
  avgStageReached: number;
  avgBattleReached: number;
  avgHandsPlayed: number;
  avgGoldEarned: number;
  avgGoldSpent: number;
  avgDamageDealt: number;
  avgDamageReceived: number;
  avgPlayerDodges: number;
  avgEnemyDodges: number;
}

export interface EquipmentStat {
  id: string;
  name: string;
  slot: EquipmentSlot;
  tier: EquipmentTier;
  purchaseCount: number;
  purchaseRate: number;
  winRateWhenPurchased: number;
  winRateWhenNotPurchased: number;
  avgPurchaseBattle: number;
  avgPurchaseStage: number;
}

export interface ConsumableStat {
  type: string;
  name: string;
  totalUsed: number;
  avgPerRun: number;
  usedInWinningRuns: number;
  usedInLosingRuns: number;
}

export interface EnemyStat {
  name: string;
  isBoss: boolean;
  stage: number;
  deathsTo: number;
  avgHandsToDefeat: number;
  avgDamageDealtTo: number;
  avgDamageReceivedFrom: number;
}

export interface AggregateStats {
  meta: {
    timestamp: string;
    totalGames: number;
    seedPrefix: string;
    seedCount: number;
    strategies: string[];
    durationMs: number;
  };
  byStrategy: StrategyStats[];
  equipmentStats: EquipmentStat[];
  consumableStats: ConsumableStat[];
  enemyStats: EnemyStat[];
  stageCompletionFunnel: {
    reachedStage1: number;
    reachedStage2: number;
    reachedStage3: number;
    completed: number;
    total: number;
  };
  purchaseOrderStats: Record<string, Record<string, number>>;
  handOutcomeDistribution: {
    playerWins: number;
    dealerWins: number;
    pushes: number;
    total: number;
  };
  damageDistribution: {
    playerDealt: Record<string, number>;
    enemyDealt: Record<string, number>;
  };
  hpOverTime: Record<string, number[]>;
}
