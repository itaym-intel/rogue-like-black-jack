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
  private formDom!: Phaser.GameObjects.DOMElement;

  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(cx, cy, width, height, 0x070f08);

    // Radial gradient glow
    const glow = this.add.graphics();
    glow.fillStyle(0x0d3d1a, 0.4);
    glow.fillEllipse(cx, cy - 40, width * 0.7, height * 0.6);
    glow.fillStyle(0x1a5a2a, 0.15);
    glow.fillEllipse(cx, cy - 80, width * 0.4, height * 0.3);

    // Decorative suit symbols scattered faintly
    const suits = ["\u2660", "\u2665", "\u2666", "\u2663"]; // spade, heart, diamond, club
    const suitPositions = [
      { x: 120, y: 140, s: 0 }, { x: 1160, y: 140, s: 1 },
      { x: 80, y: 580, s: 2 }, { x: 1200, y: 580, s: 3 },
      { x: 200, y: 360, s: 0 }, { x: 1080, y: 360, s: 1 },
      { x: 320, y: 620, s: 2 }, { x: 960, y: 620, s: 3 },
    ];
    for (const pos of suitPositions) {
      this.add.text(pos.x, pos.y, suits[pos.s], {
        fontSize: "48px",
        color: pos.s === 1 || pos.s === 2 ? "#3a1515" : "#152a15",
      }).setOrigin(0.5, 0.5).setAlpha(0.25);
    }

    // ── Title ───────────────────────────────────────────────────────────────
    // Subtle line above title
    const titleLineY = cy - 228;
    this.add.graphics()
      .lineStyle(1, 0xc9a84c, 0.3)
      .lineBetween(cx - 220, titleLineY, cx + 220, titleLineY);

    this.add.text(cx, cy - 200, "ROGUE-LIKE", {
      fontSize: "46px",
      fontStyle: "bold",
      color: "#f0e68c",
      stroke: "#000000",
      strokeThickness: 6,
      letterSpacing: 8,
    }).setOrigin(0.5, 0.5);

    this.add.text(cx, cy - 155, "BLACKJACK", {
      fontSize: "32px",
      fontStyle: "bold",
      color: "#c9a84c",
      stroke: "#000000",
      strokeThickness: 4,
      letterSpacing: 12,
    }).setOrigin(0.5, 0.5);

    // Subtle line below title
    const titleLine2Y = cy - 130;
    this.add.graphics()
      .lineStyle(1, 0xc9a84c, 0.3)
      .lineBetween(cx - 220, titleLine2Y, cx + 220, titleLine2Y);

    this.add.text(cx, cy - 112, "A modular roguelike card game", {
      fontSize: "13px",
      color: "#6a8a6a",
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5);

    // ── Input panel + button (single DOM element for correct centering) ───
    const panelTopY = cy - 60;

    this.formDom = this.add.dom(cx, panelTopY + 110).setOrigin(0.5, 0.5).createFromHTML(
      `<div style="
          width:340px;padding:24px 28px;box-sizing:border-box;
          font-family:monospace;
          display:flex;flex-direction:column;align-items:center;
        ">
        <div style="
            width:100%;padding:20px 24px;margin-bottom:20px;
            background:rgba(10,26,12,0.7);
            border:1px solid rgba(58,90,58,0.6);
            border-radius:10px;box-sizing:border-box;
          ">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:11px;color:#6a8a6a;letter-spacing:2px;margin-bottom:6px;">SEED</label>
            <input type="text" id="seed-input" placeholder="random"
              style="width:100%;box-sizing:border-box;padding:8px 12px;border-radius:6px;
                     border:1px solid #2a4a2a;background:#0d1a0e;color:#c0d8c0;font-size:14px;
                     font-family:monospace;outline:none;transition:border-color 0.2s;"
              onfocus="this.style.borderColor='#4a8a4a'"
              onblur="this.style.borderColor='#2a4a2a'" />
          </div>
          <div>
            <label style="display:block;font-size:11px;color:#6a8a6a;letter-spacing:2px;margin-bottom:6px;">BANKROLL</label>
            <input type="number" id="bankroll-input" placeholder="100" min="1"
              style="width:100%;box-sizing:border-box;padding:8px 12px;border-radius:6px;
                     border:1px solid #2a4a2a;background:#0d1a0e;color:#c0d8c0;font-size:14px;
                     font-family:monospace;outline:none;transition:border-color 0.2s;"
              onfocus="this.style.borderColor='#4a8a4a'"
              onblur="this.style.borderColor='#2a4a2a'" />
          </div>
        </div>
        <button id="deal-btn" style="
            width:200px;height:52px;border:1.5px solid rgba(255,215,0,0.6);
            border-radius:10px;background:linear-gradient(to bottom,#f0a020,#d48a18);
            color:#fff;font-size:20px;font-weight:bold;font-family:monospace;
            letter-spacing:3px;cursor:pointer;
            text-shadow:0 2px 4px rgba(0,0,0,0.5);
            transition:background 0.15s;
          "
          onmouseover="this.style.background='linear-gradient(to bottom,#fbb030,#e09a22)'"
          onmouseout="this.style.background='linear-gradient(to bottom,#f0a020,#d48a18)'"
          onmousedown="this.style.background='linear-gradient(to bottom,#c07a10,#b86c12)'"
          onmouseup="this.style.background='linear-gradient(to bottom,#f0a020,#d48a18)'"
        >DEAL ME IN</button>
      </div>`,
    );

    // Wire the DOM button click + keyboard Enter
    const dealBtn = this.formDom.getChildByID("deal-btn") as HTMLButtonElement | null;
    dealBtn?.addEventListener("click", () => this.startGame());
    this.input.keyboard?.on("keydown-ENTER", () => this.startGame());

    // ── Footer ─────────────────────────────────────────────────────────────
    this.add.text(cx, height - 24, "Cards provided by deckofcardsapi.com", {
      fontSize: "10px",
      color: "#2a3a2a",
      letterSpacing: 1,
    }).setOrigin(0.5, 1);

    // ── Animate in ─────────────────────────────────────────────────────────
    const allObjects = this.children.list.slice();
    for (const obj of allObjects) {
      (obj as Phaser.GameObjects.GameObject & { setAlpha?: (a: number) => void }).setAlpha?.(0);
    }
    this.tweens.add({
      targets: allObjects,
      alpha: 1,
      duration: 600,
      ease: "Quad.easeOut",
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private startGame(): void {
    const seedRaw = (
      this.formDom.getChildByID("seed-input") as HTMLInputElement | null
    )?.value.trim();

    const bankrollRaw = (
      this.formDom.getChildByID("bankroll-input") as HTMLInputElement | null
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
