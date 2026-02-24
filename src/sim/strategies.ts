import type { GameView, PlayerAction, EquipmentSlot, Equipment } from '../engine/types.js';
import type { Strategy } from './types.js';

// ── Helper: find dealer's visible card value ──

function dealerVisibleCardValue(view: GameView): number {
  if (!view.enemy) return 0;
  const visible = view.enemy.visibleCards.filter((c): c is NonNullable<typeof c> => c !== null);
  if (visible.length === 0) return 0;
  const card = visible[visible.length - 1];
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

// ── Helper: detect if current hand is soft (has ace counted as 11) ──

function isSoftHand(view: GameView): boolean {
  return view.player.handScore?.soft ?? false;
}

// ── Helper: can double down this action? ──

function canDoubleDown(view: GameView): boolean {
  return view.availableActions.some(a => a.type === 'double_down');
}

// ── Consumable helpers ──

function tryUseConsumable(view: GameView): PlayerAction | null {
  const consumables = view.player.consumables;
  if (consumables.length === 0) return null;

  const healthIndex = consumables.findIndex(c => c.type === 'health_potion');
  if (healthIndex >= 0 && view.player.hp < 20) {
    return { type: 'use_consumable', itemIndex: healthIndex };
  }

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

function tryUseConsumableAggressive(view: GameView): PlayerAction | null {
  const consumables = view.player.consumables;
  if (consumables.length === 0) return null;

  // Health potion when HP < 30
  const healthIndex = consumables.findIndex(c => c.type === 'health_potion');
  if (healthIndex >= 0 && view.player.hp < 30) {
    return { type: 'use_consumable', itemIndex: healthIndex };
  }

  // Use offensive consumables at start of every battle (hand 1), not just bosses
  if (view.handNumber === 1) {
    // Poison first (best total value: 3dmg × 3 hands = 9 damage)
    const poisonIndex = consumables.findIndex(c => c.type === 'poison_potion');
    if (poisonIndex >= 0) return { type: 'use_consumable', itemIndex: poisonIndex };

    // Strength potion on bosses for big DD combos
    if (view.enemy?.isBoss) {
      const strengthIndex = consumables.findIndex(c => c.type === 'strength_potion');
      if (strengthIndex >= 0) return { type: 'use_consumable', itemIndex: strengthIndex };
    }

    // Damage potion to chip enemies
    const damageIndex = consumables.findIndex(c => c.type === 'damage_potion');
    if (damageIndex >= 0) return { type: 'use_consumable', itemIndex: damageIndex };
  }

  return null;
}

// ── Shop helpers ──

function buyCheapestEquipment(view: GameView): PlayerAction | null {
  if (!view.shop) return null;
  const affordable = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment')
    .sort((a, b) => a.item.cost - b.item.cost);
  if (affordable.length > 0) return { type: 'buy_item', itemIndex: affordable[0].index };
  return null;
}

function buyPrioritySlot(view: GameView, prioritySlot: EquipmentSlot): PlayerAction | null {
  if (!view.shop) return null;

  const priorityItems = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && item.item.slot === prioritySlot)
    .sort((a, b) => b.item.cost - a.item.cost);
  if (priorityItems.length > 0) return { type: 'buy_item', itemIndex: priorityItems[0].index };

  return buyCheapestEquipment(view);
}

/** Buy equipment following a slot priority order, then health potions with leftover gold. */
function buySmartPriority(view: GameView, slotOrder: EquipmentSlot[]): PlayerAction | null {
  if (!view.shop) return null;

  // Try each slot in priority order
  for (const slot of slotOrder) {
    const slotItems = view.shop.items
      .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === slot)
      .sort((a, b) => b.item.cost - a.item.cost);
    if (slotItems.length > 0) return { type: 'buy_item', itemIndex: slotItems[0].index };
  }

  // Buy health potions with leftover gold
  const healthPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
  );
  if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

  // Buy any affordable consumable
  const anyCons = view.shop.items.find(item => item.affordable && item.type === 'consumable');
  if (anyCons) return { type: 'buy_item', itemIndex: anyCons.index };

  return null;
}

/** Buy consumables first (health potions especially), then equipment. */
function buyConsumablesFirst(view: GameView): PlayerAction | null {
  if (!view.shop) return null;

  // Health potions first — buy up to 3
  const healthPotCount = view.player.consumables.filter(c => c.type === 'health_potion').length;
  if (healthPotCount < 3) {
    const healthPot = view.shop.items.find(
      item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
    );
    if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };
  }

  // Poison potions — great value (9 total damage for 20g)
  const poisonPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
  );
  if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

  // Then buy best weapon available
  const weapons = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
    .sort((a, b) => b.item.cost - a.item.cost);
  if (weapons.length > 0) return { type: 'buy_item', itemIndex: weapons[0].index };

  // Then any other equipment
  return buyCheapestEquipment(view);
}

// ── Blackjack decision helpers ──

