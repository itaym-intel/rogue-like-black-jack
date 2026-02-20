/**
 * Item Reward System
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the shop with a wager-based item reward after every stage.
 * The rarity of the rewarded item is determined by the player's wager as a
 * percentage of their bankroll — higher risk yields better rewards.
 *
 * Rarity weights are linearly interpolated between anchor points:
 *
 *   Wager %  | Legendary | Rare  | Uncommon | Common
 *   ---------|-----------|-------|----------|-------
 *   20%      | 2.5       | 5     | 22.5     | 70
 *   40%      | 5         | 30    | 45       | 20
 *   60%      | 10        | 50    | 30       | 10
 *   80%      | 20        | 70    | 7.5      | 2.5
 *   100%     | 100       | 0     | 0        | 0
 *
 * Below 20%: clamp to the 20% weights.
 * At 100% (all-in): guaranteed legendary.
 */

import type { ItemRarity } from "./item.js";
import type { Item } from "./item.js";
import type { SeededRng } from "./rng.js";
import { ITEMS_BY_RARITY } from "./items/catalog.js";

// ─── Configurable constants ────────────────────────────────────────────────

/** Drop chance after each stage. Always 100%; kept as a knob for future use. */
export const DROP_CHANCE = 1.0;

// ─── Rarity weight anchors ────────────────────────────────────────────────

export interface RarityWeights {
  common: number;
  uncommon: number;
  rare: number;
  legendary: number;
}

interface RarityAnchor {
  wagerPercent: number;
  weights: RarityWeights;
}

export const RARITY_ANCHORS: RarityAnchor[] = [
  { wagerPercent: 20,  weights: { legendary: 2.5,  rare: 5,  uncommon: 22.5, common: 70   } },
  { wagerPercent: 40,  weights: { legendary: 5,    rare: 30, uncommon: 45,   common: 20   } },
  { wagerPercent: 60,  weights: { legendary: 10,   rare: 50, uncommon: 30,   common: 10   } },
  { wagerPercent: 80,  weights: { legendary: 20,   rare: 70, uncommon: 7.5,  common: 2.5  } },
  { wagerPercent: 100, weights: { legendary: 100,  rare: 0,  uncommon: 0,    common: 0    } },
];

// ─── Core functions ───────────────────────────────────────────────────────

/**
 * Linearly interpolate between the anchor points to compute rarity weights
 * for the given wager percentage (0–100).
 * Below 20%: clamps to the 20% weights.
 * Above 100%: clamps to the 100% weights.
 */
export function computeRarityWeights(wagerPercent: number): RarityWeights {
  // Clamp below 20%
  if (wagerPercent <= RARITY_ANCHORS[0].wagerPercent) {
    return { ...RARITY_ANCHORS[0].weights };
  }

  // Clamp above 100%
  const last = RARITY_ANCHORS[RARITY_ANCHORS.length - 1];
  if (wagerPercent >= last.wagerPercent) {
    return { ...last.weights };
  }

  // Find the two surrounding anchors and interpolate
  for (let i = 0; i < RARITY_ANCHORS.length - 1; i++) {
    const lo = RARITY_ANCHORS[i];
    const hi = RARITY_ANCHORS[i + 1];
    if (wagerPercent >= lo.wagerPercent && wagerPercent <= hi.wagerPercent) {
      const t = (wagerPercent - lo.wagerPercent) / (hi.wagerPercent - lo.wagerPercent);
      return {
        common:    lo.weights.common    + t * (hi.weights.common    - lo.weights.common),
        uncommon:  lo.weights.uncommon  + t * (hi.weights.uncommon  - lo.weights.uncommon),
        rare:      lo.weights.rare      + t * (hi.weights.rare      - lo.weights.rare),
        legendary: lo.weights.legendary + t * (hi.weights.legendary - lo.weights.legendary),
      };
    }
  }

  // Fallback (should never reach here)
  return { ...RARITY_ANCHORS[0].weights };
}

/**
 * Given rarity weights and a seeded RNG, roll a rarity tier.
 * Weights do NOT need to sum to exactly 100 — they are normalized internally.
 */
export function rollItemRarity(weights: RarityWeights, rng: SeededRng): ItemRarity {
  const total = weights.common + weights.uncommon + weights.rare + weights.legendary;
  const roll = rng.next() * total;

  let cumulative = 0;
  cumulative += weights.common;
  if (roll < cumulative) return "common";
  cumulative += weights.uncommon;
  if (roll < cumulative) return "uncommon";
  cumulative += weights.rare;
  if (roll < cumulative) return "rare";
  return "legendary";
}

/**
 * Pick a random item from the catalog matching the given rarity.
 * If no items exist for that rarity, falls through:
 *   legendary → rare → uncommon → common
 * Returns null only if the entire catalog is empty.
 */
export function pickRandomItem(rarity: ItemRarity, rng: SeededRng): Item | null {
  const fallbackOrder: ItemRarity[] = ["legendary", "rare", "uncommon", "common"];
  const startIndex = fallbackOrder.indexOf(rarity);

  for (let i = startIndex; i < fallbackOrder.length; i++) {
    const pool = ITEMS_BY_RARITY[fallbackOrder[i]];
    if (pool.length > 0) {
      const idx = Math.floor(rng.next() * pool.length);
      // Return a shallow copy so each reward is independent
      return { ...pool[idx] };
    }
  }

  return null;
}

// ─── Result type ──────────────────────────────────────────────────────────

export interface ItemRewardResult {
  item: Item;
  rarity: ItemRarity;
  wagerPercent: number;
}

/**
 * Orchestrates the full reward flow:
 *   compute weights → roll rarity → pick item → return result
 * Returns null if the catalog is empty.
 */
export function rollItemReward(wagerPercent: number, rng: SeededRng): ItemRewardResult | null {
  const weights = computeRarityWeights(wagerPercent);
  const rarity = rollItemRarity(weights, rng);
  const item = pickRandomItem(rarity, rng);

  if (!item) return null;

  return { item, rarity, wagerPercent };
}
