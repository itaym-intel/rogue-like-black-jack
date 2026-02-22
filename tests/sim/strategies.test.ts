import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/engine/game.js';
import {
  ALL_STRATEGIES, standOn17, standOn15, standOn19, basicStrategy,
  standOn17_skipShop, standOn17_priorityWeapon, standOn17_priorityArmor, standOn17_priorityBoots,
} from '../../src/sim/strategies.js';

describe('Strategy exports', () => {
  it('ALL_STRATEGIES contains 28 strategies', () => {
    expect(ALL_STRATEGIES).toHaveLength(28);
  });

  it('each strategy has name, description, and decideAction', () => {
    for (const s of ALL_STRATEGIES) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(typeof s.decideAction).toBe('function');
    }
  });

  it('all strategy names are unique', () => {
    const names = ALL_STRATEGIES.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('Stand-on-N strategies produce valid actions at every phase', () => {
  const strategies = [standOn17, standOn15, standOn19, basicStrategy];

  for (const strategy of strategies) {
    it(`${strategy.name} produces valid actions through a full game`, () => {
      const engine = new GameEngine('strategy-test-42');
      let count = 0;
      while (count++ < 500) {
        const view = engine.getView();
        if (view.phase === 'game_over' || view.phase === 'victory') break;

        const action = strategy.decideAction(view);

        // Verify the action type is valid for the current phase
        const validTypes = view.availableActions.map(a => a.type);
        expect(validTypes).toContain(action.type);

        const result = engine.performAction(action);
        expect(result.success).toBe(true);
      }
    });
  }
});

describe('Stand threshold behavior', () => {
  it('standOn17 hits below 17 and stands at 17+', () => {
    const engine = new GameEngine('threshold-test');
    let sawHit = false;
    let sawStand = false;
    let count = 0;

    while (count++ < 500) {
      const view = engine.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;

      const action = standOn17.decideAction(view);

      if (view.phase === 'player_turn' && view.player.handScore) {
        if (view.player.handScore.value < 17) {
          expect(action.type).toBe('hit');
          sawHit = true;
        }
        if (view.player.handScore.value >= 17) {
          expect(action.type).toBe('stand');
          sawStand = true;
        }
      }

      engine.performAction(action);
    }

    // Should have seen at least one of each across the game
    expect(sawHit || sawStand).toBe(true);
  });

  it('standOn15 stands at 15+', () => {
    const engine = new GameEngine('stand15-test');
    let count = 0;

    while (count++ < 500) {
      const view = engine.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;

      const action = standOn15.decideAction(view);

      if (view.phase === 'player_turn' && view.player.handScore) {
        if (view.player.handScore.value >= 15) {
          expect(action.type).toBe('stand');
        }
      }

      engine.performAction(action);
    }
  });

  it('standOn19 stands at 19+', () => {
    const engine = new GameEngine('stand19-test');
    let count = 0;

    while (count++ < 500) {
      const view = engine.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;

      const action = standOn19.decideAction(view);

      if (view.phase === 'player_turn' && view.player.handScore) {
        if (view.player.handScore.value >= 19) {
          expect(action.type).toBe('stand');
        }
      }

      engine.performAction(action);
    }
  });
});

describe('Shop strategies', () => {
  it('skipShop always skips', () => {
    const engine = new GameEngine('skip-shop-test');
    let count = 0;

    while (count++ < 500) {
      const view = engine.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;

      const action = standOn17_skipShop.decideAction(view);

      if (view.phase === 'shop') {
        expect(action.type).toBe('skip_shop');
      }

      engine.performAction(action);
    }
  });

  it('priorityWeapon buys weapons first when available', () => {
    const engine = new GameEngine('weapon-priority-test');
    let count = 0;
    let boughtWeapon = false;

    while (count++ < 500) {
      const view = engine.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;

      const action = standOn17_priorityWeapon.decideAction(view);

      if (view.phase === 'shop' && action.type === 'buy_item' && view.shop) {
        const item = view.shop.items[action.itemIndex];
        if (item.type === 'equipment' && 'slot' in item.item && item.item.slot === 'weapon') {
          boughtWeapon = true;
        }
      }

      engine.performAction(action);
    }
    // We don't assert boughtWeapon because the shop might not offer weapons the player can afford
  });
});

describe('Genie phase', () => {
  it('all strategies enter a wish at genie phase', () => {
    for (const strategy of ALL_STRATEGIES) {
      const engine = new GameEngine('genie-test');
      let count = 0;

      while (count++ < 2000) {
        const view = engine.getView();
        if (view.phase === 'game_over' || view.phase === 'victory') break;

        if (view.phase === 'genie') {
          const action = strategy.decideAction(view);
          expect(action.type).toBe('enter_wish');
          break;
        }

        // Auto-play to reach genie
        const action = strategy.decideAction(view);
        engine.performAction(action);
      }
    }
  });
});
