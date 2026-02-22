import type { Card, Hand, HandResult, HandScore, GameRules, Modifier, ModifierContext } from './types.js';
import { SeededRNG } from './rng.js';
import { createDeck } from './cards.js';
import { scoreHand, compareHands, calculateBaseDamage } from './scoring.js';
import { applyDamageModifiers } from './modifiers.js';

export interface CombatState {
  deck: Card[];
  deckIndex: number;
  playerHand: Hand;
  dealerHand: Hand;
  dealerFaceDown: boolean;
  doubledDown: boolean;
}

function drawCard(combat: CombatState): Card {
  if (combat.deckIndex >= combat.deck.length) {
    throw new Error('Deck exhausted');
  }
  return combat.deck[combat.deckIndex++];
}

export function initCombat(rng: SeededRNG, rules: GameRules): CombatState {
  const deck = createDeck(rng, rules.deck.numberOfDecks);
  return {
    deck,
    deckIndex: 0,
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    dealerFaceDown: true,
    doubledDown: false,
  };
}

export function dealInitialCards(combat: CombatState, rules: GameRules): CombatState {
  const result = { ...combat, playerHand: { cards: [...combat.playerHand.cards] }, dealerHand: { cards: [...combat.dealerHand.cards] } };
  for (let i = 0; i < rules.turnOrder.initialPlayerCards; i++) {
    result.playerHand.cards.push(drawCard(result));
  }
  for (let i = 0; i < rules.turnOrder.initialDealerCards; i++) {
    result.dealerHand.cards.push(drawCard(result));
  }
  return result;
}

export function playerHit(combat: CombatState): CombatState {
  const result = { ...combat, playerHand: { cards: [...combat.playerHand.cards] } };
  result.playerHand.cards.push(drawCard(result));
  return result;
}

export function playerStand(_combat: CombatState): CombatState {
  return { ..._combat, dealerFaceDown: false };
}

export function playerDoubleDown(combat: CombatState): CombatState {
  const result = { ...combat, playerHand: { cards: [...combat.playerHand.cards] }, doubledDown: true };
  result.playerHand.cards.push(drawCard(result));
  result.dealerFaceDown = false;
  return result;
}

export function dealerPlay(combat: CombatState, rules: GameRules): CombatState {
  const result = { ...combat, dealerHand: { cards: [...combat.dealerHand.cards] }, dealerFaceDown: false };

  while (true) {
    const score = scoreHand(result.dealerHand, rules);
    if (score.busted) break;
    if (score.value > rules.dealer.standsOn) break;
    if (score.value === rules.dealer.standsOn) {
      if (rules.dealer.standsOnSoft17 || !score.soft) break;
      // Dealer hits on soft 17 if standsOnSoft17 is false
    }
    result.dealerHand.cards.push(drawCard(result));
  }

  return result;
}

export function resolveHand(
  combat: CombatState,
  playerMods: Modifier[],
  enemyMods: Modifier[],
  rules: GameRules,
  context: ModifierContext
): HandResult {
  let playerScore = scoreHand(combat.playerHand, rules);
  let dealerScore = scoreHand(combat.dealerHand, rules);

  // Apply bust modifiers for player
  if (playerScore.busted) {
    for (const mod of playerMods) {
      if (mod.modifyBust) {
        const result = mod.modifyBust(combat.playerHand, playerScore.value, context);
        if (result) {
          playerScore = { ...playerScore, busted: result.busted, value: result.effectiveScore };
        }
      }
    }
  }

  // Apply bust modifiers for dealer (enemy)
  if (dealerScore.busted) {
    for (const mod of enemyMods) {
      if (mod.modifyBust) {
        const result = mod.modifyBust(combat.dealerHand, dealerScore.value, context);
        if (result) {
          dealerScore = { ...dealerScore, busted: result.busted, value: result.effectiveScore };
        }
      }
    }
  }

  const winner = compareHands(playerScore, dealerScore, rules);

  if (winner === 'push') {
    return {
      playerScore,
      dealerScore,
      winner: 'push',
      damageDealt: 0,
      damageTarget: 'none',
      dodged: false,
      damageBreakdown: 'Push — no damage',
    };
  }

  const winnerScore = winner === 'player' ? playerScore : dealerScore;
  const loserScore = winner === 'player' ? dealerScore : playerScore;
  const attackerMods = winner === 'player' ? playerMods : enemyMods;
  const defenderMods = winner === 'player' ? enemyMods : playerMods;

  let baseDamage = calculateBaseDamage(winnerScore, loserScore, rules);

  // Double down multiplier
  if (combat.doubledDown && winner === 'player') {
    baseDamage = Math.floor(baseDamage * rules.actions.doubleDownMultiplier);
  }

  const { finalDamage, dodged, breakdown } = applyDamageModifiers(
    baseDamage, attackerMods, defenderMods,
    { ...context, playerScore, dealerScore }
  );

  return {
    playerScore,
    dealerScore,
    winner,
    damageDealt: finalDamage,
    damageTarget: winner === 'player' ? 'dealer' : 'player',
    dodged,
    damageBreakdown: breakdown,
  };
}