/** Basic strategy hit/stand based on dealer up card. */
function basicHitStand(score: number, dealerCard: number, soft: boolean): 'hit' | 'stand' {
  if (soft) {
    // Soft hands: stand on soft 19+, hit soft 17 and below
    if (score >= 19) return 'stand';
    if (score === 18) {
      // Stand against weak dealer, hit against strong
      return dealerCard >= 9 ? 'hit' : 'stand';
    }
    return 'hit';
  }

  // Hard hands
  if (dealerCard >= 2 && dealerCard <= 6) {
    return score >= 12 ? 'stand' : 'hit';
  }
  return score >= 17 ? 'stand' : 'hit';
}

/**
 * Should we double down?
 * DD only multiplies damage when player WINS (no extra penalty on loss).
 * This makes it much more valuable than in real blackjack.
 */
function shouldDoubleDown(score: number, dealerCard: number, soft: boolean): boolean {
  if (soft) {
    // Soft DD: A+2 through A+7 (13-18) vs dealer 4-6
    if (score >= 13 && score <= 18 && dealerCard >= 4 && dealerCard <= 6) return true;
    return false;
  }

  // Hard 11: DD vs everything except Ace
  if (score === 11) return dealerCard <= 10;
  // Hard 10: DD vs dealer 2-9
  if (score === 10) return dealerCard >= 2 && dealerCard <= 9;
  // Hard 9: DD vs dealer 3-6
  if (score === 9) return dealerCard >= 3 && dealerCard <= 6;
  return false;
}

/** Aggressive DD: since there's no extra penalty, DD on more hands. */
function shouldDoubleDownAggressive(score: number, dealerCard: number, soft: boolean): boolean {
  if (soft) {
    // Soft DD: A+2 through A+8 (13-19) vs dealer 3-6
    if (score >= 13 && score <= 19 && dealerCard >= 3 && dealerCard <= 6) return true;
    // Soft 17-18 vs dealer 2
    if ((score === 17 || score === 18) && dealerCard === 2) return true;
    return false;
  }

  // Hard 11: DD vs everything
  if (score === 11) return true;
  // Hard 10: DD vs dealer 2-10
  if (score === 10) return dealerCard <= 10;
  // Hard 9: DD vs dealer 2-6
  if (score === 9) return dealerCard >= 2 && dealerCard <= 6;
  // Hard 8: DD vs dealer 5-6
  if (score === 8) return dealerCard >= 5 && dealerCard <= 6;
  return false;
}

// ══════════════════════════════════════════════════════════
// ORIGINAL STRATEGIES (preserved)
// ══════════════════════════════════════════════════════════

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

        if (dealerCard >= 2 && dealerCard <= 6) {
          if (score >= 12) return { type: 'stand' };
          return { type: 'hit' };
        }
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

// ══════════════════════════════════════════════════════════
// NEW HIGH-PERFORMANCE STRATEGIES
// ══════════════════════════════════════════════════════════

// ── 1. Basic Strategy with Double Down ──
// Core insight: DD 2x multiplier only applies on wins, so it's pure upside.

const basicWithDD: Strategy = {
  name: 'basicWithDD',
  description: 'Basic strategy with standard double-down on 9-11 vs weak dealer. Buy cheapest equipment.',
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
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && shouldDoubleDown(score, dealerCard, soft)) {
          return { type: 'double_down' };
        }

        const decision = basicHitStand(score, dealerCard, soft);
        return { type: decision };
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

// ── 2. Aggressive Double Down + Weapon Priority ──
// Maximize damage output: aggressive DD + best weapons + offensive consumables.

const glassCannon: Strategy = {
  name: 'glassCannon',
  description: 'Aggressive DD on wide range of hands. Weapon priority. Use offensive consumables every fight.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableAggressive(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && shouldDoubleDownAggressive(score, dealerCard, soft)) {
          return { type: 'double_down' };
        }

        const decision = basicHitStand(score, dealerCard, soft);
        return { type: decision };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buySmartPriority(view, ['weapon', 'armor', 'boots', 'trinket', 'helm']);
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

// ── 3. Tank Build ──
// Survive through damage reduction: armor + boots + conservative play + health potions.

