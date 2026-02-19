import Phaser from "phaser";
import type { GameAdapter, GuiGameState, GuiItem, GuiShopOffering } from "../adapter/index.js";
import { InventoryPanel } from "../components/InventoryPanel.js";

export interface ShopSceneData {
  adapter: GameAdapter;
  state: GuiGameState;
}

const RARITY_COLOR: Record<string, string> = {
  common: "#bbbbbb",
  uncommon: "#27ae60",
  rare: "#5dade2",
  legendary: "#f1c40f",
};

const OFFERING_W = 220;
const OFFERING_H = 260;
const OFFERING_GAP = 30;

/**
 * ShopScene
 * ──────────────────────────────────────────────────────────────────────────────
 * Full-screen scene that opens after a stage is cleared.  Displays:
 *  - Stage cleared banner
 *  - 3 item offering cards with Buy buttons
 *  - Current inventory (below the offerings)
 *  - "Leave Shop" button
 *
 * Each offering card shows:
 *  - Item name + rarity badge
 *  - Description
 *  - Effect triggers
 *  - Price ($90–$110)
 *  - Buy button (disabled if can't afford or already purchased)
 *
 * Purchasing calls adapter.purchaseShopItem(index) and refreshes the display.
 * Leaving calls adapter.leaveShop() and resumes GameScene.
 *
 * This scene is launched on top of (and pauses) GameScene.
 */
export class ShopScene extends Phaser.Scene {
  private adapter!: GameAdapter;
  private initialState!: GuiGameState;

