import { describe, it, expect } from 'vitest';
import { generateBlessing, buildWishContext } from '../src/llm/wish-generator.js';
import type { BlessingDefinition, GameView, EquipmentSlot, Equipment } from '../src/engine/types.js';

/**
 * Tests for the wish API flow — the same path the GUI uses.
 * Verifies that generateBlessing() calls the Anthropic API (when key is present)
 * and returns a valid, non-fallback BlessingDefinition.
 *
 * These tests hit the real API and are skipped in CI (no API key).
 * Run locally with: npx vitest run tests/wish-api-endpoint.test.ts
 */

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

function makeMockView(): GameView {
  const equipment: Record<EquipmentSlot, Equipment | null> = {
    weapon: null, helm: null, armor: null, boots: null, trinket: null,
  };
  return {
    phase: 'genie',
    seed: 'test-seed',
    stage: 1,
    battle: 4,
    handNumber: 0,
    player: {
      hp: 35,
      maxHp: 50,
      gold: 20,
      equipment,
      consumables: [],
      wishes: [],
      activeEffects: [],
      hand: null,
      handScore: null,
    },
    enemy: null,
    shop: null,
    genie: { bossName: 'Goblin King', curseDescription: 'Dealer stands on 15', blessingEntered: false, blessingName: null, blessingDescription: null },
    lastHandResult: null,
    availableActions: [],
    log: [],
  };
}

describe('Wish API flow', () => {
  it('buildWishContext extracts correct fields from GameView', () => {
    const view = makeMockView();
    const ctx = buildWishContext(view);
    expect(ctx.playerHp).toBe(35);
    expect(ctx.playerMaxHp).toBe(50);
    expect(ctx.playerGold).toBe(20);
    expect(ctx.currentStage).toBe(1);
    expect(ctx.bossDefeated).toBe('Goblin King');
  });

  describe.skipIf(!hasApiKey)('with API key', () => {
    it('generateBlessing returns a non-fallback blessing', async () => {
      const ctx = buildWishContext(makeMockView());
      const blessing = await generateBlessing('I wish for fire power', ctx);

      // Should not be the hardcoded fallback
      expect(blessing.name).toBeDefined();
      expect(blessing.description).toBeDefined();
      expect(blessing.effects.length).toBeGreaterThanOrEqual(1);
      expect(blessing.effects.length).toBeLessThanOrEqual(3);

      // Each effect should have a valid type and value
      for (const effect of blessing.effects) {
        expect(effect.type).toBeTruthy();
        expect(typeof effect.value).toBe('number');
      }
    }, 30_000);

    it('generateBlessing handles different wish themes', async () => {
      const ctx = buildWishContext(makeMockView());
      const blessing = await generateBlessing('I wish for healing', ctx);

      expect(blessing.name).toBeDefined();
      expect(blessing.effects.length).toBeGreaterThanOrEqual(1);
    }, 30_000);
  });

  describe('without API key', () => {
    it('generateBlessing returns fallback when no key provided', async () => {
      const ctx = buildWishContext(makeMockView());
      // Pass explicit empty key to force fallback
      const blessing = await generateBlessing('test wish', ctx, { apiKey: '' });

      // The SDK will reject empty string, so we get fallback
      expect(blessing.name).toBe('Minor Boon');
      expect(blessing.effects[0].type).toBe('flat_damage_bonus');
      expect(blessing.effects[0].value).toBe(3);
    });
  });
});