const tankBuild: Strategy = {
  name: 'tankBuild',
  description: 'Conservative play, DD only on 10-11. Armor > boots > weapon. Stock health potions.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableAggressive(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        // Conservative DD: only on hard 10-11 vs weak dealer
        if (canDoubleDown(view) && !soft && (score === 10 || score === 11) && dealerCard >= 2 && dealerCard <= 6) {
          return { type: 'double_down' };
        }

        // Conservative standing: stand on 12+ vs weak (avoid busting at all costs)
        if (soft) {
          if (score >= 18) return { type: 'stand' };
          return { type: 'hit' };
        }
        if (dealerCard >= 2 && dealerCard <= 6) {
          return score >= 12 ? { type: 'stand' } : { type: 'hit' };
        }
        return score >= 17 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buySmartPriority(view, ['armor', 'boots', 'weapon', 'helm', 'trinket']);
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

// ── 4. Smart Shopper ──
// Basic strategy + DD + intelligent shopping: weapon→armor→health pots.

const smartShopper: Strategy = {
  name: 'smartShopper',
  description: 'Basic strategy with DD. Smart shopping: weapon > armor, then buy health potions.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableAggressive(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && shouldDoubleDown(score, dealerCard, soft)) {
          return { type: 'double_down' };
        }

        const decision = basicHitStand(score, dealerCard, soft);
        return { type: decision };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buySmartPriority(view, ['weapon', 'armor', 'boots', 'trinket', 'helm']);
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

// ── 5. Consumable Heavy ──
// Prioritize buying consumables (health pots + poison). Use them every fight.

const consumableHeavy: Strategy = {
  name: 'consumableHeavy',
  description: 'Prioritize buying consumables. Use health pots at HP<30. Poison every fight.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableAggressive(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && shouldDoubleDown(score, dealerCard, soft)) {
          return { type: 'double_down' };
        }

        const decision = basicHitStand(score, dealerCard, soft);
        return { type: decision };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyConsumablesFirst(view);
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

// ── 6. Adaptive HP Strategy ──
// Adjusts aggression based on current HP. High HP → aggressive DD. Low HP → conservative.

const adaptiveHP: Strategy = {
  name: 'adaptiveHP',
  description: 'Adapts to HP: aggressive DD when healthy, conservative when low. Smart shopping.',
  decideAction(view: GameView): PlayerAction {
    const hpRatio = view.player.hp / view.player.maxHp;

    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableAggressive(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        if (canDoubleDown(view)) {
          if (hpRatio > 0.5) {
            // Healthy: aggressive DD
            if (shouldDoubleDownAggressive(score, dealerCard, soft)) {
              return { type: 'double_down' };
            }
          } else if (hpRatio > 0.25) {
            // Medium: standard DD
            if (shouldDoubleDown(score, dealerCard, soft)) {
              return { type: 'double_down' };
            }
          }
          // Low HP: no DD (can't afford to waste a hit card)
        }

        if (soft) {
          if (score >= 19) return { type: 'stand' };
          if (score === 18) return dealerCard >= 9 ? { type: 'hit' } : { type: 'stand' };
          return { type: 'hit' };
        }

        // At low HP, stand earlier to avoid bust damage
        if (hpRatio <= 0.25) {
          if (dealerCard >= 2 && dealerCard <= 6) {
            return score >= 12 ? { type: 'stand' } : { type: 'hit' };
          }
          // Stand on 15+ vs strong dealer when HP is low
          return score >= 15 ? { type: 'stand' } : { type: 'hit' };
        }

        // Normal basic strategy
        const decision = basicHitStand(score, dealerCard, soft);
        return { type: decision };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        // Adaptive shopping: buy armor early, weapon later
        if (view.stage === 1) {
          const buy = buySmartPriority(view, ['weapon', 'armor', 'boots', 'trinket', 'helm']);
          if (buy) return buy;
        } else {
          const buy = buySmartPriority(view, ['armor', 'weapon', 'boots', 'helm', 'trinket']);
          if (buy) return buy;
        }
        return { type: 'skip_shop' };
      }
      case 'genie':
        return { type: 'enter_wish', text: 'I wish for victory' };
      default:
        return { type: 'continue' };
    }
  },
};

// ══════════════════════════════════════════════════════════
// WAVE 2: REFINED STRATEGIES (based on sim data analysis)
// ══════════════════════════════════════════════════════════

// ── Consumable helpers for wave 2 ──

/** Use ALL available consumables aggressively at battle start. */
function tryUseConsumableMax(view: GameView): PlayerAction | null {
  const consumables = view.player.consumables;
  if (consumables.length === 0) return null;

  // Always heal when below 35 HP
  const healthIndex = consumables.findIndex(c => c.type === 'health_potion');
  if (healthIndex >= 0 && view.player.hp < 35) {
    return { type: 'use_consumable', itemIndex: healthIndex };
  }

  // Use poison at start of every battle (bypasses armor/dodge!)
  if (view.handNumber === 1) {
    const poisonIndex = consumables.findIndex(c => c.type === 'poison_potion');
    if (poisonIndex >= 0) return { type: 'use_consumable', itemIndex: poisonIndex };
  }

  // Use strength on bosses for DD combo
  if (view.enemy?.isBoss && view.handNumber <= 2) {
    const strengthIndex = consumables.findIndex(c => c.type === 'strength_potion');
    if (strengthIndex >= 0) return { type: 'use_consumable', itemIndex: strengthIndex };
  }

  // Use damage potions every fight
  if (view.handNumber === 1) {
    const damageIndex = consumables.findIndex(c => c.type === 'damage_potion');
    if (damageIndex >= 0) return { type: 'use_consumable', itemIndex: damageIndex };
  }

  return null;
}

