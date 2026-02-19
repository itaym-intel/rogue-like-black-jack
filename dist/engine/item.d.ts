import type { BlackjackModifier } from "./modifiers.js";
export type ItemRarity = "common" | "uncommon" | "rare" | "legendary";
/**
 * Defines when an item effect should trigger during gameplay.
 *  - "on_hand_start": fires when a new hand is dealt
 *  - "on_hand_end": fires after a hand is settled
 *  - "on_stage_end": fires at the end of a stage
 *  - "on_purchase": fires once when the item is purchased
 *  - "passive": always active while in inventory (applied as a modifier)
 */
export type ItemEffectTrigger = "on_hand_start" | "on_hand_end" | "on_stage_end" | "on_purchase" | "passive";
export interface ItemEffect {
    trigger: ItemEffectTrigger;
    /** Optional blackjack modifier applied while the item is held (for "passive" trigger). */
    modifier?: BlackjackModifier;
    /** Callback executed when the effect triggers (non-passive). */
    apply?: (context: ItemEffectContext) => void;
}
export interface ItemEffectContext {
    bankroll: number;
    handsPlayed: number;
    stage: number;
}
export interface Item {
    itemName: string;
    itemDescription: string;
    itemRarity: ItemRarity;
    effects: ItemEffect[];
}
export declare const ITEM_CATALOG: Item[];
