import Phaser from "phaser";
import type { GuiGameState } from "../adapter/index.js";

/**
 * HudPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * Heads-up display strip showing:
 *  Row 1 (top):  Bankroll | Stage | Hands progress toward next stage check
 *  Row 2:        Round | Deck remaining | Target score (only when ≠ 21)
 *
 * Stage threshold is shown in a warning colour when bankroll is dangerously
 * close to the required amount.
 *
 * NOT responsible for: game state changes, adapter calls, animation.
 */
export class HudPanel extends Phaser.GameObjects.Container {
  private readonly bankrollText: Phaser.GameObjects.Text;
  private readonly stageText: Phaser.GameObjects.Text;
  private readonly handsText: Phaser.GameObjects.Text;
  private readonly thresholdText: Phaser.GameObjects.Text;
  private readonly roundText: Phaser.GameObjects.Text;
  private readonly deckText: Phaser.GameObjects.Text;
  private readonly targetText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const rowStyle = {
      fontSize: "15px",
      color: "#e8e8e8",
      stroke: "#000000",
      strokeThickness: 3,
    };
    const dimStyle = { ...rowStyle, fontSize: "13px", color: "#aaaaaa" };

    const bgW = 500;
    const bgH = 54;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRoundedRect(0, 0, bgW, bgH, 6);
    this.add(bg);

    // Row 1
    this.bankrollText = scene.add.text(10, 14, "$0.00", rowStyle).setOrigin(0, 0.5);
    this.stageText = scene.add.text(130, 14, "Stage 0", rowStyle).setOrigin(0, 0.5);
    this.handsText = scene.add.text(240, 14, "Hand 0/5", dimStyle).setOrigin(0, 0.5);
    this.thresholdText = scene.add.text(360, 14, "", {
      ...dimStyle,
      color: "#f39c12",
    }).setOrigin(0, 0.5);

    // Row 2
    this.roundText = scene.add.text(10, 40, "Round 0", dimStyle).setOrigin(0, 0.5);
    this.deckText = scene.add.text(120, 40, "Deck: 0", dimStyle).setOrigin(0, 0.5);
    this.targetText = scene.add.text(220, 40, "", {
      ...dimStyle,
      color: "#f39c12",
    }).setOrigin(0, 0.5).setVisible(false);

    this.add([
      this.bankrollText,
      this.stageText,
      this.handsText,
      this.thresholdText,
      this.roundText,
      this.deckText,
      this.targetText,
    ]);
    scene.add.existing(this);
  }

  /** Sync all displayed values from a GuiGameState snapshot. */
  sync(state: GuiGameState): void {
    this.bankrollText.setText(`$${state.bankroll.toFixed(2)}`);
    this.stageText.setText(`Stage ${state.stage}`);

    // Hands counter: show hands played this stage / handsPerStage
    const handsThisStage = state.handsPlayed % state.handsPerStage;
    this.handsText.setText(`Hand ${handsThisStage}/${state.handsPerStage}`);

    // Stage requirement: warn when bankroll is ≤ 1.5× threshold (or threshold > 0)
    const threshold = state.stageMoneyThreshold;
    if (threshold > 0) {
      const safe = state.bankroll >= threshold * 1.5;
      this.thresholdText
        .setText(`Need $${threshold}`)
        .setColor(safe ? "#888888" : "#ff6b35")
        .setVisible(true);
    } else {
      this.thresholdText.setVisible(false);
    }

    this.roundText.setText(`Round ${state.roundNumber}`);
    this.deckText.setText(`Deck: ${state.deckRemaining}`);

    if (state.targetScore !== 21) {
      this.targetText.setText(`Target: ${state.targetScore}`).setVisible(true);
    } else {
      this.targetText.setVisible(false);
    }
  }
}
