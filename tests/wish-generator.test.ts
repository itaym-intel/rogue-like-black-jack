import { describe, it, expect } from 'vitest';
import { buildWishContext } from '../src/llm/wish-generator.js';
import type { GameView } from '../src/engine/types.js';

function makeMockView(overrides?: Partial<GameView>): GameView {
  return {
    phase: 'genie',
    seed: '42',
    stage: 1,
    battle: 4,
    handNumber: 1,
    player: {
      hp: 35,
      maxHp: 50,
      gold: 45,
      equipment: {
        weapon: { id: 'weapon_cloth', name: 'Flint Spear', slot: 'weapon', tier: 'cloth', description: '+5 damage', cost: 15, modifier: { id: 'w', name: 'Flint Spear', description: '+5 damage', source: 'equipment' } },
        helm: null,
        armor: null,
        boots: null,
        trinket: null,
      },
      consumables: [
        { id: 'health_potion', name: 'Health Potion', type: 'health_potion', description: 'Heals 15 HP', cost: 10, effect: { type: 'health_potion', value: 15 } },
      ],
      wishes: [
        {
          blessingText: 'prior wish',
          blessing: { id: 'b', name: 'Prior', description: 'A prior blessing', source: 'wish_blessing' },
          curse: { id: 'c', name: 'Night Fang', description: 'A curse', source: 'wish_curse' },
          bossName: 'Ancient Strix',
        },
      ],
      activeEffects: [],
      hand: null,
      handScore: null,
    },
    enemy: null,
    shop: null,
    genie: { bossName: 'Ancient Strix', curseDescription: 'BJ = +5 damage', blessingEntered: false, blessingName: null, blessingDescription: null },
    lastHandResult: null,
    availableActions: [],
    log: [],
    ...overrides,
  };
}

describe('buildWishContext', () => {
  it('extracts player HP', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.playerHp).toBe(35);
    expect(ctx.playerMaxHp).toBe(50);
  });

  it('extracts gold', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.playerGold).toBe(45);
  });

  it('extracts equipped items', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.equippedItems).toEqual(['Flint Spear']);
  });

  it('extracts consumables', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.consumables).toEqual(['Health Potion']);
  });

  it('extracts stage and boss', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.currentStage).toBe(1);
    expect(ctx.bossDefeated).toBe('Ancient Strix');
  });

  it('extracts existing blessings and curses', () => {
    const ctx = buildWishContext(makeMockView());
    expect(ctx.existingBlessings).toEqual(['A prior blessing']);
    expect(ctx.existingCurses).toEqual(['Night Fang']);
  });

  it('handles empty equipment', () => {
    const view = makeMockView();
    view.player.equipment = { weapon: null, helm: null, armor: null, boots: null, trinket: null };
    const ctx = buildWishContext(view);
    expect(ctx.equippedItems).toEqual([]);
  });
});
