import Phaser from "phaser";
import {
  CARD_BACK_KEY,
  CARD_DISPLAY_HEIGHT,
  CARD_DISPLAY_WIDTH,
  getCardKey,
} from "../assets/cardAssets.js";
import type { GuiCard } from "../adapter/index.js";

/**
 * CardSprite
 * ──────────────────────────────────────────────────────────────────────────────
 * A Phaser Container representing a single playing card.
 *
 * It owns two Image children:
 *  - `faceImage`  – the card's face texture
 *  - `backImage`  – the card back texture (always the same)
 *
 * The flip animation tweens scaleX 1→0, swaps visibility, then 0→1, giving a
 * convincing card-turn effect without requiring a 3D renderer.
 *
 * Responsibilities:
 *  - Displaying the correct card face or back
 *  - Animating face/back flips
 *  - Scaling consistently with CARD_DISPLAY_SCALE
 *
 * NOT responsible for: layout, interaction, game state.
 */
export class CardSprite extends Phaser.GameObjects.Container {
  private readonly faceImage: Phaser.GameObjects.Image;
  private readonly backImage: Phaser.GameObjects.Image;

  private isFaceUp: boolean;
  private rank: string;
  private suit: string;

  constructor(scene: Phaser.Scene, x: number, y: number, card: GuiCard) {
    super(scene, x, y);

    this.rank = card.rank;
    this.suit = card.suit;
    this.isFaceUp = !card.faceDown;

    // Card back
    this.backImage = scene.add.image(0, 0, CARD_BACK_KEY).setOrigin(0.5, 0.5);
    this.backImage.setDisplaySize(CARD_DISPLAY_WIDTH, CARD_DISPLAY_HEIGHT);

    // Card face
    const faceKey = getCardKey(card.rank, card.suit);
    this.faceImage = scene.add.image(0, 0, faceKey).setOrigin(0.5, 0.5);
    this.faceImage.setDisplaySize(CARD_DISPLAY_WIDTH, CARD_DISPLAY_HEIGHT);

    this.add([this.backImage, this.faceImage]);
    this.applyVisibility();

    // Register with scene so it can be managed/destroyed properly
    scene.add.existing(this);
  }

  /** Update which card is displayed. Re-renders immediately without animation. */
  setCard(rank: string, suit: string): this {
    this.rank = rank;
    this.suit = suit;
    const faceKey = getCardKey(rank, suit);
    this.faceImage.setTexture(faceKey);
    return this;
  }

  /**
   * Set face-up or face-down state.
   * @param faceUp  true = show face, false = show back
   * @param animate Whether to play the flip tween
   */
  setFaceUp(faceUp: boolean, animate = true): this {
    if (this.isFaceUp === faceUp) {
      return this;
    }
    this.isFaceUp = faceUp;

    if (!animate) {
      this.applyVisibility();
      return this;
    }

    const flipDuration = 100;

    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      duration: flipDuration,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.applyVisibility();
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          duration: flipDuration,
          ease: "Quad.easeOut",
        });
      },
    });

    return this;
  }

  /** Sync this sprite to a fresh GuiCard snapshot. */
  syncCard(card: GuiCard, animate = true): this {
    const faceKey = getCardKey(card.rank, card.suit);
    if (this.rank !== card.rank || this.suit !== card.suit) {
      this.rank = card.rank;
      this.suit = card.suit;
      this.faceImage.setTexture(faceKey);
    }
    const shouldBeFaceUp = !card.faceDown;
    if (this.isFaceUp !== shouldBeFaceUp) {
      this.setFaceUp(shouldBeFaceUp, animate);
    }
    return this;
  }

  get cardWidth(): number {
    return CARD_DISPLAY_WIDTH;
  }

  get cardHeight(): number {
    return CARD_DISPLAY_HEIGHT;
  }

  private applyVisibility(): void {
    this.faceImage.setVisible(this.isFaceUp);
    this.backImage.setVisible(!this.isFaceUp);
  }
}