/** Buy poison potions first (bypass armor), then health potions, then weapons. */
function buyPoisonFocused(view: GameView): PlayerAction | null {
  if (!view.shop) return null;

  // Poison potions first — max value vs armored enemies
  const poisonPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
  );
  if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

  // Health potions for sustain
  const healthPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
  );
  if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

  // Strength potions for boss burst
  const strengthPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'strength_potion'
  );
  if (strengthPot) return { type: 'buy_item', itemIndex: strengthPot.index };

  // Any other consumable
  const anyCons = view.shop.items.find(item => item.affordable && item.type === 'consumable');
  if (anyCons) return { type: 'buy_item', itemIndex: anyCons.index };

  // Finally try weapon if nothing else
  const weapon = view.shop.items.find(
    item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon'
  );
  if (weapon) return { type: 'buy_item', itemIndex: weapon.index };

  return null;
}

/** Buy weapon first (even if expensive), then health pots, then armor. */
function buyWeaponRush(view: GameView): PlayerAction | null {
  if (!view.shop) return null;

  // Best weapon available
  const weapons = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
    .sort((a, b) => b.item.cost - a.item.cost);
  if (weapons.length > 0) return { type: 'buy_item', itemIndex: weapons[0].index };

  // Health potions for sustain
  const healthPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
  );
  if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

  // Best armor
  const armor = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'armor')
    .sort((a, b) => b.item.cost - a.item.cost);
  if (armor.length > 0) return { type: 'buy_item', itemIndex: armor[0].index };

  // Any consumable
  const anyCons = view.shop.items.find(item => item.affordable && item.type === 'consumable');
  if (anyCons) return { type: 'buy_item', itemIndex: anyCons.index };

  // Any equipment
  return buyCheapestEquipment(view);
}

// ── 7. Poison Master ──
// Poison bypasses armor and dodge. Stack poison + health pots. Ultra conservative play.

