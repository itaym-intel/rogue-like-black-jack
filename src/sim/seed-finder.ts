import { GameEngine } from '../engine/game.js';
import type { Card, GamePhase, EquipmentSlot, Equipment, Consumable, Rank, Suit } from '../engine/types.js';
import type {
  Strategy, GameTrace, HandTrace, ShopTrace, BattleTrace,
  SeedFilter, SeedScorer, SeedFinderConfig, SeedFinderMatch, SeedFinderOutput,
} from './types.js';

// ── traceGame: drive the engine step-by-step, capturing rich snapshots ──

export function traceGame(seed: string, strategy: Strategy): GameTrace {
  const engine = new GameEngine(seed);

  const hands: HandTrace[] = [];
  const shops: ShopTrace[] = [];
  const battles: BattleTrace[] = [];
  let totalHandsPlayed = 0;
  let handsInCurrentBattle = 0;
  let actionCount = 0;

  // Track shop inventory snapshots — capture once per shop visit
  let shopCaptured = false;
  let currentShopPurchases: string[] = [];

  // Track hand result capture to avoid duplicates.
  // lastHandResult persists in the engine until endBattle clears it,
  // so we use a flag to ensure we only capture once per hand.
  let handResultCaptured = true; // Start true — no hand dealt yet
  // Track best-known cards throughout the hand
  let currentPlayerCards: Card[] = [];
  let currentDealerCards: Card[] = [];

  let view = engine.getView();

  while (actionCount < 5000) {
    view = engine.getView();

    if (view.phase === 'game_over' || view.phase === 'victory') break;

    const prevPhase = view.phase as GamePhase;

    // Keep card snapshots up to date from the current view
    if (view.player.hand && view.player.hand.length > 0) {
      currentPlayerCards = [...view.player.hand];
    }
    if (view.enemy) {
      const visible = view.enemy.visibleCards.filter((c): c is Card => c !== null);
      if (visible.length > 0) {
        currentDealerCards = [...visible];
      }
    }

    // Capture shop inventory on first sight of shop phase
    if (prevPhase === 'shop' && !shopCaptured && view.shop) {
      const inventory = view.shop.items.map(si => {
        const isEquip = si.type === 'equipment';
        const eq = isEquip ? (si.item as Equipment) : null;
        return {
          id: si.item.id,
          name: si.item.name,
          type: si.type,
          slot: eq?.slot,
          tier: eq?.tier,
          cost: si.item.cost,
        };
      });
      shops.push({
        stage: view.stage,
        battle: view.battle,
        inventory,
        purchased: currentShopPurchases,
      });
      shopCaptured = true;
    }

    const action = strategy.decideAction(view);
    const result = engine.performAction(action);
    actionCount++;

    const newView = engine.getView();

    // Track shop purchases
    if (action.type === 'buy_item' && result.success && view.shop) {
      const shopItem = view.shop.items[action.itemIndex];
      if (shopItem) {
        currentShopPurchases.push(shopItem.item.id);
      }
    }

    // Mark ready-to-capture when a new hand starts being dealt
    if (action.type === 'continue' && prevPhase === 'pre_hand') {
      handResultCaptured = false;
      currentPlayerCards = [];
      currentDealerCards = [];
    }

    // Update card snapshots from newView (captures cards after hit, deal, etc.)
    if (newView.player.hand && newView.player.hand.length > 0) {
      currentPlayerCards = [...newView.player.hand];
    }
    if (newView.enemy) {
      const visible = newView.enemy.visibleCards.filter((c): c is Card => c !== null);
      if (visible.length > 0) {
        currentDealerCards = [...visible];
      }
    }

    // Track hand results — detect phase transitions that indicate a hand completed
    if (!handResultCaptured && newView.lastHandResult) {
      const handEnded =
        // Normal: player was playing, hand resolved
        (prevPhase === 'player_turn' && newView.phase !== 'player_turn') ||
        // Blackjack: dealt in pre_hand, auto-resolved (skipped player_turn)
        (prevPhase === 'pre_hand' && action.type === 'continue' &&
          newView.phase !== 'player_turn' && newView.phase !== 'pre_hand');

      if (handEnded) {
        handResultCaptured = true;
        totalHandsPlayed++;
        handsInCurrentBattle++;
        const hr = newView.lastHandResult;

        hands.push({
          stage: view.stage,
          battle: view.battle,
          handNumber: view.handNumber,
          playerCards: [...currentPlayerCards],
          dealerCards: [...currentDealerCards],
          playerScore: hr.playerScore.value,
          dealerScore: hr.dealerScore.value,
          playerBlackjack: hr.playerScore.isBlackjack,
          dealerBlackjack: hr.dealerScore.isBlackjack,
          playerBusted: hr.playerScore.busted,
          dealerBusted: hr.dealerScore.busted,
          winner: hr.winner,
          damageDealt: hr.damageDealt,
          damageTarget: hr.damageTarget,
          dodged: hr.dodged,
          playerHp: newView.player.hp,
          enemyHp: newView.enemy?.hp ?? 0,
        });
      }
    }

    // Track battle end
    if (newView.phase === 'battle_result' && prevPhase !== 'battle_result') {
      battles.push({
        stage: view.stage,
        battle: view.battle,
        enemyName: view.enemy?.name ?? 'Unknown',
        enemyMaxHp: view.enemy?.maxHp ?? 0,
        isBoss: view.enemy?.isBoss ?? false,
        handsPlayed: handsInCurrentBattle,
        playerHpAfter: newView.player.hp,
      });
      handsInCurrentBattle = 0;
    }

    // Reset shop tracking when leaving shop
    if (prevPhase === 'shop' && newView.phase !== 'shop') {
      shopCaptured = false;
      currentShopPurchases = [];
    }
  }

  // Final view for outcome
  view = engine.getView();

  const deathEnemy = view.phase === 'game_over'
    ? (view.enemy?.name ?? 'Unknown')
    : null;

  return {
    seed,
    strategyName: strategy.name,
    outcome: view.phase === 'victory' ? 'victory' : 'game_over',
    finalStage: view.stage,
    finalBattle: view.battle,
    finalHp: view.player.hp,
    finalGold: view.player.gold,
    totalHandsPlayed,
    hands,
    shops,
    battles,
    deathEnemy,
  };
}

