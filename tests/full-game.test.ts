import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/game.js';
import { collectModifiers, applyModifierPipeline, getDefaultRules } from '../src/engine/modifiers.js';
import { getBossForStage } from '../src/engine/combatants.js';
import { compareHands } from '../src/engine/scoring.js';
import type { PlayerAction, PlayerState, EnemyState, HandScore, EquipmentSlot, Equipment } from '../src/engine/types.js';

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

describe('Curse integration — curses modify actual gameplay', () => {
  it('Sultan curse: collectModifiers -> applyModifierPipeline -> compareHands full chain', () => {
    // Tests the full wiring chain that was previously untested:
    // wish.curse stored in playerState -> collectModifiers picks it up ->
    // applyModifierPipeline calls modifyRules -> modified rules change compareHands outcome
    const sultanCurse = getBossForStage(3).curse!;

    const playerState: PlayerState = {
      hp: 50, maxHp: 50, gold: 0,
      equipment: new Map<EquipmentSlot, Equipment | null>(),
      consumables: [],
      wishes: [{ blessingText: 'test', blessing: 'test', curse: sultanCurse, bossName: 'Crimson Sultan' }],
      activeEffects: [],
    };
    const enemyState: EnemyState = {
      data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' },
      hp: 20,
    };

    // Step 1: collectModifiers finds the curse in player wishes
    const { playerModifiers } = collectModifiers(playerState, enemyState);
    expect(playerModifiers.map(m => m.id)).toContain('curse_sultan');

    // Step 2: applyModifierPipeline applies the curse's modifyRules
    const baseRules = getDefaultRules();
    expect(baseRules.winConditions.tieResolution).toBe('push');
    const modifiedRules = applyModifierPipeline(playerModifiers, baseRules);
    expect(modifiedRules.winConditions.tieResolution).toBe('dealer');

    // Step 3: compareHands respects the modified rules
    const tiedScore: HandScore = { value: 20, soft: false, busted: false, isBlackjack: false };
    expect(compareHands(tiedScore, tiedScore, baseRules)).toBe('push');
    expect(compareHands(tiedScore, tiedScore, modifiedRules)).toBe('dealer');
  });

  it('Djinn curse: onHandStart fires through engine and reduces player HP', () => {
    // Inject Djinn's curse into wishes, then verify pre_hand -> continue
    // goes through the engine hook and applies onHandStart damage.
    const game = new GameEngine('djinn-curse-test');
    const djinnCurse = getBossForStage(2).curse!;
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    internalPlayer.wishes.push({
      blessingText: 'test',
      blessing: 'test',
      curse: djinnCurse,
      bossName: 'Djinn Warden',
    });

    const viewBefore = game.getView();
    expect(viewBefore.phase).toBe('pre_hand');
    const hpBeforeHand = viewBefore.player.hp;

    game.performAction({ type: 'continue' });
    const viewAfterContinue = game.getView();

    if (viewAfterContinue.phase === 'game_over') {
      expect(hpBeforeHand).toBeLessThanOrEqual(3);
    } else {
      expect(viewAfterContinue.player.hp).toBe(hpBeforeHand - 3);
    }
  });
});

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
