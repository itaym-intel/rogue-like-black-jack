import Phaser from "phaser";
import type { GuiPlayerAction } from "../adapter/index.js";

/** Emitted by ActionPanel when a standard action button is clicked. */
export const ACTION_PANEL_EVENT = "actionSelected";

/** Emitted by ActionPanel when the VR Goggles item button is clicked. */
export const VR_GOGGLES_EVENT = "vrGogglesActivated";

/** Emitted by ActionPanel when the Sleight of Hand item button is clicked. */
export const SLEIGHT_OF_HAND_EVENT = "sleightOfHandActivated";

const BUTTON_WIDTH = 110;
const BUTTON_HEIGHT = 44;
const BUTTON_GAP = 10;
const BUTTON_RADIUS = 8;

/** Vertical offset of the item-button row below the main action row. */
const ITEM_ROW_OFFSET_Y = BUTTON_HEIGHT + BUTTON_GAP + 4;
/** Gap between item buttons when multiple are visible. */
const ITEM_BUTTON_GAP = 10;

const BUTTON_COLORS: Record<GuiPlayerAction, { base: number; hover: number }> = {
  hit: { base: 0x1e8449, hover: 0x27ae60 },
  stand: { base: 0xa93226, hover: 0xc0392b },
  double: { base: 0x2471a3, hover: 0x2980b9 },
  split: { base: 0x7d3c98, hover: 0x8e44ad },
};

const BUTTON_LABELS: Record<GuiPlayerAction, string> = {
  hit: "HIT",
  stand: "STAND",
  double: "DOUBLE",
  split: "SPLIT",
};

const BUTTON_KEYS: Record<GuiPlayerAction, string> = {
  hit: "H",
  stand: "S",
  double: "D",
  split: "P",
};

/** Internal descriptor for a generic item-action button. */
interface ItemButton {
  bg: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
  label: Phaser.GameObjects.Text;
  width: number;
  baseColor: number;
  hoverColor: number;
  borderColor: number;
  isVisible: boolean;
}

/**
 * ActionPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * Displays up to four action buttons (Hit, Stand, Double, Split) plus a row
 * of optional item-action buttons (VR Goggles, Sleight of Hand, …) that
 * appear when the corresponding item is usable.
 *
 * The panel emits events on the scene's EventEmitter:
 *   `ACTION_PANEL_EVENT`     (action: GuiPlayerAction) — standard action clicked
 *   `VR_GOGGLES_EVENT`                                 — VR Goggles button clicked
 *   `SLEIGHT_OF_HAND_EVENT`                            — Sleight of Hand button clicked
 *
 * NOT responsible for: validating actions, game state, adapter calls.
 */
export class ActionPanel extends Phaser.GameObjects.Container {
  private readonly buttons: Map<
    GuiPlayerAction,
    { bg: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text; key: Phaser.GameObjects.Text }
  > = new Map();

  private currentActions: GuiPlayerAction[] = [];

  /** Keyed item-action buttons (insertion order = layout order). */
  private readonly itemButtons: Map<string, ItemButton> = new Map();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // ── Standard action buttons ─────────────────────────────────────────────
    const actions: GuiPlayerAction[] = ["hit", "stand", "double", "split"];
    const totalWidth =
      actions.length * BUTTON_WIDTH + (actions.length - 1) * BUTTON_GAP;
    let offsetX = -totalWidth / 2 + BUTTON_WIDTH / 2;

    for (const action of actions) {
      const { bg, zone, label, key } = this.createActionButton(scene, offsetX, 0, action);
      this.buttons.set(action, { bg, zone, label, key });
      offsetX += BUTTON_WIDTH + BUTTON_GAP;
    }

    // ── Item-action buttons (all hidden by default) ─────────────────────────
    this.addItemButton(scene, "vr_goggles", "VR GOGGLES", {
      width: 150, baseColor: 0xb8720e, hoverColor: 0xd48a18, borderColor: 0xffd700,
      event: VR_GOGGLES_EVENT,
    });
    this.addItemButton(scene, "sleight_of_hand", "DISCARD", {
      width: 130, baseColor: 0x6c3483, hoverColor: 0x8e44ad, borderColor: 0xd2b4de,
      event: SLEIGHT_OF_HAND_EVENT,
    });

