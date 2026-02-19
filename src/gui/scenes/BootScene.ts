import Phaser from "phaser";
import { ALL_CARD_ASSETS } from "../assets/cardAssets.js";

/**
 * BootScene
 * ──────────────────────────────────────────────────────────────────────────────
 * First scene to run.  Preloads all card images from the Deck of Cards API
 * (or any provider configured in cardAssets.ts) and displays a simple
 * progress bar.
 *
 * Once loading completes it immediately transitions to MenuScene.
 *
 * To swap card providers in the future:  update cardAssets.ts only.
 */
export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    this.add.rectangle(cx, cy, width, height, 0x0a1c0b);

    // Progress bar UI
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(cx - 160, cy - 16, 320, 32);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(cx, cy - 40, "Loading card assets…", {
      fontSize: "18px",
      color: "#cccccc",
    }).setOrigin(0.5, 0.5);

    this.percentText = this.add.text(cx, cy + 30, "0%", {
      fontSize: "14px",
      color: "#aaaaaa",
    }).setOrigin(0.5, 0.5);

    // Progress listener
    this.load.on(
      Phaser.Loader.Events.PROGRESS,
      (value: number) => {
        this.progressBar.clear();
        this.progressBar.fillStyle(0x27ae60, 1);
        this.progressBar.fillRect(cx - 158, cy - 14, 316 * value, 28);
        this.percentText.setText(`${Math.round(value * 100)}%`);
      },
    );

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      this.loadingText.setText("Ready!");
    });

    // Queue all card images
    for (const { key, url } of ALL_CARD_ASSETS) {
      this.load.image(key, url);
    }
  }

  create(): void {
    this.scene.start("MenuScene");
  }
}
