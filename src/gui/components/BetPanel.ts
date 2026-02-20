import Phaser from "phaser";

/** Emitted by BetPanel when the player confirms a wager. */
export const BET_CONFIRMED_EVENT = "betConfirmed";

/** Chip denominations displayed as quick-select buttons. */
const CHIP_DENOMINATIONS = [1, 5, 10, 25, 50, 100];

const CHIP_COLORS: Record<number, { fill: number; rim: number; text: string }> = {
  1: { fill: 0xd4d4d4, rim: 0xffffff, text: "#333333" },
  5: { fill: 0xc0392b, rim: 0xe74c3c, text: "#ffffff" },
  10: { fill: 0x2471a3, rim: 0x3498db, text: "#ffffff" },
  25: { fill: 0x1e8449, rim: 0x27ae60, text: "#ffffff" },
  50: { fill: 0x7d3c98, rim: 0x9b59b6, text: "#ffffff" },
  100: { fill: 0x1c2833, rim: 0x2c3e50, text: "#f1c40f" },
};

const CHIP_RADIUS = 26;
const CHIP_GAP = 10;

/**
 * BetPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * A chip-stack wagering UI shown during the awaiting_bet and round_settled
 * phases.
 *
 * Emits `BET_CONFIRMED_EVENT` with `{ wager: number }` on scene events.
 */
export class BetPanel extends Phaser.GameObjects.Container {
  private wager = 0;
  private minimumBet = 1;
  private maxBet = 9999;

  private readonly wagerLabel: Phaser.GameObjects.Text;
  private readonly dealButton: Phaser.GameObjects.Container;
  private readonly dealButtonBg: Phaser.GameObjects.Graphics;
  private readonly chipStack: number[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Background panel
    const panelW = 540;
    const panelH = 130;
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x0a0a0a, 0.65);
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
    panelBg.lineStyle(1, 0x3a5a3a, 0.4);
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
    // Top highlight
    panelBg.fillStyle(0xffffff, 0.02);
    panelBg.fillRoundedRect(-panelW / 2 + 1, -panelH / 2 + 1, panelW - 2, panelH / 3, { tl: 10, tr: 10, bl: 0, br: 0 });
    this.add(panelBg);

    // Chip row
    const chipRowY = -panelH / 2 + CHIP_RADIUS + 14;
    const totalChipWidth =
      CHIP_DENOMINATIONS.length * (CHIP_RADIUS * 2) +
      (CHIP_DENOMINATIONS.length - 1) * CHIP_GAP;
    let chipX = -totalChipWidth / 2 + CHIP_RADIUS;

    for (const denom of CHIP_DENOMINATIONS) {
      this.createChipButton(scene, chipX, chipRowY, denom);
      chipX += CHIP_RADIUS * 2 + CHIP_GAP;
    }

    // Wager display
    this.wagerLabel = scene.add.text(0, 14, "Wager: $0", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    this.add(this.wagerLabel);

    // Control row
    // [-] button
    this.createControlButton(scene, -130, 46, "UNDO", 0x4a4a4a, () => this.undoChip());

    // [CLEAR] button
    this.createControlButton(scene, -50, 46, "CLEAR", 0x5a3a3a, () => this.clearWager());

    // [ALL IN] button
    this.createControlButton(scene, 30, 46, "ALL IN", 0x5a4a1a, () => this.allIn());

    // [DEAL] button
    const { container, bg } = this.createDealButton(scene, 130, 46);
    this.dealButton = container;
    this.dealButtonBg = bg;

    scene.add.existing(this);
  }

  /** Update allowed range whenever bankroll or rules change. */
  setBetLimits(minimumBet: number, bankroll: number): void {
    this.minimumBet = minimumBet;
    this.maxBet = bankroll;
    this.refreshDealButton();
  }

  /** Reset wager display to 0 (does not emit). */
  resetWager(): void {
    this.wager = 0;
    this.chipStack.length = 0;
    this.refreshLabel();
  }

  /** Set wager to an exact value (e.g. from a text input). */
  setWager(value: number): void {
    const clamped = Math.max(0, Math.min(this.maxBet, Math.floor(value)));
    this.wager = clamped;
    this.chipStack.length = 0;
    if (clamped > 0) this.chipStack.push(clamped);
    this.refreshLabel();
  }

  /** Get the current wager value. */
  getWager(): number {
    return this.wager;
  }