// ── findSeeds: search seeds, apply filters, rank by scorer ──

export function findSeeds(config: SeedFinderConfig): SeedFinderOutput {
  const startTime = Date.now();
  const matches: SeedFinderMatch[] = [];
  let totalMatched = 0;

  for (let i = 0; i < config.count; i++) {
    const seed = `${config.seedPrefix}-${i}`;
    const trace = traceGame(seed, config.strategy);

    // Apply all filters (AND)
    const passes = config.filters.every(f => f(trace));
    if (!passes) continue;

    totalMatched++;
    const score = config.scorer(trace);

    // Maintain sorted top-N list
    if (matches.length < config.topN) {
      matches.push({ seed, score, trace });
      matches.sort((a, b) => b.score - a.score);
    } else if (score > matches[matches.length - 1].score) {
      matches[matches.length - 1] = { seed, score, trace };
      matches.sort((a, b) => b.score - a.score);
    }
  }

  return {
    matches,
    totalSearched: config.count,
    totalMatched,
    durationMs: Date.now() - startTime,
  };
}

// ── Filter factories ──

export const filters = {
  victory(): SeedFilter {
    return (t) => t.outcome === 'victory';
  },

  gameOver(): SeedFilter {
    return (t) => t.outcome === 'game_over';
  },

  minStage(n: number): SeedFilter {
    return (t) => t.finalStage >= n;
  },

  minBlackjacks(n: number): SeedFilter {
    return (t) => t.hands.filter(h => h.playerBlackjack).length >= n;
  },

  maxDealerBlackjacks(n: number): SeedFilter {
    return (t) => t.hands.filter(h => h.dealerBlackjack).length <= n;
  },

  noBusts(): SeedFilter {
    return (t) => t.hands.every(h => !h.playerBusted);
  },

  allBlackjacks(): SeedFilter {
    return (t) => t.hands.length > 0 && t.hands.every(h => h.playerBlackjack);
  },

  blackjackOnHand(stage: number, battle: number, hand: number): SeedFilter {
    return (t) => t.hands.some(h =>
      h.stage === stage && h.battle === battle && h.handNumber === hand && h.playerBlackjack
    );
  },

  cardDealtToPlayer(rank: Rank, suit?: Suit, stage?: number, battle?: number, hand?: number): SeedFilter {
    return (t) => t.hands.some(h => {
      if (stage !== undefined && h.stage !== stage) return false;
      if (battle !== undefined && h.battle !== battle) return false;
      if (hand !== undefined && h.handNumber !== hand) return false;
      return h.playerCards.some(c => c.rank === rank && (suit === undefined || c.suit === suit));
    });
  },

  cardDealtToDealer(rank: Rank, suit?: Suit, stage?: number, battle?: number, hand?: number): SeedFilter {
    return (t) => t.hands.some(h => {
      if (stage !== undefined && h.stage !== stage) return false;
      if (battle !== undefined && h.battle !== battle) return false;
      if (hand !== undefined && h.handNumber !== hand) return false;
      return h.dealerCards.some(c => c.rank === rank && (suit === undefined || c.suit === suit));
    });
  },

  firstPlayerCard(rank: Rank, suit?: Suit): SeedFilter {
    return (t) => {
      if (t.hands.length === 0) return false;
      const first = t.hands[0];
      if (first.playerCards.length === 0) return false;
      const card = first.playerCards[0];
      return card.rank === rank && (suit === undefined || card.suit === suit);
    };
  },

  shopContains(itemId: string, stage?: number, battle?: number): SeedFilter {
    return (t) => t.shops.some(s => {
      if (stage !== undefined && s.stage !== stage) return false;
      if (battle !== undefined && s.battle !== battle) return false;
      return s.inventory.some(item => item.id === itemId);
    });
  },

  shopContainsSlot(slot: string, tier?: string, stage?: number, battle?: number): SeedFilter {
    return (t) => t.shops.some(s => {
      if (stage !== undefined && s.stage !== stage) return false;
      if (battle !== undefined && s.battle !== battle) return false;
      return s.inventory.some(item =>
        item.slot === slot && (tier === undefined || item.tier === tier)
      );
    });
  },

  enemyAtBattle(enemyName: string, stage?: number, battle?: number): SeedFilter {
    return (t) => t.battles.some(b => {
      if (stage !== undefined && b.stage !== stage) return false;
      if (battle !== undefined && b.battle !== battle) return false;
      return b.enemyName === enemyName;
    });
  },

  deathTo(enemyName: string): SeedFilter {
    return (t) => t.deathEnemy === enemyName;
  },

  minFinalHp(n: number): SeedFilter {
    return (t) => t.finalHp >= n;
  },

  noDodges(): SeedFilter {
    return (t) => t.hands.every(h => !h.dodged);
  },

  minDodges(n: number): SeedFilter {
    return (t) => t.hands.filter(h => h.dodged).length >= n;
  },

  handWinner(winner: 'player' | 'dealer' | 'push', stage: number, battle: number, hand: number): SeedFilter {
    return (t) => t.hands.some(h =>
      h.stage === stage && h.battle === battle && h.handNumber === hand && h.winner === winner
    );
  },

  custom(fn: (trace: GameTrace) => boolean): SeedFilter {
    return fn;
  },
};

// ── Scorer factories ──

export const scorers = {
  blackjackCount(): SeedScorer {
    return (t) => t.hands.filter(h => h.playerBlackjack).length;
  },

  blackjackRate(): SeedScorer {
    return (t) => t.hands.length > 0
      ? t.hands.filter(h => h.playerBlackjack).length / t.hands.length
      : 0;
  },

  finalHp(): SeedScorer {
    return (t) => t.finalHp;
  },

  fewestHands(): SeedScorer {
    // Invert so fewer hands = higher score
    return (t) => -t.totalHandsPlayed;
  },

  totalDamage(): SeedScorer {
    return (t) => t.hands
      .filter(h => h.damageTarget === 'dealer')
      .reduce((sum, h) => sum + h.damageDealt, 0);
  },

  leastDamage(): SeedScorer {
    // Invert so less damage received = higher score
    return (t) => -t.hands
      .filter(h => h.damageTarget === 'player')
      .reduce((sum, h) => sum + h.damageDealt, 0);
  },

  goldEarned(): SeedScorer {
    return (t) => t.finalGold;
  },

  constant(): SeedScorer {
    return () => 0;
  },

  custom(fn: (trace: GameTrace) => number): SeedScorer {
    return fn;
  },
};
