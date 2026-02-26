import type {
  Equipment, EquipmentSlot, EquipmentTier,
  Consumable, ConsumableType,
  CombatantData, Modifier,
} from './types.js';
import type { ComponentDefinition, ComponentEffect } from './component-schema.js';
import { buildModifier } from './effects.js';

// ── JSON data imports ──
// Import all JSON component files

import weaponsJson from '../../data/components/equipment/weapons.json';
import helmsJson from '../../data/components/equipment/helms.json';
import armorJson from '../../data/components/equipment/armor.json';
import bootsJson from '../../data/components/equipment/boots.json';
import trinketsJson from '../../data/components/equipment/trinkets.json';
import consumablesJson from '../../data/components/consumables/consumables.json';
import stage1Json from '../../data/components/enemies/stage-1.json';
import stage2Json from '../../data/components/enemies/stage-2.json';
import stage3Json from '../../data/components/enemies/stage-3.json';
import strixJson from '../../data/components/bosses/ancient-strix.json';
import muradJson from '../../data/components/bosses/murad.json';
import zahhakJson from '../../data/components/bosses/zahhak.json';

// ── Component Index ──

const ALL_COMPONENTS: ComponentDefinition[] = [
  ...(weaponsJson as ComponentDefinition[]),
  ...(helmsJson as ComponentDefinition[]),
  ...(armorJson as ComponentDefinition[]),
  ...(bootsJson as ComponentDefinition[]),
  ...(trinketsJson as ComponentDefinition[]),
  ...(consumablesJson as ComponentDefinition[]),
  ...(stage1Json as ComponentDefinition[]),
  ...(stage2Json as ComponentDefinition[]),
  ...(stage3Json as ComponentDefinition[]),
  ...(strixJson as ComponentDefinition[]),
  ...(muradJson as ComponentDefinition[]),
  ...(zahhakJson as ComponentDefinition[]),
];

const componentById = new Map<string, ComponentDefinition>();
for (const comp of ALL_COMPONENTS) {
  componentById.set(comp.id, comp);
}

function getComponent(id: string): ComponentDefinition {
  const comp = componentById.get(id);
  if (!comp) throw new Error(`Component not found: ${id}`);
  return comp;
}

// ── Equipment Builder ──

function buildEquipment(comp: ComponentDefinition): Equipment {
  if (!comp.equipment) throw new Error(`Component '${comp.id}' is not equipment`);
  const modifier = buildModifier(
    `mod_${comp.id}`,
    comp.name,
    comp.description,
    'equipment',
    comp.effects as ComponentEffect[],
  );
  return {
    id: comp.id,
    name: comp.name,
    slot: comp.equipment.slot,
    tier: comp.equipment.tier,
    description: comp.description,
    cost: comp.equipment.cost,
    modifier,
  };
}

// Some enemy equipment effects reference the opponent's hand (e.g., Zahhak's
// face_card_damage_bonus counts face cards in playerHand). With perspective='enemy',
// ownHand = dealerHand which would be wrong. These effects need default perspective.
const NEEDS_DEFAULT_PERSPECTIVE = new Set([
  'face_card_damage_bonus', 'ace_damage_bonus', 'even_card_bonus',
  'odd_card_bonus', 'low_card_bonus', 'high_card_bonus',
  'suit_damage_bonus', 'damage_per_card_in_hand',
]);

function buildEnemyEquipment(comp: ComponentDefinition): Equipment {
  // Use enemy perspective unless the effects include types that need default perspective
  const needsDefault = comp.effects.some(e => NEEDS_DEFAULT_PERSPECTIVE.has(e.type));
  const modifier = buildModifier(
    `mod_${comp.id}`,
    comp.name,
    comp.description,
    'enemy',
    comp.effects as ComponentEffect[],
    needsDefault ? undefined : 'enemy',
  );
  return {
    id: comp.id,
    name: comp.name,
    slot: (comp.equipment?.slot ?? 'trinket') as EquipmentSlot,
    tier: 'cloth' as EquipmentTier,
    description: comp.description,
    cost: 0,
    modifier,
  };
}

// ── Cached Equipment ──

let _allEquipment: Equipment[] | null = null;

function getAllPlayerEquipmentComponents(): ComponentDefinition[] {
  return ALL_COMPONENTS.filter(
    c => c.tags.includes('equipment') && !c.tags.includes('enemy') && c.equipment
  );
}

function ensureEquipment(): Equipment[] {
  if (!_allEquipment) {
    _allEquipment = getAllPlayerEquipmentComponents().map(buildEquipment);
  }
  return _allEquipment;
}

export function getAllEquipment(): Equipment[] {
  return [...ensureEquipment()];
}

