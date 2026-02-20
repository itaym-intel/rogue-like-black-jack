import type { GuiCard, GuiGameState, GuiItem, GuiItemReward, GuiPlayerAction, GuiRoundSummary } from "./ViewTypes.ts";

/**
 * All events the GameAdapter can emit.
 * Scenes subscribe to these rather than polling the adapter constantly.
 */
export interface GameEventMap {
  /**
   * Fired after any state change (covers all cases below as well).
   * Use this as a coarse "re-render everything" hook.
   */
  stateChanged: { state: GuiGameState };

  /**
   * Fired after startRound() succeeds and the initial cards have been dealt.
   * The state snapshot already reflects the full starting hand.
   */
  roundStarted: { wager: number; state: GuiGameState };

  /**
   * Fired after performAction() succeeds.
   * The state snapshot reflects the result of the action.
   */
  actionApplied: { action: GuiPlayerAction; state: GuiGameState };

  /**
   * Fired after the round is fully settled (outcome determined).
   * summary is guaranteed non-null.
   */
  roundSettled: { summary: GuiRoundSummary; state: GuiGameState };

  /**
   * Fired when a stage is cleared and an item is rewarded to the player.
   */
  itemRewarded: { item: GuiItem; state: GuiGameState };

  /**
   * Fired when the run ends because the player failed a stage bankroll check.
   * Distinct from gameOver-by-bankroll-depletion so the UI can show the
   * specific failure reason.
   */
  stageFailed: { stage: number; threshold: number; bankroll: number };

  /**
   * Fired when the bankroll drops too low to place the minimum bet, OR when
   * a stage check fails.  Always fired on any game-ending condition.
   */
  gameOver: { finalBankroll: number; reason: "bankroll" | "stage_fail" };

  /**
   * Fired when VR Goggles are ready for the player to pick a target card.
   * The scene should enter card-selection mode and show the targets list.
   */
  vrGogglesReady: { targets: GuiCard[]; state: GuiGameState };
}
