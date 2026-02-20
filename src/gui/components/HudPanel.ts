import Phaser from "phaser";
import type { GuiGameState } from "../adapter/index.js";

/**
 * HudPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * Heads-up display strip showing:
 *  Row 1 (top):  Bankroll | Stage | Hands progress toward next stage check
 *  Row 2:        Round | Deck remaining | Target score (only when != 21)
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

    const bgW = 520;
    const bgH = 58;

    // Background with subtle gradient effect
    const bg = scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.7);
    bg.fillRoundedRect(0, 0, bgW, bgH, 8);
    bg.lineStyle(1, 0x3a5a3a, 0.4);
    bg.strokeRoundedRect(0, 0, bgW, bgH, 8);
    // Top highlight
    bg.fillStyle(0xffffff, 0.03);
    bg.fillRoundedRect(1, 1, bgW - 2, bgH / 2, { tl: 8, tr: 8, bl: 0, br: 0 });
    this.add(bg);

    // Section separators
    const sep = scene.add.graphics();
    sep.lineStyle(1, 0x3a5a3a, 0.3);
    sep.lineBetween(130, 8, 130, bgH - 8);
    sep.lineBetween(250, 8, 250, bgH - 8);
    sep.lineBetween(380, 8, 380, bgH - 8);
    this.add(sep);

    // ── Bankroll section ──────────────────────────────────────────────────
    const bankrollLabel = scene.add.text(12, 12, "BANKROLL", {
      fontSize: "9px",
      color: "#5a7a5a",
      letterSpacing: 1,
    }).setOrigin(0, 0);

    this.bankrollText = scene.add.text(12, 30, "$0.00", {
      fontSize: "17px",
      fontStyle: "bold",
      color: "#4ade80",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0, 0);

    // ── Stage section ─────────────────────────────────────────────────────
    const stageLabel = scene.add.text(142, 12, "STAGE", {
      fontSize: "9px",
      color: "#5a7a5a",
      letterSpacing: 1,
    }).setOrigin(0, 0);

    this.stageText = scene.add.text(142, 30, "0", {
      fontSize: "17px",
      fontStyle: "bold",
      color: "#e8e8e8",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0, 0);

    // ── Hand / Round section ──────────────────────────────────────────────
    const handLabel = scene.add.text(262, 12, "HAND", {
      fontSize: "9px",
      color: "#5a7a5a",
      letterSpacing: 1,
    }).setOrigin(0, 0);

    this.handsText = scene.add.text(262, 28, "0/5", {
      fontSize: "14px",
      color: "#c8c8c8",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0, 0);

    this.roundText = scene.add.text(320, 28, "R1", {
      fontSize: "12px",
      color: "#7a8a7a",
      stroke: "#000000",
      strokeThickness: 1,
    }).setOrigin(0, 0);

    // ── Deck / Target section ─────────────────────────────────────────────
    const deckLabel = scene.add.text(392, 12, "DECK", {
      fontSize: "9px",
      color: "#5a7a5a",
      letterSpacing: 1,
    }).setOrigin(0, 0);

    this.deckText = scene.add.text(392, 30, "0", {
      fontSize: "14px",
      color: "#c8c8c8",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0, 0);

    this.targetText = scene.add.text(450, 30, "", {
      fontSize: "12px",
      color: "#c9a84c",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0, 0).setVisible(false);

    // Threshold warning
    this.thresholdText = scene.add.text(450, 12, "", {
      fontSize: "10px",
      color: "#f39c12",
      stroke: "#000000",
      strokeThickness: 1,
    }).setOrigin(0, 0);

    this.add([
      bankrollLabel,
      this.bankrollText,
      stageLabel,
      this.stageText,
      handLabel,
      this.handsText,
      this.roundText,
      deckLabel,
      this.deckText,
      this.targetText,
      this.thresholdText,
    ]);
    scene.add.existing(this);
  }

  /** Sync all displayed values from a GuiGameState snapshot. */
  sync(state: GuiGameState): void {
    this.bankrollText.setText(`$${state.bankroll.toFixed(2)}`);

    // Color the bankroll based on how healthy it is
    if (state.bankroll <= state.minimumBet * 2) {
      this.bankrollText.setColor("#ef4444");
    } else if (state.bankroll <= state.minimumBet * 5) {
      this.bankrollText.setColor("#f59e0b");
    } else {
      this.bankrollText.setColor("#4ade80");
    }

    this.stageText.setText(`${state.stage}`);

    // Hands counter
    const handsThisStage = state.handsPlayed % state.handsPerStage;
    this.handsText.setText(`${handsThisStage}/${state.handsPerStage}`);

    this.roundText.setText(`R${state.roundNumber}`);

    // Stage requirement
    const threshold = state.stageMoneyThreshold;
    if (threshold > 0) {
      const safe = state.bankroll >= threshold * 1.5;
      this.thresholdText
        .setText(`Need $${threshold}`)
        .setColor(safe ? "#5a7a5a" : "#ff6b35")
        .setVisible(true);
    } else {
      this.thresholdText.setVisible(false);
    }

    this.deckText.setText(`${state.deckRemaining}`);

    if (state.targetScore !== 21) {
      this.targetText.setText(`Target: ${state.targetScore}`).setVisible(true);
    } else {
      this.targetText.setVisible(false);
    }
  }
}
