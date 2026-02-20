import Phaser from "phaser";
import type { GuiItem, GuiItemRarity } from "../adapter/index.js";

/** Badge colours keyed by rarity. */
const RARITY_COLOR: Record<GuiItemRarity, number> = {
  common: 0x6b7280,
  uncommon: 0x16a34a,
  rare: 0x2563eb,
  legendary: 0xd97706,
};

const RARITY_LABEL_COLOR: Record<GuiItemRarity, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  legendary: "#fbbf24",
};

const RARITY_GLOW_ALPHA: Record<GuiItemRarity, number> = {
  common: 0,
  uncommon: 0.05,
  rare: 0.08,
  legendary: 0.15,
};

const CARD_W = 164;
const CARD_H = 115;
const CARD_GAP = 10;
const COLUMNS = 4;

/**
 * InventoryPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * Renders a grid of item cards from an array of GuiItems.
 */
export class InventoryPanel extends Phaser.GameObjects.Container {
  private itemContainers: Phaser.GameObjects.Container[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  /** Render a fresh set of items. Destroys any previous children. */
  populate(items: ReadonlyArray<GuiItem>): void {
    for (const old of this.itemContainers) {
      old.destroy();
    }
    this.itemContainers = [];

    if (items.length === 0) {
      const empty = this.scene.add.text(0, 50, "No items yet.", {
        fontSize: "14px",
        color: "#475569",
        letterSpacing: 1,
      }).setOrigin(0.5, 0.5);
      this.add(empty);
      this.itemContainers.push(empty as unknown as Phaser.GameObjects.Container);
      return;
    }

    // Center the grid
    const totalGridW = COLUMNS * (CARD_W + CARD_GAP) - CARD_GAP;
    const offsetX = -totalGridW / 2 + CARD_W / 2;

    for (let i = 0; i < items.length; i += 1) {
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const cx = offsetX + col * (CARD_W + CARD_GAP);
      const cy = row * (CARD_H + CARD_GAP);
      const card = this.buildItemCard(items[i], cx, cy);
      this.add(card);
      this.itemContainers.push(card);
    }
  }

  /** Total pixel height of the panel (for scroll/layout calculation). */
  get contentHeight(): number {
    const rows = Math.ceil(this.itemContainers.length / COLUMNS);
    return rows * (CARD_H + CARD_GAP);
  }

  // ── private ───────────────────────────────────────────────────────────────

  private buildItemCard(item: GuiItem, x: number, y: number): Phaser.GameObjects.Container {
    const scene = this.scene;
    const container = scene.add.container(x, y);

    const rarityColor = RARITY_COLOR[item.itemRarity] ?? 0x6b7280;
    const rarityTextColor = RARITY_LABEL_COLOR[item.itemRarity] ?? "#9ca3af";
    const glowAlpha = RARITY_GLOW_ALPHA[item.itemRarity] ?? 0;

    // Card background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0f1f12, 0.95);
    bg.fillRoundedRect(-CARD_W / 2, 0, CARD_W, CARD_H, 8);
    bg.lineStyle(1.5, rarityColor, 0.6);
    bg.strokeRoundedRect(-CARD_W / 2, 0, CARD_W, CARD_H, 8);

    // Rarity glow at top
    if (glowAlpha > 0) {
      bg.fillStyle(rarityColor, glowAlpha);
      bg.fillRoundedRect(-CARD_W / 2 + 1, 1, CARD_W - 2, 20, { tl: 7, tr: 7, bl: 0, br: 0 });
    }

    // Item name
    const nameText = scene.add.text(-CARD_W / 2 + 10, 10, item.itemName, {
      fontSize: "12px",
      fontStyle: "bold",
      color: "#e2e8f0",
      stroke: "#000",
      strokeThickness: 2,
      wordWrap: { width: CARD_W - 20 },
    }).setOrigin(0, 0);

    // Rarity label
    const rarityLabel = item.itemRarity.toUpperCase();
    const rarityText = scene.add.text(-CARD_W / 2 + 10, 26, rarityLabel, {
      fontSize: "8px",
      color: rarityTextColor,
      letterSpacing: 2,
    }).setOrigin(0, 0);

    // Description
    const descText = scene.add.text(-CARD_W / 2 + 10, 42, item.itemDescription, {
      fontSize: "9px",
      color: "#94a3b8",
      wordWrap: { width: CARD_W - 20 },
      lineSpacing: 2,
    }).setOrigin(0, 0);

    // Effect triggers (badges at bottom)
    let badgeX = -CARD_W / 2 + 10;
    for (const effect of item.effects) {
      const badge = this.buildTriggerBadge(scene, badgeX, CARD_H - 20, effect.trigger);
      container.add(badge);
      badgeX += 62;
    }

    if (item.effects.length === 0) {
      const none = scene.add.text(-CARD_W / 2 + 10, CARD_H - 16, "No effects", {
        fontSize: "8px",
        color: "#334155",
      }).setOrigin(0, 0);
      container.add(none);
    }

    // Hover interaction
    const zone = scene.add.zone(0, CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      container.setDepth(10);
      bg.clear();
      bg.fillStyle(0x152a18, 0.98);
      bg.fillRoundedRect(-CARD_W / 2, 0, CARD_W, CARD_H, 8);
      bg.lineStyle(2, rarityColor, 0.9);
      bg.strokeRoundedRect(-CARD_W / 2, 0, CARD_W, CARD_H, 8);
      if (glowAlpha > 0) {
        bg.fillStyle(rarityColor, glowAlpha * 2);
        bg.fillRoundedRect(-CARD_W / 2 + 1, 1, CARD_W - 2, 20, { tl: 7, tr: 7, bl: 0, br: 0 });
      }
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      container.setDepth(0);
      bg.clear();
      bg.fillStyle(0x0f1f12, 0.95);
      bg.fillRoundedRect(-CARD_W / 2, 0, CARD_W, CARD_H, 8);
      bg.lineStyle(1.5, rarityColor, 0.6);
      bg.strokeRoundedRect(-CARD_W / 2, 0, CARD_W, CARD_H, 8);
      if (glowAlpha > 0) {
        bg.fillStyle(rarityColor, glowAlpha);
        bg.fillRoundedRect(-CARD_W / 2 + 1, 1, CARD_W - 2, 20, { tl: 7, tr: 7, bl: 0, br: 0 });
      }
    });

    container.add([bg, nameText, rarityText, descText, zone]);
    return container;
  }

  private buildTriggerBadge(
    scene: Phaser.Scene,
    x: number,
    y: number,
    trigger: string,
  ): Phaser.GameObjects.Container {
    const TRIGGER_SHORT: Record<string, string> = {
      passive: "PASSIVE",
      on_hand_start: "START",
      on_hand_end: "END",
      on_stage_end: "STAGE",
      on_purchase: "BUY",
    };
    const label = TRIGGER_SHORT[trigger] ?? trigger.toUpperCase();
    const c = scene.add.container(x, y);

    const badgeBg = scene.add.graphics();
    badgeBg.fillStyle(0x1e3a1e, 0.8);
    badgeBg.fillRoundedRect(0, 0, 54, 14, 3);
    badgeBg.lineStyle(0.5, 0x3a5a3a, 0.5);
    badgeBg.strokeRoundedRect(0, 0, 54, 14, 3);
    c.add(badgeBg);

    const badgeText = scene.add.text(27, 7, label, {
      fontSize: "7px",
      fontStyle: "bold",
      color: "#6a9a6a",
      letterSpacing: 1,
    }).setOrigin(0.5, 0.5);
    c.add(badgeText);

    return c;
  }
}
