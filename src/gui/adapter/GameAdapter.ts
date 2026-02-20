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

import { GameManager } from "../../engine/game-manager.js";
import type { EngineOptions } from "../../engine/engine.js";
import type { Card, GameState, HandState, RoundSummary } from "../../engine/types.js";
import type { PlayerAction } from "../../engine/types.js";
import type { Item } from "../../engine/item.js";

import { TypedEmitter } from "./TypedEmitter.js";
import type { GameEventMap } from "./GameEvents.js";
import type {
  GuiCard,
  GuiGamePhase,
  GuiGameState,
  GuiHand,
  GuiHandResult,
  GuiItem,
  GuiItemEffect,
  GuiItemReward,
  GuiMetaPhase,
  GuiPlayerAction,
  GuiRoundSummary,
} from "./ViewTypes.js";

export type {
  GuiCard,
  GuiGamePhase,
  GuiGameState,
  GuiHand,
  GuiHandResult,
  GuiItem,
  GuiItemEffect,
  GuiItemReward,
  GuiMetaPhase,
  GuiPlayerAction,
  GuiRoundSummary,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AdapterOptions extends EngineOptions {}

export class GameAdapter extends TypedEmitter<GameEventMap> {
  private readonly manager: GameManager;

  constructor(options: AdapterOptions = {}) {
    super();
    this.manager = new GameManager(options);
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  /** Returns a complete GUI-facing snapshot. Safe to call at any time. */
  getState(): GuiGameState {
    return this.buildGuiState();
  }

  // ── Blackjack commands ────────────────────────────────────────────────────

  /**
   * Place a wager and start a new round.
   * Emits: roundStarted, then conditionally itemRewarded/gameOver, then stateChanged.
   * Throws on invalid wager or wrong phase.
   */
  startRound(wager: number): void {
    this.manager.startRound(wager);

    // Edge case: natural blackjack — engine settles the round immediately inside
    // startRound() without any player action. The GameManager only increments
    // handsPlayed in performAction/acknowledgeRoundSettled, so we must call
    // acknowledgeRoundSettled here if the round already settled.
    const enginePhaseAfterDeal = this.manager.getGameState().phase;
    const isImmediateSettle =
      enginePhaseAfterDeal === "round_settled" || enginePhaseAfterDeal === "game_over";
    if (isImmediateSettle) {
      this.manager.acknowledgeRoundSettled();
    }

    const state = this.getState();
    this.emit("roundStarted", { wager, state });

    // If the round settled immediately (natural blackjack), emit roundSettled so
    // SummaryOverlayScene opens and the player sees the outcome before any
    // meta-transition (shop / game-over) takes effect.  Without this the shop
    // phase can be entered silently, making every subsequent startRound throw.
    if (isImmediateSettle && state.lastRoundSummary) {
      this.emit("roundSettled", { summary: state.lastRoundSummary, state });
    }

    this.emitMetaTransitions(state);
    this.emit("stateChanged", { state });
  }

  /**
   * Execute a player action (hit / stand / double / split).
   * Emits: actionApplied, then conditionally roundSettled/itemRewarded/gameOver,
   * then stateChanged.
   * Throws if the action is unavailable.
   */
  performAction(action: GuiPlayerAction): void {
    this.manager.performAction(action as PlayerAction);
    const state = this.getState();

    this.emit("actionApplied", { action, state });

    if (
      state.phase === "round_settled" ||
      state.phase === "game_over"
    ) {
      if (state.lastRoundSummary) {
        this.emit("roundSettled", { summary: state.lastRoundSummary, state });
      }
    }

    this.emitMetaTransitions(state);
    this.emit("stateChanged", { state });
  }

  /**
   * Activate VR Goggles: boost the value of the chosen card by 1.
   * Pass permanent=false to have the boost automatically revert after this hand.
   * Emits: stateChanged.
   * Throws if VR Goggles are unavailable.
   */
  useVrGoggles(cardId: string, permanent: boolean): void {
    this.manager.useVrGoggles(cardId, permanent);
    const state = this.getState();
    this.emit("stateChanged", { state });
  }

  // ── Private: meta-event fan-out ───────────────────────────────────────────

  /**
   * Emit shop/stage/game-over events based on the current meta-phase.
   * Called after every state-mutating command.
   */
  private emitMetaTransitions(state: GuiGameState): void {
    const meta = this.manager.getMetaState();

    // Emit itemRewarded if a stage was just cleared and an item was dropped.
    if (state.lastRewardedItem) {
      this.emit("itemRewarded", {
        item: state.lastRewardedItem.item,
        state,
      });
    }

    if (meta.metaPhase === "game_over") {
      const enginePhase = this.manager.getGameState().phase;
      // Distinguish: was it the engine running out of bankroll, or a stage fail?
      if (enginePhase === "game_over") {
        // Engine itself ended: bankroll too low
        this.emit("gameOver", { finalBankroll: state.bankroll, reason: "bankroll" });
      } else {
        // Engine phase is still round_settled but meta says game_over → stage fail
        const threshold = meta.stageMoneyThreshold;
        this.emit("stageFailed", {
          stage: meta.stage,
          threshold,
          bankroll: state.bankroll,
        });
        this.emit("gameOver", { finalBankroll: state.bankroll, reason: "stage_fail" });
      }
    }
  }

  // ── Private: state translation ────────────────────────────────────────────

  private buildGuiState(): GuiGameState {
    const raw: GameState = this.manager.getGameState();
    const meta = this.manager.getMetaState();
    const engine = this.manager.getEngine();

    const isPlayerTurn = raw.phase === "player_turn";
    const availableActions = engine.getAvailableActions() as GuiPlayerAction[];

    const dealerCards = raw.dealerHand.map((card, index) =>
      this.toGuiCard(card, isPlayerTurn && index === 1),
    );

    const playerHands: GuiHand[] = raw.playerHands.map((hand, index) =>
      this.toGuiHand(hand, index, raw.activeHandIndex),
    );

    // Item reward from most recent stage clear
    const rewardResult = this.manager.getLastRewardedItem();
    const lastRewardedItem: GuiItemReward | null = rewardResult
      ? {
          item: this.toGuiItem(rewardResult.item),
          rarity: rewardResult.rarity,
          wagerPercent: rewardResult.wagerPercent,
        }
      : null;

    // Inventory
    const inventory: import("./ViewTypes.js").GuiItem[] = this.manager
      .getInventory()
      .getItems()
      .map((item) => this.toGuiItem(item));

    // Hands until next stage check
    const handsUntilStageCheck =
      meta.handsPerStage - (meta.handsPlayed % meta.handsPerStage);

    // VR Goggles availability
    const vrGogglesActions = this.manager.getAvailableItemActions();
    const vrGogglesAvailable = vrGogglesActions.some(
      (a) => a.actionId === "vr_goggles_boost",
    );
    const vrGogglesTargets: GuiCard[] = vrGogglesAvailable
      ? this.manager.getVrGogglesTargets().map((c) => this.toGuiCard(c, false))
      : [];

    return {
      phase: raw.phase as GuiGamePhase,
      roundNumber: raw.roundNumber,
      bankroll: raw.bankroll,
      targetScore: raw.targetScore,
      dealerCards,
      dealerScore: engine.getDealerScore(),
      playerHands,
      activeHandIndex: raw.activeHandIndex,
      currentWager: raw.currentWager,
      deckRemaining: raw.deckRemaining,
      availableActions,
      minimumBet: engine.getMinimumBet(),
      lastRoundSummary: raw.lastRoundSummary
        ? this.toGuiRoundSummary(raw.lastRoundSummary)
        : null,
      // Meta
      metaPhase: meta.metaPhase as GuiMetaPhase,
      handsPlayed: meta.handsPlayed,
      stage: meta.stage,
      handsPerStage: meta.handsPerStage,
      handsUntilStageCheck,
      stageMoneyThreshold: meta.stageMoneyThreshold,
      inventory,
      lastRewardedItem,
      vrGogglesAvailable,
      vrGogglesTargets,
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
    const score = this.manager.getEngine().getPlayerHandScore(index);
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

  private toGuiItem(item: Item): GuiItem {
    const effects: GuiItemEffect[] = item.effects.map((e) => ({
      trigger: e.trigger,
      description: this.effectDescription(e.trigger, e.modifier),
    }));
    return {
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      itemRarity: item.itemRarity,
      effects,
    };
  }

  /**
   * Generates a human-readable effect description.
   * When items gain real effects, their apply/modifier implementations can
   * expose a `description` field; until then this provides clear placeholders.
   */
  private effectDescription(
    trigger: string,
    modifier: unknown,
  ): string {
    const triggerLabel: Record<string, string> = {
      passive: "Always active",
      on_hand_start: "At the start of each hand",
      on_hand_end: "At the end of each hand",
      on_stage_end: "At the end of each stage",
      on_purchase: "On purchase",
    };
    const base = triggerLabel[trigger] ?? trigger;
    return modifier ? `${base} — modifies game rules` : `${base} — (effect pending)`;
  }
}
