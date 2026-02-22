import Phaser from "phaser";
import { GameAdapter } from "../adapter/index.js";

/**
 * MenuScene
 * ──────────────────────────────────────────────────────────────────────────────
 * Main menu screen shown after BootScene completes.
 *
 * The player can:
 *  - Enter an optional seed (string or number)
 *  - Enter an optional starting bankroll
 *  - Press PLAY to launch GameScene with a fresh GameAdapter
 *
 * HTML DOM elements are used for text inputs via Phaser's built-in
 * `this.add.dom()`, which overlays real <input> elements above the canvas.
 * This removes the need for a custom keyboard-capture widget.
 *
 * The GameAdapter is instantiated HERE from user input, then passed to
 * GameScene so the backend is only configured once per run.
 */
export class MenuScene extends Phaser.Scene {
  private seedInput!: Phaser.GameObjects.DOMElement;
  private bankrollInput!: Phaser.GameObjects.DOMElement;

  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, width, height, 0x0a1c0b);

    // Subtle grid pattern
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a3a1a, 1);
    for (let gx = 0; gx < width; gx += 40) {
      grid.lineBetween(gx, 0, gx, height);
    }
    for (let gy = 0; gy < height; gy += 40) {
      grid.lineBetween(0, gy, width, gy);
    }

    // ── Title ───────────────────────────────────────────────────────────────
    this.add.text(cx, cy - 200, "ROGUE-LIKE BLACKJACK", {
      fontSize: "40px",
      fontStyle: "bold",
      color: "#f0e68c",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, cy - 155, "A modular roguelike card game", {
      fontSize: "16px",
      color: "#aaaaaa",
    }).setOrigin(0.5, 0.5);

    // ── Input panel background ───────────────────────────────────────────────
    const panelW = 360;
    const panelH = 200;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.5);
    panelBg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2 - 30, panelW, panelH, 12);
    panelBg.lineStyle(1, 0x446644, 1);
    panelBg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2 - 30, panelW, panelH, 12);

    // ── Seed input ───────────────────────────────────────────────────────────
    this.add.text(cx - 130, cy - 85, "Seed (optional):", {
      fontSize: "14px",
      color: "#cccccc",
    }).setOrigin(0, 0.5);

    this.seedInput = this.add.dom(cx + 60, cy - 85).createFromHTML(
      `<input type="text" id="seed-input" placeholder="random"
        style="width:150px;padding:6px 10px;border-radius:6px;border:1px solid #446644;
               background:#1a2e1a;color:#fff;font-size:14px;outline:none;" />`,
    );

    // ── Bankroll input ───────────────────────────────────────────────────────
    this.add.text(cx - 130, cy - 45, "Bankroll:", {
      fontSize: "14px",
      color: "#cccccc",
    }).setOrigin(0, 0.5);

    this.bankrollInput = this.add.dom(cx + 60, cy - 45).createFromHTML(
      `<input type="number" id="bankroll-input" placeholder="100" min="1"
        style="width:150px;padding:6px 10px;border-radius:6px;border:1px solid #446644;
               background:#1a2e1a;color:#fff;font-size:14px;outline:none;" />`,
    );

    // ── Play button ──────────────────────────────────────────────────────────
    this.createPlayButton(cx, cy + 60);

    // ── Footer ───────────────────────────────────────────────────────────────
    this.add.text(cx, height - 20, "Cards provided by deckofcardsapi.com", {
      fontSize: "11px",
      color: "#555555",
    }).setOrigin(0.5, 1);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private createPlayButton(x: number, y: number): void {
    const w = 180;
    const h = 50;

    const bg = this.add.graphics();
    const drawBg = (hovered: boolean): void => {
      bg.clear();
      bg.fillStyle(hovered ? 0xf39c12 : 0xe67e22, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.lineStyle(2, 0xffd700, 0.8);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    drawBg(false);

    const label = this.add.text(x, y, "▶  PLAY", {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => drawBg(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => drawBg(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => this.startGame());

    // Also allow keyboard Enter to start
    this.input.keyboard?.on("keydown-ENTER", () => this.startGame());
  }

  private startGame(): void {
    const seedRaw = (
      this.seedInput.getChildByID("seed-input") as HTMLInputElement | null
    )?.value.trim();

    const bankrollRaw = (
      this.bankrollInput.getChildByID("bankroll-input") as HTMLInputElement | null
    )?.value.trim();

    const seed: number | string | undefined = seedRaw
      ? (Number.isFinite(Number(seedRaw)) ? Number(seedRaw) : seedRaw)
      : undefined;

    const startingBankroll: number | undefined = bankrollRaw
      ? (Number.isFinite(Number(bankrollRaw)) ? Math.max(1, Number(bankrollRaw)) : undefined)
      : undefined;

    const adapter = new GameAdapter({ seed, startingBankroll });

    this.scene.start("GameScene", { adapter });
  }
}
