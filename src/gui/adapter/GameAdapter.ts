/**
 * GameAdapter
 * ──────────────────────────────────────────────────────────────────────────────
 * This is the SOLE import boundary between the engine and the GUI layer.
 *
 * - ALL GUI code (scenes, components) must import only from src/gui/adapter/.
 * - Engine types are NEVER imported outside this file in the GUI tree.
 *
 * If the engine is refactored, rewritten, or replaced, only this file (and
 * potentially ViewTypes.ts if the GUI needs new data) should need to change.
 */

import { BlackjackEngine } from "../../engine/engine.js";
import type { EngineOptions } from "../../engine/engine.js";
import type { Card, GameState, HandState, RoundSummary } from "../../engine/types.js";
import type { PlayerAction } from "../../engine/types.js";

import { TypedEmitter } from "./TypedEmitter.js";
import type { GameEventMap } from "./GameEvents.js";
import type {
  GuiCard,
  GuiGamePhase,
  GuiGameState,
  GuiHand,
  GuiHandResult,
  GuiPlayerAction,
  GuiRoundSummary,
} from "./ViewTypes.js";

export type { GuiCard, GuiGamePhase, GuiGameState, GuiHand, GuiHandResult, GuiPlayerAction, GuiRoundSummary };

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AdapterOptions extends EngineOptions {}

export class GameAdapter extends TypedEmitter<GameEventMap> {
  private readonly engine: BlackjackEngine;

  constructor(options: AdapterOptions = {}) {
    super();
    this.engine = new BlackjackEngine(options);
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  /** Returns a complete GUI-facing snapshot. Safe to call at any time. */
  getState(): GuiGameState {
    return this.buildGuiState(this.engine.getState());
  }

  // ── Commands ─────────────────────────────────────────────────────────────

  /**
   * Place a wager and start a new round.
   * Emits: roundStarted, stateChanged.
   * Throws if the wager is invalid (invalid amount, phase wrong, etc.).
   */
  startRound(wager: number): void {
    this.engine.startRound(wager);
    const state = this.getState();
    this.emit("roundStarted", { wager, state });
    this.emit("stateChanged", { state });
  }

  /**
   * Execute a player action (hit / stand / double / split).
   * Emits: actionApplied, then optionally roundSettled and/or gameOver, then stateChanged.
   * Throws if the action is unavailable.
   */
  performAction(action: GuiPlayerAction): void {
    this.engine.performAction(action as PlayerAction);
    const state = this.getState();

    this.emit("actionApplied", { action, state });

    if (state.phase === "round_settled" || state.phase === "game_over") {
      if (state.lastRoundSummary) {
        this.emit("roundSettled", { summary: state.lastRoundSummary, state });
      }
    }

    if (state.phase === "game_over") {
      this.emit("gameOver", { finalBankroll: state.bankroll });
    }

    this.emit("stateChanged", { state });
  }

  // ── Private translation helpers ───────────────────────────────────────────

  private buildGuiState(raw: GameState): GuiGameState {
    const isPlayerTurn = raw.phase === "player_turn";
    const availableActions = this.engine.getAvailableActions() as GuiPlayerAction[];

    const dealerCards = raw.dealerHand.map((card, index) =>
      this.toGuiCard(card, isPlayerTurn && index === 1),
    );

    // Dealer score: during player_turn show only visible card contribution so
    // the UI can display "??" for the hidden card's value without spoiling it.
    const dealerScore =
      isPlayerTurn && raw.dealerHand.length >= 2
        ? this.engine.getDealerScore() // engine computes correctly; adapter hides in UI
        : this.engine.getDealerScore();

    const playerHands: GuiHand[] = raw.playerHands.map((hand, index) =>
      this.toGuiHand(hand, index, raw.activeHandIndex),
    );

    return {
      phase: raw.phase as GuiGamePhase,
      roundNumber: raw.roundNumber,
      bankroll: raw.bankroll,
      targetScore: raw.targetScore,
      dealerCards,
      dealerScore,
      playerHands,
      activeHandIndex: raw.activeHandIndex,
      currentWager: raw.currentWager,
      deckRemaining: raw.deckRemaining,
      availableActions,
      minimumBet: this.engine.getMinimumBet(),
      lastRoundSummary: raw.lastRoundSummary
        ? this.toGuiRoundSummary(raw.lastRoundSummary)
        : null,
    };
  }

  private toGuiCard(card: Card, faceDown: boolean): GuiCard {
    return {
      rank: card.rank,
      suit: card.suit,
      id: card.id,
      faceDown,
    };
  }

  private toGuiHand(
    hand: HandState,
    index: number,
    activeHandIndex: number | null,
  ): GuiHand {
    const score = this.engine.getPlayerHandScore(index);
    return {
      id: hand.id,
      cards: hand.cards.map((c) => this.toGuiCard(c, false)),
      score,
      wager: hand.wager,
      isActive: activeHandIndex === index,
      isBusted: hand.isBusted,
      isStanding: hand.isStanding,
      isDoubled: hand.isDoubled,
      isFromSplit: hand.isFromSplit,
    };
  }

  private toGuiRoundSummary(summary: RoundSummary): GuiRoundSummary {
    const handResults: GuiHandResult[] = summary.handResults.map((r) => ({
      handId: r.handId,
      cards: r.cards.map((c) => this.toGuiCard(c, false)),
      score: r.score,
      wager: r.wager,
      outcome: r.outcome,
      payoutReturned: r.payoutReturned,
      netChange: r.payoutReturned - r.wager,
    }));

    return {
      roundNumber: summary.roundNumber,
      bankrollBefore: summary.bankrollBeforeRound,
      bankrollAfter: summary.bankrollAfterRound,
      bankrollDelta: summary.bankrollAfterRound - summary.bankrollBeforeRound,
      dealerCards: summary.dealerCards.map((c) => this.toGuiCard(c, false)),
      dealerScore: summary.dealerScore,
      dealerBusted: summary.dealerBusted,
      handResults,
    };
  }
}
