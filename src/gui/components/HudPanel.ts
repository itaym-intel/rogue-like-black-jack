import Phaser from "phaser";
import type { GuiGameState } from "../adapter/index.js";

/**
 * HudPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * A heads-up display bar showing:
 *  - Bankroll
 *  - Round number
 *  - Cards remaining in the deck
 *  - Current target score (if different from 21, signals a modifier is active)
 *
 * Position this at the top-left of the scene.
 *
 * NOT responsible for: game state changes, adapter calls, animation.
 */
export class HudPanel extends Phaser.GameObjects.Container {
  private readonly bankrollText: Phaser.GameObjects.Text;
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly deckText: Phaser.GameObjects.Text;
  private readonly targetText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const textStyle = {
      fontSize: "15px",
      color: "#e8e8e8",
      stroke: "#000000",
      strokeThickness: 3,
    };

    const bgW = 340;
    const bgH = 36;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(0, 0, bgW, bgH, 6);
    this.add(bg);

    this.bankrollText = scene.add.text(10, 10, "$0.00", textStyle).setOrigin(0, 0.5);
    this.roundText = scene.add.text(140, 10, "Round 0", textStyle).setOrigin(0, 0.5);
    this.deckText = scene.add.text(250, 10, "Deck: 0", textStyle).setOrigin(0, 0.5);
    this.targetText = scene.add.text(0, 10, "", {
      ...textStyle,
      color: "#f39c12",
    }).setOrigin(0, 0.5).setVisible(false);

    this.add([this.bankrollText, this.roundText, this.deckText, this.targetText]);
    scene.add.existing(this);
  }

  /** Sync all displayed values from a GuiGameState snapshot. */
  sync(state: GuiGameState): void {
    this.bankrollText.setText(`$${state.bankroll.toFixed(2)}`);
    this.roundText.setText(`Round ${state.roundNumber}`);
    this.deckText.setText(`Deck: ${state.deckRemaining}`);

    // Only show target score label when it differs from the default 21
    if (state.targetScore !== 21) {
      this.targetText.setText(`Target: ${state.targetScore}`).setVisible(true);
      this.targetText.setX(310);
    } else {
      this.targetText.setVisible(false);
    }
  }
}
