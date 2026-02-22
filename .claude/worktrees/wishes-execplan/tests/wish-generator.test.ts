import { describe, it, expect } from 'vitest';
import { buildWishContext } from '../src/llm/wish-generator.js';
import type { GameView } from '../src/engine/types.js';

function makeMockView(overrides?: Partial<GameView>): GameView {
  return {
    phase: 'genie',
    seed: 'test',
    stage: 1,
    battle: 4,
    handNumber: 1,
    player: {
      hp: 35,
      maxHp: 50,
      gold: 45,
      equipment: {
        weapon: { id: 'weapon_cloth', name: 'Flint Spear', slot: 'weapon', tier: 'cloth', description: '+5 damage', cost: 30, modifier: { id: 'mod', name: 'Flint Spear', description: '+5 damage', source: 'equipment' } },
        helm: null,
        armor: null,
        boots: { id: 'boots_cloth', name: 'Cloth Boots', slot: 'boots', tier: 'cloth', description: '10% dodge', cost: 20, modifier: { id: 'mod2', name: 'Cloth Boots', description: '10% dodge', source: 'equipment' } },
        trinket: null,
      },
      consumables: [
        { id: 'health_potion', name: 'Health Potion', type: 'health_potion', description: 'Heals 15 HP', cost: 10, effect: { type: 'health_potion', value: 15 } },
      ],
      wishes: [
        {
          blessingText: 'I wish for power',
          blessing: { id: 'b1', name: 'Power', description: 'More power', source: 'wish_blessing' },
          curse: { id: 'c1', name: 'Night Fang Curse', description: 'A dark curse', source: 'wish_curse' },
          bossName: 'Ancient Strix',
        },
      ],
      activeEffects: [],
      hand: null,
      handScore: null,
    },
    enemy: null,
    shop: null,
    genie: { bossName: 'Sand Djinn', curseDescription: '3 damage per hand', blessingEntered: false, blessingName: null, blessingDescription: null },
    lastHandResult: null,
    availableActions: [],
    log: [],
    ...overrides,
  };
}

describe('buildWishContext', () => {
  it('extracts player HP correctly', () => {
    const view = makeMockView();
    const ctx = buildWishContext(view);
    expect(ctx.playerHp).toBe(35);
    expect(ctx.playerMaxHp).toBe(50);
  });

  it('extracts gold', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.playerGold).toBe(45);
  });

  it('extracts equipped item names', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.equippedItems).toEqual(['Flint Spear', 'Cloth Boots']);
  });

  it('extracts consumable names', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.consumables).toEqual(['Health Potion']);
  });

  it('extracts stage and boss name', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.currentStage).toBe(1);
    expect(ctx.bossDefeated).toBe('Sand Djinn');
  });

  it('extracts existing blessings and curses', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.existingBlessings).toEqual(['More power']);
    expect(ctx.existingCurses).toEqual(['Night Fang Curse']);
  });

  it('handles empty equipment and wishes', () => {
    const view = makeMockView();
    view.player.equipment = { weapon: null, helm: null, armor: null, boots: null, trinket: null };
    view.player.consumables = [];
    view.player.wishes = [];
    const ctx = buildWishContext(view);
    expect(ctx.equippedItems).toEqual([]);
    expect(ctx.consumables).toEqual([]);
    expect(ctx.existingBlessings).toEqual([]);
    expect(ctx.existingCurses).toEqual([]);
  });
});

describe('generateBlessing fallback', () => {
  it('returns fallback when no API key is set', async () => {
    // Save and clear env var
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { generateBlessing } = await import('../src/llm/wish-generator.js');
    const result = await generateBlessing('I wish for fire', {
      playerHp: 50, playerMaxHp: 50, playerGold: 30,
      equippedItems: [], consumables: [],
      currentStage: 1, bossDefeated: 'Ancient Strix',
      existingBlessings: [], existingCurses: [],
    });

    expect(result.name).toBe('Minor Boon');
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0].type).toBe('flat_damage_bonus');

    // Restore env var
    if (original) process.env.ANTHROPIC_API_KEY = original;
  });
});
