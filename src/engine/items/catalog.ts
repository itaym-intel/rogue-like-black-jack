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

import { baseCardValue } from "../deck.js";
import type { BlackjackModifier } from "../modifiers.js";
import type { Item, ItemRarity } from "../item.js";

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

/**
 * Aorta (factory)
 * If the card that would have busted you is a ♥ heart, its value is nullified
 * and you may continue drawing. Triggers once per hand.
 *
 * Uses modifyHandScore to detect the bust-causing heart card on the first
 * evaluation, then modifyCardValue zeroes it out on all subsequent evaluations.
 */
function createAorta(): Item {
  let nullifiedCardId: string | null = null;

  return {
    itemName: "Aorta",
    itemDescription:
      "Beating strong. If the card that would have busted you is a ♥ heart, you may draw a new card.",
    itemRarity: "uncommon",
    effects: [
      {
        trigger: "on_hand_start",
        apply: () => {
          nullifiedCardId = null;
        },
      },
      {
        trigger: "passive",
        modifier: {
          modifyCardValue: (base, ctx) => {
            if (ctx.owner === "player" && ctx.card.id === nullifiedCardId) {
              return 0;
            }
            return base;
          },
          modifyHandScore: (score, ctx) => {
            if (ctx.owner !== "player") return score;
            if (nullifiedCardId !== null) return score;
            if (score <= ctx.targetScore) return score;

            const lastCard = ctx.hand[ctx.hand.length - 1];
            if (!lastCard || lastCard.suit !== "H") return score;

            nullifiedCardId = lastCard.id;
            const contribution =
              lastCard.rank === "A" ? 1 : baseCardValue(lastCard.rank);
            return score - contribution;
          },
        } satisfies BlackjackModifier,
      },
    ],
  };
}

/**
 * Loamy Soil
 * Each ♠ spade card with rank under 5 (2, 3, 4) in a winning hand increases
 * payout earnings by 100%. Stacks per qualifying card.
 */
const loamySoil: Item = {
  itemName: "Loamy Soil",
  itemDescription:
    "Rich and dark. ♠ Spades under 5 in your hand provide 100% increased wager earnings.",
  itemRarity: "uncommon",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyWinPayoutMultiplier: (base, ctx) => {
          const count = ctx.hand.cards.filter(
            (c) =>
              c.suit === "S" &&
              (c.rank === "2" || c.rank === "3" || c.rank === "4"),
          ).length;
          return base + count;
        },
        modifyBlackjackPayoutMultiplier: (base, ctx) => {
          const count = ctx.hand.cards.filter(
            (c) =>
              c.suit === "S" &&
              (c.rank === "2" || c.rank === "3" || c.rank === "4"),
          ).length;
          return base + count;
        },
      } satisfies BlackjackModifier,
    },
  ],
};

// ─── 3. Rare ─────────────────────────────────────────────────────────────────

/**
 * Four Leaf Clover
 * The dealer's hand score is capped at one below the target score, preventing
 * the dealer from ever reaching 21 (or whatever the current target is).
 */
const fourLeafClover: Item = {
  itemName: "Four Leaf Clover",
  itemDescription:
    "Impossibly lucky. The dealer cannot get 21.",
  itemRarity: "rare",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyHandScore: (score, ctx) => {
          if (ctx.owner === "dealer" && score >= ctx.targetScore) {
            return ctx.targetScore - 1;
          }
          return score;
        },
      } satisfies BlackjackModifier,
    },
  ],
};

// ─── 4. Legendary ────────────────────────────────────────────────────────────

/**
 * Double Standards
 * Face cards (J, Q, K) behave like soft values — they count as 10 by default
 * but can be reduced to 1 (subtract 9) to avoid busting, mirroring how Aces
 * flex between 11 and 1. Applies to both player and dealer hands.
 */
const doubleStandards: Item = {
  itemName: "Double Standards",
  itemDescription:
    "Rules are flexible. All face cards are worth 1 or 10.",
  itemRarity: "legendary",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyHandScore: (score, ctx) => {
          const faceCards = ctx.hand.filter(
            (c) => c.rank === "J" || c.rank === "Q" || c.rank === "K",
          );
          let adjusted = score;
          let remaining = faceCards.length;
          while (adjusted > ctx.targetScore && remaining > 0) {
            adjusted -= 9;
            remaining -= 1;
          }
          return adjusted;
        },
      } satisfies BlackjackModifier,
    },
  ],
};

/**
 * Tank
 * When the player busts, the last card drawn contributes only 50% of its
 * face value. This can prevent or soften a bust.
 */
