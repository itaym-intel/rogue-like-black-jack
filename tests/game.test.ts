import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/game.js';

describe('GameEngine', () => {
  it('initializes correctly', () => {
    const game = new GameEngine('test-seed');
    const view = game.getView();
    expect(view.phase).toBe('pre_hand');
    expect(view.stage).toBe(1);
    expect(view.battle).toBe(1);
    expect(view.player.hp).toBe(50);
    expect(view.player.maxHp).toBe(50);
    expect(view.player.gold).toBe(0);
    expect(view.enemy).not.toBeNull();
  });

  it('deals cards on continue', () => {
    const game = new GameEngine('deal-test');
    const result = game.performAction({ type: 'continue' });
    expect(result.success).toBe(true);
    const view = game.getView();
    // Should be in player_turn (or hand_result if blackjack)
    expect(['player_turn', 'hand_result', 'battle_result'].includes(view.phase)).toBe(true);
    if (view.phase === 'player_turn') {
      expect(view.player.hand).not.toBeNull();
      expect(view.player.hand!.length).toBe(2);
    }
  });

  it('can play a full hand (hit then stand)', () => {
    const game = new GameEngine('full-hand');
    game.performAction({ type: 'continue' }); // deal
    const view = game.getView();
    if (view.phase === 'player_turn') {
      game.performAction({ type: 'stand' });
      const afterStand = game.getView();
      expect(['hand_result', 'battle_result', 'game_over'].includes(afterStand.phase)).toBe(true);
    }
  });

  it('can play through a full battle', () => {
    const game = new GameEngine('battle-test');
    let maxIter = 100;
    while (maxIter-- > 0) {
      const view = game.getView();
      if (view.phase === 'battle_result' || view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'pre_hand') {
        game.performAction({ type: 'continue' });
      } else if (view.phase === 'player_turn') {
        game.performAction({ type: 'stand' });
      } else if (view.phase === 'hand_result') {
        game.performAction({ type: 'continue' });
      }
    }
    const finalView = game.getView();
    expect(['battle_result', 'game_over'].includes(finalView.phase)).toBe(true);
  });

  it('progresses to shop after regular battle', () => {
    const game = new GameEngine('shop-progression');
    // Play until battle_result
    let maxIter = 100;
    while (maxIter-- > 0) {
      const view = game.getView();
      if (view.phase === 'battle_result') break;
      if (view.phase === 'game_over') return; // Player died, skip test
      if (view.phase === 'pre_hand') game.performAction({ type: 'continue' });
      else if (view.phase === 'player_turn') game.performAction({ type: 'stand' });
      else if (view.phase === 'hand_result') game.performAction({ type: 'continue' });
    }
    const view = game.getView();
    if (view.phase === 'battle_result') {
      game.performAction({ type: 'continue' });
      expect(game.getView().phase).toBe('shop');
    }
  });

  it('can skip shop', () => {
    const game = new GameEngine('skip-shop');
    // Play to shop
    let maxIter = 200;
    while (maxIter-- > 0) {
      const view = game.getView();
      if (view.phase === 'shop') break;
      if (view.phase === 'game_over' || view.phase === 'victory') return;
      if (view.phase === 'pre_hand') game.performAction({ type: 'continue' });
      else if (view.phase === 'player_turn') game.performAction({ type: 'stand' });
      else if (view.phase === 'hand_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'battle_result') game.performAction({ type: 'continue' });
    }
    if (game.getView().phase === 'shop') {
      game.performAction({ type: 'skip_shop' });
      expect(game.getView().phase).toBe('pre_hand');
    }
  });

  it('gold persists across battles', () => {
    const game = new GameEngine('gold-persist');
    let maxIter = 200;
    let firstGold = 0;
    let battlesWon = 0;
    while (maxIter-- > 0) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'battle_result') {
        battlesWon++;
        if (battlesWon === 1) firstGold = game.getView().player.gold;
        game.performAction({ type: 'continue' });
      } else if (view.phase === 'shop') {
        game.performAction({ type: 'skip_shop' });
      } else if (view.phase === 'pre_hand') {
        game.performAction({ type: 'continue' });
      } else if (view.phase === 'player_turn') {
        game.performAction({ type: 'stand' });
      } else if (view.phase === 'hand_result') {
        game.performAction({ type: 'continue' });
      } else if (view.phase === 'genie') {
        game.performAction({ type: 'enter_wish', text: 'test' });
      }
    }
    if (battlesWon >= 2) {
      expect(game.getView().player.gold).toBeGreaterThanOrEqual(firstGold);
    }
  });
});
