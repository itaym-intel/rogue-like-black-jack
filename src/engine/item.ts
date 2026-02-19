import type { BlackjackModifier } from "./modifiers.js";
import type { RoundSummary } from "./types.js";
import type { SeededRng } from "./rng.js";

export type ItemRarity = "common" | "uncommon" | "rare" | "legendary";

/**
 * Defines when an item effect should trigger during gameplay.
 *  - "on_hand_start": fires when a new hand is dealt
 *  - "on_hand_end": fires after a hand is settled
 *  - "on_stage_end": fires at the end of a stage
 *  - "on_purchase": fires once when the item is purchased
 *  - "passive": always active while in inventory (applied as a modifier)
 */
export type ItemEffectTrigger =
  | "on_hand_start"
  | "on_hand_end"
  | "on_stage_end"
  | "on_purchase"
  | "passive";

export interface ItemEffect {
  trigger: ItemEffectTrigger;
  /** Optional blackjack modifier applied while the item is held (for "passive" trigger). */
  modifier?: BlackjackModifier;
  /** Callback executed when the effect triggers (non-passive). */
  apply?: (context: ItemEffectContext) => void;
}

/** Context passed to every triggered (non-passive) effect callback. */
export interface ItemEffectContext {
  bankroll: number;
  handsPlayed: number;
  stage: number;
  /** Seeded RNG — use this for any randomness to maintain determinism. */
  rng: SeededRng;
  /** Adjust the player's bankroll by the given signed amount. */
  adjustBankroll: (amount: number) => void;
  /** The settled round summary, populated on on_hand_end / on_stage_end. Null otherwise. */
  lastRoundSummary: RoundSummary | null;
  /** Dynamically add a BlackjackModifier (used by items that grant temporary rule changes). */
  addModifier: (m: BlackjackModifier) => void;
  /** Remove a previously added BlackjackModifier. */
  removeModifier: (m: BlackjackModifier) => void;
}

/**
 * Context passed to an item's executeAction callback when the player triggers
 * an on-demand item ability during their turn (e.g. VR Goggles).
 */
export interface OnDemandActionContext {
  /** The card.id the player chose to target. */
  targetCardId: string;
  /** true = the effect persists for the rest of the run; false = reverts after this hand. */
  permanent: boolean;
  /** Add a BlackjackModifier to the engine (for the duration the item manages). */
  addModifier: (m: BlackjackModifier) => void;
}

export interface Item {
  itemName: string;
  itemDescription: string;
  itemRarity: ItemRarity;
  effects: ItemEffect[];
  /**
   * Unique identifier for items that have a player-triggered action during
   * their turn (e.g. "vr_goggles_boost").  Omit for passive / trigger-only items.
   */
  onDemandActionId?: string;
  /** Returns true when the on-demand action is currently usable. */
  isActionAvailable?: () => boolean;
  /** Executes the on-demand action with the chosen target and duration. */
  executeAction?: (context: OnDemandActionContext) => void;
}

export { ITEM_CATALOG } from "./items/catalog.js";
