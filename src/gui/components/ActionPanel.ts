import Phaser from "phaser";
import type { GuiPlayerAction } from "../adapter/index.js";

/** Emitted by ActionPanel when a button is clicked. */
export const ACTION_PANEL_EVENT = "actionSelected";

const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 40;
const BUTTON_GAP = 12;
const BUTTON_RADIUS = 8;

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
 * Displays up to four action buttons (Hit, Stand, Double, Split).
 *
 * The panel emits an `actionSelected` event on the scene's EventEmitter
 * whenever a button is clicked.  Scenes listen via:
 *
 *   this.events.on(ACTION_PANEL_EVENT, (action: GuiPlayerAction) => { ... })
 *
 * Calling `setAvailableActions([])` hides all buttons and makes the panel
 * non-interactive.
 *
 * NOT responsible for: validating actions, game state, adapter calls.
 */
export class ActionPanel extends Phaser.GameObjects.Container {
  private readonly buttons: Map<
    GuiPlayerAction,
    { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }
  > = new Map();

  private currentActions: GuiPlayerAction[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const actions: GuiPlayerAction[] = ["hit", "stand", "double", "split"];
    const totalWidth =
      actions.length * BUTTON_WIDTH + (actions.length - 1) * BUTTON_GAP;
    let offsetX = -totalWidth / 2 + BUTTON_WIDTH / 2;

    for (const action of actions) {
      const { bg, label } = this.createButton(scene, offsetX, 0, action);
      this.buttons.set(action, { bg, label });
      offsetX += BUTTON_WIDTH + BUTTON_GAP;
    }

    scene.add.existing(this);
  }

  /** Show only the supplied actions; hide the rest. */
  setAvailableActions(actions: GuiPlayerAction[]): void {
    this.currentActions = actions;
    this.setVisible(actions.length > 0);

    for (const [action, { bg, label }] of this.buttons) {
      const available = actions.includes(action);
      bg.setVisible(available).setInteractive(available);
      label.setVisible(available);
    }
  }

  /** Temporarily disable all buttons (e.g. during dealer animation). */
  setEnabled(enabled: boolean): void {
    for (const [, { bg }] of this.buttons) {
      bg.setInteractive(enabled);
      bg.setAlpha(enabled ? 1 : 0.5);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    action: GuiPlayerAction,
  ): { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text } {
    const color = BUTTON_COLORS[action];

    // Draw background as a RenderTexture via Graphics so we can tint on hover
    const bg = scene.add.graphics({ x, y });
    this.drawButtonBg(bg, color, false);

    // Make the hit area interactive (a Rectangle zone)
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
    return { bg, label };
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
}