  /** Programmatically confirm the current bet (e.g. from Enter key). */
  deal(): void {
    this.confirmBet();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private addChip(denom: number): void {
    if (this.wager + denom > this.maxBet) {
      return;
    }
    this.wager += denom;
    this.chipStack.push(denom);
    this.refreshLabel();
  }

  private undoChip(): void {
    const last = this.chipStack.pop();
    if (last !== undefined) {
      this.wager = Math.max(0, this.wager - last);
      this.refreshLabel();
    }
  }

  private clearWager(): void {
    this.wager = 0;
    this.chipStack.length = 0;
    this.refreshLabel();
  }

  private allIn(): void {
    this.wager = this.maxBet;
    this.chipStack.length = 0;
    this.chipStack.push(this.maxBet);
    this.refreshLabel();
  }

  private confirmBet(): void {
    const clamped = Math.max(this.minimumBet, Math.min(this.maxBet, this.wager));
    if (clamped <= 0) {
      return;
    }
    this.scene.events.emit(BET_CONFIRMED_EVENT, { wager: clamped });
    this.resetWager();
  }

  private refreshLabel(): void {
    this.wagerLabel.setText(`Wager: $${this.wager.toFixed(2)}`);
    this.refreshDealButton();
  }

  private refreshDealButton(): void {
    const canDeal = this.wager >= this.minimumBet && this.wager <= this.maxBet;
    this.dealButtonBg.setAlpha(canDeal ? 1 : 0.35);
  }

  private createChipButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    denom: number,
  ): void {
    const colors = CHIP_COLORS[denom] ?? { fill: 0x888888, rim: 0xaaaaaa, text: "#ffffff" };

    const g = scene.add.graphics({ x, y });

    // Draw chip with casino-style pattern
    this.drawChip(g, 0, 0, CHIP_RADIUS, colors.fill, colors.rim, false);

    const label = scene.add.text(x, y, `$${denom}`, {
      fontSize: denom >= 100 ? "10px" : "11px",
      fontStyle: "bold",
      color: colors.text,
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, CHIP_RADIUS * 2, CHIP_RADIUS * 2);
    zone.setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => this.addChip(denom));
    zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      g.clear();
      this.drawChip(g, 0, 0, CHIP_RADIUS, colors.fill, colors.rim, true);
      g.setScale(1.08);
      label.setScale(1.08);
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      g.clear();
      this.drawChip(g, 0, 0, CHIP_RADIUS, colors.fill, colors.rim, false);
      g.setScale(1);
      label.setScale(1);
    });

    this.add([g, label, zone]);
  }

  private drawChip(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    fill: number,
    rim: number,
    hovered: boolean,
  ): void {
    // Shadow
    if (!hovered) {
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(cx + 2, cy + 2, r);
    }

    // Main fill
    g.fillStyle(fill, 1);
    g.fillCircle(cx, cy, r);

    // Inner pattern — dashed ring
    g.lineStyle(2, 0xffffff, 0.2);
    g.strokeCircle(cx, cy, r - 6);

    // Edge notches (casino chip style)
    const notchCount = 8;
    for (let i = 0; i < notchCount; i++) {
      const angle = (i / notchCount) * Math.PI * 2;
      const nx = cx + Math.cos(angle) * (r - 2);
      const ny = cy + Math.sin(angle) * (r - 2);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(nx, ny, 2.5);
    }

    // Outer rim
    g.lineStyle(2.5, rim, 0.7);
    g.strokeCircle(cx, cy, r - 1);

    // Hover glow
    if (hovered) {
      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeCircle(cx, cy, r + 2);
    }
  }

  private createControlButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void,
  ): void {
    const w = 70;
    const h = 30;
    const g = scene.add.graphics({ x, y });

    const drawBtn = (hovered: boolean): void => {
      g.clear();
      g.fillStyle(hovered ? Phaser.Display.Color.IntegerToColor(color).lighten(15).color : color, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      g.lineStyle(1, 0xffffff, 0.1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    };
    drawBtn(false);

    const lbl = scene.add.text(x, y, text, {
      fontSize: "10px",
      fontStyle: "bold",
      color: "#cccccc",
      letterSpacing: 1,
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => drawBtn(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => drawBtn(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, onClick);

    this.add([g, lbl, zone]);
  }

  private createDealButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics } {
    const w = 100;
    const h = 36;

    const container = scene.add.container(0, 0);

    const bg = scene.add.graphics({ x, y });
    const drawBg = (hovered: boolean): void => {
      bg.clear();
      const baseColor = hovered ? 0xf0a020 : 0xd48a18;
      bg.fillStyle(baseColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      // Top highlight
      bg.fillStyle(0xffffff, hovered ? 0.15 : 0.08);
      bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h / 2 - 2, { tl: 7, tr: 7, bl: 0, br: 0 });
      bg.lineStyle(1, 0xffd700, 0.5);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    };
    drawBg(false);

    const lbl = scene.add.text(x, y, "DEAL", {
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => drawBg(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => drawBg(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => this.confirmBet());

    container.add([bg, lbl, zone]);
    this.add(container);

    return { container, bg };
  }
}
