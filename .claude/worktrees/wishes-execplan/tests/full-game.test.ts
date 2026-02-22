import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/game.js';
import { collectModifiers, applyModifierPipeline, getDefaultRules } from '../src/engine/modifiers.js';
import { getBossForStage } from '../src/engine/combatants.js';
import { compareHands } from '../src/engine/scoring.js';
import type { PlayerAction, PlayerState, EnemyState, HandScore, EquipmentSlot, Equipment, BlessingDefinition } from '../src/engine/types.js';

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
      wishes: [{ blessingText: 'test', blessing: null, curse: sultanCurse, bossName: 'Crimson Sultan' }],
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
    // Plays a real game through the engine to the first genie encounter,
    // then verifies the curse's onHandStart hook actually fires on the next hand
    const game = new GameEngine('djinn-curse-test');
    let reachedGenie = false;
    let count = 0;

    while (count++ < 2000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        reachedGenie = true;
        game.performAction({ type: 'enter_wish', text: 'test' });

        const viewAfterWish = game.getView();
        if (viewAfterWish.phase === 'victory' || viewAfterWish.phase === 'game_over') break;

        const hpBeforeHand = viewAfterWish.player.hp;
        expect(viewAfterWish.phase).toBe('pre_hand');

        // 'continue' from pre_hand triggers onHandStart hooks — the curse deals 3 damage
        game.performAction({ type: 'continue' });
        const viewAfterContinue = game.getView();
        if (viewAfterContinue.phase === 'game_over') {
          expect(hpBeforeHand).toBeLessThanOrEqual(3);
        } else {
          expect(viewAfterContinue.player.hp).toBe(hpBeforeHand - 3);
        }
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

    expect(reachedGenie).toBe(true);
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

describe('Blessing integration', () => {
  const flatDmgBlessing: BlessingDefinition = {
    name: 'Iron Fist',
    description: '+8 damage to all attacks',
    effects: [{ type: 'flat_damage_bonus', value: 8 }],
  };

  it('blessing modifier is collected by collectModifiers', () => {
    const game = new GameEngine('blessing-collect');
    let count = 0;
    while (count++ < 1000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        game.performAction({ type: 'enter_wish', text: 'power', blessing: flatDmgBlessing });
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

    const viewAfter = game.getView();
    if (viewAfter.phase !== 'game_over' && viewAfter.phase !== 'victory') {
      const wish = viewAfter.player.wishes.find(w => w.blessing !== null);
      expect(wish).toBeDefined();
      expect(wish!.blessing!.name).toBe('Iron Fist');
      expect(wish!.blessing!.source).toBe('wish_blessing');
    }
  });

  it('blessing and curse stack correctly', () => {
    const sultanCurse = getBossForStage(3).curse!;
    const blessingMod = {
      id: 'wish_blessing_test', name: 'Test Blessing', description: 'test',
      source: 'wish_blessing' as const,
      modifyDamageDealt(damage: number) { return damage + 5; },
    };

    const playerState: PlayerState = {
      hp: 50, maxHp: 50, gold: 0,
      equipment: new Map<EquipmentSlot, Equipment | null>(),
      consumables: [],
      wishes: [{
        blessingText: 'test',
        blessing: blessingMod,
        curse: sultanCurse,
        bossName: 'Crimson Sultan',
      }],
      activeEffects: [],
    };
    const enemyState: EnemyState = {
      data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' },
      hp: 20,
    };

    const { playerModifiers } = collectModifiers(playerState, enemyState);
    const ids = playerModifiers.map(m => m.id);
    expect(ids).toContain('wish_blessing_test');
    expect(ids).toContain('curse_sultan');
  });

  it('autoPlay with blessings terminates', () => {
    function autoPlayWithBlessing(seed: string, maxActions = 1000) {
      const game = new GameEngine(seed);
      let count = 0;
      while (count++ < maxActions) {
        const view = game.getView();
        if (view.phase === 'game_over' || view.phase === 'victory') return view;
        if (view.phase === 'genie') {
          game.performAction({
            type: 'enter_wish',
            text: 'power',
            blessing: flatDmgBlessing,
          });
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
        else if (view.phase === 'shop') game.performAction({ type: 'skip_shop' });
        else return view;
      }
      return game.getView();
    }

    const view = autoPlayWithBlessing('blessing-autoplay');
    expect(['game_over', 'victory'].includes(view.phase)).toBe(true);
  });

  it('replay with blessing is deterministic', () => {
    const game1 = new GameEngine('replay-blessing');
    let count = 0;
    while (count++ < 1000) {
      const view = game1.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        game1.performAction({ type: 'enter_wish', text: 'fire power', blessing: flatDmgBlessing });
      } else if (view.phase === 'pre_hand') game1.performAction({ type: 'continue' });
      else if (view.phase === 'player_turn') {
        if (view.player.handScore && view.player.handScore.value >= 17) {
          game1.performAction({ type: 'stand' });
        } else {
          game1.performAction({ type: 'hit' });
        }
      }
      else if (view.phase === 'hand_result') game1.performAction({ type: 'continue' });
      else if (view.phase === 'battle_result') game1.performAction({ type: 'continue' });
      else if (view.phase === 'shop') game1.performAction({ type: 'skip_shop' });
    }

    const replay = game1.getReplay();
    const game2 = GameEngine.fromReplay(replay);
    const view1 = game1.getView();
    const view2 = game2.getView();

    expect(view2.phase).toBe(view1.phase);
    expect(view2.player.hp).toBe(view1.player.hp);
    expect(view2.player.gold).toBe(view1.player.gold);
    expect(view2.player.wishes.length).toBe(view1.player.wishes.length);
  });
});