    scene.add.existing(this);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Show only the supplied actions; hide the rest. */
  setAvailableActions(actions: GuiPlayerAction[]): void {
    this.currentActions = actions;

    for (const [action, { bg, zone, label, key }] of this.buttons) {
      const available = actions.includes(action);
      bg.setVisible(available);
      zone.setVisible(available);
      if (available) {
        zone.setInteractive();
      } else {
        zone.disableInteractive();
      }
      label.setVisible(available);
      key.setVisible(available);
    }
    this.updateContainerVisibility();
  }

  /** Show or hide the VR Goggles item button. */
  setVrGogglesVisible(visible: boolean): void {
    this.setItemButtonVisible("vr_goggles", visible);
  }

  /** Show or hide the Sleight of Hand item button. */
  setSleightOfHandVisible(visible: boolean): void {
    this.setItemButtonVisible("sleight_of_hand", visible);
  }

  /** Temporarily disable all buttons (e.g. during dealer animation). */
  setEnabled(enabled: boolean): void {
    for (const [, { bg, zone }] of this.buttons) {
      if (enabled) {
        zone.setInteractive();
      } else {
        zone.disableInteractive();
      }
      bg.setAlpha(enabled ? 1 : 0.5);
    }
    for (const [, btn] of this.itemButtons) {
      if (btn.isVisible) {
        if (enabled) {
          btn.zone.setInteractive();
        } else {
          btn.zone.disableInteractive();
        }
        btn.bg.setAlpha(enabled ? 1 : 0.5);
      }
    }
  }

  // ── Private: item button management ────────────────────────────────────────

  private addItemButton(
    scene: Phaser.Scene,
    key: string,
    labelText: string,
    opts: { width: number; baseColor: number; hoverColor: number; borderColor: number; event: string },
  ): void {
    const bg = scene.add.graphics();
    this.drawItemButtonBg(bg, opts.baseColor, opts.borderColor, opts.width, false);

    const zone = scene.add
      .zone(0, ITEM_ROW_OFFSET_Y, opts.width, BUTTON_HEIGHT)
      .setInteractive();
    zone.on(Phaser.Input.Events.POINTER_OVER, () =>
      this.drawItemButtonBg(bg, opts.hoverColor, opts.borderColor, opts.width, true));
    zone.on(Phaser.Input.Events.POINTER_OUT, () =>
      this.drawItemButtonBg(bg, opts.baseColor, opts.borderColor, opts.width, false));
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => scene.events.emit(opts.event));

    const label = scene.add
      .text(0, ITEM_ROW_OFFSET_Y, labelText, {
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 2,
        letterSpacing: 1,
      })
      .setOrigin(0.5, 0.5);

    this.add([bg, zone, label]);

    // Hidden by default
    bg.setVisible(false);
    zone.setVisible(false).disableInteractive();
    label.setVisible(false);

