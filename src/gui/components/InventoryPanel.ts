import Phaser from "phaser";
import type { GuiItem, GuiItemRarity } from "../adapter/index.js";

/** Badge colours keyed by rarity. */
const RARITY_COLOR: Record<GuiItemRarity, number> = {
  common: 0x888888,
  uncommon: 0x27ae60,
  rare: 0x2980b9,
  legendary: 0xf1c40f,
};

const RARITY_LABEL_COLOR: Record<GuiItemRarity, string> = {
  common: "#bbbbbb",
  uncommon: "#27ae60",
  rare: "#5dade2",
  legendary: "#f1c40f",
};

const CARD_W = 160;
const CARD_H = 110;
const CARD_GAP = 12;
const COLUMNS = 4;

/**
 * InventoryPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * Renders a grid of item cards from an array of GuiItems.
 *
 * Each item card shows:
 *  - Coloured rarity border
 *  - Item name (bold)
 *  - Rarity label
 *  - Description (wrapped)
 *  - Effect trigger badges (e.g. "passive", "on_hand_end")
 *
 * Hovering an item card dims the others, allowing easy focus.
 * This component is stateless re: game logic — call `populate(items)` to
 * refresh it whenever the inventory changes.
 *
 * Used by: InventoryOverlayScene, ShopScene (to show current inventory).
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
      const empty = this.scene.add.text(0, 40, "No items yet.", {
        fontSize: "16px",
        color: "#666666",
      }).setOrigin(0.5, 0.5);
      this.add(empty);
      this.itemContainers.push(empty as unknown as Phaser.GameObjects.Container);
      return;
    }

    for (let i = 0; i < items.length; i += 1) {
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const cx = col * (CARD_W + CARD_GAP);
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

    const rarityColor = RARITY_COLOR[item.itemRarity] ?? 0x888888;
    const rarityTextColor = RARITY_LABEL_COLOR[item.itemRarity] ?? "#bbbbbb";

    // Card background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0d2b0d, 0.95);
    bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 8);
    bg.lineStyle(2, rarityColor, 1);
    bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 8);

    // Item name
    const nameText = scene.add.text(8, 8, item.itemName, {
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
      wordWrap: { width: CARD_W - 16 },
    }).setOrigin(0, 0);

    // Rarity label
    const rarityText = scene.add.text(8, 26, item.itemRarity.toUpperCase(), {
      fontSize: "10px",
      color: rarityTextColor,
    }).setOrigin(0, 0);

    // Description
    const descText = scene.add.text(8, 40, item.itemDescription, {
      fontSize: "10px",
      color: "#aaaaaa",
      wordWrap: { width: CARD_W - 16 },
    }).setOrigin(0, 0);

    // Effect triggers (badges at bottom)
    let badgeX = 8;
    for (const effect of item.effects) {
      const badge = this.buildTriggerBadge(scene, badgeX, CARD_H - 20, effect.trigger);
      container.add(badge);
      badgeX += 60;
    }

    // If no effects, show "No effects" placeholder
    if (item.effects.length === 0) {
      const none = scene.add.text(8, CARD_H - 18, "No effects (placeholder)", {
        fontSize: "9px",
        color: "#555555",
      }).setOrigin(0, 0);
      container.add(none);
    }

    // Hover interaction
    const zone = scene.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0).setInteractive();
    zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      bg.setAlpha(1);
      container.setDepth(10);
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      bg.setAlpha(0.95);
      container.setDepth(0);
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
      on_hand_start: "HAND START",
      on_hand_end: "HAND END",
      on_stage_end: "STAGE END",
      on_purchase: "ON BUY",
    };
    const label = TRIGGER_SHORT[trigger] ?? trigger.toUpperCase();
    const c = scene.add.container(x, y);

    const badgeBg = scene.add.graphics();
    badgeBg.fillStyle(0x1a3a1a, 1);
    badgeBg.fillRoundedRect(0, 0, 54, 14, 4);
    c.add(badgeBg);

    const badgeText = scene.add.text(27, 7, label, {
      fontSize: "8px",
      color: "#88cc88",
    }).setOrigin(0.5, 0.5);
    c.add(badgeText);

    return c;
  }
}