  // Live references for refresh
  private offeringContainers: Phaser.GameObjects.Container[] = [];
  private inventoryPanel!: InventoryPanel;
  private bankrollLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "ShopScene" });
  }

  init(data: ShopSceneData): void {
    this.adapter = data.adapter;
    this.initialState = data.state;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ─────────────────────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x080f08);

    // Decorative glow lines
    const glow = this.add.graphics();
    glow.lineStyle(1, 0x1a4a1a, 0.5);
    for (let i = 0; i < 20; i += 1) {
      glow.lineBetween(i * 68, 0, i * 68, height);
    }

    // ── Header ─────────────────────────────────────────────────────────────
    this.add.text(cx, 44, "✦  SHOP  ✦", {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 5,
    }).setOrigin(0.5, 0.5);

    const meta = `Stage ${this.initialState.stage} cleared  ·  Hands played: ${this.initialState.handsPlayed}`;
    this.add.text(cx, 80, meta, {
      fontSize: "15px",
      color: "#89a489",
    }).setOrigin(0.5, 0.5);

    // Bankroll display (live, updated on purchase)
    this.bankrollLabel = this.add.text(cx, 106, ``, {
      fontSize: "17px",
      color: "#f0e68c",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
    this.updateBankrollLabel(this.initialState.bankroll);

    // ── Offering cards ─────────────────────────────────────────────────────
    const state = this.adapter.getState();
    this.renderOfferings(cx, state);

    // ── Divider ────────────────────────────────────────────────────────────
    this.add.graphics().lineStyle(1, 0x2a4a2a, 0.7).lineBetween(60, 450, width - 60, 450);
    this.add.text(cx, 462, "INVENTORY", {
      fontSize: "12px",
      color: "#556655",
      letterSpacing: 4,
    }).setOrigin(0.5, 0);

    // ── Inventory panel ────────────────────────────────────────────────────
    this.inventoryPanel = new InventoryPanel(this, 60, 480);
    this.inventoryPanel.populate(state.inventory);

    // ── Leave button ───────────────────────────────────────────────────────
    this.createLeaveButton(cx, height - 40);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private renderOfferings(cx: number, state: GuiGameState): void {
    // Destroy previous offering UI
    for (const c of this.offeringContainers) {
      c.destroy();
    }
    this.offeringContainers = [];

    const count = state.shopOfferings.length;
    const totalW = count * OFFERING_W + (count - 1) * OFFERING_GAP;
    const startX = cx - totalW / 2;

    for (let i = 0; i < count; i += 1) {
      const offering = state.shopOfferings[i];
      const x = startX + i * (OFFERING_W + OFFERING_GAP);
      const card = this.buildOfferingCard(offering, x, 136);
      this.offeringContainers.push(card);
      this.add.existing(card);
    }
  }

  private buildOfferingCard(
    offering: GuiShopOffering,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);

    const rarityTextColor = RARITY_COLOR[offering.item.itemRarity] ?? "#bbbbbb";
    const purchased = false; // offerings are removed after purchase (getOfferings shrinks)
    const affordable = offering.canAfford;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d2b0d, 0.97);
    bg.fillRoundedRect(0, 0, OFFERING_W, OFFERING_H, 12);
    bg.lineStyle(2, affordable ? 0x27ae60 : 0x444444, 1);
    bg.strokeRoundedRect(0, 0, OFFERING_W, OFFERING_H, 12);
    c.add(bg);

    // Rarity strip
    const rarityStrip = this.add.graphics();
    rarityStrip.fillStyle(parseInt((rarityTextColor ?? "#888888").slice(1), 16), 0.25);
    rarityStrip.fillRoundedRect(0, 0, OFFERING_W, 28, { tl: 12, tr: 12, bl: 0, br: 0 });
    c.add(rarityStrip);

    // Name
    c.add(this.add.text(OFFERING_W / 2, 14, offering.item.itemName, {
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5));

    // Rarity
    c.add(this.add.text(OFFERING_W / 2, 36, offering.item.itemRarity.toUpperCase(), {
      fontSize: "10px",
      color: rarityTextColor,
    }).setOrigin(0.5, 0.5));

    // Description
    c.add(this.add.text(12, 52, offering.item.itemDescription, {
      fontSize: "11px",
      color: "#aaaaaa",
      wordWrap: { width: OFFERING_W - 24 },
      lineSpacing: 2,
    }).setOrigin(0, 0));

    // Effects
    let effectY = 130;
    if (offering.item.effects.length > 0) {
      for (const effect of offering.item.effects) {
        c.add(this.add.text(12, effectY, `▸ ${effect.trigger}: ${effect.description}`, {
          fontSize: "9px",
          color: "#88cc88",
          wordWrap: { width: OFFERING_W - 24 },
        }).setOrigin(0, 0));
        effectY += 18;
      }
    } else {
      c.add(this.add.text(12, effectY, "▸ No active effects (placeholder)", {
        fontSize: "9px",
        color: "#445544",
      }).setOrigin(0, 0));
    }

    // Price label
    c.add(this.add.text(OFFERING_W / 2, OFFERING_H - 52, `$${offering.price}`, {
      fontSize: "20px",
      fontStyle: "bold",
      color: affordable ? "#f0e68c" : "#666666",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5));

    // Buy button
    this.addBuyButton(c, offering, affordable);

    return c;
  }

  private addBuyButton(
    parentContainer: Phaser.GameObjects.Container,
    offering: GuiShopOffering,
    canAfford: boolean,
  ): void {
    const bw = OFFERING_W - 24;
    const bh = 34;
    const bx = 12;
    const by = OFFERING_H - 46;

    const bg = this.add.graphics();
    const drawBg = (hovered: boolean): void => {
      bg.clear();
      if (!canAfford) {
        bg.fillStyle(0x333333, 1);
      } else {
        bg.fillStyle(hovered ? 0xf39c12 : 0xe67e22, 1);
      }
      bg.fillRoundedRect(bx, by, bw, bh, 6);
    };
    drawBg(false);

    const label = this.add.text(bx + bw / 2, by + bh / 2, canAfford ? "BUY" : "CAN'T AFFORD", {
      fontSize: "13px",
      fontStyle: "bold",
      color: canAfford ? "#ffffff" : "#666666",
    }).setOrigin(0.5, 0.5);

    parentContainer.add([bg, label]);

    if (!canAfford) {
      return;
    }

    const zone = this.add.zone(bx, by, bw, bh).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => drawBg(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => drawBg(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.handlePurchase(offering.index);
    });
    parentContainer.add(zone);
  }

  private handlePurchase(index: number): void {
    const purchased: GuiItem | null = this.adapter.purchaseShopItem(index);
    if (!purchased) {
      return;
    }
    // Re-render offerings and inventory with fresh state
    const fresh = this.adapter.getState();
    this.updateBankrollLabel(fresh.bankroll);
    this.renderOfferings(this.scale.width / 2, fresh);
    this.inventoryPanel.populate(fresh.inventory);
  }

  private updateBankrollLabel(bankroll: number): void {
    this.bankrollLabel.setText(`Bankroll: $${bankroll.toFixed(2)}`);
  }

  private createLeaveButton(x: number, y: number): void {
    const w = 200;
    const h = 42;

    const bg = this.add.graphics();
    const draw = (hovered: boolean): void => {
      bg.clear();
      bg.fillStyle(hovered ? 0x5dade2 : 0x2980b9, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(false);

    this.add.text(x, y, "LEAVE SHOP", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_OVER, () => draw(true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () => draw(false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.adapter.leaveShop();
      // Just close this overlay. GameScene's onShopShutdown listener resumes it.
      this.scene.stop();
    });
  }
}
