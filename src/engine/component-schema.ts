import type { EquipmentSlot, EquipmentTier, BlessingCondition, Rank, Suit } from './types.js';
import type { UniversalEffectType } from './effects.js';

export interface ComponentEffect {
  type: UniversalEffectType;
  value: number;
  suit?: Suit;
  rank?: Rank;
  ranks?: Rank[];
  color?: 'red' | 'black';
  condition?: BlessingCondition;
  bonusValue?: number;
  threshold?: number;
  max?: number;
  minScore?: number;
  maxScore?: number;
  duration?: number;
}

export type ComponentTag =
  | 'equipment' | 'consumable' | 'enemy' | 'boss' | 'curse' | 'blessing_template'
  | 'rules_override'
  | 'weapon' | 'helm' | 'armor' | 'boots' | 'trinket'
  | 'cloth' | 'bronze' | 'iron'
  | 'stage_1' | 'stage_2' | 'stage_3'
  | 'damage' | 'defense' | 'healing' | 'economy' | 'utility' | 'dot'
  | 'instant' | 'duration'
  | string; // allow arbitrary user-defined tags

export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  tags: ComponentTag[];
  effects: ComponentEffect[];

  equipment?: {
    slot: EquipmentSlot;
    tier: EquipmentTier;
    cost: number;
  };

  consumable?: {
    cost: number;
    instant: boolean;
    duration?: number;
  };

  combatant?: {
    maxHp: number;
    isBoss: boolean;
    stagePool?: number;
    equipmentIds: string[];
    curseId?: string;
  };

  rulesOverride?: Record<string, number | boolean | string | null>;

  _meta?: {
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    notes?: string;
  };
}
