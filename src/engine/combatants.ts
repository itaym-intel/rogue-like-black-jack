// Re-export from universal component registry
import type { CombatantData } from './types.js';
import {
  getRegistryStagePool,
  getRegistryBoss,
  getRegistrySampleEnemiesForStage,
} from './component-registry.js';

// Maintain backward-compatible STAGE_POOLS constant
export const STAGE_POOLS: CombatantData[][] = [
  getRegistryStagePool(1),
  getRegistryStagePool(2),
  getRegistryStagePool(3),
];

export function getEnemiesForStage(stage: number): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return STAGE_POOLS[stage - 1].slice(0, 3);
}

export function sampleEnemiesForStage(
  stage: number,
  rng: { nextInt(min: number, max: number): number }
): CombatantData[] {
  return getRegistrySampleEnemiesForStage(stage, rng);
}

export function getBossForStage(stage: number): CombatantData {
  return getRegistryBoss(stage);
}
