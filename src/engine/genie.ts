import type { CombatantData, GenieEncounter, Wish, Modifier, BlessingDefinition } from './types.js';
import { validateBlessingDefinition, buildBlessingModifier } from './blessings.js';

export function createGenieEncounter(boss: CombatantData): GenieEncounter {
  const curseModifier: Modifier = boss.curse ?? {
    id: 'curse_none',
    name: 'No Curse',
    description: 'No curse',
    source: 'wish_curse',
  };

  return {
    bossName: boss.name,
    curseModifier,
    blessingText: null,
  };
}

export function storeBlessingWish(
  encounter: GenieEncounter,
  text: string,
  blessingDef?: BlessingDefinition
): Wish {
  // Enforce 40-character limit
  const trimmedText = text.slice(0, 40);
  encounter.blessingText = trimmedText;

  let blessing: Modifier | null = null;
  if (blessingDef) {
    const validated = validateBlessingDefinition(blessingDef);
    blessing = buildBlessingModifier(validated);
  }

  return {
    blessingText: trimmedText,
    blessing,
    curse: encounter.curseModifier,
    bossName: encounter.bossName,
  };
}
