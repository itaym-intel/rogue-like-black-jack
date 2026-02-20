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
 */
export class HandContainer extends Phaser.GameObjects.Container {
  private readonly cardSprites: CardSprite[] = [];
  private readonly highlightGlow: Phaser.GameObjects.Graphics;
  private readonly scoreLabel: Phaser.GameObjects.Text;
  private readonly wagerLabel: Phaser.GameObjects.Text;
  /** Tracks the last-synced card data array so interactive mode can read card IDs. */
  private currentCards: GuiCard[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Active-hand glow highlight
    this.highlightGlow = scene.add.graphics();
    this.highlightGlow.setVisible(false);

    // Score label — pill-shaped badge
    this.scoreLabel = scene.add.text(0, CARD_DISPLAY_HEIGHT / 2 + 14, "", {
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.wagerLabel = scene.add.text(0, CARD_DISPLAY_HEIGHT / 2 + 34, "", {
      fontSize: "12px",
      color: "#c9a84c",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0);

    this.add([this.highlightGlow, this.scoreLabel, this.wagerLabel]);
    scene.add.existing(this);
  }

  /**
   * Synchronise this container's sprites with a player GuiHand snapshot.
   */
  syncHand(hand: GuiHand, animate = true): void {
    this.syncCards(hand.cards, animate);

    // Score label
    const scoreText = hand.isBusted
      ? `BUST`
      : hand.isStanding
      ? `${hand.score}`
      : `${hand.score}`;
    this.scoreLabel.setText(scoreText);

    if (hand.isBusted) {
      this.scoreLabel.setColor("#ff4444");
    } else if (hand.isStanding) {
      this.scoreLabel.setColor("#aaaaaa");
    } else {
      this.scoreLabel.setColor("#ffffff");
    }

    // Wager label
    const doubledMark = hand.isDoubled ? " x2" : "";
    this.wagerLabel.setText(`$${hand.wager.toFixed(2)}${doubledMark}`);

    // Active-hand highlight
    this.setActiveHighlight(hand.isActive && !hand.isBusted && !hand.isStanding);
  }

  /**
   * Synchronise with a plain card array (used for the dealer hand which has
   * no GuiHand wrapper).
   */
  syncCards(cards: GuiCard[], animate = true): void {
    this.currentCards = [...cards];
    // Add or sync existing sprites
    for (let index = 0; index < cards.length; index += 1) {
      if (index < this.cardSprites.length) {
        this.cardSprites[index].syncCard(cards[index], animate);
      } else {
        this.addCard(cards[index], animate);
      }
    }

    // Remove trailing sprites if hand shrank
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
    this.setCardsInteractive(false);
    this.currentCards = [];
    for (const sprite of this.cardSprites) {
      this.remove(sprite, true);
    }
    this.cardSprites.length = 0;
    this.scoreLabel.setText("");
    this.wagerLabel.setText("");
    this.highlightGlow.setVisible(false);
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

  /**
   * Enable or disable click interaction on each card sprite.
   */
  setCardsInteractive(
    enabled: boolean,
    onCardClicked?: (cardId: string) => void,
  ): void {
    for (let i = 0; i < this.cardSprites.length; i += 1) {
      const sprite = this.cardSprites[i];
      sprite.removeAllListeners();
      sprite.setAlpha(1);

      if (enabled && onCardClicked) {
        sprite.setInteractive(
          new Phaser.Geom.Rectangle(
            -CARD_DISPLAY_WIDTH / 2,
            -CARD_DISPLAY_HEIGHT / 2,
            CARD_DISPLAY_WIDTH,
            CARD_DISPLAY_HEIGHT,
          ),
          Phaser.Geom.Rectangle.Contains,
        );
        const cardId = this.currentCards[i]?.id;
        if (!cardId) continue;
        sprite.on(Phaser.Input.Events.POINTER_OVER, () => {
          sprite.setAlpha(0.7);
          sprite.setY(-6);
        });
        sprite.on(Phaser.Input.Events.POINTER_OUT, () => {
          sprite.setAlpha(1);
          sprite.setY(0);
        });
        sprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
          onCardClicked(cardId);
        });
      } else {
        sprite.disableInteractive();
      }
    }
  }

  private addCard(card: GuiCard, animate: boolean): void {
    const startX = this.cardSprites.length * CARD_STEP;
    const sprite = new CardSprite(this.scene, startX, 0, card);

    if (animate) {
      const finalY = 0;
      sprite.setY(finalY - 60).setAlpha(0).setScale(0.8);
      this.scene.tweens.add({
        targets: sprite,
        y: finalY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 250,
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

    this.scoreLabel.setX(0);
    this.wagerLabel.setX(0);
  }

  private setActiveHighlight(active: boolean): void {
    this.highlightGlow.setVisible(active);
    if (active) {
      this.updateHighlightBounds();
    }
  }

  private updateHighlightBounds(): void {
    const n = this.cardSprites.length;
    const w = CARD_STEP * (n - 1) + CARD_DISPLAY_WIDTH + 16;
    const h = CARD_DISPLAY_HEIGHT + 16;

    this.highlightGlow.clear();

    // Soft glow effect — multiple expanding, fading rectangles
    this.highlightGlow.lineStyle(2, 0xffd700, 0.5);
    this.highlightGlow.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);

    this.highlightGlow.lineStyle(4, 0xffd700, 0.15);
    this.highlightGlow.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 8);

    this.highlightGlow.lineStyle(6, 0xffd700, 0.06);
    this.highlightGlow.strokeRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 10);
  }
}