export function getEquipmentById(id: string): Equipment {
  const found = ensureEquipment().find(e => e.id === id);
  if (!found) throw new Error(`Equipment not found: ${id}`);
  return found;
}

export function getEquipmentBySlotAndTier(slot: EquipmentSlot, tier: EquipmentTier): Equipment {
  const found = ensureEquipment().find(e => e.slot === slot && e.tier === tier);
  if (!found) throw new Error(`Equipment not found: ${slot}/${tier}`);
  return found;
}

// ── Consumable Builder ──

const CONSUMABLE_TYPE_MAP: Record<string, ConsumableType> = {
  'health_potion': 'health_potion',
  'damage_potion': 'damage_potion',
  'strength_potion': 'strength_potion',
  'poison_potion': 'poison_potion',
  'armor_elixir': 'armor_elixir',
  'dodge_brew': 'dodge_brew',
  'regen_draught': 'regen_draught',
  'battle_trance': 'battle_trance',
  'fortune_vessel': 'fortune_vessel',
  'wrath_elixir': 'wrath_elixir',
};

function buildConsumable(comp: ComponentDefinition): Consumable {
  if (!comp.consumable) throw new Error(`Component '${comp.id}' is not a consumable`);
  const type = CONSUMABLE_TYPE_MAP[comp.id];
  if (!type) throw new Error(`No ConsumableType mapping for '${comp.id}'`);

  const primaryEffect = comp.effects[0];
  return {
    id: comp.id,
    name: comp.name,
    type,
    description: comp.description,
    cost: comp.consumable.cost,
    effect: {
      type,
      value: primaryEffect?.value ?? 0,
      duration: comp.consumable.duration,
    },
  };
}

let _allConsumables: Consumable[] | null = null;

function ensureConsumables(): Consumable[] {
  if (!_allConsumables) {
    const comps = ALL_COMPONENTS.filter(c => c.tags.includes('consumable'));
    _allConsumables = comps.map(buildConsumable);
  }
  return _allConsumables;
}

export function getRegistryConsumables(): Consumable[] {
  return [...ensureConsumables()];
}

export function getRegistryConsumableByType(type: ConsumableType): Consumable {
  const found = ensureConsumables().find(c => c.type === type);
  if (!found) throw new Error(`Consumable not found: ${type}`);
  return found;
}

// ── Combatant Builder ──

function buildCombatant(comp: ComponentDefinition): CombatantData {
  if (!comp.combatant) throw new Error(`Component '${comp.id}' is not a combatant`);

  const equipment: Equipment[] = comp.combatant.equipmentIds.map(equipId => {
    const equipComp = getComponent(equipId);
    return buildEnemyEquipment(equipComp);
  });

  let curse: Modifier | undefined;
  if (comp.combatant.curseId) {
    const curseComp = getComponent(comp.combatant.curseId);
    curse = buildModifier(
      curseComp.id,
      curseComp.name,
      curseComp.description,
      'wish_curse',
      curseComp.effects as ComponentEffect[],
    );
  }

  return {
    name: comp.name,
    maxHp: comp.combatant.maxHp,
    isBoss: comp.combatant.isBoss,
    description: comp.description,
    equipment,
    curse,
  };
}

// ── Stage pools ──

const STAGE_POOL_COMPONENTS: ComponentDefinition[][] = [
  ALL_COMPONENTS.filter(c => c.tags.includes('enemy') && c.tags.includes('stage_1') && c.combatant),
  ALL_COMPONENTS.filter(c => c.tags.includes('enemy') && c.tags.includes('stage_2') && c.combatant),
  ALL_COMPONENTS.filter(c => c.tags.includes('enemy') && c.tags.includes('stage_3') && c.combatant),
];

const BOSS_COMPONENTS: ComponentDefinition[] = [
  ALL_COMPONENTS.find(c => c.tags.includes('boss') && c.tags.includes('stage_1') && c.combatant)!,
  ALL_COMPONENTS.find(c => c.tags.includes('boss') && c.tags.includes('stage_2') && c.combatant)!,
  ALL_COMPONENTS.find(c => c.tags.includes('boss') && c.tags.includes('stage_3') && c.combatant)!,
];

export function getRegistryStagePool(stage: number): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return STAGE_POOL_COMPONENTS[stage - 1].map(buildCombatant);
}

export function getRegistryBoss(stage: number): CombatantData {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return buildCombatant(BOSS_COMPONENTS[stage - 1]);
}

export function getRegistrySampleEnemiesForStage(
  stage: number,
  rng: { nextInt(min: number, max: number): number }
): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  const pool = [...STAGE_POOL_COMPONENTS[stage - 1]];
  // Fisher-Yates shuffle using seeded RNG (same algorithm as combatants.ts)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map(buildCombatant);
}