    this.itemButtons.set(key, {
      bg, zone, label,
      width: opts.width,
      baseColor: opts.baseColor,
      hoverColor: opts.hoverColor,
      borderColor: opts.borderColor,
      isVisible: false,
    });
  }

  private setItemButtonVisible(key: string, visible: boolean): void {
    const btn = this.itemButtons.get(key);
    if (!btn) return;

    btn.isVisible = visible;
    btn.bg.setVisible(visible);
    btn.label.setVisible(visible);
    if (visible) {
      btn.zone.setVisible(true).setInteractive();
    } else {
      btn.zone.setVisible(false).disableInteractive();
    }
    this.layoutItemButtons();
    this.updateContainerVisibility();
  }

  /** Reposition visible item buttons so they are centered as a group. */
  private layoutItemButtons(): void {
    const visible: ItemButton[] = [];
    for (const [, btn] of this.itemButtons) {
      if (btn.isVisible) visible.push(btn);
    }
    if (visible.length === 0) return;

    const totalWidth =
      visible.reduce((sum, b) => sum + b.width, 0) +
      (visible.length - 1) * ITEM_BUTTON_GAP;
    let cx = -totalWidth / 2;

    for (const btn of visible) {
      const x = cx + btn.width / 2;
      btn.bg.setPosition(x, ITEM_ROW_OFFSET_Y);
      btn.zone.setPosition(x, ITEM_ROW_OFFSET_Y);
      btn.label.setPosition(x, ITEM_ROW_OFFSET_Y);
      cx += btn.width + ITEM_BUTTON_GAP;
    }
  }

  private updateContainerVisibility(): void {
    const anyItem = [...this.itemButtons.values()].some((b) => b.isVisible);
    this.setVisible(this.currentActions.length > 0 || anyItem);
  }

  // ── Private: standard action buttons ──────────────────────────────────────

  private createActionButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    action: GuiPlayerAction,
  ): { bg: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text; key: Phaser.GameObjects.Text } {
    const colors = BUTTON_COLORS[action];

    const bg = scene.add.graphics({ x, y });
    this.drawActionButtonBg(bg, colors.base, false);

    const zone = scene.add.zone(x, y, BUTTON_WIDTH, BUTTON_HEIGHT).setInteractive();

    zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.drawActionButtonBg(bg, colors.hover, true);
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.drawActionButtonBg(bg, colors.base, false);
    });
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.currentActions.includes(action)) {
        return;
      }
      scene.events.emit(ACTION_PANEL_EVENT, action);
    });

    const label = scene.add.text(x, y - 2, BUTTON_LABELS[action], {
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5);

    // Keyboard shortcut hint
    const key = scene.add.text(x + BUTTON_WIDTH / 2 - 8, y - BUTTON_HEIGHT / 2 + 8, BUTTON_KEYS[action], {
      fontSize: "9px",
      color: "#ffffff",
    }).setOrigin(1, 0).setAlpha(0.35);

    this.add([bg, zone, label, key]);
    return { bg, zone, label, key };
  }

  private drawActionButtonBg(
    g: Phaser.GameObjects.Graphics,
    color: number,
    hovered: boolean,
  ): void {
    g.clear();

    // Shadow
    if (!hovered) {
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(
        -BUTTON_WIDTH / 2 + 2,
        -BUTTON_HEIGHT / 2 + 2,
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        BUTTON_RADIUS,
      );
    }

    // Main fill
    g.fillStyle(color, 1);
    g.fillRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );

    // Top highlight
    g.fillStyle(0xffffff, hovered ? 0.15 : 0.08);
    g.fillRoundedRect(
      -BUTTON_WIDTH / 2 + 1,
      -BUTTON_HEIGHT / 2 + 1,
      BUTTON_WIDTH - 2,
      BUTTON_HEIGHT / 2 - 2,
      { tl: BUTTON_RADIUS - 1, tr: BUTTON_RADIUS - 1, bl: 0, br: 0 },
    );

    // Border
    g.lineStyle(1, 0xffffff, hovered ? 0.3 : 0.15);
    g.strokeRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );
  }

  private drawItemButtonBg(
    g: Phaser.GameObjects.Graphics,
    color: number,
    borderColor: number,
    width: number,
    hovered: boolean,
  ): void {
    g.clear();

    // Shadow
    if (!hovered) {
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(
        -width / 2 + 2,
        -BUTTON_HEIGHT / 2 + 2,
        width,
        BUTTON_HEIGHT,
        BUTTON_RADIUS,
      );
    }

    // Main fill
    g.fillStyle(color, 1);
    g.fillRoundedRect(
      -width / 2,
      -BUTTON_HEIGHT / 2,
      width,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );

    // Top highlight
    g.fillStyle(0xffffff, hovered ? 0.12 : 0.06);
    g.fillRoundedRect(
      -width / 2 + 1,
      -BUTTON_HEIGHT / 2 + 1,
      width - 2,
      BUTTON_HEIGHT / 2 - 2,
      { tl: BUTTON_RADIUS - 1, tr: BUTTON_RADIUS - 1, bl: 0, br: 0 },
    );

    // Border
    g.lineStyle(1, borderColor, hovered ? 0.4 : 0.2);
    g.strokeRoundedRect(
      -width / 2,
      -BUTTON_HEIGHT / 2,
      width,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );
  }
}