const poisonMaster: Strategy = {
  name: 'poisonMaster',
  description: 'Stack poison potions (bypasses armor). Ultra conservative play. Health pot sustain.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        // DD only on hard 10-11 (safe DD choices)
        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        // Ultra conservative: stand on 13+ vs weak, 15+ vs medium, 17+ vs strong
        if (soft) {
          return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        }
        if (dealerCard >= 2 && dealerCard <= 4) {
          return score >= 12 ? { type: 'stand' } : { type: 'hit' };
        }
        if (dealerCard >= 5 && dealerCard <= 6) {
          return score >= 12 ? { type: 'stand' } : { type: 'hit' };
        }
        // Strong dealer: still conservative — stand on 15+ to avoid busting
        return score >= 15 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyPoisonFocused(view);
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

// ── 8. Weapon Rush DD ──
// Save for weapon ASAP, then DD aggressively. Weapon + DD = massive burst damage.

const weaponRushDD: Strategy = {
  name: 'weaponRushDD',
  description: 'Rush weapon purchase. DD aggressively once armed. Weapon + DD = huge burst.',
  decideAction(view: GameView): PlayerAction {
    const hasWeapon = view.player.equipment.weapon !== null;

    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableAggressive(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        // More aggressive DD when armed (weapon amplifies DD damage)
        if (canDoubleDown(view)) {
          if (hasWeapon) {
            if (shouldDoubleDownAggressive(score, dealerCard, soft)) {
              return { type: 'double_down' };
            }
          } else {
            if (shouldDoubleDown(score, dealerCard, soft)) {
              return { type: 'double_down' };
            }
          }
        }

        const decision = basicHitStand(score, dealerCard, soft);
        return { type: decision };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyWeaponRush(view);
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

// ── 9. Ultra Conservative ──
// Stand on 13 vs everything. Never bust. DD only on 11. Maximum survival.

const ultraConservative: Strategy = {
  name: 'ultraConservative',
  description: 'Stand on 13+ always. DD only on 11. Never bust. Health pot heavy.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        // DD only on hard 11 (safest possible DD)
        if (canDoubleDown(view) && !soft && score === 11) {
          return { type: 'double_down' };
        }

        if (soft) {
          return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        }

        // Stand on 13+ no matter what dealer shows
        return score >= 13 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buySmartPriority(view, ['armor', 'weapon', 'boots', 'helm', 'trinket']);
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

// ── 10. Balanced Optimal ──
// Combines all learnings: conservative play, DD on good hands, weapon+armor, health+poison pots.

const balancedOptimal: Strategy = {
  name: 'balancedOptimal',
  description: 'Best of everything: conservative basic strategy, DD, weapon+armor, health+poison pots.',
  decideAction(view: GameView): PlayerAction {
    const hpRatio = view.player.hp / view.player.maxHp;

    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        // DD decisions based on HP
        if (canDoubleDown(view)) {
          if (hpRatio > 0.4) {
            if (shouldDoubleDown(score, dealerCard, soft)) return { type: 'double_down' };
          } else {
            // Low HP: only DD on hard 11
            if (!soft && score === 11 && dealerCard <= 10) return { type: 'double_down' };
          }
        }

        // Soft hand logic
        if (soft) {
          if (score >= 19) return { type: 'stand' };
          if (score === 18) return dealerCard >= 9 ? { type: 'hit' } : { type: 'stand' };
          return { type: 'hit' };
        }

        // Hard hand: conservative vs weak, standard vs strong
        if (dealerCard >= 2 && dealerCard <= 6) {
          return score >= 12 ? { type: 'stand' } : { type: 'hit' };
        }

        // Low HP: stand on 15+ vs strong dealer to avoid bust
        if (hpRatio <= 0.3) {
          return score >= 15 ? { type: 'stand' } : { type: 'hit' };
        }

        return score >= 17 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        if (!view.shop) return { type: 'skip_shop' };

        // Buy weapon first if we don't have one
        if (!view.player.equipment.weapon) {
          const weapons = view.shop.items
            .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
            .sort((a, b) => b.item.cost - a.item.cost);
          if (weapons.length > 0) return { type: 'buy_item', itemIndex: weapons[0].index };
        }

        // Then armor
        if (!view.player.equipment.armor) {
          const armor = view.shop.items
            .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'armor')
            .sort((a, b) => b.item.cost - a.item.cost);
          if (armor.length > 0) return { type: 'buy_item', itemIndex: armor[0].index };
        }

        // Poison potions (bypass armor)
        const poisonPot = view.shop.items.find(
          item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
        );
        if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

        // Health potions
        const healthPot = view.shop.items.find(
          item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
        );
        if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

        // Upgrade equipment or buy remaining slots
        const buy = buySmartPriority(view, ['weapon', 'armor', 'boots', 'trinket', 'helm']);
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

// ══════════════════════════════════════════════════════════
// WAVE 3: EXTREME STRATEGIES (never-bust + max sustain)
// ══════════════════════════════════════════════════════════

// ── 11. Never Bust ──
// Stand on 12+ always = mathematically impossible to bust.
// Trades more frequent small losses for zero catastrophic bust damage.
// Bust damage avg ~18 vs non-bust loss avg ~5. 3.6x damage reduction per loss.

const neverBust: Strategy = {
  name: 'neverBust',
  description: 'Stand on 12+ always. Zero busts ever. DD on 11 only. Max health pot sustain.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        // DD only on hard 11 (can't bust: 11 + any card <= 21)
        if (canDoubleDown(view) && !soft && score === 11) {
          return { type: 'double_down' };
        }

        // Soft hands: still hit below 18 (soft hands can't bust by hitting)
        if (soft) {
          return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        }

        // Hard hands: stand on 12+ always — zero bust risk
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyPoisonFocused(view);
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

// ── 12. Never Bust + Weapon ──
// Same as neverBust but prioritizes weapon purchase for flat damage on every win.
// Weapon turns 1-damage wins into 6-damage wins.

const neverBustWeapon: Strategy = {
  name: 'neverBustWeapon',
  description: 'Stand 12+, DD on 11, weapon rush + health/poison pots.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && !soft && score === 11) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyWeaponRush(view);
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

// ── 13. Never Bust + Full Sustain ──
// Stand 12+, buy ALL consumables possible, especially health and poison.
// Maximum effective HP through aggressive healing.

const neverBustSustain: Strategy = {
  name: 'neverBustSustain',
  description: 'Stand 12+, DD on 11, max consumable buying and usage. Heal at HP<40.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumables = view.player.consumables;
        if (consumables.length === 0) return { type: 'continue' };

        // Heal aggressively: HP < 40
        const healthIdx = consumables.findIndex(c => c.type === 'health_potion');
        if (healthIdx >= 0 && view.player.hp < 40) {
          return { type: 'use_consumable', itemIndex: healthIdx };
        }

        // Poison at start of every battle
        if (view.handNumber === 1) {
          const poisonIdx = consumables.findIndex(c => c.type === 'poison_potion');
          if (poisonIdx >= 0) return { type: 'use_consumable', itemIndex: poisonIdx };
          const dmgIdx = consumables.findIndex(c => c.type === 'damage_potion');
          if (dmgIdx >= 0) return { type: 'use_consumable', itemIndex: dmgIdx };
        }

        // Strength on bosses
        if (view.enemy?.isBoss && view.handNumber <= 2) {
          const strIdx = consumables.findIndex(c => c.type === 'strength_potion');
          if (strIdx >= 0) return { type: 'use_consumable', itemIndex: strIdx };
        }

        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && !soft && score === 11) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        if (!view.shop) return { type: 'skip_shop' };

        // Buy ALL health potions available
        const healthPot = view.shop.items.find(
          item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
        );
        if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

        // Buy poison potions
        const poisonPot = view.shop.items.find(
          item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
        );
        if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

        // Buy any consumable
        const anyCons = view.shop.items.find(item => item.affordable && item.type === 'consumable');
        if (anyCons) return { type: 'buy_item', itemIndex: anyCons.index };

        // Then weapon if available
        const weapon = view.shop.items
          .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
          .sort((a, b) => b.item.cost - a.item.cost);
        if (weapon.length > 0) return { type: 'buy_item', itemIndex: weapon[0].index };

        // Then armor
        const armor = view.shop.items
          .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'armor')
          .sort((a, b) => b.item.cost - a.item.cost);
        if (armor.length > 0) return { type: 'buy_item', itemIndex: armor[0].index };

        return { type: 'skip_shop' };
      }
      case 'genie':
        return { type: 'enter_wish', text: 'I wish for victory' };
      default:
        return { type: 'continue' };
    }
  },
};

// ── 14. Iron Trinket Rush ──
// Save gold for Iron Trinket (75g, bust → score 10 instead of death).
// Once equipped, play aggressively with DD since busting is no longer catastrophic.

const ironTrinketRush: Strategy = {
  name: 'ironTrinketRush',
  description: 'Save for Iron Trinket (bust=10). Then aggressive DD. Bust becomes minor loss, not catastrophe.',
  decideAction(view: GameView): PlayerAction {
    const hasTrinket = view.player.equipment.trinket !== null;

    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        if (hasTrinket) {
          // With Iron Trinket, busting is only score 10 vs dealer — minor penalty.
          // Play much more aggressively.
          if (canDoubleDown(view) && shouldDoubleDownAggressive(score, dealerCard, soft)) {
            return { type: 'double_down' };
          }
          // Hit more aggressively: stand on 17+ vs strong, 15+ vs weak
          if (soft) {
            if (score >= 19) return { type: 'stand' };
            return { type: 'hit' };
          }
          if (dealerCard >= 2 && dealerCard <= 6) {
            return score >= 15 ? { type: 'stand' } : { type: 'hit' };
          }
          return score >= 17 ? { type: 'stand' } : { type: 'hit' };
        }

        // Without trinket: ultra conservative
        if (canDoubleDown(view) && !soft && score === 11) {
          return { type: 'double_down' };
        }
        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        if (!view.shop) return { type: 'skip_shop' };

        // Priority 1: Iron Trinket if available and affordable
        const ironTrinket = view.shop.items.find(
          item => item.affordable && item.type === 'equipment' && item.item.id === 'trinket_iron'
        );
        if (ironTrinket) return { type: 'buy_item', itemIndex: ironTrinket.index };

        // If we don't have trinket yet and can't afford iron, save gold (only buy health pots)
        if (!hasTrinket) {
          const healthPot = view.shop.items.find(
            item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
          );
          if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };
          return { type: 'skip_shop' };
        }

        // After trinket: buy weapon, then consumables
        const buy = buyWeaponRush(view);
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

// ══════════════════════════════════════════════════════════
// WAVE 4: OPTIMIZED NEVER-BUST VARIANTS
// ══════════════════════════════════════════════════════════

// ── Shop helper: cloth trinket rush (+10g/battle) ──

/** Rush cloth trinket for economy, then poison + health pots, then weapon. */
function buyGoldRush(view: GameView): PlayerAction | null {
  if (!view.shop) return null;

  // Priority 1: Cloth trinket if we don't have a trinket
  if (!view.player.equipment.trinket) {
    const clothTrinket = view.shop.items.find(
      item => item.affordable && item.type === 'equipment' && item.item.id === 'trinket_cloth'
    );
    if (clothTrinket) return { type: 'buy_item', itemIndex: clothTrinket.index };
  }

  // Poison potions (bypass armor, 9 total damage)
  const poisonPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
  );
  if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

  // Health potions
  const healthPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
  );
  if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

  // Weapon for damage amplification
  const weapon = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
    .sort((a, b) => b.item.cost - a.item.cost);
  if (weapon.length > 0) return { type: 'buy_item', itemIndex: weapon[0].index };

  // Any other consumable
  const anyCons = view.shop.items.find(item => item.affordable && item.type === 'consumable');
  if (anyCons) return { type: 'buy_item', itemIndex: anyCons.index };

  return null;
}

/** Prioritize boots (dodge negates entire hit), then weapon, then consumables. */
function buyBootsPriority(view: GameView): PlayerAction | null {
  if (!view.shop) return null;

  // Boots first — dodge completely negates a loss
  const boots = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'boots')
    .sort((a, b) => b.item.cost - a.item.cost);
  if (boots.length > 0) return { type: 'buy_item', itemIndex: boots[0].index };

  // Weapon second
  const weapon = view.shop.items
    .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
    .sort((a, b) => b.item.cost - a.item.cost);
  if (weapon.length > 0) return { type: 'buy_item', itemIndex: weapon[0].index };

  // Health potions
  const healthPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
  );
  if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

  // Poison
  const poisonPot = view.shop.items.find(
    item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
  );
  if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

  // Any consumable
  const anyCons = view.shop.items.find(item => item.affordable && item.type === 'consumable');
  if (anyCons) return { type: 'buy_item', itemIndex: anyCons.index };

  return null;
}