const tank: Item = {
  itemName: "Tank",
  itemDescription:
    "Built to endure. If you bust, the last card is worth 50% of its value.",
  itemRarity: "legendary",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyHandScore: (score, ctx) => {
          if (ctx.owner !== "player" || score <= ctx.targetScore) return score;
          const lastCard = ctx.hand[ctx.hand.length - 1];
          if (!lastCard) return score;
          const effectiveValue =
            lastCard.rank === "A" ? 1 : baseCardValue(lastCard.rank);
          return score - Math.floor(effectiveValue / 2);
        },
      } satisfies BlackjackModifier,
    },
  ],
};

/**
 * Overkill
 * If the player busts with a hand value above 25, the round counts as a push
 * (wager is refunded) instead of a loss. Implemented as an on_hand_end effect
 * that retroactively refunds the wager.
 */
const overkill: Item = {
  itemName: "Overkill",
  itemDescription:
    "Go big or go home. Hand value over 25 counts as a push.",
  itemRarity: "legendary",
  effects: [
    {
      trigger: "on_hand_end",
      apply: (ctx) => {
        if (!ctx.lastRoundSummary) return;
        for (const result of ctx.lastRoundSummary.handResults) {
          if (result.outcome === "lose" && result.score > 25) {
            ctx.adjustBankroll(result.wager);
          }
        }
      },
    },
  ],
};

/**
 * Sleight of Hand (factory)
 * Once per hand, the player may discard one card from their hand, setting its
 * value to 0. Uses the same on-demand action pattern as VR Goggles — the
 * player selects a target card during their turn.
 */
function createSleightOfHand(): Item {
  let usedThisHand = false;
  const pendingRemovals: BlackjackModifier[] = [];

  return {
    itemName: "Sleight of Hand",
    itemDescription:
      "Now you see it… Once per hand, you may discard a card.",
    itemRarity: "legendary",
    effects: [
      {
        trigger: "on_hand_start",
        apply: () => {
          usedThisHand = false;
        },
      },
      {
        trigger: "on_hand_end",
        apply: (ctx) => {
          for (const mod of pendingRemovals) {
            ctx.removeModifier(mod);
          }
          pendingRemovals.length = 0;
        },
      },
    ],
    onDemandActionId: "sleight_of_hand_discard",
    isActionAvailable: () => !usedThisHand,
    executeAction: (ctx) => {
      if (usedThisHand) return;
      usedThisHand = true;

      const modifier: BlackjackModifier = {
        modifyCardValue: (base, context) => {
          if (context.owner === "player" && context.card.id === ctx.targetCardId) {
            return 0;
          }
          return base;
        },
      };

      ctx.addModifier(modifier);
      pendingRemovals.push(modifier);
    },
  };
}

/**
 * Gold Coin
 * Doubles all payout multipliers, effectively doubling all earnings.
 */
const goldCoin: Item = {
  itemName: "Gold Coin",
  itemDescription:
    "Pure and gleaming. All earnings are increased by 100%.",
  itemRarity: "legendary",
  effects: [
    {
      trigger: "passive",
      modifier: {
        modifyWinPayoutMultiplier: (base) => base * 2,
        modifyBlackjackPayoutMultiplier: (base) => base * 2,
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

const COMMON_ITEMS: Item[] = [
  tinCoin,
  luckyCharm,
  coalRing,
  createVrGoggles(), // stateful — factory call gives each instance its own closure
];

const UNCOMMON_ITEMS: Item[] = [
  createAorta(), // stateful — factory call gives each instance its own closure
  loamySoil,
];

const RARE_ITEMS: Item[] = [
  fourLeafClover,
];

const LEGENDARY_ITEMS: Item[] = [
  doubleStandards,
  tank,
  overkill,
  createSleightOfHand(), // stateful — factory call gives each instance its own closure
  goldCoin,
];

export const ITEM_CATALOG: Item[] = [
  // Common
  ...COMMON_ITEMS,
  // Uncommon
  ...UNCOMMON_ITEMS,
  // Rare
  ...RARE_ITEMS,
  // Legendary
  ...LEGENDARY_ITEMS,
];

/** Items grouped by rarity — used by the item-reward system to pick drops. */
export const ITEMS_BY_RARITY: Record<ItemRarity, Item[]> = {
  common: COMMON_ITEMS,
  uncommon: UNCOMMON_ITEMS,
  rare: RARE_ITEMS,
  legendary: LEGENDARY_ITEMS,
};
