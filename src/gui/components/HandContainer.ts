import Phaser from "phaser";
import { CardSprite } from "./CardSprite.js";
import { CARD_DISPLAY_WIDTH, CARD_DISPLAY_HEIGHT } from "../assets/cardAssets.js";
import type { GuiCard, GuiHand } from "../adapter/index.js";

/** Card overlap as a fraction of card width (0 = no overlap, 1 = fully stacked). */
const CARD_OVERLAP = 0.3;
const CARD_STEP = Math.round(CARD_DISPLAY_WIDTH * (1 - CARD_OVERLAP));

/**
 * HandContainer
 * ──────────────────────────────────────────────────────────────────────────────
 * A Phaser Container that owns a horizontal row of CardSprites.
 *
 * It reconciles its CardSprite children against a GuiHand or plain GuiCard[]
 * snapshot — adding, removing, or syncing cards as needed — so the scene can
 * simply call `syncHand(hand)` after every state change without managing
 * individual card sprites.
 *
 * Layout origin is the CENTER of the leftmost card, expanding rightward.
 * The container itself is positioned by the scene.
 *
 * Responsibilities:
 *  - Owning and recycling CardSprite instances
 *  - Laying out cards in a row with configurable overlap
 *  - Showing an active-hand highlight border
 *  - Displaying wager / score labels if requested
 *
 * NOT responsible for: game state, adapter interaction, scene transitions.
 */
export class HandContainer extends Phaser.GameObjects.Container {
  private readonly cardSprites: CardSprite[] = [];
  private readonly highlightRect: Phaser.GameObjects.Rectangle;
  private readonly scoreLabel: Phaser.GameObjects.Text;
  private readonly wagerLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Active-hand highlight
    this.highlightRect = scene.add.rectangle(0, 0, 10, 10, 0xffd700, 0)
      .setStrokeStyle(2, 0xffd700, 0)
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    // Score / wager labels below the hand
    this.scoreLabel = scene.add.text(0, CARD_DISPLAY_HEIGHT / 2 + 8, "", {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.wagerLabel = scene.add.text(0, CARD_DISPLAY_HEIGHT / 2 + 26, "", {
      fontSize: "12px",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.add([this.highlightRect, this.scoreLabel, this.wagerLabel]);
    scene.add.existing(this);
  }

  /**
   * Synchronise this container's sprites with a player GuiHand snapshot.
   * New cards are deal-animated in from off-screen; removed cards are
   * destroyed; existing cards are synced for face-up/down changes.
   */
  syncHand(hand: GuiHand, animate = true): void {
    this.syncCards(hand.cards, animate);

    // Score label
    const scoreText = hand.isBusted
      ? `BUST`
      : hand.isStanding
      ? `${hand.score} ✓`
      : `${hand.score}`;
    this.scoreLabel.setText(scoreText).setColor(hand.isBusted ? "#ff4444" : "#ffffff");

    // Wager label
    const doubledMark = hand.isDoubled ? " ×2" : "";
    this.wagerLabel.setText(`$${hand.wager.toFixed(2)}${doubledMark}`);

    // Active-hand highlight
    this.setActiveHighlight(hand.isActive && !hand.isBusted && !hand.isStanding);
  }

  /**
   * Synchronise with a plain card array (used for the dealer hand which has
   * no GuiHand wrapper).
   */
  syncCards(cards: GuiCard[], animate = true): void {
    // Add or sync existing sprites
    for (let index = 0; index < cards.length; index += 1) {
      if (index < this.cardSprites.length) {
        // Existing sprite — sync face/rank
        this.cardSprites[index].syncCard(cards[index], animate);
      } else {
        // New card — create and deal in
        this.addCard(cards[index], animate);
      }
    }

    // Remove trailing sprites if hand shrank (shouldn't happen in normal play)
    while (this.cardSprites.length > cards.length) {
      const sprite = this.cardSprites.pop();
      if (sprite) {
        this.remove(sprite, true);
      }
    }

    this.relayout();
    this.updateHighlightBounds();
  }

  /** Remove all card sprites and labels. */
  clearHand(): void {
    for (const sprite of this.cardSprites) {
      this.remove(sprite, true);
    }
    this.cardSprites.length = 0;
    this.scoreLabel.setText("");
    this.wagerLabel.setText("");
    this.highlightRect.setVisible(false);
  }

  /** Total pixel width of all displayed cards (accounting for overlap). */
  get totalWidth(): number {
    const n = this.cardSprites.length;
    if (n === 0) {
      return 0;
    }
    return CARD_STEP * (n - 1) + CARD_DISPLAY_WIDTH;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private addCard(card: GuiCard, animate: boolean): void {
    const startX = this.cardSprites.length * CARD_STEP;
    const sprite = new CardSprite(this.scene, startX, 0, card);

    if (animate) {
      // Deal-in: start above current position
      const finalY = 0;
      sprite.setY(finalY - 80).setAlpha(0);
      this.scene.tweens.add({
        targets: sprite,
        y: finalY,
        alpha: 1,
        duration: 200,
        ease: "Back.easeOut",
      });
    }

    this.add(sprite);
    this.cardSprites.push(sprite);
  }

  private relayout(): void {
    const n = this.cardSprites.length;
    const totalW = CARD_STEP * (n - 1) + CARD_DISPLAY_WIDTH;
    const startX = -totalW / 2 + CARD_DISPLAY_WIDTH / 2;

    for (let index = 0; index < n; index += 1) {
      const sprite = this.cardSprites[index];
      sprite.setX(startX + index * CARD_STEP);
    }

    // Re-center labels
    this.scoreLabel.setX(0);
    this.wagerLabel.setX(0);
  }

  private setActiveHighlight(active: boolean): void {
    this.highlightRect.setVisible(active);
  }

  private updateHighlightBounds(): void {
    const n = this.cardSprites.length;
    const w = CARD_STEP * (n - 1) + CARD_DISPLAY_WIDTH + 12;
    const h = CARD_DISPLAY_HEIGHT + 12;
    this.highlightRect.setSize(w, h);
  }
}
