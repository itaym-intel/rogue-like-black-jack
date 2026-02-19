/**
 * Card Asset Registry
 * ──────────────────────────────────────────────────────────────────────────────
 * Maps rank/suit pairs to Phaser texture keys and remote image URLs.
 *
 * Image source: Deck of Cards API (deckofcardsapi.com) — free, no key required.
 * URL format: https://deckofcardsapi.com/static/img/{RANK_CODE}{SUIT}.png
 *
 * Rank codes used by the API:
 *   A, 2, 3, 4, 5, 6, 7, 8, 9, 0 (for 10), J, Q, K
 *
 * To swap to a different card image provider in the future, only this file
 * and the `getCardUrl` helper need to change — no Phaser scenes are affected.
 */

const CARD_IMAGE_BASE = "https://deckofcardsapi.com/static/img";
const CARD_BACK_URL = `${CARD_IMAGE_BASE}/back.png`;
export const CARD_BACK_KEY = "card_back";

/** Texture key prefix used in Phaser's texture cache. */
const CARD_KEY_PREFIX = "card_";

// ─── Rank / suit codec ────────────────────────────────────────────────────────

/**
 * Converts an engine rank string to the API's rank code.
 * Engine uses "10"; the API uses "0".
 */
function rankToApiCode(rank: string): string {
  return rank === "10" ? "0" : rank;
}

/**
 * Returns the stable Phaser texture key for a given card.
 * e.g.  rank="A" suit="H" → "card_AH"
 *       rank="10" suit="S" → "card_0S"
 */
export function getCardKey(rank: string, suit: string): string {
  return `${CARD_KEY_PREFIX}${rankToApiCode(rank)}${suit}`;
}

/**
 * Returns the remote image URL for a given card.
 */
export function getCardUrl(rank: string, suit: string): string {
  return `${CARD_IMAGE_BASE}/${rankToApiCode(rank)}${suit}.png`;
}

// ─── Full asset list for preloading ──────────────────────────────────────────

const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
] as const;

const SUITS = ["H", "D", "C", "S"] as const;

export interface CardAssetEntry {
  key: string;
  url: string;
}

/** Complete list of all 52 card assets plus the card back. */
export const ALL_CARD_ASSETS: ReadonlyArray<CardAssetEntry> = [
  // Back is first so BootScene can always fall back to it quickly
  { key: CARD_BACK_KEY, url: CARD_BACK_URL },
  ...RANKS.flatMap((rank) =>
    SUITS.map((suit) => ({
      key: getCardKey(rank, suit),
      url: getCardUrl(rank, suit),
    })),
  ),
];

/**
 * Convenience: dimensions of the card images served by the API.
 * Used to set consistent base sizes in components.
 * The API serves 222×323 PNG images; scale is applied at render time.
 */
export const CARD_NATURAL_WIDTH = 222;
export const CARD_NATURAL_HEIGHT = 323;

/** Display scale applied to card images in the main game scene. */
export const CARD_DISPLAY_SCALE = 0.32;

export const CARD_DISPLAY_WIDTH = Math.round(CARD_NATURAL_WIDTH * CARD_DISPLAY_SCALE);
export const CARD_DISPLAY_HEIGHT = Math.round(CARD_NATURAL_HEIGHT * CARD_DISPLAY_SCALE);
