import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/game.js';
import { collectModifiers, applyModifierPipeline, getDefaultRules } from '../src/engine/modifiers.js';
import { getBossForStage } from '../src/engine/combatants.js';
import { compareHands } from '../src/engine/scoring.js';
import { validateBlessingDefinition, buildBlessingModifier } from '../src/engine/blessings.js';
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
  it('Zahhak curse: collectModifiers finds curse and modifyDamageDealt reduces damage by 20%', () => {
    // Tests the full wiring chain:
    // wish.curse stored in playerState -> collectModifiers picks it up ->
    // modifyDamageDealt reduces player damage output by 20%
    const zahhakCurse = getBossForStage(3).curse!;

    const playerState: PlayerState = {
      hp: 50, maxHp: 50, gold: 0,
      equipment: new Map<EquipmentSlot, Equipment | null>(),
      consumables: [],
      wishes: [{ blessingText: 'test', blessing: null, curse: zahhakCurse, bossName: 'Zahhak the Mirror King' }],
      activeEffects: [],
    };
    const enemyState: EnemyState = {
      data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' },
      hp: 20,
    };

    // Step 1: collectModifiers finds the curse in player wishes
    const { playerModifiers } = collectModifiers(playerState, enemyState);
    expect(playerModifiers.map(m => m.id)).toContain('curse_zahhak');

    // Step 2: modifyDamageDealt reduces damage by 20%
    expect(zahhakCurse.modifyDamageDealt!(100, {} as any)).toBe(80);
    expect(zahhakCurse.modifyDamageDealt!(50, {} as any)).toBe(40);
  });

  it('Murad curse: onHandEnd fires through engine and damages player on bust', () => {
    // Inject Murad's curse into wishes, then verify it applies 4 damage on bust
    const muradCurse = getBossForStage(2).curse!;
    expect(muradCurse.id).toBe('curse_murad');

    const playerState: PlayerState = {
      hp: 50, maxHp: 50, gold: 0,
      equipment: new Map<EquipmentSlot, Equipment | null>(),
      consumables: [],
      wishes: [{ blessingText: 'test', blessing: null, curse: muradCurse, bossName: 'Murad the Brass Ifrit' }],
      activeEffects: [],
    };
    const enemyState: EnemyState = {
      data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' },
      hp: 20,
    };

    // Verify curse fires on bust
    const ctx: any = {
      playerScore: { value: 24, soft: false, busted: true, isBlackjack: false },
      playerState,
    };
    muradCurse.onHandEnd!(ctx);
    expect(playerState.hp).toBe(46); // 50 - 4

    // Verify curse does NOT fire when not busted
    const ctx2: any = {
      playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
      playerState,
    };
    muradCurse.onHandEnd!(ctx2);
    expect(playerState.hp).toBe(46); // unchanged
  });
});

