import type { GameView, PlayerAction, EquipmentSlot } from '../engine/types.js';
import type { Strategy } from './types.js';

// ── Helper: find dealer's visible card value ──

function dealerVisibleCardValue(view: GameView): number {
  if (!view.enemy) return 0;
  const visible = view.enemy.visibleCards.filter((c): c is NonNullable<typeof c> => c !== null);
  if (visible.length === 0) return 0;
  // Use the last visible card (the face-up card — index 1 when face-down is index 0)
  const card = visible[visible.length - 1];
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

// ── Helper: use consumables logic ──

function tryUseConsumable(view: GameView): PlayerAction | null {
  const consumables = view.player.consumables;
  if (consumables.length === 0) return null;

  // Use health potion when HP < 20
  const healthIndex = consumables.findIndex(c => c.type === 'health_potion');
  if (healthIndex >= 0 && view.player.hp < 20) {
    return { type: 'use_consumable', itemIndex: healthIndex };
  }

  // At start of boss fights (battle 4, hand 1), use offensive potions
  if (view.enemy?.isBoss && view.handNumber === 1) {
    const damageIndex = consumables.findIndex(c => c.type === 'damage_potion');
    if (damageIndex >= 0) return { type: 'use_consumable', itemIndex: damageIndex };

    const poisonIndex = consumables.findIndex(c => c.type === 'poison_potion');
    if (poisonIndex >= 0) return { type: 'use_consumable', itemIndex: poisonIndex };

    const strengthIndex = consumables.findIndex(c => c.type === 'strength_potion');
    if (strengthIndex >= 0) return { type: 'use_consumable', itemIndex: strengthIndex };
  }

  return null;
}

// ── Helper: buy cheapest affordable equipment ──

function buyCheapestEquipment(view: GameView): PlayerAction | null {
  if (!view.shop) return null;
  const affordable = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment')
    .sort((a, b) => a.item.cost - b.item.cost);
  if (affordable.length > 0) return { type: 'buy_item', itemIndex: affordable[0].index };
  return null;
}

// ── Helper: buy prioritized slot equipment ──

function buyPrioritySlot(view: GameView, prioritySlot: EquipmentSlot): PlayerAction | null {
  if (!view.shop) return null;

  // First, try to buy highest-tier affordable item for priority slot
  const priorityItems = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && item.item.slot === prioritySlot)
    .sort((a, b) => b.item.cost - a.item.cost); // highest cost = highest tier
  if (priorityItems.length > 0) return { type: 'buy_item', itemIndex: priorityItems[0].index };

  // Then fall back to cheapest other equipment
  return buyCheapestEquipment(view);
}

// ── Strategy: Stand on N ──

function makeStandOnN(threshold: number, shopFn: (view: GameView) => PlayerAction | null, nameSuffix?: string): Strategy {
  const name = `standOn${threshold}${nameSuffix ?? ''}`;
  return {
    name,
    description: `Stand when hand >= ${threshold}. ${nameSuffix ? nameSuffix.replace('_', ' ').trim() : 'Buy cheapest equipment.'}`,
    decideAction(view: GameView): PlayerAction {
      switch (view.phase) {
        case 'pre_hand': {
          const consumable = tryUseConsumable(view);
          if (consumable) return consumable;
          return { type: 'continue' };
        }
        case 'player_turn': {
          if (view.player.handScore && view.player.handScore.value >= threshold) {
            return { type: 'stand' };
          }
          return { type: 'hit' };
        }
        case 'hand_result':
        case 'battle_result':
          return { type: 'continue' };
        case 'shop': {
          const buy = shopFn(view);
          if (buy) return buy;
          return { type: 'skip_shop' };
        }
        case 'genie':
          return { type: 'enter_wish', text: 'I wish for victory' };
        default:
          return { type: 'continue' };
      }
    },
  };
}

// ── Strategy: Basic Strategy ──

const basicStrategy: Strategy = {
  name: 'basicStrategy',
  description: 'Simplified real blackjack basic strategy based on dealer visible card. Buy cheapest equipment.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumable(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);

        // Dealer shows weak card (2-6): stand on 12+
        if (dealerCard >= 2 && dealerCard <= 6) {
          if (score >= 12) return { type: 'stand' };
          return { type: 'hit' };
        }
        // Dealer shows strong card (7-A): stand on 17+
        if (score >= 17) return { type: 'stand' };
        return { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyCheapestEquipment(view);
        if (buy) return buy;
        return { type: 'skip_shop' };
      }
      case 'genie':
        return { type: 'enter_wish', text: 'I wish for victory' };
      default:
        return { type: 'continue' };
    }
  },
};

// ── Exported strategies ──

export const standOn17 = makeStandOnN(17, buyCheapestEquipment);
export const standOn15 = makeStandOnN(15, buyCheapestEquipment);
export const standOn19 = makeStandOnN(19, buyCheapestEquipment);
export { basicStrategy };
export const standOn17_skipShop = makeStandOnN(17, () => null, '_skipShop');
export const standOn17_priorityWeapon = makeStandOnN(17, (v) => buyPrioritySlot(v, 'weapon'), '_priorityWeapon');
export const standOn17_priorityArmor = makeStandOnN(17, (v) => buyPrioritySlot(v, 'armor'), '_priorityArmor');
export const standOn17_priorityBoots = makeStandOnN(17, (v) => buyPrioritySlot(v, 'boots'), '_priorityBoots');

export const ALL_STRATEGIES: Strategy[] = [
  standOn17,
  standOn15,
  standOn19,
  basicStrategy,
  standOn17_skipShop,
  standOn17_priorityWeapon,
  standOn17_priorityArmor,
  standOn17_priorityBoots,
];
