import Phaser from "phaser";

/** Emitted by BetPanel when the player confirms a wager. */
export const BET_CONFIRMED_EVENT = "betConfirmed";

/** Chip denominations displayed as quick-select buttons. */
const CHIP_DENOMINATIONS = [1, 5, 10, 25, 50, 100];

const CHIP_COLORS: Record<number, number> = {
  1: 0xe8e8e8,
  5: 0xe74c3c,
  10: 0x3498db,
  25: 0x27ae60,
  50: 0x9b59b6,
  100: 0x2c3e50,
};

const CHIP_RADIUS = 28;
const CHIP_GAP = 8;

/**
 * BetPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * A chip-stack wagering UI shown during the awaiting_bet and round_settled
 * phases.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────┐
 *  │  [1] [5] [10] [25] [50] [100]   chip row     │
 *  │          Current Wager: $25                  │
 *  │   [-]    Wager: 25    [+]   [CLEAR] [DEAL]   │
 *  └──────────────────────────────────────────────┘
 *
 * Chip clicks add to the wager.  [-] subtracts the last chip added.
 * [CLEAR] resets to 0.  [DEAL] emits betConfirmed if wager > 0.
 *
 * The panel silently clamps the wager to [minimumBet, bankroll] on Deal.
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
    const panelW = 520;
    const panelH = 140;
    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.55);
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    panelBg.lineStyle(1, 0x888888, 0.6);
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    this.add(panelBg);

    // Chip row
    const chipRowY = -panelH / 2 + CHIP_RADIUS + 12;
    const totalChipWidth =
      CHIP_DENOMINATIONS.length * (CHIP_RADIUS * 2) +
      (CHIP_DENOMINATIONS.length - 1) * CHIP_GAP;
    let chipX = -totalChipWidth / 2 + CHIP_RADIUS;

    for (const denom of CHIP_DENOMINATIONS) {
      this.createChipButton(scene, chipX, chipRowY, denom);
      chipX += CHIP_RADIUS * 2 + CHIP_GAP;
    }

    // Wager display label
    this.wagerLabel = scene.add.text(0, 10, "Wager: $0", {
      fontSize: "18px",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    this.add(this.wagerLabel);

    // [-] button
    this.createControlButton(scene, -120, 48, "−", 0x636e72, () => this.undoChip());

    // [CLEAR] button
    this.createControlButton(scene, -40, 48, "Clear", 0x7f8c8d, () => this.clearWager());

    // [DEAL] button
    const { container, bg } = this.createDealButton(scene, 80, 48);
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
    this.dealButtonBg.setAlpha(canDeal ? 1 : 0.4);
  }

  private createChipButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    denom: number,
  ): void {
    const color = CHIP_COLORS[denom] ?? 0x888888;

    const g = scene.add.graphics({ x, y });
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, CHIP_RADIUS);
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeCircle(0, 0, CHIP_RADIUS - 2);

    const label = scene.add.text(x, y, `$${denom}`, {
      fontSize: "11px",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, CHIP_RADIUS * 2, CHIP_RADIUS * 2);
    zone.setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => this.addChip(denom));
    zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      g.setScale(1.1);
      label.setScale(1.1);
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      g.setScale(1);
      label.setScale(1);
    });

    this.add([g, label, zone]);
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
    const h = 34;
    const g = scene.add.graphics({ x, y });
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);

    const lbl = scene.add.text(x, y, text, {
      fontSize: "14px",
      color: "#ffffff",
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_DOWN, onClick);

    this.add([g, lbl, zone]);
  }

  private createDealButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics } {
    const w = 100;
    const h = 40;

    const container = scene.add.container(0, 0);

    const bg = scene.add.graphics({ x, y });
    bg.fillStyle(0xe67e22, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    const lbl = scene.add.text(x, y, "DEAL", {
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => this.confirmBet());

    container.add([bg, lbl, zone]);
    this.add(container);

    return { container, bg };
  }
}