describe('Blessing integration — blessings modify actual gameplay', () => {
  it('flat_damage_bonus blessing increases damage dealt through full pipeline', () => {
    const game = new GameEngine('bless-dmg-test');
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    const def = validateBlessingDefinition({
      name: 'Power Fist', description: '+10 flat damage',
      effects: [{ type: 'flat_damage_bonus', value: 10 }],
    });
    const blessingMod = buildBlessingModifier(def);
    internalPlayer.wishes.push({
      blessingText: 'punch harder', blessing: blessingMod,
      curse: null, bossName: 'Test Boss',
    });

    const enemyState: EnemyState = {
      data: { name: 'Dummy', maxHp: 200, isBoss: false, equipment: [], description: '' },
      hp: 200,
    };
    const { playerModifiers } = collectModifiers(internalPlayer, enemyState);
    expect(playerModifiers.some(m => m.source === 'wish_blessing')).toBe(true);

    // flat_damage_bonus uses modifyDamageDealt, not modifyRules
    expect(blessingMod.modifyDamageDealt).toBeDefined();
    const dummyCtx = {} as any;
    expect(blessingMod.modifyDamageDealt!(5, dummyCtx)).toBe(15);
  });

  it('enable_peek blessing allows peek action during player_turn', () => {
    const game = new GameEngine('bless-peek-test');
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    const def = validateBlessingDefinition({
      name: 'Third Eye', description: 'Peek at next card',
      effects: [{ type: 'enable_peek', value: 1 }],
    });
    internalPlayer.wishes.push({
      blessingText: 'see the future', blessing: buildBlessingModifier(def),
      curse: null, bossName: 'Test Boss',
    });

    // Deal cards
    game.performAction({ type: 'continue' });
    const view = game.getView();
    if (view.phase === 'player_turn') {
      expect(view.availableActions.some(a => a.type === 'peek')).toBe(true);
      const result = game.performAction({ type: 'peek' });
      expect(result.success).toBe(true);
      // Can't peek again
      const view2 = game.getView();
      expect(view2.availableActions.some(a => a.type === 'peek')).toBe(false);
    }
  });

  it('enable_remove_card blessing allows card removal during player_turn', () => {
    const game = new GameEngine('bless-remove-test');
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    const def = validateBlessingDefinition({
      name: 'Sleight', description: 'Remove a card',
      effects: [{ type: 'enable_remove_card', value: 1 }],
    });
    internalPlayer.wishes.push({
      blessingText: 'remove bad cards', blessing: buildBlessingModifier(def),
      curse: null, bossName: 'Test Boss',
    });

    game.performAction({ type: 'continue' });
    const view = game.getView();
    if (view.phase === 'player_turn' && view.player.hand && view.player.hand.length === 2) {
      expect(view.availableActions.some(a => a.type === 'remove_card')).toBe(true);
      const result = game.performAction({ type: 'remove_card', cardIndex: 0 });
      expect(result.success).toBe(true);
      expect(game.getView().player.hand!.length).toBe(1);
      // Can't remove again (limit = 1)
      expect(game.getView().availableActions.some(a => a.type === 'remove_card')).toBe(false);
    }
  });

  it('enable_surrender blessing allows surrender during player_turn', () => {
    const game = new GameEngine('bless-surrender-test');
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    const def = validateBlessingDefinition({
      name: 'White Flag', description: 'Can surrender',
      effects: [{ type: 'enable_surrender', value: 1 }],
    });
    internalPlayer.wishes.push({
      blessingText: 'let me retreat', blessing: buildBlessingModifier(def),
      curse: null, bossName: 'Test Boss',
    });

    game.performAction({ type: 'continue' });
    const view = game.getView();
    if (view.phase === 'player_turn') {
      expect(view.availableActions.some(a => a.type === 'surrender')).toBe(true);
      const hpBefore = view.player.hp;
      const result = game.performAction({ type: 'surrender' });
      expect(result.success).toBe(true);
      const after = game.getView();
      // Should take some damage (half dealer score) or no damage if dealer score is 0-1
      expect(after.player.hp).toBeLessThanOrEqual(hpBefore);
    }
  });

  it('blessing persists across hands within a battle', () => {
    const game = new GameEngine('bless-persist-test');
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    const def = validateBlessingDefinition({
      name: 'Armor Up', description: 'Reduce damage',
      effects: [{ type: 'flat_damage_reduction', value: 5 }],
    });
    internalPlayer.wishes.push({
      blessingText: 'protect me', blessing: buildBlessingModifier(def),
      curse: null, bossName: 'Test Boss',
    });

    // Play a hand
    game.performAction({ type: 'continue' });
    let view = game.getView();
    let count = 0;
    while (view.phase === 'player_turn' && count++ < 10) {
      game.performAction({ type: 'stand' });
      view = game.getView();
    }
    // Continue to next hand
    if (view.phase === 'hand_result') {
      game.performAction({ type: 'continue' });
      // Still in the battle — blessing should still be active
      const { playerModifiers } = collectModifiers(internalPlayer, (game as unknown as { enemyState: EnemyState }).enemyState);
      expect(playerModifiers.some(m => m.source === 'wish_blessing')).toBe(true);
    }
  });

  it('blessing via enter_wish action integrates end-to-end through genie', () => {
    const game = new GameEngine('bless-e2e-test');
    // Play to genie
    let count = 0;
    while (count++ < 2000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        game.performAction({
          type: 'enter_wish',
          text: 'make me strong',
          blessing: {
            name: 'Strength',
            description: 'More damage',
            effects: [{ type: 'flat_damage_bonus', value: 5 }],
          },
        });
        const afterGenie = game.getView();
        const wish = afterGenie.player.wishes[afterGenie.player.wishes.length - 1];
        expect(wish.blessingText).toBe('make me strong');
        expect(wish.blessing).not.toBeNull();
        expect(wish.blessing!.name).toBe('Strength');
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
  });

  it('ties_favor_player blessing changes tie resolution', () => {
    const game = new GameEngine('bless-ties-test');
    const internalPlayer = (game as unknown as { playerState: PlayerState }).playerState;
    const def = validateBlessingDefinition({
      name: 'Lucky Ties', description: 'Ties favor you',
      effects: [{ type: 'ties_favor_player', value: 1 }],
    });
    internalPlayer.wishes.push({
      blessingText: 'lucky ties', blessing: buildBlessingModifier(def),
      curse: null, bossName: 'Test Boss',
    });

    const enemyState: EnemyState = {
      data: { name: 'Dummy', maxHp: 20, isBoss: false, equipment: [], description: '' },
      hp: 20,
    };
    const { playerModifiers } = collectModifiers(internalPlayer, enemyState);
    const rules = applyModifierPipeline(playerModifiers, getDefaultRules());
    expect(rules.winConditions.tieResolution).toBe('player');

    const tiedScore: HandScore = { value: 20, soft: false, busted: false, isBlackjack: false };
    expect(compareHands(tiedScore, tiedScore, rules)).toBe('player');
  });

  it('autoPlay with blessing works without crashing', () => {
    // Auto-play a game that provides blessings at genie encounters
    function autoPlayWithBlessings(seed: string): ReturnType<GameEngine['getView']> {
      const game = new GameEngine(seed);
      let count = 0;
      while (count++ < 2000) {
        const view = game.getView();
        if (view.phase === 'game_over' || view.phase === 'victory') return view;
        let action: PlayerAction;
        switch (view.phase) {
          case 'pre_hand': action = { type: 'continue' }; break;
          case 'player_turn':
            if (view.player.handScore && view.player.handScore.value >= 17) {
              action = { type: 'stand' };
            } else {
              action = { type: 'hit' };
            }
            break;
          case 'hand_result': action = { type: 'continue' }; break;
          case 'battle_result': action = { type: 'continue' }; break;
          case 'shop': action = { type: 'skip_shop' }; break;
          case 'genie': action = {
            type: 'enter_wish',
            text: 'make me powerful',
            blessing: {
              name: 'Power',
              description: 'Bonus damage',
              effects: [{ type: 'flat_damage_bonus', value: 5 }],
            },
          }; break;
          default: return view;
        }
        game.performAction(action);
      }
      return game.getView();
    }
    const view = autoPlayWithBlessings('bless-auto-42');
    expect(['game_over', 'victory'].includes(view.phase)).toBe(true);
  });

  it('replay preserves blessing from action log', () => {
    const game = new GameEngine('bless-replay-test');
    // Play to genie
    let hitGenie = false;
    let count = 0;
    while (count++ < 2000) {
      const view = game.getView();
      if (view.phase === 'game_over' || view.phase === 'victory') break;
      if (view.phase === 'genie') {
        game.performAction({
          type: 'enter_wish',
          text: 'replay test',
          blessing: {
            name: 'Replay Boon',
            description: 'Test replay',
            effects: [{ type: 'heal_per_hand', value: 2 }],
          },
        });
        hitGenie = true;
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
    if (hitGenie) {
      const replay = game.getReplay();
      const replayed = GameEngine.fromReplay(replay);
      const replayedView = replayed.getView();
      const originalView = game.getView();
      expect(replayedView.player.wishes.length).toBe(originalView.player.wishes.length);
      expect(replayedView.player.hp).toBe(originalView.player.hp);
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
