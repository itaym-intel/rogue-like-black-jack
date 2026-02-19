/**
 * GUI-facing view model types.
 *
 * These types are the ONLY types the GUI layer (scenes, components) should
 * ever consume.  They are intentionally decoupled from src/engine/types.ts so
 * that engine refactors do not ripple into the GUI — only the GameAdapter
 * translation layer needs to be updated.
 */

// ─── Card ────────────────────────────────────────────────────────────────────

export interface GuiCard {
  /** Rank string: "A" | "2"–"10" | "J" | "Q" | "K" */
  rank: string;
  /** Suit string: "H" | "D" | "C" | "S" */
  suit: string;
  /** Stable unique identifier (engine-assigned). */
  id: string;
  /**
   * Whether the card is rendered face-down.
   * The adapter sets this true for the dealer's hole card during player_turn.
   */
  faceDown: boolean;
}

// ─── Hand ─────────────────────────────────────────────────────────────────────

export interface GuiHand {
  /** Stable hand identifier across actions within a round. */
  id: number;
  cards: GuiCard[];
  /** Pre-computed score (ACE soft/hard logic already applied). */
  score: number;
  wager: number;
  isActive: boolean;
  isBusted: boolean;
  isStanding: boolean;
  isDoubled: boolean;
  /** True when this hand was created by a split action. */
  isFromSplit: boolean;
}

// ─── Round summary ────────────────────────────────────────────────────────────

export type GuiHandOutcome = "win" | "lose" | "push" | "blackjack";

export interface GuiHandResult {
  handId: number;
  cards: GuiCard[];
  score: number;
  wager: number;
  outcome: GuiHandOutcome;
  /** Total chips returned to bankroll (0 on loss). */
  payoutReturned: number;
  /** Net chip change: payoutReturned − wager.  Negative on loss. */
  netChange: number;
}

export interface GuiRoundSummary {
  roundNumber: number;
  bankrollBefore: number;
  bankrollAfter: number;
  /** Signed delta: positive = net win, negative = net loss. */
  bankrollDelta: number;
  dealerCards: GuiCard[];
  dealerScore: number;
  dealerBusted: boolean;
  handResults: GuiHandResult[];
}

// ─── Game state ───────────────────────────────────────────────────────────────

export type GuiGamePhase =
  | "awaiting_bet"
  | "player_turn"
  | "dealer_turn"
  | "round_settled"
  | "game_over";

export type GuiPlayerAction = "hit" | "stand" | "double" | "split";

export interface GuiGameState {
  phase: GuiGamePhase;
  roundNumber: number;
  bankroll: number;
  /** Current target score (normally 21; may be modified by rogue-like modifiers). */
  targetScore: number;
  /** Dealer's visible cards.  Hole card has faceDown=true during player_turn. */
  dealerCards: GuiCard[];
  /**
   * Dealer score.
   * During player_turn only the visible card's contribution is relevant to the
   * player; the full score becomes accurate once dealer_turn completes.
   */
  dealerScore: number;
  playerHands: GuiHand[];
  activeHandIndex: number | null;
  currentWager: number | null;
  deckRemaining: number;
  /** Actions currently legal for the active hand. Empty outside player_turn. */
  availableActions: GuiPlayerAction[];
  minimumBet: number;
  lastRoundSummary: GuiRoundSummary | null;
}
