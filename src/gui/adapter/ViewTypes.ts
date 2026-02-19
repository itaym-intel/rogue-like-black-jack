/**
 * GUI-facing view model types.
 *
 * These types are the ONLY types the GUI layer (scenes, components) should
 * ever consume.  They are intentionally decoupled from src/engine/types.ts so
 * that engine refactors do not ripple into the GUI — only the GameAdapter
 * translation layer needs to be updated.
 */

// ─── Rogue-like: items ────────────────────────────────────────────────────────

export type GuiItemRarity = "common" | "uncommon" | "rare" | "legendary";

/**
 * When an item effect fires.
 * - passive         — always applied as a BlackjackModifier while held
 * - on_hand_start   — fires when a new hand is dealt
 * - on_hand_end     — fires after a hand is fully settled
 * - on_stage_end    — fires at each stage boundary (pass or fail)
 * - on_purchase     — fires once at the moment of acquisition
 */
export type GuiItemEffectTrigger =
  | "passive"
  | "on_hand_start"
  | "on_hand_end"
  | "on_stage_end"
  | "on_purchase";

export interface GuiItemEffect {
  trigger: GuiItemEffectTrigger;
  /** Human-readable description of what the effect does (shown in UI tooltips). */
  description: string;
}

export interface GuiItem {
  itemName: string;
  itemDescription: string;
  itemRarity: GuiItemRarity;
  effects: GuiItemEffect[];
}

// ─── Rogue-like: shop ─────────────────────────────────────────────────────────

export interface GuiShopOffering {
  /** Index used for purchaseShopItem(index). */
  index: number;
  item: GuiItem;
  price: number;
  /** Pre-computed: bankroll >= price. */
  canAfford: boolean;
}

// ─── Rogue-like: meta progression ────────────────────────────────────────────

/**
 * The meta-game phase — layered on top of the blackjack phase.
 * - playing   — normal game loop (betting / playing hands)
 * - shop      — between-stage shop (no blackjack rounds possible)
 * - game_over — run has ended (stage fail or bankroll depleted)
 */
export type GuiMetaPhase = "playing" | "shop" | "game_over";

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

  // ── Rogue-like meta ──────────────────────────────────────────────────────

  /** The meta-game phase — determines which UI layer is active. */
  metaPhase: GuiMetaPhase;
  /** Total hands fully resolved across the entire run. */
  handsPlayed: number;
  /** Current stage number (starts at 0; increments every handsPerStage hands). */
  stage: number;
  /** How many hands per stage cycle (defaults to 5). */
  handsPerStage: number;
  /** Remaining hands until the next stage check (0 means a check just fired). */
  handsUntilStageCheck: number;
  /** Bankroll the player must hold to survive the NEXT stage check. */
  stageMoneyThreshold: number;
  /** All items currently held in the player's inventory. */
  inventory: GuiItem[];
  /** Shop offerings — only meaningful when metaPhase === "shop". */
  shopOfferings: GuiShopOffering[];

  // ── In-hand item actions ─────────────────────────────────────────────────

  /**
   * True when the player holds VR Goggles, is in player_turn, and hasn't
   * used them yet this hand.  The VR Goggles button is shown only when this
   * is true.
   */
  vrGogglesAvailable: boolean;
  /**
   * Cards in the active player hand that can be targeted by VR Goggles.
   * Empty when vrGogglesAvailable is false.
   */
  vrGogglesTargets: GuiCard[];
}
