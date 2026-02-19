/**
 * Item Catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * All items available in the game are defined here.
 *
 * Sections (add new items to the appropriate section):
 *   1. Common
 *   2. Uncommon
 *   3. Rare
 *   4. Legendary
 *
 * Each entry is a fully self-contained Item object (or factory function for
 * stateful items). Effects are declared inline so that a developer can read
 * the full behaviour of an item in one place.
 *
 * Export: ITEM_CATALOG — the single source of truth consumed by the Shop.
 *
 * NOTE: Stateful items (e.g. VR Goggles) are created via factory functions so
 * that each catalog entry gets its own independent closure state.  The catalog
 * array is rebuilt once at module load time; each shop offering is a fresh
 * spread copy of the item object, which preserves the function references
 * (isActionAvailable / executeAction) pointing at the original closure.
 */

import type { BlackjackModifier } from "../modifiers.js";
import type { Item } from "../item.js";

// ─── 1. Common ────────────────────────────────────────────────────────────────

/**
 * Tin Coin
 * Increases all payouts by 10% (win and blackjack).
 * Passive modifier — always active once held.
 */
const tinCoin: Item = {
  itemName: "Tin Coin",
  itemDescription: "Worn but lucky. All earnings increased by 10%.",
  itemRarity: "common",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyWinPayoutMultiplier: (base) => base * 1.1,
        modifyBlackjackPayoutMultiplier: (base) => base * 1.1,
      },
    },
  ],
};

/**
 * Lucky Charm
 * At the end of each winning round, 5% chance to double the net profit.
 * Uses the seeded RNG so the outcome is fully deterministic.
 */
const luckyCharm: Item = {
  itemName: "Lucky Charm",
  itemDescription:
    "A touch of fortune. 5% chance to double your earnings at the end of each winning round.",
  itemRarity: "common",
  effects: [
    {
      trigger: "on_hand_end",
      apply: (ctx) => {
        if (!ctx.lastRoundSummary) return;
        const profit =
          ctx.lastRoundSummary.bankrollAfterRound -
          ctx.lastRoundSummary.bankrollBeforeRound;
        if (profit > 0 && ctx.rng.next() < 0.05) {
          ctx.adjustBankroll(profit);
        }
      },
    },
  ],
};

/**
 * Coal Ring
 * Each diamond (♦) in your winning hand increases the payout multiplier by 10%.
 * Passive modifier — applies to both standard wins and blackjacks.
 */
const coalRing: Item = {
  itemName: "Coal Ring",
  itemDescription:
    "Cut from raw coal. Each ♦ diamond in your winning hand increases payout by 10%.",
  itemRarity: "common",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyWinPayoutMultiplier: (base, ctx) => {
          const diamonds = ctx.hand.cards.filter((c) => c.suit === "D").length;
          return base + diamonds * 0.1;
        },
        modifyBlackjackPayoutMultiplier: (base, ctx) => {
          const diamonds = ctx.hand.cards.filter((c) => c.suit === "D").length;
          return base + diamonds * 0.1;
        },
      } satisfies BlackjackModifier,
    },
  ],
};

/**
 * VR Goggles (factory)
 * Once per hand, the player can increase the value of one card in their hand
 * by 1. The player chooses whether the boost is permanent or reverts after
 * the current hand.
 *
 * Implemented as a factory so each shop instance has its own closure state
 * (`usedThisHand`, `pendingRemovals`).
 */
function createVrGoggles(): Item {
  let usedThisHand = false;
  const pendingRemovals: BlackjackModifier[] = [];

  return {
    itemName: "VR Goggles",
    itemDescription:
      "High-tech eyewear. Once per hand, increase the value of one of your cards by 1. " +
      "Choose whether the boost lasts permanently or only for this hand.",
    itemRarity: "common",
    effects: [
      {
        // Reset the "used this hand" flag at the start of every new hand.
        trigger: "on_hand_start",
        apply: () => {
          usedThisHand = false;
        },
      },
      {
        // Remove any temporary modifier at the end of the hand.
        trigger: "on_hand_end",
        apply: (ctx) => {
          for (const mod of pendingRemovals) {
            ctx.removeModifier(mod);
          }
          pendingRemovals.length = 0;
        },
      },
    ],
    onDemandActionId: "vr_goggles_boost",
    isActionAvailable: () => !usedThisHand,
    executeAction: (ctx) => {
      if (usedThisHand) return;
      usedThisHand = true;

      const modifier: BlackjackModifier = {
        modifyCardValue: (base, context) => {
          if (context.owner === "player" && context.card.id === ctx.targetCardId) {
            return base + 1;
          }
          return base;
        },
      };

      ctx.addModifier(modifier);
      if (!ctx.permanent) {
        pendingRemovals.push(modifier);
      }
    },
  };
}

// ─── 2. Uncommon ─────────────────────────────────────────────────────────────

const UNCOMMON_ITEMS: Item[] = [
  // TODO: add uncommon items
];

// ─── 3. Rare ─────────────────────────────────────────────────────────────────

const RARE_ITEMS: Item[] = [
  // TODO: add rare items
];

// ─── 4. Legendary ────────────────────────────────────────────────────────────

const LEGENDARY_ITEMS: Item[] = [
  // TODO: add legendary items
];

// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_CATALOG: Item[] = [
  // Common
  tinCoin,
  luckyCharm,
  coalRing,
  createVrGoggles(), // stateful — factory call gives each instance its own closure
  // Uncommon
  ...UNCOMMON_ITEMS,
  // Rare
  ...RARE_ITEMS,
  // Legendary
  ...LEGENDARY_ITEMS,
];
