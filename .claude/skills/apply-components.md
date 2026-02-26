# Apply Components

Regenerate the TypeScript engine registry from JSON component data files, run tests, and optionally commit.

## When to Use

Run `/apply-components` after making changes in the Component Editor (`npm run dev:editor`) to apply JSON changes to the game engine.

## What This Skill Does

1. Reads all JSON component files from `data/components/`
2. Validates the data (unique IDs, required fields, valid effect types)
3. Regenerates `src/engine/component-registry.ts` from the JSON data
4. Runs `npm test` to verify all tests pass
5. If tests pass: stages changes and commits
6. If tests fail: reports failures, does NOT commit

## File Locations

- **JSON data (source of truth):**
  - `data/components/equipment/weapons.json`
  - `data/components/equipment/helms.json`
  - `data/components/equipment/armor.json`
  - `data/components/equipment/boots.json`
  - `data/components/equipment/trinkets.json`
  - `data/components/consumables/consumables.json`
  - `data/components/enemies/stage-1.json`
  - `data/components/enemies/stage-2.json`
  - `data/components/enemies/stage-3.json`
  - `data/components/bosses/ancient-strix.json`
  - `data/components/bosses/murad.json`
  - `data/components/bosses/zahhak.json`
  - `data/components/rules/defaults.json`

- **Generated registry:** `src/engine/component-registry.ts`
- **Pending commit message:** `data/components/.pending-commit.json` (optional)

## Step-by-Step Instructions

### Step 1: Read all JSON files

Read every JSON file listed above. Parse them and collect all `ComponentDefinition` objects into a single array.

### Step 2: Validate

Check:
- Every component has `id`, `name`, `description`, `tags`, `effects`
- All IDs are unique
- Every `effects[].type` is a valid `UniversalEffectType` (see `src/engine/effects.ts` for the list)
- Equipment components have `equipment.slot`, `equipment.tier`, `equipment.cost`
- Consumable components have `consumable.cost` and `consumable.instant`
- Combatant components have `combatant.maxHp` and `combatant.equipmentIds`
- All `combatant.equipmentIds` reference existing component IDs
- All `combatant.curseId` values reference existing component IDs

If validation fails, report errors and stop.

### Step 3: Regenerate component-registry.ts

The generated file must follow this exact structure. Read the current `src/engine/component-registry.ts` to see the pattern, then regenerate it to reflect any changes in the JSON data.

The file structure is:

```typescript
import type {
  Equipment, EquipmentSlot, EquipmentTier,
  Consumable, ConsumableType,
  CombatantData, Modifier,
} from './types.js';
import type { ComponentDefinition, ComponentEffect } from './component-schema.js';
import { buildModifier } from './effects.js';

// ── JSON data imports ──
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
  // ... all other imports spread in
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
function buildEquipment(comp: ComponentDefinition): Equipment { ... }
function buildEnemyEquipment(comp: ComponentDefinition): Equipment { ... }

// ── Cached Equipment ──
export function getAllEquipment(): Equipment[] { ... }
export function getEquipmentById(id: string): Equipment { ... }
export function getEquipmentBySlotAndTier(slot, tier): Equipment { ... }

// ── Consumable Builder ──
// CONSUMABLE_TYPE_MAP maps component IDs to ConsumableType
function buildConsumable(comp: ComponentDefinition): Consumable { ... }
export function getRegistryConsumables(): Consumable[] { ... }
export function getRegistryConsumableByType(type): Consumable { ... }

// ── Combatant Builder ──
function buildCombatant(comp: ComponentDefinition): CombatantData { ... }

// ── Stage pools ──
export function getRegistryStagePool(stage: number): CombatantData[] { ... }
export function getRegistryBoss(stage: number): CombatantData { ... }
export function getRegistrySampleEnemiesForStage(stage, rng): CombatantData[] { ... }
```

Key details for the regeneration:
- `NEEDS_DEFAULT_PERSPECTIVE` set contains effect types that need default (player) perspective even for enemy equipment: `face_card_damage_bonus`, `ace_damage_bonus`, `even_card_bonus`, `odd_card_bonus`, `low_card_bonus`, `high_card_bonus`, `suit_damage_bonus`, `damage_per_card_in_hand`
- `buildEnemyEquipment` uses `perspective: 'enemy'` unless the component has effects in `NEEDS_DEFAULT_PERSPECTIVE`
- `CONSUMABLE_TYPE_MAP` maps consumable IDs to `ConsumableType` enum values
- Stage pools are filtered by `tags.includes('enemy') && tags.includes('stage_N') && c.combatant`
- Bosses are filtered by `tags.includes('boss') && tags.includes('stage_N') && c.combatant`

### Step 4: Run tests

```bash
npm test
```

All tests must pass. If any fail, report them and do NOT proceed to commit.

### Step 5: Commit

Read `data/components/.pending-commit.json` if it exists for a commit description. If it doesn't exist, use the command-line argument as the commit message, or default to "Update components from editor".

```bash
git add data/components/ src/engine/component-registry.ts
git commit -m "<message>"
```

Delete `.pending-commit.json` after committing if it existed.

Do NOT push unless the user explicitly asks.

## New Component Checklist

When a new consumable is added, ensure:
1. Its ID is added to `CONSUMABLE_TYPE_MAP` in `component-registry.ts`
2. The `ConsumableType` union in `types.ts` includes the new type
3. `applyConsumable()` in `consumables.ts` has a case for the new type
4. `tickActiveEffects()` handles duration effects if applicable

When a new enemy/boss is added, ensure:
1. Its equipment component IDs exist in the same JSON file or another file
2. If it has a curse, the curse component exists
3. Its stage tag matches where it should appear

When a new equipment slot or tier is added:
1. Update the `EquipmentSlot` / `EquipmentTier` types in `types.ts`
2. Update shop logic in `src/engine/shop.ts`

## Example Usage

```
/apply-components "Buffed Flint Spear damage to 7, added new bronze trinket"
```

This reads all JSON, regenerates the registry, runs tests, and commits with the given message.
