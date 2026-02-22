import { describe, it, expect } from 'vitest';
import { createGenieEncounter, storeBlessingWish } from '../src/engine/genie.js';
import { getBossForStage } from '../src/engine/combatants.js';
import type { BlessingDefinition } from '../src/engine/types.js';

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

  it('wish without BlessingDefinition has null blessing', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    const wish = storeBlessingWish(encounter, 'give me super strength');
    expect(wish.blessingText).toBe('give me super strength');
    expect(wish.blessing).toBeNull();
  });

  it('wish with BlessingDefinition creates blessing modifier', () => {
    const boss = getBossForStage(1);
    const encounter = createGenieEncounter(boss);
    const def: BlessingDefinition = {
      name: 'Solar Fury',
      description: 'Burns with the power of the sun',
      effects: [{ type: 'flat_damage_bonus', value: 8 }],
    };
    const wish = storeBlessingWish(encounter, 'I wish for fire power', def);
    expect(wish.blessing).not.toBeNull();
    expect(wish.blessing!.name).toBe('Solar Fury');
    expect(wish.blessing!.source).toBe('wish_blessing');
    expect(wish.blessing!.modifyDamageDealt).toBeDefined();
  });
});
