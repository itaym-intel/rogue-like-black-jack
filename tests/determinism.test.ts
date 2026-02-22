import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/game.js';
import type { PlayerAction } from '../src/engine/types.js';

function playGame(seed: string): { view: ReturnType<GameEngine['getView']>; actions: PlayerAction[] } {
  const game = new GameEngine(seed);
  const actions: PlayerAction[] = [];
  let maxIter = 500;

  while (maxIter-- > 0) {
    const view = game.getView();
    if (view.phase === 'game_over' || view.phase === 'victory') break;

    let action: PlayerAction;
    if (view.phase === 'pre_hand') action = { type: 'continue' };
    else if (view.phase === 'player_turn') action = { type: 'stand' };
    else if (view.phase === 'hand_result') action = { type: 'continue' };
    else if (view.phase === 'battle_result') action = { type: 'continue' };
    else if (view.phase === 'shop') action = { type: 'skip_shop' };
    else if (view.phase === 'genie') action = { type: 'enter_wish', text: 'test wish' };
    else break;

    actions.push(action);
    game.performAction(action);
  }

  return { view: game.getView(), actions };
}

describe('Determinism', () => {
  it('same seed and actions produce identical final state', () => {
    const { view: view1, actions } = playGame('determinism-42');
    // Replay with same seed and actions
    const game2 = new GameEngine('determinism-42');
    for (const action of actions) {
      game2.performAction(action);
    }
    const view2 = game2.getView();

    expect(view1.phase).toBe(view2.phase);
    expect(view1.player.hp).toBe(view2.player.hp);
    expect(view1.player.gold).toBe(view2.player.gold);
    expect(view1.stage).toBe(view2.stage);
    expect(view1.battle).toBe(view2.battle);
  });

  it('replay from GameReplay matches original', () => {
    const game1 = new GameEngine('replay-test');
    const actions: PlayerAction[] = [];
    let maxIter = 200;

    while (maxIter-- > 0) {
      const view = game1.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      let action: PlayerAction;
      if (view.phase === 'pre_hand') action = { type: 'continue' };
      else if (view.phase === 'player_turn') action = { type: 'stand' };
      else if (view.phase === 'hand_result') action = { type: 'continue' };
      else if (view.phase === 'battle_result') action = { type: 'continue' };
      else if (view.phase === 'shop') action = { type: 'skip_shop' };
      else if (view.phase === 'genie') action = { type: 'enter_wish', text: 'wish' };
      else break;
      actions.push(action);
      game1.performAction(action);
    }

    const replay = game1.getReplay();
    const game2 = GameEngine.fromReplay(replay);
    const view1 = game1.getView();
    const view2 = game2.getView();

    expect(view1.phase).toBe(view2.phase);
    expect(view1.player.hp).toBe(view2.player.hp);
    expect(view1.player.gold).toBe(view2.player.gold);
  });

  it('serialization round-trip preserves state', () => {
    const game1 = new GameEngine('serial-test');
    // Play a few actions
    game1.performAction({ type: 'continue' });
    if (game1.getView().phase === 'player_turn') {
      game1.performAction({ type: 'stand' });
    }

    const serialized = game1.serialize();
    const game2 = GameEngine.fromSerialized(serialized);
    const view1 = game1.getView();
    const view2 = game2.getView();

    expect(view1.player.hp).toBe(view2.player.hp);
    expect(view1.player.gold).toBe(view2.player.gold);
    expect(view1.phase).toBe(view2.phase);
  });

  it('different seeds produce different games', () => {
    const { view: view1 } = playGame('seed-alpha');
    const { view: view2 } = playGame('seed-beta');
    // They almost certainly differ in hp or gold or stage
    const different =
      view1.player.hp !== view2.player.hp ||
      view1.player.gold !== view2.player.gold ||
      view1.stage !== view2.stage ||
      view1.phase !== view2.phase;
    expect(different).toBe(true);
  });
});
