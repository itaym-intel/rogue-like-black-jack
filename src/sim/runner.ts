import { GameEngine } from '../engine/game.js';
import type { Equipment, EquipmentSlot, GamePhase } from '../engine/types.js';
import type {
  Strategy, RunResult, RunEvent,
  HandResultEvent, BattleEndEvent, ShopPurchaseEvent, ConsumableUseEvent,
} from './types.js';

export function runGame(seed: string, strategy: Strategy): RunResult {
  const engine = new GameEngine(seed);
  const startTime = Date.now();

  const events: RunEvent[] = [];
  const equipmentPurchaseOrder: string[] = [];
  const consumablesUsedByType: Record<string, number> = {};
  let totalHandsPlayed = 0;
  let totalGoldEarned = 0;
  let totalGoldSpent = 0;
  let totalDamageDealt = 0;
  let totalDamageReceived = 0;
  let totalPlayerDodges = 0;
  let totalEnemyDodges = 0;
  let actionCount = 0;
  let handsInCurrentBattle = 0;

  // Track gold before shop to detect purchases
  let goldBeforeAction = 0;

  let view = engine.getView();

  while (actionCount < 5000) {
    view = engine.getView();

    if (view.phase === 'game_over' || view.phase === 'victory') break;

    goldBeforeAction = view.player.gold;
    const prevEnemyHp = view.enemy?.hp ?? 0;
    const prevPlayerHp = view.player.hp;
    const prevPhase = view.phase as GamePhase;
    const prevConsumableCount = view.player.consumables.length;

    const action = strategy.decideAction(view);
    const result = engine.performAction(action);
    actionCount++;

    const newView = engine.getView();

    // Track consumable usage
    if (action.type === 'use_consumable' && result.success) {
      const consumable = view.player.consumables[action.itemIndex];
      if (consumable) {
        const cType = consumable.type;
        consumablesUsedByType[cType] = (consumablesUsedByType[cType] ?? 0) + 1;
        events.push({
          type: 'consumable_use',
          consumableType: cType,
          stage: view.stage,
          battleNumber: view.battle,
          handNumber: view.handNumber,
        } as ConsumableUseEvent);
      }
    }

    // Track shop purchases
    if (action.type === 'buy_item' && result.success && view.shop) {
      const shopItem = view.shop.items[action.itemIndex];
      if (shopItem) {
        const cost = shopItem.item.cost;
        totalGoldSpent += cost;

        const isEquipment = shopItem.type === 'equipment';
        const eq = isEquipment ? (shopItem.item as Equipment) : null;

        events.push({
          type: 'shop_purchase',
          itemId: shopItem.item.id,
          itemName: shopItem.item.name,
          itemType: shopItem.type,
          slot: eq?.slot ?? null,
          tier: eq?.tier ?? null,
          cost,
          goldRemaining: newView.player.gold,
          stage: view.stage,
          battleNumber: view.battle,
        } as ShopPurchaseEvent);

        if (isEquipment) {
          equipmentPurchaseOrder.push(shopItem.item.id);
        }
      }
    }

    // Track hand results
    if (newView.lastHandResult && prevPhase === 'player_turn') {
      totalHandsPlayed++;
      handsInCurrentBattle++;
      const hr = newView.lastHandResult;

      if (hr.damageTarget === 'dealer' && hr.damageDealt > 0) {
        if (hr.dodged) {
          totalEnemyDodges++;
        } else {
          totalDamageDealt += hr.damageDealt;
        }
      }
      if (hr.damageTarget === 'player' && hr.damageDealt > 0) {
        if (hr.dodged) {
          totalPlayerDodges++;
        } else {
          totalDamageReceived += hr.damageDealt;
        }
      }

      events.push({
        type: 'hand_result',
        winner: hr.winner,
        playerScore: hr.playerScore.value,
        dealerScore: hr.dealerScore.value,
        damageDealt: hr.damageDealt,
        damageTarget: hr.damageTarget,
        dodged: hr.dodged,
        playerHp: newView.player.hp,
        enemyHp: newView.enemy?.hp ?? 0,
        handNumber: view.handNumber,
        battleNumber: view.battle,
        stage: view.stage,
        playerBusted: hr.playerScore.busted,
        dealerBusted: hr.dealerScore.busted,
        playerBlackjack: hr.playerScore.isBlackjack,
        dealerBlackjack: hr.dealerScore.isBlackjack,
      } as HandResultEvent);
    }

    // Track battle end
    if (newView.phase === 'battle_result' && prevPhase !== 'battle_result') {
      const goldEarned = newView.player.gold - goldBeforeAction + totalGoldSpent - (totalGoldEarned > 0 ? 0 : 0);
      // Calculate gold earned this battle: new gold - gold we had before the hand that ended the battle
      // Actually, goldEarned = gold gained from this battle = newView.gold - view.gold (before the hand)
      const goldDiff = newView.player.gold - goldBeforeAction;
      totalGoldEarned += goldDiff > 0 ? goldDiff : 0;

      events.push({
        type: 'battle_end',
        enemyName: view.enemy?.name ?? 'Unknown',
        stage: view.stage,
        battleNumber: view.battle,
        handsPlayed: handsInCurrentBattle,
        playerHpRemaining: newView.player.hp,
        goldEarned: goldDiff > 0 ? goldDiff : 0,
      } as BattleEndEvent);

      handsInCurrentBattle = 0;
    }

    // Track gold earned from battles more accurately
    if (prevPhase === 'battle_result' && newView.phase === 'shop') {
      // Gold was already tracked above
    }

    // Track death
    if (newView.phase === 'game_over' && prevPhase !== 'game_over') {
      events.push({
        type: 'player_death',
        killingEnemy: view.enemy?.name ?? 'Unknown',
        stage: view.stage,
        battleNumber: view.battle,
        playerHp: 0,
        totalHandsPlayed,
      });
    }

    // Track victory
    if (newView.phase === 'victory' && prevPhase !== 'victory') {
      const finalEquipment: Record<string, string | null> = {};
      for (const slot of ['weapon', 'helm', 'armor', 'boots', 'trinket'] as EquipmentSlot[]) {
        finalEquipment[slot] = newView.player.equipment[slot]?.id ?? null;
      }
      events.push({
        type: 'victory',
        finalHp: newView.player.hp,
        finalGold: newView.player.gold,
        totalHandsPlayed,
        finalEquipment,
        cursesAccumulated: newView.player.wishes.length,
      });
    }
  }

  // Final view for outcome
  view = engine.getView();

  const finalEquipment: Record<string, string | null> = {};
  for (const slot of ['weapon', 'helm', 'armor', 'boots', 'trinket'] as EquipmentSlot[]) {
    finalEquipment[slot] = view.player.equipment[slot]?.id ?? null;
  }

  // Recalculate totalGoldEarned from battle_end events
  const battleEndGold = events
    .filter((e): e is BattleEndEvent => e.type === 'battle_end')
    .reduce((sum, e) => sum + e.goldEarned, 0);

  return {
    seed,
    strategyName: strategy.name,
    outcome: view.phase === 'victory' ? 'victory' : 'game_over',
    finalStage: view.stage,
    finalBattle: view.battle,
    totalHandsPlayed,
    totalGoldEarned: battleEndGold,
    totalGoldSpent,
    totalDamageDealt,
    totalDamageReceived,
    totalPlayerDodges,
    totalEnemyDodges,
    events,
    equipmentPurchaseOrder,
    consumablesUsedByType,
    finalEquipment,
    deathEnemy: view.phase === 'game_over' ? (events.find(e => e.type === 'player_death') as any)?.killingEnemy ?? null : null,
    durationMs: Date.now() - startTime,
  };
}
