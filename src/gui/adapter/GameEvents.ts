import type { GuiGameState, GuiPlayerAction, GuiRoundSummary } from "./ViewTypes.ts";

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
   * Fired when the bankroll drops too low to continue.
   */
  gameOver: { finalBankroll: number };
}
