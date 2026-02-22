import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/game.js';
import type { PlayerAction, GamePhase } from '../src/engine/types.js';

/** Play a full auto game with the given seed, using a simple strategy. */
function autoPlay(seed: string, maxActions = 1000): ReturnType<GameEngine['getView']> {
  const game = new GameEngine(seed);
  let count = 0;
  while (count++ < maxActions) {
    const view = game.getView();
    if (view.phase === 'game_over' || view.phase === 'victory') return view;

    let action: PlayerAction;
    switch (view.phase) {
      case 'pre_hand': action = { type: 'continue' }; break;
      case 'player_turn':
        // Stand on 17+, otherwise hit
        if (view.player.handScore && view.player.handScore.value >= 17) {
          action = { type: 'stand' };
        } else {
          action = { type: 'hit' };
        }
        break;
      case 'hand_result': action = { type: 'continue' }; break;
      case 'battle_result': action = { type: 'continue' }; break;
      case 'shop': action = { type: 'skip_shop' }; break;
      case 'genie': action = { type: 'enter_wish', text: 'I wish for strength' }; break;
      default: return view;
    }
    game.performAction(action);
  }
  return game.getView();
}

describe('Full game simulation', () => {
  it('game terminates (game_over or victory) with seed 42', () => {
    const view = autoPlay('42');
    expect(['game_over', 'victory'].includes(view.phase)).toBe(true);
  });

  it('game terminates with seed 123', () => {
    const view = autoPlay('123');
    expect(['game_over', 'victory'].includes(view.phase)).toBe(true);
  });

  it('game terminates with seed hello', () => {
    const view = autoPlay('hello');
    expect(['game_over', 'victory'].includes(view.phase)).toBe(true);
  });

  it('HP is reset after boss fight if player survives', () => {
    // We play a game and track HP after genie
    const game = new GameEngine('hp-reset-test');
    let sawGenie = false;
    let hpAfterGenie = 0;
    let count = 0;
    while (count++ < 1000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        game.performAction({ type: 'enter_wish', text: 'test' });
        sawGenie = true;
        hpAfterGenie = game.getView().player.hp;
        break;
      }
      if (view.phase === 'pre_hand') game.performAction({ type: 'continue' });
      else if (view.phase === 'player_turn') {
        if (view.player.handScore && view.player.handScore.value >= 17) {
          game.performAction({ type: 'stand' });
        } else {
          game.performAction({ type: 'hit' });
        }
      }
      else if (view.phase === 'hand_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'battle_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'shop') game.performAction({ type: 'skip_shop' });
    }
    if (sawGenie) {
      expect(hpAfterGenie).toBe(50); // maxHp
    }
  });

  it('wishes accumulate', () => {
    const game = new GameEngine('wish-accum');
    let wishCount = 0;
    let count = 0;
    while (count++ < 2000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        game.performAction({ type: 'enter_wish', text: `wish ${wishCount + 1}` });
        wishCount++;
        continue;
      }
      if (view.phase === 'pre_hand') game.performAction({ type: 'continue' });
      else if (view.phase === 'player_turn') {
        if (view.player.handScore && view.player.handScore.value >= 17) {
          game.performAction({ type: 'stand' });
        } else {
          game.performAction({ type: 'hit' });
        }
      }
      else if (view.phase === 'hand_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'battle_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'shop') game.performAction({ type: 'skip_shop' });
    }
    expect(game.getView().player.wishes.length).toBe(wishCount);
  });

  it('equipment persists across stages', () => {
    const game = new GameEngine('equip-persist');
    let boughtItem = false;
    let count = 0;
    while (count++ < 2000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'shop' && !boughtItem && view.shop) {
        const affordable = view.shop.items.find(i => i.affordable && i.type === 'equipment');
        if (affordable) {
          game.performAction({ type: 'buy_item', itemIndex: affordable.index });
          boughtItem = true;
          continue;
        }
        game.performAction({ type: 'skip_shop' });
      } else if (view.phase === 'shop') {
        game.performAction({ type: 'skip_shop' });
      } else if (view.phase === 'pre_hand') game.performAction({ type: 'continue' });
      else if (view.phase === 'player_turn') {
        if (view.player.handScore && view.player.handScore.value >= 17) {
          game.performAction({ type: 'stand' });
        } else {
          game.performAction({ type: 'hit' });
        }
      }
      else if (view.phase === 'hand_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'battle_result') game.performAction({ type: 'continue' });
      else if (view.phase === 'genie') game.performAction({ type: 'enter_wish', text: 'test' });
    }
    // If we bought an item and progressed, it should persist
    if (boughtItem) {
      const finalView = game.getView();
      const hasEquip = Object.values(finalView.player.equipment).some(e => e !== null);
      expect(hasEquip).toBe(true);
    }
  });
});