/** Dump all consumables on boss fights. Health at HP<35, all offense at hand 1-2. */
function tryUseConsumableBossBlitz(view: GameView): PlayerAction | null {
  const consumables = view.player.consumables;
  if (consumables.length === 0) return null;

  // Always heal when below 35 HP
  const healthIndex = consumables.findIndex(c => c.type === 'health_potion');
  if (healthIndex >= 0 && view.player.hp < 35) {
    return { type: 'use_consumable', itemIndex: healthIndex };
  }

  // On boss fights: dump EVERYTHING at hand 1-2
  if (view.enemy?.isBoss && view.handNumber <= 2) {
    const poisonIdx = consumables.findIndex(c => c.type === 'poison_potion');
    if (poisonIdx >= 0) return { type: 'use_consumable', itemIndex: poisonIdx };

    const strengthIdx = consumables.findIndex(c => c.type === 'strength_potion');
    if (strengthIdx >= 0) return { type: 'use_consumable', itemIndex: strengthIdx };

    const dmgIdx = consumables.findIndex(c => c.type === 'damage_potion');
    if (dmgIdx >= 0) return { type: 'use_consumable', itemIndex: dmgIdx };
  }

  // On regular fights: poison at hand 1 (9 damage bypasses armor)
  if (view.handNumber === 1) {
    const poisonIdx = consumables.findIndex(c => c.type === 'poison_potion');
    if (poisonIdx >= 0) return { type: 'use_consumable', itemIndex: poisonIdx };

    const dmgIdx = consumables.findIndex(c => c.type === 'damage_potion');
    if (dmgIdx >= 0) return { type: 'use_consumable', itemIndex: dmgIdx };
  }

  return null;
}

