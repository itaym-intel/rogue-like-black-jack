import Phaser from "phaser";
import type { GameAdapter } from "../adapter/index.js";
import { InventoryPanel } from "../components/InventoryPanel.js";

export interface InventoryOverlayData {
  adapter: GameAdapter;
}

/**
 * InventoryOverlayScene
 * ──────────────────────────────────────────────────────────────────────────────
 * A lightweight overlay (launched on top of GameScene) showing:
 *  - All items the player currently holds in their inventory
 *  - Each item's rarity, description, and effect triggers
 *  - A "Close" button that returns focus to the parent scene
 *
 * This scene is intentionally read-only — it never calls adapter mutation
 * methods.  It simply reads the current state once on open.
 *
 * To add item detail tooltips or additional item metadata (e.g. effect
 * descriptions as items gain real implementations), this is the only file
 * to update.
 */
export class InventoryOverlayScene extends Phaser.Scene {
  private adapter!: GameAdapter;

  constructor() {
    super({ key: "InventoryOverlayScene" });
  }

  init(data: InventoryOverlayData): void {
    this.adapter = data.adapter;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Backdrop ───────────────────────────────────────────────────────────
    const backdrop = this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.75);
    backdrop.setInteractive();

    // ── Panel ──────────────────────────────────────────────────────────────
    const panelW = 740;
    const panelH = 500;
    const panelX = cx - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0d2b0d, 0.98);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    panelBg.lineStyle(2, 0x446644, 1);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);

    // ── Header ─────────────────────────────────────────────────────────────
    this.add.text(cx, panelY + 28, "INVENTORY", {
      fontSize: "24px",
      fontStyle: "bold",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 4,
      letterSpacing: 4,
    }).setOrigin(0.5, 0.5);

    const state = this.adapter.getState();
    const countLabel = state.inventory.length === 0
      ? "Empty"
      : `${state.inventory.length} item${state.inventory.length !== 1 ? "s" : ""}`;

    this.add.text(cx, panelY + 52, countLabel, {
      fontSize: "13px",
      color: "#889988",
    }).setOrigin(0.5, 0.5);

    // ── Inventory panel ────────────────────────────────────────────────────
    const invPanel = new InventoryPanel(this, panelX + 20, panelY + 70);
    invPanel.populate(state.inventory);

    // ── Close button ───────────────────────────────────────────────────────
    const closeY = panelY + panelH - 28;
    const close = this.add.text(cx, closeY, "✕  CLOSE", {
      fontSize: "16px",
      fontStyle: "bold",
      color: "#888888",
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    close.on(Phaser.Input.Events.POINTER_OVER, () => close.setColor("#ffffff"));
    close.on(Phaser.Input.Events.POINTER_OUT, () => close.setColor("#888888"));
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeOverlay());

    // Also close on Escape
    this.input.keyboard?.on("keydown-ESC", () => this.closeOverlay());

    // Animate in
    this.tweens.add({
      targets: this.children.list,
      alpha: { from: 0, to: 1 },
      duration: 180,
      ease: "Quad.easeOut",
    });
  }

  private closeOverlay(): void {
    this.scene.stop();
    this.scene.resume("GameScene");
  }
}
