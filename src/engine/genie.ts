import type { CombatantData, GenieEncounter, Wish, Modifier } from './types.js';

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

export function storeBlessingWish(encounter: GenieEncounter, text: string): Wish {
  encounter.blessingText = text;
  return {
    blessingText: text,
    blessing: text,
    curse: encounter.curseModifier,
    bossName: encounter.bossName,
  };
}
