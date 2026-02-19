import Phaser from "phaser";
import type { GuiPlayerAction } from "../adapter/index.js";

/** Emitted by ActionPanel when a standard action button is clicked. */
export const ACTION_PANEL_EVENT = "actionSelected";

/** Emitted by ActionPanel when the VR Goggles item button is clicked. */
export const VR_GOGGLES_EVENT = "vrGogglesActivated";

const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 40;
const BUTTON_GAP = 12;
const BUTTON_RADIUS = 8;

/** Vertical offset of the VR Goggles button below the main action row. */
const VR_BUTTON_OFFSET_Y = BUTTON_HEIGHT + BUTTON_GAP;
const VR_BUTTON_WIDTH = 140;
const VR_BUTTON_COLOR = 0xe67e22;

const BUTTON_COLORS: Record<GuiPlayerAction, number> = {
  hit: 0x27ae60,
  stand: 0xc0392b,
  double: 0x2980b9,
  split: 0x8e44ad,
};

const BUTTON_LABELS: Record<GuiPlayerAction, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
};

/**
 * ActionPanel
 * ──────────────────────────────────────────────────────────────────────────────
 * Displays up to four action buttons (Hit, Stand, Double, Split) plus an
 * optional VR Goggles item button that appears when the item is usable.
 *
 * The panel emits events on the scene's EventEmitter:
 *   `ACTION_PANEL_EVENT` (action: GuiPlayerAction) — standard action clicked
 *   `VR_GOGGLES_EVENT`                            — VR Goggles button clicked
 *
 * Calling `setAvailableActions([])` hides all standard buttons.
 * Calling `setVrGogglesVisible(true/false)` shows/hides the VR Goggles button.
 *
 * NOT responsible for: validating actions, game state, adapter calls.
 */
export class ActionPanel extends Phaser.GameObjects.Container {
  private readonly buttons: Map<
    GuiPlayerAction,
    { bg: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text }
  > = new Map();

  private currentActions: GuiPlayerAction[] = [];

  // VR Goggles button
  private readonly vrBg: Phaser.GameObjects.Graphics;
  private readonly vrZone: Phaser.GameObjects.Zone;
  private readonly vrLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const actions: GuiPlayerAction[] = ["hit", "stand", "double", "split"];
    const totalWidth =
      actions.length * BUTTON_WIDTH + (actions.length - 1) * BUTTON_GAP;
    let offsetX = -totalWidth / 2 + BUTTON_WIDTH / 2;

    for (const action of actions) {
      const { bg, zone, label } = this.createButton(scene, offsetX, 0, action);
      this.buttons.set(action, { bg, zone, label });
      offsetX += BUTTON_WIDTH + BUTTON_GAP;
    }

    // VR Goggles button — centered below the main row
    this.vrBg = scene.add.graphics({ x: 0, y: VR_BUTTON_OFFSET_Y });
    this.drawVrButtonBg(false);

    this.vrZone = scene.add
      .zone(0, VR_BUTTON_OFFSET_Y, VR_BUTTON_WIDTH, BUTTON_HEIGHT)
      .setInteractive();
    this.vrZone.on(Phaser.Input.Events.POINTER_OVER, () => this.drawVrButtonBg(true));
    this.vrZone.on(Phaser.Input.Events.POINTER_OUT,  () => this.drawVrButtonBg(false));
    this.vrZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      scene.events.emit(VR_GOGGLES_EVENT);
    });

    this.vrLabel = scene.add
      .text(0, VR_BUTTON_OFFSET_Y, "🥽 VR Goggles", {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0.5);

    this.add([this.vrBg, this.vrZone, this.vrLabel]);

    // Hidden by default; shown via setVrGogglesVisible()
    this.vrBg.setVisible(false);
    this.vrZone.setVisible(false).disableInteractive();
    this.vrLabel.setVisible(false);

    scene.add.existing(this);
  }

  /** Show only the supplied actions; hide the rest. */
  setAvailableActions(actions: GuiPlayerAction[]): void {
    this.currentActions = actions;
    this.setVisible(actions.length > 0 || this.vrBg.visible);

    for (const [action, { bg, zone, label }] of this.buttons) {
      const available = actions.includes(action);
      bg.setVisible(available);
      zone.setVisible(available);
      if (available) {
        zone.setInteractive();
      } else {
        zone.disableInteractive();
      }
      label.setVisible(available);
    }
  }

  /** Show or hide the VR Goggles item button. */
  setVrGogglesVisible(visible: boolean): void {
    this.vrBg.setVisible(visible);
    this.vrLabel.setVisible(visible);
    if (visible) {
      this.vrZone.setVisible(true).setInteractive();
    } else {
      this.vrZone.setVisible(false).disableInteractive();
    }
    // Ensure the container itself is visible when either section is shown
    this.setVisible(this.currentActions.length > 0 || visible);
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
    if (this.vrBg.visible) {
      if (enabled) {
        this.vrZone.setInteractive();
      } else {
        this.vrZone.disableInteractive();
      }
      this.vrBg.setAlpha(enabled ? 1 : 0.5);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    action: GuiPlayerAction,
  ): { bg: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone; label: Phaser.GameObjects.Text } {
    const color = BUTTON_COLORS[action];

    const bg = scene.add.graphics({ x, y });
    this.drawButtonBg(bg, color, false);

    const zone = scene.add.zone(x, y, BUTTON_WIDTH, BUTTON_HEIGHT).setInteractive();

    zone.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.drawButtonBg(bg, color, true);
    });
    zone.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.drawButtonBg(bg, color, false);
    });
    zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.currentActions.includes(action)) {
        return;
      }
      scene.events.emit(ACTION_PANEL_EVENT, action);
    });

    const label = scene.add.text(x, y, BUTTON_LABELS[action], {
      fontSize: "16px",
      color: "#ffffff",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    this.add([bg, zone, label]);
    return { bg, zone, label };
  }

  private drawButtonBg(
    g: Phaser.GameObjects.Graphics,
    color: number,
    hovered: boolean,
  ): void {
    const fillColor = hovered ? Phaser.Display.Color.IntegerToColor(color).lighten(20).color : color;
    g.clear();
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );
    g.lineStyle(1, 0xffffff, 0.3);
    g.strokeRoundedRect(
      -BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );
  }

  private drawVrButtonBg(hovered: boolean): void {
    const color = hovered
      ? Phaser.Display.Color.IntegerToColor(VR_BUTTON_COLOR).lighten(20).color
      : VR_BUTTON_COLOR;
    this.vrBg.clear();
    this.vrBg.fillStyle(color, 1);
    this.vrBg.fillRoundedRect(
      -VR_BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      VR_BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );
    this.vrBg.lineStyle(1, 0xffffff, 0.3);
    this.vrBg.strokeRoundedRect(
      -VR_BUTTON_WIDTH / 2,
      -BUTTON_HEIGHT / 2,
      VR_BUTTON_WIDTH,
      BUTTON_HEIGHT,
      BUTTON_RADIUS,
    );
  }
}