// ── 15. Never Bust DD10 ──
// DD on hard 10 AND 11 — both are safe (max result = 21, impossible to bust).
// Standard neverBust only DDs on 11, leaving free damage on the table.

const neverBustDD10: Strategy = {
  name: 'neverBustDD10',
  description: 'Stand 12+. DD on hard 10 AND 11 (both safe). Poison+health pots.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        // DD on hard 10 and 11 — both max at 21, can't bust
        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyPoisonFocused(view);
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

// ── 16. Never Bust Gold ──
// Rush cloth trinket (+10g per battle) for massive economy advantage.
// Extra gold buys more poison + health pots. ~95g more over a full run.

const neverBustGold: Strategy = {
  name: 'neverBustGold',
  description: 'Stand 12+, DD on 10-11. Rush cloth trinket (+10g/battle). More gold = more pots.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyGoldRush(view);
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

// ── 17. Never Bust Boots ──
// Prioritize boots — dodge completely negates a loss (100% damage reduction).
// Cloth boots (10% dodge, 20g) are the best EV item for never-bust.

const neverBustBoots: Strategy = {
  name: 'neverBustBoots',
  description: 'Stand 12+, DD on 10-11. Boots priority (dodge = full damage negation).',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyBootsPriority(view);
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

// ── 18. Never Bust Boss Blitz ──
// Save offensive consumables for bosses, dump everything at hand 1-2.
// Stacking poison + strength + damage potion on boss = massive burst.

const neverBustBossBlitz: Strategy = {
  name: 'neverBustBossBlitz',
  description: 'Stand 12+, DD on 10-11. Hoard consumables for boss fights, dump all at once.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableBossBlitz(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyConsumablesFirst(view);
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

// ── 19. Adaptive Never Bust ──
// Mostly never-bust but hits on exactly 12 vs dealer 7+ (only 31% bust chance).
// Standing on 12 vs dealer 10 means near-certain 8-damage loss.
// Hitting on 12 vs dealer 10: 31% bust (~19 dmg) + 69% improved hand.
// The math is close — this tests if the slight aggression helps kill rate.

const adaptiveNeverBust: Strategy = {
  name: 'adaptiveNeverBust',
  description: 'Stand 13+ always. Hit on 12 vs dealer 7+ (low bust risk, bad stand). DD on 10-11.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumable = tryUseConsumableMax(view);
        if (consumable) return consumable;
        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const dealerCard = dealerVisibleCardValue(view);
        const soft = isSoftHand(view);

        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };

        // Key difference: hit on exactly 12 vs strong dealer (7+)
        if (score === 12 && dealerCard >= 7) {
          return { type: 'hit' };
        }

        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        const buy = buyPoisonFocused(view);
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

// ── 20. Never Bust Full Kit ──
// The "ideal" never-bust build combining all Wave 3-4 learnings:
// - DD on 10 AND 11 (safe max damage)
// - Cloth trinket rush for economy (+10g/battle = ~95g extra)
// - Then weapon for damage amplification
// - Then boots for dodge
// - Aggressive consumable usage every fight (poison bypasses armor)
// - Health pots at HP < 40

const neverBustFullKit: Strategy = {
  name: 'neverBustFullKit',
  description: 'DD 10-11, cloth trinket rush, weapon, boots, aggressive consumables. Optimized build.',
  decideAction(view: GameView): PlayerAction {
    switch (view.phase) {
      case 'pre_hand': {
        const consumables = view.player.consumables;
        if (consumables.length === 0) return { type: 'continue' };

        // Heal at HP < 40
        const healthIdx = consumables.findIndex(c => c.type === 'health_potion');
        if (healthIdx >= 0 && view.player.hp < 40) {
          return { type: 'use_consumable', itemIndex: healthIdx };
        }

        // Poison every fight (9 total damage, bypasses armor)
        if (view.handNumber === 1) {
          const poisonIdx = consumables.findIndex(c => c.type === 'poison_potion');
          if (poisonIdx >= 0) return { type: 'use_consumable', itemIndex: poisonIdx };
        }

        // All offensive consumables on bosses
        if (view.enemy?.isBoss && view.handNumber <= 2) {
          const strIdx = consumables.findIndex(c => c.type === 'strength_potion');
          if (strIdx >= 0) return { type: 'use_consumable', itemIndex: strIdx };
          const dmgIdx = consumables.findIndex(c => c.type === 'damage_potion');
          if (dmgIdx >= 0) return { type: 'use_consumable', itemIndex: dmgIdx };
        }

        // Damage potions on regular fights too
        if (view.handNumber === 1) {
          const dmgIdx = consumables.findIndex(c => c.type === 'damage_potion');
          if (dmgIdx >= 0) return { type: 'use_consumable', itemIndex: dmgIdx };
        }

        return { type: 'continue' };
      }
      case 'player_turn': {
        const score = view.player.handScore?.value ?? 0;
        const soft = isSoftHand(view);

        // DD on hard 10 and 11
        if (canDoubleDown(view) && !soft && (score === 10 || score === 11)) {
          return { type: 'double_down' };
        }

        if (soft) return score >= 18 ? { type: 'stand' } : { type: 'hit' };
        return score >= 12 ? { type: 'stand' } : { type: 'hit' };
      }
      case 'hand_result':
      case 'battle_result':
        return { type: 'continue' };
      case 'shop': {
        if (!view.shop) return { type: 'skip_shop' };

        // Cloth trinket rush — +10g per battle, 15g cost, pays for itself in 2 battles
        if (!view.player.equipment.trinket) {
          const clothTrinket = view.shop.items.find(
            item => item.affordable && item.type === 'equipment' && item.item.id === 'trinket_cloth'
          );
          if (clothTrinket) return { type: 'buy_item', itemIndex: clothTrinket.index };
        }

        // Weapon for damage amplification
        if (!view.player.equipment.weapon) {
          const weapons = view.shop.items
            .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'weapon')
            .sort((a, b) => b.item.cost - a.item.cost);
          if (weapons.length > 0) return { type: 'buy_item', itemIndex: weapons[0].index };
        }

        // Boots for dodge
        if (!view.player.equipment.boots) {
          const boots = view.shop.items
            .filter(item => item.affordable && item.type === 'equipment' && 'slot' in item.item && (item.item as Equipment).slot === 'boots')
            .sort((a, b) => b.item.cost - a.item.cost);
          if (boots.length > 0) return { type: 'buy_item', itemIndex: boots[0].index };
        }

        // Poison potions — bypass armor, best damage consumable
        const poisonPot = view.shop.items.find(
          item => item.affordable && item.type === 'consumable' && item.item.id === 'poison_potion'
        );
        if (poisonPot) return { type: 'buy_item', itemIndex: poisonPot.index };

        // Health potions
        const healthPot = view.shop.items.find(
          item => item.affordable && item.type === 'consumable' && item.item.id === 'health_potion'
        );
        if (healthPot) return { type: 'buy_item', itemIndex: healthPot.index };

        // Upgrade equipment
        const buy = buySmartPriority(view, ['weapon', 'boots', 'armor', 'trinket']);
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

export const standOn14 = makeStandOnN(14, () => null, '_skipShop');
export const standOn17 = makeStandOnN(17, buyCheapestEquipment);
export const standOn15 = makeStandOnN(15, buyCheapestEquipment);
export const standOn19 = makeStandOnN(19, buyCheapestEquipment);
export { basicStrategy };
export const standOn17_skipShop = makeStandOnN(17, () => null, '_skipShop');
export const standOn17_priorityWeapon = makeStandOnN(17, (v) => buyPrioritySlot(v, 'weapon'), '_priorityWeapon');
export const standOn17_priorityArmor = makeStandOnN(17, (v) => buyPrioritySlot(v, 'armor'), '_priorityArmor');
export const standOn17_priorityBoots = makeStandOnN(17, (v) => buyPrioritySlot(v, 'boots'), '_priorityBoots');
export {
  basicWithDD, glassCannon, tankBuild, smartShopper, consumableHeavy, adaptiveHP,
  poisonMaster, weaponRushDD, ultraConservative, balancedOptimal,
  neverBust, neverBustWeapon, neverBustSustain, ironTrinketRush,
  neverBustDD10, neverBustGold, neverBustBoots, neverBustBossBlitz,
  adaptiveNeverBust, neverBustFullKit,
};

export const ALL_STRATEGIES: Strategy[] = [
  standOn14,
  standOn17,
  standOn15,
  standOn19,
  basicStrategy,
  standOn17_skipShop,
  standOn17_priorityWeapon,
  standOn17_priorityArmor,
  standOn17_priorityBoots,
  basicWithDD,
  glassCannon,
  tankBuild,
  smartShopper,
  consumableHeavy,
  adaptiveHP,
  poisonMaster,
  weaponRushDD,
  ultraConservative,
  balancedOptimal,
  neverBust,
  neverBustWeapon,
  neverBustSustain,
  ironTrinketRush,
  neverBustDD10,
  neverBustGold,
  neverBustBoots,
  neverBustBossBlitz,
  adaptiveNeverBust,
  neverBustFullKit,
];
