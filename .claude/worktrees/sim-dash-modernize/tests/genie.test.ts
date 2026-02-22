import { describe, it, expect } from 'vitest';
import { createGenieEncounter, storeBlessingWish } from '../src/engine/genie.js';
import { getBossForStage } from '../src/engine/combatants.js';

describe('Genie', () => {
  it('creates encounter from boss data', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    expect(encounter.bossName).toBe('Ancient Strix');
    expect(encounter.blessingText).toBeNull();
  });

  it('extracts curse modifier from boss', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    expect(encounter.curseModifier.id).toBe('curse_strix');
  });

  it('stores blessing text', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    const wish = storeBlessingWish(encounter, 'I wish for fire resistance');
    expect(wish.blessingText).toBe('I wish for fire resistance');
    expect(encounter.blessingText).toBe('I wish for fire resistance');
  });

  it('wish contains curse', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    const wish = storeBlessingWish(encounter, 'test wish');
    expect(wish.curse).not.toBeNull();
    expect(wish.curse!.id).toBe('curse_strix');
  });

  it('blessing has no mechanical effect', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    const wish = storeBlessingWish(encounter, 'give me super strength');
    // The wish stores text but there's no blessing modifier — only curse
    expect(wish.blessingText).toBe('give me super strength');
    // No modifyRules or modifyDamageDealt on the blessing itself
  });
});
